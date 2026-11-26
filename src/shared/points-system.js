// A points system in the German style (docs/DISENO-SISTEMA-PUNTOS.md), as a
// variant of PAYG: from 2027 each worker earns points (salary over the average
// salary: one point a year at the average wage) and a pension is points × the
// value of the point. The value follows wages, slowed by the sustainability factor
// of SGB VI § 68: (1 − PQ(t−1)/PQ(t−2)) · α + 1, where PQ is pensioners over
// contributors and α = 0.25 in the law (data/sources/audit-puntos-2026/). As in
// Germany, pensions in payment follow the same value. Rights earned before 2027
// keep today's rules. Pure functions.

export const POINTS_DEFAULTS = Object.freeze({
  // 1 = PAYG rights earned from 2027 are points (German style); 0 = today's formula.
  pointsSystem: 0,
  // α of the sustainability factor (SGB VI § 68: 0.25). 0 = the value follows wages only.
  pointsSustainabilityFactor: 0.25
});

export const POINTS_RANGES = Object.freeze({
  pointsSystem: [0, 1, true],
  pointsSustainabilityFactor: [0, 1]
});

/** Sustainability factor of a year from the pensioner/contributor ratio of the two previous years. */
export function pointsSustainability(previous, beforePrevious, config) {
  if (!config?.pointsSystem) return 1;
  const alpha = config.pointsSustainabilityFactor ?? POINTS_DEFAULTS.pointsSustainabilityFactor;
  const pq = point => (point?.workers > 0 ? point.retirees / point.workers : null);
  const now = pq(previous), before = pq(beforePrevious);
  if (!(now > 0) || !(before > 0) || !(alpha > 0)) return 1;
  return (1 - now / before) * alpha + 1;
}
