import { valueCreditorExchange } from './creditor-valuation.js';

/** A hypothetical MARKET-VALUE exposure to a pro-rata slice of opening public
 * debt. An exchange changes that slice's value through principal, coupon and
 * maturity. Existing collective private annuities have no external guarantee:
 * their reserves and payment rates absorb the SAME proportional value change.
 * Mutates only fundedAssets and the fundedAnnual of already retired cohorts.
 * A signed loss can be negative (gain); it is not another public cash expense. */
export function applyCreditorFundLoss(cohorts, previous, policy) {
  const share = policy?.fundedSovereignShare, haircut = policy?.haircut;
  if (!Array.isArray(cohorts) || !Number.isFinite(share) || share < 0 || share > 1 ||
      !Number.isFinite(haircut) || haircut < 0 || haircut > 1 ||
      !Number.isFinite(previous?.debt) || previous.debt < 0 ||
      !Number.isFinite(previous?.priceIndex) || previous.priceIndex <= 0) {
    throw new RangeError('Invalid funded sovereign loss inputs');
  }
  let openingFundedAssetsReal = 0, activeAssets = 0, retiredAssets = 0, retiredAnnual = 0;
  for (const cohort of cohorts) {
    if (!Number.isFinite(cohort.size) || cohort.size < 0 ||
        !Number.isFinite(cohort.fundedAssets) || cohort.fundedAssets < 0 ||
        (cohort.retired && (!Number.isFinite(cohort.fundedAnnual) || cohort.fundedAnnual < 0))) {
      throw new RangeError('Invalid funded pension cohort');
    }
    const assets = cohort.fundedAssets * cohort.size;
    openingFundedAssetsReal += assets;
    if (cohort.retired) {
      retiredAssets += assets;
      retiredAnnual += cohort.fundedAnnual * cohort.size;
    } else activeAssets += assets;
  }
  const valuation = valueCreditorExchange(previous, policy);
  const price = previous.priceIndex;
  const requestedExposureNominal = openingFundedAssetsReal * share * price;
  // A captive fund (policy.faceValueOnly) holds the bonds at face value: its book value is their principal, so
  // the haircut takes exactly that share of it, whatever the discount rate (1.76; docs/REVISION-ADVERSARIAL-2026-11-25.md, 4).
  // Otherwise the exposure is a market-value slice converted to face through the old present value.
  const exposureMarketNominal = policy.faceValueOnly
    ? Math.min(requestedExposureNominal, valuation.originalPrincipalNominal)
    : Math.min(requestedExposureNominal, valuation.oldPresentValueNominal);
  const ownershipShare = policy.faceValueOnly
    ? (valuation.originalPrincipalNominal > 0 ? exposureMarketNominal / valuation.originalPrincipalNominal : 0)
    : (valuation.oldPresentValueNominal > 0 ? exposureMarketNominal / valuation.oldPresentValueNominal : 0);
  const exposureNominal = valuation.originalPrincipalNominal * ownershipShare;
  const lossNominal = exposureNominal * haircut;
  const fundedHaircutLoss = lossNominal / price;
  // A captive fund keeps the exchanged bonds and earns their new coupons (src/progressive-transition.js, since 1.74):
  // the haircut takes only their face value, or the lower coupons would count twice (since 1.75; policy.faceValueOnly).
  const fundedEconomicLossNominal = policy.faceValueOnly ? lossNominal : valuation.economicLossNominal * ownershipShare;
  const fundedRestructuringLoss = fundedEconomicLossNominal / price;
  const fundedTermsLoss = fundedRestructuringLoss - fundedHaircutLoss;
  const lossShare = openingFundedAssetsReal > 0 ? fundedRestructuringLoss / openingFundedAssetsReal : 0;
  // Keep the zero-exposure/equal-contract arithmetic literally unchanged.
  if (lossShare !== 0) {
    // A total write-off cannot leave negative reserves through round-off in
    // exposure / PV * PV. Economically lossShare is bounded above by one.
    const remainingShare = Math.max(0, 1 - lossShare);
    for (const cohort of cohorts) {
      cohort.fundedAssets *= remainingShare;
      // The capital kept for the «preserve capital» reading loses the same share (since 1.72; review, 5).
      if (Number.isFinite(cohort.preservedFundedAssets)) cohort.preservedFundedAssets *= remainingShare;
      if (cohort.retired) cohort.fundedAnnual *= remainingShare;
    }
  }
  const totalHaircutNominal = previous.debt * price * haircut;
  return { fundedHaircutLoss, fundedTermsLoss, fundedRestructuringLoss, creditorFundLoss: {
    openingFundedAssetsReal, requestedShare: share,
    effectiveShare: openingFundedAssetsReal > 0 ? exposureMarketNominal / price / openingFundedAssetsReal : 0,
    exposureNominal, exposureMarketNominal, lossNominal, totalHaircutNominal,
    remainingCreditorLossNominal: Math.max(0, totalHaircutNominal - lossNominal),
    activeLossReal: activeAssets * lossShare, retiredLossReal: retiredAssets * lossShare,
    privateAnnualReductionReal: retiredAnnual * lossShare,
    capped: requestedExposureNominal > (policy.faceValueOnly ? valuation.originalPrincipalNominal : valuation.oldPresentValueNominal),
    valuation: { ...valuation, ownershipShare, fundedEconomicLossNominal,
      remainingEconomicLossNominal: valuation.economicLossNominal - fundedEconomicLossNominal,
      fundedTermsLossNominal: fundedTermsLoss * price }
  } };
}
