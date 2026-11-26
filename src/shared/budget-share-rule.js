// The budget rule of the tax measures, without the engine's starting data: how much of each
// surcharge goes to pensions through the share of the budget assigned to them. Apart from
// src/shared/scenario-measures.js, which applies it over DEFAULT_CONFIG, so that the labels of
// the scenario bar can tell a share moved by a surcharge from one set by hand without loading
// that data (the home page reads those labels: tests/storage-ids.test.mjs). Pure.

/**
 * Budget share gained by pensions per unit of each measure (surcharge as a
 * fraction, IRPF points on high incomes, cut of other spending as a fraction).
 *
 * All five are assumptions of the simulator, not derived in the code. They were set before
 * the v10 revenue bases (pensiones_lab_2 1.19, unified in 1.27.1) and no source for them is known.
 * Checked against the 2026 opening (docs/modelo/02-ingresos-gasto.md, 2.9):
 * - they are not «half of the extra revenue goes to pensions». A unit surcharge adds 0.295 (IRPF),
 *   0.209 (VAT) and 0.165 (other taxes) of the allocatable revenue, so half would be 0.148, 0.105
 *   and 0.083; with the engine's 2027 response it is 0.128, 0.103 and 0.081. A unit of IRPF points
 *   on high incomes adds 0.256, so half would be 0.128, not 0.06;
 * - the cut coefficient is not the engine's saving either: a unit cut saves the eligible spending,
 *   0.563 of the allocatable revenue in 2027. src/domain/consola-measures.js uses that exact ratio.
 * tests/budget-share-sources.test.mjs keeps these figures in view.
 */
export const PENSION_SHARE_PER_UNIT = Object.freeze({
  irpfSurcharge: 0.14,
  vatSurcharge: 0.11,
  otherTaxSurcharge: 0.08,
  irpfExtraPoints: 0.06,
  otherSpendingCut: 0.52
});

/** IRPF points on high incomes from 2027 (the fiscal experiments' instrument). */
const extraIrpfPoints = config => (config.fiscalRescues ?? []).find(r => r.year === 2027)?.irpfExtraPoints ?? 0;

/** Share of the budget that the tax measures of `config` add to pensions. */
export function taxShareForPensions(config) {
  const k = PENSION_SHARE_PER_UNIT;
  return (config.irpfSurcharge ?? 0) * k.irpfSurcharge + (config.vatSurcharge ?? 0) * k.vatSurcharge
    + (config.otherTaxSurcharge ?? 0) * k.otherTaxSurcharge + extraIrpfPoints(config) * k.irpfExtraPoints;
}

/**
 * The budget share for pensions after the tax measures and a cut of other spending, from the share of `defaults`.
 * With no measure the starting share comes back as it is, without rounding: a surcharge raised and set back
 * to 0 leaves the scenario, and its simulation key, as they were (docs/REVISION-LABORATORIO-TRES-VISTAS-2026-11-16.md, A11).
 */
export function budgetShareAfter(config, defaults, otherSpendingCut = 0) {
  const extra = otherSpendingCut * PENSION_SHARE_PER_UNIT.otherSpendingCut + taxShareForPensions(config);
  if (Math.abs(extra) < 1e-9) return Math.min(1, defaults.pensionBudgetShare);
  return Math.min(1, Number((defaults.pensionBudgetShare + extra).toFixed(6)));
}

/**
 * Whether the share of the other revenue that goes to pensions was set apart from the rule: the
 * tax surcharges move it by themselves, and that is not a second change of the reader's
 * (with a measure, budgetShareAfter rounds to six decimals; the starting share has more).
 */
export const budgetShareSetApart = (config, defaults) => Math.abs((config.pensionBudgetShare ?? 0) - budgetShareAfter(config, defaults)) > 1e-5;
