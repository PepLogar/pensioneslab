// The verdict and the sustainability light say the same (lote 2): «se rompe» is the first
// of `riskSustainYears` years in a row of high risk (or a pension below the ILO reference),
// with or without the rescue, haircut and default of the narrative.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { computeVerdict, verdictFromMilestones } from '../src/domain/verdict.js';
import { sustainabilityLight } from '../src/domain/sustainability-light.js';
import { riskPathOf } from '../src/views/risk-strip.js';

const SAME = { ok: 'holds', effort: 'weakens', fail: 'breaks' };

test('sustained high risk without haircut nor default breaks in both', () => {
  // The narrative off: no rescue, haircut or default, only the risk layer.
  const v = computeVerdict(simulate({ ...DEFAULT_CONFIG, system: 'payg', narrativeMilestones: 0 }));
  const light = sustainabilityLight(v, riskPathOf(v));
  assert.equal(v.restructuringYear, null);
  assert.equal(v.defaultYear, null);
  assert.ok(Number.isInteger(v.sustainedHighRiskYear));
  assert.equal(v.tone, 'fail');
  assert.equal(v.label, 'Se rompe');
  assert.equal(light.state, 'breaks');
  // «(al filo)» when the verdict says the break year is on the edge (1.71).
  assert.equal(light.headline, `Se rompe en ${v.sustainedHighRiskYear}${v.edge ? ' (al filo)' : ''}`);
});

test('every kind of milestones gives the same state in the verdict and the light', () => {
  const cases = [
    {},
    { firstStressYear: 2035 },
    { firstStressYear: 2035, firstHighRiskYear: 2040 },
    { firstStressYear: 2035, firstHighRiskYear: 2040, firstSustainedHighYear: 2041 },
    { firstSustainedHighYear: 2041, firstBailoutYear: 2042 },
    { firstSustainedHighYear: 2041, firstBailoutYear: 2042, firstRestructuringYear: 2045 },
    { firstSustainedHighYear: 2041, firstDefaultYear: 2043 },
    { pensionInsufficientYear: 2060 }
  ];
  for (const cm of cases) {
    const v = verdictFromMilestones(cm);
    const light = sustainabilityLight(v, []);
    assert.equal(light.state, SAME[v.tone], JSON.stringify(cm));
    assert.equal(light.state, v.state, JSON.stringify(cm));
    assert.equal(v.tone === 'fail', v.firstProblemYear != null, JSON.stringify(cm));
  }
});
