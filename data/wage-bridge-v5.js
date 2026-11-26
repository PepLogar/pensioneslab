/** Explicit cross-survey bridge, NOT an observed full-year2026 wage.
 * Source dossier: pensiones_lab_2/data/wages-v5-research.json and pensiones_lab_2/docs/SALARIOS-FMI-v5-INVESTIGACION.md (not copied here).
 * Keep the same temporal bridge in the opening wage and both tax profiles. */
export const WAGE_BRIDGE_V5 = Object.freeze({
  id: 'es-wage-bridge-20261018-v5', informationCutoff: '2026-10-18',
  eaes2024: 29540.26,
  eacl2024: 27558.68, eacl2025: 28410.78,
  aeatLargeEmployerWageYTD2026: .025,
  nominal2024To2026: (28410.78 / 27558.68) * 1.025,
  status: 'EAES2024 level, observed EACL2025/2024 growth, and AEAT January-August2026 CVEC gross-pay-per-recipient growth as a partial-year proxy. Different survey scopes; not an observed2026 economy-wide salary.',
  forward: 'The inherited AR real-wage interpolation remains a scenario. No verified IMF gross-wage series or2028-2031 BdE salary forecast was found.'
});
