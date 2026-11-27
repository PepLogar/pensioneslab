// A chart as a standalone SVG string: every style inline, so the exported file looks the same in a browser,
// Inkscape or Illustrator. Lines by system (colour) and variable (dash), axes with round ticks, a legend,
// and the stamp (version, methodology, data, date, scenario) at the foot. Pure: no DOM.
import { num as formatNum } from '../shared/number-format.js';

// Okabe–Ito first, readable by colour-blind readers; then more for the saved scenarios. One per run, in the
// order the page lists them; past the list they repeat.
export const PALETTE = ['#000000', '#E69F00', '#56B4E9', '#009E73', '#D55E00', '#0072B2', '#CC79A7', '#8C6D1F', '#7F3C8D', '#11A579', '#E73F74', '#3969AC', '#80BA5A', '#A5AA99'];
export const DASHES = ['', '7 4', '2 3', '10 3 2 3', '4 4'];

const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// The real minus sign (−) and the comma, as everywhere (src/shared/number-format.js).
const fmt = (v, digits) => formatNum(v, digits, { fixed: true });

/** Round ticks covering [lo, hi]: steps of 1, 2 or 5 times a power of ten. */
export function niceTicks(lo, hi, count = 6) {
  if (!(hi > lo)) { const pad = Math.abs(lo) || 1; lo -= pad / 2; hi += pad / 2; }
  const raw = (hi - lo) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(m => m * power).find(s => s >= raw);
  const start = Math.floor(lo / step) * step, end = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return { ticks, step, lo: start, hi: end, digits: Math.max(0, -Math.floor(Math.log10(step) + 1e-9)) };
}

/**
 * @param {{ lines: object[], axis: string }} data  from chartLines (src/domain/chart-data.js)
 * @param {{ title: string, systemOrder: string[], zero?: boolean, stamp: string[], desc?: string, width?: number, height?: number }} o
 *   `stamp`: lines printed at the foot; `desc`: the full citation, kept in the file (<desc>), with the scenario link
 */
export function chartSvg(data, { title, systemOrder, zero = true, stamp = [], desc = '', width = 960, height = 560, marks = [], legend: showLegend = true }) {
  const font = 'font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif"';
  const lines = data.lines;
  const variables = [...new Set(lines.map(l => l.variable))];
  const legendRows = showLegend ? Math.ceil(lines.length / 3) : 0;
  const M = { left: 72, right: 24, top: 58, bottom: 52 + legendRows * 18 + stamp.length * 14 };
  const W = width - M.left - M.right, H = height - M.top - M.bottom;
  const all = lines.flatMap(l => l.points).filter(([, v]) => v !== null);
  const years = all.map(([y]) => y);
  const values = all.map(([, v]) => v);
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ${font}>
<title>${esc(title)}</title>${desc ? `<desc>${esc(desc)}</desc>` : ''}
<rect width="${width}" height="${height}" fill="#ffffff"/>
<text x="${M.left}" y="24" font-size="17" font-weight="700" fill="#111">${esc(title)}</text>
<text x="${M.left}" y="44" font-size="12" fill="#555">${esc(data.axis)}</text>`;
  if (!all.length) return `${head}<text x="${M.left}" y="${M.top + 40}" font-size="13" fill="#555">Sin datos para estos ajustes.</text></svg>`;
  const y0 = Math.min(...years), y1 = Math.max(...years);
  const y = niceTicks(zero ? Math.min(0, ...values) : Math.min(...values), zero ? Math.max(0, ...values) : Math.max(...values));
  const sx = yr => M.left + (y1 > y0 ? (yr - y0) / (y1 - y0) : 0.5) * W;
  const sy = v => M.top + (1 - (v - y.lo) / (y.hi - y.lo)) * H;
  const xStep = y1 - y0 > 30 ? 10 : 5;
  const xTicks = [];
  for (let yr = Math.ceil(y0 / xStep) * xStep; yr <= y1; yr += xStep) xTicks.push(yr);
  if (!xTicks.includes(y0)) xTicks.unshift(y0);
  const grid = y.ticks.map(v => `<line x1="${M.left}" x2="${M.left + W}" y1="${sy(v).toFixed(1)}" y2="${sy(v).toFixed(1)}" stroke="${v === 0 ? '#888' : '#e3e3e3'}" stroke-width="1"/>
<text x="${M.left - 8}" y="${(sy(v) + 4).toFixed(1)}" font-size="11" fill="#333" text-anchor="end">${fmt(v, y.digits)}</text>`).join('\n');
  const xAxis = xTicks.map(yr => `<line x1="${sx(yr).toFixed(1)}" x2="${sx(yr).toFixed(1)}" y1="${M.top + H}" y2="${M.top + H + 5}" stroke="#333"/>
<text x="${sx(yr).toFixed(1)}" y="${M.top + H + 18}" font-size="11" fill="#333" text-anchor="middle">${yr}</text>`).join('\n');
  const colour = l => PALETTE[Math.max(0, systemOrder.indexOf(l.system)) % PALETTE.length];
  const dash = l => DASHES[variables.indexOf(l.variable) % DASHES.length];
  const paths = lines.map(l => {
    let d = '', pen = false;
    for (const [yr, v] of l.points) {
      if (v === null) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${sx(yr).toFixed(1)},${sy(v).toFixed(1)}`;
      pen = true;
    }
    return d ? `<path d="${d}" fill="none" stroke="${colour(l)}" stroke-width="2"${dash(l) ? ` stroke-dasharray="${dash(l)}"` : ''} stroke-linejoin="round"><title>${esc(`${l.systemLabel} · ${l.variableName}`)}</title></path>` : '';
  }).join('\n');
  const legendTop = M.top + H + 36;
  const colW = W / 3;
  // A year to mark (the break year of a report): a dashed red line with its label (1.90).
  const markLines = marks.filter(m => m.year >= y0 && m.year <= y1).map(m => `<line x1="${sx(m.year).toFixed(1)}" x2="${sx(m.year).toFixed(1)}" y1="${M.top}" y2="${M.top + H}" stroke="#a5281d" stroke-width="1.2" stroke-dasharray="3 3"/>
<text x="${(sx(m.year) + (sx(m.year) > M.left + 0.75 * W ? -4 : 4)).toFixed(1)}" y="${M.top + 12}" font-size="11" fill="#a5281d"${sx(m.year) > M.left + 0.75 * W ? ' text-anchor="end"' : ''}>${esc(m.label)} en ${m.year}</text>`).join('\n');
  const legend = (showLegend ? lines : []).map((l, i) => {
    const lx = M.left + (i % 3) * colW, ly = legendTop + Math.floor(i / 3) * 18;
    const text = variables.length > 1 ? `${l.systemLabel} · ${l.variableName}` : l.systemLabel;
    return `<line x1="${lx}" x2="${lx + 26}" y1="${ly}" y2="${ly}" stroke="${colour(l)}" stroke-width="2"${dash(l) ? ` stroke-dasharray="${dash(l)}"` : ''}/>
<text x="${lx + 32}" y="${ly + 4}" font-size="11" fill="#222">${esc(text.length > 52 ? `${text.slice(0, 51)}…` : text)}</text>`;
  }).join('\n');
  const stampTop = legendTop + legendRows * 18 + 6;
  const foot = stamp.map((s, i) => `<text x="${M.left}" y="${stampTop + i * 14}" font-size="9.5" fill="#666">${esc(s)}</text>`).join('\n');
  return `${head}
<line x1="${M.left}" x2="${M.left}" y1="${M.top}" y2="${M.top + H}" stroke="#333"/>
<line x1="${M.left}" x2="${M.left + W}" y1="${M.top + H}" y2="${M.top + H}" stroke="#333"/>
${grid}
${xAxis}
${markLines ? `${markLines}\n` : ''}${paths}
${legend}
${foot}
</svg>`;
}
