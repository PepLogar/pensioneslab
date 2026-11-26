/** Presentation for fiscal v9: debt forgiveness reduces the stock, never cash
 * revenue or cash repayment. The v8 presentation remains available to studies. */
import { nominalPriceFactor } from './fiscal-display.js';
export { PUBLIC_PENSION_SHARES, publicPensionPerimeter, describePensionFunding } from './fiscal-display-v8.js';
export { nominalPriceFactor } from './fiscal-display.js';

function finite(value, name, nonnegative = false) {
  if (!Number.isFinite(value) || (nonnegative && value < 0)) throw new RangeError(`Invalid fiscal display value: ${name}`);
  return value;
}
function reconciles(actual, expected, label) {
  const tolerance = Math.max(.02, Number.EPSILON * 16 * Math.max(Math.abs(actual), Math.abs(expected)));
  if (Math.abs(actual - expected) > tolerance) throw new RangeError(`${label} does not reconcile`);
}

export function priceFactorFor(point, { inflationRate, baseYear = 2026 } = {}) {
  const factor = point?.priceIndex ?? nominalPriceFactor(point?.year, inflationRate, baseYear);
  if (!Number.isFinite(factor) || factor <= 0) throw new RangeError('Invalid annual price index');
  return factor;
}

export function describeNominalMoneyFlow(point, {
  inflationRate, baseYear = 2026, isBase = point?.year === baseYear && !point?.retro1985
} = {}) {
  if (!point || !Number.isInteger(point.year) || typeof isBase !== 'boolean') throw new TypeError('A dated fiscal point is required');
  const amount = (key, nonnegative = false) => finite(point[key], key, nonnegative);
  const priceFactor = priceFactorFor(point, { inflationRate, baseYear });
  const publicContributions = amount('publicContributions', true);
  const primaryRevenue = amount('totalPublicRevenue', true);
  const otherPublicRevenue = finite(primaryRevenue - publicContributions, 'otherPublicRevenue', true);
  const publicPensions = amount('publicBenefits', true);
  const otherPrimarySpending = amount('otherPrimarySpending', true);
  const primarySpending = publicPensions + otherPrimarySpending;
  const interestCurrent = amount('interest');
  const interestPaid = Math.max(0, interestCurrent), interestIncome = Math.max(0, -interestCurrent);
  const totalInflow = primaryRevenue + interestIncome;
  const totalOutflow = primarySpending + interestPaid;
  const balance = amount('stateBalance');
  reconciles(totalInflow - totalOutflow, balance, 'Public budget');
  const closingDebt = amount('debt', true), closingCash = amount('cash', true);
  const stockFlowAdjustment = finite(point.stockFlowAdjustment ?? 0, 'stockFlowAdjustment');
  const financingNeed = isBase ? null : finite(point.financingNeed ?? -balance + stockFlowAdjustment, 'financingNeed');
  const movements = {};
  for (const key of ['openingDebtReal', 'openingCashReal', 'debtAdded', 'debtRepaid',
    'cashUsed', 'cashAdded', 'debtMaturities', 'debtRefinanced', 'grossDebtIssuance']) {
    movements[key] = isBase ? null : amount(key, true);
  }
  const debtWrittenOff = isBase ? null : finite(point.debtWrittenOff ?? 0, 'debtWrittenOff', true);
  if (!isBase && debtWrittenOff > movements.openingDebtReal) throw new RangeError('Debt forgiveness exceeds opening debt');
  const interestOnOpeningDebt = isBase ? null : amount('interestOnOpeningDebt');
  const interestOnNewDebt = isBase ? null : amount('interestOnNewDebt');
  if (!isBase) {
    reconciles(interestOnOpeningDebt + interestOnNewDebt, interestCurrent, 'Interest components');
    reconciles(financingNeed, -balance + stockFlowAdjustment, 'Deficit and financial adjustment');
    reconciles(closingDebt, movements.openingDebtReal - debtWrittenOff + movements.debtAdded - movements.debtRepaid, 'Debt roll-forward');
    reconciles(closingCash, movements.openingCashReal - movements.cashUsed + movements.cashAdded, 'Additional cash');
    reconciles(financingNeed, movements.debtAdded - movements.debtRepaid + movements.cashUsed - movements.cashAdded, 'Financing settlement');
    reconciles(movements.grossDebtIssuance, movements.debtRefinanced + movements.debtAdded, 'Gross debt issuance');
  }
  const realAmounts = { publicContributions, otherPublicRevenue, publicPensions, otherPrimarySpending,
    primaryRevenue, primarySpending, interestCurrent, interestPaid, interestIncome, totalInflow, totalOutflow,
    balance, closingDebt, closingCash, stockFlowAdjustment, financingNeed, interestOnOpeningDebt, interestOnNewDebt, debtWrittenOff,
    debtAdded: movements.debtAdded, debtRepaid: movements.debtRepaid, cashUsed: movements.cashUsed,
    cashAdded: movements.cashAdded, debtMaturities: movements.debtMaturities,
    debtRefinanced: movements.debtRefinanced, grossDebtIssuance: movements.grossDebtIssuance,
    openingDebtNominal: movements.openingDebtReal, openingCashNominal: movements.openingCashReal };
  const rates = {};
  for (const key of ['nominalInterestRate', 'targetNominalInterestRate', 'effectiveNominalRate']) {
    rates[key] = point[key] == null ? null : finite(point[key], key);
  }
  return { year: point.year, isBase, priceFactor, ...rates,
    ...Object.fromEntries(Object.entries(realAmounts).map(([key, value]) => [key,
      value === null ? null : finite(value * priceFactor, `nominal ${key}`)])),
    // This portfolio already uses nominal euros; do not apply priceFactor again.
    debtVintageLedger: point.debtVintageLedger ?? null,
    // Metadata contains nominal portfolio amounts; preserve its units as supplied.
    debtRestructuring: point.debtRestructuring ?? null };
}

