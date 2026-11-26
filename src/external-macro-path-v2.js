/** Optional external macro conditioning shared by the production v2 factory.
 * No fiscal outcome after the opening is accepted; no source horizons extended.
 */
import { OFFICIAL_POPULATION as POP } from '../data/official-population.js';
import { cohort } from './cohort-core.js';

const KEYS = ['year', 'nominalGDPIndex', 'consumerPriceIndex', 'employmentIndex', 'nominalWageIndex', 'nominalBondRate'];
export function validateMacroRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > 6) throw new RangeError('Macro rows must cover2026 and1–5 consecutive years');
  const result = rows.map((row, i) => {
    if (!row || ![Object.prototype, null].includes(Object.getPrototypeOf(row))) throw new TypeError('A plain macro row is required');
    for (const key of Reflect.ownKeys(row)) {
      if (!KEYS.includes(key) || !Object.hasOwn(Object.getOwnPropertyDescriptor(row, key), 'value')) throw new TypeError('Unknown macro field or accessor');
    }
    if (row.year !== 2026 + i) throw new RangeError('Macro years must be consecutive');
    for (const key of ['nominalGDPIndex', 'consumerPriceIndex']) if (!Number.isFinite(row[key]) || row[key] <= 0) throw new RangeError('Invalid ' + key);
    for (const key of ['employmentIndex', 'nominalWageIndex']) if (Object.hasOwn(row, key) && (!Number.isFinite(row[key]) || row[key] <= 0)) throw new RangeError('Invalid ' + key);
    if (Object.hasOwn(row, 'nominalBondRate') && (!Number.isFinite(row.nominalBondRate) || row.nominalBondRate <= -1)) throw new RangeError('Invalid nominalBondRate');
    if (!i) for (const key of KEYS.filter(k => k.endsWith('Index'))) if (Object.hasOwn(row, key) && row[key] !== 1) throw new RangeError('2026 index must be1');
    return Object.freeze({ ...row });
  });
  for (const key of ['employmentIndex', 'nominalWageIndex']) {
    const count = result.filter(r => Object.hasOwn(r, key)).length;
    if (count !== 0 && count !== result.length) throw new RangeError(key + ' must cover all years');
  }
  const bonds = result.slice(1).filter(r => Object.hasOwn(r, 'nominalBondRate')).length;
  if (bonds !== 0 && bonds !== result.length - 1) throw new RangeError('Bond path must cover all future years');
  return Object.freeze(result);
}

export function createExternalMacroPathV2(base, demographics, rows) {
  const macroPath = rows.map(row => ({ ...row,
    workers: row.employmentIndex === undefined ? demographics.referenceEmployment(row.year) : base.workers * row.employmentIndex,
    wage: row.nominalWageIndex === undefined ? demographics.referenceWage(row.year, 0) : base.wage * row.nominalWageIndex / row.consumerPriceIndex,
    gdp: base.gdp * row.nominalGDPIndex / row.consumerPriceIndex,
    nominalGDP: base.gdp * row.nominalGDPIndex
  }));
  const byYear = new Map(macroPath.map(p => [p.year, Object.freeze(p)]));
  const macro = year => { if (!byYear.has(year)) throw new RangeError('No macro year'); return byYear.get(year); };
  const participation = new WeakMap();
  // The scenario's retirement-age path (retirementAgeExitPath, 1.66) shapes the templates as it shapes the initial cohorts.
  function entrantTemplates(year, config) {
    const entries = demographics.entrantCohorts(year, 0, { retirementAgeExitPath: config.retirementAgeExitPath }).filter(item => item.size > 0);
    if (entries.length) return entries;
    const profile = demographics.COHORT_BASE.retirementAgeWeights;
    const candidates = [], maxAge = Math.min(74, Math.max(...profile.map(p => p.age)) - 1);
    // The current cohorts (1.55) give their own migration (EUROPOP2025); older engines keep EUROPOP2023.
    const migrationAt = demographics.netMigrationAt ?? ((y, age, sex) => POP.netMigration[sex][y - POP.years[0]][age - POP.ages[0]]);
    for (let age = 22; age <= maxAge; age++) for (const sex of POP.sexes) {
      const migration = Math.max(0, migrationAt(year, age, sex));
      const size = (age === 22 ? demographics.populationAt(year, age, sex) : 0) + migration;
      for (const target of profile.filter(p => p.age > age)) if (size * target.weight > 0) {
        candidates.push({ ...cohort(year - age, size * target.weight, sex), targetRetirementAge: target.age });
      }
    }
    return candidates;
  }
  const overrides = {
    entrantCohorts: () => [],
    prepareYearCohorts(cohorts, year, config) {
      const exposure = p => demographics.employmentExposure(p, year, config.retirementAge, config.longevityGain);
      const capacity = cohorts.reduce((n, p) => n + exposure(p), 0), target = macro(year).workers;
      let addedParticipants = 0;
      if (target > capacity) {
        const entries = entrantTemplates(year, config), available = entries.reduce((n, p) => n + exposure(p), 0);
        if (!(available > 0)) throw new RangeError('No entrant template exposure');
        for (const p of entries) { p.size *= (target - capacity) / available; addedParticipants += p.size; cohorts.push(p); }
      }
      const share = Math.min(1, target / capacity);
      for (const p of cohorts) if (!p.retired) participation.set(p, share);
      return { cohorts, diagnostics: { kind: 'external-macro-employment-bridge-v2', targetWorkers: target,
        capacityExposure: capacity, employmentParticipation: share, addedParticipants } };
    },
    employmentExposure: (p, year, age, longevity) => demographics.employmentExposure(p, year, age, longevity) * (participation.get(p) ?? 1),
    employmentShare: (p, year, half, config) => demographics.employmentShare(p, year, half, config) * (participation.get(p) ?? 1),
    referenceEmployment: year => macro(year).workers,
    referenceWage: year => macro(year).wage,
    outputPerWorker: year => macro(year).gdp / macro(year).workers
  };
  return Object.freeze({ macro, macroPath: Object.freeze(macroPath), overrides,
    cumulativePriceFactors: Object.freeze(Object.fromEntries(rows.map(r => [r.year, r.consumerPriceIndex]))) });
}
