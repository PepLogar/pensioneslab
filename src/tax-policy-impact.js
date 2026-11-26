import { TAX_POLICY_ASSUMPTIONS as A } from '../data/tax-policy-assumptions.js';
import { REVENUE_BASES_V4 as D } from '../data/revenue-bases-v4.js';
import { WAGE_BRIDGE_V5 as W } from '../data/wage-bridge-v5.js';

const VAT_KEYS = ['general', 'reduced', 'superReduced'];
const POLICY_KEYS = { general: 'vatGeneralRate', reduced: 'vatReducedRate', superReduced: 'vatSuperReducedRate' };
function number(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`Invalid ${label}`);
  return value;
}
function validPolicy(policy) {
  if (!policy || typeof policy !== 'object') throw new TypeError('A tax policy is required');
  for (const key of VAT_KEYS) number(policy[POLICY_KEYS[key]], 0, 1, POLICY_KEYS[key]);
  number(policy.irpfExtraPoints, 0, .3, 'additional IRPF rate');
  number(policy.irpfThreshold, 0, 1e6, 'real2026 IRPF threshold');
  return policy;
}

/** Nominal marginal IRPF, plus a relative VAT-pool multiplier. All policy
 * rates are fractions; thresholds are annual real2026 euros. No GDP revenue
 * target or outside future outcome enters this calculation. */
export function computeRescueTaxFactors(policy, {
  nominalIncomeIndex = 1, priceIndex = 1, declarantScale = 1, revenueScale = 1
} = {}) {
  validPolicy(policy);
  number(nominalIncomeIndex, 0, Infinity, 'nominal income index');
  number(priceIndex, Number.MIN_VALUE, Infinity, 'price index');
  number(declarantScale, 0, Infinity, 'declarant scale');
  number(revenueScale, 0, Infinity, 'revenue scale');
  const thresholdNominal = policy.irpfThreshold * priceIndex;
  const estimatedTaxableExcess = D.profile2024.reduce((sum, row) => sum +
    row.count * Math.max(0, row.generalBase / row.count * W.nominal2024To2026 * nominalIncomeIndex - thresholdNominal), 0) * declarantScale;
  const base = A.vatFinalExpenditure2025Million;
  const originalVat = VAT_KEYS.reduce((sum, key) => sum + base[key] * A.baselineVatRates[key], 0);
  const vatDelta = VAT_KEYS.reduce((sum, key) => sum + base[key] * (policy[POLICY_KEYS[key]] - A.baselineVatRates[key]), 0);
  return { irpfExtraNominal: estimatedTaxableExcess * policy.irpfExtraPoints * revenueScale,
    vatRelativeChange: vatDelta / originalVat, estimatedTaxableExcess,
    thresholdNominal, assumptionsId: A.id };
}

/** Illustrative personal budget, all amounts in real2026 euros. Twelve equal
 * monthly equivalents; not a legal payslip or regional IRPF calculation. */
export function personalTaxImpact(profile, policy) {
  validPolicy(policy);
  if (!profile || typeof profile !== 'object') throw new TypeError('A personal profile is required');
  const grossAnnual = number(profile.grossAnnual, 0, 1e9, 'annual gross pay');
  const withholdingRate = number(profile.withholdingRate, 0, 1, 'current withholding rate');
  const socialContributionRate = number(profile.socialContributionRate, 0, 1, 'current employee contribution rate');
  const annualSocialContributions = grossAnnual * socialContributionRate;
  const annualWithholding = grossAnnual * withholdingRate;
  const estimatedBase = profile.generalBaseAnnual === undefined;
  const generalBaseAnnual = estimatedBase ? Math.max(0, grossAnnual - annualSocialContributions - 2000)
    : number(profile.generalBaseAnnual, 0, 1e9, 'annual general taxable base');
  const extraAnnualIrpf = Math.max(0, generalBaseAnnual - policy.irpfThreshold) * policy.irpfExtraPoints;
  const annualNetBefore = grossAnnual - annualSocialContributions - annualWithholding;
  const annualNetAfter = annualNetBefore - extraAnnualIrpf;
  const basket = profile.monthlySpending ?? {};
  const vatByCategory = Object.fromEntries(VAT_KEYS.map(key => {
    const before = number(basket[key] ?? 0, 0, 1e9, `monthly ${key} consumption`);
    const after = before * (1 + policy[POLICY_KEYS[key]]) / (1 + A.baselineVatRates[key]);
    return [key, { before, after, change: after - before }];
  }));
  const monthlyBasketBefore = VAT_KEYS.reduce((sum, key) => sum + vatByCategory[key].before, 0);
  const monthlyBasketAfter = VAT_KEYS.reduce((sum, key) => sum + vatByCategory[key].after, 0);
  const monthlyVatCost = monthlyBasketAfter - monthlyBasketBefore;
  const monthlyIrpfCost = extraAnnualIrpf / 12;
  return { grossAnnual, generalBaseAnnual, estimatedBase, annualSocialContributions, annualWithholding,
    extraAnnualIrpf, annualNetBefore, annualNetAfter,
    monthlyNetBefore: annualNetBefore / 12, monthlyNetAfter: annualNetAfter / 12,
    monthlyIrpfCost, monthlyVatCost, monthlyTotalCost: monthlyIrpfCost + monthlyVatCost,
    monthlyBasketBefore, monthlyBasketAfter, vatByCategory,
    monthlyRemainingBefore: annualNetBefore / 12 - monthlyBasketBefore,
    monthlyRemainingAfter: annualNetAfter / 12 - monthlyBasketAfter,
    deductionsExceedSalary: annualNetBefore < 0 || annualNetAfter < 0,
    assumptionsId: A.id };
}
