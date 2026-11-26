// The pension that could be paid once a system breaks: next to the promised one,
// never instead of it. It is an editable assumption of the simulator, like the
// narrative of rescue and haircut (src/shared/crisis-narrative.js), and it does
// not change the engine's path. Official references (European Commission;
// data/sources/audit-pension-pagable-2026/): Portugal suspended the indexation of
// pensions from 2011 to 2015, except the lowest ones (Institutional Paper 040);
// in Greece the recalculation cut 1,4 of its 2 million retirees by 14 % on average,
// ≈ 10 % over all of them (study of the 2010–2018 pension reforms). Pure functions.

import { shortRunInflationRate } from './short-run-employment.js';

export const PAYABLE_PENSION_DEFAULTS = Object.freeze({
  // Years with pensions frozen in euros from the rescue year (they lose inflation):
  // Portugal, 2011–2015 (since 1.41; 3 before).
  payablePensionFreezeYears: 4,
  // Cut of the pension from the haircut year (0.10 = 10 %).
  payablePensionCut: 0.10
});

export const PAYABLE_PENSION_RANGES = Object.freeze({
  payablePensionFreezeYears: [0, 10, true],
  payablePensionCut: [0, 0.5]
});

/**
 * Share of the promised pension (real euros) that is payable in `year`.
 * 1 before the rescue, or when the system does not break by its debt.
 * @param {number} year
 * @param {{ bailoutYear?, restructuringYear?, defaultYear? }} verdict
 * @param {{ payablePensionFreezeYears?, payablePensionCut?, inflationRate? }} config
 */
export function payablePensionFactor(year, verdict, config = {}) {
  const start = verdict?.bailoutYear ?? verdict?.defaultYear ?? null;
  if (!Number.isInteger(start) || year < start) return 1;
  const freeze = config.payablePensionFreezeYears ?? PAYABLE_PENSION_DEFAULTS.payablePensionFreezeYears;
  const inflation = Number.isFinite(config.inflationRate) ? config.inflationRate : 0.02;
  // Frozen in euros: each frozen year loses that year's inflation, for good (the AIReF's in 2027–2030 when that
  // option is on, as the engine's prices; since 1.72).
  const frozenYears = Math.min(freeze, year - start + 1);
  let factor = 1;
  for (let y = start; y < start + frozenYears; y++) factor /= 1 + (shortRunInflationRate(y, config) ?? inflation);
  const cutFrom = verdict.restructuringYear ?? verdict.defaultYear ?? null;
  if (Number.isInteger(cutFrom) && year >= cutFrom) {
    factor *= 1 - (config.payablePensionCut ?? PAYABLE_PENSION_DEFAULTS.payablePensionCut);
  }
  return factor;
}

/**
 * The payable average pension of a year's row, per retiree and year (real euros). Φ applies to the public part only:
 * the State freezes and cuts its own pensions, not the annuities private funds pay, whose losses come through the
 * engine (fundedRestructuringLoss) (1.82). Falls back to the whole average when a row lacks the split.
 * The funded part leaves out the annuities of people not counted as retirees (noClaim), as averagePensionAnnual does.
 */
export function payablePensionAnnual(row, verdict, config = {}) {
  const factor = payablePensionFactor(row.year, verdict, config);
  const publicPart = row.publicRetirementBenefits, fundedPart = (row.fundedBenefits ?? 0) - (row.fundedBenefitsNoClaim ?? 0);
  if (!(row.retirees > 0) || !Number.isFinite(publicPart)) return row.averagePensionAnnual * factor;
  return (publicPart * factor + fundedPart) / row.retirees;
}
