// Batch 1 of the adversarial review (docs/REVISION-ADVERSARIAL-2026-11-24.md; docs/DECISIONES.md, 24/11/2026):
// each fix with the check that would have caught it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig, STATE_VERSION } from '../src/shared/default-config.js';
import { libraryEntry } from '../src/shared/scenario-library.js';
import { configForStateVersion, OLDER_STATE_VERSIONS } from '../src/risk-state-migration.js';
import { simulationKey } from '../src/shared/sim-key.js';
import { simulateRetrospective1985 } from '../src/retrospective-model-1985.js';
import { REFERENCE_PROFILES, profileConfig } from '../src/domain/reference-profiles.js';
import { SHORT_RUN_EMPLOYMENT } from '../src/shared/short-run-employment.js';
import { EXCEL_PARAMETER_SCHEMA } from '../src/shared/excel-models-io.js';
import { CAPITALIZATION_STYLES } from '../src/progressive-transition.js';

const at = (result, year) => result.years.find(row => row.year === year);

test('«Mis escenarios» migrates as the one chain does, for every state (14)', () => {
  const old = { ...DEFAULT_CONFIG, unmodeledTaxesFollowGDP: 0, retirementAgeExitPath: 0, airefShortRunEmployment: 0 };
  for (const version of [...OLDER_STATE_VERSIONS.filter(v => v >= 23), STATE_VERSION]) {
    const entry = libraryEntry({ id: 1, name: 'x', stateVersion: version, config: old });
    assert.deepEqual(entry.config, validateConfig(configForStateVersion(old, version)), `state ${version}`);
    assert.equal(entry.stateVersion, STATE_VERSION);
  }
  // An entry without a stamp is from state 23 or before (stamped since 24).
  assert.deepEqual(libraryEntry({ id: 1, name: 'x', config: old }).config, validateConfig(configForStateVersion(old, 23)));
});

test('the cache key keeps what changes a PAYG or NDC run (13, 30)', () => {
  const extra = { ...DEFAULT_CONFIG, system: 'payg', fundedExtraContribution: 0.03 };
  assert.notEqual(simulationKey({ ...extra, capitalizationStyle: 'balanced-standard' }), simulationKey({ ...extra, capitalizationStyle: 'common-fund' }));
  assert.notEqual(simulationKey({ ...DEFAULT_CONFIG, system: 'payg' }), simulationKey({ ...DEFAULT_CONFIG, system: 'payg', transitionMode: 'pension-runoff' }));
  // What it still drops does not change the run: the mix of a PAYG contribution.
  const a = { ...DEFAULT_CONFIG, system: 'payg' }, b = { ...a, mix: { payg: 0.5, ndc: 0.25, funded: 0.25 } };
  assert.equal(simulationKey(a), simulationKey(b));
  assert.deepEqual(simulate(b).years, simulate(a).years);
});

test('the 1985 counterfactual runs without the AIReF short run, whatever the setting (6, 18)', () => {
  const on = simulateRetrospective1985({ ...DEFAULT_CONFIG, airefShortRunEmployment: 1 });
  const off = simulateRetrospective1985({ ...DEFAULT_CONFIG, airefShortRunEmployment: 0 });
  assert.equal(at(on, 2050).debtGDP, at(off, 2050).debtGDP);
});

test('the maximum contribution base follows the prior year\'s AIReF inflation in 2028–2031 (7)', () => {
  const run = simulate(validateConfig(DEFAULT_CONFIG));
  const max = year => at(run, year).contributionBaseDrivers.maximumAnnualNominal;
  // Each year: the prior year's inflation plus the same legal extra points.
  const extra = max(2028) / max(2027) - 1 - SHORT_RUN_EMPLOYMENT.inflation[2027];
  assert.ok(extra >= 0 && extra < 0.02, `extra ${extra}`);
  for (const year of [2029, 2030, 2031]) {
    const growth = max(year) / max(year - 1) - 1;
    assert.ok(Math.abs(growth - SHORT_RUN_EMPLOYMENT.inflation[year - 1] - extra) < 1e-12, `${year}`);
  }
  // A user's own inflation acts only from 2031 for prices, so from the ceiling of 2032.
  const own = simulate(validateConfig({ ...DEFAULT_CONFIG, inflationRate: 0.03 }));
  const ownMax = year => at(own, year).contributionBaseDrivers.maximumAnnualNominal;
  assert.equal(ownMax(2031), max(2031));
  assert.ok(Math.abs(ownMax(2032) / ownMax(2031) - 1 - 0.03 - extra) < 1e-12, '2032');
});

test('the AIReF profile reproduces its real GDP 2027–2030: its productivity cut starts in 2031 (9)', () => {
  const profile = REFERENCE_PROFILES.find(p => p.id === 'ref:airef-2026');
  const run = simulate(profileConfig(profile));
  for (const year of [2027, 2028, 2029, 2030]) {
    const growth = 100 * (at(run, year).gdp / at(run, year - 1).gdp - 1);
    assert.ok(Math.abs(growth - SHORT_RUN_EMPLOYMENT.target.realGDP[year]) < 0.1, `${year}: ${growth}`);
  }
});

test('the Excel sheet accepts exactly the engine\'s portfolio styles (2)', () => {
  const spec = EXCEL_PARAMETER_SCHEMA.find(p => p.key === 'capitalizationStyle');
  assert.deepEqual([...spec.allowed].sort(), [...CAPITALIZATION_STYLES].sort());
});
