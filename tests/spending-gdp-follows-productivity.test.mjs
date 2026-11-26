// The GDP that scales public spending (Y^gasto, docs/modelo/01, 1.7) follows the productivity
// deviation, as GDP does, not the wage deviation. With both deviations at 0 nothing changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { shortRunDeviationYears } from '../src/shared/short-run-employment.js';

const run = over => simulate({ ...DEFAULT_CONFIG, ...over }).years.filter(y => y.year >= 2026 && y.year <= 2070);
const close = (actual, expected, label) => assert.ok(Math.abs(actual / expected - 1) < 1e-9, `${label}: ${actual} vs ${expected}`);

test('the spending reference takes productivityGrowth and ignores realWageGrowth', () => {
  const base = run({});
  const productivity = run({ productivityGrowth: 0.01, realWageGrowth: 0 });
  const wages = run({ productivityGrowth: 0, realWageGrowth: 0.01 });
  base.forEach((row, i) => {
    // Without shocks the spending reference is GDP itself.
    close(row.spendingGDP, row.gdp, `base ${row.year}`);
    // With the AIReF short run (the default since 1.69) the deviation compounds from 2031 (1.70).
    close(productivity[i].spendingGDP, row.spendingGDP * 1.01 ** shortRunDeviationYears(row.year, DEFAULT_CONFIG), `productivity ${row.year}`);
    close(wages[i].spendingGDP, row.spendingGDP, `wages ${row.year}`);
  });
});
