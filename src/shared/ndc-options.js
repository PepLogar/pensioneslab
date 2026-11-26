// Design options of the notional accounts and of an extra funded contribution,
// all off by default (docs/AUDITORIA-CUENTAS-NOCIONALES.md). They let the
// solutions of the Instituto de Actuarios report (abril 2026; Devesa, Doménech
// y Meneu 2025a) and the Swedish design be reproduced. Pure functions.

export const NDC_OPTIONS_DEFAULTS = Object.freeze({
  // 1 = the notional component grows by birth cohort; 0 = everyone from 2027,
  // as before 1.39. Devesa et al. 2025a: from 1971, +5 % per cohort, full from 1990.
  ndcPhaseIn: 0,
  ndcPhaseInFirstCohort: 1971,
  ndcPhaseInYears: 20,
  // Interest «norm» in the annuity divisor; pensions in payment then follow the
  // notional index divided by (1 + norm). 0 = rising pension, as before;
  // Sweden: 1.6 %. Same total value, more pension (and spending) early.
  ndcAnnuityNorm: 0,
  // 1 = the notional balance of a worker who dies before retiring goes to the
  // survivors of the same cohort (Sweden), instead of lapsing to the system.
  ndcInheritanceGains: 0,
  // 1 = a simplified Swedish «brake»: when last year's notional pensions exceeded
  // what was credited to the accounts, the notional index is cut by that ratio,
  // smoothed over three years (cube root, as Sweden since 2017). A cash-flow rule,
  // not the Swedish actuarial balance sheet (no buffer fund, no contribution asset).
  ndcBalancing: 0,
  // Payroll points paid ON TOP of today's contribution into personal funded
  // accounts (IAE report, table 5.1, option a). They never fund PAYG.
  fundedExtraContribution: 0
});

export const NDC_OPTIONS_RANGES = Object.freeze({
  ndcPhaseIn: [0, 1, true],
  ndcPhaseInFirstCohort: [1940, 2010, true],
  ndcPhaseInYears: [1, 40, true],
  ndcAnnuityNorm: [0, 0.03],
  ndcInheritanceGains: [0, 1, true],
  ndcBalancing: [0, 1, true],
  fundedExtraContribution: [0, 0.1]
});

/** Share of the notional component for a birth cohort (1 when the phase-in is off). */
export function ndcPhaseInShare(birthYear, config) {
  if (!config?.ndcPhaseIn) return 1;
  const first = config.ndcPhaseInFirstCohort ?? NDC_OPTIONS_DEFAULTS.ndcPhaseInFirstCohort;
  const years = config.ndcPhaseInYears ?? NDC_OPTIONS_DEFAULTS.ndcPhaseInYears;
  return Math.min(1, Math.max(0, (birthYear - first + 1) / years));
}

/** Pillar weights with the phase-in: the part not yet notional stays in today's formula. */
export function ndcPhaseInWeights(weights, birthYear, config) {
  if (!(weights.ndc > 0)) return weights;
  const share = ndcPhaseInShare(birthYear, config);
  if (share === 1) return weights;
  return { payg: weights.payg + weights.ndc * (1 - share), ndc: weights.ndc * share, funded: weights.funded };
}

/** Factor on this year's notional index from the brake (1 when off or in balance). */
export function ndcBrakeFactor(previous, config) {
  if (!config?.ndcBalancing) return 1;
  // What is owed, not what was paid after a payment cut: the reserve is still debited in full (since 1.72; review, 4).
  const credits = previous?.notionalCredits, benefits = previous?.paymentAdjustment?.scheduledNdcBenefits ?? previous?.ndcBenefits;
  if (!(benefits > 0) || !(credits >= 0)) return 1;
  return Math.min(1, credits / benefits) ** (1 / 3);
}
