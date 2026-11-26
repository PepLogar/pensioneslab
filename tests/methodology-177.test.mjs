// Methodology 1.77: disability pensioners who turn 65 become old-age pensioners (data/disability-retirement-2026.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { SPENDING_BEFORE_BASE } from '../src/shared/closing-clause.js';
import { referenceProfile, profileConfig } from '../src/domain/reference-profiles.js';
import { DISABILITY_RETIREMENT_2026 as D, disabilityRate60to64 } from '../data/disability-retirement-2026.js';
import { AR2024_DEMOGRAPHY } from '../data/official-demography.js';

const run = simulate(validateConfig(DEFAULT_CONFIG));
const at = (r, year) => r.years.find(y => y.year === year);

test('a fifth of the 2026 disability pensioners aged 60–64 enter retirement each year, from 2027', () => {
  assert.equal(at(run, 2026).reclassifiedRetirementEntries ?? 0, 0);
  const first = at(run, 2027).reclassifiedRetirementEntries;
  const expected = (D.stock60to64.M + D.stock60to64.F) / 5 * disabilityRate60to64(2027) / disabilityRate60to64(2026);
  assert.ok(Math.abs(first / expected - 1) < 0.03, `${first} vs ${expected}`);
  for (const y of [2030, 2040, 2050, 2070]) assert.ok(at(run, y).reclassifiedRetirementEntries > 50000, String(y));
});

test('they are counted as retirees and paid as protected public pensions; the other pensions do not change', () => {
  for (const y of [2030, 2050]) {
    const r = at(run, y);
    assert.ok(Math.abs(r.publicRetirementBenefits - (r.legacyBenefits + r.paygBenefits + r.ndcBenefits)) < 1e-3 * r.publicRetirementBenefits);
    assert.ok(Math.abs(r.otherPensionBenefits / r.gdp * 100 - (y === 2030 ? 3.40 : 3.11)) < 0.02, `${y} other pensions`);
  }
  assert.ok(at(run, 2050).retirees > 12.5e6);
});

test('with the Ageing Report\'s assumptions it follows its updated spending to 2040', () => {
  const r = simulate(validateConfig(profileConfig(referenceProfile('ref:ageing-report-2024'))));
  const scale = 100 * SPENDING_BEFORE_BASE[2025] / AR2024_DEMOGRAPHY.annual.find(row => row.year === 2025).publicPensionSpendingGDPpct;
  for (const y of [2030, 2035, 2040]) {
    const ar = AR2024_DEMOGRAPHY.annual.find(row => row.year === y).publicPensionSpendingGDPpct * scale;
    assert.ok(Math.abs(at(r, y).publicPensionSpendingGDP - ar) < 0.25, `${y}: ${at(r, y).publicPensionSpendingGDP} vs ${ar}`);
  }
});
