// 1.63: the fund of the reference Mixto progresivo grows as today's pensions end, not by a calendar.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRANSITION_MODES, TRANSITION_MODE_LABELS, basePensionersLeft, cohortTransitionWeights,
  describeTransitionRamp, markBasePensioners, transitionRampEndYear
} from '../src/progressive-transition.js';
import { FLAGSHIP_PROGRESSIVE, describeScenarioStatus } from '../src/shared/scenario-labels.js';
import { configForStateVersion, moveFlagshipToRunoff } from '../src/risk-state-migration.js';
import { DEFAULT_CONFIG, STATE_VERSION } from '../src/shared/default-config.js';
import { EXCEL_PARAMETER_SCHEMA } from '../src/shared/excel-models-io.js';
import { simulate } from '../src/simulation.js';

const flagship = { ...DEFAULT_CONFIG, ...FLAGSHIP_PROGRESSIVE };
const base = { payg: 0.5, ndc: 0, funded: 0.5 };
const young = { birthYear: 2000 }, older = { birthYear: 1960 };
const weights = (item, left, config = flagship) => cohortTransitionWeights(item, 2040, config, base, 2026, left);
const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} vs ${b}`);

test('the fund takes what the pensioners of today leave: nothing while all remain, the goal when none does', () => {
  assert.equal(weights(young, 1).funded, 0);
  close(weights(young, 0.5).funded, 0.25);
  close(weights(young, 0).funded, 0.5);
  for (const left of [1, 0.7, 0.2, 0]) {
    const w = weights(young, left);
    close(w.payg + w.ndc + w.funded, 1);
    assert.ok(w.payg >= 0 && w.ndc >= 0 && w.funded >= 0);
  }
});

test('the age filter stays: past the cutoff a worker sends a reduced share', () => {
  assert.ok(weights(older, 0).funded < 0.5 * 0.5);
  assert.ok(weights(older, 0).funded > 0);
});

test('only those paid a pension in the base year count', () => {
  const cohorts = [{ retired: true, size: 10 }, { retired: false, size: 5 }, { retired: true, size: 30 }];
  assert.equal(markBasePensioners(cohorts), 40);
  cohorts[0].size = 2;
  cohorts[2].size = 8;
  cohorts[1].retired = true;
  cohorts.push({ retired: true, size: 100 });
  assert.equal(basePensionersLeft(cohorts, 40), 0.25);
  assert.equal(basePensionersLeft([], 0), 0);
});

test('there is no calendar in this pace, and the calendars ignore the pensioners', () => {
  assert.deepEqual(weights(young, 0.4, { ...flagship, transitionYears: 10 }), weights(young, 0.4, { ...flagship, transitionYears: 40 }));
  const relay = { ...flagship, transitionMode: 'two-stage-relay' };
  assert.deepEqual(weights(young, 0.1, relay), weights(young, 0.9, relay));
  assert.equal(transitionRampEndYear(flagship), null);
  assert.match(describeTransitionRamp(flagship).hint, /la duración no cambia el resultado/);
  assert.match(describeTransitionRamp(flagship).value, /fallecen/);
});

test('the engine measures them: the fund starts small, keeps growing, ends at the goal, and counts each contribution once', () => {
  const r = simulate(flagship);
  const at = year => r.years.find(p => p.year === year);
  const share = year => at(year).fundedContributions / at(year).retirementContributions;
  assert.ok(share(2030) < 0.06);
  assert.ok(share(2050) > 0.35 && share(2050) < 0.45);
  close(share(2070), 0.5, 0.005);
  let last = 0;
  for (const p of r.years.filter(row => row.year > 2026)) {
    const now = p.fundedContributions / p.retirementContributions;
    assert.ok(now >= last - 0.003, `${p.year}: ${now} after ${last}`);
    last = now;
    close(p.publicContributions + p.fundedContributions, p.totalContributions, 1e-6 * p.totalContributions);
  }
});

test('a saved reference recipe moves to the new pace; rules the reader changed stay', () => {
  const calendar = { ...flagship, transitionMode: 'two-stage-relay', capitalizationStyle: 'lifecycle-ap7' };
  assert.equal(moveFlagshipToRunoff(calendar).transitionMode, 'pension-runoff');
  assert.equal(configForStateVersion(calendar, 30).transitionMode, 'pension-runoff');
  assert.equal(configForStateVersion(calendar, STATE_VERSION).transitionMode, 'two-stage-relay');
  const sixty = { ...calendar, transitionTargetFunded: 0.6 };
  const moved = configForStateVersion(sixty, 29);
  assert.equal(moved.transitionTargetFunded, 0.5);
  assert.equal(moved.transitionMode, 'pension-runoff');
  for (const change of [{ transitionYears: 30 }, { transitionCutoffAge: 50 }, { transitionTargetFunded: 0.4 }, { capitalizationStyle: 'dividend-endowment' }]) {
    assert.equal(configForStateVersion({ ...calendar, ...change }, 30).transitionMode, 'two-stage-relay');
  }
});

test('the reader can pick it, and the Excel sheet can carry it', () => {
  assert.ok(TRANSITION_MODES.includes('pension-runoff'));
  assert.match(TRANSITION_MODE_LABELS['pension-runoff'], /fallecen/);
  assert.ok(EXCEL_PARAMETER_SCHEMA.find(p => p.key === 'transitionMode').allowed.includes('pension-runoff'));
  const same = { ...flagship, transitionYears: 33 };
  assert.ok(!describeScenarioStatus(same, DEFAULT_CONFIG).customItems.some(i => i.id === 'custom-transition'), 'the duration does nothing here');
});
