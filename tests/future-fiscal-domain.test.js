import test from 'node:test';
import assert from 'node:assert/strict';
import { createFiscalCompositionV10 } from '../src/fiscal-composition-v10.js';
import { CURRENT_SPAIN, DEFAULT_CONFIG } from '../src/model-current-v10.js';
const base = CURRENT_SPAIN.base;
const engine = createFiscalCompositionV10(base);
const context = fraction => ({ year: 2027, gdp: base.gdp * fraction,
  realPayroll: base.workers * base.wage * fraction, priceIndex: 1.02,
  workers: base.workers * fraction, retirees: base.retirees, config: DEFAULT_CONFIG,
  totalPensionBenefits: base.publicPensionBenefits,
  totalPensionContributions: base.pensionContributions * fraction,
  spendingGDP: base.gdp, spendingGDP2028: null, gdp2028: null });

test('rejects impossible public/total compensation instead of fabricating a floor or cutting wages silently', () => {
  assert.throws(() => engine.accounts(context(.2)), /remuneración total por debajo/);
  assert.ok(engine.accounts(context(.9)).generalTaxRevenueOverride > 0);
});
