// The retirement age comes in by steps (docs/PROPUESTA-CALENDARIO-EDAD-2026-11-11.md, option A).
// Until now a higher age reached every generation at once from 2027: with 68, whoever turned 65 in 2027 waited
// three years, which no reform does. With retirementAgeStepYears = N > 0 the rise comes in one year at a time:
// one more year every N years, counted by the year each generation turns the reference age (65), from 2027 and
// up to the age chosen. Example, N = 4 and 68: turning 65 in 2027–2030, retirement at 66; in 2031–2034, at 67;
// from 2035, at 68. Whole years: the engine retires by generations of one year.
// 0 by default, and then left out of the cache key and of the result's echo (src/shared/sim-key.js), as the
// 1.52 experiment and the 1.61 share: stored results, fingerprints and saved scenarios do not change. Pure functions.

export const AGE_STEPS_DEFAULTS = Object.freeze({
  // 0 = the whole rise at once from 2027 (as always); N = one more year every N years.
  retirementAgeStepYears: 0
});

export const AGE_STEPS_RANGES = Object.freeze({ retirementAgeStepYears: [0, 6, true] });

/** The first year of the general measures: the first generation the rise reaches turns the reference age then. */
export const AGE_STEPS_FIRST_YEAR = 2027;

/**
 * Years of the rise that reach one generation.
 * @param {number} birthYear
 * @param {number} whole  the whole rise (age chosen minus the reference age). Steps need a rise of two years or
 *   more: one year is a single step, the same as at once, and it reaches everybody who has not retired
 * @param {number} stepYears  retirementAgeStepYears
 * @param {number} [referenceAge]  65
 */
export function generationAgeShift(birthYear, whole, stepYears = 0, referenceAge = 65) {
  if (!(stepYears > 0) || !(whole > 1)) return whole;
  // Whoever turned the reference age before 2027 keeps the age of today: the rise starts with the 2027 generation.
  return Math.min(whole, Math.max(0, Math.floor((birthYear + referenceAge - AGE_STEPS_FIRST_YEAR) / stepYears) + 1));
}

/** True when the steps act: switched on and with a rise of two years or more. */
export const ageStepsActive = (config, referenceAge = 65) => (config?.retirementAgeStepYears ?? 0) > 0 && Number(config.retirementAge) - referenceAge > 1;

/** The first year in which a generation turning the reference age gets the whole rise. */
export const fullRiseFrom = (whole, stepYears) => AGE_STEPS_FIRST_YEAR + Math.max(0, Math.ceil(whole) - 1) * Math.max(0, stepYears);

/** How the reader sees one value: «De golpe» or the rhythm of the steps. */
export const ageStepsText = stepYears => !(stepYears > 0) ? 'de golpe'
  : stepYears === 1 ? 'un año más cada año' : `un año más cada ${stepYears} años`;

/** Every value the scenario admits, with its words: the list of a choice. */
export const AGE_STEPS_OPTIONS = Object.freeze(Array.from({ length: AGE_STEPS_RANGES.retirementAgeStepYears[1] + 1 }, (_, stepYears) =>
  Object.freeze([stepYears, stepYears ? `Por tramos: ${ageStepsText(stepYears)}` : `De golpe, en ${AGE_STEPS_FIRST_YEAR}`])));

/**
 * The calendar of a rise, generation by generation: [{ from, to, age }], by the year each one turns the
 * reference age. The last row has no `to`: from then on, the age chosen.
 */
export function ageStepsCalendar(age, stepYears, referenceAge = 65) {
  const whole = Math.round(age - referenceAge);
  if (!(stepYears > 0) || !(whole > 1)) return [];
  return Array.from({ length: whole }, (_, index) => ({
    from: AGE_STEPS_FIRST_YEAR + index * stepYears,
    to: index === whole - 1 ? null : AGE_STEPS_FIRST_YEAR + (index + 1) * stepYears - 1,
    age: referenceAge + index + 1
  }));
}

/** The config without the key while it is the default, so cache keys, fingerprints and stored results keep their shape. */
export function omitDefaultAgeSteps(config) {
  if (!config || !('retirementAgeStepYears' in config) || config.retirementAgeStepYears !== AGE_STEPS_DEFAULTS.retirementAgeStepYears) return config;
  const { retirementAgeStepYears, ...rest } = config;
  return rest;
}
