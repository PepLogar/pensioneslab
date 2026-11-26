/** Reference paths of the engine: AR2024 rows applied to the EUROPOP2025 population (since 1.55).
 * Population and net migration by age and sex: EUROPOP2025 baseline, 2025–2100
 * (data/official-population-europop2025.js); the 2100 values are held for 2101,
 * only needed to average 1 January stocks.
 * The Ageing Report 2024 was computed with EUROPOP2023. Its ratios (productivity
 * growth, inflation, interest, replacement rate of new pensions, pension spending
 * shares) are kept as published. Its levels of people are rebased: employment,
 * labour force, contributors and public pensioners keep the AR2024 rates by age
 * group (employment shares, participation, pension coverage) and apply them to the
 * EUROPOP2025 population of each group; population totals are EUROPOP2025's own.
 * Two editions mixed until the AR2027: a declared assumption (docs/PLAN-1.55-EUROPOP2025.md).
 * After 2070 every AR2024 rate and ratio is held at 2070 (model assumption, not
 * Commission data), and the levels follow the EUROPOP2025 population by age.
 */
import { AR2024_DEMOGRAPHY as AR } from '../data/official-demography.js';
import { OFFICIAL_POPULATION as POP23 } from '../data/official-population.js';
import { OFFICIAL_POPULATION_EUROPOP2025 as POP } from '../data/official-population-europop2025.js';
import { OFFICIAL_MORTALITY as MORT23 } from '../data/official-mortality.js';
import { OFFICIAL_MORTALITY_EUROPOP2025 as MORT25 } from '../data/official-mortality-europop2025.js';

export const AR_END_YEAR = AR.annual.at(-1).year;
export const LONG_HORIZON_END_YEAR = POP.years.at(-1);
/** First year with a reference row: EUROPOP2025 starts on 1 January 2025 (nothing earlier is spliced in). */
export const REFERENCE_START_YEAR = POP.years[0];

const join = key => Object.fromEntries(POP.sexes.map(sex => [sex, [...POP[key][sex], POP[key][sex].at(-1)]]));
/** Population and net migration 2025–2101, same layout as data/official-population-europop2025.js. */
export const REFERENCE_POPULATION = Object.freeze({
  years: [...POP.years, LONG_HORIZON_END_YEAR + 1],
  ages: POP.ages,
  sexes: POP.sexes,
  population: join('population'),
  netMigration: join('netMigration')
});

/** Mid-year persons aged lo–hi (mean of 1 January of `year` and `year + 1`), the AR2024 timing. */
function midYear(P, year, lo, hi) {
  let total = 0;
  for (const y of [year, year + 1]) {
    const yi = P.years.indexOf(y);
    if (yi < 0) throw new RangeError('Population year outside the reference');
    for (const sex of P.sexes) for (let age = lo; age <= hi; age++) total += P.population[sex][yi][age - P.ages[0]];
  }
  return total / 2;
}
const persons25 = (year, lo, hi) => midYear(REFERENCE_POPULATION, year, lo, hi);
const persons23 = (year, lo, hi) => midYear(POP23, year, lo, hi);

/** A level of people rebased by groups: level × Σ w·P25/P23 ÷ Σ w, with w each group's
 * share of the level in the AR year. With the EUROPOP2023 population it returns the level itself. */
function rebase(level, groups, year, arYear) {
  let weighted = 0, weights = 0;
  for (const [lo, hi, weight] of groups) {
    weighted += weight * persons25(year, lo, hi) / persons23(arYear, lo, hi);
    weights += weight;
  }
  return level * weighted / weights;
}

// Public pension coverage by age group is published at six dates (fiche, table 15);
// between them it is interpolated linearly by year (our reconstruction). It includes
// survivor and disability pensions; under 55 counts from age 20 here.
const COVERAGE_GROUPS = [[20, 54, 'under55'], [55, 59, 'age55To59'], [60, 64, 'age60To64'],
  [65, 69, 'age65To69'], [70, 74, 'age70To74'], [75, 100, 'age75Plus']];
function coverage(year, key) {
  const anchors = AR.publicPensionerPopulationCoverageAnchors;
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1], b = anchors[i];
    if (year <= b.year) return a[key] + (b[key] - a[key]) * (year - a.year) / (b.year - a.year);
  }
  return anchors.at(-1)[key];
}

const rows = new Map();
/** The AR2024 row of `year` (2070's after it) with its levels of people rebased to EUROPOP2025. */
export function referenceYear(year) {
  if (!Number.isInteger(year) || year < REFERENCE_START_YEAR || year > LONG_HORIZON_END_YEAR) throw new RangeError('Invalid reference year');
  if (!rows.has(year)) {
    const arYear = Math.min(year, AR_END_YEAR), row = AR.annual[arYear - AR.baseYear];
    const employmentGroups = [[20, 24, row.employmentShare20To24Pct], [25, 54, row.employmentShare25To54Pct],
      [55, 64, row.employmentShare55To64Pct], [65, 74, row.employmentShare65To74Pct]];
    const labourGroups = [[20, 24, row.participation20To24Pct], [25, 54, row.participation25To54Pct], [55, 64, row.participation55To64Pct]]
      .map(([lo, hi, rate]) => [lo, hi, rate * persons23(arYear, lo, hi)]);
    const pensionerGroups = COVERAGE_GROUPS.map(([lo, hi, key]) => [lo, hi, coverage(arYear, key) * persons23(arYear, lo, hi)]);
    const yi = POP.years.indexOf(year), next = POP.years.indexOf(year + 1);
    const total = (POP.totals.population[yi] + POP.totals.population[next < 0 ? yi : next]) / 2;
    const p20To64 = persons25(year, 20, 64);
    rows.set(year, Object.freeze({ ...row, year,
      populationPersons: total,
      populationShare25To54Pct: persons25(year, 25, 54) / total * 100,
      populationShare20To64Pct: p20To64 / total * 100,
      populationShare65PlusPct: persons25(year, 65, 100) / total * 100,
      populationShare80PlusPct: persons25(year, 80, 100) / total * 100,
      population20To64Persons: p20To64,
      population55To64ShareOf20To64Pct: persons25(year, 55, 64) / p20To64 * 100,
      netMigrationPersons: POP.totals.netMigration[yi],
      labourForce20To64Persons: rebase(row.labourForce20To64Persons, labourGroups, year, arYear),
      employment20To64Persons: rebase(row.employment20To64Persons, employmentGroups.slice(0, 3), year, arYear),
      employment20To74Persons: rebase(row.employment20To74Persons, employmentGroups, year, arYear),
      publicPensionContributorsPersons: rebase(row.publicPensionContributorsPersons, employmentGroups, year, arYear),
      publicPensionersPersons: rebase(row.publicPensionersPersons, pensionerGroups, year, arYear),
      publicPensioners65PlusPersons: rebase(row.publicPensioners65PlusPersons, pensionerGroups.slice(3), year, arYear),
      demographicBase: POP.metadata.id,
      ...(year > AR_END_YEAR ? { extendedBeyondAgeingReport: true } : {}) }));
  }
  return rows.get(year);
}

export const REFERENCE_HORIZON_ASSUMPTIONS = Object.freeze({
  population: `${POP.metadata.id}; 2100 held for 2101.`,
  rebase: 'AR2024 levels of people (employment, labour force, contributors, public pensioners) rebased to EUROPOP2025 with the AR2024 rates by age group; AR2024 ratios kept. Two editions mixed until the AR2027.',
  after2070: 'Ageing Report ratios (productivity growth, inflation, interest, replacement rate of new pensions, pension spending shares, participation) held at 2070; employment and pensioner counts follow the EUROPOP2025 population by age with 2070 rates. Model assumptions, not official projections.',
  mortality: 'EUROPOP2025 mortality rates exist through 2100 (data/official-mortality-europop2025.js).'
});

// ---------- The population of the Ageing Report itself (config.europop2023, 0 by default) ----------
// With EUROPOP2023, the population the AR2024 was computed with, its rows need no rebase: each row
// is the published one (through 2070, the last AR year and the last EUROPOP2023 year that can be
// averaged with the next 1 January). No long-horizon runs with it. Mortality: EUROPOP2023 too.

const EUROPOP2023_POPULATION = Object.freeze({ years: POP23.years, ages: POP23.ages, sexes: POP23.sexes,
  population: POP23.population, netMigration: POP23.netMigration });
const rows23 = new Map();
function referenceYear2023(year) {
  if (!Number.isInteger(year) || year < POP23.years[0] || year > AR_END_YEAR) throw new RangeError('Invalid reference year');
  if (!rows23.has(year)) rows23.set(year, Object.freeze({ ...AR.annual[year - AR.baseYear], year, demographicBase: POP23.metadata.id }));
  return rows23.get(year);
}

/** The reference of one population edition: 2025 (EUROPOP2025, the default, as above) or 2023 (EUROPOP2023, the AR's own). */
export function referenceHorizon(edition = 2025) {
  if (edition === 2025) return HORIZON_2025;
  if (edition === 2023) return HORIZON_2023;
  throw new RangeError('Unknown population edition');
}
const HORIZON_2025 = Object.freeze({ edition: 2025, referenceYear, REFERENCE_POPULATION, REFERENCE_START_YEAR,
  LONG_HORIZON_END_YEAR, POPULATION: POP, MORTALITY: MORT25 });
const HORIZON_2023 = Object.freeze({ edition: 2023, referenceYear: referenceYear2023, REFERENCE_POPULATION: EUROPOP2023_POPULATION,
  REFERENCE_START_YEAR: POP23.years[0], LONG_HORIZON_END_YEAR: AR_END_YEAR, POPULATION: POP23, MORTALITY: MORT23 });
