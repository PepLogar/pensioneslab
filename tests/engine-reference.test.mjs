// The engine reference: with the default configuration, the four
// main systems give the same figures, year by year from 2026 to 2070, as the reference saved for this methodology
// (tests/fixtures/engine-reference-1.79.0.json, ten significant digits; up to 1.65.0 they were pensiones_lab_2 1.64.0's,
// commit 5643450). A change of engine must change this file
// on purpose, with its reason in docs/DECISIONES.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { comparisonConfigs } from '../src/shared/scenario-labels.js';
import { SIMULATION_METHODOLOGY } from '../src/simulation-methodology.js';

const reference = JSON.parse(readFileSync(new URL('./fixtures/engine-reference-1.79.0.json', import.meta.url), 'utf8'));
const PICK = {
  debtGDP: r => r.debtGDP, pensionGapGDP: r => r.pensionGapGDP, averagePensionAnnual: r => r.averagePensionAnnual,
  replacementRate: r => r.replacementRate, fundedAssetsGDP: r => r.fundedAssetsGDP, publicPensionSpendingGDP: r => r.publicPensionSpendingGDP,
  interestGDP: r => r.interest / r.gdp * 100
};
const round = v => Number.isFinite(v) ? Number(v.toPrecision(10)) : null;

test('the methodology is the one of the reference', () => {
  assert.equal(SIMULATION_METHODOLOGY, reference.methodology);
});

const entries = comparisonConfigs(DEFAULT_CONFIG, { includeRetro1985: false, includeMixedGradual: true });
for (const [key, saved] of Object.entries(reference.systems)) {
  test(`${saved.label}: the same figures as the 1.79.0 reference, 2026–2070`, () => {
    const entry = entries.find(e => e.key === key);
    assert.ok(entry, `system ${key} exists`);
    const years = simulate(entry.config).years.filter(y => y.year >= 2026 && y.year <= 2070);
    assert.equal(years.length, saved.years.length);
    years.forEach((row, i) => {
      const want = saved.years[i];
      assert.equal(row.year, want.year);
      for (const field of reference.fields) assert.equal(round(PICK[field](row)), want[field], `${key} ${row.year} ${field}`);
    });
  });
}
