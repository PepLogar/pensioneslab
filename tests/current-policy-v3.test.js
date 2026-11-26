import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_SPAIN as PREVIOUS } from '../data/current-spain-v2.js';
import { CURRENT_SPAIN, CONTRIBUTION_BREAKDOWN_2026 as OBSERVED } from '../data/current-spain-v3.js';
import { createCurrentPolicyV2 } from '../src/current-policy-v2.js';
import { createCurrentPolicyV3, accumulateReserve } from '../src/current-policy-v3.js';

const base = CURRENT_SPAIN.base;
const payroll = base.workers * base.wage;
const config = { contributionRate: base.ordinaryPensionPool / payroll,
  inflationRate: .02, pensionRevaluationMode: 'cpi', pensionRevaluationRate: 0 };
const policy = createCurrentPolicyV3(base);
function close(actual, expected, tolerance = 1e-5) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}`);
}

test('2026 separates recognised MEI/solidarity and preserves opening consolidated income', () => {
  close(OBSERVED.mei + OBSERVED.solidarity, OBSERVED.heading120);
  const rates = policy.contributionRates(2026, config);
  close(payroll * rates.meiRate, 5381.01e6);
  close(payroll * rates.solidarityRate, 730.965e6);
  close(payroll * (rates.retirementRate + rates.protectedRate), base.pensionContributions, 1e-4);
  assert.equal(base.ordinaryPensionPool, PREVIOUS.base.ordinaryPensionPool);
  assert.equal(base.totalRevenue, PREVIOUS.base.totalRevenue);
  close(base.otherRevenue + base.pensionContributions, base.totalRevenue, 1e-4);
  close(base.otherRevenue - PREVIOUS.base.otherRevenue, .525e6, 1e-4);
});

test('2031 uses the conditional lower statutory ratio; the upper diagnostic is not booked', () => {
  const initial = policy.contributionRates(2026, config);
  const future = policy.contributionRates(2031, config);
  const factors = policy.solidarityRateMultipliers(2031);
  close(factors.lower, .0229 / .0115, 1e-12);
  close(factors.upper, 2, 1e-12);
  close(future.solidarityRate / initial.solidarityRate, factors.lower, 1e-12);
  close(future.solidarityRateUpper / initial.solidarityRate, factors.upper, 1e-12);
  close(future.protectedRate, config.contributionRate * (1 - base.retirementContributionShare) +
    future.meiRate + future.solidarityRate, 1e-12);
  assert.ok(future.solidarityRateUpper > future.solidarityRate);
  assert.deepEqual(policy.solidarityRateMultipliers(2070), policy.solidarityRateMultipliers(2045));
});

test('solidarity remains public without retirement credits or MEI reserve inflow in every system', () => {
  const inherited = createCurrentPolicyV2(base);
  for (const system of ['payg', 'ndc', 'funded', 'mixed']) {
    const rates = policy.contributionRates(2027, { ...config, system });
    const oldRates = inherited.contributionRates(2027, { ...config, system });
    close(rates.retirementRate, oldRates.retirementRate, 1e-12);
    close(rates.meiRate, oldRates.meiRate, 1e-12);
    close(rates.protectedRate - oldRates.protectedRate, rates.solidarityRate, 1e-12);
    const zeroOrdinary = policy.contributionRates(2027, { ...config, system, contributionRate: 0 });
    assert.equal(zeroOrdinary.retirementRate, 0);
    close(zeroOrdinary.protectedRate, zeroOrdinary.meiRate + zeroOrdinary.solidarityRate, 1e-12);
  }
  const rates = policy.contributionRates(2027, config);
  const opening = accumulateReserve(null, base.meiAnnualPace, 1, 2026);
  const next = accumulateReserve(opening, payroll * rates.meiRate, 1.02, 2027);
  close(next.reserveFundMeiInflowNominal, payroll * rates.meiRate * 1.02);
  close(next.reserveFundTotalNominal - opening.reserveFundTotalNominal,
    next.reserveFundMeiInflowNominal);
});

test('the inherited CPI and manual pension choices are unchanged by levy separation', () => {
  const options = { priorYearInflationRates: { 2026: .04 } };
  const current = createCurrentPolicyV3(base, options), inherited = createCurrentPolicyV2(base, options);
  for (const choice of [config, { ...config, pensionRevaluationMode: 'manual', pensionRevaluationRate: -.02 }]) {
    assert.equal(current.pensionInPaymentRealIndex(2027, null, choice),
      inherited.pensionInPaymentRealIndex(2027, null, choice));
    assert.deepEqual(current.contributionRates(2027, choice), current.contributionRates(2027, config));
  }
  close(current.pensionInPaymentRealIndex(2027, null, config), 1.04 / 1.02, 1e-12);
});
