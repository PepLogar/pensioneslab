/** Nominal cash-flow valuation of a hypothetical opening debt exchange.
 * Match the fiscal ledger: a full coupon for each year before maturity, then
 * half a coupon and principal halfway through the maturity year. No new issues,
 * buybacks, default probabilities or refinancing receipts enter this comparison.
 * Both contracts use the SAME independent, flat nominal required return. */
export function valueCreditorExchange(previous, policy) {
  const year = policy?.year, discountRate = policy?.creditorDiscountRate;
  if (!Number.isInteger(year) || !Number.isFinite(discountRate) || discountRate < 0 || discountRate > .30 ||
      !Number.isFinite(policy?.haircut) || policy.haircut < 0 || policy.haircut > 1 ||
      !Number.isInteger(policy?.termYears) || policy.termYears < 1 || policy.termYears > 50 ||
      !Number.isFinite(policy?.nominalRate) || policy.nominalRate < 0 || policy.nominalRate > .30 ||
      !Number.isFinite(previous?.debt) || previous.debt < 0 ||
      !Number.isFinite(previous?.priceIndex) || previous.priceIndex <= 0 ||
      !Array.isArray(previous?.debtVintageLedger)) throw new RangeError('Invalid creditor valuation inputs');
  const old = previous.debtVintageLedger;
  for (const row of old) {
    if (!Number.isInteger(row.maturityYear) || row.maturityYear < year ||
        !Number.isFinite(row.principalNominal) || row.principalNominal < 0 ||
        !Number.isFinite(row.nominalRate) || row.nominalRate < 0) throw new RangeError('Invalid opening debt vintage');
  }
  const originalPrincipalNominal = old.reduce((sum, row) => sum + row.principalNominal, 0);
  if (Math.abs(originalPrincipalNominal - previous.debt * previous.priceIndex) >
      Math.max(.01, originalPrincipalNominal * 1e-10)) throw new RangeError('Creditor face value differs from public debt');
  const newPrincipalNominal = originalPrincipalNominal * (1 - policy.haircut);
  const maturityYear = year + policy.termYears;
  const finalYear = Math.max(maturityYear, year, ...old.map(row => row.maturityYear));
  const schedule = [];
  let oldPresentValueNominal = 0, newPresentValueNominal = 0;
  let oldTotalCouponsNominal = 0, newTotalCouponsNominal = 0;
  for (let calendarYear = year; calendarYear <= finalYear; calendarYear++) {
    let oldCouponNominal = 0, newCouponNominal = 0, oldPrincipalNominal = 0, newPaymentPrincipalNominal = 0;
    for (const row of old) {
      if (row.maturityYear < calendarYear) continue;
      const matures = row.maturityYear === calendarYear;
      const coupon = row.principalNominal * row.nominalRate * (matures ? .5 : 1);
      const principal = matures ? row.principalNominal : 0;
      oldCouponNominal += coupon;
      oldPrincipalNominal += principal;
      oldPresentValueNominal += (coupon + principal) /
        (1 + discountRate) ** (calendarYear - year + (matures ? .5 : 1));
    }
    if (calendarYear <= maturityYear) {
      const matures = calendarYear === maturityYear;
      newCouponNominal = newPrincipalNominal * policy.nominalRate * (matures ? .5 : 1);
      newPaymentPrincipalNominal = matures ? newPrincipalNominal : 0;
      newPresentValueNominal += (newCouponNominal + newPaymentPrincipalNominal) /
        (1 + discountRate) ** (calendarYear - year + (matures ? .5 : 1));
    }
    oldTotalCouponsNominal += oldCouponNominal;
    newTotalCouponsNominal += newCouponNominal;
    schedule.push({ year: calendarYear, oldCouponNominal, newCouponNominal,
      oldPrincipalNominal, newPrincipalNominal: newPaymentPrincipalNominal });
  }
  return {
    discountRate, originalPrincipalNominal, newPrincipalNominal,
    oldPresentValueNominal, newPresentValueNominal,
    economicLossNominal: oldPresentValueNominal - newPresentValueNominal,
    oldFirstCouponNominal: schedule[0].oldCouponNominal,
    newFirstCouponNominal: schedule[0].newCouponNominal,
    oldTotalCouponsNominal, newTotalCouponsNominal,
    oldWeightedMaturityYears: originalPrincipalNominal > 0 ? old.reduce((sum, row) =>
      sum + row.principalNominal * (row.maturityYear - year + .5), 0) / originalPrincipalNominal : 0,
    newMaturityYears: newPrincipalNominal > 0 ? policy.termYears + .5 : 0,
    maturityYear, schedule,
    timing: 'year-end-coupons-and-midyear-final-coupon-and-principal',
    scope: 'opening-debt-contract-only-no-new-issues-or-buybacks'
  };
}
