// The effective retirement age follows the Ageing Report 2024 path (retirementAgeExitPath, 1 by default since 1.68;
// 0 freezes the 2026 profile, the default up to 1.67). With it, each generation retires later by the rise of the AR exit age in the
// year it turns 65, the employment stays the AR's, and the rise is no forced delay.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_SPAIN } from '../data/current-spain-v8.js';
import { RETIREMENT_AGE_WEIGHTS } from '../data/current-pension-stock.js';
import { createCurrentCohorts } from '../src/current-cohorts-v10.js';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';

const demographics = createCurrentCohorts({ ...CURRENT_SPAIN.base, baseYear: CURRENT_SPAIN.baseYear, endYear: CURRENT_SPAIN.endYear,
  entryAge: 22, retirementAge: 65, careerYears: 43, accruedReplacementRate: 0.77, retirementAgeWeights: RETIREMENT_AGE_WEIGHTS });

// Size-weighted mean reference age of every group of one generation, at the start and as it enters.
function meanTargetAge(birthYear, exitPath) {
  const config = { retirementAgeExitPath: exitPath };
  let groups = demographics.initialCohorts(config);
  for (let year = CURRENT_SPAIN.baseYear + 1; year <= CURRENT_SPAIN.endYear; year++) groups = groups.concat(demographics.entrantCohorts(year, 0, config));
  groups = groups.filter(item => item.birthYear === birthYear && !item.retired);
  const size = groups.reduce((sum, item) => sum + item.size, 0);
  return groups.reduce((sum, item) => sum + item.size * item.targetRetirementAge, 0) / size;
}

test('the generation turning 65 in 2045 retires 1.37 years later on average, without rounding', () => {
  const rise = meanTargetAge(1980, 1) - meanTargetAge(1980, 0);
  assert.ok(Math.abs(rise - 1.37) < 0.05, `rise ${rise}`);
});

const frozen = simulate({ ...DEFAULT_CONFIG, retirementAgeExitPath: 0 });
const withPath = simulate({ ...DEFAULT_CONFIG });
const at = (run, year) => run.years.find(row => row.year === year);

// Since 1.66 the frozen ages take older workers away: with the path, people work as the Ageing Report expects.
test('on by default since 1.68; with it, more people work (the Ageing Report employment) and fewer collect', () => {
  assert.equal(DEFAULT_CONFIG.retirementAgeExitPath, 1);
  const a = at(withPath, 2050).workingPersons, b = at(frozen, 2050).workingPersons;
  assert.ok(a / b > 1.01 && a / b < 1.06, `${a} vs ${b}`);
  assert.ok(at(withPath, 2070).retirees < at(frozen, 2070).retirees);
});

test('a year the path adds past the legal age earns the 4 % delay bonus; without the path, a year earns 1/(43 + the rise)', () => {
  const off = { retirementAge: 65, retirementAgeExitPath: 0 }, on = { retirementAge: 65, retirementAgeExitPath: 1 };
  // Born 1980: rise 1.37. A group of profile age 65 retires at 66 or 67; its years from 65 are bonus years.
  const group = { birthYear: 1980, targetRetirementAge: 66 };
  // Without the path (1.67): the Ageing Report rate counts on 1.37 more years of work, so a year earns 1/44.37.
  assert.ok(Math.abs(demographics.paygAccrualYears(group, 2045, 0, off) - 44.3711) < 1e-9);
  assert.equal(demographics.paygAccrualYears({ birthYear: 1960, targetRetirementAge: 65 }, 2025, 0, off), 43);
  assert.equal(demographics.paygAccrualYears(group, 2044, 1, on), 43);
  assert.equal(demographics.paygAccrualYears(group, 2045, 0, on), 25);
  // A group of profile age 62, moved to 63: the year it gains is before the legal age, an ordinary year.
  assert.equal(demographics.paygAccrualYears({ birthYear: 1980, targetRetirementAge: 63 }, 2042, 1, on), 43);
  // A generation the path does not reach.
  assert.equal(demographics.paygAccrualYears({ birthYear: 1960, targetRetirementAge: 65 }, 2025, 0, on), 43);
  assert.ok(at(withPath, 2050).replacementRate > at(frozen, 2050).replacementRate);
});

test('the path is no forced delay: at 65 nobody is out of work waiting', () => {
  for (const row of withPath.years) assert.equal(row.delayedOutOfWork ?? 0, 0, String(row.year));
});

test('with exitPathNoExtraPension, the years the path adds earn no pension; before them, ordinary years', () => {
  const none = { retirementAge: 65, retirementAgeExitPath: 1, exitPathNoExtraPension: 1 };
  const group = { birthYear: 1980, targetRetirementAge: 66 };
  // Target 66, rise 1.37: from 64.63 on, the added years earn nothing; at 62, with target 63, too: before the legal age.
  assert.equal(demographics.paygAccrualYears(group, 2045, 0, none), Infinity);
  assert.equal(demographics.paygAccrualYears({ birthYear: 1980, targetRetirementAge: 63 }, 2042, 0, none), Infinity);
  assert.equal(demographics.paygAccrualYears(group, 2044, 1, none), 43);
  // Without the path the switch does nothing: the frozen-age rule of 1.67 applies.
  assert.equal(demographics.paygAccrualYears(group, 2045, 0, { retirementAge: 65, retirementAgeExitPath: 0, exitPathNoExtraPension: 1 }),
    demographics.paygAccrualYears(group, 2045, 0, { retirementAge: 65, retirementAgeExitPath: 0 }));
});
