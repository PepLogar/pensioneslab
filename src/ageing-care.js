/** Pressure of ageing on public health and long-term care spending, in points of GDP
 * over the 2026 share (which the rest of public spending keeps constant).
 * Official baseline: Ageing Report 2024, Spain, health care + long-term care
 * (data/care-and-health-2024.js); the 2070 value is held afterwards.
 * Reduced form on top (docs/SANIDAD-DEPENDENCIA.md):
 * - extra life expectancy at 65 over the reference adds careLifePointsPerYear65
 *   per year (from the Ageing Report «+2 years» sensitivity);
 * - living a share of the years gained in good health different from the Ageing
 *   Report's half moves spending by healthySpreadPointsPerYear65 per year gained and
 *   per half (from its healthy / no healthy ageing scenarios).
 * config.ageingCareSpending scales the whole pressure (0 = off; 1, the default since 1.25).
 */
import { CARE_AND_HEALTH_2024 as CARE } from '../data/care-and-health-2024.js';

const firstYear = Math.min(...Object.keys(CARE.healthCareBaseline).map(Number));
const lastYear = Math.max(...Object.keys(CARE.healthCareBaseline).map(Number));
const share = year => {
  const y = String(Math.max(firstYear, Math.min(lastYear, year)));
  return CARE.healthCareBaseline[y] + CARE.longTermCareBaseline[y];
};

export function ageingCarePoints(year, config, lifeExpectancyAt65, baseYear = 2026) {
  const scale = config?.ageingCareSpending ?? 0;
  if (!scale || year <= baseYear) return 0;
  const rf = CARE.reducedForm;
  const gain = config.longevityGain ?? 0;
  const reference = lifeExpectancyAt65(year, 0);
  const referenceGain = reference - lifeExpectancyAt65(baseYear, 0);
  const extra = gain ? lifeExpectancyAt65(year, gain) - reference : 0;
  const healthy = config.healthyLifeShare ?? rf.baselineHealthyShare;
  const points = share(year) - share(baseYear)
    + rf.careLifePointsPerYear65 * extra
    + (rf.baselineHealthyShare - healthy) / 0.5 * rf.healthySpreadPointsPerYear65 * (referenceGain + extra);
  return scale * points;
}

export const AGEING_CARE_ASSUMPTIONS = Object.freeze({
  source: CARE.id,
  baseline: 'Ageing Report 2024 baseline for Spain, health care plus long-term care, % of GDP; held after 2070.',
  longevity: `+${CARE.reducedForm.careLifePointsPerYear65} points of GDP per extra year of life expectancy at 65; ±${CARE.reducedForm.healthySpreadPointsPerYear65} per year gained and per half of those years in good health.`
});
