import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_SPAIN } from '../data/current-spain.js';
import { PENSION_POLICY_2026 } from '../data/pension-policy-2026.js';
import { meiRate, solidarityRates, ordinaryRetirementRule, pensionRevaluationFromMonthlyRates,
  reserveWithdrawalLimitGDP, accumulateReserve, createCurrentPolicyV2 } from '../src/current-policy-v2.js';

test('approved schedules and lagged pension index do not invent revenue or a legal IPC observation', () => {
  assert.deepEqual([2026,2027,2028,2029,2050,2051].map(meiRate), [.009,.010,.011,.012,.012,0]);
  assert.deepEqual(solidarityRates(2027), [.0138,.015,.0175]);
  assert.equal(ordinaryRetirementRule(2027).upperAgeMonths, 804);
  assert.equal(ordinaryRetirementRule(2027).longCareerMonths, 462);
  assert.equal(reserveWithdrawalLimitGDP(2032), 0);
  assert.equal(reserveWithdrawalLimitGDP(2033), .001);
  assert.equal(reserveWithdrawalLimitGDP(2054), null);
  assert.equal(pensionRevaluationFromMonthlyRates(Array(12).fill(-.01)), 0);
  assert.throws(() => pensionRevaluationFromMonthlyRates(Array(12)), /Invalid/);
  const base = CURRENT_SPAIN.base;
  const policy = createCurrentPolicyV2(base);
  assert.equal(policy.pensionInPaymentRealIndex(2026, null, {inflationRate:.02}), 1);
  assert.equal(policy.pensionInPaymentRealIndex(2027, null, {inflationRate:.02}), 1.039/1.02);
  const observed = createCurrentPolicyV2(base, {priorYearInflationRates:{2026:.03}, pensionRevaluationRates:{2028:-.01}});
  assert.equal(observed.pensionInPaymentRealIndex(2027, null, {inflationRate:.025}), 1.03/1.025);
  assert.equal(observed.pensionInPaymentRealIndex(2028, null, {inflationRate:.02}), 1/1.02);
  const rates = policy.contributionRates(2027, {contributionRate:.25});
  assert.ok(Math.abs(rates.retirementRate + rates.protectedRate - .25 - rates.meiRate) < 1e-12);
  assert.ok(Math.abs(rates.meiRate * base.workers * base.wage - base.meiAnnualPace*10/9) < 1e-5);
});

test('reserve memo accumulates nominal MEI once without external cash, SFA or automatic withdrawal', () => {
  const initial = accumulateReserve(null, 6e9, 1, 2026);
  const initialCopy = structuredClone(initial);
  const next = accumulateReserve(initial, 7e9, 1.02, 2027);
  assert.deepEqual(initial, initialCopy);
  assert.equal(initial.reserveFundOpeningNominal, null);
  assert.equal(initial.reserveFundTotalNominal, PENSION_POLICY_2026.reserveFund.latestTotal2026.totalEUR);
  assert.equal(initial.reserveFundMeiInflowNominal, 0);
  assert.equal(next.reserveFundTotalNominal, 15267e6 + 7e9*1.02);
  assert.equal(next.reserveFundCumulativeMeiNominal, 7e9*1.02);
  assert.equal(next.reserveFundSFAReal, 0);
  assert.equal(next.reserveFundExternalAssetsNominal, null);
  assert.equal(next.reserveFundCashNominal, null);
  const later = accumulateReserve(next, 8e9, 1.15, 2033);
  assert.equal(later.reserveFundWithdrawalLimitGDP, .001);
  assert.equal(later.reserveFundWithdrawalNominal, 0);
  assert.equal(later.reserveFundInternalReturnNominal, 0);
  assert.equal(later.reserveFundTotalNominal, next.reserveFundTotalNominal + 8e9*1.15);
  assert.equal(Object.hasOwn(later, 'debt'), false);
  assert.equal(Object.hasOwn(later, 'cash'), false);
});
