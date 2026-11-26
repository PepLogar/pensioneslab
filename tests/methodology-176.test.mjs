// Methodology 1.76: the engine fixes of the adversarial review of 25/11 (docs/REVISION-ADVERSARIAL-2026-11-25.md, 1-8).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { comparisonConfigs } from '../src/shared/scenario-labels.js';
import { computeVerdict } from '../src/domain/verdict.js';
import { cohortCapitalizationReturns } from '../src/progressive-transition.js';
import { DEBT_POLICY_2026, OPENING_BILLS_2027_PERCENT } from '../data/debt-policy-2026.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const run = c => simulate(validateConfig({ ...DEFAULT_CONFIG, ...c }));
const at = (r, year) => r.years.find(y => y.year === year);
const systems = comparisonConfigs(DEFAULT_CONFIG, { includeMixedGradual: true });

test('1 · cohorts die at age + 0,5, the mortality of their two birth years; period measures keep the exact age', () => {
  const page = read('src/current-cohorts-v10.js');
  assert.match(page, /const COHORT_AGE_SHIFT = 0\.5;/);
  assert.match(page, /halfYearSurvival: cohortSurvival, annuityFactor: cohortAnnuityFactor,/);
  assert.match(read('src/retrospective-model-1985.js'), /year, age \+ 0\.5 - longevityGain/);
});

test('2 · no 2027 bulge: new pensions close to the next year\'s and to the observed pace, same 2026 workers', () => {
  const r = run({});
  const y26 = at(r, 2026), y27 = at(r, 2027), y28 = at(r, 2028);
  assert.ok(y27.newRetirementAwards < 1.05 * y28.newRetirementAwards, `${y27.newRetirementAwards} vs ${y28.newRetirementAwards}`);
  assert.ok(Math.abs(y27.newRetirementAwards / 371000 - 1) < 0.1, String(y27.newRetirementAwards));
  assert.ok(Math.abs(y26.workers / 22.44e6 - 1) < 0.005, String(y26.workers));
});

test('3 · a captive fund pays retirees what the State pays, less the fee', () => {
  const config = { ...DEFAULT_CONFIG, capitalizationStyle: 'sovereign-captive' };
  const r = cohortCapitalizationReturns({ config, year: 2050, previousDebtGDP: 250, previousStateRate: 0.04, inflation: 0.02 });
  assert.ok(r.captiveRepressionRate > 0);
  assert.equal(r.retirementYieldNet, r.headlineNetReturn);
});

test('4 · a haircut takes exactly its share of a captive fund, whatever the discount rate', () => {
  const losses = [0.02, 0.10].map(rate => {
    const r = run({ system: 'mixed', capitalizationStyle: 'sovereign-captive',
      debtRestructurings: [{ year: 2040, haircut: 0.3, termYears: 20, nominalRate: 0.03, fundedSovereignShare: 1, creditorDiscountRate: rate }] });
    const row = at(r, 2040);
    return row.fundedHaircutLoss / row.fundedAssetsStart;
  });
  for (const share of losses) assert.ok(Math.abs(share - 0.3) < 1e-6, String(share));
});

test('5 · annuities keep their award rate: a captive fund does not run dry after a falling-rate haircut', () => {
  const r = run({ system: 'funded', capitalizationStyle: 'sovereign-captive',
    debtRestructurings: [{ year: 2045, haircut: 0.3, termYears: 20, nominalRate: 0, fundedSovereignShare: 1, creditorDiscountRate: 0.03 }] });
  const due = r.years.reduce((s, y) => s + y.fundedBenefits, 0);
  const unpaid = r.years.reduce((s, y) => s + (y.fundedAnnuityShortfall ?? 0), 0);
  assert.ok(unpaid / due < 1e-6, `${unpaid} of ${due}`);
});

test('6 · «sin rescate» with a measure of the reader: the premium ends at the rescue the verdict reports', () => {
  const rescue = [{ year: 2060, vatGeneralRate: 0.21, vatReducedRate: 0.10, vatSuperReducedRate: 0.04, irpfExtraPoints: 0, irpfThreshold: 0 }];
  const r = run({ stressPremium: 1, narrativeNoRescue: 1, fiscalRescues: rescue });
  const v = computeVerdict(r, { config: r.config });
  assert.ok(Number.isInteger(v.bailoutYear));
  for (const y of r.years.filter(y => y.year > v.bailoutYear)) assert.equal(y.riskPremium?.stressPremiumRate ?? 0, 0, String(y.year));
});

test('7 · a mixed system with a 0 % target sends nothing to the fund, continuous with a small target', () => {
  const progressive = systems.find(e => e.key === 'progressive').config;
  const zero = simulate(validateConfig({ ...progressive, transitionTargetFunded: 0 }));
  const small = simulate(validateConfig({ ...progressive, transitionTargetFunded: 0.005 }));
  for (const y of zero.years) assert.ok(y.effectiveFundedWeight < 1e-9, String(y.year));
  assert.ok(Math.abs(at(zero, 2070).debtGDP - at(small, 2070).debtGDP) < 3);
});

test('8 · the opening ladder leaves the 2027 bills out', () => {
  assert.equal(DEBT_POLICY_2026.id, 'es-treasury-2026-09-debt-policy-v3');
  const future = [12.85 - OPENING_BILLS_2027_PERCENT, 8.33, 9.83, 8.45, 6.41, 5.40, 7.80, 8.60, 6.99, 4.83, 3.79, 2.63, 1.56, 1.89, 2.00, 1.39, 1.73, 1.08, 0.59]
    .reduce((s, v) => s + v, 0);
  const w2027 = DEBT_POLICY_2026.initialMaturityWeights.find(w => w.maturityYear === 2027).weight;
  assert.ok(Math.abs(w2027 - (12.85 - OPENING_BILLS_2027_PERCENT) / future) < 1e-12);
  assert.ok(Math.abs(DEBT_POLICY_2026.initialMaturityWeights.reduce((s, w) => s + w.weight, 0) - 1) < 1e-12);
});
