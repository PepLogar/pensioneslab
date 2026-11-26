import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOSING_CLAUSE_RULE, PUBLISHED_EVALUATIONS, AIREF_2026_IMPACT, FEDEA_2025_CONTRAST,
  windowAverage, grossCeiling, readingImpact, evaluateNet, evaluationYears, rampShare,
  closingClausePath, surchargeRate
} from '../src/shared/closing-clause.js';
import { AR2024_DEMOGRAPHY } from '../data/official-demography.js';

const close = (a, b, tolerance = 1e-12) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);

test('the rule reproduces the published evaluations and the Fedea contrasts', () => {
  for (const row of PUBLISHED_EVALUATIONS) {
    const result = evaluateNet(row);
    close(result.net, row.net);
    assert.equal(result.exceeds, false, `${row.year} complies`);
  }
  for (const row of Object.values(FEDEA_2025_CONTRAST)) {
    const result = evaluateNet(row);
    close(result.net, row.net);
    assert.equal(result.exceeds, true);
    close(result.excess, row.net - CLOSING_CLAUSE_RULE.netCeiling);
  }
  // The strict reading of 2025 fails by the same margin Fedea finds with the AIReF method.
  const strict2025 = evaluateNet({ ...PUBLISHED_EVALUATIONS[0], impactAverage: readingImpact(PUBLISHED_EVALUATIONS[0], 'strict') });
  close(strict2025.net, 0.135);
  assert.ok(strict2025.exceeds);
});

test('the gross limit of the norm is the same condition as net ≤ 13.3 %', () => {
  close(grossCeiling(0.017), 0.15);
  close(grossCeiling(0.014), 0.147);
  close(grossCeiling(0.02), 0.153);
  for (const impactAverage of [0.011, 0.014, 0.016, 0.017, 0.02]) {
    for (const grossAverage of [0.14, 0.146, 0.1458, 0.15, 0.1545, 0.16]) {
      const result = evaluateNet({ grossAverage, impactAverage });
      assert.equal(grossAverage > grossCeiling(impactAverage) + 1e-12, result.exceeds, `${grossAverage} with ${impactAverage}`);
    }
  }
  // Exactly at the limit is not an excess («no supere»).
  assert.equal(evaluateNet({ grossAverage: 0.15, impactAverage: 0.017 }).exceeds, false);
});

test('the AIReF 2026 breakdown: transfers are what the strict reading leaves out', () => {
  const parts = Object.values(AIREF_2026_IMPACT.parts).reduce((sum, value) => sum + value, 0);
  close(parts, 0.015); // rounded parts; the published total is 1.6
  close(AIREF_2026_IMPACT.total, PUBLISHED_EVALUATIONS[1].impactAverage);
  close(AIREF_2026_IMPACT.parts.transfers, PUBLISHED_EVALUATIONS[1].transfers);
  close(readingImpact(PUBLISHED_EVALUATIONS[1], 'strict'), 0.013);
  close(readingImpact(PUBLISHED_EVALUATIONS[1], 'airef'), 0.016);
  assert.throws(() => readingImpact(PUBLISHED_EVALUATIONS[1], 'literal'), RangeError);
});

test('the Ageing Report 2024 without updating averages 15.45 % in 2022–2050 (R)', () => {
  const byYear = new Map(AR2024_DEMOGRAPHY.annual.map(row => [row.year, row.publicPensionSpendingGDPpct / 100]));
  const average = windowAverage(year => byYear.get(year));
  close(average, FEDEA_2025_CONTRAST.literal.grossAverage, 5e-5);
  assert.throws(() => windowAverage(year => byYear.get(year), 2022, 2080), RangeError);
});

test('calendar: 2025, the extra report of 2026, then every three years until 2049', () => {
  assert.deepEqual(evaluationYears(), [2025, 2026, 2028, 2031, 2034, 2037, 2040, 2043, 2046, 2049]);
  assert.deepEqual(evaluationYears(2070), evaluationYears());
  assert.deepEqual(evaluationYears(2030), [2025, 2026, 2028]);
  assert.deepEqual(evaluationYears(2025), [2025]);
});

test('the MEI ramp: two tenths more each year, up to the whole excess', () => {
  [0, 0.2, 0.4, 0.6, 0.8, 1, 1, 1].forEach((share, k) => close(rampShare(k), share, 1e-15));
  close(rampShare(-3), 0);
});

test('without an excess nothing rises, whatever the reading of the published years', () => {
  for (const reading of ['airef', 'strict']) {
    const path = closingClausePath({ gross: () => 0.14, impact: () => 0.016, reading, lastYear: 2070 });
    assert.equal(path.ramps.length, 0);
    for (let year = 2022; year <= 2070; year++) assert.equal(path.surcharge(year), 0);
    // The strict contrast of 2025 exceeds, but published evaluations never start a ramp.
    const published = path.evaluations.filter(row => row.published);
    assert.deepEqual(published.map(row => row.year), [2025, 2026]);
    assert.ok(published.every(row => !row.startsRamp));
    if (reading === 'strict') assert.ok(published[0].exceeds);
  }
});

test('an excess starts a ramp the next year; later evaluations count it in full and add only what remains', () => {
  const path = closingClausePath({ gross: () => 0.15, impact: () => 0.016, lastYear: 2070 });
  const [first, second] = path.evaluations.filter(row => !row.published);
  assert.equal(first.year, 2028);
  close(first.excess, 0.001);
  assert.equal(path.surcharge(2028), 0);
  close(path.surcharge(2029), 0.0002);
  close(path.surcharge(2030), 0.0004);
  // 2031 counts the 2028 ramp to its end: (0.2 + 0.4 + 0.6 + 0.8 + 18) tenths over 29 years.
  close(second.scheduledSurcharge, 0.001 * 20 / 29);
  close(second.excess, 0.001 * 9 / 29);
  close(path.surcharge(2032), 0.0008 + 0.2 * second.excess);
  // Never falls while the MEI lasts, reaches near 1.6 times the first excess, and ends with the MEI.
  for (let year = 2023; year <= 2050; year++) assert.ok(path.surcharge(year) >= path.surcharge(year - 1) - 1e-15, `${year}`);
  assert.ok(path.surcharge(2050) > first.excess * 1.5 && path.surcharge(2050) < first.excess * 1.7);
  assert.equal(path.surcharge(2051), 0);
  assert.equal(path.surcharge(2070), 0);
  assert.equal(path.ramps.length, 8);
});

test('the strict reading triggers earlier in the simulated years and asks for more', () => {
  const run = reading => closingClausePath({ gross: () => 0.148, impact: () => 0.016, reading, lastYear: 2060 });
  const airef = run('airef'), strict = run('strict');
  assert.equal(airef.ramps.length, 0);
  close(strict.evaluations.find(row => row.year === 2028).excess, 0.002);
  assert.ok(strict.surcharge(2050) > 0);
});

test('identity: the surcharge rate times the MEI base is the surcharge in GDP', () => {
  const gdp = 1.6e12, meiBase = 0.62e12, surcharge = 0.0016;
  close(surchargeRate(surcharge, gdp, meiBase) * meiBase, surcharge * gdp, 1e-3);
  assert.throws(() => surchargeRate(surcharge, gdp, 0), RangeError);
  assert.throws(() => closingClausePath({ gross: () => 0.15, impact: () => 0.016, lastYear: 2021 }), RangeError);
  assert.throws(() => closingClausePath({ gross: () => 0.15, impact: () => 0.016, reading: 'literal', lastYear: 2050 }), RangeError);
});
