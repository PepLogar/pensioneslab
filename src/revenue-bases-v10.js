import { WAGE_BRIDGE_V5 as W } from '../data/wage-bridge-v5.js';
import { REVENUE_BASES_V4 as D } from '../data/revenue-bases-v4.js';
import { validateFiscalMeasures } from './config-current-v10.js';
import { computeRescueTaxFactors } from './tax-policy-impact.js';

export function stateGeneralTariff(base) {
  if (!Number.isFinite(base) || base < 0) throw new RangeError('Invalid general tax base');
  return D.stateTariff.reduce((sum, b) => sum + Math.max(0, Math.min(base, b.upperEUR ?? Infinity) - b.lowerEUR) * b.marginalRate, 0);
}
export function groupedStateLiability(index) {
  if (!Number.isFinite(index) || index <= 0) throw new RangeError('Invalid income index');
  return D.profile2024.reduce((sum, row) => sum + Math.max(0,
    row.count * stateGeneralTariff(Math.max(0, row.generalBase / row.count) * index) - row.minimumTaxCredit), 0);
}

/** All calculations here are NOMINAL. Official fiscal opening levels are
 * retained. Response proxies are assumptions, not observed future tax bases.
 * Employer/private pension contributions must enter before allocation by system.
 */
export function createRevenueBasesV10(base, opening) {
  const payroll0 = base.workers * base.wage, pensions0 = base.publicPensionBenefits;
  const allActual0 = opening.baseOtherEffectiveContributions + base.pensionContributions;
  const c = D.contributions2025;
  const householdShare = c.actualHousehold / (c.actualHousehold + c.actualEmployer);
  const householdContributions0 = allActual0 * householdShare;
  const t = D.tax2025, mix = D.personalMix2025, inc = D.householdIncome2025;
  const pools = Object.fromEntries(Object.entries(t).filter(([k]) => k !== 'total').map(([k, v]) => [k, opening.baseTaxes * v / t.total]));
  // AEAT common-territory income proportions are used only to complete a
  // synthetic household income index, not to overwrite ESA revenue levels.
  const capitalIncome0 = payroll0 * (inc.capital + inc.enterpriseOther) / inc.salary;
  const otherIncome0 = payroll0 * (inc.all - inc.salary - inc.pensions - inc.capital - inc.enterpriseOther) / inc.salary;
  const disposable0 = payroll0 + pensions0 + capitalIncome0 + otherIncome0 - householdContributions0 - pools.personal;
  if (!(disposable0 > 0)) throw new RangeError('Invalid disposable-income opening');
  // Same declared cross-survey temporal bridge as the equivalent wage.
  const nominal2024To2026 = W.nominal2024To2026;
  const liability0 = groupedStateLiability(nominal2024To2026);
  const stateExposure0 = D.stateGrossGeneralLiability2024 * liability0 / groupedStateLiability(1);
  const drag = index => index > 0 ? groupedStateLiability(nominal2024To2026 * index) / liability0 / index : 0;
  const ine = D.ine;
  const compensation0 = base.gdp * ine.compensation / ine.gdp;
  const surplus0 = base.gdp * ine.grossSurplusMixedIncome / ine.gdp;
  const v = D.vat2025;
  const vatWeights = [v.householdsBase * v.householdRate, v.publicBase * v.publicRate, v.housingBase * v.housingRate];
  const vatWeightSum = vatWeights.reduce((a, b) => a + b, 0);
  return Object.freeze({
    opening: Object.freeze({ pools: Object.freeze(pools), stateExposure0, householdContributions0, disposable0, payroll0, compensation0 }),
    accounts({ nominalGDP, nominalPayroll, nominalPensions, nominalPensionContributions,
      nominalOtherEffectiveContributions, workers, retirees, priceIndex, revenueScale,
      nominalDisplacementSupport = 0, displacedWorkers = 0, nominalPublicPurchasesGDP = nominalGDP,
      nominalPublicCompensation = 0,
      irpfSurcharge = 0, vatSurcharge = 0, otherTaxSurcharge = 0, rescuePolicy = null, unmodeledFollowGDP = 0 }) {
      validateFiscalMeasures({ irpfSurcharge, vatSurcharge, otherTaxSurcharge });
      const values = [nominalGDP, nominalPayroll, nominalPensions, nominalPensionContributions,
        nominalOtherEffectiveContributions, workers, retirees, priceIndex, revenueScale,
        nominalDisplacementSupport, displacedWorkers, nominalPublicPurchasesGDP, nominalPublicCompensation];
      if (values.some(x => !Number.isFinite(x) || x < 0) || !nominalGDP || !nominalPayroll || !workers || !priceIndex) throw new RangeError('Invalid revenue bases');
      const payrollIndex = nominalPayroll / payroll0, pensionIndex = nominalPensions / pensions0;
      const allActual = nominalPensionContributions + nominalOtherEffectiveContributions;
      const householdContributions = allActual * householdShare;
      // D1 already contains employer contributions: add ONLY the policy change
      // beyond its payroll-scaled opening, regardless of public/private routing.
      const employerPolicyChange = (allActual - allActual0 * payrollIndex) * (1 - householdShare);
      const compensationProxy = compensation0 * payrollIndex + employerPolicyChange;
      // An extreme labour shock cannot leave total compensation below the
      // public wage bill we still pay. Reject the unsupported combination;
      // never invent payroll, tax bases or unpaid public wages with a floor.
      if (compensationProxy + .01 < nominalPublicCompensation) {
        throw new RangeError('Este escenario deja la remuneración total por debajo de la nómina pública comprometida. Pasa cuando la productividad crece mucho más que los salarios, o cuando la automatización desplaza a muchos trabajadores sin recolocarlos. Supera el alcance del modelo agregado. Se conserva el último escenario válido.');
      }
      const factorIncomeProxy = nominalGDP * (1 - ine.netProductionImportTaxes / ine.gdp);
      const surplusBeforeFloor = factorIncomeProxy - compensationProxy;
      // The high side, as the low one: pay cannot exceed the income GDP generates (audit 1.85, 2).
      if (surplusBeforeFloor < -.01) {
        throw new RangeError('Este escenario deja la remuneración de los asalariados por encima de la renta que genera el PIB. Pasa cuando los salarios crecen mucho más que la productividad. Supera el alcance del modelo agregado. Se conserva el último escenario válido.');
      }
      const surplusIndex = Math.max(0, surplusBeforeFloor) / surplus0;
      // Scenario support is a taxable household transfer, not wages, GDP or
      // a contribution base. A common grouped IRPF proxy covers its recipients;
      // this is neither legal unemployment entitlement nor individual taxation.
      const supportedWorkers = nominalDisplacementSupport > 0 ? displacedWorkers : 0;
      const taxableLabourIncomeIndex = (nominalPayroll + nominalDisplacementSupport) / payroll0;
      const wageIndex = taxableLabourIncomeIndex / ((workers + supportedWorkers) / base.workers);
      const pensionAverageIndex = retirees > 0 ? pensionIndex / (retirees / base.retirees) : 0;
      const salaryLinear = pools.personal * mix.salary / mix.total * taxableLabourIncomeIndex;
      const pensionLinear = pools.personal * mix.pensions / mix.total * pensionIndex;
      const otherLinear = pools.personal * mix.remaining / mix.total * surplusIndex;
      // Limited STATE general-tax gross increment, NOT a claimed net SEC share.
      // The same grouped profile proxies wages/pensions; no regional extrapolation.
      const progression = stateExposure0 * (
        mix.salary / mix.total * taxableLabourIncomeIndex * (drag(wageIndex) - 1) +
        mix.pensions / mix.total * pensionIndex * (drag(pensionAverageIndex) - 1));
      const personalWithoutMeasure = Math.max(0, salaryLinear + pensionLinear + otherLinear + progression) * revenueScale;
      // Fixed propensity/taxable mix. Public purchases follow the existing
      // ordinary spending index; housing has no modeled market: constant real.
      // Transfers and total primary spending are NOT classified as VAT purchases.
      const publicPurchasesIndex = nominalPublicPurchasesGDP / base.gdp;
      const corporateIncomeTax = pools.corporate * surplusIndex * revenueScale;
      // No independent property/transaction/sector path: an explicit assumption the reader chooses
      // (unmodeledTaxesFollowGDP): following nominal GDP (1, the default since 1.67) or held in real euros (0).
      const unmodeledTaxes = pools.remaining * (unmodeledFollowGDP ? nominalGDP / base.gdp : priceIndex) * revenueScale;
      const declarantScale = (workers + supportedWorkers + retirees) / (base.workers + base.retirees);
      // Use the same household income proxies as disposable income. This lets
      // the extra marginal IRPF respond to the pensions actually paid by each
      // system, instead of treating every declarant as a wage earner. It is
      // still one rescaled grouped distribution, not tax microdata.
      const householdIncomeIndex = (nominalPayroll + nominalDisplacementSupport + nominalPensions + capitalIncome0 * surplusIndex + otherIncome0 * priceIndex) /
        (payroll0 + pensions0 + capitalIncome0 + otherIncome0);
      const rescue = rescuePolicy ? computeRescueTaxFactors(rescuePolicy, {
        nominalIncomeIndex: householdIncomeIndex / declarantScale, priceIndex,
        declarantScale, revenueScale
      }) : null;
      function receipts(irpf, vat, other, applyRescue = true) {
        const personalIncomeTax = personalWithoutMeasure * (1 + irpf) + (applyRescue ? rescue?.irpfExtraNominal ?? 0 : 0);
        const disposableBeforeFloor = nominalPayroll + nominalDisplacementSupport + nominalPensions + capitalIncome0 * surplusIndex +
          otherIncome0 * priceIndex - householdContributions - personalIncomeTax;
        const consumptionIndex = Math.max(0, disposableBeforeFloor) / disposable0;
        const vatBeforeRescue = pools.vatLike * (
          vatWeights[0] * consumptionIndex + vatWeights[1] * publicPurchasesIndex + vatWeights[2] * priceIndex) / vatWeightSum * revenueScale;
        const vatBeforeSurcharge = vatBeforeRescue * (1 + (applyRescue ? rescue?.vatRelativeChange ?? 0 : 0));
        const otherProductTaxes = pools.otherProductsConsumptionProxy * consumptionIndex * revenueScale;
        const otherBeforeSurcharge = otherProductTaxes + unmodeledTaxes;
        const vatLikeTaxes = vatBeforeSurcharge * (1 + vat);
        const remainingTaxes = otherBeforeSurcharge * (1 + other);
        return { personalIncomeTax, vatLikeTaxes, corporateIncomeTax, remainingTaxes,
          taxes: personalIncomeTax + vatLikeTaxes + corporateIncomeTax + remainingTaxes,
          consumptionIndex, disposableBeforeFloor, vatBeforeSurcharge, vatBeforeRescue, otherBeforeSurcharge };
      }
      // Counterfactual holds this year's payroll, pensions, contributions and
      // macro bases fixed. It isolates measures, including lost consumption tax.
      const baseline = receipts(0, 0, 0);
      const measured = irpfSurcharge || vatSurcharge || otherTaxSurcharge
        ? receipts(irpfSurcharge, vatSurcharge, otherTaxSurcharge) : baseline;
      const { personalIncomeTax, vatLikeTaxes, remainingTaxes, taxes, consumptionIndex } = measured;
      // This separate diagnostic removes only the latest dated policy, retaining
      // the three recurring controls. Do not sum it with fiscalMeasures: their
      // counterfactuals overlap through the disposable-income response.
      const withoutRescue = rescue ? receipts(irpfSurcharge, vatSurcharge, otherTaxSurcharge, false) : null;
      return { personalIncomeTax, vatLikeTaxes, corporateIncomeTax, remainingTaxes, taxes,
        rescueAssumptionsId: rescue?.assumptionsId ?? null,
        fiscalRescue: withoutRescue ? {
          irpfExtra: personalIncomeTax - withoutRescue.personalIncomeTax,
          vatExtra: vatLikeTaxes - withoutRescue.vatLikeTaxes,
          otherExtra: remainingTaxes - withoutRescue.remainingTaxes,
          netRevenue: taxes - withoutRescue.taxes,
          grossVatExtra: measured.vatBeforeRescue * (1 + vatSurcharge) * rescue.vatRelativeChange,
          vatConsumptionEffect: measured.vatBeforeRescue * (1 + vatSurcharge) - withoutRescue.vatLikeTaxes,
          otherConsumptionEffect: remainingTaxes - withoutRescue.remainingTaxes,
          disposableIncomeChange: Math.max(0, measured.disposableBeforeFloor) - Math.max(0, withoutRescue.disposableBeforeFloor),
          estimatedTaxableExcess: rescue.estimatedTaxableExcess
        } : null,
        fiscalMeasures: {
          irpfExtra: personalIncomeTax - baseline.personalIncomeTax,
          vatExtra: vatLikeTaxes - baseline.vatLikeTaxes,
          otherExtra: remainingTaxes - baseline.remainingTaxes,
          netRevenue: taxes - baseline.taxes,
          grossVatExtra: measured.vatBeforeSurcharge * vatSurcharge,
          grossOtherExtra: measured.otherBeforeSurcharge * otherTaxSurcharge,
          vatConsumptionEffect: measured.vatBeforeSurcharge - baseline.vatLikeTaxes,
          otherConsumptionEffect: measured.otherBeforeSurcharge - baseline.remainingTaxes,
          disposableIncomeChange: Math.max(0, measured.disposableBeforeFloor) - Math.max(0, baseline.disposableBeforeFloor)
        },
        drivers: { payrollIndex, pensionIndex, wageIndex, pensionAverageIndex, surplusIndex,
          consumptionIndex, publicPurchasesIndex, housingIndex: priceIndex,
          taxableLabourIncomeIndex, displacementSupportNominal: nominalDisplacementSupport, supportedWorkers,
          compensationNominal: compensationProxy,
          stateProgressionNominal: progression * revenueScale,
          householdContributionsNominal: householdContributions,
          employerPolicyChangeNominal: employerPolicyChange,
          surplusFloorApplied: surplusBeforeFloor < 0, consumptionFloorApplied: measured.disposableBeforeFloor < 0 } };
    }
  });
}
