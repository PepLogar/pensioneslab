import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { describeRiskPath } from '../src/shared/sovereign-risk.js';
import { describeNarrative, describePensionAdequacy, verdictOptions, NARRATIVE_DEFAULTS } from '../src/shared/crisis-narrative.js';
import { computeVerdict } from '../src/domain/verdict.js';
import { SIMULATION_METHODOLOGY } from '../src/simulation-methodology.js';

const payg = simulate({ ...DEFAULT_CONFIG, system: 'payg' });
const risk = describeRiskPath(payg.years);

test('phase 2: new config keys with their defaults, ranges and order; old saved configs still load', () => {
  assert.match(SIMULATION_METHODOLOGY, /^(common-fund-1.(6[456789]|7\d)|pension-runoff-1.63|mixed-progressive-1.62|risk-s0-1.36|laffer-1.37|cut-multiplier-1.38|ndc-options-1.39|payable-brake-1.40|cofog-stress-1.41|points-rescue-1.42|closing-clause-1.46|issuance-ladder-1.51|laffer-coherent-1.53|laffer-full-1.54|europop2025-1.55|laffer-vat-1.56|laffer-consumption-1.58|retirement-delay-1.59|public-capital-1.60)/);
  assert.deepEqual([DEFAULT_CONFIG.riskHighIndex, DEFAULT_CONFIG.riskModerateIndex, DEFAULT_CONFIG.riskSustainYears, DEFAULT_CONFIG.riskStabilisationYears], [0.36, 0.29, 2, 5]);
  assert.deepEqual([DEFAULT_CONFIG.narrativeMilestones, DEFAULT_CONFIG.narrativeBailoutYears, DEFAULT_CONFIG.narrativeRestructuringYears, DEFAULT_CONFIG.narrativeNoRescue], [1, 2, 3, 0]);
  assert.equal(DEFAULT_CONFIG.pensionAdequacyFloor, 0.40);
  assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, riskModerateIndex: 0.5 }), /riskModerateIndex/);
  assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, narrativeBailoutYears: 1.5 }), /narrativeBailoutYears/);
  // A configuration saved before 1.36 has none of the new keys: it takes the defaults.
  const old = { ...DEFAULT_CONFIG };
  for (const key of ['riskHighIndex', 'riskModerateIndex', 'riskSustainYears', 'riskStabilisationYears', 'narrativeMilestones', 'narrativeBailoutYears', 'narrativeRestructuringYears', 'narrativeNoRescue', 'pensionAdequacyFloor']) delete old[key];
  assert.deepEqual(validateConfig(old), validateConfig(DEFAULT_CONFIG));
});

test('the verdict settings never change the engine', () => {
  const other = simulate({ ...DEFAULT_CONFIG, system: 'payg', riskHighIndex: 0.5, riskModerateIndex: 0.4, narrativeNoRescue: 1, pensionAdequacyFloor: 0.45, crisisFundBackingWeight: 0.5 });
  assert.deepEqual(other.years, payg.years);
});

test('narrative: rescue after sustained high risk with the debt not stabilising, then haircut; order and switches', () => {
  const n = describeNarrative(risk);
  // Since 1.78 (retirement coverage by generation): sustained high risk from 2050; 1.77 gave 2049, 1.76 2054, 1.71–1.75 2052, 1.69–1.70 2050, 1.68 2047, 1.67 2042.
  assert.equal(risk.firstSustainedHighYear, 2050);
  assert.equal(n.bailoutYear, 2051);
  assert.equal(n.restructuringYear, 2054);
  assert.equal(n.defaultYear, null);
  assert.ok(risk.firstSustainedHighYear < n.bailoutYear && n.bailoutYear < n.restructuringYear, 'the narrative never comes before the risk');
  assert.match(n.bailoutReason, /^Supuesto del simulador/);
  const off = describeNarrative(risk, { enabled: false });
  assert.deepEqual([off.bailoutYear, off.restructuringYear, off.defaultYear], [null, null, null]);
  assert.ok(describeNarrative(risk, { bailoutYears: 4 }).bailoutYear > n.bailoutYear, 'more years in a row delay the rescue');
  assert.ok(describeNarrative(risk, { restructuringYears: 6 }).restructuringYear > n.restructuringYear);
  const hard = describeNarrative(risk, { noRescue: true });
  assert.deepEqual([hard.bailoutYear, hard.defaultYear, hard.restructuringYear], [2051, 2052, null]);
  assert.equal(describeNarrative(risk, { noRescue: true }, { hasActiveRescue: true }).defaultYear, null, 'a rescue the user enacts prevents the default');
  assert.equal(NARRATIVE_DEFAULTS.bailoutYears, 2);
});

test('pension adequacy is apart from the debt, against the ILO reference, and counts pension cuts', () => {
  const ndc = simulate({ ...DEFAULT_CONFIG, system: 'ndc' });
  const a = describePensionAdequacy(ndc.years);
  assert.equal(a.floor, 0.40);
  // 1.77: 2067 (2066 up to 1.76), with the disability pensioners who become old-age pensioners at 65.
  assert.equal(a.firstInsufficientYear, 2067);
  assert.match(a.reason, /Convenio 102 de la OIT/);
  assert.ok(describePensionAdequacy(ndc.years, { floor: 0.45 }).firstInsufficientYear < 2067, 'a higher floor is crossed earlier');
  const v = computeVerdict(ndc);
  // The first problem is whichever comes first, and the verdict names it. In the notional accounts the debt sits on
  // the edge (in 2066 its needs stay 0.014 points of GDP under the threshold), so the order is not fixed here,
  // only the relation (docs/REVISION-ADVERSARIAL-2026-11-24.md, 32).
  assert.equal(v.pensionInsufficientYear, 2067);
  const debtYear = v.sustainedHighRiskYear ?? Infinity;
  assert.equal(v.firstProblemYear, Math.min(v.pensionInsufficientYear, debtYear));
  if (v.pensionInsufficientYear < debtYear) assert.equal(v.failure, 'pension');
  else assert.notEqual(v.failure, 'pension');
  const cut = simulate({ ...DEFAULT_CONFIG, system: 'payg', paymentAdjustments: [{ year: 2030, publicPensionCut: 0.4, otherSpendingCut: 0 }] });
  const c = describePensionAdequacy(cut.years).path.find(p => p.year === 2030);
  const base = describePensionAdequacy(payg.years).path.find(p => p.year === 2030);
  assert.ok(c.rate < base.rate * 0.7, 'a cut in payment lowers the measured adequacy');
});

test('a pension cut counts once: the adequacy rate is the engine replacement rate, already after the cut', () => {
  const cut = simulate({ ...DEFAULT_CONFIG, system: 'payg', paymentAdjustments: [{ year: 2027, publicPensionCut: 0.2, otherSpendingCut: 0 }] });
  describePensionAdequacy(cut.years).path.forEach((p, k) => assert.equal(p.rate, cut.years[k].replacementRate, String(p.year)));
});

test('the options come from the configuration, and the stations carry risk and adequacy', () => {
  const o = verdictOptions({ ...DEFAULT_CONFIG, riskSustainYears: 3, narrativeNoRescue: 1, pensionAdequacyFloor: 0.45 });
  assert.equal(o.risk.sustainYears, 3);
  assert.equal(o.narrative.noRescue, true);
  assert.equal(o.pension.floor, 0.45);
  assert.equal(verdictOptions({}).risk.highIndex, undefined, 'missing keys fall back to the module defaults');
  const v = computeVerdict(payg);
  // The station of the first year of sustained high risk (not a fixed year: it moves with the defaults).
  const st = v.journey.stations.find(s => s.year === v.sustainedHighRiskYear);
  assert.equal(st.risk.level, 'high');
  assert.equal(st.pensionAdequacy.adequate, true);
  assert.equal(v.journey.stations[0].risk.index, null, 'the opening year is not scored');
  assert.equal(computeVerdict(simulate({ ...DEFAULT_CONFIG, system: 'payg', riskSustainYears: 4 })).firstProblemYear >= 2035, true);
});
