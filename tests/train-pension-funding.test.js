import test from 'node:test';
import assert from 'node:assert/strict';
import { describeTrainPensionFunding } from '../src/train-pension-funding.js';
import { PUBLIC_PENSION_SHARES, describePensionFunding } from '../src/fiscal-display-v9.js';

function point({ cost = 100, contributions = 40, mutuas = 5, taxes = 25, year = 2026 } = {}) {
  return {
    year, publicRetirementBenefits: cost, otherPensionBenefits: 0, publicBenefits: cost,
    publicPensionContributions: contributions, mutuaPensionTransfer: mutuas,
    pensionTaxTransfer: taxes, pensionGap: cost - contributions - mutuas - taxes
  };
}
function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
}
function reconciles(view) {
  near(view.contributions + view.mutuas + view.taxes + view.missing, view.cost);
  for (const amount of Object.values(view.fundingShares)) assert.ok(amount >= 0 && amount <= 1);
  near(Object.values(view.fundingShares).reduce((sum, value) => sum + value, 0), view.cost > 0 ? 1 : 0);
}

test('the 2026 departure shows public pension cost and effective coverage, not zero borrowing movements', () => {
  const row = point();
  const before = JSON.stringify(row);
  const view = describeTrainPensionFunding(row);
  assert.equal(view.cost, 100);
  assert.equal(view.contributions, 40);
  assert.equal(view.mutuas, 5);
  assert.equal(view.contributionsAndMutuas, 45);
  assert.equal(view.taxes, 25);
  near(view.missing, 30);
  assert.equal(view.contributionShare, .45);
  assert.equal(view.taxShare, .25);
  assert.equal(view.severity, 'high');
  reconciles(view);
  assert.equal(JSON.stringify(row), before);
});

test('earmarked surpluses are separate and do not conceal another payer’s unpaid pension need', () => {
  const row = point({ contributions: 100, mutuas: 5, taxes: 0 });
  const view = describeTrainPensionFunding(row);
  const institutional = describePensionFunding(row);
  assert.ok(row.pensionGap < 0);
  assert.ok(view.missing > 0);
  near(view.missing, 100 * (1 - PUBLIC_PENSION_SHARES.retirementShare));
  near(view.contributions, institutional.contributionsUsed);
  assert.equal(view.mutuas, 0);
  assert.equal(view.excess.mutuas, 5);
  assert.ok(view.excess.contributions > 0);
  reconciles(view);
  const excessTax = describeTrainPensionFunding(point({ contributions: 40, mutuas: 5, taxes: 100 }));
  assert.equal(excessTax.missing, 0);
  near(excessTax.taxes, 55);
  near(excessTax.excess.taxes, 45);
  reconciles(excessTax);
});

test('nominal prices scale every displayed amount once and preserve coverage and severity', () => {
  const row = point();
  const real = describeTrainPensionFunding(row);
  const nominal = describeTrainPensionFunding(row, { priceFactor: 2.5 });
  for (const key of ['cost', 'contributions', 'mutuas', 'contributionsAndMutuas', 'taxes', 'missing']) {
    near(nominal[key], real[key] * 2.5);
  }
  for (const key of Object.keys(real.fundingShares)) near(nominal.fundingShares[key], real.fundingShares[key]);
  assert.equal(nominal.severity, real.severity);
  reconciles(nominal);
});

test('a zero public pension perimeter reports no used resources or missing money', () => {
  const view = describeTrainPensionFunding(point({ cost: 0, contributions: 4, mutuas: 2, taxes: 3 }));
  assert.equal(view.cost, 0);
  assert.equal(view.contributionsAndMutuas, 0);
  assert.equal(view.taxes, 0);
  assert.equal(view.missing, 0);
  assert.equal(view.missingShare, 0);
  assert.equal(view.contributionShare, 0);
  assert.equal(view.taxShare, 0);
  assert.equal(view.severity, 'none');
  assert.deepEqual(view.excess, { contributions: 4, mutuas: 2, taxes: 3 });
  reconciles(view);
});

test('all systems use the same fixed presentation bands, including their boundaries', () => {
  for (const [missing, expected] of [[0, 'none'], [1, 'low'], [5, 'low'],
    [5.01, 'medium'], [15, 'medium'], [15.01, 'high'], [30, 'high'], [30.01, 'critical']]) {
    const view = describeTrainPensionFunding(point({ contributions: 0, mutuas: 0, taxes: 100 - missing }));
    assert.equal(view.severity, expected, `missing share ${missing}%`);
    near(view.missing, missing);
    reconciles(view);
  }
});
