import test from 'node:test';
import assert from 'node:assert/strict';
import { cohortTransitionWeights, transitionRampEndYear, describeTransitionCutoff } from '../src/progressive-transition.js';

const base = { payg: 1, ndc: 0, funded: 0 };
const young = { birthYear: 2000 };
const senior = { birthYear: 1970 }; // 56 in 2026, above the 48 cutoff

// The labels must describe the engine, not a separate calendar.
test('ramp end year equals the first year a young cohort reaches the target', () => {
  for (const transitionMode of ['two-stage-relay', 'baby-boom-shield', 'cohort-ramp', 'linear-ramp', 'salary-cap-shield']) {
    for (const [transitionYears, transitionRelaySchedule] of [[8, 'announced'], [20, 'announced'], [24, 'announced'], [40, 'announced'], [24, 'legacy-extended'], [20, 'legacy-extended']]) {
      const config = { system: 'mixed', transitionMode, transitionYears, transitionRelaySchedule, transitionCutoffAge: 48, transitionTargetFunded: 0.6 };
      let first = null;
      for (let year = 2027; year <= 2080 && first === null; year++) {
        if (cohortTransitionWeights(young, year, config, base).funded >= 0.6 - 1e-12) first = year;
      }
      assert.equal(transitionRampEndYear(config), first, `${transitionMode} · ${transitionYears} · ${transitionRelaySchedule}`);
    }
  }
  assert.equal(transitionRampEndYear({ transitionMode: 'two-stage-relay', transitionYears: 24 }), 2050);
  assert.equal(transitionRampEndYear({ transitionMode: 'two-stage-relay', transitionYears: 24, transitionRelaySchedule: 'legacy-extended' }), 2058);
  assert.equal(transitionRampEndYear({ transitionMode: 'entrants-only', transitionYears: 24 }), null);
});

test('cutoff label matches whether older cohorts still send contributions to the fund', () => {
  for (const [transitionMode, capitalizationStyle] of [['two-stage-relay', 'lifecycle-ap7'], ['cohort-ramp', 'balanced-standard'], ['entrants-only', 'balanced-standard'], ['two-stage-relay', 'sovereign-captive']]) {
    const config = { system: 'mixed', transitionMode, capitalizationStyle, transitionYears: 24, transitionCutoffAge: 48, transitionTargetFunded: 0.6 };
    const funded = cohortTransitionWeights(senior, 2030, config, base).funded;
    const label = describeTransitionCutoff(config).value;
    assert.equal(label.includes('sin aportación'), funded === 0, `${transitionMode} · ${capitalizationStyle}`);
    assert.equal(label.includes('reducida'), funded > 0);
  }
});
