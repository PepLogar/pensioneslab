// One rule for budget measures, whatever page applies them («¿Cuándo se rompe?»,
// its fiscal experiments or the settings panel): a 2027 pension cut, and tax
// surcharges whose revenue goes to pensions through the share of the budget
// assigned to them. Pure.
import { DEFAULT_CONFIG } from './default-config.js';
import { PENSION_SHARE_PER_UNIT, taxShareForPensions, budgetShareAfter } from './budget-share-rule.js';

// The rule itself lives apart, without this starting data (src/shared/budget-share-rule.js).
export { PENSION_SHARE_PER_UNIT, taxShareForPensions };
const TAX_KEYS = ['irpfSurcharge', 'vatSurcharge', 'otherTaxSurcharge'];

/** The budget share for pensions after the tax measures and a cut of other spending. */
export const pensionBudgetShareWith = (config, otherSpendingCut = 0) => budgetShareAfter(config, DEFAULT_CONFIG, otherSpendingCut);

/** The configuration after applying `patch` (any config keys, plus `publicPensionCut`). */
export function applyMeasures(config, patch) {
  const next = { ...config };
  if (Object.hasOwn(patch, 'publicPensionCut')) {
    const cut = Number(patch.publicPensionCut);
    const existing = (next.paymentAdjustments ?? []).find(p => p.year === 2027);
    const otherCut = existing?.otherSpendingCut ?? 0;
    const others = (next.paymentAdjustments ?? []).filter(p => p.year !== 2027);
    next.paymentAdjustments = cut > 0.0001 || otherCut > 0.0001 ? [{ year: 2027, publicPensionCut: Number(cut.toFixed(6)), otherSpendingCut: otherCut }, ...others] : others;
  }
  for (const [key, value] of Object.entries(patch)) if (key !== 'publicPensionCut') next[key] = value;
  if (!Object.hasOwn(patch, 'pensionBudgetShare') && TAX_KEYS.some(key => Object.hasOwn(patch, key))) {
    const existing = (next.paymentAdjustments ?? []).find(p => p.year === 2027);
    next.pensionBudgetShare = pensionBudgetShareWith(next, existing?.otherSpendingCut ?? 0);
  }
  return next;
}

/** Where the clock goes when a measure is applied with it still on the base year, so
 * its effect shows: the year the scenario broke before the measure, or 2050 if it held.
 * Until 1.51 it was always 2035, then the year «seguir igual» broke. */
export function clockYearAfterMeasure(breakYear) {
  return Number.isFinite(breakYear) ? breakYear : 2050;
}
