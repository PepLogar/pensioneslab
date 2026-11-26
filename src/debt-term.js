/** An average term, discretised into adjacent annual bullet maturities.
 * 7.85 preserves the original Treasury-stock residual-life proxy; it is not
 * an observed issuance plan or a calibrated yield curve by instrument tenor. */
export const DEFAULT_NEW_DEBT_TERM_YEARS = 7.85;

export function debtTermMaturityWeights(termYears = DEFAULT_NEW_DEBT_TERM_YEARS) {
  if (!Number.isFinite(termYears) || termYears < 1 || termYears > 50) {
    throw new RangeError('newDebtTermYears must be between 1 and 50');
  }
  // Preserve both original weights exactly, rather than changing neutral
  // trajectories through 7.85 - 7 floating-point rounding.
  if (termYears === DEFAULT_NEW_DEBT_TERM_YEARS) {
    return Object.freeze([Object.freeze({ years: 7, weight: .15 }), Object.freeze({ years: 8, weight: .85 })]);
  }
  const lower = Math.floor(termYears), upper = Math.ceil(termYears);
  if (lower === upper) return Object.freeze([Object.freeze({ years: lower, weight: 1 })]);
  const upperWeight = termYears - lower;
  return Object.freeze([
    Object.freeze({ years: lower, weight: 1 - upperWeight }),
    Object.freeze({ years: upper, weight: upperWeight })
  ]);
}
