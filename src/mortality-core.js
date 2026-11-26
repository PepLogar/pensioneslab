/** Context-local mortality and annuity calculations; no country or future-data imports.
 * DATA supplies central mx rates. Historical qx inputs must be explicitly converted.
 */
function copyMortalityData(input) {
  if (!input || typeof input !== 'object') throw new TypeError('An explicit mortality table is required');
  function axis(values, name) {
    if (!Array.isArray(values) || values.length === 0) throw new RangeError(`Invalid mortality ${name}`);
    return Object.freeze(Array.from(values, (value, index) => {
      if (!Number.isSafeInteger(value) || value < 0 || (index > 0 && value !== values[0] + index)) {
        throw new RangeError(`Mortality ${name} must be contiguous nonnegative integers`);
      }
      return value;
    }));
  }
  const years = axis(input.years, 'years'), ages = axis(input.ages, 'ages');
  const mortalityMx = {};
  for (const sex of ['M', 'F']) {
    const rows = input.mortalityMx?.[sex];
    if (!Array.isArray(rows) || rows.length !== years.length) throw new RangeError(`Invalid mortality rows for ${sex}`);
    mortalityMx[sex] = Object.freeze(Array.from(rows, row => {
      if (!Array.isArray(row) || row.length !== ages.length) throw new RangeError(`Invalid mortality ages for ${sex}`);
      return Object.freeze(Array.from(row, value => {
        if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid central mortality rate for ${sex}`);
        return value;
      }));
    }));
    const terminalMx = mortalityMx[sex].at(-1).at(-1);
    const terminalQx = Math.min(1, terminalMx / (1 + terminalMx / 2));
    if (!(Math.sqrt(1 - terminalQx) < 1)) {
      throw new RangeError(`Mortality open-age tail must have positive death probability for ${sex}`);
    }
  }
  // Own copies keep cached factors consistent even if a caller edits its table.
  return Object.freeze({ years, ages, mortalityMx: Object.freeze(mortalityMx) });
}

export function createMortality(input) {
const DATA = copyMortalityData(input);
const BASE_YEAR = DATA.years[0];
const LAST_YEAR = DATA.years.at(-1);
const MIN_AGE = DATA.ages[0];
const MAX_AGE = DATA.ages.at(-1);
const FACTOR_CACHE_LIMIT = 4096;
const factorCache = new Map();

function validate(year, age, sex, longevityGain) {
  if (!Number.isInteger(year) || year < BASE_YEAR) throw new RangeError('Invalid mortality year');
  if (!Number.isFinite(age)) throw new RangeError('Invalid mortality age');
  if (sex !== 'M' && sex !== 'F') throw new RangeError('Invalid mortality sex');
  // The model currently permits 0..0.15. Requiring less than one here also
  // ensures biological age eventually reaches the constant open-age tail.
  if (!Number.isFinite(longevityGain) || longevityGain >= 1) {
    throw new RangeError('Mortality longevity gain must be finite and less than one');
  }
}

function biologicalAge(year, age, longevityGain) {
  return age - longevityGain * (year - BASE_YEAR);
}

function deathProbability(year, age, sex, longevityGain = 0) {
  validate(year, age, sex, longevityGain);
  const adjustedAge = Math.max(MIN_AGE, Math.min(MAX_AGE, biologicalAge(year, age, longevityGain)));
  const lowerAge = Math.floor(adjustedAge);
  const upperAge = Math.min(MAX_AGE, lowerAge + 1);
  const rates = DATA.mortalityMx[sex][Math.min(year, LAST_YEAR) - BASE_YEAR];
  const mx = rates[lowerAge - MIN_AGE] +
    (rates[upperAge - MIN_AGE] - rates[lowerAge - MIN_AGE]) * (adjustedAge - lowerAge);
  return Math.max(0, Math.min(1, mx / (1 + mx / 2)));
}

// Half-year survival depends only on (year, age, sex, gain) and this frozen
// table, and thousands of cohorts share those values every half-year. Cache the
// exact value; invalid arguments still throw (before anything is stored).
const SURVIVAL_CACHE_LIMIT = 250000;
const survivalCache = { M: new Map(), F: new Map() };
let survivalEntries = 0;

function halfYearSurvival(year, age, sex, longevityGain = 0) {
  let byGain = survivalCache[sex]?.get(longevityGain);
  const key = year * 1024 + age;
  const hit = byGain?.get(key);
  if (hit !== undefined) return hit;
  const value = Math.sqrt(1 - deathProbability(year, age, sex, longevityGain));
  if (survivalEntries >= SURVIVAL_CACHE_LIMIT) {
    survivalCache.M.clear(); survivalCache.F.clear(); survivalEntries = 0; byGain = undefined;
  }
  if (!byGain) { byGain = new Map(); survivalCache[sex].set(longevityGain, byGain); }
  byGain.set(key, value);
  survivalEntries++;
  return value;
}

/**
 * Expected years of half-year pension payments, payable at each half's opening.
 * startHalf 0/1 identifies the first/second half of the supplied calendar year.
 * Age and calendar year advance together only after the second half. No real
 * investment return or discount is included. Beyond the table's last year and
 * open age, the constant remaining series is summed exactly. No terminal death,
 * forced withdrawal or survival threshold is added to the supplied rates.
 */
function annuityFactor(year, age, sex, startHalf = 0, longevityGain = 0) {
  validate(year, age, sex, longevityGain);
  if (startHalf !== 0 && startHalf !== 1) throw new RangeError('Invalid annuity start half');
  const key = `${year}|${age}|${sex}|${startHalf}|${longevityGain}`;
  if (factorCache.has(key)) return factorCache.get(key);

  let survival = 1;
  let factor = 0;
  let half = startHalf;
  let currentYear = year;
  let currentAge = age;
  while (true) {
    const halfSurvival = halfYearSurvival(currentYear, currentAge, sex, longevityGain);
    if (currentYear >= LAST_YEAR && biologicalAge(currentYear, currentAge, longevityGain) >= MAX_AGE) {
      factor += 0.5 * survival / (1 - halfSurvival);
      break;
    }
    factor += 0.5 * survival;
    survival *= halfSurvival;
    if (half === 1) {
      currentYear += 1;
      currentAge += 1;
      half = 0;
    } else {
      half = 1;
    }
  }
  if (!Number.isFinite(factor) || factor <= 0) throw new RangeError('Invalid annuity factor');
  if (factorCache.size >= FACTOR_CACHE_LIMIT) factorCache.delete(factorCache.keys().next().value);
  factorCache.set(key, factor);
  return factor;
}

return Object.freeze({ deathProbability, halfYearSurvival, annuityFactor });
}
