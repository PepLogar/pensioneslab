// Version the calculated results independently from the saved input schema.
// A methodology change must never reuse results computed by an older engine.
// 1.46: the 2023 closing clause is on by default in today's PAYG law (src/shared/closing-clause.js).
// 1.51: new debt follows the observed Treasury issuance ladder, not 7/8-year bullets (src/debt-issuance.js).
// 1.53: the closing clause's MEI surcharge pays the Laffer response like any contribution
// point, and that response no longer lowers GDP by default (docs/PLAN-1.53-LAFFER.md).
// 1.54: the full Laffer response is on by default: the lost hours lower payroll, contributions,
// new rights and GDP, without counting the revenue loss twice (docs/PLAN-1.54-LAFFER-COMPLETO.md).
// 1.55: the demography is EUROPOP2025 (population, migration, mortality, fertility); the AR2024
// employment and pensioners by age group apply to it (docs/PLAN-1.55-EUROPOP2025.md).
// 1.56: the VAT surcharge enters the Laffer wedge by default (option 3b), and «per contributor»
// figures count persons who work, not full-time equivalents (docs/PLAN-1.56-LOTE.md).
// 1.58: the wedge also takes the other product taxes of «other taxes» and the VAT of a fiscal
// rescue (docs/PLAN-1.58-LOTE.md).
// 1.59: not everyone keeps working when the retirement age rises (docs/PLAN-1.59-PERMANENCIA.md).
// 1.60: a cut of other spending lowers public capital, wages and GDP (docs/PLAN-1.60-INVERSION-PUBLICA.md).
// 1.62: the reference Mixto progresivo aims at 50 % to the fund, not 60 % (docs/REVISION-PORTADA-2026-11-06.md).
// 1.63: the fund of the reference Mixto progresivo grows as today's pensions end (docs/PROPUESTA-RITMO-MIXTO-PROGRESIVO-2026-11-07.md).
// 1.64: the fund of the reference Mixto progresivo is common: nobody inherits it, and it invests like Norway's (docs/PROPUESTA-FONDO-SOBERANO-2026-11-07.md).
// 1.65 (Pensiones Lab 3): the reference GDP of public spending follows productivity, not wages; with the starting
// settings the results are bit for bit those of 1.64 (docs/DECISIONES.md, 22/11/2026).
// 1.66: with the frozen retirement ages (the default), retiring earlier than the Ageing Report expects takes older
// workers away; young entrants no longer refill the AR employment (docs/DECISIONES.md, 24/11/2026).
// 1.67: the taxes without a model of their own follow nominal GDP by default, as the AIReF assumes; up to 1.66 they
// stayed in real euros of 2026. With the frozen retirement ages, a year of work earns 1/(43 + the Ageing Report rise
// of that generation), so retiring earlier than the AR expects earns less (docs/DECISIONES.md, 24/11/2026).
// 1.68: the effective retirement age follows the Ageing Report path by default, as the Ageing Report and the AIReF
// assume; up to 1.67 the 2026 profile stayed frozen (docs/DECISIONES.md, 24/11/2026).
// 1.69: employment and inflation until 2030 as the AIReF expects, by default (docs/DECISIONES.md, 24/11/2026).
// 1.70: fixes from the adversarial review (docs/REVISION-ADVERSARIAL-2026-11-24.md): the maximum contribution base
// follows the AIReF inflation 2027–2030 with the short-run option; growth deviations start in 2031 with it.
// 1.71: the pending RETA reform is on by default, as the law and the AIReF; the verdict says when the break year
// is on the edge (docs/DECISIONES.md, 24/11/2026).
// 1.72: pensions in payment follow last year's inflation of the path (the law's lag); the notional brake compares
// with what is owed; a haircut reaches the preserved capital; the allocation residual measures (docs/DECISIONES.md, 25/11/2026).
// 1.73: the Recovery Plan (PRTR) follows its calendar (AIReF): 1.25 % of GDP in 2026, nothing from 2030, the same
// in revenue and spending (data/prtr-calendar-2026.js; docs/DECISIONES.md, 25/11/2026).
// 1.74: a captive fund earns the coupons the State pays on its bonds, less the repression, which the State saves
// (docs/DECISIONES.md, 25/11/2026). The result cache carries a fingerprint of src/ and data/.
// 1.75: a captive fund loses only the face value in a haircut and earns the new coupon from that year; the 1985 run
// deflates its return with its own prices (docs/DECISIONES.md, 25/11/2026).
// 1.76: fixes from the adversarial review of 25/11 (docs/REVISION-ADVERSARIAL-2026-11-25.md, 1-8): cohort mortality at
// age + 0,5 as EUROPOP2025, workers of 65+ continue those of 64 (no 2027 bulge), no 2027 bills in the opening ladder,
// captive fund without the unpaid half repression and with face-value haircuts, annuities keep their award rate,
// «sin rescate» with a measure ends the premium at the reported rescue, a 0 % target sends nothing to the fund.
// 1.77: disability pensioners who turn 65 become old-age pensioners, as in the Ageing Report and the Social Security
// statistics (data/disability-retirement-2026.js; docs/DECISIONES.md, 26/11/2026).
// 1.78: retirement coverage by generation (data/career-coverage-2026.js): the 2026 workers spread by age and sex with
// the EPA, those not employed with a career retire too, a share of the employed reaches no contributory pension;
// fitted to the Ageing Report's new pensions (docs/DECISIONES.md, 26/11/2026).
// 1.79: fixes of the audit of 1.85 (docs/AUDITORIA-1.85-2026-11-26.md): the per-retiree averages leave out the fund
// income of those with no public pension; pay above the income of GDP is refused; taxRevenueGDP from 5 %.
export const SIMULATION_METHODOLOGY = 'common-fund-1.79.0';
// 4 (1.44): the yearly series travel by columns (src/shared/precomputed-codec.js).
export const PRECOMPUTED_FORMAT_VERSION = 4;
