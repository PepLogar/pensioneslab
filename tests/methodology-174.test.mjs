// Methodology 1.74 (docs/DECISIONES.md, 25/11/2026; docs/REVISION-ADVERSARIAL-2026-11-24.md, 1): a captive fund
// earns what the State pays on its bonds, less the financial repression, and the State saves that repression.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { cohortCapitalizationReturns, captiveRepressionRate } from '../src/progressive-transition.js';
import { shortRunInflationRate } from '../src/shared/short-run-employment.js';

// Debt high enough for repression from about 2050 (mixed system, captive style).
const config = validateConfig({ ...DEFAULT_CONFIG, system: 'mixed', capitalizationStyle: 'sovereign-captive' });
const years = simulate(config).years;
const at = y => years.find(r => r.year === y);

test('the captive fund earns the coupon rate of the debt entering the year, less the repression, in real terms', () => {
  for (const y of [2030, 2060]) {
    const p = at(y - 1), inflation = shortRunInflationRate(y, config) ?? config.inflationRate;
    const r = cohortCapitalizationReturns({ age: 40, year: y, config, previousDebtGDP: p.debtGDP, previousStateRate: p.effectiveNominalRate, inflation });
    const gross = (1 + p.effectiveNominalRate - captiveRepressionRate(p.debtGDP)) / (1 + inflation) - 1;
    assert.ok(Math.abs(r.headlineNetReturn - (gross - Math.max(config.feeRate, 0.006))) < 1e-12, String(y));
  }
  assert.ok(captiveRepressionRate(at(2059).debtGDP) > 0, 'repression acts in 2060');
});

test('the State saves the repression on the bonds the fund holds, and no other style saves anything', () => {
  for (const y of [2040, 2060, 2070]) {
    const p = at(y - 1), row = at(y);
    const held = Math.min(p.fundedAssets * p.priceIndex, p.debt * p.priceIndex);
    assert.ok(Math.abs(row.captiveHoldingsNominal - held) <= 1e-6 * held, `${y} holdings`);
    assert.ok(Math.abs(row.captiveInterestSaving * row.priceIndex - held * captiveRepressionRate(p.debtGDP)) <= 1e-6 * held, `${y} saving`);
  }
  assert.ok(at(2070).captiveInterestSaving > 0);
  const balanced = simulate(validateConfig({ ...config, capitalizationStyle: 'balanced-standard' })).years;
  assert.ok(balanced.every(r => (r.captiveInterestSaving ?? 0) === 0));
});
