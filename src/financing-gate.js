/** Decision layer over the unchanged fiscal projection. Borrowing in a row is
 * a requirement under assumed access to credit, not a loan already approved.
 * Ratios never determine payment default here. */
import { priceFactorFor } from './fiscal-display-v8.js';

const BASE_YEAR = 2026;
// Ignore numerical residues, not material financing needs. Base-year euros.
export const FUNDING_TOLERANCE = 1;

function finite(value, name, minimum = -Infinity) {
  if (!Number.isFinite(value) || value < minimum) throw new RangeError(`Invalid funding value: ${name}`);
  return value;
}
function dated(point, baseYear) {
  if (!Number.isInteger(baseYear) || baseYear < 1 || !point ||
      !Number.isInteger(point.year) || point.year < baseYear) {
    throw new RangeError('A dated fiscal point at or after the base year is required');
  }
}

export function needsFundingDecision(point, { baseYear = BASE_YEAR } = {}) {
  dated(point, baseYear);
  return point.year !== baseYear && finite(point.debtAdded, 'debtAdded', 0) > FUNDING_TOLERANCE;
}

/** Nominal amounts for the year shown. Removing additional issuance also
 * removes its half-year interest, including negative interest. Refinancing
 * remains available in this counterfactual, and is shown separately.
 * No balances, loans, write-offs or approved decisions are mutated. */
export function describeFundingDecision(point, { inflationRate, baseYear = BASE_YEAR } = {}) {
  dated(point, baseYear);
  const priceFactor = priceFactorFor(point, { inflationRate, baseYear });
  const isBase = point.year === baseYear;
  const requiresDecision = needsFundingDecision(point, { baseYear });
  const interestNominal = finite(point.interest, 'interest') * priceFactor;
  const budgetBalanceNominal = finite(point.stateBalance, 'stateBalance') * priceFactor;
  if (isBase) return {
    year: point.year, isBase, priceFactor, requiresDecision,
    interestNominal, budgetBalanceNominal,
    newBorrowingNominal: null, refinancingNominal: null, grossIssuanceNominal: null,
    openingCashNominal: null, financialAdjustmentNominal: null,
    financingNeedNominal: null, interestOnAdditionalBorrowingNominal: null,
    interestWithoutNewLoanNominal: null, budgetBalanceWithoutNewLoanNominal: null,
    budgetUnfundedWithoutNewLoanNominal: null, netUnfundedWithoutNewLoanNominal: null
  };

  const newBorrowingNominal = finite(point.debtAdded, 'debtAdded', 0) * priceFactor;
  const refinancingNominal = finite(point.debtRefinanced, 'debtRefinanced', 0) * priceFactor;
  const openingCashNominal = finite(point.openingCashReal, 'openingCashReal', 0) * priceFactor;
  const financialAdjustmentNominal = finite(point.stockFlowAdjustment, 'stockFlowAdjustment') * priceFactor;
  const nominalRate = finite(point.targetNominalInterestRate, 'targetNominalInterestRate');
  if (nominalRate <= -1 || nominalRate >= 1) throw new RangeError('Invalid funding issuance rate');
  const interestOnAdditionalBorrowingNominal = .5 * newBorrowingNominal * nominalRate;
  const interestWithoutNewLoanNominal = interestNominal - interestOnAdditionalBorrowingNominal;
  const budgetBalanceWithoutNewLoanNominal = budgetBalanceNominal + interestOnAdditionalBorrowingNominal;

  return {
    year: point.year, isBase, priceFactor, requiresDecision,
    interestNominal, budgetBalanceNominal, newBorrowingNominal, refinancingNominal,
    grossIssuanceNominal: newBorrowingNominal + refinancingNominal,
    openingCashNominal, financialAdjustmentNominal,
    financingNeedNominal: -budgetBalanceNominal + financialAdjustmentNominal,
    interestOnAdditionalBorrowingNominal, interestWithoutNewLoanNominal,
    budgetBalanceWithoutNewLoanNominal,
    // Budget payments and financial-asset transactions are different concepts.
    // A blocked asset purchase alone does not establish payment default.
    budgetUnfundedWithoutNewLoanNominal: Math.max(0, -budgetBalanceWithoutNewLoanNominal - openingCashNominal),
    netUnfundedWithoutNewLoanNominal: Math.max(0,
      -budgetBalanceWithoutNewLoanNominal + financialAdjustmentNominal - openingCashNominal)
  };
}

/** Earliest *future* financing decision. Call needsFundingDecision separately
 * for the current year before starting Play; approvals belong to the caller. */
export function nextFundingYear(currentYear, years, { baseYear = BASE_YEAR } = {}) {
  if (!Number.isInteger(currentYear) || currentYear < baseYear || !Array.isArray(years)) {
    throw new RangeError('A current year and annual fiscal rows are required');
  }
  let next = null;
  for (const point of years) {
    dated(point, baseYear);
    if (point.year > currentYear && needsFundingDecision(point, { baseYear }) &&
        (next === null || point.year < next)) next = point.year;
  }
  return next;
}
