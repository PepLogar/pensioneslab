// Who keeps working when the retirement age rises (1.59, docs/PLAN-1.59-PERMANENCIA.md and
// docs/PROPUESTA-PERMANENCIA-EMPLEO-2026-11-04.md). Up to 1.58 everyone who worked stayed
// employed until the new age, which is a ceiling, not an estimate.
//
// retirementDelayEmployment: the share of those who would have retired before who keep
// working in the years of the delay. The rest neither work nor collect a pension until the new
// age: they earn no rights in those years and collect a support of RETIREMENT_DELAY_SUPPORT
// of the wage. Both are assumptions of the project [S]. No study measures this share directly for Spain;
// Jiménez-Martín (Fedea, 2026) gives a ceiling of 0.84 [R], docs/PROPUESTA-PERMANENCIA-EMPLEO-2026-11-04.md, section 6.
// In Austria about 40 % of those who stopped retiring ended up employed, counting people who no
// longer worked (Staubli and Zweimüller, 2013); this share counts workers only, so it should be
// higher, and in Germany those employed stayed employed (Geyer and Welteke, 2017).
export const RETIREMENT_DELAY_DEFAULTS = Object.freeze({ retirementDelayEmployment: 0.7 });
export const RETIREMENT_DELAY_RANGES = Object.freeze({ retirementDelayEmployment: [0.4, 1] });
/** Support of those out of work in the delay, as a share of the wage: the rate the project already uses for displaced workers [S]. */
export const RETIREMENT_DELAY_SUPPORT = 0.4;

/** Displaced by automation only. In a row, `displacedWorkers` and `displacementSupport` also
 * hold those the delay leaves out of work, because both are taxed as one support. */
export const automationDisplaced = row => (row.displacedWorkers ?? 0) - (row.delayedOutOfWork ?? 0);
export const automationSupport = row => (row.displacementSupport ?? 0) - (row.delayedSupport ?? 0);

/**
 * Share working in one half-year of a cohort. Without the delay they would have worked the
 * first half of the year they reach `before`, as `shouldRetire` does, so the delay runs from
 * the second half of that year to the first half of the year they reach `legal`.
 * @param {number} age  age in the year
 * @param {0|1} half
 * @param {number} before  retirement age without the delay
 * @param {number} legal  retirement age with it
 * @param {number} [share]  retirementDelayEmployment
 */
export function delayWorkShare(age, half, before, legal, share = 1) {
  if (!(legal > before) || share >= 1) return 1;
  const time = age + half / 2;
  return time >= before + 0.5 && time <= legal ? share : 1;
}
