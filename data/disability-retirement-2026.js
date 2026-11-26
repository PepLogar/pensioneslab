/** Disability pensioners who become old-age pensioners at 65 (methodology 1.77; docs/DECISIONES.md, 26/11/2026).
 * In Spain a permanent disability pension is registered as an old-age pension once its holder turns 65, and the
 * Ageing Report's model has no new disability pensions after 64 (2024 Ageing Report, country fiche for Spain,
 * printed pages 11 and 60, PDF pages 10 and 59): those people enter its old-age stock without being new awards. The simulator's other pensions
 * follow the Ageing Report's ratio, which already takes them out at 65, so they enter its retirees here.
 *
 * O: Seguridad Social, pensiones contributivas en vigor a 1/9/2026 por edad (data/sources/current-2026/ED202609.xlsx,
 *    «Edades_Total sistema», incapacidad permanente): 330.614 pensions aged 60–64 (205.543 men at 1.424,14 €/month,
 *    125.071 women at 1.212,28 €/month), 119.171 aged 65–69 and almost none from 70.
 * O: Ageing Report 2024, country fiche for Spain, Table A2: disability rates of the 60–64 group, 2022–2070.
 * S: one fifth of the 60–64 stock turns 65 each year; later years follow the population of 65 and the Table A2 rate;
 *    the pension of a new entry follows wages (as the fiche's new disability pensions), and then prices as every
 *    pension in payment; the mortality is the cohorts' (the fiche adds extra mortality to disability pensioners).
 */
export const DISABILITY_RETIREMENT_2026 = Object.freeze({
  id: 'es-inss-2026-09-disability-to-old-age-v1',
  entryAge: 65,
  // Pensions aged 60–64 at 1/9/2026 and their average monthly amount (14 payments a year).
  stock60to64: Object.freeze({ M: 205543, F: 125071 }),
  monthly60to64: Object.freeze({ M: 1424.1434467240442, F: 1212.2805196248501 }),
  paymentsPerYear: 14,
  // Ageing Report 2024, country fiche for Spain, Table A2, 60–64 (%): interpolated between these years, flat after.
  ar2024Rate60to64: Object.freeze({ 2022: 22.5, 2030: 18.7, 2040: 17.6, 2050: 17.3, 2060: 17.6, 2070: 18.1 }),
  sources: Object.freeze({
    stock: 'data/sources/current-2026/ED202609.xlsx',
    fiche: 'data/sources/ar2024-fiche-es/2024-ageing-report-country-fiche-Spain.pdf (SHA-256 073dca6b182b575cb78abe236e77db5014e78319cd0a0563e7ddaa161a307e3d)'
  })
});

/** The Table A2 rate of the 60–64 group in `year` (linear between its years, flat outside them). */
export function disabilityRate60to64(year) {
  const points = Object.entries(DISABILITY_RETIREMENT_2026.ar2024Rate60to64).map(([y, v]) => [Number(y), v]);
  if (year <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [a, va] = points[i - 1], [b, vb] = points[i];
    if (year <= b) return va + (vb - va) * (year - a) / (b - a);
  }
  return points.at(-1)[1];
}
