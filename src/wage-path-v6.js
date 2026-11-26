import { WAGE_FORECAST_V6 as F } from '../data/wage-forecast-v6.js';
import { shortRunInflationRate, shortRunDeviationYears } from './shared/short-run-employment.js';

/** Resident D11 per resident employee: apply only the identified2027 growth,
 * not its level or a national wage bill to all equivalent participants. */
export function createWagePathV6(base, demographics, rows = null, mechanism = 'official-2027') {
  if (!['official-2027', 'ar-v5'].includes(mechanism)) throw new RangeError('Unknown wage mechanism');
  const factor2027 = F.nominalWageIndexByYear[2027];
  const anchorReal = demographics.referenceWage(2027, 0);
  function productionWage(year, growthDeviation, config) {
    if (mechanism === 'ar-v5') return demographics.referenceWage(year, growthDeviation);
    if (!config || !Number.isFinite(config.inflationRate) || config.inflationRate <= -1 ||
        !Number.isFinite(growthDeviation) || growthDeviation <= -1) throw new RangeError('Wage scenario config required');
    if (year === 2026) return base.wage;
    // The source specifies NOMINAL2027 growth. Deflate once with scenario CPI.
    // Later years retain inherited REAL AR rates and the new2027 level.
    // Deflated with the 2027 inflation of the scenario (the AIReF's with config.airefShortRunEmployment).
    return base.wage * factor2027 / (1 + (shortRunInflationRate(2027, config) ?? config.inflationRate)) *
      demographics.referenceWage(year, 0, config) / anchorReal * (1 + growthDeviation) ** shortRunDeviationYears(year, config);
  }
  let conditionedRows = rows;
  const suppliedWages = rows !== null && Object.hasOwn(rows[0], 'nominalWageIndex');
  if (rows && !suppliedWages && mechanism === 'official-2027') {
    const price2027 = rows[1].consumerPriceIndex;
    conditionedRows = rows.map(row => ({ ...row, nominalWageIndex: row.year === 2026 ? 1 :
      factor2027 * demographics.referenceWage(row.year, 0) / anchorReal * row.consumerPriceIndex / price2027 }));
  }
  return Object.freeze({ productionWage, conditionedRows,
    assumptions: Object.freeze({ source: F.id, mechanism,
      suppliedNominalWagesTakePriority: suppliedWages,
      rule: mechanism === 'ar-v5' ? 'Preserved v5 AR real-wage path; the AMECO2027 growth override is disabled.' : '2027 nominal growth derives from AMECO resident household D11 / resident employees, June2026 edition. Applied as a growth proxy to the equivalent salary, without rebasing2026. From2028 inherited AR real growth resumes, retaining2027 level. Scenario CPI deflates once.',
      external: 'When an external source supplies a complete nominal wage index it takes priority. Otherwise this is an explicitly hybrid AMECO2027 wage/source macro/AR tail experiment, not a fully matched IMF or Funcas salary forecast.',
      horizon: 'Only2027 growth is newly source-identified; no AMECO forecast is claimed after2027.' }) });
}
