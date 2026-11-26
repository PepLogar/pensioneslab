// Short-run effect of cutting «other spending» on GDP (fiscal multiplier).
// Banco de España, Hernández de Cos and Moral-Benito, Documento de Trabajo 1309
// (2013), for Spain: a one-year spending multiplier of about 0.6 in tranquil
// times and 1.4 in turbulent ones. Audit: docs/AUDITORIA-MULTIPLICADOR-RECORTES.md.
//
// Assumptions of the project, declared: the multiplier applies to the change of
// the cut (the fiscal impulse), in full the year it happens and by half the next,
// and then fades (the cut stays, its demand effect does not); «turbulent» is read
// as a high fiscal-stress risk the year before (S0 index). The BdE finds the
// multiplier smaller when public finances are weak, larger in recessions and
// banking stress: a high S0 risk is a fiscal signal, so this proxy can overstate
// it. Only GDP responds: employment, wages and contributions do not.
import { riskVariablesFromEngine, fiscalRiskIndex, riskLevel } from './sovereign-risk.js';

export const CUT_MULTIPLIER_SOURCE = Object.freeze({
  id: 'bde-dt1309-2013',
  citation: 'Hernández de Cos y Moral-Benito, «Fiscal multipliers in turbulent times: the case of Spain», Banco de España, Documento de Trabajo 1309 (2013)',
  file: 'data/sources/audit-multiplicador-2026/bde-dt1309-hernandez-de-cos-moral-benito.pdf',
  calm: 0.6,
  turbulent: 1.4
});

export const CUT_MULTIPLIER_DEFAULTS = Object.freeze({ calm: 0.6, stress: 1.4, fade: Object.freeze([1, 0.5]) });

/** Multiplier for a year: «stress» when the previous year had a high fiscal-stress risk. */
export function cutMultiplierFor(previous, beforePrevious, config = {}) {
  const calm = config.cutMultiplierCalm ?? CUT_MULTIPLIER_DEFAULTS.calm;
  const stress = config.cutMultiplierStress ?? CUT_MULTIPLIER_DEFAULTS.stress;
  if (!previous || !beforePrevious) return { multiplier: calm, stress: false };
  const vars = riskVariablesFromEngine(previous, beforePrevious, { fundBackingWeight: config.crisisFundBackingWeight ?? 0 });
  const { index } = fiscalRiskIndex(vars);
  const high = riskLevel(index, { highIndex: config.riskHighIndex, moderateIndex: config.riskModerateIndex }) === 'high';
  return { multiplier: high ? stress : calm, stress: high };
}

/**
 * Demand gap of a year, as a share of GDP before the cut effect.
 * @param {object} p
 * @param {number} p.reduction  other-spending reduction of the year (engine units)
 * @param {number} p.gdpBeforeCuts  GDP of the year without the cut effect
 * @param {object|null} p.previous  previous engine point (with its cutDemand)
 * @param {object|null} p.beforePrevious  the point before it, for the risk level
 */
export function cutDemandGap({ reduction = 0, gdpBeforeCuts, previous = null, beforePrevious = null, config = {} }) {
  if (!(gdpBeforeCuts > 0)) throw new RangeError('Invalid GDP for the cut multiplier');
  const share = Math.max(0, reduction) / gdpBeforeCuts;
  const prior = previous?.cutDemand ?? null;
  const impulse = share - (prior?.share ?? 0);
  const { multiplier, stress } = cutMultiplierFor(previous, beforePrevious, config);
  const [now, next] = CUT_MULTIPLIER_DEFAULTS.fade;
  const gap = now * multiplier * impulse + next * (prior ? prior.multiplier * prior.impulse : 0);
  return { share, impulse, multiplier, stress, gap: Math.abs(gap) < 1e-12 ? 0 : Math.max(-0.2, Math.min(0.2, gap)) };
}
