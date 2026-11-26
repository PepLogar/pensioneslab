import test from 'node:test';
import assert from 'node:assert/strict';
import { describeFundingDecision, needsFundingDecision, nextFundingYear } from '../src/financing-gate.js';

test('funding decision separates proposed credit, refinancing and unpaid obligations without invented issuance interest', () => {
  const point = { year: 2027, priceIndex: 2, debtAdded: 100, debtRefinanced: 500,
    interest: 30, stateBalance: -110, openingCashReal: 20, stockFlowAdjustment: 10,
    targetNominalInterestRate: .04 };
  const before = structuredClone(point);
  const decision = describeFundingDecision(point);
  assert.equal(decision.requiresDecision, true);
  assert.equal(decision.newBorrowingNominal, 200);
  assert.equal(decision.refinancingNominal, 1000);
  assert.equal(decision.grossIssuanceNominal, 1200);
  assert.equal(decision.financingNeedNominal, 240);
  assert.equal(decision.interestOnAdditionalBorrowingNominal, 4);
  assert.equal(decision.interestWithoutNewLoanNominal, 56);
  assert.equal(decision.budgetUnfundedWithoutNewLoanNominal, 176);
  assert.equal(decision.netUnfundedWithoutNewLoanNominal, 196);
  assert.equal(decision.netUnfundedWithoutNewLoanNominal,
    decision.newBorrowingNominal - decision.interestOnAdditionalBorrowingNominal);
  assert.deepEqual(point, before);

  // Negative rates are income. Refusing the loan removes that income too.
  const negative = describeFundingDecision({ ...point, interest: -30, targetNominalInterestRate: -.04 });
  assert.equal(negative.interestOnAdditionalBorrowingNominal, -4);
  assert.equal(negative.interestWithoutNewLoanNominal, -56);
  assert.equal(negative.netUnfundedWithoutNewLoanNominal, 204);

  const noLoan = describeFundingDecision({ ...point, debtAdded: 0, debtRefinanced: 0,
    interest: 0, targetNominalInterestRate: 0, stateBalance: 10, stockFlowAdjustment: 0 });
  assert.equal(noLoan.requiresDecision, false);
  assert.equal(noLoan.netUnfundedWithoutNewLoanNominal, 0);
  assert.equal(noLoan.grossIssuanceNominal, 0);
  const refinancingOnly = describeFundingDecision({ ...point, debtAdded: 0,
    stateBalance: -10, stockFlowAdjustment: 0 });
  assert.equal(refinancingOnly.requiresDecision, false);
  assert.equal(refinancingOnly.refinancingNominal, 1000);
  assert.equal(refinancingOnly.netUnfundedWithoutNewLoanNominal, 0);

  const base = describeFundingDecision({ year: 2026, priceIndex: 1, interest: 40, stateBalance: -100,
    debtAdded: null, debtRefinanced: null });
  assert.equal(base.requiresDecision, false);
  assert.equal(base.newBorrowingNominal, null);
  assert.equal(base.netUnfundedWithoutNewLoanNominal, null);

  // A financial transaction is not automatically an unpaid pension or coupon.
  const assets = describeFundingDecision({ ...point, debtAdded: 10, stateBalance: 0,
    openingCashReal: 0, stockFlowAdjustment: 10, targetNominalInterestRate: 0 });
  assert.equal(assets.budgetUnfundedWithoutNewLoanNominal, 0);
  assert.equal(assets.netUnfundedWithoutNewLoanNominal, 20);
  assert.throws(() => describeFundingDecision({ ...point, targetNominalInterestRate: null }), /issuance|targetNominalInterestRate/);
  assert.throws(() => describeFundingDecision({ ...point, debtAdded: -1 }), /debtAdded/);
});

test('future funding stop is earliest even in unsorted rows and never infers default from ratios', () => {
  const rows = [{ year: 2026, debtAdded: null }, { year: 2030, debtAdded: 3 },
    { year: 2027, debtAdded: 0, debtGDP: 999 }, { year: 2029, debtAdded: 2 },
    { year: 2028, debtAdded: 1 }];
  assert.equal(nextFundingYear(2026, rows), 2029);
  assert.equal(nextFundingYear(2029, rows), 2030);
  assert.equal(nextFundingYear(2030, rows), null);
  assert.equal(needsFundingDecision({ year: 2027, debtAdded: 1.01, debtGDP: 0 }), true);
  assert.equal(needsFundingDecision(rows[2]), false);
  assert.throws(() => nextFundingYear(2026.5, rows), /current year/);
  assert.throws(() => needsFundingDecision({ year: 2027, debtAdded: null }), /debtAdded/);
});
