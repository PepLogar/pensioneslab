// Risk of fiscal stress, year by year: the fiscal part of the European
// Commission's S0 early-detection indicator (DSM 2022 thresholds and weights),
// computed with the variables the simulator produces. It is the base of the
// verdict planned in docs/PLAN-RIESGO-Y-RELATO.md; the rescue, haircut and
// default milestones will be a separate layer of editable assumptions on top.
//
// What each part is:
// - thresholds and weights: published (data/s0-thresholds-dsm2022.js);
// - the index over the 8 of 12 fiscal variables the engine has, normalised by
//   the variables available: the S0 rule itself (EP 475, §3.4);
// - «moderate» from 0.29 (80 % of 0.36), «sustained» after 2 years and «debt
//   not stabilising» after 5: adaptations of this project, editable.
import { S0_THRESHOLDS_DSM2022 as S0 } from '../../data/s0-thresholds-dsm2022.js';

export const RISK_DEFAULTS = Object.freeze({
  highIndex: S0.fiscalIndexThreshold,
  moderateIndex: 0.29,
  sustainYears: 2,
  stabilisationYears: 5,
  // Optional hypothesis (config.crisisFundBackingWeight): part of the domestic
  // pension fund subtracted from the gross-debt variable only.
  fundBackingWeight: 0
});

export const RISK_LEVELS = Object.freeze({
  low: Object.freeze({ id: 'low', label: 'Riesgo bajo' }),
  moderate: Object.freeze({ id: 'moderate', label: 'Riesgo moderado' }),
  high: Object.freeze({ id: 'high', label: 'Riesgo alto' })
});

const finite = x => Number.isFinite(x) ? x : null;

/**
 * The S0 fiscal variables from plain public accounts, all in % of GDP except
 * rates. Shared by the simulator and the historical contrast.
 * @param {object} a
 * @param {number} a.balance            overall balance, % GDP
 * @param {number} a.primaryBalance     % GDP
 * @param {number} a.debt               gross debt at the end of the year, % GDP
 * @param {number} [a.debtPrevious]     gross debt a year earlier, % GDP
 * @param {number} [a.interestRate]     nominal implicit interest rate on debt (fraction)
 * @param {number} [a.nominalGrowth]    nominal GDP growth (fraction)
 * @param {number} [a.expenditure]      total expenditure, % GDP
 * @param {number} [a.expenditurePrevious]
 * @param {number} [a.grossFinancingNeeds]  deficit plus maturing debt, % GDP
 * @param {number} [a.fundAssets]       domestic pension fund, % GDP (for the optional hypothesis)
 */
export function riskVariables(a, { fundBackingWeight = RISK_DEFAULTS.fundBackingWeight } = {}) {
  const i = finite(a.interestRate), g = finite(a.nominalGrowth), d1 = finite(a.debtPrevious);
  const debt = finite(a.debt);
  return {
    balance: finite(a.balance),
    primaryBalance: finite(a.primaryBalance),
    stabilisingPrimaryBalance: i != null && g != null && d1 != null ? d1 * (i - g) / (1 + g) : null,
    grossDebt: debt == null ? null : Math.max(0, debt - (finite(a.fundAssets) ?? 0) * Math.max(0, fundBackingWeight)),
    debtChange: debt != null && d1 != null ? debt - d1 : null,
    grossFinancingNeeds: finite(a.grossFinancingNeeds),
    interestGrowthDifferential: i != null && g != null ? (i - g) * 100 : null,
    expenditureChange: finite(a.expenditure) != null && finite(a.expenditurePrevious) != null ? a.expenditure - a.expenditurePrevious : null
  };
}

/** The S0 variables of one engine year (`point`), given the previous one. */
export function riskVariablesFromEngine(point, previous, options) {
  const pct = (x, gdp = point?.gdp) => gdp > 0 && Number.isFinite(x) ? x / gdp * 100 : null;
  const nominal = p => p?.gdp > 0 ? p.gdp * (p.priceIndex ?? 1) : null;
  const g = previous && nominal(previous) > 0 && nominal(point) ? nominal(point) / nominal(previous) - 1 : null;
  return riskVariables({
    balance: pct(point.stateBalance),
    primaryBalance: pct(point.primaryBalance ?? (point.stateBalance + point.interest)),
    debt: point.debtGDP,
    debtPrevious: previous?.debtGDP,
    interestRate: point.effectiveNominalRate,
    nominalGrowth: g,
    expenditure: pct(point.totalPublicSpending),
    expenditurePrevious: previous ? pct(previous.totalPublicSpending, previous.gdp) : null,
    // Without maturities (the engine's opening year) the needs would be the deficit
    // alone: no data, like the variables that need the previous year
    // (docs/PROPUESTA-ANO-PARTIDA-2026-11-09.md).
    grossFinancingNeeds: Number.isFinite(point.debtMaturities)
      ? pct(Math.max(0, point.financingNeed ?? -point.stateBalance) + point.debtMaturities) : null,
    fundAssets: point.fundedAssetsGDP ?? pct(point.fundedAssets)
  }, options);
}

const signals = (v, value) => value != null && (v.risky === 'above' ? value > v.threshold : value < v.threshold);

/**
 * The fiscal S0 index: share of the available variables that signal, weighted
 * by their signalling power. `null` when no variable is available.
 */
export function fiscalRiskIndex(vars, thresholds = S0.variables) {
  let weight = 0, signalled = 0;
  const firing = [], available = [];
  for (const v of thresholds) {
    const value = vars[v.id];
    if (value == null) continue;
    weight += v.power; available.push(v.id);
    if (signals(v, value)) { signalled += v.power; firing.push(v.id); }
  }
  return weight > 0 ? { index: signalled / weight, firing, available } : { index: null, firing, available };
}

export function riskLevel(index, { highIndex = RISK_DEFAULTS.highIndex, moderateIndex = RISK_DEFAULTS.moderateIndex } = {}) {
  if (index == null) return null;
  return index >= highIndex ? RISK_LEVELS.high.id : index >= moderateIndex ? RISK_LEVELS.moderate.id : RISK_LEVELS.low.id;
}

/**
 * Risk path of a projection: one entry per year, and when the risk becomes
 * high, sustained high, and when the debt stops stabilising.
 * @param {object[]} years  engine years (`result.years`)
 * @param {object} [options]  RISK_DEFAULTS overrides
 */
export function describeRiskPath(years = [], options = {}) {
  const o = { ...RISK_DEFAULTS, ...options };
  const path = [];
  let highRun = 0, unstableRun = 0;
  years.forEach((point, k) => {
    const vars = riskVariablesFromEngine(point, years[k - 1] ?? null, o);
    // The opening year has no previous one: without the changes, the index of
    // the few level variables left would overstate the risk. It is not scored.
    const { index, firing, available } = k === 0 ? { index: null, firing: [], available: [] } : fiscalRiskIndex(vars);
    const level = riskLevel(index, o);
    highRun = level === 'high' ? highRun + 1 : 0;
    // The debt does not stabilise: the primary balance stays below the one that
    // would stabilise it while the debt ratio rises (IMF SRDSF concept).
    const unstable = vars.primaryBalance != null && vars.stabilisingPrimaryBalance != null &&
      vars.primaryBalance < vars.stabilisingPrimaryBalance && (vars.debtChange ?? 0) > 0;
    unstableRun = unstable ? unstableRun + 1 : 0;
    path.push({ year: point.year, index, level, firing, available, vars, highRun, unstableRun });
  });
  const first = test => path.find(test)?.year ?? null;
  const firstHigh = first(p => p.level === 'high');
  // The near miss (docs/REVISION-ADVERSARIAL-2026-11-24.md, 55): before the first high year, the variable that alone
  // would have made the risk high, at the smallest distance from its threshold. The index moves in steps, so a
  // small change can bring the break years earlier; the verdict says so when the distance is small.
  let nearMiss = null;
  for (const p of path) {
    if (p.index == null || (firstHigh != null && p.year >= firstHigh) || p.level === 'high') continue;
    const weight = S0.variables.filter(v => p.available.includes(v.id)).reduce((s, v) => s + v.power, 0);
    for (const v of S0.variables) {
      if (!p.available.includes(v.id) || p.firing.includes(v.id)) continue;
      if (riskLevel(p.index + v.power / weight, o) !== 'high') continue;
      const gap = Math.abs(p.vars[v.id] - v.threshold);
      if (!nearMiss || gap < nearMiss.gap) nearMiss = { year: p.year, id: v.id, label: v.label, unit: v.unit, gap };
    }
  }
  const sustained = path.find(p => p.highRun >= o.sustainYears);
  const notStabilising = path.find(p => p.unstableRun >= o.stabilisationYears);
  return {
    options: o,
    path,
    firstModerateYear: first(p => p.level === 'moderate' || p.level === 'high'),
    firstHighYear: first(p => p.level === 'high'),
    // The year the sustained high risk begins (the first of the run).
    firstSustainedHighYear: sustained ? sustained.year - o.sustainYears + 1 : null,
    // The year the debt stops stabilising (the first of the qualifying run).
    debtNotStabilisingFrom: notStabilising ? notStabilising.year - o.stabilisationYears + 1 : null,
    highYears: path.filter(p => p.level === 'high').length,
    nearMiss
  };
}
