// Employment and inflation until 2030 as the AIReF expects (config.airefShortRunEmployment, 1 by default since 1.69; 24/11/2026).
// The AIReF's medium-term path (Informe de seguimiento 2026 del PFEMP, cuadro 16, pág. 46, O) has full-time
// equivalent employment growing 1.9 / 1.8 / 1.6 / 1.5 % in 2027–2030, from migration, and real GDP 2.0 / 1.9 /
// 1.8 / 1.7 %, with productivity almost flat. The simulator's reference employment is the Ageing Report's,
// which grows 0.3–0.6 % from 2028.
// With the option on:
//  - more people enter employment in those years (the year's entrants, young and migrants, times 1 + boost);
//    they stay, work, contribute and later retire like everyone else;
//  - the output per worker and the wage level fall in those years by `productivity`, so real GDP grows as the
//    AIReF's: the newcomers produce and earn somewhat less (S). The level stays lower afterwards and the reference
//    growth rates go on from it. The public spending reference follows the same output per worker. The lower wage
//    reaches everyone employed, not only the newcomers, and with it the new pensions of those already working
//    (about 0.27 points of GDP less pension spending in 2050; declared, docs/REVISION-ADVERSARIAL-2026-11-24.md, 58);
//  - prices rise as the AIReF's GDP deflator, 2.6 / 2.3 / 2.1 / 2.0 % (the scenario's inflation from 2031), with the
//    same nominal interest rates, so a little more of the debt already issued is eroded. The engine has one price
//    index, so pensions are revalued with it too (the AIReF's CPI is 2.3 / 1.9 / 2.1 / 2.0 %).
// Both sets of numbers are calibrated with the starting settings so that FTE employment and real GDP grow as the
// AIReF's (tests/short-run-employment.test.mjs); with other settings they are the same multipliers (S), and the
// reader's levers move employment from there: the frozen exit age about 0.2 points a year less, EUROPOP2023
// 0.9–1.3 % a year, since its population is not the AIReF's (docs/modelo/01, review 10; declared, not recalibrated).
// The newcomers are not added to the population, and nothing is lost by it: after 2026 the engine ties no spending
// to the population. Health and long-term care, the other pensions and the rest of public spending are shares of a
// spending reference GDP that grows with the employed, newcomers included, and their pensions come from their own
// cohorts (docs/DECISIONES.md, 24/11/2026).
export const SHORT_RUN_EMPLOYMENT = Object.freeze({
  source: 'AIReF, Informe de seguimiento 2026 del Plan Fiscal y Estructural de Medio Plazo 2025-2028 (14/05/2026), cuadro 16, pág. 46',
  target: Object.freeze({ employmentFTE: Object.freeze({ 2027: 1.9, 2028: 1.8, 2029: 1.6, 2030: 1.5 }), realGDP: Object.freeze({ 2027: 2.0, 2028: 1.9, 2029: 1.8, 2030: 1.7 }) }),
  boost: Object.freeze({ 2027: 0.034, 2028: 0.3526, 2029: 0.3734, 2030: 0.4341 }),
  productivity: Object.freeze({ 2027: -0.0061, 2028: -0.0068, 2029: -0.0059, 2030: -0.006 }),
  inflation: Object.freeze({ 2027: 0.026, 2028: 0.023, 2029: 0.021, 2030: 0.020 })
});

/** Years over which a scenario's growth deviations (productivity, wages, entrants) compound: from 2026, or from
 * 2030 with the option on, because until 2030 the AIReF's table already holds its own productivity and employment
 * (docs/REVISION-ADVERSARIAL-2026-11-24.md, 9). */
export function shortRunDeviationYears(year, config) {
  return config?.airefShortRunEmployment ? Math.max(0, year - 2030) : year - 2026;
}

/** The year's inflation with the option on (2027–2030), or null: then the scenario's own rate applies. */
export function shortRunInflationRate(year, config) {
  return config?.airefShortRunEmployment ? SHORT_RUN_EMPLOYMENT.inflation[year] ?? null : null;
}

/** Multiplier of the year's entrants: 1 unless the option is on and the year is 2027–2030. */
export function shortRunEntrantFactor(year, config) {
  return config?.airefShortRunEmployment ? 1 + (SHORT_RUN_EMPLOYMENT.boost[year] ?? 0) : 1;
}

/** Level of output per worker and wages against the reference: 1 unless the option is on; from 2027, the product of the yearly changes. */
export function shortRunProductivityLevel(year, config) {
  if (!config?.airefShortRunEmployment) return 1;
  let level = 1;
  for (const [y, change] of Object.entries(SHORT_RUN_EMPLOYMENT.productivity)) if (Number(y) <= year) level *= 1 + change;
  return level;
}
