// The contrast with other projections («Metodología» › Contraste) is a file written by
// scripts/contrast-external.mjs. It must be the current engine's: same methodology, and the scenario's
// figures it shows are the ones the engine gives today. If this fails, run the script again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { SIMULATION_METHODOLOGY } from '../src/simulation-methodology.js';

const contrast = JSON.parse(readFileSync(new URL('../data/external-contrast.json', import.meta.url), 'utf8'));

test('the contrast is the current engine\'s', () => {
  assert.equal(contrast.methodology, SIMULATION_METHODOLOGY, 'run node scripts/contrast-external.mjs');
  const spending = contrast.longRun.find(r => r.id === 'spending');
  const years = simulate(DEFAULT_CONFIG).years;
  for (const cell of spending.cells) {
    const p = years.find(y => y.year === cell.year);
    assert.ok(Math.abs(p.publicPensionSpendingGDP - cell.sim) < 1e-9, `${cell.year}`);
    assert.ok(Number.isFinite(cell.ar), `${cell.year} has its Ageing Report figure`);
  }
  assert.ok(contrast.airef.rows.every(r => Number.isFinite(r.sim) && Number.isFinite(r.ref)));
});
