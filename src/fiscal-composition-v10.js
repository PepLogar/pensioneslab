import { createFiscalCompositionV3 } from './fiscal-composition-v3.js';
import { createRevenueBasesV10 } from './revenue-bases-v10.js';
import { REVENUE_BASES_V4 as D } from '../data/revenue-bases-v4.js';
import { MUTUAS_V7 as SCOPE } from '../data/mutuas-v7.js';
import { fiscalRescueForYear } from './config-current-v10.js';
import { computeRescueTaxFactors } from './tax-policy-impact.js';
import { lafferResponse, LAFFER_DEFAULTS, lafferVatActive, lafferVatWedge } from './shared/laffer-response.js';

/** Split mutual-assigned receipts from the existing effective contribution
 * pool. Restrictions affect allocation, not consolidated revenue or spending. */
export function createFiscalCompositionV10(base, { openingComponents = {}, temporaryMatchedFlows = [],
  revenueMechanism = 'bases', imputedMechanism = 'paired' } = {}) {
  if (!['bases', 'gdp-v3'].includes(revenueMechanism) || !['paired', 'payroll-v3'].includes(imputedMechanism)) throw new RangeError('Unknown revenue mechanism');
  const previous = createFiscalCompositionV3(base, { openingComponents, temporaryMatchedFlows });
  const old = previous.opening;
  const imputedShare = D.contributions2025.imputed / D.contributions2025.publicCompensation;
  const baseImputedContributions = old.basePublicPay * imputedShare;
  const baseOtherEffectiveContributions = old.baseOtherContributions - baseImputedContributions;
  if (baseOtherEffectiveContributions < 0) throw new RangeError('Imputations exceed other contributions');
  const baseNonPensionSS = base.socialContributions2026 - base.pensionContributions;
  if (!Number.isFinite(baseNonPensionSS) || baseNonPensionSS < 0 ||
      baseNonPensionSS > baseOtherEffectiveContributions) {
    throw new RangeError('Nonpension SS partition exceeds effective contributions or is invalid');
  }
  const baseMutuaContributions = base.mutuaContributions;
  const baseTgssOtherContributions = baseNonPensionSS - baseMutuaContributions;
  if (!Number.isFinite(baseMutuaContributions) || baseMutuaContributions < 0 || baseTgssOtherContributions < 0) {
    throw new RangeError('Invalid mutual/TGSS partition');
  }
  const baseRemainingEffectiveContributions = baseOtherEffectiveContributions - baseNonPensionSS;
  // The pension share of the opening is measured on revenue that carries the 2025 Recovery Plan grants; the same
  // transfer as a share of the revenue without them (src/current-fiscal-v13.js, since 1.73).
  const allocatable0 = base.otherRevenue - baseImputedContributions - baseMutuaContributions;
  const pensionShareScale = allocatable0 / (allocatable0 - old.baseMatched);
  const opening = Object.freeze({ ...old, baseImputedContributions, baseOtherEffectiveContributions,
    baseNonPensionSS, baseMutuaContributions, baseTgssOtherContributions, baseRemainingEffectiveContributions, pensionShareScale });
  const revenue = createRevenueBasesV10(base, opening);
  // Opening pension contribution rate (as DEFAULT_CONFIG) and the labour part of IRPF.
  const baseContributionRate = base.ordinaryPensionPool / (base.workers * base.wage);
  const labourShareOfIrpf = D.personalMix2025.salary / D.personalMix2025.total;
  // Opening change of the effective labour tax rate per lever unit, for the
  // guide's lever notes: one contribution point and +100 % of IRPF.
  const { payroll0, compensation0, pools } = revenue.opening;
  const labourWedge = Object.freeze({ perContributionPoint: 0.01 * payroll0 / compensation0,
    perIrpfSurcharge: pools.personal * labourShareOfIrpf / compensation0 });
  // Consumption taxes for the VAT in the wedge (option 3b, lafferVatResponse): the
  // effective VAT rate on household consumption that weights the engine's VAT base
  // (AEAT 2025), and τc = that rate plus the other product taxes, which follow the same
  // household consumption in the engine, over the same base (in millions of euros).
  const consumptionTax = Object.freeze({ vatRate: D.vat2025.householdRate,
    consumptionTaxRate: D.vat2025.householdRate + D.tax2025.otherProductsConsumptionProxy / (D.vat2025.householdsBase * 1e6) });
  // Labour tax change equivalent to the year's VAT surcharge, on top of the labour rate
  // τ0 + dτ of the labour measures. 0 unless the option acts.
  // Since 1.58 it also counts the VAT rates of a fiscal rescue, on top of the surcharge as in
  // the receipts, and the surcharge on «other taxes» on the other product taxes.
  const vatWedge = (config, year, labourTau) => {
    if (!lafferVatActive(config) || year <= 2026) return 0;
    const rescue = fiscalRescueForYear(config.fiscalRescues ?? [], year);
    const vatSurcharge = (1 + (config.vatSurcharge ?? 0)) * (1 + (rescue ? computeRescueTaxFactors(rescue).vatRelativeChange : 0)) - 1;
    if (!vatSurcharge && !config.otherTaxSurcharge) return 0;
    return lafferVatWedge({ vatSurcharge, productTaxSurcharge: config.otherTaxSurcharge ?? 0,
      labourRate: LAFFER_DEFAULTS.labourTaxRate0 + labourTau, ...consumptionTax }).dTau;
  };
  // Wedge of a year's legislated rates on the previous year's bases (payroll,
  // compensation and IRPF before measures), the same terms as the revenue line
  // below. The full Laffer response sets that year's hours with it before the
  // cohorts work (docs/PLAN-1.54-LAFFER-COMPLETO.md). With lafferVatResponse, the
  // VAT surcharge adds its equivalent labour tax change.
  function lafferWedgeAhead({ year, config, previous, surchargeRate = 0 }) {
    const compensation = previous.revenueDrivers.compensationNominal / previous.priceIndex;
    const irpfBeforeMeasures = previous.fiscalComposition.personalIncomeTax - (previous.fiscalMeasures?.irpfExtra ?? 0);
    const contributionPoints = Number.isFinite(config.contributionRate)
      ? config.contributionRate - baseContributionRate - (config.lafferExemptContribution ?? 0) : 0;
    const irpfSurcharge = year > 2026 ? config.irpfSurcharge : 0;
    let dTau = ((contributionPoints + surchargeRate) * previous.workers * previous.wage +
      irpfSurcharge * irpfBeforeMeasures * labourShareOfIrpf) / compensation;
    if (lafferVatActive(config)) dTau += vatWedge(config, year, dTau);
    if (!Number.isFinite(dTau)) throw new RangeError('Invalid labour tax wedge ahead');
    return dTau;
  }
  return Object.freeze({ opening, labourWedge, lafferWedgeAhead, consumptionTax,
    assumptions: Object.freeze({ ...previous.assumptions, source: D.id,
      revenueMechanism, imputedMechanism, contributionScope: SCOPE.id,
      income: 'IRPF uses payroll, paid pensions and a residual-income proxy, with a grouped state-tariff increment. VAT uses disposable income/public-purchase/housing proxies. Corporate tax follows gross surplus/mixed income; unmodeled taxes follow nominal GDP by default (held in real euros as an option). See INGRESOS-POR-BASES-v4.md.',
      contributions: 'The existing SS residual is partitioned into mutual-assigned and other TGSS receipts. Only the latter shares the TGSS ordinary-base response. Mutual receipts have their own identified/proxy response and are excluded from general-income control scaling and pension-transfer allocation. They never fund private/notional retirement accounts. D612 remains noncash and paired with D122. The historical nonPensionSSContributions field is an aggregate residual, not a claim that no mutual activity finances disability/survivor pensions.',
      mutuaSpending: SCOPE.notes.spending, mutuaCapitalCost: SCOPE.notes.capitalCost,
      comparability: 'Same tax bases/rules in every system, including private pensions paid and public/private contributions before allocation; resulting tax receipts may legitimately differ.',
      futureSpending: 'Ordinary public compensation, services and the public-purchase VAT proxy retain the supplied spending reference. New fertility/automation risks do not automatically cut those budgets when GDP falls. Other non-tax revenue still follows actual GDP. This is a spending assumption, not a forecast.',
      displacementSupport: 'Additional hypothetical support enters taxable household income and disposable income once, with displaced equivalent workers in the grouped IRPF proxy. It never creates pension contributions or reduces gross surplus as an employer cost. The facade adds the gross transfer once after any ordinary-spending cut; this component reports it separately and excludes it from its spending override. It is not a legal unemployment-benefit calculation.',
      boundaries: 'No future fiscal totals used as targets. Salary distribution, consumption propensity, taxable mix, gross/net profits and future legislation remain explicit approximations; not a fiscal microsimulation.' }),
    accounts(context) {
      const { year, gdp, realPayroll, priceIndex, config, workers, retirees, totalPensionBenefits, totalPensionContributions,
        spendingGDP = gdp, displacementSupport = 0, displacedWorkers = 0 } = context;
      if (![spendingGDP, displacementSupport, displacedWorkers].every(value => Number.isFinite(value) && value >= 0) || !spendingGDP) {
        throw new RangeError('Invalid future spending reference or displacement support');
      }
      const original = previous.accounts(context);
      const spendingReference = previous.accounts({ ...context, gdp: spendingGDP,
        gdp2028: context.spendingGDP2028 ?? context.gdp2028 });
      // Read spending from its independent reference, keeping actual non-tax
      // income. These are alternatives for selected fields, never two budgets.
      // A matched programme (the Recovery Plan since 1.73) is spent as it is received: its spending is its
      // revenue on the actual GDP, not on the spending reference, so it never moves the balance.
      const matched = original.fiscalComposition.temporaryMatchedRevenue;
      const matchedShift = matched - spendingReference.fiscalComposition.temporaryMatchedSpending;
      const f = { ...original.fiscalComposition,
        publicEmployeeCompensation: spendingReference.fiscalComposition.publicEmployeeCompensation,
        remainingOtherPrimarySpending: spendingReference.fiscalComposition.remainingOtherPrimarySpending + matchedShift,
        temporaryMatchedSpending: matched };
      const revenueScale = config.taxRevenueGDP / old.referenceRevenueShare;
      const ordinaryContributionAdjustment = context.ordinaryContributionAdjustment === undefined ? 1 : context.ordinaryContributionAdjustment;
      if (!Number.isFinite(ordinaryContributionAdjustment) || ordinaryContributionAdjustment < 0) {
        throw new RangeError('Invalid ordinary contribution adjustment');
      }
      const contributionScale = realPayroll / old.basePayroll * revenueScale;
      const mutuaAdjustment = context.mutuaContributionAdjustment ?? 1;
      if (!Number.isFinite(mutuaAdjustment) || mutuaAdjustment < 0) throw new RangeError('Invalid mutual contribution adjustment');
      // Do not apply the free-income slider or pension contribution rate to M.
      const mutuaContributions = baseMutuaContributions * realPayroll / old.basePayroll * mutuaAdjustment;
      const tgssOtherContributions = baseTgssOtherContributions * ordinaryContributionAdjustment * contributionScale;
      const nonPensionSSContributions = mutuaContributions + tgssOtherContributions;
      const remainingEffectiveSocialContributions = baseRemainingEffectiveContributions * contributionScale;
      const otherEffectiveSocialContributions = nonPensionSSContributions + remainingEffectiveSocialContributions;
      const imputedSocialContributions = imputedMechanism === 'paired'
        ? f.publicEmployeeCompensation * imputedShare
        : baseImputedContributions * realPayroll / old.basePayroll;
      const tax = revenue.accounts({ nominalGDP: gdp * priceIndex, nominalPayroll: realPayroll * priceIndex,
        nominalPensions: totalPensionBenefits * priceIndex, nominalPensionContributions: totalPensionContributions * priceIndex,
        nominalOtherEffectiveContributions: otherEffectiveSocialContributions * priceIndex,
        workers, retirees, priceIndex, revenueScale,
        nominalDisplacementSupport: displacementSupport * priceIndex, displacedWorkers,
        nominalPublicPurchasesGDP: spendingGDP * priceIndex,
        nominalPublicCompensation: f.publicEmployeeCompensation * priceIndex,
        irpfSurcharge: year > 2026 ? config.irpfSurcharge : 0,
        vatSurcharge: year > 2026 ? config.vatSurcharge : 0,
        otherTaxSurcharge: year > 2026 ? config.otherTaxSurcharge : 0,
        rescuePolicy: fiscalRescueForYear(config.fiscalRescues ?? [], year),
        unmodeledFollowGDP: config.unmodeledTaxesFollowGDP ?? 1 });
      let details = Object.fromEntries(['taxes','personalIncomeTax','vatLikeTaxes','corporateIncomeTax','remainingTaxes'].map(k => [k, tax[k] / priceIndex]));
      if (revenueMechanism === 'gdp-v3') {
        const factor = gdp / base.gdp * revenueScale, p = revenue.opening.pools;
        details = { taxes: old.baseTaxes * factor, personalIncomeTax: p.personal * factor,
          vatLikeTaxes: p.vatLike * factor, corporateIncomeTax: p.corporate * factor,
          remainingTaxes: (p.otherProductsConsumptionProxy + p.remaining) * factor };
      }
      const otherSocialContributions = otherEffectiveSocialContributions + imputedSocialContributions;
      const money = Object.fromEntries(Object.entries(tax.fiscalMeasures).map(([key, value]) => [key, value / priceIndex]));
      // Laffer response (src/shared/laffer-response.js): the static extra revenue
      // of the labour tax measures (pension contribution points above the opening
      // rate, the closing clause's MEI surcharge since 1.53, and the labour part of
      // the extra IRPF) loses the share the shrinking labour base takes away. A
      // point of surcharge pays exactly what a point of contribution pays
      // (docs/PLAN-1.53-LAFFER.md). It is a separate revenue line: contributions and
      // the accounts they credit are not touched, and GDP does not respond.
      // Contribution points from formalised undeclared work («fraude cero») are new base, not a
      // higher wedge: they are left out (config.lafferExemptContribution).
      const contributionPoints = Number.isFinite(config.contributionRate)
        ? config.contributionRate - baseContributionRate - (config.lafferExemptContribution ?? 0) : 0;
      const surchargePoints = context.closingClauseRate ?? 0;
      const lafferStatic = (contributionPoints + surchargePoints) * realPayroll + money.irpfExtra * labourShareOfIrpf;
      const lafferCompensation = tax.drivers.compensationNominal / priceIndex;
      // With lafferVatResponse (option 3b), the VAT surcharge's equivalent labour tax change
      // joins the wedge, so the line loses τ1 × the base the whole wedge takes, as the hours
      // do. The VAT revenue itself (vatExtra) stays static: its curve has no peak.
      const vatWedgeTau = lafferVatActive(config) ? vatWedge(config, year, lafferStatic / lafferCompensation) : 0;
      const laffer = lafferResponse({ staticExtra: vatWedgeTau ? lafferStatic + vatWedgeTau * lafferCompensation : lafferStatic,
        compensation: lafferCompensation, year,
        selfFinancing: config.lafferSelfFinancing ?? LAFFER_DEFAULTS.selfFinancing,
        adjustYears: config.lafferAdjustYears ?? LAFFER_DEFAULTS.adjustYears });
      const lafferRevenueResponse = laffer.revenueResponse;
      const fiscalMeasures = { ...money, lafferStatic, lafferRevenueResponse, counterfactualTaxes: details.taxes - money.netRevenue,
        activeFrom: 2027, active: year > 2026,
        rates: { irpfSurcharge: year > 2026 ? config.irpfSurcharge : 0,
          vatSurcharge: year > 2026 ? config.vatSurcharge : 0,
          otherTaxSurcharge: year > 2026 ? config.otherTaxSurcharge : 0 } };
      const fiscalRescue = tax.fiscalRescue ? { year, policy: { ...fiscalRescueForYear(config.fiscalRescues, year) },
        ...Object.fromEntries(Object.entries(tax.fiscalRescue).map(([key, value]) => [key, value / priceIndex])),
        assumptionsId: tax.rescueAssumptionsId } : null;
      // GDP-linked revenue the Laffer output effect would take a second time (set by the core).
      const lafferGdpRevenueOffset = context.lafferGdpRevenueOffset ?? 0;
      return { generalTaxRevenueOverride: details.taxes + otherSocialContributions + f.otherNonTaxRevenue + lafferRevenueResponse + lafferGdpRevenueOffset,
        fiscalMeasures, fiscalRescue,
        // The facade adds support after paymentSpendingAdjustment. Including
        // it here would let a services cut remove support while household tax
        // bases still counted the full transfer, or double its cash expense.
        otherPrimarySpendingOverride: spendingReference.otherPrimarySpendingOverride + matchedShift,
        fiscalComposition: { ...f, ...details, otherSocialContributions, otherEffectiveSocialContributions,
          nonPensionSSContributions, mutuaContributions, tgssOtherContributions, remainingEffectiveSocialContributions,
          imputedSocialContributions, publicEmployerImputedContributions: f.publicEmployeeCompensation * imputedShare,
          displacementSupport, lafferRevenueResponse, lafferGdpRevenueOffset,
          laffer: { ...laffer, staticExtra: lafferStatic, contributionPoints, surchargePoints,
            // Only with the option on (the default since 1.56).
            ...(lafferVatActive(config) ? { vatWedge: vatWedgeTau, vatStaticExtra: vatWedgeTau * lafferCompensation } : {}) } },
        revenueDrivers: { year, mechanism: revenueMechanism, ...tax.drivers } };
    }
  });
}
