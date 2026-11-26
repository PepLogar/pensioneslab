import { PENSION_POLICY_2026 as POLICY } from '../data/pension-policy-2026.js';
import { DEFAULT_REVALUATION_CONFIG, validateRevaluationChoice } from './config-current-v2.js';
import { shortRunInflationRate } from './shared/short-run-employment.js';

function yearValue(year) {
  if (!Number.isInteger(year)) throw new TypeError('Policy year must be an integer');
  return year;
}
function finite(value, name, minimum = -Infinity) {
  if (!Number.isFinite(value) || value < minimum) throw new RangeError(`Invalid ${name}`);
  return value;
}
function inflation(value, name) {
  finite(value, name);
  if (value <= -1) throw new RangeError(`${name} must exceed -100%`);
  return value;
}
function ratesCopy(input, name) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`Invalid ${name}`);
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (!/^\d{4}$/.test(key)) throw new TypeError(`Invalid ${name} year`);
    result[key] = inflation(value, name);
  }
  return Object.freeze(result);
}

export function meiRate(year) {
  yearValue(year);
  return POLICY.mei.schedule.find(row => year >= row.from && year <= row.through)?.total ?? 0;
}

/** Rates on the THREE statutory excess-pay bands, not a rate on all payroll. */
export function solidarityRates(year) {
  yearValue(year);
  if (year < 2025) return [0, 0, 0];
  const index = POLICY.solidarity.years.indexOf(Math.min(year, 2045));
  return [...POLICY.solidarity.rates[index]];
}

/** Calendar metadata only: callers must not assign a career from a mean wage. */
export function ordinaryRetirementRule(year) {
  yearValue(year);
  const rule = POLICY.ordinaryRetirement.schedule.find(row => year >= row.from &&
    (row.through === null || year <= row.through));
  return rule ? { ...rule } : null;
}

/** Twelve DEC(t-2)..NOV(t-1) CPI year-on-year fractions, not monthly changes. */
export function pensionRevaluationFromMonthlyRates(rates) {
  if (!Array.isArray(rates) || rates.length !== 12) throw new TypeError('Twelve CPI year-on-year rates are required');
  // Array.from also exposes holes; missing observations must not become zero.
  const values = Array.from(rates, rate => inflation(rate, 'monthly year-on-year CPI'));
  return Math.max(0, values.reduce((sum, rate) => sum + rate, 0) / 12);
}

/** A ceiling is not an approved withdrawal. Null after2053 means no schedule. */
export function reserveWithdrawalLimitGDP(year) {
  yearValue(year);
  if (year < 2033) return 0;
  return POLICY.reserveFund.maximumWithdrawalShareGDP[year] ?? null;
}

/** Pure nominal memorandum. This NEVER changes the consolidated debt/cash.
 * Opening total is March2026, with no invented April-December bridge.
 * Future MEI is booked once as revenue by fiscal, and here only as earmarking.
 * Future allocations to domestic government debt are an explicit scenario
 * assumption, not observed external assets. The initial2026 split is unknown.
 */
export function accumulateReserve(previous, meiReal, priceIndex, year) {
  yearValue(year);
  finite(meiReal, 'real MEI', 0);
  finite(priceIndex, 'price index', Number.MIN_VALUE);
  if (year < POLICY.baseYear) throw new RangeError('Reserve memorandum begins in2026');
  const base = year === POLICY.baseYear;
  const initial = POLICY.reserveFund.latestTotal2026.totalEUR;
  if (!base && !previous) throw new TypeError('The previous reserve memorandum is required');
  const opening = base ? null : finite(previous.reserveFundTotalNominal, 'previous reserve total', 0);
  const inflow = base ? 0 : meiReal * priceIndex;
  const priorContributions = base ? 0 : finite(previous.reserveFundCumulativeMeiNominal, 'previous cumulative MEI', 0);
  return {
    reserveFundYear: year,
    reserveFundObservedDate: POLICY.reserveFund.latestTotal2026.date,
    reserveFundOpeningNominal: opening,
    reserveFundTotalNominal: base ? initial : opening + inflow,
    reserveFundMeiInflowNominal: inflow,
    reserveFundCumulativeMeiNominal: priorContributions + inflow,
    reserveFundAdditionalInternalClaimsNominal: priorContributions + inflow,
    reserveFundWithdrawalNominal: 0,
    reserveFundInternalReturnNominal: 0,
    reserveFundExternalAssetsNominal: null,
    reserveFundCashNominal: null,
    reserveFundSFAReal: 0,
    reserveFundWithdrawalLimitGDP: reserveWithdrawalLimitGDP(year)
  };
}

/** Hooks for the new current facade only; frozen historical engines untouched.
 * Prior rates may be forecasts/assumptions. Explicit pensionRevaluationRates
 * override the annual CPI proxy after the statutory zero floor in CPI mode.
 * A manual policy is a counterfactual nominal change, including cuts, rather
 * than a claim about current law. It applies only to legacy/DB already in pay.
 * Current-year deflation uses the config supplied by the facade for that year.
 */
export function createCurrentPolicyV2(base, {
  priorYearInflationRates = {}, pensionRevaluationRates = {}
} = {}) {
  const baseYear = base.baseYear ?? POLICY.baseYear;
  yearValue(baseYear);
  const payroll = finite(base.workers, 'base workers', Number.MIN_VALUE) *
    finite(base.wage, 'base wage', Number.MIN_VALUE);
  const baseMeiRate = meiRate(baseYear);
  if (baseMeiRate === 0) throw new RangeError('Base year must have an approved MEI rate');
  const baseMeiPayrollShare = finite(base.meiAnnualPace, 'base MEI', 0) / payroll;
  const retirementShare = finite(base.retirementContributionShare, 'retirement contribution share', 0);
  if (retirementShare > 1) throw new RangeError('Retirement contribution share exceeds one');
  const priorRates = ratesCopy({
    [POLICY.pensionIndexation.firstPriorYearProxy.year]: POLICY.pensionIndexation.firstPriorYearProxy.rate,
    ...priorYearInflationRates
  }, 'prior-year inflation');
  const revaluations = ratesCopy(pensionRevaluationRates, 'pension revaluation');
  function pensionInPaymentRealIndex(year, _cohort, config) {
    yearValue(year);
    const choice = validateRevaluationChoice(
      Object.hasOwn(config, 'pensionRevaluationMode') ? config.pensionRevaluationMode : DEFAULT_REVALUATION_CONFIG.pensionRevaluationMode,
      Object.hasOwn(config, 'pensionRevaluationRate') ? config.pensionRevaluationRate : DEFAULT_REVALUATION_CONFIG.pensionRevaluationRate);
    if (year <= baseYear) return 1; // Snapshot already includes2026 revaluation.
    const currentInflation = inflation(config.inflationRate, 'current inflation');
    // The law's lag: last year's inflation of the path (the AIReF's in 2027–2030 when that option is on; since 1.72,
    // docs/REVISION-ADVERSARIAL-2026-11-24.md, 8). With a constant inflation it is this year's, as before.
    const priorInflation = priorRates[year - 1] ?? shortRunInflationRate(year - 1, config) ?? currentInflation;
    // The law's CPI (never below 0); 'cpi-points' adds its points to it, 'manual' replaces it.
    const cpi = Math.max(0, revaluations[year] ?? priorInflation);
    const nominalRevaluation = choice.pensionRevaluationMode === 'manual' ? choice.pensionRevaluationRate
      : choice.pensionRevaluationMode === 'cpi-points' ? cpi + choice.pensionRevaluationRate : cpi;
    return (1 + nominalRevaluation) / (1 + currentInflation);
  }
  return Object.freeze({
    contributionRates(year, config) {
      const ordinary = finite(config.contributionRate, 'ordinary contribution rate', 0);
      const mei = baseMeiPayrollShare * meiRate(year) / baseMeiRate;
      return {
        retirementRate: ordinary * retirementShare,
        protectedRate: ordinary * (1 - retirementShare) + mei,
        meiRate: mei
      };
    },
    pensionInPaymentRealIndex,
    meiRate, solidarityRates, ordinaryRetirementRule, reserveWithdrawalLimitGDP,
    assumptions: Object.freeze({
      indexation: 'Prior-year inflation proxy;2026 fallback is BdE forecast HICP3.9%, not the legal December-November CPI observation.',
      indexationChoice: 'Manual nominal changes from2027 affect legacy and DB pensions already in payment, including negative rates. NDC/private annuity contracts and other public pension categories are unchanged.',
      contributionBase: 'Observed MEI annual pace calibrated to aggregate model payroll; not individual taxable bases.',
      solidarity: 'Statutory rates exposed as metadata; no additional aggregate revenue imputed.',
      retirement: 'Observed award-age profile retained; calendar exposed without inventing credited careers.'
    })
  });
}
