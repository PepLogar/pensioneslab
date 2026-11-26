// Retirement coverage by generation (data/career-coverage-2026.js), designed 26/11/2026, calibrated and on since 1.78:
// off it changes nothing; on, with an example table, it does what it says; the calibrated table fits Table 17.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCurrentModelV10 } from '../src/model-current-v10.js';
import { CAREER_COVERAGE_2026, careerCoverage } from '../data/career-coverage-2026.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';

const table = (byBirthYear, enabled = true) => ({ ...CAREER_COVERAGE_2026, enabled, byBirthYear });
const EXTRA = { 1965: { M: { extra: 0.05, noClaim: 0 }, F: { extra: 0.10, noClaim: 0 } } };
const NO_CLAIM = { 1980: { M: { extra: 0, noClaim: 0.05 }, F: { extra: 0, noClaim: 0.10 } } };
const run = (byBirthYear, config = {}) => createCurrentModelV10({ careerCoverageTable: table(byBirthYear) }).simulate({ ...DEFAULT_CONFIG, ...config });
const at = (r, y) => r.years.find(p => p.year === y);

test('on since 1.78, and its shares are 0 when off or not set', () => {
  assert.equal(CAREER_COVERAGE_2026.enabled, true);
  assert.deepEqual(careerCoverage(1965, 'F', { ...CAREER_COVERAGE_2026, enabled: false }), { extra: 0, noClaim: 0 });
  assert.deepEqual(careerCoverage(1950, 'F'), { extra: 0, noClaim: 0 });
  assert.deepEqual(careerCoverage(1965, 'F', table(EXTRA)), { extra: 0.10, noClaim: 0 });
  assert.deepEqual(careerCoverage(1966, 'F', table(EXTRA)), { extra: 0, noClaim: 0 });
});

test('on: the 2026 workers keep their total; those with a career but no job add retirees, not workers', () => {
  const none = run({}), extra = run(EXTRA);
  assert.ok(Math.abs(at(none, 2026).workers / at(extra, 2026).workers - 1) < 1e-9, 'same 2026 workers');
  assert.ok(Math.abs(at(none, 2030).workers / at(extra, 2030).workers - 1) < 1e-9, 'they never work');
  assert.ok(at(extra, 2035).retirees > at(none, 2035).retirees + 20000, 'the 1965 generation retires with more people');
  assert.ok(at(extra, 2035).publicRetirementBenefits > at(none, 2035).publicRetirementBenefits);
});

test('on: those with an incomplete career work, then reach no public pension, and the notional books still close', () => {
  const none = run({}, { system: 'ndc' }), short = run(NO_CLAIM, { system: 'ndc' });
  assert.ok(Math.abs(at(none, 2040).workers / at(short, 2040).workers - 1) < 1e-9, 'they work and contribute');
  assert.ok(at(short, 2055).retirees < at(none, 2055).retirees - 20000, 'fewer retirees once the 1980 generation retires');
  for (const r of short.years.slice(1)) {
    const p = short.years[short.years.indexOf(r) - 1];
    const roll = p.notionalBalance + r.notionalCredits + r.notionalRevaluation - r.ndcBenefits - r.notionalRightsExtinguished + (r.notionalPastRightsCapital ?? 0);
    assert.ok(Math.abs(roll - r.notionalBalance) < 1e-6 * Math.max(1, r.notionalBalance), `${r.year} notional roll-forward`);
  }
});

test('on, with a fund: the annuities of those with no public pension are paid, but stay out of the average per retiree (audit 1.85, 1)', async () => {
  const { payablePensionAnnual } = await import('../src/shared/payable-pension.js');
  const short = run(NO_CLAIM, { system: 'funded' });
  const r = at(short, 2060);
  assert.ok(r.fundedBenefitsNoClaim > 0 && r.fundedBenefitsNoClaim < r.fundedBenefits, 'paid, and part of the fund\'s payments');
  assert.ok(r.preservedFundedBenefitsNoClaim > 0);
  const close = (a, b, what) => assert.ok(Math.abs(a / b - 1) < 1e-12, `${what}: ${a} vs ${b}`);
  close(r.averagePensionAnnual * r.retirees, r.retirementBenefits - r.fundedBenefitsNoClaim, 'average × retirees');
  close(r.averagePensionPreserveCapitalAnnual * r.retirees,
    r.publicRetirementBenefits + r.preservedFundedBenefits - r.preservedFundedBenefitsNoClaim, 'preserved average × retirees');
  close(payablePensionAnnual(r, null), r.averagePensionAnnual, 'payable pension without a rescue');
  assert.ok(Math.abs(r.fundedBalanceResidual) < 1e-3 * Math.max(1, r.fundedAssets), 'the fund still pays them');
  assert.equal(at(short, 2026).fundedBenefitsNoClaim, undefined, 'the field appears only when someone draws such a fund');
});

test('the calibrated table gives the Ageing Report\'s new retirements in 2030–2060 with its assumptions', async () => {
  const { referenceProfile, profileConfig } = await import('../src/domain/reference-profiles.js');
  const { simulate } = await import('../src/simulation.js');
  const r = simulate(profileConfig(referenceProfile('ref:ageing-report-2024')));
  for (const [y, ar] of [[2030, 426.8e3], [2040, 549.8e3], [2050, 527.2e3], [2060, 458.0e3]]) {
    assert.ok(Math.abs(at(r, y).newRetirementAwards / ar - 1) < 0.01, `${y}: ${at(r, y).newRetirementAwards}`);
  }
});
