import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_SPAIN } from '../data/current-spain-v5.js';
import { CURRENT_SPAIN as PREVIOUS } from '../data/current-spain-v4.js';
import { CONTRIBUTION_BASES_V5 as D } from '../data/contribution-bases-v5.js';
import { PENSION_POLICY_2026 as LAW } from '../data/pension-policy-2026.js';
import { createCurrentPolicyV5, salaryBaseMasses, meiRate } from '../src/current-policy-v5.js';
import { solidarityRates } from '../src/current-policy-v2.js';

// Pure policy fixtures only: no simulator imports or fiscal-outcome targets.
const base = CURRENT_SPAIN.base;
const payroll0 = base.workers * base.wage;
const config = Object.freeze({ contributionRate: base.ordinaryPensionPool / payroll0,
  inflationRate: .02, pensionRevaluationMode: 'cpi', pensionRevaluationRate: 0 });
const maximum0 = 12 * LAW.maximumContributionBase.monthlyEUR2026;
const nominalWageIndex = year => 1.35 ** ((year - 2026) / 5);
const policy = createCurrentPolicyV5(base, { nominalWageIndex });
const total = values => values.reduce((sum, value) => sum + value, 0);
const weightedSolidarity = (masses, year) => masses.excess.reduce((sum, amount, i) =>
  sum + amount * solidarityRates(year)[i], 0);
function close(actual, expected, tolerance = .01) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}`);
}

test('the ceiling partitions existing salary mass and moves mass between capped and excess pay', () => {
  for (const wage of [1, 1.35]) {
    const lower = salaryBaseMasses(wage, maximum0);
    const higher = salaryBaseMasses(wage, maximum0 * 1.2);
    close(lower.gross, lower.capped + total(lower.excess));
    close(higher.gross, higher.capped + total(higher.excess));
    close(higher.gross, lower.gross);
    assert.ok(higher.capped > lower.capped);
    assert.ok(total(higher.excess) < total(lower.excess));
    close(higher.capped - lower.capped, total(lower.excess) - total(higher.excess));
    assert.ok([...lower.excess, ...higher.excess].every(value => value >= 0));
  }
  assert.throws(() => salaryBaseMasses(NaN, maximum0), RangeError);
  assert.throws(() => salaryBaseMasses(1, 0), RangeError);
});

test('2026 preserves the observed opening receipts after rebasing salary', () => {
  const rates = policy.contributionRates(2026, config);
  for (const key of ['ordinaryPensionPool', 'meiAnnualPace', 'solidarityAnnualPace',
    'pensionContributions', 'totalRevenue', 'totalSpending', 'debt']) {
    assert.equal(base[key], PREVIOUS.base[key]);
  }
  close(payroll0 * rates.meiRate, base.meiAnnualPace);
  close(payroll0 * rates.solidarityRate, base.solidarityAnnualPace);
  close(payroll0 * (rates.retirementRate + rates.protectedRate), base.pensionContributions);
  close(payroll0 * rates.retirementRate,
    base.ordinaryPensionPool * base.retirementContributionShare);
  const response = policy.baseResponse(2026, config);
  close(response.maximumAnnualNominal, maximum0);
  for (const key of ['cappedBaseIndex', 'ordinaryAdjustment', 'meiAdjustment', 'solidarityAdjustment']) {
    close(response[key], 1, 1e-12);
  }
});

test('the legal ceiling ignores a manual pension cut and the extra increment ends after2050', () => {
  const manual = { ...config, pensionRevaluationMode: 'manual', pensionRevaluationRate: -.02 };
  for (const year of [2027, 2031, 2050, 2051]) {
    assert.deepEqual(policy.baseResponse(year, manual), policy.baseResponse(year, config));
    assert.deepEqual(policy.contributionRates(year, manual), policy.contributionRates(year, config));
  }
  assert.notEqual(policy.pensionInPaymentRealIndex(2027, null, manual),
    policy.pensionInPaymentRealIndex(2027, null, config));
  close(policy.baseResponse(2027, config).maximumAnnualNominal,
    maximum0 * (1 + LAW.pensionIndexation.firstPriorYearProxy.rate + .012));
  const cap2049 = policy.baseResponse(2049, config).maximumAnnualNominal;
  const cap2050 = policy.baseResponse(2050, config).maximumAnnualNominal;
  const cap2051 = policy.baseResponse(2051, config).maximumAnnualNominal;
  close(cap2050 / cap2049, 1.032, 1e-12);
  close(cap2051 / cap2050, 1.02, 1e-12);
});

test('nominal wage, employment and legal levy rates enter the receipts exactly once', () => {
  const year = 2031, wageIndex = nominalWageIndex(year), employmentIndex = 1.15;
  const response = policy.baseResponse(year, config), rates = policy.contributionRates(year, config);
  const opening = salaryBaseMasses(1, maximum0);
  const future = salaryBaseMasses(wageIndex, response.maximumAnnualNominal);
  const cappedRatio = future.capped / opening.capped;
  const solidarityRatio = weightedSolidarity(future, year) / weightedSolidarity(opening, 2026);
  const marRateRatio = Math.min(...solidarityRates(year).map((rate, i) => rate / solidarityRates(2026)[i]));
  const nominalPayroll = payroll0 * employmentIndex * wageIndex;
  const ordinaryRate = rates.retirementRate + rates.protectedRate - rates.meiRate - rates.solidarityRate;
  close(nominalPayroll * ordinaryRate, base.ordinaryPensionPool * employmentIndex *
    (D.ordinaryRGShare * cappedRatio + (1 - D.ordinaryRGShare) * wageIndex));
  close(nominalPayroll * rates.meiRate, base.meiAnnualPace * meiRate(year) / meiRate(2026) *
    employmentIndex * (D.meiRGShare * cappedRatio + (1 - D.meiRGShare) * wageIndex));
  close(nominalPayroll * rates.solidarityRate, base.solidarityAnnualPace * employmentIndex *
    (D.solidarityRGShare * solidarityRatio + (1 - D.solidarityRGShare) * wageIndex * marRateRatio));
  // The fixture has wages outgrowing the ceiling: a simple wage multiplier is wrong.
  assert.ok(cappedRatio < wageIndex);
});

test('all systems share the base; solidarity creates no retirement credits and MEI stops after2050', () => {
  const withoutSolidarity = createCurrentPolicyV5({ ...base, solidarityAnnualPace: 0 }, { nominalWageIndex });
  const ordinary = policy.contributionRates(2031, config);
  const noSolidarity = withoutSolidarity.contributionRates(2031, config);
  close(ordinary.retirementRate, noSolidarity.retirementRate, 1e-12);
  close(ordinary.meiRate, noSolidarity.meiRate, 1e-12);
  close(ordinary.protectedRate - noSolidarity.protectedRate, ordinary.solidarityRate, 1e-12);
  for (const system of ['payg', 'ndc', 'funded', 'mixed']) {
    assert.deepEqual(policy.contributionRates(2031, { ...config, system }), ordinary);
    const rates = policy.contributionRates(2051, { ...config, system, contributionRate: 0 });
    assert.equal(rates.meiRate, 0);
    assert.equal(rates.retirementRate, 0);
    close(rates.protectedRate, rates.solidarityRate, 1e-12);
    assert.ok(rates.solidarityRate > 0);
  }
  assert.ok(policy.contributionRates(2050, config).meiRate > 0);
});
