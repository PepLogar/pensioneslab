import { createCurrentPolicyV6 } from './current-policy-v6.js';
import { MUTUAS_V7, MUTUA_BASE_WEIGHTS_V7 as W } from '../data/mutuas-v7.js';
export { accumulateReserve, meiRate } from './current-policy-v2.js';

// The RETA reform still to deploy (config.retaReform2032, 0 by default; 24/11/2026). The AIReF puts the
// self-employed paying on their real income at 0.5 % of GDP from 2032, including what 2024 and 2026 already
// brought, which the 2026 opening holds (O: Estudio 1/2026, págs. 20–21). The rest, ≈ 0.38 % of GDP (R), comes
// in a straight line from 2027 to 2032 (S: the 2027–2031 tables are not set) as a payroll rate, so it keeps
// that weight while the payroll keeps its share of GDP. Revenue only, as the AIReF counts it: no new rights.
export const RETA_REFORM = Object.freeze({ pendingGDP: 0.0038, rampFrom: 2026, fullFrom: 2032 });
export const retaReformShare = year => year <= RETA_REFORM.rampFrom ? 0
  : Math.min(1, (year - RETA_REFORM.rampFrom) / (RETA_REFORM.fullFrom - RETA_REFORM.rampFrom));

/** Same salary/base machinery; exposures now match the TGSS-only ordinary
 * pool. Mutua receipts remain a separate public, restricted pool in all systems. */
export function createCurrentPolicyV7(base, options = {}) {
  const inherited = createCurrentPolicyV6(base, options);
  const retaReformRate = RETA_REFORM.pendingGDP * base.gdp / (base.workers * base.wage);
  function baseResponse(year, config) {
    const old = inherited.baseResponse(year, config);
    const retaDelta = old.retaBaseIndex / old.nominalWageIndex - 1;
    return { ...old,
      ordinaryAdjustment: 1 + W.tgssOrdinaryRG * (old.cappedToWage - 1) + W.tgssOrdinaryRETA * retaDelta,
      mutuaAdjustment: 1 + W.mutuaCommonRG * (old.cappedToWage - 1) + W.mutuaCommonRETA * retaDelta,
      retaOrdinaryAdjustmentDelta: W.tgssOrdinaryRETA * retaDelta };
  }
  return Object.freeze({ ...inherited, baseResponse,
    contributionRates(year, config) {
      const old = inherited.contributionRates(year, config), b = baseResponse(year, config);
      const protectedRate = config.contributionRate * (1 - base.retirementContributionShare) * b.ordinaryAdjustment + old.meiRate + old.solidarityRate;
      return { ...old,
        retirementRate: config.contributionRate * base.retirementContributionShare * b.ordinaryAdjustment,
        protectedRate: config.retaReform2032 ? protectedRate + retaReformRate * retaReformShare(year) : protectedRate };
    },
    assumptions: Object.freeze({ ...inherited.assumptions, mutuas: MUTUAS_V7.id,
      exposure: 'TGSS Jan-Aug2026 ordinary RG/TGSS ordinary, excluding MEI/solidarity; apply the same response to TGSS pension and other-benefit pools. MEI and solidarity exposures unchanged.',
      mutuaBases: 'Identified common RG mutual receipts follow the capped salary-base response; identified common RETA receipts retain the shared central proxy (or explicit research sensitivity). No RG/RETA base distribution is identified for AT/EP; that residual follows payroll, not a blanket RG ceiling.',
      mutuaDestination: 'Mutual-assigned contributions remain public and outside retirement-system routing. Capital-cost transfers for disability/death are historical internal memo amounts, not extra annual income.' })
  });
}
