const protectedMutuaOf = (f, mutuaPensionTransfer) => Math.max(0, (f.mutuaContributions ?? 0) - mutuaPensionTransfer);

/** Scope of a hypothetical cut in other public services/transfers/investment.
 * Values are real annual flows. Protected pools are exclusions, not new costs. */
export function paymentSpendingAdjustment(values, mutuaPensionTransfer, policy) {
  if (!policy || (!policy.publicPensionCut && !policy.otherSpendingCut)) return {};
  const f = values.fiscalComposition;
  // Protect wages including paired D122/D612, matched programmes and the mutual
  // contribution pool already earmarked outside pensions. The latter is a
  // conservative scope proxy, not a measured SEC expenditure decomposition.
  const protectedMutuaScope = protectedMutuaOf(f, mutuaPensionTransfer);
  const eligible = Math.max(0, values.otherPrimarySpendingOverride - f.publicEmployeeCompensation -
    f.temporaryMatchedSpending - protectedMutuaScope);
  const reduction = eligible * policy.otherSpendingCut;
  return {
    otherPrimarySpendingOverride: values.otherPrimarySpendingOverride - reduction,
    fiscalComposition: { ...f, remainingOtherPrimarySpending: f.remainingOtherPrimarySpending - reduction },
    paymentSpendingAdjustment: { otherSpendingBeforeAdjustment: values.otherPrimarySpendingOverride,
      otherSpendingEligible: eligible, otherSpendingReduction: reduction,
      protectedPublicCompensation: f.publicEmployeeCompensation,
      protectedMatchedSpending: f.temporaryMatchedSpending, protectedMutuaScope }
  };
}

/**
 * The same base read from a year of a run, for accounts that need no engine run (the cost of a
 * recipe in Comparar's who-pays section). In a run without a cut, remainingOtherPrimarySpending is
 * other spending without public wages but with the matched programmes (the Recovery Plan, taken out
 * here), and without what comes after the cut (ageing care, support for displaced workers). tests/who-pays.test.mjs ties it to the rule.
 */
export function otherSpendingEligibleOf(point) {
  if (point.paymentSpendingAdjustment) return point.paymentSpendingAdjustment.otherSpendingEligible;
  const f = point.fiscalComposition ?? {};
  return Math.max(0, (f.remainingOtherPrimarySpending ?? 0) - (f.temporaryMatchedSpending ?? 0) - protectedMutuaOf(f, point.mutuaPensionTransfer ?? 0));
}
