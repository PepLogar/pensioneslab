// The closing clause of the 2023 pension reform («cláusula de cierre»): disposición
// adicional segunda of the Real Decreto-ley 2/2023, developed by the Real Decreto
// 100/2025 (arts. 12–14) as amended by the Real Decreto 561/2025. Every three years
// from 2025 the AIReF subtracts the average 2022–2050 impact of the revenue measures
// adopted since 2020 from the average gross public pension spending. If the net is
// above 13.3 % of GDP and no corrective law is in force on 1 January of the next
// year, the MEI rises from that date to compensate two tenths of the excess, and two
// more tenths each following year. Plan and sources: docs/PLAN-1.46-CLAUSULA-CIERRE.md
// and data/sources/audit-clausula-cierre-2026/manifest.json.
// Pure functions; every amount is a share of GDP (0.133 = 13.3 %).
//
// Assumptions of the project, declared (S):
// - no corrective law arrives in time, so the automatic MEI rise applies;
// - compensating k tenths of the excess means extra MEI revenue of k/10 of the
//   excess, as a share of each year's GDP; each ramp reaches the whole excess;
// - an evaluation counts the rises already legislated in full, as the AIReF counts
//   the MEI's future schedule, and starts a new ramp only for the excess that
//   remains. The surcharge never falls while the MEI lasts;
// - the window stays 2022–2050, so the last evaluation is that of 2049.
// Observed (O): the surcharge raises the MEI, which ends on 31 December 2050
// (disposición transitoria 43.ª LGSS), so it ends with it.
// - the evaluations already published (2025, 2026) are taken as published;
// - the strict reading leaves out the State's transfers, fixed at the AIReF's 0.3 points.

export const CLOSING_CLAUSE_RULE = Object.freeze({
  windowFrom: 2022,
  windowTo: 2050,
  netCeiling: 0.133,
  // The norm's own form: gross ≤ 15 % + (impact − 1.7 %), the same condition.
  grossCeilingAtReference: 0.15,
  referenceImpact: 0.017,
  firstEvaluationYear: 2025,
  cycleYears: 3,
  // Real Decreto 561/2025: one additional report before 1 June 2026, outside the cycle.
  extraEvaluationYears: Object.freeze([2026]),
  stepShare: 0.2,
  // The MEI contribution runs from 2023 to 2050 (disposición transitoria 43.ª LGSS).
  meiLastYear: 2050
});

// 'airef' counts the State's transfers as the AIReF does; 'strict' leaves them out (Fedea).
export const CLOSING_CLAUSE_READINGS = Object.freeze(['airef', 'strict']);
// Values of the `closingClause` configuration key.
export const CLOSING_CLAUSE_MODES = Object.freeze(['off', ...CLOSING_CLAUSE_READINGS]);

// Since 1.46 the clause is on by default, as the law in force (decision of the author,
// 28/10/2026). It belongs to today's PAYG law: other systems replace that law and do
// not carry it unless `closingClauseAnySystem` is 1 (activated by hand).
export const CLOSING_CLAUSE_DEFAULTS = Object.freeze({ closingClause: 'airef', closingClauseAnySystem: 0 });
export const CLOSING_CLAUSE_RANGES = Object.freeze({ closingClauseAnySystem: [0, 1, true] });

/** Today's PAYG law and its variants (points, age link, guide recipes), without a transition. */
export const keepsCurrentLaw = config => config?.system === 'payg' && (config.transitionMode ?? 'none') === 'none';

/** Whether a configuration runs with the clause. */
export function closingClauseApplies(config) {
  if ((config?.closingClause ?? 'off') === 'off') return false;
  return keepsCurrentLaw(config) || config.closingClauseAnySystem === 1;
}

/**
 * The clause as a change against `defaults`, for the lists of changes: null when it runs
 * as it would by default for this system. The patch restores the defaults.
 */
export function closingClauseChange(config, defaults) {
  const asDefault = { ...config, closingClause: defaults.closingClause, closingClauseAnySystem: defaults.closingClauseAnySystem };
  const applies = closingClauseApplies(config), byDefault = closingClauseApplies(asDefault);
  if (applies === byDefault && (!applies || config.closingClause === defaults.closingClause)) return null;
  const patch = { closingClause: defaults.closingClause, closingClauseAnySystem: defaults.closingClauseAnySystem };
  // The catalogue's name (src/shared/settings-catalog.js, closingClause), with what it has become.
  if (!applies) return { label: 'Freno de 2023: apagado', short: 'Freno de 2023: apagado', patch };
  const strict = config.closingClause === 'strict' ? ', lectura estricta' : '';
  return byDefault
    ? { label: `Freno de 2023${strict}`, short: `Freno de 2023${strict}`, patch }
    : { label: `Freno de 2023, también en este sistema${strict}`, short: 'Freno de 2023: también en este sistema', patch };
}

/**
 * Gross public pension spending before the engine's base year (2026), share of GDP:
 * 2022 and 2023 observed (O, AIReF 2025, cuadro 5); 2024 and 2025 from the Ministry's
 * updated series (R, AIReF 2025, gráfico 3), which the 2026 study puts at about 13 % in 2025.
 */
export const SPENDING_BEFORE_BASE = Object.freeze({
  2022: 0.12643399702610839, 2023: 0.1283112367146331,
  2024: 0.12914153567055271, 2025: 0.12971168173172641
});

/** Evaluations already published (O). `transfers`: the part of the impact the strict reading leaves out. */
export const PUBLISHED_EVALUATIONS = Object.freeze([
  Object.freeze({ year: 2025, source: 'AIReF, Informe 2/25 (31/03/2025)',
    grossAverage: 0.146, impactAverage: 0.014, transfers: 0.003, net: 0.132 }),
  Object.freeze({ year: 2026, source: 'AIReF, Estudio 1/2026 (29/05/2026)',
    grossAverage: 0.146, impactAverage: 0.016, transfers: 0.003, net: 0.130 })
]);

/**
 * AIReF 2026, cuadro 1: average 2022–2050 impact of each measure (O). The parts are
 * rounded to a tenth of a point and add up to 1.5 against a published total of 1.6.
 * Transfers: 0.2 that pay for cuts in contributions and 0.1 for non-contributory pensions.
 */
export const AIREF_2026_IMPACT = Object.freeze({
  total: 0.016,
  parts: Object.freeze({ mei: 0.004, maxBases: 0.003, solidarity: 0.001, selfEmployed: 0.003,
    transfers: 0.003, minimumWage: 0.001, labourReform: 0, regularisation: 0 })
});

/** Fedea, Apuntes 2025/18, cuadro 2: the 2025 evaluation read three other ways (O, unofficial contrast). */
export const FEDEA_2025_CONTRAST = Object.freeze({
  literal: Object.freeze({ grossAverage: 0.1545, impactAverage: 0.014, net: 0.1405 }),
  literalWithoutTransfers: Object.freeze({ grossAverage: 0.1545, impactAverage: 0.011, net: 0.1435 }),
  airefMethodWithoutTransfers: Object.freeze({ grossAverage: 0.1458, impactAverage: 0.011, net: 0.1348 })
});

// Rounding noise below this is not an excess: the norm says «no supere».
const TOLERANCE = 1e-12;

function checkReading(reading) {
  if (!CLOSING_CLAUSE_READINGS.includes(reading)) {
    throw new RangeError(`Invalid closing-clause reading: expected one of ${CLOSING_CLAUSE_READINGS.join(', ')}`);
  }
}

/** Average of `valueAt(year)` over the window; every year needs a finite value. */
export function windowAverage(valueAt, from = CLOSING_CLAUSE_RULE.windowFrom, to = CLOSING_CLAUSE_RULE.windowTo) {
  let sum = 0;
  for (let year = from; year <= to; year++) {
    const value = valueAt(year);
    if (!Number.isFinite(value)) throw new RangeError(`Missing closing-clause value for ${year}`);
    sum += value;
  }
  return sum / (to - from + 1);
}

/** The norm's limit on gross spending for a given impact: 15 % ± (impact − 1.7 %). */
export function grossCeiling(impactAverage) {
  return CLOSING_CLAUSE_RULE.grossCeilingAtReference + impactAverage - CLOSING_CLAUSE_RULE.referenceImpact;
}

/** Impact counted by a reading: the strict one leaves out the State's transfers. */
export function readingImpact({ impactAverage, transfers = 0 }, reading = 'airef') {
  checkReading(reading);
  return reading === 'strict' ? impactAverage - transfers : impactAverage;
}

/** Net spending, limits and excess of one evaluation. */
export function evaluateNet({ grossAverage, impactAverage }) {
  if (!Number.isFinite(grossAverage) || !Number.isFinite(impactAverage)) {
    throw new RangeError('Invalid closing-clause evaluation inputs');
  }
  const net = grossAverage - impactAverage;
  const over = net - CLOSING_CLAUSE_RULE.netCeiling;
  const excess = over > TOLERANCE ? over : 0;
  return { grossAverage, impactAverage, net, netCeiling: CLOSING_CLAUSE_RULE.netCeiling,
    grossCeiling: grossCeiling(impactAverage), excess, exceeds: excess > 0 };
}

/** Evaluation years up to `lastYear`: 2025, the extra report of 2026, then every three years while the window lasts. */
export function evaluationYears(lastYear = CLOSING_CLAUSE_RULE.windowTo) {
  const { firstEvaluationYear, cycleYears, windowTo, extraEvaluationYears } = CLOSING_CLAUSE_RULE;
  const years = extraEvaluationYears.filter(year => year <= lastYear);
  for (let year = firstEvaluationYear; year <= Math.min(lastYear, windowTo); year += cycleYears) years.push(year);
  return years.sort((a, b) => a - b);
}

/** Share of the excess compensated in the k-th year of a ramp (k = 1, the year after the evaluation): 0.2, 0.4 … 1. */
export function rampShare(k) {
  return k < 1 ? 0 : Math.min(1, k * CLOSING_CLAUSE_RULE.stepShare);
}

/**
 * Evaluations and the automatic MEI surcharge of one scenario. Every evaluation
 * looks at the same projection, the scenario's own (S).
 * @param {object} p
 * @param {(year: number) => number} p.gross  gross public pension spending, 2022–2050
 * @param {(year: number) => number} p.impact  impact of the revenue measures without the surcharge, 2022–2050
 * @param {(year: number) => number} [p.transfers]  the State's transfers within `impact` (strict reading)
 * @param {'airef'|'strict'} [p.reading]
 * @param {number} p.lastYear  last simulated year
 * @returns {{ evaluations: object[], ramps: {start: number, excess: number}[], surcharge: (year: number) => number }}
 */
export function closingClausePath({ gross, impact, transfers = () => AIREF_2026_IMPACT.parts.transfers,
  reading = 'airef', lastYear }) {
  checkReading(reading);
  if (!Number.isInteger(lastYear) || lastYear < CLOSING_CLAUSE_RULE.windowFrom) {
    throw new RangeError('Invalid closing-clause lastYear');
  }
  const ramps = [];
  const surcharge = year => year > CLOSING_CLAUSE_RULE.meiLastYear ? 0
    : ramps.reduce((sum, ramp) => sum + rampShare(year - ramp.start + 1) * ramp.excess, 0);
  const grossAverage = windowAverage(gross);
  const impactAverage = windowAverage(impact);
  const transfersAverage = windowAverage(transfers);
  const evaluations = [];
  for (const year of evaluationYears(lastYear)) {
    const published = PUBLISHED_EVALUATIONS.find(row => row.year === year);
    if (published) {
      // Taken as published: their contrast under the strict reading never starts a ramp.
      const result = evaluateNet({ grossAverage: published.grossAverage, impactAverage: readingImpact(published, reading) });
      evaluations.push(Object.freeze({ year, published: true, source: published.source, reading, ...result, startsRamp: false }));
      continue;
    }
    const scheduledSurcharge = windowAverage(surcharge);
    const result = evaluateNet({ grossAverage,
      impactAverage: readingImpact({ impactAverage: impactAverage + scheduledSurcharge, transfers: transfersAverage }, reading) });
    if (result.exceeds) ramps.push(Object.freeze({ start: year + 1, excess: result.excess }));
    evaluations.push(Object.freeze({ year, published: false, reading, scheduledSurcharge, ...result, startsRamp: result.exceeds }));
  }
  return Object.freeze({ evaluations: Object.freeze(evaluations), ramps: Object.freeze(ramps), surcharge });
}

/** MEI rate points that raise `surcharge` (share of GDP) on the MEI's contribution base. */
export function surchargeRate(surcharge, gdp, meiBase) {
  if (!(meiBase > 0) || !Number.isFinite(gdp) || !Number.isFinite(surcharge)) {
    throw new RangeError('Invalid closing-clause surcharge inputs');
  }
  return surcharge * gdp / meiBase;
}

/**
 * The clause on an engine run without the surcharge, which every evaluation looks at (S).
 * - Gross spending: the run's own path from its base year; before it, SPENDING_BEFORE_BASE.
 * - Impact: the AIReF 2026 total, plus the scenario's own revenue measures: the
 *   contribution-rate points above the reference rate, on the run's payroll (S).
 * - Rate: each ramp turns its excess into MEI rate points with the payroll share of
 *   GDP of its first year, as a legislated rate would (S). So the rate never falls
 *   until the MEI ends in 2050.
 * @param {object[]} years  engine rows: year, publicPensionSpendingGDP (%), payrollGDP
 * @param {(year: number) => number} rateDeviation  contribution-rate points above the reference rate
 * @param {'airef'|'strict'} reading
 * @param {number} lastYear  last year of the full run
 */
export function engineClausePath(years, rateDeviation, reading, lastYear) {
  const byYear = new Map(years.map(row => [row.year, row]));
  const firstYear = years[0]?.year;
  for (let year = CLOSING_CLAUSE_RULE.windowFrom; year < firstYear; year++) {
    if (!Number.isFinite(SPENDING_BEFORE_BASE[year])) throw new RangeError(`No spending before the base year for ${year}`);
  }
  const gross = year => byYear.has(year) ? byYear.get(year).publicPensionSpendingGDP / 100 : SPENDING_BEFORE_BASE[year];
  const impact = year => AIREF_2026_IMPACT.total + (byYear.has(year) ? rateDeviation(year) * byYear.get(year).payrollGDP : 0);
  const path = closingClausePath({ gross, impact, reading, lastYear });
  const steps = path.ramps.map(ramp => {
    const row = byYear.get(ramp.start) ?? years[years.length - 1];
    return { start: ramp.start, points: surchargeRate(ramp.excess, 1, row.payrollGDP) };
  });
  const rate = year => year > CLOSING_CLAUSE_RULE.meiLastYear ? 0
    : steps.reduce((sum, step) => sum + rampShare(year - step.start + 1) * step.points, 0);
  return Object.freeze({ ...path, rate });
}
