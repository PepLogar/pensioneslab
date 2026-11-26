import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRescueTaxFactors, personalTaxImpact } from '../src/tax-policy-impact.js';

const original = Object.freeze({ year: 2040, vatGeneralRate: .21, vatReducedRate: .10,
  vatSuperReducedRate: .04, irpfExtraPoints: 0, irpfThreshold: 30000 });
const close = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test('dated rescue factors use marginal IRPF above real threshold and weighted VAT types', () => {
  const unchanged = computeRescueTaxFactors(original);
  assert.equal(unchanged.irpfExtraNominal, 0);
  assert.equal(unchanged.vatRelativeChange, 0);
  const policy = Object.freeze({ ...original, vatGeneralRate: .30, irpfExtraPoints: .05 });
  const impact = computeRescueTaxFactors(policy);
  close(impact.vatRelativeChange,
    394493.985 * .09 / (394493.985 * .21 + 237657.778 * .10 + 63284.720 * .04));
  assert.ok(impact.irpfExtraNominal > 0);
  assert.ok(computeRescueTaxFactors({ ...policy, irpfThreshold: 60000 }).irpfExtraNominal < impact.irpfExtraNominal);
  close(computeRescueTaxFactors(policy, { nominalIncomeIndex: 2, priceIndex: 2 }).irpfExtraNominal, impact.irpfExtraNominal * 2);
  close(computeRescueTaxFactors(policy, { declarantScale: 1.1, revenueScale: .8 }).irpfExtraNominal, impact.irpfExtraNominal * .88);
  assert.equal(computeRescueTaxFactors(policy, { revenueScale: 0 }).irpfExtraNominal, 0);
});

test('illustrative payslip and basket keep IVA outside withholding and expose impossible deductions', () => {
  const profile = Object.freeze({ grossAnnual: 36000, withholdingRate: .15, socialContributionRate: .065,
    generalBaseAnnual: 30000, monthlySpending: Object.freeze({ general: 800, reduced: 300, superReduced: 200 }) });
  const originalJson = JSON.stringify(profile);
  const p = personalTaxImpact(profile, { ...original, vatGeneralRate: .30, irpfExtraPoints: .05, irpfThreshold: 20000 });
  close(p.monthlyNetBefore, 2355);
  close(p.extraAnnualIrpf, 500);
  close(p.monthlyNetAfter, 2355 - 500 / 12);
  close(p.monthlyVatCost, 800 * .09 / 1.21);
  close(p.monthlyRemainingBefore - p.monthlyRemainingAfter, p.monthlyTotalCost);
  assert.equal(p.estimatedBase, false);
  assert.equal(personalTaxImpact(profile, { ...original, irpfExtraPoints: .05 }).extraAnnualIrpf, 0);
  const invalidDeductions = personalTaxImpact({ ...profile, withholdingRate: .99 }, original);
  assert.equal(invalidDeductions.deductionsExceedSalary, true);
  assert.ok(invalidDeductions.monthlyNetAfter < 0);
  assert.equal(JSON.stringify(profile), originalJson);
  assert.throws(() => personalTaxImpact({ ...profile, grossAnnual: NaN }, original), RangeError);
  assert.throws(() => computeRescueTaxFactors({ ...original, irpfExtraPoints: 5 }), RangeError);
});
