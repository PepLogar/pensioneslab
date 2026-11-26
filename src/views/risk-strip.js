// The risk of fiscal stress drawn under a chart: one strip per model, one cell
// per year, coloured by its level (fiscal S0 index; src/shared/sovereign-risk.js).
// It replaces the old debt threshold lines (114/135/160 %), which had no source.
// Pure SVG/HTML builders.
import { S0_SHORT } from '../shared/risk-wording.js';
import { S0_THRESHOLDS_DSM2022 as S0 } from '../../data/s0-thresholds-dsm2022.js';
import { num as formatNumber } from '../shared/number-format.js';

export const RISK_FILL = Object.freeze({ low: '#bbf7d0', moderate: '#fde68a', high: '#fca5a5', none: '#f1f5f9' });
export const RISK_LABEL = Object.freeze({ low: 'bajo', moderate: 'moderado', high: 'alto' });

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const VARIABLE = Object.fromEntries(S0.variables.map(v => [v.id, v]));
const num = (value, digits = 1) => formatNumber(Number(value), digits, { fixed: true });

/** Risk entries of a verdict's journey: `{ year, level, index, firing, vars }`. */
export function riskPathOf(verdict) {
  return (verdict?.journey?.stations ?? []).map(s => ({ year: s.year, level: s.risk?.level ?? null, index: s.risk?.index ?? null, firing: s.risk?.firing ?? [], vars: s.risk?.vars ?? {} }));
}

// What the engine's figure leaves out against the Commission's definition: its
// financing needs exclude Treasury bills (docs/PROPUESTA-LETRAS-2026-11-09.md).
const ENGINE_SCOPE = Object.freeze({ grossFinancingNeeds: 'sin letras' });

/** «Necesidades brutas de financiación, sin letras: 19,9 % del PIB (umbral 15,95)», one per firing variable. */
export function firingDescriptions(entry) {
  return (entry?.firing ?? []).map(id => {
    const v = VARIABLE[id], value = entry.vars?.[id];
    if (!v || !Number.isFinite(value)) return null;
    const label = ENGINE_SCOPE[id] ? `${v.label}, ${ENGINE_SCOPE[id]}` : v.label;
    return `${label}: ${num(value)} ${v.unit} (${v.risky === 'above' ? 'umbral' : 'mínimo'} ${num(v.threshold, 2)})`;
  }).filter(Boolean);
}

/**
 * One strip per row under a plot.
 * @param {object} o
 * @param {{label: string, color: string, path: object[]}[]} o.rows
 * @param {(year: number) => number} o.x   year → x of the plot
 * @param {number} o.top     y where the first strip starts
 * @param {number} [o.rowHeight]
 * @param {number} [o.left]  x where the colour key of each row goes
 */
export function riskStripSvg({ rows, x, top, rowHeight = 7, gap = 3, left = 8, key = true }) {
  return rows.map((row, r) => {
    const y = top + r * (rowHeight + gap);
    const cells = row.path.filter(p => p.level).map(p => {
      const x0 = x(p.year - 0.5), x1 = x(p.year + 0.5);
      return `<rect x="${x0.toFixed(1)}" y="${y}" width="${Math.max(0.5, x1 - x0).toFixed(1)}" height="${rowHeight}" fill="${RISK_FILL[p.level]}" shape-rendering="crispEdges"><title>${esc(`${row.label} · ${p.year}: riesgo ${RISK_LABEL[p.level]} (índice ${num(p.index, 2)})`)}</title></rect>`;
    }).join('');
    return `${key ? `<rect x="${left}" y="${y}" width="${rowHeight + 3}" height="${rowHeight}" rx="2" fill="${row.color}"><title>${esc(row.label)}</title></rect>` : ''}${cells}`;
  }).join('');
}

export function riskStripHeight(rows, rowHeight = 7, gap = 3) {
  return rows * (rowHeight + gap);
}

/** Legend of the strip, with what it is and where it comes from. */
// `brief` (Comparativas, U5 #142): the index and its thresholds go in the chart's fold «Más sobre el gráfico».
export function riskLegendHtml({ brief = false } = {}) {
  const note = brief ? 'Riesgo de tensión fiscal de cada año. Es un aviso, no una previsión de crisis.'
    : `Franjas: riesgo de tensión fiscal de cada año, con el ${S0_SHORT} (umbrales del Debt Sustainability Monitor 2022). Es un aviso a uno o dos años, no una previsión de crisis.`;
  return `<p class="risk-legend"><span><i style="background:${RISK_FILL.low}"></i>riesgo bajo</span><span><i style="background:${RISK_FILL.moderate}"></i>moderado</span><span><i style="background:${RISK_FILL.high}"></i>alto</span>
    <small>${note}</small></p>`;
}
