import { describePensionFunding } from './fiscal-display-v9.js';

/** Annual PUBLIC pension funding in the station's nominal euros. These are
 * resources actually used for pensions, not all assigned receipts. Mutual
 * transfers already belong to consolidated revenue; never add them again to
 * State income or debt. Earmarked excesses cannot cancel another payer's need.
 * Severity is a shared visual scale for the unpaid share, not a legal limit. */
export function describeTrainPensionFunding(point, { priceFactor = 1 } = {}) {
  const funding = describePensionFunding(point, { priceFactor });
  const cost = funding.benefits;
  const contributions = funding.contributionsUsed;
  const mutuas = funding.mutuaUsed;
  const taxes = funding.taxesUsed;
  const missing = funding.uncovered;
  const share = amount => cost > 0 ? Math.min(1, Math.max(0, amount / cost)) : 0;
  const missingShare = share(missing);
  // Institutional allocations can put an exact threshold a few machine
  // decimals above its boundary. Only the colour comparison gets a tolerance;
  // the amounts and shares keep the accounts' original precision.
  const atMost = threshold => missingShare <= threshold + Number.EPSILON * 16;
  const severity = missingShare === 0 ? 'none' : atMost(.05) ? 'low' :
    atMost(.15) ? 'medium' : atMost(.30) ? 'high' : 'critical';
  return {
    cost, contributions, mutuas, contributionsAndMutuas: contributions + mutuas,
    taxes, missing, missingShare,
    contributionShare: share(contributions + mutuas), taxShare: share(taxes),
    fundingShares: {
      contributions: share(contributions), mutuas: share(mutuas), taxes: share(taxes), missing: missingShare
    },
    excess: {
      contributions: funding.contributionsExcess, mutuas: funding.mutuaExcess, taxes: funding.taxesExcess
    },
    severity
  };
}
