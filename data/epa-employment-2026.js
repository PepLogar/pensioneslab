/** Employed persons by sex and five-year age group, to shape the 2026 workers by age inside the Ageing Report's
 * groups (methodology 1.78; docs/DECISIONES.md, 26/11/2026).
 * O: INE, Encuesta de Población Activa, table 65109 «Ocupados por sexo y grupo de edad», thousands, the average of
 *    2025 Q4 and 2026 Q1–Q3, downloaded on 26/11/2026 (data/sources/epa-2026/ine-65109-ocupados-sexo-edad.json,
 *    SHA-256 6fff72fa674247c4e50cce8e89ada4db03eee4db5cfe7a2cc129d3bf3b443e70).
 * The levels of the Ageing Report's groups (20–24, 25–54, 55–64, 65–74) stay the engine's; only the shape inside
 * them, by five-year group and sex, comes from here.
 */
export const EPA_EMPLOYMENT_2026 = Object.freeze({
  id: 'es-ine-epa-65109-2025q4-2026q3-v1',
  groups: Object.freeze([[20, 24], [25, 29], [30, 34], [35, 39], [40, 44], [45, 49], [50, 54], [55, 59], [60, 64]]),
  employedThousands: Object.freeze({
    M: Object.freeze({ '20-24': 687.5, '25-29': 1073.2, '30-34': 1235.6, '35-39': 1312.5, '40-44': 1492.6, '45-49': 1755.9, '50-54': 1718.5, '55-59': 1437.6, '60-64': 977.9 }),
    F: Object.freeze({ '20-24': 559.2, '25-29': 969.9, '30-34': 1098.3, '35-39': 1163.2, '40-44': 1325.0, '45-49': 1519.1, '50-54': 1504.1, '55-59': 1215.7, '60-64': 864.5 })
  })
});

/** The five-year group of an age, as 'lo-hi', or null outside 20–64. */
export function epaGroupOf(age) {
  const g = EPA_EMPLOYMENT_2026.groups.find(([lo, hi]) => age >= lo && age <= hi);
  return g ? `${g[0]}-${g[1]}` : null;
}
