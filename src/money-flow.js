/** Public annual accounts only. Amounts retain the model's price basis. */
const CENT = 0.01;
const positiveChange = value => value > CENT ? value : 0;

function amount(point, key, nonnegative = false) {
  const value = point[key];
  if (!Number.isFinite(value) || (nonnegative && value < 0)) {
    throw new RangeError(`Invalid money-flow amount: ${key}`);
  }
  return value;
}

/**
 * Describe an already calculated year without projecting another one.
 * Negative current interest is an inflow, not a negative outgoing bar.
 * Debt and cash changes use fiscal-core's REAL opening stocks: the inflation
 * revaluation of yesterday's balance is neither borrowing nor cash use.
 * The initial observation has no inferred opening or change in its stocks.
 * Private assets and notional rights never enter these public accounts.
 */
export function describeMoneyFlow(point, { isBase = false } = {}) {
  if (!point || typeof point !== 'object' || !Number.isInteger(point.year) || typeof isBase !== 'boolean') {
    throw new TypeError('A dated annual point and boolean isBase are required');
  }
  const publicContributions = amount(point, 'publicContributions', true);
  const otherPublicRevenue = amount(point, 'generalTaxRevenue', true);
  const publicPensions = amount(point, 'publicBenefits', true);
  const otherPrimarySpending = amount(point, 'otherPrimarySpending', true);
  const interestCurrent = amount(point, 'interest');
  const interestPaid = Math.max(0, interestCurrent);
  const interestIncome = Math.max(0, -interestCurrent);
  const primaryRevenue = publicContributions + otherPublicRevenue;
  const primarySpending = publicPensions + otherPrimarySpending;
  const totalInflow = primaryRevenue + interestIncome;
  const totalOutflow = primarySpending + interestPaid;
  const balance = amount(point, 'stateBalance');
  const closingDebt = amount(point, 'debt', true);
  const closingCash = amount(point, 'cash', true);
  if (![primaryRevenue, primarySpending, totalInflow, totalOutflow].every(Number.isFinite)) {
    throw new RangeError('Money-flow totals must be finite');
  }
  // Preserve the supplied balance. A one-cent floor permits ordinary rounding;
  // machine-scale slack only matters for very large aggregate euro amounts.
  const tolerance = Math.max(CENT, Number.EPSILON * 4 * Math.max(totalInflow, totalOutflow, Math.abs(balance)));
  if (Math.abs(totalInflow - totalOutflow - balance) > tolerance) {
    throw new RangeError('Public inflows and outflows do not reconcile with stateBalance');
  }
  let openingDebtReal = null, openingCashReal = null;
  let debtAdded = null, debtRepaid = null, cashUsed = null, cashAdded = null;
  if (!isBase) {
    openingDebtReal = amount(point, 'openingDebtReal', true);
    openingCashReal = amount(point, 'openingCashReal', true);
    debtAdded = positiveChange(closingDebt - openingDebtReal);
    debtRepaid = positiveChange(openingDebtReal - closingDebt);
    cashUsed = positiveChange(openingCashReal - closingCash);
    cashAdded = positiveChange(closingCash - openingCashReal);
  }
  return { year: point.year, isBase, publicContributions, otherPublicRevenue,
    publicPensions, otherPrimarySpending, primaryRevenue, primarySpending,
    interestCurrent, interestPaid, interestIncome, totalInflow, totalOutflow, balance,
    openingDebtReal, openingCashReal, debtAdded, debtRepaid, cashUsed, cashAdded,
    closingDebt, closingCash };
}
