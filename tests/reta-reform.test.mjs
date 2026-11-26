// The RETA reform still to deploy (retaReform2032, 1 by default since 1.71; an option before): with it, contributions gain
// about 0.38 % of GDP by 2032, in a straight line from 2027, and nothing else on the spending side moves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { RETA_REFORM, retaReformShare } from '../src/current-policy-v7.js';

const off = simulate({ ...DEFAULT_CONFIG, retaReform2032: 0 }), on = simulate({ ...DEFAULT_CONFIG });
const at = (run, year) => run.years.find(row => row.year === year);
const gain = year => 100 * (at(on, year).totalContributions / at(on, year).gdp - at(off, year).totalContributions / at(off, year).gdp);

test('on by default since 1.71; the share ramps from 2027 to 2032', () => {
  assert.equal(DEFAULT_CONFIG.retaReform2032, 1);
  assert.deepEqual([2026, 2029, 2032, 2040].map(retaReformShare), [0, 0.5, 1, 1]);
  assert.equal(RETA_REFORM.pendingGDP, 0.0038);
});

test('with it, contributions gain about 0.38 % of GDP from 2032; pension spending does not move', () => {
  assert.equal(gain(2026), 0);
  assert.ok(Math.abs(gain(2032) - 0.38) < 0.03, `2032: ${gain(2032)}`);
  assert.ok(Math.abs(gain(2029) - 0.19) < 0.03, `2029: ${gain(2029)}`);
  for (const year of [2030, 2050]) assert.equal(at(on, year).publicPensionSpendingGDP, at(off, year).publicPensionSpendingGDP);
  assert.ok(at(on, 2050).debtGDP < at(off, 2050).debtGDP);
});
