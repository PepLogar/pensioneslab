// Riesgo de mercado de los fondos (Monte Carlo). Each path adds a random
// deviation to the funds' real return every year from 2027; the engine runs the
// whole scenario with it (run-only option, not saved). Deviations are
// independent and normal with mean zero: no fat tails, no mean reversion and no
// link to growth or interest rates. The result is the spread of outcomes under
// that hypothesis, not a forecast of real-world probabilities.
// Comes from src/domain/market-risk.js of pensiones_lab_2 1.64.0, without its stored file: Pensiones Lab 3
// always computes (riesgo.html).
import { computeVerdict } from './verdict.js';
import { comparisonConfigs, isMixedGradualActive } from '../shared/scenario-labels.js';

export const MARKET_RISK_SYSTEMS = Object.freeze(['progressive', 'funded', 'mixed']);
export const MARKET_RISK_DEFAULTS = Object.freeze({ sigma: 0.10, paths: 200, seed: 2026, fromYear: 2027, toYear: 2070, tails: 'normal', memory: 0 });
/** Fat tails: Student's t with these degrees of freedom, rescaled to the same volatility. */
export const STUDENT_DF = 5;
export const MEMORY_OPTIONS = Object.freeze([-0.3, 0, 0.3]);
const PERCENTILES = [5, 25, 50, 75, 95];

/** Small, fast, reproducible PRNG (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` paths of yearly deviations `{ [year]: deviation }`, reproducible from the seed. */
export function returnPaths({ sigma = MARKET_RISK_DEFAULTS.sigma, paths = MARKET_RISK_DEFAULTS.paths, seed = MARKET_RISK_DEFAULTS.seed,
  fromYear = MARKET_RISK_DEFAULTS.fromYear, toYear = MARKET_RISK_DEFAULTS.toYear, tails = 'normal', memory = 0 } = {}) {
  if (!(sigma >= 0 && sigma <= 0.3)) throw new RangeError('La volatilidad debe estar entre 0 y 30 %');
  if (tails !== 'normal' && tails !== 'fat') throw new RangeError('Colas no válidas');
  if (!(memory > -1 && memory < 1)) throw new RangeError('La memoria debe estar entre −1 y 1');
  const random = mulberry32(seed);
  const normal = () => {
    // Box–Muller; 1 − u avoids log(0).
    const u = 1 - random(), v = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  // Unit-variance shocks. With fat tails, a Student's t (df degrees of freedom)
  // rescaled by sqrt((df − 2) / df) keeps the same volatility with more extremes.
  const shock = tails === 'fat'
    ? () => {
      let chi = 0;
      for (let k = 0; k < STUDENT_DF; k++) chi += normal() ** 2;
      return normal() / Math.sqrt(chi / STUDENT_DF) * Math.sqrt((STUDENT_DF - 2) / STUDENT_DF);
    }
    : normal;
  // Memory: AR(1) on the deviations, d(t) = memory·d(t−1) + sqrt(1 − memory²)·shock,
  // so the yearly volatility stays sigma. Negative: returns tend to revert.
  // With the defaults (normal, no memory) the draws are exactly the previous ones.
  const persistence = Math.sqrt(1 - memory ** 2);
  return Array.from({ length: paths }, () => {
    const path = {};
    let previous = 0;
    for (let year = fromYear; year <= toYear; year++) {
      const unit = memory ? memory * previous + persistence * shock() : shock();
      previous = unit;
      path[year] = Math.max(-0.5, Math.min(0.5, Number((sigma * unit).toFixed(5))));
    }
    return path;
  });
}

/** What each path keeps: verdict and the yearly paths needed for the fan charts. */
export function summarizeMarketRun(result) {
  const verdict = computeVerdict(result);
  const at = year => result.years.find(point => point.year === year);
  const round = (value, digits = 1) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : null);
  const p70 = at(2070);
  return {
    tone: verdict.tone, failure: verdict.failure, firstProblemYear: verdict.firstProblemYear,
    fund2070: round(p70?.fundedAssetsGDP ?? 0), debt2070: round(p70?.debtGDP),
    firstPension2070: round(((p70?.newAwardPublicAnnual ?? 0) + (p70?.newAwardAnnuityAnnual ?? 0)) / 12, 0),
    firstYear: result.years[0].year,
    fundPath: result.years.map(p => round(p.fundedAssetsGDP ?? 0)),
    debtPath: result.years.map(p => round(p.debtGDP))
  };
}

export function percentile(values, q) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q / 100, lo = Math.floor(pos), hi = Math.ceil(pos);
  return Number((sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)).toFixed(1));
}

/** Probability of crisis, crisis-year histogram, percentiles and fan-chart bands. */
export function aggregateMarketRuns(runs, base) {
  const n = runs.length;
  const crisis = runs.filter(r => r.firstProblemYear);
  const bins = {};
  for (const r of crisis) { const bin = Math.floor(r.firstProblemYear / 5) * 5; bins[bin] = (bins[bin] ?? 0) + 1; }
  const pct = key => Object.fromEntries(PERCENTILES.map(q => [q, percentile(runs.map(r => r[key]), q)]));
  const fan = key => runs[0][key].map((_, i) => ({
    year: runs[0].firstYear + i,
    ...Object.fromEntries(PERCENTILES.map(q => [q, percentile(runs.map(r => r[key][i]), q)]))
  }));
  return {
    paths: n,
    crisisProbability: n ? crisis.length / n : 0,
    pensionFailureShare: n ? runs.filter(r => r.failure === 'pension').length / n : 0,
    crisisYearBins: bins,
    medianCrisisYear: crisis.length ? percentile(crisis.map(r => r.firstProblemYear), 50) : null,
    firstCrisisYear: crisis.length ? Math.min(...crisis.map(r => r.firstProblemYear)) : null,
    lastCrisisYear: crisis.length ? Math.max(...crisis.map(r => r.firstProblemYear)) : null,
    fund2070: pct('fund2070'), debt2070: pct('debt2070'), firstPension2070: pct('firstPension2070'),
    fundFan: fan('fundPath'), debtFan: fan('debtPath'),
    base
  };
}

/**
 * The market-risk result as rows (8/11/2026): the yearly fans of fund and debt and the 2070
 * percentiles, one row per model, variable and year. The summary goes as «#» lines.
 */
export function marketRiskToCSV({ system, params, agg }) {
  const pct = value => (Number.isFinite(value) ? Number(value.toFixed(4)) : '');
  const lines = [
    `# Trayectorias: ${agg.paths} · volatilidad ${params.sigma} · colas ${params.tails} · memoria ${params.memory} · semilla ${params.seed}`,
    `# Probabilidad de que no aguante: ${pct(agg.crisisProbability)} · de ellas por la pensión: ${pct(agg.pensionFailureShare)} · año mediano: ${agg.medianCrisisYear ?? ''}`,
    ['modelo', 'variable', 'anio', ...PERCENTILES.map(q => `p${q}`)].join(';')
  ];
  for (const [name, fan] of [['fondo_pct_pib', agg.fundFan], ['deuda_pct_pib', agg.debtFan]]) {
    for (const point of fan ?? []) lines.push([system, name, point.year, ...PERCENTILES.map(q => pct(point[q]))].join(';'));
  }
  for (const [name, key] of [['fondo_2070_pct_pib', 'fund2070'], ['deuda_2070_pct_pib', 'debt2070'], ['primera_pension_2070', 'firstPension2070']]) {
    lines.push([system, name, 2070, ...PERCENTILES.map(q => pct(agg[key]?.[q]))].join(';'));
  }
  return lines.join('\n');
}

/** The comparison entries (same configs as Comparar) for the market-risk models. */
export function marketRiskSystems(config) {
  return comparisonConfigs(config, { includeRetro1985: false }).filter(entry => MARKET_RISK_SYSTEMS.includes(entry.key));
}

/**
 * The models the page offers (1.52): the stored three, plus Mixto con ahorro propio while it is the
 * scenario's own system. It is always computed live: the stored file and its fingerprints
 * (marketRiskSystems, marketRiskFingerprints) keep the three.
 */
export function marketRiskChoices(config) {
  const active = isMixedGradualActive(config);
  const keys = active ? [...MARKET_RISK_SYSTEMS, 'mixedGradual'] : [...MARKET_RISK_SYSTEMS];
  const entries = comparisonConfigs(config, { includeRetro1985: false, includeMixedGradual: active });
  return keys.map(key => entries.find(entry => entry.key === key));
}
