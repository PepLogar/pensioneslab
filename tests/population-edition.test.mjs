// The population can be the Ageing Report's own, EUROPOP2023 (europop2023, 0 by default since 24/11/2026).
// With it the engine takes the Ageing Report rows as published, so its employment is the AR's; without it,
// nothing changes (tests/engine-identity.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { AR2024_DEMOGRAPHY as AR } from '../data/official-demography.js';

const ar = year => AR.annual.find(row => row.year === year);
// With the path on, people retire as the Ageing Report expects (since 1.66 the frozen ages take workers away).
// The Ageing Report's own employment: without the AIReF's short run (on by default since 1.69).
const run = simulate({ ...DEFAULT_CONFIG, europop2023: 1, retirementAgeExitPath: 1, airefShortRunEmployment: 0 });
const at = year => run.years.find(row => row.year === year);

test('off by default', () => assert.equal(DEFAULT_CONFIG.europop2023, 0));

test('with EUROPOP2023 and the age path, employment follows the Ageing Report one', () => {
  for (const year of [2030, 2050, 2070]) {
    const sim = at(year).workingPersons / at(2026).workingPersons;
    const official = ar(year).employment20To74Persons / ar(2026).employment20To74Persons;
    assert.ok(Math.abs(sim - official) < 0.005, `${year}: ${sim} vs ${official}`);
  }
});

test('EUROPOP2023 has no long-horizon runs', () => {
  assert.throws(() => simulate({ ...DEFAULT_CONFIG, europop2023: 1 }, { horizonYear: 2080 }), RangeError);
});
