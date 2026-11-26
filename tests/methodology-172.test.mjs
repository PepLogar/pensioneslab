// Methodology 1.72 (docs/DECISIONES.md, 25/11/2026; docs/REVISION-ADVERSARIAL-2026-11-24.md, 3, 4, 5 and 8):
// pensions in payment follow last year's inflation, the notional brake compares with what is owed, a haircut
// reaches the preserved capital, and the allocation residual measures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { SHORT_RUN_EMPLOYMENT } from '../src/shared/short-run-employment.js';
import { ndcBrakeFactor } from '../src/shared/ndc-options.js';
import { payablePensionFactor } from '../src/shared/payable-pension.js';
import { comparisonConfigs } from '../src/shared/scenario-labels.js';

const at = (years, y) => years.find(r => r.year === y);

test('pensions in payment are revalued with last year\'s inflation of the path (8)', () => {
  const years = simulate(validateConfig({ ...DEFAULT_CONFIG, inflationRate: 0.03 })).years;
  for (const y of [2028, 2029, 2030, 2031]) {
    assert.ok(Math.abs(at(years, y).pensionNominalRevaluation - SHORT_RUN_EMPLOYMENT.inflation[y - 1]) < 1e-12, `${y}`);
  }
  assert.ok(Math.abs(at(years, 2032).pensionNominalRevaluation - 0.03) < 1e-12, 'from 2032, the scenario\'s inflation');
});

test('the notional brake compares the contributions with what is owed, not with what a cut lets pay (4)', () => {
  const config = { ndcBalancing: 1 };
  const owed = { notionalCredits: 90, ndcBenefits: 100 };
  const cut = { notionalCredits: 90, ndcBenefits: 95, paymentAdjustment: { scheduledNdcBenefits: 100 } };
  assert.equal(ndcBrakeFactor(cut, config), ndcBrakeFactor(owed, config));
  assert.ok(ndcBrakeFactor(cut, config) < 1);
});

test('a haircut reaches the preserved capital as it reaches the fund (5)', () => {
  const years = simulate(validateConfig({ ...DEFAULT_CONFIG, system: 'mixed', transitionMode: 'linear-ramp', capitalizationStyle: 'sovereign-captive',
    debtRestructurings: [{ year: 2045, haircut: 0.3, termYears: 20, nominalRate: 0.03, fundedSovereignShare: 1 }] })).years;
  const ratio = y => at(years, y).preservedFundedAssets / at(years, y).fundedAssets;
  assert.ok(at(years, 2045).fundedHaircutLoss > 0);
  assert.ok(Math.abs(ratio(2045) - ratio(2044)) < 0.01, `${ratio(2044)} → ${ratio(2045)}`);
});

test('the allocation residual measures: the cohorts\' three destinations add up to the payroll contribution (3)', () => {
  for (const entry of comparisonConfigs(DEFAULT_CONFIG)) {
    for (const p of simulate(validateConfig(entry.config)).years.slice(1)) {
      assert.ok(Math.abs(p.contributionAllocationResidual) <= 1e-9 * p.retirementContributions, `${entry.key} ${p.year}`);
      assert.ok(Math.abs(p.effectivePaygWeight + p.effectiveNdcWeight + p.effectiveFundedWeight - 1) < 1e-9, `${entry.key} ${p.year} weights`);
    }
  }
});

test('the payable pension loses each frozen year\'s own inflation (AIReF\'s until 2030)', () => {
  const config = { ...DEFAULT_CONFIG, inflationRate: 0.03, payablePensionFreezeYears: 4 };
  const expected = 1 / [2028, 2029, 2030].reduce((p, y) => p * (1 + SHORT_RUN_EMPLOYMENT.inflation[y]), 1) / 1.03;
  assert.ok(Math.abs(payablePensionFactor(2032, { bailoutYear: 2028 }, config) - expected) < 1e-12);
  assert.ok(Math.abs(payablePensionFactor(2060, { bailoutYear: 2050 }, config) - 1.03 ** -4) < 1e-12);
});
