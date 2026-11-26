// Taxes without a model of their own (property, transactions, other): the reader chooses whether they follow
// nominal GDP (1, the default since 1.67, as the AIReF assumes) or stay in real euros (0, as up to 1.66).
// docs/DECISIONES.md, 22/11/2026 and 24/11/2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { configForStateVersion } from '../src/risk-state-migration.js';

const run = patch => simulate(validateConfig({ ...DEFAULT_CONFIG, ...patch })).years;
const at = (years, y) => years.find(r => r.year === y);

test('by default the taxes without a model follow GDP; the choice holds them in real euros', () => {
  assert.equal(DEFAULT_CONFIG.unmodeledTaxesFollowGDP, 1);
  const held = run({ unmodeledTaxesFollowGDP: 0 }), withGdp = run({});
  const unmodeled = (years, y) => at(years, y).fiscalComposition.remainingTaxes;
  // 2026 is the opening: the same either way.
  assert.equal(unmodeled(withGdp, 2026), unmodeled(held, 2026));
  // Later, the extra is the 2026 amount times the real growth of GDP (the other product taxes follow consumption either way).
  const extra = unmodeled(withGdp, 2070) - unmodeled(held, 2070);
  assert.ok(extra > 0);
  assert.ok(at(withGdp, 2070).debtGDP < at(held, 2070).debtGDP);
});

test('a scenario saved before state 33 moves to the new default; from 33 on, a 0 is kept', () => {
  assert.equal(configForStateVersion({ unmodeledTaxesFollowGDP: 0 }, 32).unmodeledTaxesFollowGDP, 1);
  assert.equal(configForStateVersion({}, 32).unmodeledTaxesFollowGDP, 1);
  assert.equal(configForStateVersion({ unmodeledTaxesFollowGDP: 0 }, 33).unmodeledTaxesFollowGDP, 0);
});
