// The books every run must keep, year after year: the fund, the public budget, the debt and its vintages,
// the cash and the one destination of each contribution. Shared by the 1985 counterfactual
// (tests/retrospective-accounting.test.mjs) and the forward engine (tests/adversarial-review-batch4.test.mjs;
// docs/REVISION-ADVERSARIAL-2026-11-24.md, 34).

// ≈ 1e-13 relative: float noise of sums over ~10⁵ cohorts, still an exact identity in practice.
export const ledgerTolerance = (a, b) => Math.max(.02, Number.EPSILON * Math.max(Math.abs(a), Math.abs(b)) * 512);

/** The identities that fail, as sentences; [] when the books hold. `rows` are consecutive years. */
export function ledgerFailures(rows) {
  const failures = [];
  const check = (actual, expected, what) => {
    if (!(Math.abs(actual - expected) <= ledgerTolerance(actual, expected))) failures.push(`${what}: ${actual} != ${expected}`);
  };
  for (let i = 1; i < rows.length; i++) {
    const p = rows[i], previous = rows[i - 1];
    if (p.year !== previous.year + 1) failures.push(`year ${p.year} after ${previous.year}`);
    check(p.fundedAssetsStart, previous.fundedAssets, `fund continuity ${p.year}`);
    check(p.totalContributions, p.publicContributions + p.fundedContributions, `one allocation ${p.year}`);
    check(p.fundedAssets, p.fundedAssetsStart + p.fundedContributions + (p.fundedExternalContributions ?? 0) + (p.fundedReserveTransfers ?? 0) +
      p.fundedInvestmentReturn - p.fundedBenefits - p.fundedBequests - p.fundedRestructuringLoss, `fund ledger ${p.year}`);
    check(p.stateBalance, p.totalPublicRevenue - p.publicBenefits - p.otherPrimarySpending - p.interest, `public budget ${p.year}`);
    check(p.openingDebtReal * p.priceIndex, previous.debt * previous.priceIndex, `nominal debt continuity ${p.year}`);
    check(p.debt, p.openingDebtReal + p.debtAdded - p.debtRepaid - (p.debtWrittenOff ?? 0), `debt ledger ${p.year}`);
    check(p.cash, p.openingCashReal + p.cashAdded - p.cashUsed, `cash ledger ${p.year}`);
    check(p.debtVintageLedger.reduce((sum, row) => sum + row.principalNominal, 0), p.debt * p.priceIndex, `vintage ledger ${p.year}`);
  }
  return failures;
}
