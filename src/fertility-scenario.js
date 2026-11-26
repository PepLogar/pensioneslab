/** Relative fertility sensitivity, not a population projection.
 * Since 1.55 the reference is EUROPOP2025 (Eurostat, Spain, baseline): children per
 * woman of each BIRTH year, 2025–2100, the sum of the assumed rates by age
 * (data/official-fertility-europop2025.js, our reconstruction checked against the
 * published total). It is the fertility already inside the reference population,
 * so a target equal to it changes nothing. Until 1.54 it was the six rounded AR2024
 * anchors (EUROPOP2023), interpolated: 1.19 in 2022 to 1.42 in 2070.
 */
import { OFFICIAL_FERTILITY_EUROPOP2025 as FERTILITY } from '../data/official-fertility-europop2025.js';

export const REFERENCE_FERTILITY = Object.freeze(FERTILITY.years.map((year, i) =>
  Object.freeze({ year, fertility: FERTILITY.totalFertility[i] })));

export const FIRST_FERTILITY_BIRTH_YEAR = 2027;
export const FERTILITY_ENTRY_AGE = 22;
export const FIRST_FERTILITY_WORK_YEAR = FIRST_FERTILITY_BIRTH_YEAR + FERTILITY_ENTRY_AGE;
export const MIN_PERSISTENT_FERTILITY = .8;
export const MAX_PERSISTENT_FERTILITY = 2.1;
// Birth years run to 2100, the last year of the series.
const END_YEAR = 2100;

/** Zero preserves the reference; positive values are hypothetical targets. */
export function validateTargetFertility(targetFertility) {
  if (!Number.isFinite(targetFertility) || (targetFertility !== 0 &&
      (targetFertility < MIN_PERSISTENT_FERTILITY || targetFertility > MAX_PERSISTENT_FERTILITY))) {
    throw new RangeError('Fertility must be 0 (reference) or between 0.8 and 2.1 children per woman');
  }
  return targetFertility;
}

function validateYear(year) {
  if (!Number.isInteger(year) || year < 1 || year > END_YEAR) {
    throw new RangeError('Fertility calendar must use integer years through 2100');
  }
}

export function referenceFertility(birthYear) {
  validateYear(birthYear);
  if (birthYear < REFERENCE_FERTILITY[0].year) {
    throw new RangeError('No reference fertility before 2025');
  }
  return REFERENCE_FERTILITY[birthYear - REFERENCE_FERTILITY[0].year].fertility;
}

/** Apply once to a young resident cohort's reference size, never each year.
 * This holds the number/age mix of mothers and child survival implicit in the
 * reference. It does not model fertility timing, childhood migration, or fewer
 * mothers in a second generation. It cannot identify native births within the
 * available resident-population weights. A target above the reference can grow
 * the cohort: there is deliberately no clipping of this relative factor.
 */
export function fertilityFactor(birthYear, targetFertility = 0) {
  validateYear(birthYear);
  validateTargetFertility(targetFertility);
  if (targetFertility === 0 || birthYear < FIRST_FERTILITY_BIRTH_YEAR) return 1;
  return targetFertility / referenceFertility(birthYear);
}

/** Guard the entry-year application: the opening and older cohorts remain.
 * Call separately for the reference young-resident and migration components.
 * In current-cohorts, age-22 population and current net migration are combined
 * as allocation weights; do not scale their sum or duplicate a migration flow.
 * Preserve the original baseline normalisation, then apply this factor only
 * to its young component. Reclosing entrants to the old employment target
 * after applying the factor would cancel the intended fertility sensitivity.
 * The migration component stays unchanged, including migrants entering at 22.
 * Migrants already inside the resident young population are not identifiable
 * separately here; this is an explicit limitation of the cohort-size proxy.
 */
export function fertilityEntryFactor({ birthYear, entryYear, targetFertility = 0,
  source, entryAge = FERTILITY_ENTRY_AGE } = {}) {
  validateYear(birthYear);
  validateYear(entryYear);
  validateTargetFertility(targetFertility);
  if (!Number.isInteger(entryAge) || entryAge < 1 || entryAge > 100 || entryYear < birthYear) {
    throw new RangeError('Invalid fertility entry calendar');
  }
  if (source !== 'young' && source !== 'migration') {
    throw new RangeError('Fertility entry source must be young or migration');
  }
  if (source === 'migration' || entryYear - birthYear !== entryAge) return 1;
  return fertilityFactor(birthYear, targetFertility);
}
