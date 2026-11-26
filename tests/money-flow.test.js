import test from 'node:test';
import assert from 'node:assert/strict';
import { describeMoneyFlow } from '../src/money-flow.js';

const point = patch => ({ year: 2023, publicContributions: 60, generalTaxRevenue: 40,
  publicBenefits: 90, otherPrimarySpending: 20, interest: 5, stateBalance: -15,
  openingDebtReal: 100, openingCashReal: 0, debt: 115, cash: 0, ...patch });

test('déficit sin caja: financiación por deuda, sin sumar otra vez la brecha de pensiones', () => {
  const input = point({ pensionGap: 999, pensionTaxTransfer: 888, fundedAssets: 1e9, notionalBalance: 2e9 });
  const before = structuredClone(input), flow = describeMoneyFlow(input);
  assert.deepEqual(input, before);
  assert.equal(flow.primaryRevenue, 100);
  assert.equal(flow.primarySpending, 110);
  assert.equal(flow.totalInflow, 100);
  assert.equal(flow.totalOutflow, 115);
  assert.equal(flow.balance, -15);
  assert.equal(flow.debtAdded, 15);
  assert.equal(flow.debtRepaid, 0);
  assert.equal(flow.cashUsed, 0);
  assert.equal(flow.cashAdded, 0);
  assert.equal(flow.interestCurrent, 5);
  assert.equal(flow.interestPaid, 5);
  assert.equal(flow.interestIncome, 0);
});

test('déficit con caja: utiliza la apertura real, sin confundir inflación y retirada', () => {
  const flow = describeMoneyFlow(point({ openingDebtReal: 0, debt: 0, openingCashReal: 20, cash: 5 }));
  // Opening cash is already deflated by fiscal-core; no previous nominal stock
  // or inflation rate is needed or re-applied by this presentation helper.
  assert.equal(flow.openingCashReal, 20);
  assert.equal(flow.cashUsed, 15);
  assert.equal(flow.debtAdded, 0);
  assert.equal(flow.closingCash, 5);
  assert.equal(flow.balance, -15);
});

test('superávit amortiza deuda y conserva el remanente como caja', () => {
  const flow = describeMoneyFlow(point({ publicContributions: 80, generalTaxRevenue: 70,
    stateBalance: 35, openingDebtReal: 20, debt: 0, cash: 15 }));
  assert.equal(flow.totalInflow, 150);
  assert.equal(flow.totalOutflow, 115);
  assert.equal(flow.balance, 35);
  assert.equal(flow.debtRepaid, 20);
  assert.equal(flow.cashAdded, 15);
  assert.equal(flow.debtAdded, 0);
  assert.equal(flow.cashUsed, 0);
});

test('intereses negativos son ingreso actual y no gasto negativo ni interés futuro', () => {
  const flow = describeMoneyFlow(point({ interest: -20, stateBalance: 10,
    openingDebtReal: 1000, debt: 990 }));
  assert.equal(flow.interestCurrent, -20);
  assert.equal(flow.interestIncome, 20);
  assert.equal(flow.interestPaid, 0);
  assert.equal(flow.totalInflow, 120);
  assert.equal(flow.totalOutflow, 110);
  assert.equal(flow.balance, 10);
  assert.equal(flow.debtRepaid, 10);
  assert.equal(Object.hasOwn(flow, 'nextInterest'), false);
});

test('base sin cambios inferidos; datos incompletos se rechazan y el ruido de un céntimo no crea flujos', () => {
  const input = point({ year: 2022, debt: 400 });
  delete input.openingDebtReal;
  delete input.openingCashReal;
  const flow = describeMoneyFlow(input, { isBase: true });
  for (const key of ['openingDebtReal', 'openingCashReal', 'debtAdded', 'debtRepaid', 'cashUsed', 'cashAdded']) {
    assert.equal(flow[key], null);
  }
  assert.equal(flow.totalInflow, 100);
  assert.equal(flow.totalOutflow, 115);
  assert.equal(flow.balance, -15);
  assert.equal(flow.closingDebt, 400);
  assert.equal(flow.closingCash, 0);
  assert.throws(() => describeMoneyFlow(input), /openingDebtReal/);
  for (const patch of [{ interest: NaN }, { debt: Infinity }, { publicBenefits: -1 },
    { stateBalance: null }, { stateBalance: 999 }]) assert.throws(() => describeMoneyFlow(point(patch)));
  const tiny = describeMoneyFlow(point({ stateBalance: -0.005, interest: -10,
    debt: 100.005, openingCashReal: 0.005 }));
  assert.equal(tiny.debtAdded, 0);
  assert.equal(tiny.cashUsed, 0);
});
