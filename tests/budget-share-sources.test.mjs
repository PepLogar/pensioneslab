// The share of the other revenue that goes to pensions, without unsourced constants (docs/modelo/02-ingresos-gasto.md,
// 2.9 and 2.10). The budget partitioner takes its reference share from the starting data and the engine's scope
// of a cut; the coefficients of the measures' rule stay as stated assumptions, and the figures they were
// compared with are checked here, so a change of data that moves them shows up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, PENSION_SHARE_SCALE } from '../src/shared/default-config.js';
import { describeTrainJourney } from '../src/train-journey.js';
import { otherSpendingEligibleOf } from '../src/payment-spending-adjustment.js';
import { PENSION_SHARE_PER_UNIT, budgetShareAfter } from '../src/shared/budget-share-rule.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
// Since 1.73 the Recovery Plan grants stay out of the base, and the starting share applies with PENSION_SHARE_SCALE.
const allocatableOf = p => p.generalTaxRevenue - p.fiscalComposition.imputedSocialContributions - p.fiscalComposition.mutuaContributions -
  p.fiscalComposition.temporaryMatchedRevenue;
const budgetsOf = config => {
  const result = simulate(config);
  return { result, stations: describeTrainJourney(result, { config, selectedYear: 2026 }).stations };
};

test('the partitioner\'s reference transfer uses the starting share and the engine\'s eligible spending', () => {
  for (const config of [DEFAULT_CONFIG, { ...DEFAULT_CONFIG, paymentAdjustments: [{ year: 2027, publicPensionCut: 0, otherSpendingCut: 0.05 }] }]) {
    const { result, stations } = budgetsOf(config);
    for (const year of [2026, 2027, 2050]) {
      const point = result.years.find(y => y.year === year);
      const budget = stations.find(s => s.year === year).seismic.budget;
      const f = budget.priceFactor;
      close(budget.baseTaxTransfer, budget.allocatableRevenue * DEFAULT_CONFIG.pensionBudgetShare * PENSION_SHARE_SCALE, 1e-3, `${year} reference transfer`);
      close(budget.allocatableRevenue, allocatableOf(point) * f, 1e-3, `${year} allocatable revenue`);
      close(budget.eligiblePool, otherSpendingEligibleOf(point) * f, 1e-3, `${year} eligible spending`);
    }
  }
  // In 2026 the reference transfer is the State's resources assigned to pensions (66.069 M€).
  const opening = budgetsOf(DEFAULT_CONFIG).stations.find(s => s.year === 2026).seismic.budget;
  close(opening.baseTaxTransfer / 1e6, 66069, 1, '2026 reference transfer, M€');
});

test('a year without a cut gives the same eligible spending as the engine computes with one', () => {
  const tiny = { ...DEFAULT_CONFIG, paymentAdjustments: [{ year: 2027, publicPensionCut: 0, otherSpendingCut: 1e-6 }] };
  const withCut = simulate(tiny).years.find(y => y.year === 2027);
  const without = simulate(DEFAULT_CONFIG).years.find(y => y.year === 2027);
  assert.ok(withCut.paymentSpendingAdjustment && !without.paymentSpendingAdjustment);
  close(otherSpendingEligibleOf(without) / withCut.paymentSpendingAdjustment.otherSpendingEligible, 1, 1e-6, 'eligible spending');
});

test('the measures\' coefficients are assumptions, not half of the extra revenue', () => {
  const p = simulate(DEFAULT_CONFIG).years.find(y => y.year === 2026);
  // The base in units of the starting share: without the grants, times the scale (as the 2026 opening).
  const alloc = allocatableOf(p) * PENSION_SHARE_SCALE;
  const fc = p.fiscalComposition;
  const opening = { irpfSurcharge: fc.personalIncomeTax / alloc, vatSurcharge: fc.vatLikeTaxes / alloc, otherTaxSurcharge: fc.remainingTaxes / alloc };
  close(opening.irpfSurcharge, 0.295, 0.001, 'IRPF share of the allocatable revenue');
  close(opening.vatSurcharge, 0.209, 0.001, 'VAT share');
  close(opening.otherTaxSurcharge, 0.165, 0.001, 'other taxes share');
  // Near half, but not equal to it once rounded: the rule is not «half goes to pensions».
  assert.notDeepEqual(Object.fromEntries(Object.entries(opening).map(([k, v]) => [k, Number((v / 2).toFixed(2))])),
    { irpfSurcharge: PENSION_SHARE_PER_UNIT.irpfSurcharge, vatSurcharge: PENSION_SHARE_PER_UNIT.vatSurcharge, otherTaxSurcharge: PENSION_SHARE_PER_UNIT.otherTaxSurcharge });
  // With no measure the starting share comes back untouched.
  assert.equal(budgetShareAfter(DEFAULT_CONFIG, DEFAULT_CONFIG), DEFAULT_CONFIG.pensionBudgetShare);
});
