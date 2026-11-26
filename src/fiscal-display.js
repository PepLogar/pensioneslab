import { describeMoneyFlow } from './money-flow.js';

function finite(value, name, minimum = -Infinity) {
  if (!Number.isFinite(value) || value < minimum) throw new RangeError('Invalid ' + name);
  return value;
}
function positiveFactor(value) {
  finite(value, 'priceFactor');
  if (value <= 0) throw new RangeError('priceFactor must be positive');
  return value;
}

/** Convert the model's base-year purchasing units into the selected year's euros. */
export function nominalPriceFactor(year, inflationRate, baseYear = 2026) {
  if (!Number.isInteger(year) || year < 1 || !Number.isInteger(baseYear) || baseYear < 1) {
    throw new RangeError('Calendar years must be positive integers');
  }
  finite(inflationRate, 'inflationRate');
  if (inflationRate <= -1) throw new RangeError('Inflation must exceed -100%');
  return positiveFactor((1 + inflationRate) ** (year - baseYear));
}

const MONEY_FIELDS = [
  'publicContributions', 'otherPublicRevenue', 'publicPensions', 'otherPrimarySpending',
  'primaryRevenue', 'primarySpending', 'interestCurrent', 'interestPaid', 'interestIncome',
  'totalInflow', 'totalOutflow', 'balance', 'debtAdded', 'debtRepaid', 'cashUsed', 'cashAdded',
  'closingDebt', 'closingCash'
];

/**
 * Presentation only: the engine and its real stocks remain unchanged.
 * All returned monetary fields are nominal; year/isBase are metadata.
 * Opening stocks get explicit Nominal names. Real aliases are intentionally
 * omitted rather than attaching nominal amounts to misleading field names.
 * D_open_real × P_year restores the nominal opening principal: inflation is
 * not counted as borrowing. Base-year stock changes remain null.
 */
export function describeNominalMoneyFlow(point, {
  inflationRate, baseYear = 2026, isBase = point?.year === baseYear
} = {}) {
  const flow = describeMoneyFlow(point, { isBase });
  const priceFactor = nominalPriceFactor(flow.year, inflationRate, baseYear);
  const convert = value => value === null ? null : finite(value * priceFactor, 'nominal amount');
  return {
    year: flow.year, isBase: flow.isBase, priceFactor,
    ...Object.fromEntries(MONEY_FIELDS.map(key => [key, convert(flow[key])])),
    openingDebtNominal: convert(flow.openingDebtReal),
    openingCashNominal: convert(flow.openingCashReal)
  };
}

/**
 * Public pension resources, not the institutional Social Security balance.
 * contributions already excludes MEI; neither invested private contributions
 * nor private benefits/notional balances belong in this coverage calculation.
 * The tax allocation is internal to consolidated revenue, not extra revenue.
 * Use priceFactor=1 for base-year euros or the nominal factor for nominal euros.
 */
export function describePensionFunding(point, { priceFactor = 1 } = {}) {
  if (!point || typeof point !== 'object') throw new TypeError('A pension funding point is required');
  positiveFactor(priceFactor);
  const originalBenefits = finite(point.publicBenefits, 'publicBenefits', 0);
  const originalContributions = finite(point.publicPensionContributions, 'publicPensionContributions', 0);
  const originalAllocation = finite(point.pensionTaxTransfer, 'pensionTaxTransfer', 0);
  const originalGap = finite(point.pensionGap, 'pensionGap');
  const tolerance = Math.max(0.01, Number.EPSILON * 4 * Math.max(
    originalBenefits, originalContributions, originalAllocation, Math.abs(originalGap)));
  if (Math.abs(originalBenefits - originalContributions - originalAllocation - originalGap) > tolerance) {
    throw new RangeError('Pension funding does not reconcile with pensionGap');
  }
  const benefits = finite(originalBenefits * priceFactor, 'scaled benefits', 0);
  const contributions = finite(originalContributions * priceFactor, 'scaled contributions', 0);
  const taxAllocation = finite(originalAllocation * priceFactor, 'scaled taxAllocation', 0);
  const gapSigned = finite(originalGap * priceFactor, 'scaled gap');
  const contributionsUsed = Math.min(contributions, benefits);
  const taxesUsed = Math.min(taxAllocation, Math.max(0, benefits - contributions));
  // These three segments cover at most one pension bill; excess funding stays
  // explicit outside the bar. This ordering is a display convention, not a
  // claim that a particular pension legally draws first from one revenue type.
  const uncovered = Math.max(0, benefits - contributions - taxAllocation);
  return {
    priceFactor, benefits, contributions, taxAllocation, gapSigned,
    remainingNeed: Math.max(0, gapSigned), surplus: Math.max(0, -gapSigned),
    contributionsUsed, taxesUsed, uncovered,
    contributionsExcess: contributions - contributionsUsed,
    taxesExcess: taxAllocation - taxesUsed
  };
}
