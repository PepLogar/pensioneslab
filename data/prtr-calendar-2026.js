/** Recovery Plan (PRTR, the Recovery and Resilience Facility) in the general government accounts, as a
 * share of GDP. Source: AIReF, Informe de seguimiento 2026 del PFEMP (data/external-forecasts-airef-pfemp-20260514.json):
 * the difference between its tables with PRTR (cuadro 18) and without (cuadros 17 and 19).
 * - Revenue with minus without: 0,8 / 1,2 / 0,3 / 0,2 / 0,1 / 0,0 (2025–2030).
 * - Spending with minus without: 0,8 / 1,3 / 0,3 / 0,2 / 0,1 / 0,0.
 * - The balance is the same in both tables every year: the grants enter as revenue when they are spent.
 * The engine keeps revenue = spending (a matched flow). In 2026 it takes the mean of the two rounded
 * differences (1,25). From 2030 the plan is over: 0.
 * The 2026 opening is the 2025 accounts ×1,055, so it carries the 2025 share (0,8): the engine takes it
 * out of the ordinary residuals and adds each year's share back on both sides.
 */
export const PRTR_2026 = Object.freeze({
  id: 'prtr-airef-pfemp-2026-05-14',
  source: 'AIReF, Informe 24/26 de seguimiento del PFEMP (14/05/2026), cuadros 17, 18 y 19, pág. 67–68',
  openingShare: 0.008,
  shares: Object.freeze({ 2026: 0.0125, 2027: 0.003, 2028: 0.002, 2029: 0.001 }),
  lastYear: 2029
});

export const prtrShare = year => PRTR_2026.shares[year] ?? 0;
