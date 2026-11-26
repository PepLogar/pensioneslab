// Batch 3 of the adversarial review (docs/REVISION-ADVERSARIAL-2026-11-24.md; docs/DECISIONES.md, 24/11/2026):
// the method decisions of the author.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { computeVerdict, EDGE_GAP } from '../src/domain/verdict.js';
import { describeRiskPath } from '../src/shared/sovereign-risk.js';
import { configForStateVersion } from '../src/risk-state-migration.js';

const run = patch => simulate(validateConfig({ ...DEFAULT_CONFIG, ...patch }));
const at = (result, year) => result.years.find(row => row.year === year);

test('the verdict says when the break year is on the edge (55)', () => {
  const result = run({});
  const verdict = computeVerdict(result), risk = describeRiskPath(result.years);
  const miss = risk.nearMiss;
  assert.ok(miss && miss.year < risk.firstHighYear, 'a near miss before the first high year');
  if (miss.gap < EDGE_GAP) {
    assert.equal(verdict.edge.year, miss.year);
    assert.match(verdict.sentence, /al filo/);
  } else {
    assert.equal(verdict.edge, null);
    assert.doesNotMatch(verdict.sentence, /al filo/);
  }
  // A scenario that holds has no break, so nothing on the edge.
  const holds = computeVerdict(run({ contributionRate: DEFAULT_CONFIG.contributionRate + 0.06 }));
  if (holds.firstProblemYear == null) assert.equal(holds.edge, null);
});

test('the pending RETA reform is on by default since 1.71, and older scenarios move to it (57)', () => {
  assert.equal(DEFAULT_CONFIG.retaReform2032, 1);
  assert.equal(configForStateVersion({ ...DEFAULT_CONFIG, retaReform2032: 0 }, 35).retaReform2032, 1);
  assert.equal(configForStateVersion({ ...DEFAULT_CONFIG, retaReform2032: 0 }, 36).retaReform2032, 0);
});

test('a captive fund loses on all its holdings in a haircut, whatever share the row says (C1)', () => {
  const base = { system: 'mixed', transitionMode: 'linear-ramp' };
  const cut = share => [{ year: 2045, haircut: 0.3, termYears: 20, nominalRate: 0.03, fundedSovereignShare: share }];
  const loss = (style, share) => at(run({ ...base, capitalizationStyle: style, debtRestructurings: cut(share) }), 2045).fundedHaircutLoss;
  assert.equal(loss('sovereign-captive', 0.15), loss('sovereign-captive', 1));
  assert.ok(loss('balanced-standard', 1) > loss('balanced-standard', 0.15) * 2, 'other styles keep the row\'s share');
});
