/** Current-year aggregate cohorts. No legacy simulation or past scenario runs.
 * Observed pension age/sex/amount weights describe benefits, not unique people.
 * EUROPOP and AR paths below remain fixed-vintage projection/allocation proxies.
 * Since 1.55 the demography is EUROPOP2025 (population, migration, mortality) by default; the
 * AR2024 levels of people are rebased to it in src/reference-horizon.js. EUROPOP2023, the AR's own, is an option.
 */
import { AR2024_DEMOGRAPHY as AR } from '../data/official-demography.js';
import { OFFICIAL_CURRENT_RETIREMENT_STOCK as STOCK } from '../data/current-pension-stock.js';
import { createMortality } from './mortality-core.js';
import { cohort } from './cohort-core.js';
import { fertilityFactor } from './fertility-scenario.js';
import { delayWorkShare } from './shared/retirement-delay.js';
import { generationAgeShift } from './shared/retirement-age-steps.js';
import { referenceHorizon } from './reference-horizon.js';
import { shortRunEntrantFactor, shortRunProductivityLevel, shortRunDeviationYears } from './shared/short-run-employment.js';
import { EPA_EMPLOYMENT_2026, epaGroupOf } from '../data/epa-employment-2026.js';
import { CAREER_COVERAGE_2026, careerCoverage } from '../data/career-coverage-2026.js';

/** Life expectancy at 65 in this year is the reference of the retirement-age link. */
export const LIFE_EXPECTANCY_LINK_BASE = 2027;
/** Delay bonus per whole year past the legal age (LGSS art. 210.2, O): used for the years the Ageing Report path adds. */
export const DELAY_BONUS_RATE = 0.04;

export function createCurrentCohorts(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('A current cohort base is required');
  // The population edition: EUROPOP2025 by default; 2023 is the Ageing Report's own (config.europop2023).
  const { referenceYear, REFERENCE_POPULATION, REFERENCE_START_YEAR, LONG_HORIZON_END_YEAR,
    POPULATION: POP, MORTALITY } = referenceHorizon(input.populationEdition ?? 2025);
  // Retirement coverage by generation (data/career-coverage-2026.js): off by default; a test or a calibration may pass its own table.
  const coverageTable = input.careerCoverageTable ?? CAREER_COVERAGE_2026;
  const fields = ['baseYear', 'endYear', 'entryAge', 'retirementAge', 'careerYears',
    'wage', 'workers', 'gdp', 'retirees', 'retirementAnnualBenefits', 'accruedReplacementRate'];
  const base = {};
  for (const key of fields) {
    if (!Number.isFinite(input[key]) || input[key] <= 0) throw new RangeError(`Invalid current base.${key}`);
    base[key] = input[key];
  }
  if (!['baseYear', 'endYear', 'entryAge', 'retirementAge', 'careerYears'].every(key => Number.isInteger(base[key])) ||
      base.baseYear < REFERENCE_START_YEAR || base.endYear > LONG_HORIZON_END_YEAR || base.endYear <= base.baseYear ||
      base.entryAge < POP.ages[0] || base.retirementAge <= base.entryAge || base.retirementAge > 75) {
    throw new RangeError('Current cohort calendar or career is outside the available reference');
  }
  const suppliedProfile = input.retirementAgeWeights ?? [{ age: base.retirementAge, weight: 1 }];
  if (!Array.isArray(suppliedProfile) || suppliedProfile.length === 0) throw new RangeError('Retirement age weights are required');
  const ageSet = new Set();
  const profile = suppliedProfile.map(row => {
    if (!row || !Number.isInteger(row.age) || row.age <= base.entryAge || row.age > 100 || ageSet.has(row.age) ||
        !Number.isFinite(row.weight) || row.weight < 0) throw new RangeError('Invalid retirement age weight');
    ageSet.add(row.age);
    return { age: row.age, weight: row.weight };
  }).filter(row => row.weight > 0);
  const weightSum = profile.reduce((sum, row) => sum + row.weight, 0);
  if (!(weightSum > 0)) throw new RangeError('Retirement age weights must have a positive total');
  const retirementAgeWeights = Object.freeze(profile.map(row => Object.freeze({ age: row.age, weight: row.weight / weightSum })));
  const COHORT_BASE = Object.freeze({ ...base, retirementAgeWeights,
    legacyReplacementRate: base.retirementAnnualBenefits / base.retirees / base.wage,
    legacySpendingGDP: base.retirementAnnualBenefits / base.gdp, realWageGrowth: 0 });
  const BASE_YEAR = base.baseYear;
  const mortalityStart = MORTALITY.years.indexOf(BASE_YEAR);
  if (mortalityStart < 0) throw new RangeError('No mortality reference for the current base');
  // Reset only the optional biological-age deviation's origin. Baseline mx
  // remains the same annual EUROPOP series, including its projected improvement.
  const { halfYearSurvival, annuityFactor: baseAnnuityFactor } = createMortality({
    years: MORTALITY.years.slice(mortalityStart), ages: MORTALITY.ages,
    mortalityMx: Object.fromEntries(['M', 'F'].map(sex => [sex, MORTALITY.mortalityMx[sex].slice(mortalityStart)]))
  });
  const LAST_MORTALITY_YEAR = MORTALITY.years.at(-1);
  const MAX_MORTALITY_AGE = MORTALITY.ages.at(-1);
  const discountedFactorCache = new Map();
  function annuityFactor(year, age, sex, startHalf = 0, longevityGain = 0, halfRate = 0) {
    if (halfRate === 0) return baseAnnuityFactor(year, age, sex, startHalf, longevityGain);
    if (startHalf !== 0 && startHalf !== 1) throw new RangeError('Invalid annuity start half');
    if (!Number.isFinite(halfRate) || halfRate <= -1) throw new RangeError('Invalid annuity half-year return');
    // Validate year/age/sex/longevityGain via halfYearSurvival on the opening point.
    halfYearSurvival(year, age, sex, longevityGain);
    const key = `${year}|${age}|${sex}|${startHalf}|${longevityGain}|${halfRate}`;
    if (discountedFactorCache.has(key)) return discountedFactorCache.get(key);
    const stepDiscount = 1 / (1 + halfRate);
    let survival = 1, factor = 0, half = startHalf, currentYear = year, currentAge = age;
    while (true) {
      const halfSurvival = halfYearSurvival(currentYear, currentAge, sex, longevityGain);
      const effectiveStep = halfSurvival * stepDiscount;
      if (currentYear >= LAST_MORTALITY_YEAR && currentAge - longevityGain * (currentYear - BASE_YEAR) >= MAX_MORTALITY_AGE) {
        if (!(effectiveStep < 1)) throw new RangeError('Annuity tail does not converge');
        factor += 0.5 * survival / (1 - effectiveStep);
        break;
      }
      factor += 0.5 * survival;
      survival *= effectiveStep;
      if (half === 1) {
        currentYear += 1;
        currentAge += 1;
        half = 0;
      } else {
        half = 1;
      }
    }
    if (!Number.isFinite(factor) || factor <= 0) throw new RangeError('Invalid annuity factor');
    if (discountedFactorCache.size >= 4096) discountedFactorCache.delete(discountedFactorCache.keys().next().value);
    discountedFactorCache.set(key, factor);
    return factor;
  }

  // A cohort is built from a mid-year stock (populationAt: the mean of two 1 January stocks at the same age), so half
  // of it was born a year earlier than its label (year − age). EUROPOP2025 applies mx_t(t − true birth year), so the
  // cohort's own mortality is that of age + 0,5: its two halves, averaged by the linear interpolation of mx. Survival
  // and the annuity divisors of cohorts use it, so a fund's or a notional account's pricing is the mortality its
  // members die by. Period measures of a single age (life expectancy at 65 for the link, years collecting at 65)
  // keep the exact age (1.76; docs/REVISION-ADVERSARIAL-2026-11-25.md, 1).
  const COHORT_AGE_SHIFT = 0.5;
  const cohortSurvival = (year, age, sex, longevityGain = 0) => halfYearSurvival(year, age + COHORT_AGE_SHIFT, sex, longevityGain);
  const cohortAnnuityFactor = (year, age, sex, startHalf = 0, longevityGain = 0, halfRate = 0) =>
    annuityFactor(year, age + COHORT_AGE_SHIFT, sex, startHalf, longevityGain, halfRate);

  // AR2024 rows through 2070, with their levels of people on EUROPOP2025; later years only in
  // long-horizon runs (src/reference-horizon.js).
  const officialYear = referenceYear;
  function populationAt(year, age, sex = null) {
    const P = REFERENCE_POPULATION, yi = year - P.years[0], ai = age - P.ages[0];
    if (!Number.isInteger(year) || yi < 0 || yi + 1 >= P.years.length || !Number.isInteger(age) ||
        ai < 0 || ai >= POP.ages.length || (sex !== null && !POP.sexes.includes(sex))) {
      throw new RangeError('Population weight outside the available reference');
    }
    return (sex === null ? POP.sexes : [sex]).reduce((sum, s) =>
      sum + (P.population[s][yi][ai] + P.population[s][yi + 1][ai]) / 2, 0);
  }
  function netMigrationAt(year, age, sex) {
    const P = REFERENCE_POPULATION;
    return P.netMigration[sex][year - P.years[0]][age - P.ages[0]];
  }
  function nominalWageAnchor(year) {
    const anchors = AR.ficheAnchors;
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1], b = anchors[i];
      if (year <= b.year) return a.wageNominalEuros *
        (b.wageNominalEuros / a.wageNominalEuros) ** ((year - a.year) / (b.year - a.year));
    }
    // Long-horizon runs only: after the last fiche anchor, its last decade's growth continues.
    const last = anchors.at(-1), previous = anchors.at(-2);
    return last.wageNominalEuros * (last.wageNominalEuros / previous.wageNominalEuros) ** ((year - last.year) / (last.year - previous.year));
  }
  const wageIndex = new Map([[BASE_YEAR, 1]]), productivityIndex = new Map([[BASE_YEAR, 1]]);
  for (let year = BASE_YEAR + 1; year <= base.endYear; year++) {
    wageIndex.set(year, wageIndex.get(year - 1) * nominalWageAnchor(year) / nominalWageAnchor(year - 1) /
      (1 + officialYear(year).hicpInflationPct / 100));
    productivityIndex.set(year, productivityIndex.get(year - 1) *
      (1 + officialYear(year).potentialGDPPerWorkerGrowthPct / 100));
  }
  // With config.airefShortRunEmployment the deviation compounds only from 2031 (shortRunDeviationYears).
  function deviationFactor(year, deviation, config = null) {
    if (!Number.isInteger(year) || year < BASE_YEAR || year > base.endYear || !Number.isFinite(deviation) || deviation <= -1) {
      throw new RangeError('Invalid current-year trend deviation');
    }
    return (1 + deviation) ** (config ? shortRunDeviationYears(year, config) : year - BASE_YEAR);
  }
  function referenceEmployment(year) {
    if (year < BASE_YEAR || year > base.endYear) throw new RangeError('Invalid current employment year');
    return base.workers * officialYear(year).employment20To74Persons / officialYear(BASE_YEAR).employment20To74Persons;
  }
  // With config.airefShortRunEmployment (src/shared/short-run-employment.js), both levels fall in 2027–2030; 1 otherwise.
  function referenceWage(year, growthDeviation = 0, config = null) {
    const deviation = deviationFactor(year, growthDeviation, config);
    return base.wage * wageIndex.get(year) * deviation * shortRunProductivityLevel(year, config);
  }
  function outputPerWorker(year, growthDeviation = 0, config = null) {
    const deviation = deviationFactor(year, growthDeviation, config);
    return base.gdp / base.workers * productivityIndex.get(year) * deviation * shortRunProductivityLevel(year, config);
  }
  function newAwardRate(retirementYear) {
    // A ratio: read as published, also for retirement years before the population starts.
    return AR.annual[Math.max(AR.baseYear, Math.min(AR.annual.at(-1).year, retirementYear)) - AR.baseYear]
      .earningsRelatedRetirementNewAwardReplacementRatePct / 100;
  }
  // Retirement age tied to life expectancy (config.retirementAgeLink, 0 = off): each
  // generation adds that share of the gain in life expectancy at 65 between
  // LIFE_EXPECTANCY_LINK_BASE and the year it turns 65, in whole years. As in the
  // laws that apply such links, it is PERIOD life expectancy (that year's mortality,
  // both sexes averaged) from the engine's own mortality, longevity gain included.
  const lifeExpectancyCache = new Map();
  function lifeExpectancyAt65(year, longevityGain = 0) {
    const key = `${year}|${longevityGain}`;
    if (!lifeExpectancyCache.has(key)) {
      let total = 0;
      for (const sex of ['M', 'F']) {
        let survival = 1, years = 0;
        for (let age = 65; age < 125 && survival > 1e-7; age++) {
          const half = halfYearSurvival(year, age, sex, longevityGain);
          years += 0.5 * survival * (1 + half) / 2;
          survival *= half;
          years += 0.5 * survival * (1 + half) / 2;
          survival *= half;
        }
        total += years;
      }
      lifeExpectancyCache.set(key, total / 2);
    }
    return lifeExpectancyCache.get(key);
  }
  // The effective retirement age follows the Ageing Report 2024 path (config.retirementAgeExitPath,
  // 1, the default since 1.68; 0 = the observed 2026 profile frozen, the default up to 1.67). Each generation
  // gets the rise of the AR labour-market exit age over BASE_YEAR, read in the year it turns 65
  // (as the life-expectancy link reads its year): +0.37 for 2027, +1.37 from 2040. Before BASE_YEAR
  // and after the last AR year the path is held at its ends.
  const exitAgeAt = year => {
    const value = AR.annual[Math.max(BASE_YEAR, Math.min(AR.annual.at(-1).year, year)) - AR.baseYear]?.labourMarketExitAgeYears;
    if (!Number.isFinite(value)) throw new RangeError('No Ageing Report exit age for that year');
    return value;
  };
  const EXIT_AGE_BASE = exitAgeAt(BASE_YEAR);
  /** Years the Ageing Report path adds to the retirement ages of one generation: fractional, 0 when off. */
  function exitPathRise(birthYear, config) {
    return config?.retirementAgeExitPath ? exitAgeAt(birthYear + 65) - EXIT_AGE_BASE : 0;
  }
  // The rise is fractional and the engine retires whole-year groups, so it is not rounded per
  // generation (that would lose up to half a year). Instead the generation's own profile of
  // retirement ages moves: each age A of weight w gives w·(1 − f) to A + k and w·f to A + k + 1,
  // with k + f the rise (k whole, 0 ≤ f < 1), and equal ages merge. The groups of that generation
  // are created from this profile wherever groups are born (initialCohorts, buildReferenceEntrants,
  // and so every later entrant), so the size-weighted mean rise is exactly the path's, the split is
  // deterministic and the number of groups barely grows (one more age per generation). The moved
  // age is the group's reference age (item.targetRetirementAge): the delay of a later retirement
  // (1.59) is measured from it, so the path is never a forced delay.
  const exitProfiles = new Map();
  function generationProfile(birthYear, config) {
    const rise = exitPathRise(birthYear, config);
    if (rise === 0) return retirementAgeWeights;
    let profile = exitProfiles.get(birthYear);
    if (!profile) {
      const whole = Math.floor(rise), part = rise - whole, byAge = new Map();
      const add = (age, weight) => { if (weight > 0) byAge.set(age, (byAge.get(age) ?? 0) + weight); };
      for (const row of retirementAgeWeights) {
        add(row.age + whole, row.weight * (1 - part));
        add(row.age + whole + 1, row.weight * part);
      }
      profile = Object.freeze([...byAge].sort((a, b) => a[0] - b[0]).map(([age, weight]) => Object.freeze({ age, weight })));
      exitProfiles.set(birthYear, profile);
    }
    return profile;
  }
  // The rule of a configuration: share linked, longevity gain, healthy-years basis
  // (that share of the gain, healthyLifeShare) and the highest reference age.
  // Called for every cohort and half-year: offsets are kept by birth year for the current rule.
  // The key is built once per config object (audit 1.85, 22): building it on every call made a run with a link of
  // 1/3 or 2/3 four to six times slower. Configs are not mutated during a run.
  let offsetKey = null, offsetConfig = null, offsets = new Map();
  function linkedAgeOffset(item, config = {}) {
    const link = config.retirementAgeLink ?? 0;
    if (!link) return 0;
    const longevityGain = config.longevityGain ?? 0;
    const healthy = config.retirementAgeLinkHealthy ? (config.healthyLifeShare ?? 0.5) : 1;
    const cap = config.retirementAgeCap ?? 0;
    const retirementAge = config.retirementAge ?? base.retirementAge;
    if (config !== offsetConfig) {
      const exitPath = config.retirementAgeExitPath ? 1 : 0;
      const key = `${link}|${longevityGain}|${healthy}|${cap}|${retirementAge}|${exitPath}`;
      if (key !== offsetKey) { offsetKey = key; offsets = new Map(); }
      offsetConfig = config;
    }
    let offset = offsets.get(item.birthYear);
    if (offset === undefined) {
      const year65 = item.birthYear + 65;
      offset = year65 <= LIFE_EXPECTANCY_LINK_BASE ? 0
        : Math.max(0, Math.round(link * healthy * (lifeExpectancyAt65(year65, longevityGain) - lifeExpectancyAt65(LIFE_EXPECTANCY_LINK_BASE, longevityGain))));
      // The highest age counts the path's rise too, rounded as the link is (0 without the path).
      if (cap > 0) offset = Math.min(offset, Math.max(0, cap - retirementAge - Math.round(exitPathRise(item.birthYear, config))));
      offsets.set(item.birthYear, offset);
    }
    return offset;
  }
  /** Expected years collecting a pension for the generation turning 65 in `year65` (cohort life expectancy at its retirement age, both sexes). */
  const yearsCollectingCache = new Map();
  function yearsCollectingFor(year65, config = {}) {
    // The rise that reaches that generation: all of it, or its steps (src/shared/retirement-age-steps.js).
    const offset = linkedAgeOffset({ birthYear: year65 - 65 }, config)
      + generationAgeShift(year65 - 65, (config.retirementAge ?? base.retirementAge) - base.retirementAge, config.retirementAgeStepYears ?? 0, base.retirementAge);
    // The Ageing Report path adds its fractional rise as the groups get it: k + 1 years for a share f, k for the rest.
    const rise = exitPathRise(year65 - 65, config), whole = Math.floor(rise), part = rise - whole;
    const gain = config.longevityGain ?? 0, key = `${year65}|${offset}|${gain}|${rise}`;
    if (!yearsCollectingCache.has(key)) {
      // Retiring before 65 can fall before the mortality tables start: use their first year.
      const at = shift => {
        const age = 65 + offset + shift, year = Math.max(BASE_YEAR, year65 + offset + shift);
        return (annuityFactor(year, age, 'M', 0, gain) + annuityFactor(year, age, 'F', 0, gain)) / 2;
      };
      yearsCollectingCache.set(key, part === 0 ? at(whole) : (1 - part) * at(whole) + part * at(whole + 1));
    }
    return yearsCollectingCache.get(key);
  }
  // A higher age reaches every generation at once, or one year at a time when the scenario asks for steps
  // (config.retirementAgeStepYears, 0 by default: the same sum as always).
  function targetRetirementAge(item, retirementAge = base.retirementAge, config = null) {
    const stepYears = config?.retirementAgeStepYears ?? 0;
    if (!(stepYears > 0)) return (item.targetRetirementAge ?? base.retirementAge) + retirementAge - base.retirementAge + (config ? linkedAgeOffset(item, config) : 0);
    return (item.targetRetirementAge ?? base.retirementAge) + generationAgeShift(item.birthYear, retirementAge - base.retirementAge, stepYears, base.retirementAge) + linkedAgeOffset(item, config);
  }
  function shouldRetire(item, year, half, config) {
    return year - item.birthYear >= targetRetirementAge(item, config.retirementAge, config) && (half === 1 || !item.hasWorked);
  }
  // Share working in a half-year of the delay of a later retirement (1.59, src/shared/retirement-delay.js).
  function delayShare(item, year, half, config) {
    if (!config || !((config.retirementDelayEmployment ?? 1) < 1)) return 1;
    return delayWorkShare(year - item.birthYear, half, item.targetRetirementAge ?? base.retirementAge,
      targetRetirementAge(item, config.retirementAge, config), config.retirementDelayEmployment);
  }
  function employmentShare(item, year, half, config) {
    // Those not employed in 2026 but with a career (data/career-coverage-2026.js) never work again.
    if (item.inactive) return 0;
    return item.retired || shouldRetire(item, year, half, config) ? 0 : delayShare(item, year, half, config);
  }
  function employmentExposure(item, year, retirementAge = base.retirementAge, longevityGain = 0, config = null) {
    const age = year - item.birthYear, target = targetRetirementAge(item, retirementAge, config);
    if (item.retired || item.inactive || (age >= target && !item.hasWorked)) return 0;
    const survival = cohortSurvival(year, age, item.sex, longevityGain);
    return item.size * 0.5 * (delayShare(item, year, 0, config) + (age < target ? survival * delayShare(item, year, 1, config) : 0));
  }
  // Persons out of work in the delay: the exposure the delay takes away.
  function delayedOutOfWork(item, year, config) {
    if (!((config.retirementDelayEmployment ?? 1) < 1)) return 0;
    const age = year - item.birthYear, target = targetRetirementAge(item, config.retirementAge, config);
    if (item.retired || item.inactive || (age >= target && !item.hasWorked)) return 0;
    const survival = cohortSurvival(year, age, item.sex, config.longevityGain);
    return item.size * 0.5 * (1 - delayShare(item, year, 0, config) + (age < target ? survival * (1 - delayShare(item, year, 1, config)) : 0));
  }
  function expectedRetirementYear(item, year, config) {
    return Math.max(year, item.birthYear + Math.ceil(targetRetirementAge(item, config.retirementAge, config)));
  }
  // With the Ageing Report path, a year that the path adds and that falls at or past the legal age
  // earns the law's delay bonus (LGSS art. 210.2: 4 % for each whole year, O) instead of the
  // 1/careerYears of an ordinary year (S: 4 % of a full-career pension). The legal age is the target
  // of a group whose profile age is 65, so it moves with the scenario's age levers. A year the path
  // adds before the legal age is an ordinary year.
  // Without the path (the frozen ages, an option; the default in 1.67): newAwardRate is the Ageing Report's, which
  // counts on its later exits, so a year of work is worth 1/(careerYears + the rise the path would give
  // that generation). Retiring at the 2026 ages then loses an ordinary year's pension for each year the
  // AR expects more work (S; docs/DECISIONES.md, 24/11/2026). Generations turning 65 by 2026 get no rise.
  // config.exitPathNoExtraPension = 1 (0 by default): the years the path adds earn no pension at all,
  // as in the Ageing Report, whose replacement rate of new pensions (newAwardRate) already holds its
  // own exit ages; the bonus or 1/careerYears on top would count the later exit twice (24/11/2026).
  function paygAccrualYears(item, year, half, config) {
    if (!config?.retirementAgeExitPath) return COHORT_BASE.careerYears + Math.max(0, exitAgeAt(item.birthYear + 65) - EXIT_AGE_BASE);
    const rise = exitPathRise(item.birthYear, config);
    if (!(rise > 0)) return COHORT_BASE.careerYears;
    const target = targetRetirementAge(item, config.retirementAge, config);
    if (config.exitPathNoExtraPension) return year - item.birthYear + 0.5 * half >= target - rise ? Infinity : COHORT_BASE.careerYears;
    const legal = targetRetirementAge({ birthYear: item.birthYear, targetRetirementAge: base.retirementAge }, config.retirementAge, config);
    const age = year - item.birthYear + 0.5 * half;
    return age >= Math.max(target - rise, legal) ? 1 / DELAY_BONUS_RATE : COHORT_BASE.careerYears;
  }
  function activeProfile(age, birthYear, config) {
    // Conditional allocation: a worker already present at the snapshot cannot
    // be assigned a reference target age that they have already passed.
    return generationProfile(birthYear, config).filter(row => row.age > age);
  }
  const maxWorkingAge = Math.min(74, Math.max(...retirementAgeWeights.map(row => row.age)) - 1);
  // Without a configuration (the 1985 retrospective, older callers) the 2026 profile stays frozen.
  function initialCohorts(config = null) {
    const row = officialYear(BASE_YEAR), cohorts = [];
    const groups = [[base.entryAge, 24, row.employmentShare20To24Pct],
      [Math.max(25, base.entryAge), 54, row.employmentShare25To54Pct],
      [Math.max(55, base.entryAge), 64, row.employmentShare55To64Pct],
      [Math.max(65, base.entryAge), maxWorkingAge, row.employmentShare65To74Pct]]
      .map(([lo, hi, share]) => [lo, Math.min(hi, maxWorkingAge), share])
      .filter(([lo, hi, share]) => hi >= lo && share > 0);
    const shareSum = groups.reduce((sum, group) => sum + group[2], 0);
    if (!(shareSum > 0)) throw new RangeError('No initial employment age weights');
    // Workers aged 65 and over continue those of 64 (1.76; docs/REVISION-ADVERSARIAL-2026-11-25.md, 2): each age
    // and target keeps the size per unit of weight of the 55-64 group, so only those whose retirement age is still
    // ahead remain, as the engine's own dynamics would leave them a year later. Normalising the Ageing Report's
    // 65-74 share on its own put 53 % of the 65-year-olds in work, more than at 64, and they all retired in 2027.
    // What that share needs beyond the continuation goes to the younger groups in proportion, so the 2026 total
    // of workers stays the calibrated one.
    // Retirement coverage by generation (data/career-coverage-2026.js; off until calibrated). When on, the employment
    // of each five-year group and sex inside those groups is the EPA's: within a five-year group the shape by single
    // age stays population × the share of the retirement profile still ahead, scaled so the group's mean is the EPA
    // rate; 65 and over keep the 60–64 factor, so they still continue those of 64.
    const coverageOn = coverageTable.enabled;
    const massAhead = age => activeProfile(age, BASE_YEAR - age, config).reduce((sum, target) => sum + target.weight, 0);
    const shapeCache = new Map();
    const epaShape = (age, sex) => {
      if (!coverageOn) return 1;
      const group = epaGroupOf(Math.min(age, 64));
      if (!group) return 1;
      const key = `${group}|${sex}`;
      if (!shapeCache.has(key)) {
        const [lo, hi] = group.split('-').map(Number);
        let population = 0, weighted = 0;
        for (let a = lo; a <= hi; a++) { const p = populationAt(BASE_YEAR, a, sex); population += p; weighted += p * massAhead(a); }
        const rate = EPA_EMPLOYMENT_2026.employedThousands[sex][group] * 1000 / population;
        shapeCache.set(key, weighted > 0 ? rate / (weighted / population) : 0);
      }
      return shapeCache.get(key);
    };
    const candidatesOf = (lo, hi) => {
      const candidates = [];
      for (let age = lo; age <= hi; age++) for (const sex of POP.sexes) {
        const shape = epaShape(age, sex);
        for (const target of activeProfile(age, BASE_YEAR - age, config)) candidates.push({ age, sex, target: target.age,
          weight: populationAt(BASE_YEAR, age, sex) * target.weight * shape });
      }
      return candidates;
    };
    const plan = groups.map(([lo, hi, share]) => {
      const candidates = candidatesOf(lo, hi);
      const sum = candidates.reduce((total, candidate) => total + candidate.weight, 0);
      if (!(sum > 0)) throw new RangeError('No eligible age/sex/profile weights for current workers');
      return { lo, candidates, perWeight: base.workers * share / shareSum / sum };
    });
    const older = plan.find(group => group.lo >= 65), lastYoung = plan.filter(group => group.lo < 65).at(-1);
    if (older && lastYoung) {
      const total = group => group.candidates.reduce((sum, candidate) => sum + candidate.weight, 0) * group.perWeight;
      const before = total(older);
      older.perWeight = lastYoung.perWeight;
      const young = plan.filter(group => group !== older), youngTotal = young.reduce((sum, group) => sum + total(group), 0);
      const scale = (youngTotal + before) / (youngTotal + total(older));
      for (const group of young) group.perWeight *= scale;
      older.perWeight *= scale;
    }
    const careerOf = (age, share = 1) => base.wage * base.accruedReplacementRate *
      Math.min(base.careerYears, Math.max(0, age - base.entryAge + 1)) * share / base.careerYears;
    for (const { candidates, perWeight } of plan) {
      for (const candidate of candidates) {
        const size = perWeight * candidate.weight;
        // With coverage on, a share of each generation's workers reaches no contributory public pension (noClaim).
        const noClaim = careerCoverage(BASE_YEAR - candidate.age, candidate.sex, coverageTable).noClaim;
        for (const [part, flag] of [[1 - noClaim, false], [noClaim, true]]) {
          if (!(part > 0)) continue;
          const item = cohort(BASE_YEAR - candidate.age, size * part, candidate.sex);
          item.targetRetirementAge = candidate.target;
          item.hasWorked = true;
          if (flag) item.noClaim = true;
          // Flat real career is a liability proxy, not observed contribution history.
          item.legacyAnnual = careerOf(candidate.age);
          cohorts.push(item);
        }
      }
    }
    // With coverage on, those not employed in 2026 but with a career: a share of each generation's population, with
    // the retirement ages still ahead of it, earlier rights for part of a full career, and no more work (inactive).
    if (coverageOn) {
      for (let age = base.entryAge; age <= maxWorkingAge; age++) for (const sex of POP.sexes) {
        const extra = careerCoverage(BASE_YEAR - age, sex, coverageTable).extra;
        if (!(extra > 0)) continue;
        const targets = activeProfile(age, BASE_YEAR - age, config), mass = targets.reduce((sum, t) => sum + t.weight, 0);
        if (!(mass > 0)) continue;
        for (const target of targets) {
          const item = cohort(BASE_YEAR - age, extra * populationAt(BASE_YEAR, age, sex) * target.weight / mass, sex);
          item.targetRetirementAge = target.age;
          item.hasWorked = true;
          item.inactive = true;
          item.legacyAnnual = careerOf(age, coverageTable.inactiveCareerShare);
          cohorts.push(item);
        }
      }
    }
    const known = STOCK.rows.filter(row => row.ageLower !== null);
    const count = known.reduce((sum, row) => sum + row.M.count + row.F.count, 0);
    const monthlySum = known.reduce((sum, row) => sum + POP.sexes.reduce((part, sex) => {
      if (row[sex].count > 0 && !(Number.isFinite(row[sex].averageMonthlyEUR) && row[sex].averageMonthlyEUR >= 0)) {
        throw new RangeError('Missing observed pension amount for an age/sex group');
      }
      return part + row[sex].count * (row[sex].averageMonthlyEUR ?? 0);
    }, 0), 0);
    if (!(count > 0 && monthlySum > 0)) throw new RangeError('No current retirement stock weights');
    const meanMonthly = monthlySum / count, meanAnnual = base.retirementAnnualBenefits / base.retirees;
    for (const row of known) for (const sex of POP.sexes) {
      if (row[sex].count === 0) continue;
      const lo = row.ageLower, hi = row.ageUpper ?? POP.ages.at(-1);
      let population = 0;
      for (let age = lo; age <= hi; age++) population += populationAt(BASE_YEAR, age, sex);
      if (!(population > 0)) throw new RangeError('No population weights in a current pension age group');
      for (let age = lo; age <= hi; age++) {
        const item = cohort(BASE_YEAR - age, base.retirees * row[sex].count / count * populationAt(BASE_YEAR, age, sex) / population, sex);
        item.retired = true;
        item.hasWorked = true;
        item.legacyAnnual = meanAnnual * row[sex].averageMonthlyEUR / meanMonthly;
        cohorts.push(item);
      }
    }
    return cohorts;
  }

  // Reference entrants are fixed before any policy scenario. This closes only
  // the reference employment bridge; it never deletes existing people/rights.
  // Built on first use, with the same constants: loading the model (the Laboratorio
  // does it before its first draw) does not pay for it.
  // The Ageing Report employment already holds its later exits, so the bridge is built once, with the
  // path: who enters is the number of persons, by age and sex, that gives the AR employment when people
  // retire as the AR expects. With the path on, those entrants are used as built: the employment stays
  // the AR's and there are fewer retirees. With it off (1.66), the same persons enter but retire at the
  // 2026 ages, so retiring earlier takes older workers away: no young entrants refill them (before 1.66
  // a second bridge did, which kept the AR employment with the frozen ages; docs/DECISIONES.md, 24/11/2026).
  let referenceBridge = null;
  function buildReferenceEntrants() {
    const entrants = new Map(), slots = new Map();
    const pathConfig = { retirementAgeExitPath: 1 };
    let active = initialCohorts(pathConfig).filter(item => !item.retired);
    const referenceConfig = { retirementAge: base.retirementAge };
    for (let year = BASE_YEAR + 1; year <= base.endYear; year++) {
      const continuing = active.reduce((sum, item) => sum + employmentExposure(item, year), 0);
      const neededExposure = Math.max(0, referenceEmployment(year) - continuing);
      const candidates = [], yearSlots = [];
      for (let age = base.entryAge; age <= maxWorkingAge; age++) for (const sex of POP.sexes) {
        const migration = Math.max(0, netMigrationAt(year, age, sex));
        const youngWeight = age === base.entryAge ? populationAt(year, age, sex) : 0;
        const weight = youngWeight + migration;
        let pathShare = 0;
        for (const target of activeProfile(age, year - age, pathConfig)) {
          const item = cohort(year - age, weight * target.weight, sex);
          item.targetRetirementAge = target.age;
          item.youngEntryShare = weight > 0 ? youngWeight / weight : 0;
          candidates.push(item);
          pathShare += target.weight;
        }
        yearSlots.push({ age, sex, weight, youngWeight, pathShare });
      }
      const availableExposure = candidates.reduce((sum, item) => sum + employmentExposure(item, year), 0);
      if (!(availableExposure > 0)) throw new RangeError('No reference entrant exposure weights');
      const entries = candidates.map(item => ({ ...item, size: item.size * neededExposure / availableExposure }));
      entrants.set(year, entries);
      slots.set(year, { slots: yearSlots, neededExposure, availableExposure });
      active.push(...entries.map(item => ({ ...item })));
      active = active.filter(item => !shouldRetire(item, year, 1, referenceConfig));
      for (const item of active) {
        item.size *= cohortSurvival(year, year - item.birthYear, item.sex) ** 2;
        item.hasWorked = true;
      }
    }
    return { entrants, slots, frozen: new Map() };
  }
  // The same persons by age and sex, with the 2026 retirement ages: each slot keeps its total, spread by the
  // frozen profile of ages still ahead (renormalised to the path's share, since both drop the ages passed).
  function frozenEntrants(year) {
    const bridge = referenceBridge;
    if (!bridge.frozen.has(year)) {
      const { slots, neededExposure, availableExposure } = bridge.slots.get(year), entries = [];
      for (const { age, sex, weight, youngWeight, pathShare } of slots) {
        const profile = activeProfile(age, year - age, null);
        const frozenShare = profile.reduce((sum, target) => sum + target.weight, 0);
        if (!(frozenShare > 0)) continue;
        for (const target of profile) {
          const item = cohort(year - age, weight * target.weight * pathShare / frozenShare, sex);
          item.targetRetirementAge = target.age;
          item.youngEntryShare = weight > 0 ? youngWeight / weight : 0;
          entries.push({ ...item, size: item.size * neededExposure / availableExposure });
        }
      }
      bridge.frozen.set(year, entries);
    }
    return bridge.frozen.get(year);
  }
  function entrantCohorts(year, growthDeviation = 0, config = {}) {
    referenceBridge ??= buildReferenceEntrants();
    // More entrants in 2027–2030 with config.airefShortRunEmployment (src/shared/short-run-employment.js).
    const factor = deviationFactor(year, growthDeviation, config) * shortRunEntrantFactor(year, config);
    const entries = config.retirementAgeExitPath ? referenceBridge.entrants.get(year) : referenceBridge.slots.has(year) ? frozenEntrants(year) : null;
    if (!entries) throw new RangeError('No entrants for the current reference year');
    // Reference bridge is fixed BEFORE the experiment. Never refill the lost
    // entrants to the old employment target or reduce the adult migration part.
    return entries.map(item => {
      const fertilityScale = 1 + item.youngEntryShare *
        (fertilityFactor(item.birthYear, config.targetFertility ?? 0) - 1);
      return { ...item, fertilityScale, size: item.size * factor * fertilityScale };
    });
  }
  const assumptions = Object.freeze({
    stockSource: STOCK.metadata.id, stockDate: STOCK.metadata.stockDate,
    pensionUnit: 'Observed benefits, not unique people; unknown age/sex excluded only from shape and restored by aggregate scaling.',
    pensionAmounts: 'Current monthly amounts supply relative age/sex weights only. The supplied annual payment pace sets the total; no automatic 14-payment annualisation.',
    pensionAges: 'Individual ages inside observed bands, including open85+, follow projected EUROPOP mean population weights for the current year.',
    workers: 'Current employment total allocated with AR age-group shares and EUROPOP age/sex weights; partial source age groups are renormalised once.',
    initialRights: 'Existing workers receive protected DB rights from a flat-real-career proxy, capped at careerYears. This is not verified individual career history.',
    retirement: input.retirementAgeWeights
      ? 'Marginal age weights become reference target ages, shared across sexes. Initial active cohorts condition on target above current age; this is not an individual legal eligibility model.'
      : 'Uniform reference retirement age; the policy control is an offset from that reference.',
    calendar: 'Base is a current annual-pace snapshot. First scenario year is baseYear+1; retirements at midyear, not a monthly simulation of the remaining current year.',
    trends: 'Current macro levels are preserved; nominal-wage/HICP ratios, potential productivity and new-award ratios use the AR2024 paths as explicit approximations. Employment growth applies the AR2024 employment by age group (20–24, 25–54, 55–64, 65–74) to the EUROPOP2025 population: two editions mixed until the AR2027.',
    entrants: 'Young population and positive projected net migration allocate new worker exposure. They are not observed hires; all new entries start without domestic rights.',
    mortality: 'EUROPOP2025 annual mx, not observed current mortality. Optional longevity deviation begins at the current base year.',
    fertility: 'Optional relative young-cohort sensitivity from births2027, entering at22 from2049. Target fertility / EUROPOP2025 fertility of the birth year; no annual compounding or refilling of the reference employment bridge. Adult migration weights stay intact. Resident young population includes unidentified childhood migration; no endogenous mothers/second generation or full birth projection is claimed.'
  });
  return Object.freeze({ COHORT_BASE, initialCohorts, entrantCohorts, employmentExposure,
    employmentShare, delayedOutOfWork, shouldRetire, expectedRetirementYear, referenceEmployment, referenceWage,
    outputPerWorker, newAwardRate, populationAt, netMigrationAt, halfYearSurvival: cohortSurvival, annuityFactor: cohortAnnuityFactor,
    exactAgeSurvival: halfYearSurvival, lifeExpectancyAt65, linkedAgeOffset,
    exitPathRise, yearsCollectingFor, paygAccrualYears, assumptions });
}
