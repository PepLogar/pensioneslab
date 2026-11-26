/** Spending of the Spanish general government by function (COFOG), without
 * old-age and survivors' pensions (GF1002–1003) or interest (GF0107).
 * Source: Eurostat gov_10a_exp, retrieved 2026-10-27
 * (copy in pensiones_lab_2/data/sources/audit-presupuesto-2026/). `share`: weight in 2024. `observedCut`:
 * largest fall from the 2009–2010 peak to the 2012–2014 trough, in current euros,
 * the deepest cut Spain actually made in its last crisis (an observation, not a
 * physical limit). pensiones_lab_2/docs/AUDITORIA-UMBRALES-RESTANTES.md.
 */
export const BUDGET_COFOG_2024 = Object.freeze({
  id: 'eurostat-gov_10a_exp-ES-2024-v1',
  retrievedDate: '2026-10-27',
  baseMillionEUR2024: 484882,
  source: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?lang=EN&geo=ES&sector=S13&na_item=TE&sinceTimePeriod=2007&unit=MIO_EUR',
  items: Object.freeze([
    Object.freeze({ id: 'health', cofog: 'GF07', share: 0.212, observedCut: 0.132, millionEUR2024: 102942 }),
    Object.freeze({ id: 'social', cofog: 'GF10 − GF1002 − GF1003', share: 0.200, observedCut: 0.157, millionEUR2024: 97057 }),
    Object.freeze({ id: 'economic', cofog: 'GF04', share: 0.167, observedCut: 0.254, millionEUR2024: 80908 }),
    Object.freeze({ id: 'education', cofog: 'GF09', share: 0.136, observedCut: 0.152, millionEUR2024: 65862 }),
    Object.freeze({ id: 'general', cofog: 'GF01 − GF0107', share: 0.109, observedCut: 0.159, millionEUR2024: 52907 }),
    Object.freeze({ id: 'security', cofog: 'GF02 + GF03', share: 0.088, observedCut: 0.140, millionEUR2024: 42861 }),
    Object.freeze({ id: 'environment', cofog: 'GF05 + GF06 + GF08', share: 0.088, observedCut: 0.414, millionEUR2024: 42345 })
  ])
});
