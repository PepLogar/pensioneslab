import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveConfig as resolveBaseConfig } from '../src/config-core.js';
import { resolveConfig, DEFAULT_REVALUATION_CONFIG } from '../src/config-current-v2.js';
import { createCurrentPolicyV2 } from '../src/current-policy-v2.js';
import { CURRENT_SPAIN } from '../data/current-spain-v2.js';

// Pure configuration fixture: importing this test does not build or run a model.
const baseDefaults = Object.freeze({system:'payg', mix:Object.freeze({payg:.34, ndc:.33, funded:.33}),
  contributionRate:.25, taxRevenueGDP:.3, pensionBudgetShare:.2, retirementAge:65,
  replacementRate:.77, realWageGrowth:0, entrantGrowth:0, longevityGain:0,
  realReturn:.03, feeRate:.005, realInterestRate:.01, inflationRate:.02,
  marketShock:0, initialDebtGDP:1});
const defaults = Object.freeze({...baseDefaults, ...DEFAULT_REVALUATION_CONFIG});

test('v2 choices validate strictly and old configurations retain the unchanged CPI default', () => {
  const old = {system:'mixed', mix:{payg:.2, ndc:.5, funded:.3}, retirementAge:66};
  const before = structuredClone(old);
  const resolved = resolveConfig(old, defaults);
  const {pensionRevaluationMode, pensionRevaluationRate, ...base} = resolved;
  assert.deepEqual(base, resolveBaseConfig(old, baseDefaults));
  assert.equal(pensionRevaluationMode, 'cpi');
  assert.equal(pensionRevaluationRate, 0);
  assert.deepEqual(resolveConfig(old, baseDefaults), resolved);
  assert.deepEqual(old, before);
  for (const rate of [-.10, 0, .10]) {
    assert.equal(resolveConfig({pensionRevaluationMode:'manual', pensionRevaluationRate:rate}, defaults).pensionRevaluationRate, rate);
  }
  for (const invalid of [
    {pensionRevaluationMode:'other'}, {pensionRevaluationMode:null},
    {pensionRevaluationMode:undefined}, {pensionRevaluationRate:'0.02'},
    {pensionRevaluationRate:null}, {pensionRevaluationRate:NaN},
    {pensionRevaluationRate:Infinity}, {pensionRevaluationRate:-.10001},
    {pensionRevaluationRate:.10001}, {unknown:1}, {[Symbol('unexpected')]:0},
    {mix:{payg:.5, ndc:.5, funded:.5}}, {retirementAge:65.5}
  ]) assert.throws(() => resolveConfig(invalid, defaults));
  let getterReads = 0;
  const unsafe = Object.defineProperty({}, 'pensionRevaluationRate', {get(){getterReads++; return 0;}});
  assert.throws(() => resolveConfig(unsafe, defaults), /accessor/);
  assert.equal(getterReads, 0);
  assert.throws(() => resolveBaseConfig({pensionRevaluationMode:'manual'}, baseDefaults), /Unknown/);
});

test('manual policy freezes, cuts or increases nominal DB amounts while CPI keeps its lag and floor', () => {
  const policy = createCurrentPolicyV2(CURRENT_SPAIN.base);
  const cpi = resolveConfig({}, defaults);
  const cohort = {legacyAnnual:20000, paygAnnual:1000, ndcAnnual:2000, fundedAnnual:3000};
  const before = structuredClone(cohort);
  assert.equal(policy.pensionInPaymentRealIndex(2027, cohort, cpi), 1.039/1.02);
  assert.equal(policy.pensionInPaymentRealIndex(2028, cohort, cpi), 1);
  assert.equal(policy.pensionInPaymentRealIndex(2027, cohort,
    {...cpi, pensionRevaluationRate:-.05}), 1.039/1.02, 'manual rate is inactive in CPI mode');
  for (const rate of [-.05, 0, .05]) {
    const chosen = resolveConfig({pensionRevaluationMode:'manual', pensionRevaluationRate:rate}, defaults);
    assert.equal(policy.pensionInPaymentRealIndex(2026, cohort, chosen), 1, 'base snapshot is not altered');
    assert.equal(policy.pensionInPaymentRealIndex(2027, cohort, chosen), (1+rate)/1.02);
    assert.equal(policy.pensionInPaymentRealIndex(2028, cohort, {...chosen, inflationRate:.04}), (1+rate)/1.04);
  }
  const negativeCpi = createCurrentPolicyV2(CURRENT_SPAIN.base, {priorYearInflationRates:{2026:-.03}});
  assert.equal(negativeCpi.pensionInPaymentRealIndex(2027, cohort, cpi), 1/1.02);
  const manualCut = resolveConfig({pensionRevaluationMode:'manual', pensionRevaluationRate:-.05}, defaults);
  assert.equal(negativeCpi.pensionInPaymentRealIndex(2027, cohort, manualCut), .95/1.02);
  assert.deepEqual(cohort, before, 'policy returns a factor and never mutates pension or annuity contracts');
});

test('cpi-points keeps its gap to prices whatever the inflation; manual stays a fixed nominal rate', () => {
  const policy = createCurrentPolicyV2(CURRENT_SPAIN.base);
  const cohort = {birthYear: 1960};
  const points = {pensionRevaluationMode: 'cpi-points', pensionRevaluationRate: -.01};
  for (const inflationRate of [.02, .03, .05]) {
    // From 2028 the prior-year CPI is the scenario's: the pension loses one point a year against prices.
    assert.ok(Math.abs(policy.pensionInPaymentRealIndex(2030, cohort, {...points, inflationRate}) - (1 + inflationRate - .01) / (1 + inflationRate)) < 1e-12);
  }
  const manual = {pensionRevaluationMode: 'manual', pensionRevaluationRate: .01, inflationRate: .03};
  assert.equal(policy.pensionInPaymentRealIndex(2030, cohort, manual), 1.01 / 1.03);
});
