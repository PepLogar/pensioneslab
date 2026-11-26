import test from 'node:test';
import assert from 'node:assert/strict';
import { nominalPriceFactor, describeNominalMoneyFlow, describePensionFunding } from '../src/fiscal-display.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, actual + ' != ' + expected);
function point(overrides = {}) {
  const p = { year: 2027, publicContributions: 40, generalTaxRevenue: 60,
    publicBenefits: 70, otherPrimarySpending: 40, interest: 0,
    openingDebtReal: 1000 / 1.02, openingCashReal: 0,
    debt: 1000 / 1.02 + 10, cash: 0, ...overrides };
  p.stateBalance = p.publicContributions + p.generalTaxRevenue -
    p.publicBenefits - p.otherPrimarySpending - p.interest;
  return p;
}

test('nominal opening principal excludes inflation from new borrowing and preserves the base snapshot', () => {
  const p = point(), before = structuredClone(p);
  const flow = describeNominalMoneyFlow(p, { inflationRate: 0.02 });
  assert.equal(flow.year, 2027);
  assert.equal(flow.isBase, false);
  assert.equal(flow.priceFactor, 1.02);
  close(flow.openingDebtNominal, 1000);
  close(flow.debtAdded, 10.2);
  close(flow.closingDebt, 1010.2);
  close(flow.totalInflow, 102);
  close(flow.totalOutflow, 112.2);
  close(flow.balance, -10.2);
  close(flow.closingDebt - flow.openingDebtNominal, flow.debtAdded);
  assert.equal(Object.hasOwn(flow, 'openingDebtReal'), false);
  assert.equal(Object.hasOwn(flow, 'openingCashReal'), false);
  assert.deepEqual(p, before);
  close(nominalPriceFactor(2028, 0.02), 1.02 ** 2);
  close(nominalPriceFactor(2027, -0.01), 0.99);
  assert.throws(() => nominalPriceFactor(2027, -1), /Inflation/);
  assert.throws(() => nominalPriceFactor(2027, NaN), /inflationRate/);
  assert.throws(() => nominalPriceFactor(2027.5, 0.02), /Calendar/);
  const base = describeNominalMoneyFlow(point({ year: 2026, debt: 1000,
    openingDebtReal: null, openingCashReal: null }), { inflationRate: 0.02 });
  assert.equal(base.isBase, true);
  assert.equal(base.priceFactor, 1);
  assert.equal(base.closingDebt, 1000);
  assert.equal(base.balance, -10);
  for (const key of ['openingDebtNominal', 'openingCashNominal', 'debtAdded', 'debtRepaid', 'cashUsed', 'cashAdded']) {
    assert.equal(base[key], null);
  }
});

test('nominal cash use, repayment and negative interest retain their distinct budget roles', () => {
  const withCash = describeNominalMoneyFlow(point({ openingDebtReal: 100,
    openingCashReal: 30, debt: 100, cash: 20 }), { inflationRate: 0.02 });
  close(withCash.openingCashNominal, 30.6);
  close(withCash.cashUsed, 10.2);
  assert.equal(withCash.debtAdded, 0);
  close(withCash.closingDebt, withCash.openingDebtNominal);
  const surplus = describeNominalMoneyFlow(point({ publicBenefits: 20,
    openingDebtReal: 25, openingCashReal: 10, debt: 0, cash: 25 }), { inflationRate: 0.02 });
  close(surplus.balance, 40.8);
  close(surplus.debtRepaid, 25.5);
  close(surplus.cashAdded, 15.3);
  close(surplus.closingCash, 25.5);
  assert.equal(surplus.closingDebt, 0);
  const negativeInterest = describeNominalMoneyFlow(point({ interest: -2,
    debt: 1000 / 1.02 + 8 }), { inflationRate: 0.02 });
  close(negativeInterest.interestCurrent, -2.04);
  close(negativeInterest.interestIncome, 2.04);
  assert.equal(negativeInterest.interestPaid, 0);
  close(negativeInterest.totalInflow - negativeInterest.totalOutflow, negativeInterest.balance);
});

test('pension coverage excludes MEI and private flows, and excess funding remains outside a full bar', () => {
  const input = { publicBenefits: 100, publicPensionContributions: 60, pensionTaxTransfer: 25,
    pensionGap: 15, publicContributions: 67, meiContributions: 7, fundedContributions: 40,
    fundedBenefits: 30, fundedAssets: 900, notionalBalance: 800 };
  const p = describePensionFunding(input, { priceFactor: 2 });
  assert.equal(p.benefits, 200);
  assert.equal(p.contributions, 120);
  assert.equal(p.taxAllocation, 50);
  assert.equal(p.gapSigned, 30);
  assert.equal(p.remainingNeed, 30);
  assert.equal(p.uncovered, 30);
  assert.equal(p.contributionsUsed + p.taxesUsed + p.uncovered, p.benefits);
  assert.equal(p.surplus + p.contributionsExcess + p.taxesExcess, 0);
  const moreContributions = describePensionFunding({ ...input,
    publicPensionContributions: 110, pensionTaxTransfer: 20, pensionGap: -30 });
  assert.equal(moreContributions.contributionsUsed, 100);
  assert.equal(moreContributions.taxesUsed, 0);
  assert.equal(moreContributions.uncovered, 0);
  assert.equal(moreContributions.remainingNeed, 0);
  assert.equal(moreContributions.surplus, 30);
  assert.equal(moreContributions.contributionsExcess, 10);
  assert.equal(moreContributions.taxesExcess, 20);
  const moreTaxes = describePensionFunding({ ...input, pensionTaxTransfer: 70, pensionGap: -30 });
  assert.equal(moreTaxes.contributionsUsed, 60);
  assert.equal(moreTaxes.taxesUsed, 40);
  assert.equal(moreTaxes.taxesExcess, 30);
  assert.equal(moreTaxes.contributionsExcess, 0);
  assert.equal(moreTaxes.contributionsUsed + moreTaxes.taxesUsed, moreTaxes.benefits);
  assert.throws(() => describePensionFunding({ ...input, pensionGap: 0 }), /reconcile/);
  assert.throws(() => describePensionFunding({ ...input, publicPensionContributions: undefined }), /publicPensionContributions/);
  assert.throws(() => describePensionFunding(input, { priceFactor: 0 }), /positive/);
});
