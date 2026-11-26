import { TREASURY_TERM_CURVE_2026 } from '../data/treasury-term-curve-2026.js';
import { DEFAULT_NEW_DEBT_TERM_YEARS, debtTermMaturityWeights } from './debt-term.js';
import { sovereignRiskPremium } from './sovereign-risk-premium.js';

export const TREASURY_TERM_REFERENCE_YEARS = DEFAULT_NEW_DEBT_TERM_YEARS;

function checkedCurve(curve) {
  if (!curve || !Array.isArray(curve.nodes) || curve.nodes.length < 2) {
    throw new TypeError('A Treasury reference curve with at least two nodes is required');
  }
  let previous = 0;
  for (const row of curve.nodes) {
    if (!Number.isFinite(row.years) || row.years <= previous ||
        !Number.isFinite(row.yieldRate) || row.yieldRate <= -1 || row.yieldRate >= 1) {
      throw new RangeError('Invalid Treasury reference curve');
    }
    previous = row.years;
  }
  return curve;
}

/** Linear interpolation of observed nominal annual yields, not an estimated
 * zero-coupon curve or a forecast. Beyond the available nodes the last yield
 * is held flat: in the selected source, 30–50 years is an explicit proxy. */
export function treasuryYieldForTerm(termYears, curve = TREASURY_TERM_CURVE_2026) {
  if (!Number.isFinite(termYears) || termYears < 1 || termYears > 50) {
    throw new RangeError('Treasury reference term must be between 1 and 50 years');
  }
  const { nodes } = checkedCurve(curve);
  if (termYears <= nodes[0].years) return nodes[0].yieldRate;
  const last = nodes.at(-1);
  if (termYears >= last.years) return last.yieldRate;
  const upperIndex = nodes.findIndex(row => row.years >= termYears);
  const lower = nodes[upperIndex - 1], upper = nodes[upperIndex];
  const share = (termYears - lower.years) / (upper.years - lower.years);
  return lower.yieldRate + share * (upper.yieldRate - lower.yieldRate);
}

function checkedWeights(input) {
  if (!Array.isArray(input) || !input.length) throw new TypeError('Issuance maturity weights required');
  const seen = new Set();
  const rows = input.map(row => {
    if (!Number.isInteger(row.years) || row.years < 1 || row.years > 50 || seen.has(row.years) ||
        !Number.isFinite(row.weight) || row.weight <= 0) throw new RangeError('Invalid issuance maturity weights');
    seen.add(row.years);
    return { years: row.years, weight: row.weight };
  });
  if (Math.abs(rows.reduce((sum, row) => sum + row.weight, 0) - 1) > 1e-10) {
    throw new RangeError('Issuance maturity weights must sum to one');
  }
  return rows;
}

/** Keep the user's Fisher-converted nominal anchor at the reference mix of
 * 15% seven-year and 85% eight-year issuance. Only the observed DIFFERENCE
 * between tenors is added, never the full Spanish market yield a second time.
 * The separate debt/GDP stress premium is additional to this anchored curve.
 * Each bullet tranche keeps its own coupon; the weighted mean prices funding
 * and the maximum coupon checks authorisation limits. All amounts are rates. */
export function quoteTreasuryTermPricing(openingDebtGDP, config, {
  curve = TREASURY_TERM_CURVE_2026,
  maturityWeights = debtTermMaturityWeights(config?.newDebtTermYears)
} = {}) {
  checkedCurve(curve);
  const weights = checkedWeights(maturityWeights);
  const referenceTreasuryYieldRate = debtTermMaturityWeights(TREASURY_TERM_REFERENCE_YEARS)
    .reduce((sum, row) => sum + row.weight * treasuryYieldForTerm(row.years, curve), 0);
  const risk = sovereignRiskPremium(openingDebtGDP, config);
  const anchorNominalRate = risk.baseNominalRate;
  const tranches = weights.map(row => {
    const treasuryYieldRate = treasuryYieldForTerm(row.years, curve);
    const termSpreadRate = treasuryYieldRate - referenceTreasuryYieldRate;
    const baseNominalRate = anchorNominalRate + termSpreadRate;
    const nominalRate = baseNominalRate + risk.premiumRate;
    if (!Number.isFinite(nominalRate) || nominalRate <= -1 || nominalRate >= 1) {
      throw new RangeError('Invalid term-adjusted issuance rate');
    }
    return Object.freeze({ ...row, treasuryYieldRate, termSpreadRate, baseNominalRate, nominalRate });
  });
  const weighted = key => tranches.reduce((sum, row) => sum + row.weight * row[key], 0);
  const termSpreadRate = weighted('termSpreadRate');
  const baseNominalRate = anchorNominalRate + termSpreadRate;
  return Object.freeze({ ...risk,
    // Preserve the existing equation baseNominalRate + premiumRate = nominalRate.
    // anchorNominalRate is the original user setting before the tenor adjustment.
    anchorNominalRate, termSpreadRate, baseNominalRate,
    impliedRiskFreeRate: baseNominalRate - risk.referenceSpreadRate,
    nominalRate: baseNominalRate + risk.premiumRate,
    maxNominalRate: Math.max(...tranches.map(row => row.nominalRate)),
    treasuryYieldRate: weighted('treasuryYieldRate'), referenceTreasuryYieldRate,
    referenceTermYears: TREASURY_TERM_REFERENCE_YEARS,
    newDebtTermYears: weighted('years'),
    curveId: curve.id ?? null,
    curveDate: curve.observationDate ?? null,
    observationDate: curve.observationDate ?? null,
    curvePublicationDate: curve.publicationDate ?? null,
    curveFirstTermYears: curve.nodes[0].years,
    curveLastTermYears: curve.nodes.at(-1).years,
    flatTail: weights.some(row => row.years > curve.nodes.at(-1).years),
    flatFront: weights.some(row => row.years < curve.nodes[0].years),
    tranches: Object.freeze(tranches)
  });
}
