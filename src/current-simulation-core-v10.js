// V10+: includes post-retirement portfolio return on funded annuity reserves,
// post-retirement notional indexation on NDC reserves, and explicit transition
// vs structural pension gap and base-rate vs risk-snowball debt decomposition.
/** V4 supplies paid private/public pensions and all contributions to fiscal bases.
 * Cohort calculations are preserved verbatim from V2.
 * V2 forward engine: policy indexation also receives the scenario config.
 * The legacy simulation-core.js remains unchanged for its frozen experiments.
 * No data imports or global calendar. The base row is an annual-pace snapshot,
 * not a completed-year flow applied again to the opening fiscal stock.
 */
import { resolveConfig, weightsFor, paymentAdjustmentForYear } from './config-current-v10.js';
import { applyCreditorFundLoss } from './creditor-fund-loss.js';
import { cohortTransitionWeights, cohortCapitalizationReturns, markBasePensioners, basePensionersLeft } from './progressive-transition.js';
import { cutDemandGap } from './shared/cut-multiplier.js';
import { ndcPhaseInWeights, ndcPhaseInShare, ndcBrakeFactor } from './shared/ndc-options.js';
import { pastRightsActive, pastRightsShare, pastRightsCapital, omitInactivePastRights } from './shared/ndc-past-rights.js';
import { stressPremiumRate } from './shared/stress-premium.js';
import { pointsSustainability } from './shared/points-system.js';
import { engineClausePath, closingClauseApplies, CLOSING_CLAUSE_RULE } from './shared/closing-clause.js';
import { lafferHours, lafferFullActive, LAFFER_DEFAULTS } from './shared/laffer-response.js';
import { RETIREMENT_DELAY_SUPPORT } from './shared/retirement-delay.js';
import { omitDefaultInvestmentShare } from './shared/public-capital.js';
import { generationAgeShift, omitDefaultAgeSteps } from './shared/retirement-age-steps.js';
import { isCommonFund } from './shared/scenario-labels.js';
import { shortRunInflationRate } from './shared/short-run-employment.js';

export function createSimulator(context) {
  const { base: COHORT_BASE, defaults: DEFAULT_CONFIG, retirementContributionShare: RETIREMENT_CONTRIBUTION_SHARE,
    initialCohorts, entrantCohorts, employmentExposure, referenceEmployment, referenceWage,
    outputPerWorker, newAwardRate, halfYearSurvival, annuityFactor, pensionInPaymentRealIndex,
    otherPensionSpendingShare, initialFiscalAccounts, publicAccounts } = context;
  const BASE_YEAR = COHORT_BASE.baseYear, END_YEAR = COHORT_BASE.endYear;
  const BASE_WAGE = COHORT_BASE.wage, CAREER_YEARS = COHORT_BASE.careerYears;
function contributionRates(year, config) {
  const rates = context.contributionRates
    ? context.contributionRates(year, config)
    : { retirementRate: config.contributionRate * RETIREMENT_CONTRIBUTION_SHARE,
      protectedRate: config.contributionRate * (1 - RETIREMENT_CONTRIBUTION_SHARE) };
  if (!rates || !Number.isFinite(rates.retirementRate) || rates.retirementRate < 0 ||
      !Number.isFinite(rates.protectedRate) || rates.protectedRate < 0) {
    throw new RangeError('Contribution rates must be finite nonnegative payroll shares');
  }
  const meiRate = rates.meiRate ?? 0;
  if (!Number.isFinite(meiRate) || meiRate < 0 || meiRate > rates.protectedRate) throw new RangeError('Invalid earmarked MEI rate');
  return { retirementRate: rates.retirementRate, protectedRate: rates.protectedRate, meiRate };
}
function sumStock(cohorts, key) {
  return cohorts.reduce((sum, item) => sum + item[key] * item.size, 0);
}

// Retirement benefits paid to the people counted in `retirees` (the same rule as payablePensionAnnual).
const retireeBenefits = flows => flows.retirementBenefits - (flows.fundedBenefitsNoClaim ?? 0);

function output(year, wage, workers, retirees, gdp, flows, accounts, cohorts, assetsStart) {
  // Only contributory retirement beneficiaries enter this cohort denominator, so the numerator leaves out the
  // funded annuities of people who are not counted as retirees (noClaim; audit 1.85, 1).
  const averagePensionAnnual = retirees > 0 ? retireeBenefits(flows) / retirees : 0;
  // One pass over the cohorts (up to ~64,000 by 2070). Each total adds the same
  // terms in the same order as separate filter/reduce passes would, so the
  // floating-point results are identical; only the repeated walks are gone.
  let closingRetirementAnnualRate = 0, closingRetirementCount = 0, scheduledPublicRetirementRate = 0;
  let fundedAssets = 0, activeFundedAssets = 0, retiredFundedAssets = 0, preservedFundedAssets = 0, notionalBalance = 0;
  for (const c of cohorts) {
    fundedAssets = fundedAssets + c.fundedAssets * c.size;
    if (c.retired) retiredFundedAssets = retiredFundedAssets + c.fundedAssets * c.size;
    else activeFundedAssets = activeFundedAssets + c.fundedAssets * c.size;
    preservedFundedAssets = preservedFundedAssets + (c.preservedFundedAssets ?? c.fundedAssets) * c.size;
    notionalBalance = notionalBalance + c.ndcBalance * c.size;
    if (c.retired && c.hasWorked) {
      closingRetirementAnnualRate = closingRetirementAnnualRate + c.size * (c.legacyAnnual + c.paygAnnual + c.ndcAnnual + c.fundedAnnual);
      closingRetirementCount = closingRetirementCount + c.size;
      scheduledPublicRetirementRate = scheduledPublicRetirementRate + c.size * (c.legacyAnnual + c.paygAnnual + c.ndcAnnual);
    }
  }
  const publicCut = flows.paymentAdjustment?.policy.publicPensionCut ?? 0;
  // «Per contributor» means per person who works (1.56): the full Laffer response lowers
  // the hours, and with them the full-time equivalents (`workers`), not the persons
  // (`workingPersons`, docs/PLAN-1.56-LOTE.md). Without lost hours the two are the same.
  const persons = flows.workingPersons ?? workers;
  const fundedAssetsPerWorker = persons > 0 ? fundedAssets / persons : 0;
  const activeFundedAssetsPerWorker = persons > 0 ? activeFundedAssets / persons : 0;
  const preservedFundedAssetsPerWorker = persons > 0 ? preservedFundedAssets / persons : 0;
  const preservedRetirementBenefits = (flows.publicRetirementBenefits ?? 0) + (flows.preservedFundedBenefits ?? 0)
    - (flows.preservedFundedBenefitsNoClaim ?? 0);
  const averagePensionPreserveCapitalAnnual = retirees > 0 ? preservedRetirementBenefits / retirees : 0;
  // Pension over the average wage. With the full Laffer response, `wage` is the pay of a
  // full-time equivalent worker and each person works `hours` of it: the pension is set
  // against what a worker actually earns, the base its rights were earned on (1.54,
  // docs/PLAN-1.54-LAFFER-COMPLETO.md). Otherwise the two are the same.
  const averageEarnings = flows.lafferHours ? wage * flows.lafferHours.hours : wage;
  const replacementRatePreserveCapital = averageEarnings > 0 ? averagePensionPreserveCapitalAnnual / averageEarnings : 0;
  const structuralPensionGap = accounts.pensionGap - flows.fundedContributions;
  return {
    year, workers, retirees, wage, gdp, ...flows, ...accounts,
    closingRetirementCount,
    closingRetirementAnnualRate: publicCut ? closingRetirementAnnualRate - publicCut * scheduledPublicRetirementRate : closingRetirementAnnualRate,
    ...(flows.paymentAdjustment ? { paymentAdjustment: { ...flows.paymentAdjustment,
      ...accounts.paymentSpendingAdjustment, scheduledClosingRetirementAnnualRate: closingRetirementAnnualRate } } : {}),
    labourProductivity: gdp / workers, payrollGDP: workers * wage / gdp,
    referenceWorkers: referenceEmployment(year),
    // The reference is employment in persons (Ageing Report 2024).
    employmentResidual: persons - referenceEmployment(year),
    debtGDP: accounts.debt / gdp * 100,
    baseRateDebtGDP: (accounts.baseRateDebt ?? accounts.debt) / gdp * 100,
    riskPremiumDebtSnowballGDP: (accounts.riskPremiumDebtSnowball ?? 0) / gdp * 100,
    pensionGapGDP: accounts.pensionGap / gdp * 100,
    transitionContributions: flows.fundedContributions,
    transitionContributionsGDP: flows.fundedContributions / gdp * 100,
    legacyBenefitsGDP: flows.legacyBenefits / gdp * 100,
    structuralPensionGap,
    structuralPensionGapGDP: structuralPensionGap / gdp * 100,
    publicPensionSpendingGDP: flows.publicBenefits / gdp * 100,
    stateBalanceGDP: accounts.stateBalance / gdp * 100,
    averagePensionAnnual, replacementRate: averagePensionAnnual / averageEarnings,
    ...(flows.lafferHours ? { averageEarningsAnnual: averageEarnings } : {}),
    averagePensionPreserveCapitalAnnual, replacementRatePreserveCapital,
    fundedAssets,
    // Every euro entering this fund comes from diverted payroll contributions
    // or a return on assets already invested. No unfinanced reserve or match.
    fundedExternalContributions: 0,
    fundedReserveTransfers: 0,
    // One contribution, one destination: the retirement contribution of the payroll minus what the cohorts sent to
    // the funded, notional and pay-as-you-go parts (0 up to rounding; since 1.72 it measures, review 3).
    contributionAllocationResidual: flows.paygContributions === undefined ? flows.totalContributions - flows.publicContributions - flows.fundedContributions
      : flows.retirementContributions - flows.fundedContributions - flows.notionalCredits - flows.paygContributions,
    fundedBalanceResidual: fundedAssets - assetsStart - flows.fundedContributions - (flows.fundedExtraContributions ?? 0) - flows.fundedInvestmentReturn
      + flows.fundedBenefits + flows.fundedBequests + flows.fundedRestructuringLoss,
    fundedAssetsGDP: fundedAssets / gdp * 100,
    activeFundedAssets,
    retiredFundedAssets,
    fundedAssetsPerWorker,
    activeFundedAssetsPerWorker,
    preservedFundedAssets,
    preservedFundedAssetsGDP: preservedFundedAssets / gdp * 100,
    preservedFundedAssetsPerWorker,
    // Active fictitious credits plus the collective reserve of converted NDC pensions.
    notionalBalance,
    notionalBalancePerWorker: persons > 0 ? notionalBalance / persons : 0,
    totalAssetsStart: assetsStart, fundedAssetsStart: assetsStart
  };
}

// hoursScale (1 except for the full Laffer response's probe) scales the hours of the
// base year, and with them payroll, contributions and GDP; pensions do not move.
function initialYear(cohorts, config, hoursScale = 1) {
  const workers = COHORT_BASE.workers * hoursScale;
  const retirees = COHORT_BASE.retirees;
  const gdp = COHORT_BASE.gdp * hoursScale;
  const rates = contributionRates(BASE_YEAR, DEFAULT_CONFIG);
  const retirementContributions = workers * BASE_WAGE * rates.retirementRate;
  const protectedContributions = workers * BASE_WAGE * rates.protectedRate;
  const totalContributions = retirementContributions + protectedContributions;
  const legacyBenefits = retirees * BASE_WAGE * COHORT_BASE.legacyReplacementRate;
  const otherAccounts = context.otherPensionAccounts?.(BASE_YEAR, COHORT_BASE.gdp);
  const otherPensionBenefits = otherAccounts?.annualBenefits ?? COHORT_BASE.gdp * otherPensionSpendingShare(BASE_YEAR, COHORT_BASE.gdp);
  const publicBenefits = legacyBenefits + otherPensionBenefits;
  // The base snapshot uses the reference policy. The facade fixes its debt too.
  const accounts = initialFiscalAccounts(gdp, publicBenefits, totalContributions,
    DEFAULT_CONFIG, config.initialDebtGDP, workers * BASE_WAGE * rates.meiRate,
    { workers, retirees, totalPensionBenefits: publicBenefits, totalPensionContributions: totalContributions });
  return output(BASE_YEAR, BASE_WAGE, workers, retirees, gdp, {
    totalContributions, publicContributions: totalContributions, fundedContributions: 0, fundedExtraContributions: 0, ndcBrake: 1, pointsFactor: 1,
    futureScenario: context.futureScenarioAt(BASE_YEAR, config), eligibleWorkers: workers,
    workingPersons: COHORT_BASE.workers,
    displacedWorkers: 0, displacementSupport: 0, spendingGDP: gdp,
    retirementContributions, protectedContributions,
    publicRetirementContributions: retirementContributions,
    legacyBenefits, paygBenefits: 0, ndcBenefits: 0, fundedBenefits: 0,
    otherPensionBenefits, retirementBenefits: legacyBenefits,
    publicRetirementBenefits: legacyBenefits,
    publicBenefits, totalBenefits: publicBenefits, fundedInvestmentReturn: 0, fundedHaircutLoss: 0,
    fundedTermsLoss: 0, fundedRestructuringLoss: 0,
    fundedBequests: 0, preservedFundedBenefits: 0, preservedRetiredBequests: 0, preservedTotalBequests: 0,
    newAwardFundedCapitalPerRetiree: 0, newAwardInterestOnlyAnnual: 0, newAwardAnnuityAnnual: 0, newAwardPublicAnnual: 0,
    effectiveFundedWeight: 0, effectiveNdcWeight: 0, effectivePaygWeight: 1,
    notionalRightsExtinguished: 0, notionalInheritanceGains: 0, notionalRevaluation: 0,
    notionalCredits: 0, notionalBalanceStart: 0, activeDeaths: 0, retiredDeaths: 0,
    fundedMortalityCredits: 0, notionalMortalityCredits: 0, retirementAgeLinkOffset: 0,
    ...(context.trackRetirementFlows ? { newRetirementAwards: 0, reclassifiedRetirementEntries: 0,
      retirementFlowDiagnostics: null } : {}),
    ...(otherAccounts ? { closingOtherPensionAnnualRate: otherAccounts.closingAnnualRate } : {})
  }, accounts, cohorts, 0);
}

/**
 * Two semesters per year, with payment/contribution then mortality in each.
 * Existing workers reaching retirement age convert at midyear. New adult
 * entrants already beyond that age do not receive an invented domestic career.
 * Active deaths return invested assets as private bequests and extinguish NDC
 * claims. At retirement, NDC/funded balances buy a pooled annuity:
 * deceased retirees' reserves remain in the cohort, never a Treasury receipt.
 * Funded annuity reserves continue to earn the net portfolio return during
 * retirement, and NDC reserves revalue with the notional payroll index.
 */
function simulate(input = {}, runtime = {}) {
  const config = resolveConfig(input, DEFAULT_CONFIG);
  // Optional, run-only market path for risk experiments: a deviation added to the
  // funds' real return in each listed year. It is not part of the saved config;
  // without it the result is identical to before.
  const returnShocks = runtime?.returnShocks ?? null;
  if (returnShocks !== null) {
    if (typeof returnShocks !== 'object' || Array.isArray(returnShocks)) throw new RangeError('returnShocks must map years to deviations');
    for (const [year, value] of Object.entries(returnShocks)) {
      if (!/^\d{4}$/.test(year) || !Number.isFinite(value) || value < -0.6 || value > 0.6) throw new RangeError(`Invalid return shock for ${year}`);
    }
  }
  // Only today's PAYG law carries the clause, unless it is activated by hand elsewhere.
  if (!closingClauseApplies(config)) return run(config, returnShocks, null, END_YEAR);
  const mode = config.closingClause;
  // The 2023 closing clause (src/shared/closing-clause.js). A first run to 2050, without
  // the surcharge, is the projection every evaluation looks at; the second run applies
  // the MEI surcharge they legislate. Payroll does not respond to it.
  const probe = run(config, returnShocks, null, Math.min(END_YEAR, CLOSING_CLAUSE_RULE.windowTo));
  const referenceRate = { ...config, contributionRate: DEFAULT_CONFIG.contributionRate };
  const totalRate = rates => rates.retirementRate + rates.protectedRate;
  // The base-year row runs the reference rates (initialYear); the scenario's own rates count from the year after.
  const rateDeviation = year => year <= BASE_YEAR ? 0
    : totalRate(contributionRates(year, config)) - totalRate(contributionRates(year, referenceRate));
  const clause = engineClausePath(probe.years, rateDeviation, mode, END_YEAR);
  const result = run(config, returnShocks, clause, END_YEAR);
  return { ...result, closingClause: { mode, evaluations: clause.evaluations, ramps: clause.ramps } };
}

// Share of the hours removed to measure what the bases take when no hours are lost.
const LAFFER_PROBE = 0.01;
/** Public revenue lost per euro of labour compensation when a share of the hours goes:
 *  `more` has the hours of `less` plus `share` of them; the Laffer lines are left out. */
function revenueTake(more, less, share) {
  const revenue = a => a.totalPublicRevenue - (a.fiscalComposition?.lafferRevenueResponse ?? 0);
  const compensation = more.revenueDrivers.compensationNominal / more.priceIndex;
  const take = (revenue(more) - revenue(less)) / share / compensation;
  return Number.isFinite(take) && take > 0 ? take : null;
}

function run(config, returnShocks, clause, lastYear) {
  const weights = weightsFor(config);
  // The full Laffer response needs the year's wedge before the cohorts work.
  const lafferFull = lafferFullActive(config) && typeof context.lafferWedgeAhead === 'function';
  // The configuration says whether the retirement ages follow the Ageing Report path (1.66).
  let cohorts = initialCohorts(config);
  const commonFund = isCommonFund(config);
  // The 'pension-runoff' pace follows those already paid a pension in the base year.
  const followRunoff = config.transitionMode === 'pension-runoff';
  const basePensioners = followRunoff ? markBasePensioners(cohorts) : 0;
  const years = [initialYear(cohorts, config)];
  // Public revenue the engine's bases lose per euro of labour compensation when hours
  // fall (the Laffer lines aside), measured each year and read the next one. The
  // base year's comes from the same year with 1 % fewer hours.
  let lafferRevenueTake = lafferFull ? revenueTake(years[0], initialYear(initialCohorts(config), config, 1 - LAFFER_PROBE), LAFFER_PROBE) : null;

  for (let year = BASE_YEAR + 1; year <= lastYear; year++) {
    const previous = years[years.length - 1];
    cohorts = cohorts.filter(item => item.size > 0);
    const pensionersLeft = followRunoff ? basePensionersLeft(cohorts, basePensioners) : 1;
    // Existing balances alone bear an opening sovereign value change. This precedes
    // entrants, contributions, returns, deaths and new annuity conversions.
    const restructuring = config.debtRestructurings.find(policy => policy.year === year);
    // A captive fund holds the State's own bonds: a haircut reaches all of it, not a global portfolio's slice
    // (decision of the author, 24/11/2026; docs/REVISION-ADVERSARIAL-2026-11-24.md, C1).
    // It keeps the exchanged bonds, so it loses their face value and then earns their new coupon (since 1.75).
    const exposure = restructuring && config.capitalizationStyle === 'sovereign-captive' ? { ...restructuring, fundedSovereignShare: 1, faceValueOnly: true } : restructuring;
    const creditorLoss = restructuring ? applyCreditorFundLoss(cohorts, previous, exposure) : null;
    cohorts.push(...entrantCohorts(year, config.entrantGrowth, config));
    // Optional observed-flow contexts split participants without changing their
    // per-person rights. Exposure and conversion then read the SAME plan.
    const prepared = context.prepareYearCohorts?.(cohorts, year, config);
    if (prepared) cohorts = prepared.cohorts;
    const wage = referenceWage(year, config.realWageGrowth, config);
    // Already inside the wage and the output per worker (1.60); here it only reaches the row.
    const capitalFactor = context.publicCapitalFactor?.(year, config) ?? 1;
    const futureScenario = context.futureScenarioAt(year, config);
    // The closing clause's MEI surcharge: earmarked like the MEI, inside the protected rate.
    const surchargeRate = clause ? clause.rate(year) : 0;
    // Full Laffer response (src/shared/laffer-response.js, docs/PLAN-1.54-LAFFER-COMPLETO.md),
    // off by default: the hours lost to this year's labour tax wedge lower full-time
    // equivalent employment, so payroll, contributions, new rights, funded contributions
    // and GDP fall by the same share. The wage per hour and rights already earned do not.
    // The hours fall just enough for the engine's own bases to lose what the source loses
    // (revenuePerCompensation), so the separate revenue line has almost nothing left to do.
    const hoursResponse = lafferFull ? lafferHours({ dTau: context.lafferWedgeAhead(year, config, previous, surchargeRate), year,
      selfFinancing: config.lafferSelfFinancing ?? LAFFER_DEFAULTS.selfFinancing,
      adjustYears: config.lafferAdjustYears ?? LAFFER_DEFAULTS.adjustYears, revenuePerCompensation: lafferRevenueTake }) : null;
    const hours = hoursResponse ? hoursResponse.hours : 1;
    // Keep pre-existing service and non-retirement pension commitments. New
    // scenario shocks must not silently cut them just because GDP falls.
    // One pass, each exposure computed once; same additions in the same order.
    let eligibleWorkers = 0, spendingWorkers = 0, delayedOutOfWork = 0;
    for (const item of cohorts) {
      const exposure = employmentExposure(item, year, config.retirementAge, config.longevityGain, config);
      eligibleWorkers = eligibleWorkers + exposure;
      spendingWorkers = spendingWorkers + exposure / (item.fertilityScale ?? 1);
      if (context.delayedOutOfWork) delayedOutOfWork = delayedOutOfWork + context.delayedOutOfWork(item, year, config);
    }
    // Persons who work, before the hours (1.56): the base of every «per contributor» figure.
    // Full-time equivalents (`workers`) carry payroll, contributions, rights and GDP.
    const workingPersons = eligibleWorkers * futureScenario.paidWorkShare;
    const workers = workingPersons * hours;
    // Those the delay of a later retirement leaves out of work (1.59) collect a support as the
    // displaced do: it enters spending and taxable income once and creates no contribution.
    const displacedWorkers = eligibleWorkers * futureScenario.unredeployedShare + delayedOutOfWork;
    const spendingGDP = spendingWorkers * context.spendingOutputPerWorker(year, config.productivityGrowth, config); // GDP trend, not wages; no births, AI or public capital
    const delayedSupport = delayedOutOfWork * wage * RETIREMENT_DELAY_SUPPORT;
    const displacementSupport = context.displacementSupport(year, config, displacedWorkers - delayedOutOfWork) + delayedSupport;
    const payroll = workers * wage;
    const payrollIndex = payroll / (previous.workers * previous.wage);
    const wageIndex = wage / previous.wage;
    const gdpBeforeCuts = workers * outputPerWorker(year, config.productivityGrowth, config);
    let gdp = gdpBeforeCuts;
    const assetsStart = creditorLoss?.creditorFundLoss.openingFundedAssetsReal ?? sumStock(cohorts, 'fundedAssets');
    const notionalBalanceStart = sumStock(cohorts, 'ndcBalance');
    const ordinaryRates = contributionRates(year, config);
    const rates = surchargeRate ? { ...ordinaryRates, protectedRate: ordinaryRates.protectedRate + surchargeRate,
      meiRate: ordinaryRates.meiRate + surchargeRate } : ordinaryRates;
    const retirementContributions = payroll * rates.retirementRate;
    const protectedContributions = payroll * rates.protectedRate;
    const totalContributions = retirementContributions + protectedContributions;
    // This is a TOTAL return on the tradable/rebalanced portfolio. The
    // exchange's coupon schedule is memorandum information, not extra income.
    const netReturn = config.realReturn - config.feeRate + (year === (context.marketShockYear ?? BASE_YEAR + 13) ? config.marketShock : 0)
      + (returnShocks?.[year] ?? 0);
    const halfReturn = Math.sqrt(1 + netReturn) - 1;
    const annuityNetReturn = config.realReturn - config.feeRate;
    const annuityHalfReturn = Math.sqrt(1 + annuityNetReturn) - 1;
    // Optional Swedish-style brake on the notional index (src/shared/ndc-options.js).
    const ndcBrake = ndcBrakeFactor(previous, config);
    const halfNotionalIndex = Math.sqrt(payrollIndex * ndcBrake);
    // Optional annuity norm (src/shared/ndc-options.js): a higher first pension,
    // then indexation below the notional index. 0 keeps the rising pension.
    const ndcNormHalf = Math.sqrt(1 + (config.ndcAnnuityNorm ?? 0)) - 1;
    // Optional extra contribution that goes only to personal funded accounts.
    const fundedExtraRate = config.fundedExtraContribution ?? 0;
    let retirees = 0;
    let legacyBenefits = 0;
    let paygBenefits = 0;
    let ndcBenefits = 0;
    let fundedBenefits = 0;
    let fundedAnnuityShortfall = 0;
    let fundedInvestmentReturn = 0;
    let fundedBequests = 0, fundedPooledBalances = 0, notionalRightsExtinguished = 0, notionalInheritanceGains = 0, notionalRevaluation = 0;
    let preservedFundedBenefits = 0, preservedRetiredBequests = 0;
    // Funded annuities paid to people not counted as retirees (noClaim, hasWorked false): still paid, kept out of
    // the per-retiree averages (audit 1.85, 1).
    let fundedBenefitsNoClaim = 0, preservedFundedBenefitsNoClaim = 0;
    let newAwardFundedAssetsTotal = 0, newAwardAnnuityAnnualTotal = 0, newAwardPublicAnnualTotal = 0;
    let careerRetirementAwards = 0, careerAwardFundedAssetsTotal = 0, careerAwardInterestOnlyAnnualTotal = 0;
    let fundedContributionsAcc = 0, fundedExtraAcc = 0, notionalCreditsAcc = 0, paygContributionsAcc = 0;
    let activeDeaths = 0, retiredDeaths = 0;
    let fundedMortalityCredits = 0, notionalMortalityCredits = 0;
    let newRetirementAwards = 0, reclassifiedRetirementEntries = 0;

    // Experiment (src/shared/ndc-past-rights.js): in the first year, the pre-2027
    // rights of people still working become notional capital. The converted
    // right leaves the legacy ledger and the capital enters the notional one,
    // as a flow of its own: it is no contribution and funds nothing.
    let pastRightsCapitalTotal = 0, pastRightsLegacyConverted = 0;
    const convertPastRights = year === BASE_YEAR + 1 && pastRightsActive(config);
    if (convertPastRights) {
      // Past contributions are priced at the rate actually paid (2026 law), not at the scenario's rate.
      const pastRetirementRate = contributionRates(BASE_YEAR, DEFAULT_CONFIG).retirementRate;
      for (const item of cohorts) {
        if (item.retired || !item.hasWorked || !(item.legacyAnnual > 0)) continue;
        // With the phase-in on, no cohort converts more of its past than the notional share of its future.
        const share = Math.min(pastRightsShare(year - item.birthYear, config), ndcPhaseInShare(item.birthYear, config));
        if (!(share > 0)) continue;
        const retirementYear = context.expectedRetirementYear
          ? context.expectedRetirementYear(item, year, config) : item.birthYear + config.retirementAge;
        const divisor = annuityFactor(retirementYear, retirementYear - item.birthYear, item.sex, 1, config.longevityGain, ndcNormHalf);
        const capital = share * pastRightsCapital({ legacyAnnual: item.legacyAnnual, retirementRate: pastRetirementRate,
          careerYears: CAREER_YEARS, accruedRate: COHORT_BASE.accruedReplacementRate, divisor, value: config.ndcPastRightsValue });
        pastRightsLegacyConverted += share * item.legacyAnnual * item.size;
        pastRightsCapitalTotal += capital * item.size;
        item.ndcBalance += capital;
        item.legacyAnnual *= 1 - share;
      }
    }
    // CPI or manual revaluation applies only to legacy/DB pensions in payment
    // at opening. Active rights follow wages; new awards are not indexed twice.
    // Points system (src/shared/points-system.js): PAYG rights earned from 2027,
    // active and in payment, follow the value of the point (wages × sustainability).
    const pointsFactor = pointsSustainability(previous, years.length > 1 ? years[years.length - 2] : null, config);
    const pointIndex = wageIndex * pointsFactor;
    for (const item of cohorts) {
      if (item.retired) {
        // Observed-policy reconstructions may distinguish the award vintage.
        // Existing contexts ignore the optional cohort argument.
        const pensionIndex = pensionInPaymentRealIndex(year, item, config);
        item.legacyAnnual *= pensionIndex;
        item.paygAnnual *= config.pointsSystem ? pointIndex : pensionIndex;
      } else {
        item.legacyAnnual *= wageIndex;
        item.paygAnnual *= config.pointsSystem ? pointIndex : wageIndex;
      }
    }
    for (let half = 0; half < 2; half++) {
      // Protected disability pensions may change administrative class without
      // creating an investment balance, a notional claim or a second payment.
      // These entries already carry the current year's indexed real benefit.
      const reclassifications = context.retirementEntries?.(year, half, config) ?? [];
      for (const item of reclassifications) {
        if (!item.retired || !item.hasWorked || !Number.isFinite(item.size) || item.size < 0 ||
            item.fundedAssets !== 0 || item.ndcBalance !== 0 || item.paygAnnual !== 0) {
          throw new RangeError('Invalid protected pension reclassification');
        }
        cohorts.push({ ...item });
        reclassifiedRetirementEntries += item.size;
      }
      for (const item of cohorts) {
        const age = year - item.birthYear, openingSize = item.size;
        const useCustomCapReturn = (config.capitalizationStyle && config.capitalizationStyle !== 'balanced-standard') ||
          (config.automationRegime && config.automationRegime !== 'status-quo-payroll') ||
          (config.publicAdminAutomationShare > 0);
        const capRet = useCustomCapReturn
          ? cohortCapitalizationReturns({
              age,
              year,
              config,
              previousDebtGDP: previous.debtGDP ?? 105,
              // The coupon of the debt entering the year; after a haircut, the exchanged debt's (since 1.75).
              previousStateRate: restructuring ? restructuring.nominalRate : previous.effectiveNominalRate,
              // The run's own price change (the 1985 model has its historical prices; since 1.75).
              inflation: context.inflationAt ? context.inflationAt(year, config) : (shortRunInflationRate(year, config) ?? config.inflationRate),
              marketShockYear: context.marketShockYear ?? BASE_YEAR + 13,
              baseYear: context.capitalizationBaseYear ?? BASE_YEAR
            })
          : null;
        // A run-only market deviation shifts the annual return of invested balances,
        // as it does for the standard style above; annuity contracts stay fixed.
        const marketDeviation = returnShocks?.[year] ?? 0;
        const shiftHalf = halfRate => (marketDeviation ? Math.sqrt(Math.max(0.05, (1 + halfRate) ** 2 + marketDeviation)) - 1 : halfRate);
        const cohortActiveHalfReturn = capRet ? shiftHalf(capRet.activeHalfReturn) : halfReturn;
        const cohortRetiredHalfReturn = capRet ? shiftHalf(capRet.retiredHalfReturn) : halfReturn;
        const cohortAnnuityHalfReturn = capRet ? capRet.annuityHalfReturn : annuityHalfReturn;
        const survival = halfYearSurvival(year, age, item.sex, config.longevityGain);
        const eligible = context.shouldRetire
          ? context.shouldRetire(item, year, half, config)
          : age >= config.retirementAge && (half === 1 || !item.hasWorked);
        if (!item.retired && eligible) {
          item.retired = true;
          item.retirementYear = year;
          const ndcDivisor = annuityFactor(year, age, item.sex, half, config.longevityGain, ndcNormHalf);
          const fundedDivisor = annuityFactor(year, age, item.sex, half, config.longevityGain, cohortAnnuityHalfReturn);
          // An incomplete career (data/career-coverage-2026.js, noClaim): no contributory public pension. The earlier
          // and new pay-as-you-go rights lapse and the notional balance is extinguished; a private fund is still paid.
          if (item.noClaim) {
            notionalRightsExtinguished += item.ndcBalance * item.size;
            item.ndcBalance = 0; item.legacyAnnual = 0; item.paygAnnual = 0; item.hasWorked = false;
          }
          item.ndcAnnual = item.ndcBalance / ndcDivisor;
          item.fundedAnnual = item.fundedAssets / fundedDivisor;
          // The annuity's contract rate is the award year's: later years scale it by what the reserve earns over
          // that rate, so a portfolio whose annuity rate moves (the captive fund) neither piles up nor runs dry (1.76).
          item.annuityHalfRate = cohortAnnuityHalfReturn;
          item.preservedFundedAssets = item.fundedAssets;
          if (item.hasWorked) {
            newRetirementAwards += item.size;
            newAwardFundedAssetsTotal += item.fundedAssets * item.size;
            newAwardAnnuityAnnualTotal += item.fundedAnnual * item.size;
            newAwardPublicAnnualTotal += (item.legacyAnnual + item.paygAnnual + item.ndcAnnual) * item.size;
            const isCareerCohort = item.youngEntryShare === undefined || item.youngEntryShare > 0;
            // With the age in steps, each generation is measured against its own age (the same number without them),
            // and with the Ageing Report path (1.66), with that generation's rise (0 without it).
            const careerAge = ((config.retirementAgeStepYears ?? 0) > 0
              ? COHORT_BASE.retirementAge + generationAgeShift(item.birthYear, config.retirementAge - COHORT_BASE.retirementAge, config.retirementAgeStepYears, COHORT_BASE.retirementAge)
              : config.retirementAge) + (context.exitPathRise?.(item.birthYear, config) ?? 0);
            if (isCareerCohort && age >= careerAge - 2) {
              careerRetirementAwards += item.size;
              careerAwardFundedAssetsTotal += item.fundedAssets * item.size;
              careerAwardInterestOnlyAnnualTotal += item.fundedAssets * Math.max(0, (1 + cohortRetiredHalfReturn) ** 2 - 1) * item.size;
            }
          }
        }
        if (!item.retired) {
          const workShare = context.employmentShare?.(item, year, half, config) ?? 1;
          if (!Number.isFinite(workShare) || workShare < 0 || workShare > 1) {
            throw new RangeError('Employment share must lie between zero and one');
          }
          if (workShare > 0) item.hasWorked = true;
          const w = ndcPhaseInWeights(cohortTransitionWeights(item, year, config, weights, BASE_YEAR, pensionersLeft), item.birthYear, config);
          // Each worker's hours are those of the year (1 unless the full Laffer response acts).
          const contribution = 0.5 * wage * rates.retirementRate * workShare * hours;
          const cohortFundedContrib = contribution * w.funded;
          const cohortNdcContrib = contribution * w.ndc;
          // Paid on top of today's rate: it never enters the PAYG/NDC contributions above.
          const cohortExtraContrib = 0.5 * wage * fundedExtraRate * workShare * hours;
          // A return is earned only on an existing balance. Institutional or
          // robot co-contributions require an identified payer and are absent.
          const investmentReturn = item.fundedAssets * cohortActiveHalfReturn;
          item.fundedAssets += investmentReturn;
          fundedInvestmentReturn += investmentReturn * item.size;
          notionalRevaluation += item.ndcBalance * (halfNotionalIndex - 1) * item.size;
          item.ndcBalance *= halfNotionalIndex;
          fundedContributionsAcc += cohortFundedContrib * openingSize;
          notionalCreditsAcc += cohortNdcContrib * openingSize;
          paygContributionsAcc += contribution * w.payg * openingSize;
          item.fundedAssets += cohortFundedContrib + cohortExtraContrib;
          fundedExtraAcc += cohortExtraContrib * openingSize;
          item.preservedFundedAssets = item.fundedAssets;
          item.ndcBalance += cohortNdcContrib;
          // The expected award-year ratio scales NEW accrual; vested legacy is
          // never cut to force the aggregate official replacement-rate target.
          const expectedAwardYear = context.expectedRetirementYear
            ? context.expectedRetirementYear(item, year, config)
            : item.birthYear + config.retirementAge;
          const expectedAwardRate = newAwardRate(expectedAwardYear) *
            config.replacementRate / COHORT_BASE.accruedReplacementRate;
          const accrualYears = context.paygAccrualYears
            ? context.paygAccrualYears(item, year, half, config) : CAREER_YEARS;
          item.paygAnnual += 0.5 * wage * expectedAwardRate / accrualYears * w.payg * workShare * hours;
          // Optional historical policy metadata follows the same working halves
          // as contributions. Existing forward contexts retain their old rules.
          context.afterActiveHalf?.(item, year, half, config, workShare);
          const deaths = openingSize * (1 - survival);
          activeDeaths += deaths;
          if (commonFund) {
            // A common fund: the share of whoever dies before retiring stays with their cohort.
            fundedPooledBalances += item.fundedAssets * deaths;
            item.fundedAssets = survival > 0 ? item.fundedAssets / survival : 0;
            item.preservedFundedAssets = item.fundedAssets;
          } else {
            fundedBequests += item.fundedAssets * deaths;
          }
          if (config.ndcInheritanceGains) {
            // Inheritance gains: survivors of the cohort keep the balance of those who died.
            notionalInheritanceGains += item.ndcBalance * deaths;
            item.ndcBalance = survival > 0 ? item.ndcBalance / survival : 0;
          } else {
            notionalRightsExtinguished += item.ndcBalance * deaths;
          }
        } else {
          if (item.hasWorked) retirees += item.size * 0.5;
          legacyBenefits += item.legacyAnnual * item.size * 0.5;
          paygBenefits += item.paygAnnual * item.size * 0.5;
          const ndcPayment = Math.min(item.ndcBalance, item.ndcAnnual * 0.5);
          const fundedPayment = Math.min(item.fundedAssets, item.fundedAnnual * 0.5);
          fundedAnnuityShortfall += (item.fundedAnnual * 0.5 - fundedPayment) * item.size;
          const preservedCap = item.preservedFundedAssets ?? item.fundedAssets;
          const preservedReturn = preservedCap * cohortRetiredHalfReturn;
          const preservedPayment = Math.max(0, preservedReturn);
          preservedFundedBenefits += preservedPayment * item.size;
          if (!item.hasWorked) preservedFundedBenefitsNoClaim += preservedPayment * item.size;
          item.preservedFundedAssets = preservedReturn < 0 ? Math.max(0, preservedCap + preservedReturn) : preservedCap;
          item.ndcBalance -= ndcPayment;
          item.fundedAssets -= fundedPayment;
          ndcBenefits += ndcPayment * item.size;
          fundedBenefits += fundedPayment * item.size;
          if (!item.hasWorked) fundedBenefitsNoClaim += fundedPayment * item.size;
          const retiredInvestmentReturn = item.fundedAssets * cohortRetiredHalfReturn;
          item.fundedAssets += retiredInvestmentReturn;
          fundedInvestmentReturn += retiredInvestmentReturn * item.size;
          const contractHalfRate = item.annuityHalfRate ?? cohortAnnuityHalfReturn;
          if (cohortRetiredHalfReturn !== contractHalfRate && contractHalfRate > -1) {
            item.fundedAnnual *= (1 + cohortRetiredHalfReturn) / (1 + contractHalfRate);
          }
          const retiredNotionalRevaluation = item.ndcBalance * (halfNotionalIndex - 1);
          item.ndcBalance += retiredNotionalRevaluation;
          notionalRevaluation += retiredNotionalRevaluation * item.size;
          item.ndcAnnual *= halfNotionalIndex / (1 + ndcNormHalf);
          const deaths = openingSize * (1 - survival);
          if (item.hasWorked) retiredDeaths += deaths;
          // Internal mortality credits preserve the aggregate retirement reserve.
          // They are memorandum transfers, not returns, revenue or new assets.
          fundedMortalityCredits += item.fundedAssets * deaths;
          notionalMortalityCredits += item.ndcBalance * deaths;
          preservedRetiredBequests += item.preservedFundedAssets * deaths;
          item.fundedAssets = survival > 0 ? item.fundedAssets / survival : 0;
          item.ndcBalance = survival > 0 ? item.ndcBalance / survival : 0;
        }
        item.size = openingSize * survival;
      }
    }

    const otherAccounts = context.otherPensionAccounts?.(year, gdp);
    let otherPensionBenefits = otherAccounts?.annualBenefits ?? spendingGDP * otherPensionSpendingShare(year, spendingGDP);
    const paymentPolicy = paymentAdjustmentForYear(config.paymentAdjustments, year);
    let paymentAdjustment = null;
    if (paymentPolicy && (paymentPolicy.publicPensionCut || paymentPolicy.otherSpendingCut)) {
      const publicBenefitsBeforeAdjustment = legacyBenefits + paygBenefits + ndcBenefits + otherPensionBenefits;
      paymentAdjustment = { policy: { ...paymentPolicy }, publicBenefitsBeforeAdjustment,
        scheduledLegacyBenefits: legacyBenefits, scheduledPaygBenefits: paygBenefits,
        scheduledNdcBenefits: ndcBenefits, scheduledOtherPensionBenefits: otherPensionBenefits,
        publicPensionPaymentReduction: publicBenefitsBeforeAdjustment * paymentPolicy.publicPensionCut };
      // The payment decision does not rewrite earned rights or fictional NDC
      // reserves. Their scheduled debit above stays intact; this is no new asset.
      if (paymentPolicy.publicPensionCut) {
        const paidShare = 1 - paymentPolicy.publicPensionCut;
        legacyBenefits *= paidShare; paygBenefits *= paidShare; ndcBenefits *= paidShare;
        otherPensionBenefits *= paidShare;
      }
    }
    const isProgressive = config.transitionMode && config.transitionMode !== 'none';
    // The aggregate ledger uses exactly what entered cohort accounts. The
    // same contributions cannot also fund PAYG; any fiscal shortfall reaches
    // publicAccounts and its ordinary tax/debt financing without a buffer.
    const fundedContributions = fundedContributionsAcc;
    const notionalCredits = notionalCreditsAcc;
    const publicRetirementContributions = retirementContributions - fundedContributions;
    const publicContributions = protectedContributions + publicRetirementContributions;
    const effectiveFundedWeight = retirementContributions > 0 ? fundedContributions / retirementContributions : weights.funded;
    const effectiveNdcWeight = retirementContributions > 0 ? notionalCredits / retirementContributions : weights.ndc;
    // Measured cohort by cohort, as the other two, since 1.72: the residual below compares the three with the payroll
    // (docs/REVISION-ADVERSARIAL-2026-11-24.md, 3).
    const paygContributions = paygContributionsAcc;
    const effectivePaygWeight = retirementContributions > 0 ? paygContributions / retirementContributions : weights.payg;
    const publicRetirementBenefits = legacyBenefits + paygBenefits + ndcBenefits;
    const retirementBenefits = publicRetirementBenefits + fundedBenefits;
    const publicBenefits = publicRetirementBenefits + otherPensionBenefits;
    const awardDenom = isProgressive && careerRetirementAwards > 0 ? careerRetirementAwards : newRetirementAwards;
    const awardAssetsTotal = isProgressive && careerRetirementAwards > 0 ? careerAwardFundedAssetsTotal : newAwardFundedAssetsTotal;
    const newAwardFundedCapitalPerRetiree = awardDenom > 0 ? awardAssetsTotal / awardDenom : 0;
    const newAwardInterestOnlyAnnual = isProgressive && careerRetirementAwards > 0
      ? careerAwardInterestOnlyAnnualTotal / careerRetirementAwards
      : newAwardFundedCapitalPerRetiree * Math.max(0, annuityNetReturn);
    const newAwardAnnuityAnnual = newRetirementAwards > 0 ? newAwardAnnuityAnnualTotal / newRetirementAwards : 0;
    const newAwardPublicAnnual = newRetirementAwards > 0 ? newAwardPublicAnnualTotal / newRetirementAwards : 0;
    const preservedTotalBequests = fundedBequests + preservedRetiredBequests;
    // Optional stress premium on this year's new debt, after a year of high risk.
    const stressPremium = stressPremiumRate(previous, years.length > 1 ? years[years.length - 2] : null, config, years);
    const fiscalContext = { workers, retirees, realPayroll: payroll, spendingGDP, displacedWorkers, displacementSupport, stressPremiumRate: stressPremium,
      // The closing clause's MEI surcharge raises the tax on labour like any contribution
      // point, so the Laffer response reads it too (1.53, docs/PLAN-1.53-LAFFER.md).
      closingClauseRate: surchargeRate,
      // Contributions enter the tax bases whatever their routing, so the extra
      // funded contribution counts too (labour cost, lower disposable income).
      totalPensionBenefits: publicBenefits + fundedBenefits, totalPensionContributions: totalContributions + fundedExtraAcc };
    let accounts = publicAccounts(gdp, publicBenefits, publicContributions, previous, config, year, payroll * rates.meiRate, fiscalContext);
    // Short-run multiplier of other-spending cuts (src/shared/cut-multiplier.js).
    // The cut follows the spending reference, not GDP, so the first pass gives it
    // exactly; GDP then falls by the demand gap and the public accounts are
    // recomputed once with it. Cohorts, wages and contributions do not respond.
    const cutDemand = cutDemandGap({ reduction: accounts.paymentSpendingAdjustment?.otherSpendingReduction ?? 0,
      gdpBeforeCuts, previous, beforePrevious: years.length > 1 ? years[years.length - 2] : null, config });
    const run = (value, extra = {}) => publicAccounts(value, publicBenefits, publicContributions, previous, config, year, payroll * rates.meiRate, { ...fiscalContext, ...extra });
    const gdpAfterCuts = gdpBeforeCuts * (1 - cutDemand.gap);
    if (cutDemand.gap !== 0) { gdp = gdpAfterCuts; accounts = run(gdp); }
    // Laffer and GDP: with the full response (1.54), GDP falls with the hours. The
    // GDP-only option of 1.38–1.53 (lafferOutputResponse) is gone: GDP fell while wages,
    // employment and pensions did not. Its key is still accepted, and ignored.
    const laffer = accounts.fiscalComposition?.laffer;
    const lafferOutput = hoursResponse ? hours - 1 : 0;
    let lafferGdpRevenueOffset = 0;
    let lafferHoursRow = null;
    if (hoursResponse) {
      // No double count: the revenue line is the whole Trabandt–Uhlig loss on the bases
      // without a response. The same year runs once more with those bases (every flow of
      // the year is proportional to the hours), and the line keeps only the part of that
      // loss the lower bases do not take on their own (lafferGdpRevenueOffset gives the
      // rest back), so the year's public revenue loses it once. Without lost hours, the
      // second run has 1 % fewer hours and only measures the bases. Pensions are the same
      // in both runs: lower rights and funded balances are the new part of the response.
      const scale = hours !== 1 ? 1 / hours : 1 - LAFFER_PROBE;
      const other = publicAccounts(gdp * scale, publicBenefits, publicContributions * scale, previous, config, year, payroll * rates.meiRate * scale,
        { ...fiscalContext, workers: workers * scale, realPayroll: payroll * scale,
          totalPensionContributions: (totalContributions + fundedExtraAcc) * scale });
      let revenueWithoutResponse = accounts.totalPublicRevenue, lafferLoss = -(laffer?.revenueResponse ?? 0), basesLoss = 0;
      if (hours !== 1) {
        revenueWithoutResponse = other.totalPublicRevenue;
        lafferLoss = -(other.fiscalComposition?.laffer?.revenueResponse ?? 0);
        lafferGdpRevenueOffset = revenueWithoutResponse - accounts.totalPublicRevenue;
        // What the lower bases take, before the revenue line of either run.
        basesLoss = lafferGdpRevenueOffset + lafferLoss + (laffer?.revenueResponse ?? 0);
        lafferRevenueTake = revenueTake(other, accounts, 1 - hours);
        accounts = run(gdp, { lafferGdpRevenueOffset });
      } else {
        lafferRevenueTake = revenueTake(accounts, other, LAFFER_PROBE);
      }
      lafferHoursRow = { ...hoursResponse, lafferLoss, basesLoss, revenueOffset: lafferGdpRevenueOffset, revenueWithoutResponse,
        revenuePerCompensationMeasured: lafferRevenueTake };
    }
    years.push(output(year, wage, workers, retirees, gdp, {
      totalContributions, publicContributions, fundedContributions, fundedExtraContributions: fundedExtraAcc, ndcBrake, pointsFactor, gdpBeforeCuts, cutDemand, lafferOutput, lafferGdpRevenueOffset,
      futureScenario, eligibleWorkers, workingPersons, displacedWorkers, displacementSupport, spendingGDP,
      ...(delayedOutOfWork > 0 ? { delayedOutOfWork, delayedSupport } : {}),
      ...(capitalFactor !== 1 ? { publicCapitalFactor: capitalFactor } : {}),
      retirementContributions, protectedContributions, publicRetirementContributions,
      legacyBenefits, paygBenefits, ndcBenefits, fundedBenefits,
      publicRetirementBenefits, retirementBenefits, otherPensionBenefits,
      publicBenefits, totalBenefits: publicBenefits + fundedBenefits, fundedInvestmentReturn,
      // Funded annuities due but not paid because a reserve ran out (none unless it does).
      ...(fundedAnnuityShortfall > 1e-6 ? { fundedAnnuityShortfall } : {}),
      ...(paymentAdjustment ? { paymentAdjustment } : {}),
      fundedHaircutLoss: creditorLoss?.fundedHaircutLoss ?? 0,
      fundedTermsLoss: creditorLoss?.fundedTermsLoss ?? 0,
      fundedRestructuringLoss: creditorLoss?.fundedRestructuringLoss ?? 0,
      ...(creditorLoss ? { creditorFundLoss: creditorLoss.creditorFundLoss } : {}),
      fundedBequests, preservedFundedBenefits, preservedRetiredBequests, preservedTotalBequests,
      // Only when someone not counted as a retiree draws a fund, so other rows keep their exact shape.
      ...(fundedBenefitsNoClaim > 0 ? { fundedBenefitsNoClaim } : {}),
      ...(preservedFundedBenefitsNoClaim > 0 ? { preservedFundedBenefitsNoClaim } : {}),
      // Only with a common fund, so other rows keep their exact shape.
      ...(commonFund ? { fundedPooledBalances } : {}),
      newAwardFundedCapitalPerRetiree, newAwardInterestOnlyAnnual, newAwardAnnuityAnnual, newAwardPublicAnnual,
      effectiveFundedWeight, effectiveNdcWeight, effectivePaygWeight, paygContributions,
      notionalRightsExtinguished, notionalInheritanceGains, notionalRevaluation,
      notionalCredits, notionalBalanceStart,
      // Only with the 1.52 experiment, so default rows keep their exact shape.
      ...(convertPastRights ? { notionalPastRightsCapital: pastRightsCapitalTotal, legacyRightsConverted: pastRightsLegacyConverted } : {}),
      activeDeaths, retiredDeaths, fundedMortalityCredits, notionalMortalityCredits,
      // Years added to the retirement age of whoever turns 65 this year by the life-expectancy link.
      retirementAgeLinkOffset: context.linkedAgeOffset?.({ birthYear: year - 65 }, config) ?? 0,
      // Years that the generation turning 65 this year can expect to collect a pension.
      yearsCollectingGeneration65: context.yearsCollectingFor?.(year, config) ?? null,
      ...(context.trackRetirementFlows ? { newRetirementAwards, reclassifiedRetirementEntries,
        retirementFlowDiagnostics: prepared?.diagnostics ?? null } : {}),
      ...(otherAccounts ? { closingOtherPensionAnnualRate: otherAccounts.closingAnnualRate * (1 - (paymentPolicy?.publicPensionCut ?? 0)) } : {}),
      ...(clause ? { closingClauseRate: surchargeRate, closingClauseContributions: payroll * surchargeRate } : {}),
      // Only with the full Laffer response, so default rows keep their exact shape.
      ...(lafferHoursRow ? { lafferHours: lafferHoursRow } : {})
    }, accounts, cohorts, assetsStart));
  }

  return {
    // Default runs echo the config without the 1.52 experiment keys, the 1.61 share or the age steps (same bytes as before).
    config: omitDefaultAgeSteps(omitDefaultInvestmentShare(omitInactivePastRights(config))), years,
    fundingAssumptions: {
      openingFundedAssets: 0,
      fundedContributionSource: 'diverted-payroll-contributions',
      externalCoContributions: 'none',
      reserveTransfers: 'none',
      investmentReturns: 'explicit-scenario-assumptions-on-existing-assets',
      publicFinancing: 'remaining-contributions-taxes-and-explicit-debt',
      notionalBalances: 'public-pension-rights-not-invested-assets'
    },
    summary: {
      firstGapYear: years.find(item => item.pensionGap > 0)?.year ?? null,
      maxGapGDP: Math.max(...years.map(item => item.pensionGapGDP)),
      endDebtGDP: years[years.length - 1].debtGDP,
      endBaseRateDebtGDP: years[years.length - 1].baseRateDebtGDP
    }
  };
}

return Object.freeze({ simulate,
  validateConfig: (input = {}) => resolveConfig(input, DEFAULT_CONFIG),
  systemWeights: (input = {}) => weightsFor(resolveConfig(input, DEFAULT_CONFIG)) });
}
