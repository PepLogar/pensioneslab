import { createWagePathV6 } from './wage-path-v6.js';
/** V10 adds optional future scenarios. Opening data/contracts remain v8/v9;
 * new work, wage, production and transfer flows enter fiscal accounts once. */
import { CURRENT_SPAIN } from '../data/current-spain-v8.js';
import { DEBT_POLICY_2026 } from '../data/debt-policy-2026.js';
import { RETIREMENT_AGE_WEIGHTS } from '../data/current-pension-stock.js';
import { AR2024_DEMOGRAPHY as AR } from '../data/official-demography.js';
import { createCurrentCohorts } from './current-cohorts-v10.js';
import { referenceHorizon, REFERENCE_HORIZON_ASSUMPTIONS } from './reference-horizon.js';
import { ageingCarePoints } from './ageing-care.js';
import { publicCapitalFactor } from './shared/public-capital.js';
import { createSimulator } from './current-simulation-core-v10.js';
import { automationAt } from './automation-scenario.js';
import { describeAutomationParadigmEffect, captiveOptions } from './progressive-transition.js';
import { createCurrentFiscalEngineV13 } from './current-fiscal-v13.js';
import { DEFAULT_ISSUANCE_TERM_YEARS, ISSUANCE_LADDER_ID, issuanceMaturityWeights } from './debt-issuance.js';
import { DEFAULT_SOVEREIGN_RISK } from './sovereign-risk-premium.js';
import { createCurrentPolicyV3 } from './current-policy-v3.js';
import { createCurrentPolicyV7, accumulateReserve, meiRate } from './current-policy-v7.js';
import { createMutuaPensionBridgeV8 } from './mutua-pension-bridge-v8.js';
import { createFiscalCompositionV10 } from './fiscal-composition-v10.js';
import { paymentSpendingAdjustment } from './payment-spending-adjustment.js';
import { validateMacroRows, createExternalMacroPathV2 } from './external-macro-path-v2.js';
import { resolveConfig, weightsFor, DEFAULT_FUTURE_SCENARIO, DEFAULT_PROGRESSIVE_TRANSITION, DEFAULT_REVALUATION_CONFIG, DEFAULT_FISCAL_MEASURES, DEFAULT_FISCAL_RESCUES, DEFAULT_DEBT_RESTRUCTURINGS, DEFAULT_PAYMENT_ADJUSTMENTS, paymentAdjustmentForYear } from './config-current-v10.js';
import { shortRunInflationRate } from './shared/short-run-employment.js';
import { DISABILITY_RETIREMENT_2026 as DISABILITY, disabilityRate60to64 } from '../data/disability-retirement-2026.js';
import { cohort } from './cohort-core.js';

export { CURRENT_SPAIN, meiRate };
export const BASE_YEAR = CURRENT_SPAIN.baseYear, END_YEAR = CURRENT_SPAIN.endYear;
const OPENING_KEYS = ['gdp', 'debt', 'interest', 'totalRevenue', 'totalSpending'];

export function createCurrentModelV10({ macroRows, opening = {},
  openingComponents = {}, temporaryMatchedFlows = [],
  priorYearInflationRates = {}, pensionRevaluationRates = {},
  revenueMechanism = 'bases', imputedMechanism = 'paired', contributionMechanism = 'capped-bases', wageMechanism = 'official-2027',
  nonPensionBaseMechanism = 'consistent-ss', selfEmployedBaseMode = 'payroll-proxy', horizonYear = END_YEAR, populationEdition = 2025,
  careerCoverageTable } = {}) {
  const horizon = referenceHorizon(populationEdition);
  if (!Number.isInteger(horizonYear) || horizonYear < END_YEAR || horizonYear > horizon.LONG_HORIZON_END_YEAR) throw new RangeError(`horizonYear must be ${END_YEAR}…${horizon.LONG_HORIZON_END_YEAR}`);
  if (!['consistent-ss','payroll-v5'].includes(nonPensionBaseMechanism)) throw new RangeError('Unknown non-pension base mechanism');
  if (!['capped-bases','payroll-v4'].includes(contributionMechanism)) throw new RangeError('Unknown contribution mechanism');
  if (!opening || ![Object.prototype, null].includes(Object.getPrototypeOf(opening))) throw new TypeError('Plain opening required');
  for (const key of Reflect.ownKeys(opening)) {
    if (!OPENING_KEYS.includes(key) || !Object.hasOwn(Object.getOwnPropertyDescriptor(opening, key), 'value')) throw new TypeError('Unknown opening field or accessor');
    if (!Number.isFinite(opening[key]) || opening[key] < 0) throw new RangeError('Invalid opening value');
  }
  const rows = macroRows === undefined ? null : validateMacroRows(macroRows);
  if (!rows && Object.keys(opening).length) throw new RangeError('Opening changes belong only to an explicit external research context');
  const base = { ...CURRENT_SPAIN.base, ...opening };
  if (!(base.gdp > 0)) throw new RangeError('Positive GDP required');
  base.otherRevenue = base.totalRevenue - base.pensionContributions;
  base.otherPrimarySpending = base.totalSpending - base.interest - base.publicPensionBenefits;
  if (base.otherRevenue < base.assignedStateResources || base.otherPrimarySpending < 0) throw new RangeError('Incompatible opening');
  Object.freeze(base);
  // Composition owns strict field/calendar validation; the facade restricts
  // these research inputs to an explicit macro context with complete coverage.
  const composition = createFiscalCompositionV10(base, { openingComponents, temporaryMatchedFlows, revenueMechanism, imputedMechanism });
  if (!rows && (Reflect.ownKeys(openingComponents).length || temporaryMatchedFlows.length)) {
    throw new RangeError('Fiscal component overrides belong only to an explicit external research context');
  }
  if (temporaryMatchedFlows.length && temporaryMatchedFlows.length !== rows.length) {
    throw new RangeError('The matched-flow calendar must cover every external macro year');
  }
  const endYear = rows?.at(-1).year ?? horizonYear;
  const demographics = createCurrentCohorts({ ...base, baseYear: BASE_YEAR, endYear,
    entryAge: 22, retirementAge: 65, careerYears: 43, accruedReplacementRate: .77,
    retirementAgeWeights: RETIREMENT_AGE_WEIGHTS, populationEdition, careerCoverageTable });
  const wagePath = createWagePathV6(base, demographics, rows, wageMechanism);
  const external = rows ? createExternalMacroPathV2(base, demographics, validateMacroRows(wagePath.conditionedRows)) : null;
  const unperturbedContext = { ...demographics, referenceWage: wagePath.productionWage, ...external?.overrides };
  let cachedYear, cachedConfig, cachedAutomation;
  function technology(year, config) {
    if (year !== cachedYear || config !== cachedConfig) {
      cachedYear = year; cachedConfig = config; cachedAutomation = automationAt(year, config, BASE_YEAR);
    }
    return cachedAutomation;
  }
  const cohortContext = { ...unperturbedContext,
    // Public capital (1.60) moves the wage and the output per worker, not the spending reference:
    // every reader of these two (wage index, implied workers) sees the same path.
    publicCapitalFactor,
    referenceWage: (year, growth, config) => unperturbedContext.referenceWage(year, growth, config) * technology(year, config).wageFactor * publicCapitalFactor(year, config),
    outputPerWorker: (year, growth, config) => {
      const tech = technology(year, config);
      const paradigm = describeAutomationParadigmEffect(year, config, tech, BASE_YEAR);
      return unperturbedContext.outputPerWorker(year, growth, config) * tech.productivityFactor * paradigm.autonomousGdpMultiplier * publicCapitalFactor(year, config);
    },
    spendingOutputPerWorker: unperturbedContext.outputPerWorker,
    employmentShare: (item, year, half, config) => unperturbedContext.employmentShare(item, year, half, config) * technology(year, config).paidWorkShare,
    futureScenarioAt: (year, config) => {
      const tech = technology(year, config);
      const paradigm = describeAutomationParadigmEffect(year, config, tech, BASE_YEAR);
      return { ...tech, ...paradigm, targetFertility: config.targetFertility,
        productivityGrowth: config.productivityGrowth, wageGrowth: config.realWageGrowth };
    },
    displacementSupport: (year, config, displacedWorkers) => {
      const tech = technology(year, config);
      const paradigm = describeAutomationParadigmEffect(year, config, tech, BASE_YEAR);
      return displacedWorkers *
        unperturbedContext.referenceWage(year, config.realWageGrowth, config) *
        tech.wageBeforeReemploymentFactor * config.displacementSupportRate *
        (1 - paradigm.displacementSupportOffset);
    }
  };
  const payroll = base.workers * base.wage;
  const defaults = Object.freeze({ system: 'payg', mix: Object.freeze({ payg: .34, ndc: .33, funded: .33 }),
    contributionRate: base.ordinaryPensionPool / payroll,
    taxRevenueGDP: base.otherRevenue / base.gdp,
    pensionBudgetShare: base.assignedStateResources / (base.otherRevenue - composition.opening.baseImputedContributions - composition.opening.baseMutuaContributions),
    retirementAge: 65, replacementRate: .77, realWageGrowth: 0, entrantGrowth: 0, ...DEFAULT_FUTURE_SCENARIO,
    // An external macro path (a forecast of 2 to 6 years) cannot evaluate the 2023 closing clause, whose
    // windows reach beyond it, and the sources model only the scheduled MEI: off there, fixed like the
    // other future assumptions (docs/CONTRASTE-PREVISIONES-2026-11-08.md). Ordinary runs keep it.
    ...(rows ? { closingClause: 'off' } : {}),
    longevityGain: 0, realReturn: .03, feeRate: .005,
    realInterestRate: (1 + DEBT_POLICY_2026.newIssuanceNominalRate) / 1.02 - 1,
    inflationRate: .02, marketShock: 0, initialDebtGDP: base.debt / base.gdp,
    newDebtTermYears: DEFAULT_ISSUANCE_TERM_YEARS,
    ...DEFAULT_SOVEREIGN_RISK, ...DEFAULT_PROGRESSIVE_TRANSITION,
    ...DEFAULT_REVALUATION_CONFIG, ...DEFAULT_FISCAL_MEASURES, fiscalRescues: DEFAULT_FISCAL_RESCUES,
    debtRestructurings: DEFAULT_DEBT_RESTRUCTURINGS, paymentAdjustments: DEFAULT_PAYMENT_ADJUSTMENTS });
  resolveConfig({}, defaults);
  const fiscal = createCurrentFiscalEngineV13(base, { maturityWeightsForTerm: issuanceMaturityWeights, issuanceProfile: ISSUANCE_LADDER_ID });
  const mutuaBridge = createMutuaPensionBridgeV8(base);
  const observedPathInflation = rows ? Object.fromEntries(rows.slice(1).map((row, index) =>
    [row.year, row.consumerPriceIndex / rows[index].consumerPriceIndex - 1])) : {};
  const policy = (contributionMechanism === 'capped-bases' ? createCurrentPolicyV7 : createCurrentPolicyV3)(base, {
    priceIndex, selfEmployedBaseMode,
    nominalWageIndex: (year, config) => cohortContext.referenceWage(year, config.realWageGrowth, config) * priceIndex(year, config) / base.wage,
    priorYearInflationRates: { ...observedPathInflation, ...priorYearInflationRates }, pensionRevaluationRates });
  // With config.airefShortRunEmployment, prices follow the AIReF deflator in 2027–2030 (src/shared/short-run-employment.js).
  function priceIndex(year, config) {
    if (external) return external.macro(year).consumerPriceIndex;
    if (!config.airefShortRunEmployment) return (1 + config.inflationRate) ** (year - BASE_YEAR);
    let index = 1;
    for (let y = BASE_YEAR + 1; y <= year; y++) index *= 1 + (shortRunInflationRate(y, config) ?? config.inflationRate);
    return index;
  }
  function annualConfig(year, config) {
    // The option's inflation keeps the scenario's nominal interest rate: the real rate moves.
    const shortRun = external ? null : shortRunInflationRate(year, config);
    if (shortRun !== null) return { ...config, inflationRate: shortRun, realInterestRate: (1 + config.realInterestRate) * (1 + config.inflationRate) / (1 + shortRun) - 1 };
    if (!external || year === BASE_YEAR) return config;
    const priceChange = priceIndex(year, config) / priceIndex(year - 1, config);
    const nominal = external.macro(year).nominalBondRate ?? DEBT_POLICY_2026.newIssuanceNominalRate;
    return { ...config, inflationRate: priceChange - 1, realInterestRate: (1 + nominal) / priceChange - 1 };
  }
  function parts(gdp, config, year, previous, incomeContext) {
    const price = priceIndex(year, config);
    const workers = incomeContext?.workers ?? (year === BASE_YEAR ? base.workers :
      gdp / cohortContext.outputPerWorker(year, config.productivityGrowth, config));
    const realPayroll = incomeContext?.realPayroll ?? workers * cohortContext.referenceWage(year, config.realWageGrowth, config);
    const spendingGDP = incomeContext?.spendingGDP ?? gdp;
    const displacementSupport = incomeContext?.displacementSupport ?? 0;
    const anchor = year === 2028 ? gdp * price : previous?.fiscal2028NominalGDP ?? null;
    const spendingAnchor = year === 2028 ? spendingGDP * price : previous?.fiscal2028SpendingNominalGDP ?? previous?.fiscal2028NominalGDP ?? null;
    const baseResponse = policy.baseResponse?.(year, config) ?? null;
    const values = composition.accounts({ year, gdp, realPayroll, priceIndex: price,
      ordinaryContributionAdjustment: nonPensionBaseMechanism === 'consistent-ss' ? (baseResponse?.ordinaryAdjustment ?? 1) : 1,
      mutuaContributionAdjustment: baseResponse?.mutuaAdjustment ?? 1,
      gdp2028: anchor === null ? null : { nominalGDP: anchor },
      spendingGDP, spendingGDP2028: spendingAnchor === null ? null : { nominalGDP: spendingAnchor },
      config, ...incomeContext });
    const rates = policy.contributionRates(year, config);
    const mutua = mutuaBridge.accounts({ realPayroll, mutuaContributions: values.fiscalComposition.mutuaContributions });
    const paymentPolicy = paymentAdjustmentForYear(config.paymentAdjustments ?? [], year);
    const adjustedSpending = paymentSpendingAdjustment(values, mutua.mutuaPensionTransfer, paymentPolicy);
    const paradigm = describeAutomationParadigmEffect(year, config, technology(year, config), BASE_YEAR);
    // Health and long-term care: the Ageing Report pressure of ageing (src/ageing-care.js),
    // on top of the constant share of GDP the rest of public spending keeps. On by default since 1.25.
    const carePoints = ageingCarePoints(year, config, demographics.lifeExpectancyAt65, BASE_YEAR);
    const careAgeingSpending = carePoints / 100 * spendingGDP;
    return { ...values, ...adjustedSpending, ...mutua, careAgeingSpending,
      generalTaxRevenueOverride: values.generalTaxRevenueOverride + paradigm.fiscalRevenueDelta,
      // The separate support control owns this transfer. General service cuts
      // do not also cut it while households still receive its full amount.
      otherPrimarySpendingOverride: Math.max(0, (adjustedSpending.otherPrimarySpendingOverride ?? values.otherPrimarySpendingOverride) + displacementSupport + paradigm.fiscalSpendingDelta + careAgeingSpending),
      contributionBaseDrivers: baseResponse, priceIndex: price, fiscal2028NominalGDP: anchor, fiscal2028SpendingNominalGDP: spendingAnchor,
      solidarityContributions: realPayroll * rates.solidarityRate,
      solidarityContributionsUpperDiagnostic: realPayroll * rates.solidarityRateUpper };
  }
  const otherShare = year => horizon.referenceYear(year).publicPensionSpendingGDPpct -
    horizon.referenceYear(year).earningsRelatedRetirementSpendingGDPpct;
  // Disability pensioners who turn 65 become old-age pensioners (1.77; data/disability-retirement-2026.js): a fifth
  // of the 2026 stock aged 60–64 each year, following the population of 65 and the Ageing Report's disability rate,
  // with a pension that follows wages until the entry. They enter retired, with a protected (legacy) pension only.
  const disabilityEntries = (year, config) => {
    const age = DISABILITY.entryAge, wageIndex = cohortContext.referenceWage(year, config.realWageGrowth, config) /
      cohortContext.referenceWage(BASE_YEAR, config.realWageGrowth, config);
    let populationShift;
    return ['M', 'F'].map(sex => {
      try { populationShift = cohortContext.populationAt(year, age, sex) / cohortContext.populationAt(BASE_YEAR, age, sex); }
      catch { populationShift ??= 1; } // beyond the reference population: the last ratio
      const size = DISABILITY.stock60to64[sex] / 5 * populationShift * disabilityRate60to64(year) / disabilityRate60to64(BASE_YEAR);
      return { ...cohort(year - age, size, sex), retired: true, hasWorked: true, retirementYear: year, disabilityEntry: true,
        legacyAnnual: DISABILITY.monthly60to64[sex] * DISABILITY.paymentsPerYear * wageIndex };
    });
  };
  const engine = createSimulator({ ...cohortContext, base: demographics.COHORT_BASE, defaults,
    retirementEntries: (year, half, config) => (half === 0 ? disabilityEntries(year, config) : []),
    retirementContributionShare: base.retirementContributionShare,
    contributionRates: policy.contributionRates,
    pensionInPaymentRealIndex: (year, cohort, config) => policy.pensionInPaymentRealIndex(year, cohort, annualConfig(year, config)),
    otherPensionSpendingShare: year => base.otherPensionBenefits / base.gdp * otherShare(year) / otherShare(BASE_YEAR),
    // The full Laffer response reads the year's wedge before the cohorts work (docs/PLAN-1.54-LAFFER-COMPLETO.md).
    lafferWedgeAhead: (year, config, previous, surchargeRate) => composition.lafferWedgeAhead({ year, config, previous, surchargeRate }),
    initialFiscalAccounts(gdp, benefits, contributions, config, debtRatio, mei, incomeContext) {
      const p = parts(gdp, config, BASE_YEAR, null, incomeContext);
      const accounts = fiscal.initialFiscalAccounts(gdp, benefits, contributions, config, debtRatio, mei,
        { generalTaxRevenueOverride: p.generalTaxRevenueOverride, otherPrimarySpendingOverride: p.otherPrimarySpendingOverride, nonCashRevenue: p.fiscalComposition.imputedSocialContributions, restrictedMutuaRevenue: p.fiscalComposition.mutuaContributions, mutuaPensionTransfer: p.mutuaPensionTransfer,
          earmarkedRevenue: p.fiscalComposition.temporaryMatchedRevenue, pensionShareScale: composition.opening.pensionShareScale });
      return { ...accounts, ...(p.paymentSpendingAdjustment ? { paymentSpendingAdjustment: p.paymentSpendingAdjustment } : {}), fiscalMeasures: p.fiscalMeasures, fiscalRescue: p.fiscalRescue, mutuaCapitalCostTransfer: p.mutuaCapitalCostTransfer, mutuaReinsuranceTransfer: p.mutuaReinsuranceTransfer, fiscalComposition: p.fiscalComposition, revenueDrivers: p.revenueDrivers, contributionBaseDrivers: p.contributionBaseDrivers, fiscal2028NominalGDP: p.fiscal2028NominalGDP,
        fiscal2028SpendingNominalGDP: p.fiscal2028SpendingNominalGDP,
        solidarityContributions: p.solidarityContributions,
        solidarityContributionsUpperDiagnostic: p.solidarityContributionsUpperDiagnostic,
        careAgeingSpending: p.careAgeingSpending,
        reserveMemo: accumulateReserve(null, mei, p.priceIndex, BASE_YEAR) };
    },
    publicAccounts(gdp, benefits, contributions, previous, config, year, mei, incomeContext) {
      const p = parts(gdp, config, year, previous, incomeContext);
      // The stress premium of the year (0 unless switched on) prices only new issues.
      const stress = incomeContext?.stressPremiumRate ?? 0;
      const annual = stress > 0 ? { ...annualConfig(year, config), stressPremiumNow: stress } : annualConfig(year, config);
      const accounts = fiscal.publicAccounts(gdp, benefits, contributions, previous, annual, year, mei,
        { generalTaxRevenueOverride: p.generalTaxRevenueOverride, otherPrimarySpendingOverride: p.otherPrimarySpendingOverride, nonCashRevenue: p.fiscalComposition.imputedSocialContributions, restrictedMutuaRevenue: p.fiscalComposition.mutuaContributions, mutuaPensionTransfer: p.mutuaPensionTransfer,
          earmarkedRevenue: p.fiscalComposition.temporaryMatchedRevenue, pensionShareScale: composition.opening.pensionShareScale,
          ...captiveOptions(previous, config),
          stockFlowAdjustment: 0 });
      return { ...accounts, ...(p.paymentSpendingAdjustment ? { paymentSpendingAdjustment: p.paymentSpendingAdjustment } : {}), fiscalMeasures: p.fiscalMeasures, fiscalRescue: p.fiscalRescue, mutuaCapitalCostTransfer: p.mutuaCapitalCostTransfer, mutuaReinsuranceTransfer: p.mutuaReinsuranceTransfer, fiscalComposition: p.fiscalComposition, revenueDrivers: p.revenueDrivers, contributionBaseDrivers: p.contributionBaseDrivers, fiscal2028NominalGDP: p.fiscal2028NominalGDP,
        fiscal2028SpendingNominalGDP: p.fiscal2028SpendingNominalGDP,
        solidarityContributions: p.solidarityContributions,
        solidarityContributionsUpperDiagnostic: p.solidarityContributionsUpperDiagnostic,
        careAgeingSpending: p.careAgeingSpending,
        reserveMemo: accumulateReserve(previous.reserveMemo, mei, p.priceIndex, year),
        pensionNominalRevaluation: policy.pensionInPaymentRealIndex(year, null, annual) * (1 + annual.inflationRate) - 1 };
    },
    marketShockYear: 2035, trackRetirementFlows: true });
  function validate(input = {}) {
    const config = resolveConfig(input, defaults);
    if (revenueMechanism !== 'bases' && (Object.keys(DEFAULT_FISCAL_MEASURES).some(key => config[key] !== 0) ||
        config.fiscalRescues.length || config.paymentAdjustments.some(policy => policy.publicPensionCut))) {
      throw new RangeError('Explicit tax measures and pension payment cuts require the revenue-bases mechanism');
    }
    if (config.initialDebtGDP !== defaults.initialDebtGDP) throw new RangeError('The starting debt is fixed; reforms change only the future');
    if (external && (config.realWageGrowth !== 0 || config.entrantGrowth !== 0 || config.longevityGain !== 0 || config.retirementAge !== defaults.retirementAge ||
        Object.keys(DEFAULT_FUTURE_SCENARIO).some(key => config[key] !== defaults[key]))) {
      throw new RangeError('External comparison holds macro and demographic inputs fixed');
    }
    return config;
  }
  // Quote a reform year on an already calculated scenario. Measures
  // affect tax receipts, not its wages, pension flows or contribution bases.
  // Reusing parts keeps the calculator identical to the annual fiscal path
  // without repeatedly simulating all cohorts through 2070. Amounts are real
  // 2026 euros. The caller supplies a compatible point from its own scenario.
  // Later years retain that path's 2028 fiscal anchor; target-year GDP must
  // never be substituted for the historical reference used by parts.
  function validateFiscalPoint(point) {
    if (!point || !Number.isInteger(point.year) || point.year <= BASE_YEAR || point.year > endYear ||
        ['gdp', 'workers', 'retirees', 'totalBenefits', 'totalContributions'].some(key =>
          !Number.isFinite(point[key]) || point[key] < 0) ||
        point.gdp === 0 || point.workers === 0) {
      throw new RangeError('A valid fiscal point within the reform-year horizon is required');
    }
    if (point.year > 2028 && (!Number.isFinite(point.fiscal2028NominalGDP) || point.fiscal2028NominalGDP <= 0)) {
      throw new RangeError('The scenario 2028 nominal GDP fiscal anchor is required after 2028');
    }
  }
  function quoteFiscalParts(config, point) {
    const previous = point.year > 2028 ? { fiscal2028NominalGDP: point.fiscal2028NominalGDP,
      fiscal2028SpendingNominalGDP: point.fiscal2028SpendingNominalGDP } : null;
    return parts(point.gdp, config, point.year, previous, {
      workers: point.workers, retirees: point.retirees, realPayroll: point.workers * point.wage,
      spendingGDP: point.spendingGDP ?? point.gdp, displacedWorkers: point.displacedWorkers ?? 0,
      displacementSupport: point.displacementSupport ?? 0,
      totalPensionBenefits: point.totalBenefits,
      totalPensionContributions: point.totalContributions
    });
  }
  function quoteFiscalMeasures(config, point, measures) {
    validateFiscalPoint(point);
    if (!measures || Reflect.ownKeys(measures).some(key => !Object.hasOwn(DEFAULT_FISCAL_MEASURES, key))) {
      throw new TypeError('Only fiscal measure fields may change in a fiscal quote');
    }
    const checked = validate(resolveConfig(measures, validate(config)));
    return quoteFiscalParts(checked, point).fiscalMeasures;
  }
  function quoteFiscalRescue(config, point, policy) {
    validateFiscalPoint(point);
    if (!policy || policy.year !== point.year) throw new RangeError('The quoted rescue must start in the selected year');
    const current = validate(config);
    const fiscalRescues = [...current.fiscalRescues.filter(row => row.year !== policy.year), policy]
      .sort((a, b) => a.year - b.year);
    return quoteFiscalParts(validate({ ...current, fiscalRescues }), point).fiscalRescue;
  }
  return Object.freeze({ base, defaults, validateConfig: validate,
    quoteFiscalMeasures, quoteFiscalRescue,
    macroPath: external?.macroPath ?? null, cumulativePriceFactors: external?.cumulativePriceFactors ?? null,
    assumptions: Object.freeze({ calibration: CURRENT_SPAIN.id, cohorts: demographics.assumptions,
      contributionMechanism, nonPensionBaseMechanism, wagePath: wagePath.assumptions, debtPolicy: DEBT_POLICY_2026.id, pensionPolicy: policy.assumptions, fiscalComposition: composition.assumptions,
      futureScenarios: 'es-future-scenarios-2026-10-19-v10: conditional fertility sensitivity and disjoint AI/robot hour shares. Linear adoption then level plateau; unreallocated equivalent work lowers payroll, contributions and new rights without deleting cohorts. Productivity per paid FTE and wages are independent. No automatic investment return or quantified probability. Other pension/service commitments keep the no-new-risk path with prior controls; an explicit average displacement transfer adds spending and household income once. Not legal unemployment entitlement or a full demographic/general equilibrium forecast.',
      mutuaPensionBridge: mutuaBridge.assumptions,
      horizon: endYear > END_YEAR ? { endYear, ...REFERENCE_HORIZON_ASSUMPTIONS } : { endYear },
      newDebtTerm: 'Since 1.51, future ordinary gross issuance, comprising net additional borrowing and refinancing, follows the observed maturity mix of the Spanish Treasury medium- and long-term issues (bonos and obligaciones) auctioned or syndicated in 2025 and January–September 2026 (data/debt-issuance-ladder-2026.js): 17 annual bullet terms from 3 to 45 years, average 9.88. Bills (letras) are observed but left out, as before: simulated gross financing needs exclude short-term debt, whereas the Commission measure includes it (author decision, 30 October 2026). Another average term between 1 and 50 years stretches or shrinks that mix, splitting each rung between adjacent annual bullets. It replaces the previous 7- and 8-year bullets, whose single term echoed the 2027 maturity wave every eight years (docs/PROPUESTA-REGLA-SE-ROMPE.md). Each tranche receives the observed Spanish Treasury yield differential for its own tenor, still centred on the 7.85-year reference of the user nominal anchor. Banco de Espana table1.2 reports same-date observations for 16October2026, published20October2026: 1,3,5,10,15,30-year nodes. Linear interpolation and a flat30–50-year tail are explicit approximations; yields are used as par-coupon proxies, not a calibrated zero-coupon curve or a future forecast. The full observed yield is never added again. Weighted rates settle issuance interest, while the maximum tranche rate governs interest caps. The observed opening maturity ladder and explicit restructuring contracts retain their terms and coupons. The 2025–2026 mix is held constant; it is not a Treasury financing plan. All systems use the same source and rule.',
      sovereignRiskPremium: 'Selected by config.riskModel: european-linear uses min(cap, premiumAt10pp * max(0, opening nominal debt after exchange / current nominal GDP - threshold) / 0.10); legacy-quadratic squares the scaled excess and preserves prior scenarios. European defaults use the September2026 ECB ten-year spread / Q2 Eurostat debt cross section: slope0.9057714052976071bp per debt/GDP percentage point, Spain reference101.4%. The positive reference spread45.4bp decomposes the preserved user issuance anchor; it is NOT added again. Its implied risk-free rate is synthetic, not the current German ten-year yield. Floor, unchanged anchor, flat risk-tenor adjustment and cap12percentage points are explicit assumptions; the observed debt range is43.7-140.8%. The cross-sectional slope is descriptive, not causal or a crisis forecast. Only the additional debt surcharge is added after the user Fisher-converted anchor and Treasury tenor differential, once, on new borrowing and refinancing. Existing and exchanged coupons remain contractual until maturity. The2026 opening is unchanged. The cap does not guarantee market access; all systems use the same configured rule with their own debt paths.',
      fiscalMeasures: 'Recurring relative surcharges from 2027 on modeled IRPF, VAT-like and other taxes. Not statutory rate points. IRPF lowers disposable-income and consumption proxies. No output, employment, avoidance or VAT-price behavioral feedback is modeled.',
      fiscalRescues: 'Dated hypothetical VAT levels and additional IRPF points above a real-2026 threshold. The latest policy replaces earlier rescues; no prior year is rewritten. Grouped AEAT income and VAT mixes are proxies, not individual legal tax calculations. Consumption and public receipts are recomputed once before fiscal/debt accounts.',
      paymentAdjustments: 'Dated hypothetical levels reduce all scheduled public pension payments, including legacy, DB, NDC and other public pensions; private payments and accrued rights are unchanged. The latest cut replaces the previous level, and zero restores scheduled payments without arrears. Pension income, IRPF and consumption-tax bases receive actual payments once. NDC reserves continue their contractual debit; unpaid amounts are not invented cash or new notional assets. Other-spending cuts apply only to primary expenditure excluding complete public employee compensation (including paired D122/D612), matched programmes and the restricted mutual contribution pool net of its pension transfer. This mutual exclusion is a conservative scope proxy, not measured final expenditure. The residual is an aggregate service/transfer/investment cut, with no public-wage, employment or government-purchase VAT feedback. Since 1.38 its change lowers GDP by a short-run multiplier (src/shared/cut-multiplier.js: 0.6, or 1.4 after a year of high fiscal-stress risk; in full the first year, half the next), and the public accounts use that GDP. Interest and internal transfers are not cut or duplicated.',
      debtRestructurings: 'Dated hypothetical consensual exchanges of opening consolidated public debt. Haircut changes principal, never primary revenue or cash. Remaining nominal principal pays the selected nominal annual coupon and matures in one bullet after the chosen term. New borrowing and later refinancing use the user nominal base issuance anchor plus the Treasury tenor differential and configured progressive debt/GDP premium; agreed exchange coupons remain fixed until maturity; internal Social Security debt is not added. Public pensions and notional rights are not cut automatically. Existing and exchanged debt cash flows are valued at the same hypothetical nominal required yield, independent of the new coupon. Simulated fund exposure is market value capped at the old debt present value. The signed value change affects funded accounts and unguaranteed collective private annuities once; nominal principal forgiveness is separate and never deducted again. Coupons are part of subsequent total return, not extra income. Marketability and rebalancing are assumed; coupon schedules are informative. Other creditors use a memorandum allocation. No market-access restrictions, guarantee, bailout or macroeconomic feedback is inferred.',
      openingFieldsRebased: Object.keys(opening),
      financialAdjustments: 'Zero additional consolidated adjustment in this scenario because no independently verified future operation path is supplied. Not a claim that actual future adjustments are zero.',
      comparison: 'Only published macro/opening inputs and explicit matched programme flows are conditioned. Future aggregate debt, deficits, interest bills and pensions never enter as targets.' }),
    simulate: (input, runtime) => engine.simulate(validate(input), runtime) });
}

const current = createCurrentModelV10();
export const DEFAULT_CONFIG = current.defaults;
export const CURRENT_ASSUMPTIONS = current.assumptions;
export const validateConfig = input => current.validateConfig(input);
// Long-horizon runs (beyond 2070) are a run-only option, `runtime.horizonYear`: the saved
// configuration does not change, and without it every result is identical to before.
// The population edition is a scenario choice (config.europop2023, 0 by default): EUROPOP2023, the
// Ageing Report's own, builds its own model, once; it has no long-horizon runs (EUROPOP2023 ends in 2071).
const longModels = new Map();
function modelFor(horizonYear, populationEdition = 2025) {
  if ((horizonYear === undefined || horizonYear === END_YEAR) && populationEdition === 2025) return current;
  if (populationEdition === 2023 && horizonYear !== undefined && horizonYear !== END_YEAR) {
    throw new RangeError('Con la población EUROPOP2023 no se puede simular más allá de 2070');
  }
  const key = `${horizonYear ?? END_YEAR}|${populationEdition}`;
  if (!longModels.has(key)) longModels.set(key, createCurrentModelV10({ horizonYear: horizonYear ?? END_YEAR, populationEdition }));
  return longModels.get(key);
}
export const simulate = (input, runtime) => {
  const { horizonYear, ...rest } = runtime ?? {};
  return modelFor(horizonYear, input?.europop2023 ? 2023 : 2025).simulate(input, runtime ? rest : runtime);
};
export const quoteFiscalMeasures = (config, point, measures) => current.quoteFiscalMeasures(config, point, measures);
export const quoteFiscalRescue = (config, point, policy) => current.quoteFiscalRescue(config, point, policy);
export const systemWeights = input => weightsFor(validateConfig(input));
