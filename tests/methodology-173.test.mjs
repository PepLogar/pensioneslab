// Methodology 1.73 (docs/DECISIONES.md, 25/11/2026): the Recovery Plan (PRTR) follows the AIReF's calendar,
// the same amount in revenue and spending, out of the revenue a share of which goes to pensions, and out of a cut.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, PENSION_SHARE_SCALE, validateConfig } from '../src/shared/default-config.js';
import { PRTR_2026, prtrShare } from '../data/prtr-calendar-2026.js';

const years = simulate(DEFAULT_CONFIG).years;
const at = y => years.find(r => r.year === y);

test('the PRTR follows its calendar, the same in revenue and spending, and ends in 2030', () => {
  for (const y of [2026, 2027, 2028, 2029, 2030, 2040]) {
    const f = at(y).fiscalComposition;
    assert.ok(Math.abs(f.temporaryMatchedRevenue - prtrShare(y) * at(y).gdp) < 1e-6, `${y} revenue`);
    assert.equal(f.temporaryMatchedSpending, f.temporaryMatchedRevenue, `${y} spending`);
  }
  assert.equal(prtrShare(2026), 0.0125);
  assert.equal(prtrShare(PRTR_2026.lastYear + 1), 0);
});

test('the PRTR grants stay out of the revenue a share of which goes to pensions', () => {
  for (const y of [2026, 2028, 2035]) {
    const p = at(y), f = p.fiscalComposition;
    const base = p.generalTaxRevenue - f.imputedSocialContributions - f.mutuaContributions - f.temporaryMatchedRevenue;
    assert.ok(Math.abs(p.pensionTaxTransfer - base * DEFAULT_CONFIG.pensionBudgetShare * PENSION_SHARE_SCALE) < 1e-3, String(y));
  }
  assert.ok(PENSION_SHARE_SCALE > 1 && PENSION_SHARE_SCALE < 1.03);
});

test('a cut of other spending leaves the PRTR whole', () => {
  const cut = simulate(validateConfig({ ...DEFAULT_CONFIG, paymentAdjustments: [{ year: 2027, publicPensionCut: 0, otherSpendingCut: 0.5 }] })).years;
  const p = cut.find(r => r.year === 2027);
  assert.equal(p.paymentSpendingAdjustment.protectedMatchedSpending, p.fiscalComposition.temporaryMatchedSpending);
  assert.ok(p.fiscalComposition.temporaryMatchedSpending > 0);
});
