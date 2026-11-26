/** V3 changes only the aggregate levy partition and solidarity projection.
 * The inherited DB-indexation/calendar and reserve helper remain untouched. */
import { createCurrentPolicyV2, solidarityRates } from './current-policy-v2.js';
export { meiRate, solidarityRates, ordinaryRetirementRule,
  pensionRevaluationFromMonthlyRates, reserveWithdrawalLimitGDP,
  accumulateReserve } from './current-policy-v2.js';

export function createCurrentPolicyV3(base, options = {}) {
  const inherited = createCurrentPolicyV2(base, options);
  const baseYear = base.baseYear ?? 2026;
  const payroll = base.workers * base.wage;
  if (!Number.isFinite(base.solidarityAnnualPace) || base.solidarityAnnualPace < 0) {
    throw new RangeError('A finite nonnegative base solidarity annual pace is required');
  }
  const baseRate = base.solidarityAnnualPace / payroll;
  const initialBandRates = solidarityRates(baseYear);
  if (initialBandRates.some(rate => !(rate > 0))) throw new RangeError('Base solidarity band rates must be positive');
  function solidarityRateMultipliers(year) {
    const ratios = solidarityRates(year).map((rate, index) => rate / initialBandRates[index]);
    return { lower: Math.min(...ratios), upper: Math.max(...ratios) };
  }
  return Object.freeze({ ...inherited,
    contributionRates(year, config) {
      const rates = inherited.contributionRates(year, config);
      const factors = solidarityRateMultipliers(year);
      const solidarityRate = baseRate * factors.lower;
      // All solidarity remains public/protected. It never enters retirement
      // credits, private capital, or the separately earmarked MEI amount.
      return { ...rates, protectedRate: rates.protectedRate + solidarityRate,
        solidarityRate, solidarityRateUpper: baseRate * factors.upper };
    },
    solidarityRateMultipliers,
    assumptions: Object.freeze({ ...inherited.assumptions,
      contributionBase: 'MEI and solidarity use distinct TGSS Jan-Aug2026 net recognised rights, each annualised ×12/8; the ordinary pension pool is retained fromv2.',
      solidarity: 'The ledger uses the minimum of the three statutory rate ratios relative to2026. This is a conditional lower scenario assuming each excess-pay band scales by aggregate payroll with unchanged composition. The maximum ratio is a non-additive diagnostic, not an identified revenue forecast or statistical interval.',
      solidarityLimitations: 'No band-specific taxable masses, distributional shifts, changing maximum-base exposure, compliance response or wage-tail growth are inferred. Statutory final2045 rates are retained thereafter. Both MEI and solidarity create no individual pension rights; only MEI enters the reserve memorandum.' })
  });
}
