import { createCurrentPolicyV5 } from './current-policy-v5.js';
import { meiRate } from './current-policy-v2.js';
import { REGIMES_V6 as R } from '../data/regimes-v6.js';
export { accumulateReserve, meiRate } from './current-policy-v2.js';

/** Central RETA proxy is retained because2026 tables do not identify a future
 * income/base distribution. Constant-real RETA is a named research sensitivity. */
export function createCurrentPolicyV6(base, { priceIndex, selfEmployedBaseMode = 'payroll-proxy', ...options } = {}) {
  if (!['payroll-proxy', 'constant-real'].includes(selfEmployedBaseMode)) throw new RangeError('Unknown RETA scenario');
  if (typeof priceIndex !== 'function') throw new TypeError('Price index required');
  const inherited = createCurrentPolicyV5(base, options);
  const payroll = base.workers * base.wage;
  const baseMeiRate = base.meiAnnualPace / payroll;
  function baseResponse(year, config) {
    const old = inherited.baseResponse(year, config);
    const baseIndex = selfEmployedBaseMode === 'constant-real' ? priceIndex(year, config) : old.nominalWageIndex;
    if (!Number.isFinite(baseIndex) || baseIndex <= 0) throw new RangeError('Invalid RETA base index');
    const delta = baseIndex / old.nominalWageIndex - 1;
    return { ...old,
      ordinaryAdjustment: old.ordinaryAdjustment + R.ordinaryRETAShare * delta,
      meiAdjustment: old.meiAdjustment + R.meiRETAShare * delta,
      retaBaseIndex: baseIndex, retaOrdinaryAdjustmentDelta: R.ordinaryRETAShare * delta,
      retaMeiAdjustmentDelta: R.meiRETAShare * delta };
  }
  return Object.freeze({ ...inherited, baseResponse,
    contributionRates(year, config) {
      const old = inherited.contributionRates(year, config), b = baseResponse(year, config);
      const ordinaryDelta = config.contributionRate * b.retaOrdinaryAdjustmentDelta;
      const meiDelta = baseMeiRate * meiRate(year) / meiRate(2026) * b.retaMeiAdjustmentDelta;
      return { ...old, retirementRate: old.retirementRate + ordinaryDelta * base.retirementContributionShare,
        protectedRate: old.protectedRate + ordinaryDelta * (1 - base.retirementContributionShare) + meiDelta,
        meiRate: old.meiRate + meiDelta };
    },
    assumptions: Object.freeze({ ...inherited.assumptions, selfEmployedBaseMode, regimeSource: R.id,
      reta: 'Central income/base path remains a payroll proxy, not a claim that wages equal self-employed net earnings. Optional constant-real base per equivalent participant uses identified RETA budget exposures, same employment index and2026 revenue anchors; it is not an enacted2027+ table or a forecast.',
      otherRegimes: 'Observed margins/rules for Mar, coal, special systems and mutualism do not identify future joint bases. No unexplained regularisation receipt or extra regime income is inserted.' })
  });
}
