/** Presentation for fiscal v8: explicit issuance/repayment flows, not stock
 * differences. The preserved v1 presentation remains available to old studies. */
import { nominalPriceFactor } from './fiscal-display.js';
import { CURRENT_SPAIN } from '../data/current-spain.js';
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
  inflationRate, baseYear = 2026, isBase = point?.year === baseYear
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
  const interestOnOpeningDebt = isBase ? null : amount('interestOnOpeningDebt');
  const interestOnNewDebt = isBase ? null : amount('interestOnNewDebt');
  if (!isBase) {
    reconciles(interestOnOpeningDebt + interestOnNewDebt, interestCurrent, 'Interest components');
    reconciles(financingNeed, -balance + stockFlowAdjustment, 'Deficit and financial adjustment');
    reconciles(closingDebt, movements.openingDebtReal + movements.debtAdded - movements.debtRepaid, 'Debt roll-forward');
    reconciles(closingCash, movements.openingCashReal - movements.cashUsed + movements.cashAdded, 'Additional cash');
    reconciles(financingNeed, movements.debtAdded - movements.debtRepaid + movements.cashUsed - movements.cashAdded, 'Financing settlement');
    reconciles(movements.grossDebtIssuance, movements.debtRefinanced + movements.debtAdded, 'Gross debt issuance');
  }
  const realAmounts = { publicContributions, otherPublicRevenue, publicPensions, otherPrimarySpending,
    primaryRevenue, primarySpending, interestCurrent, interestPaid, interestIncome, totalInflow, totalOutflow,
    balance, closingDebt, closingCash, stockFlowAdjustment, financingNeed, interestOnOpeningDebt, interestOnNewDebt,
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
    debtVintageLedger: point.debtVintageLedger ?? null };
}

/** Constant SS/CP expenditure allocation, shared by all v8 presentation accounts.
 * Engine cohorts do not identify the institutional payer; this remains a proxy. */
const observed = CURRENT_SPAIN.observed;
export const PUBLIC_PENSION_SHARES = Object.freeze({
  retirementShare: observed.ssRetirementMonthly / (observed.ssRetirementMonthly + observed.cpRetirementMonthly),
  otherShare: 14 * (observed.allSSMonthly - observed.ssRetirementMonthly + observed.pncMonthly) /
    CURRENT_SPAIN.base.otherPensionBenefits
});
export function publicPensionPerimeter(point, {
  priceFactor = 1, retirementShare = PUBLIC_PENSION_SHARES.retirementShare,
  otherShare = PUBLIC_PENSION_SHARES.otherShare
} = {}) {
  if (!point || !Number.isFinite(priceFactor) || priceFactor <= 0) throw new RangeError('Invalid pension funding point or price factor');
  for (const [name, value] of Object.entries({ retirementShare, otherShare })) {
    finite(value, name, true);
    if (value > 1) throw new RangeError('Invalid ' + name);
  }
  const retirement = finite(point.publicRetirementBenefits, 'publicRetirementBenefits', true);
  const other = finite(point.otherPensionBenefits, 'otherPensionBenefits', true);
  const total = finite(point.publicBenefits, 'publicBenefits', true);
  reconciles(retirement + other, total, 'Public pension perimeter');
  return {
    benefits: finite(total * priceFactor, 'nominal publicBenefits', true),
    ssBenefits: finite((retirement * retirementShare + other * otherShare) * priceFactor, 'nominal SS benefits', true),
    cpBenefits: finite((retirement * (1 - retirementShare) + other * (1 - otherShare)) * priceFactor, 'nominal CP benefits', true)
  };
}

/** Internal mutual-insurance transfers already belong to consolidated receipts.
 * Contributions fund SS, then the mutual transfer funds the remaining SS need.
 * Assigned tax covers CP first and SS second. Unused earmarked resources cannot
 * cover another destination or automatically repay SS debt.
 * gapSigned is the aggregate accounting balance; uncovered/remainingNeed are
 * destination-specific needs and can coexist with an earmarked surplus. */
export function describePensionFunding(point, { priceFactor = 1, ...shares } = {}) {
  const { benefits, ssBenefits, cpBenefits } = publicPensionPerimeter(point, { priceFactor, ...shares });
  const contributions = finite(point.publicPensionContributions, 'publicPensionContributions', true) * priceFactor;
  const taxAllocation = finite(point.pensionTaxTransfer, 'pensionTaxTransfer', true) * priceFactor;
  const mutuaTransfer = finite(point.mutuaPensionTransfer, 'mutuaPensionTransfer', true) * priceFactor;
  const gapSigned = finite(point.pensionGap, 'pensionGap') * priceFactor;
  for (const [key, value] of Object.entries({ contributions, taxAllocation, mutuaTransfer, gapSigned })) finite(value, key);
  reconciles(benefits - contributions - mutuaTransfer - taxAllocation, gapSigned, 'Pension funding');
  const contributionsUsed = Math.min(contributions, ssBenefits);
  const mutuaUsed = Math.min(mutuaTransfer, Math.max(0, ssBenefits - contributionsUsed));
  const cpTaxTransfer = Math.min(taxAllocation, cpBenefits);
  const ssTaxTransfer = Math.min(taxAllocation - cpTaxTransfer, Math.max(0, ssBenefits - contributionsUsed - mutuaUsed));
  const taxesUsed = cpTaxTransfer + ssTaxTransfer;
  const cpUnfunded = Math.max(0, cpBenefits - cpTaxTransfer);
  const ssUnfunded = Math.max(0, ssBenefits - contributionsUsed - mutuaUsed - ssTaxTransfer);
  const uncovered = cpUnfunded + ssUnfunded;
  const contributionsExcess = contributions - contributionsUsed;
  const mutuaExcess = mutuaTransfer - mutuaUsed;
  const taxesExcess = taxAllocation - taxesUsed;
  reconciles(gapSigned, uncovered - contributionsExcess - mutuaExcess - taxesExcess, 'Funding needs and earmarked excesses');
  return { priceFactor, benefits, ssBenefits, cpBenefits, contributions, taxAllocation, mutuaTransfer, gapSigned,
    remainingNeed: uncovered, surplus: Math.max(0, -gapSigned),
    contributionsUsed, mutuaUsed, taxesUsed, cpTaxTransfer, ssTaxTransfer, cpUnfunded, ssUnfunded, uncovered,
    contributionsExcess, mutuaExcess, taxesExcess };
}
