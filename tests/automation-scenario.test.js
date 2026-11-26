import test from 'node:test';
import assert from 'node:assert/strict';
import { automationAt, AUTOMATION_DEFAULTS } from '../src/automation-scenario.js';
import {
  describeAutomationParadigmEffect,
  AUTOMATION_LABORATORY_PRESETS,
  AUTOMATION_REGIMES
} from '../src/progressive-transition.js';
import { simulate, validateConfig } from '../src/model-current-v10.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12,
  `${actual} differs from ${expected}`);

test('the opening and reference leave hours, payroll and productivity unchanged', () => {
  const stress = { aiAutomationShare: .5, robotAutomationShare: .3,
    automationRedeployment: .2, automationProductivityGain: .4,
    automationWagePassThrough: .25, reemploymentWageLoss: .2 };
  for (const year of [2025, 2026]) {
    const point = automationAt(year, stress);
    assert.equal(point.progress, 0);
    assert.equal(point.automatedShare, 0);
    assert.equal(point.unredeployedShare, 0);
    assert.equal(point.paidWorkShare, 1);
    assert.equal(point.productivityFactor, 1);
    assert.equal(point.wageFactor, 1);
  }
  for (const year of [2026, 2027, 2030, 2070]) {
    const point = automationAt(year);
    assert.equal(point.automatedShare, 0);
    assert.equal(point.paidWorkShare * point.wageFactor, 1);
    assert.equal(point.productivityFactor, 1);
  }
});

test('adoption and productivity ramp to the chosen date then stop accumulating', () => {
  const config = { aiAutomationShare: .2, robotAutomationShare: .1,
    automationTargetYear: 2030, automationRedeployment: .5,
    automationProductivityGain: .2, automationWagePassThrough: .5 };
  const halfway = automationAt(2028, config);
  assert.equal(halfway.progress, .5);
  close(halfway.aiShare, .1);
  close(halfway.robotShare, .05);
  close(halfway.automatedShare, .15);
  close(halfway.redeployedShare, .075);
  close(halfway.unredeployedShare, .075);
  close(halfway.paidWorkShare, .925);
  close(halfway.productivityFactor, 1.1);
  close(halfway.wageFactor, 1.05);
  assert.deepEqual(automationAt(2030, config), automationAt(2070, config));
  const shifted = automationAt(2031, { ...config, automationTargetYear: 2033 }, 2029);
  assert.deepEqual(shifted, halfway);
});

test('automated hours only reduce paid work when they are not redeployed', () => {
  const config = { aiAutomationShare: .4, robotAutomationShare: .2 };
  const full = automationAt(2030, { ...config, automationRedeployment: 1 });
  const partial = automationAt(2030, { ...config, automationRedeployment: .25 });
  close(full.automatedShare, .6);
  close(full.redeployedShare, .6);
  assert.equal(full.unredeployedShare, 0);
  assert.equal(full.paidWorkShare, 1);
  close(partial.redeployedShare, .15);
  close(partial.unredeployedShare, .45);
  close(partial.paidWorkShare, .55);
  // These are hours/FTE shares: no headcount or official unemployment-rate
  // conversion is inferred from a technical automation share.
  close(partial.paidWorkShare + partial.unredeployedShare, 1);
  close(partial.wageFactor, 1);
});

test('reemployment wage loss affects only redeployed paid hours and does not inflate support', () => {
  const config = Object.freeze({ aiAutomationShare: .4, robotAutomationShare: .2,
    automationRedeployment: .25, automationProductivityGain: .2,
    automationWagePassThrough: .5, reemploymentWageLoss: .2, displacementSupportRate: .4 });
  const before = JSON.stringify(config);
  const point = automationAt(2030, config);
  close(point.productivityFactor, 1.2);
  close(point.wageBeforeReemploymentFactor, 1.1);
  close(point.wageFactor, 1.1 * (.4 + .15 * .8) / .55);
  close(point.paidWorkShare * point.wageFactor, 1.1 * (.4 + .15 * .8));
  const withoutWageLoss = automationAt(2030, { ...config, reemploymentWageLoss: 0 });
  close(point.unredeployedShare * point.unemploymentSupportRate,
    withoutWageLoss.unredeployedShare * withoutWageLoss.unemploymentSupportRate);
  assert.equal(JSON.stringify(config), before);
  assert.equal(AUTOMATION_DEFAULTS.aiAutomationShare, 0);
});

test('zero paid hours return no paid average wage without destroying the reference for support', () => {
  const point = automationAt(2030, { aiAutomationShare: 1, automationRedeployment: 0,
    automationProductivityGain: .2, automationWagePassThrough: .5 });
  assert.equal(point.paidWorkShare, 0);
  assert.equal(point.wageFactor, 0);
  assert.equal(point.unredeployedShare, 1);
  close(point.wageBeforeReemploymentFactor, 1.1);
  assert.ok(Object.values(point).every(Number.isFinite));
});

test('invalid inputs fail before producing an apparently valid scenario', () => {
  for (const key of Object.keys(AUTOMATION_DEFAULTS)) {
    assert.throws(() => automationAt(2026, { [key]: NaN }), RangeError);
    assert.throws(() => automationAt(2030, { [key]: Infinity }), RangeError);
  }
  for (const year of [2027.5, NaN, '2030']) assert.throws(() => automationAt(year), RangeError);
  assert.throws(() => automationAt(2030, { automationTargetYear: 2026 }), RangeError);
  assert.throws(() => automationAt(2030, { aiAutomationShare: .7, robotAutomationShare: .4 }), RangeError);
  assert.throws(() => automationAt(2030, { automationRedeployment: 1.1 }), RangeError);
  assert.throws(() => automationAt(2030, { automationProductivityGain: -.1 }), RangeError);
  assert.throws(() => automationAt(2030, { reemploymentWageLoss: -.1 }), RangeError);
  assert.throws(() => automationAt(2030, null), TypeError);
});

test('all 5 automation and Demarquia Planetaria regimes and presets simulate cleanly and differentiate fiscal & dividend outcomes', () => {
  assert.equal(AUTOMATION_REGIMES.length, 5);
  assert.equal(AUTOMATION_LABORATORY_PRESETS.length, 5);

  const neutral = describeAutomationParadigmEffect(2050, validateConfig({}), automationAt(2050, {}));
  assert.equal(neutral.autonomousGdpMultiplier, 1);
  assert.equal(neutral.aiCapitalReturnBoost, 0);
  assert.equal(neutral.fiscalRevenueDelta, 0);
  assert.equal(neutral.fiscalSpendingDelta, 0);

  const presetRuns = new Map();
  for (const preset of AUTOMATION_LABORATORY_PRESETS) {
    const cfg = validateConfig(preset.patch);
    const run = simulate(cfg);
    const p2050 = run.years.find(p => p.year === 2050);
    assert.ok(p2050, `preset ${preset.id} produced point 2050`);
    assert.ok(Number.isFinite(p2050.debtGDP), `preset ${preset.id} has finite debtGDP`);
    presetRuns.set(preset.id, p2050);
  }

  const scissors2050 = presetRuns.get('ai-mortal-scissors');
  const robotOwners2050 = presetRuns.get('ai-robot-owners-ap7');
  const demarquiaPhase1 = presetRuns.get('demarquia-phase1-funcionarios');
  const demarquiaPlanetary = presetRuns.get('demarquia-planetary-au50');

  // Robot owners + Sovereign dividend and Demarquia regimes dramatically improve debt ratio vs Mortal Scissors
  assert.ok(robotOwners2050.debtGDP < scissors2050.debtGDP);
  assert.ok(demarquiaPhase1.debtGDP < scissors2050.debtGDP);
  assert.ok(demarquiaPlanetary.debtGDP < scissors2050.debtGDP);

  // Verify Demarquia Phase 1 (Funcionarios Primero + IUT 50%) and Planetary AU50 metrics
  const p1Effect = describeAutomationParadigmEffect(
    2050,
    validateConfig(AUTOMATION_LABORATORY_PRESETS.find(p => p.id === 'demarquia-phase1-funcionarios').patch),
    automationAt(2050, AUTOMATION_LABORATORY_PRESETS.find(p => p.id === 'demarquia-phase1-funcionarios').patch)
  );
  assert.ok((p1Effect.cap1NetSavings + p1Effect.cap2InvisibleSavings) > 30e9, 'Funcionarios Primero saves >30,000 M€/yr at 75% adoption');
  assert.ok((p1Effect.robotOrIutRevenueBoost + p1Effect.iutAdminSavings) > 20e9, 'IUT 50% + Gran Hoguera Fiscal generates >20,000 M€/yr net boost');

  const au50Effect = describeAutomationParadigmEffect(
    2050,
    validateConfig(AUTOMATION_LABORATORY_PRESETS.find(p => p.id === 'demarquia-planetary-au50').patch),
    automationAt(2050, AUTOMATION_LABORATORY_PRESETS.find(p => p.id === 'demarquia-planetary-au50').patch)
  );
  assert.ok(au50Effect.citizenDividendMonthly >= 1268, 'Planetary Dividend starts at >=1,268 €/mes and scales with AI');
  assert.ok(au50Effect.purchasingPowerMultiplier > 2.0, 'AU50 purchasing power multiplier exceeds 2x');
});
