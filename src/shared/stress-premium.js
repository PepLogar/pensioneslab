// Optional stress premium on new public debt: when the previous year had a high
// fiscal-stress risk (S0 index, the verdict's own signal), new issues and
// refinancing pay an extra spread. Off by default. Calibration: Spain's 10-year
// spread over Germany averaged 283, 435 and 299 basis points in 2011–2013 (ECB),
// with debt of 70–100 % of GDP, a level at which the calm, debt-only premium
// gives almost nothing. Audit: docs/AUDITORIA-PRIMA-RIESGO.md.
// Assumption of the project, declared: the extra spread follows the risk signal,
// not the debt level, and lasts while the risk stays high. From the narrative's
// rescue year it ends, as Spain's spread fell after the ECB backstop of July
// 2012 while the debt still rose; with «sin rescate» it lasts until the default.
import { riskVariablesFromEngine, fiscalRiskIndex, riskLevel, describeRiskPath } from './sovereign-risk.js';
import { describeNarrative, verdictOptions } from './crisis-narrative.js';

export const STRESS_PREMIUM_SOURCE = Object.freeze({
  id: 'ecb-irs-es-de-2011-2013',
  file: 'data/sources/audit-prima-riesgo-2026/ecb-irs-ES-DE-IT-PT-monthly-2007-2015.csv',
  spreadsBasisPoints: Object.freeze({ 2011: 283, 2012: 435, 2013: 299 })
});

export const STRESS_PREMIUM_DEFAULTS = Object.freeze({
  // 1 = new debt pays `stressPremiumRate` more after a year of high risk.
  stressPremium: 0,
  // ≈ the 2011–2013 Spanish average spread (339 pb), rounded down to 3 points.
  stressPremiumRate: 0.03
});

export const STRESS_PREMIUM_RANGES = Object.freeze({
  stressPremium: [0, 1, true],
  stressPremiumRate: [0, 0.1]
});

// The reader's dated measures (the Calendario), as the verdict reads them (src/train-journey.js, CALENDARS).
const CALENDAR_KEYS = ['fiscalRescues', 'paymentAdjustments', 'debtRestructurings'];
/** Whether the reader enacted a measure after the first year: the narrative then takes the rescue path. */
export function hasActiveRescue(config = {}, firstYear = 2026) {
  return CALENDAR_KEYS.some(key => (config[key] ?? []).some(policy => policy.year > firstYear));
}

/**
 * Year of the narrative's rescue within the years simulated so far (null if none). With «sin rescate» it is null
 * only while the reader has no measure of their own: with one, the verdict reports a rescue, and the premium ends
 * there as well (1.76; docs/REVISION-ADVERSARIAL-2026-11-25.md, 6).
 */
export function rescueYearSoFar(years = [], config = {}) {
  const opts = verdictOptions(config);
  const active = hasActiveRescue(config, years[0]?.year ?? 2026);
  if (opts.narrative.noRescue && !active) return null;
  return describeNarrative(describeRiskPath(years, opts.risk), opts.narrative, { hasActiveRescue: active }).bailoutYear;
}

/**
 * Extra rate on this year's new issues (0 when off, without high risk last year,
 * or once the narrative's rescue has come).
 * @param {object[]} [years]  engine years simulated so far, to find the rescue
 */
export function stressPremiumRate(previous, beforePrevious, config = {}, years = null) {
  if (!config.stressPremium || !previous || !beforePrevious) return 0;
  if (years && rescueYearSoFar(years, config) != null) return 0;
  const vars = riskVariablesFromEngine(previous, beforePrevious, { fundBackingWeight: config.crisisFundBackingWeight ?? 0 });
  const { index } = fiscalRiskIndex(vars);
  const high = riskLevel(index, { highIndex: config.riskHighIndex, moderateIndex: config.riskModerateIndex }) === 'high';
  return high ? (config.stressPremiumRate ?? STRESS_PREMIUM_DEFAULTS.stressPremiumRate) : 0;
}
