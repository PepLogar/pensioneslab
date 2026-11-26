// A fan chart as a standalone SVG («Riesgo de mercado», riesgo.html): the band between percentiles 5 and 95,
// the darker band between 25 and 75, the median, and the run without market shocks dashed. Every style
// inline, the stamp at the foot and the citation in <desc>, as the charts of «Gráficos». Pure.
import { num as formatNum } from '../shared/number-format.js';
import { niceTicks } from './chart-svg.js';

const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// The real minus sign (−) and the comma, as everywhere (src/shared/number-format.js).
const fmt = (v, d) => formatNum(v, d, { fixed: true });

/**
 * @param {{ year: number, 5: number, 25: number, 50: number, 75: number, 95: number }[]} fan
 * @param {(number|null)[]} base  the run without shocks, year by year from fan[0].year
 * @param {{ title: string, axis: string, colour?: string, stamp?: string[], desc?: string, width?: number, height?: number }} o
 */
export function fanSvg(fan, base, { title, axis, colour = '#0072B2', stamp = [], desc = '', width = 960, height = 480 }) {
  const font = 'font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif"';
  const M = { left: 72, right: 24, top: 58, bottom: 56 + stamp.length * 14 };
  const W = width - M.left - M.right, H = height - M.top - M.bottom;
  const values = fan.flatMap(p => [p[5], p[95]]).concat(base).filter(Number.isFinite);
  const y = niceTicks(Math.min(0, ...values), Math.max(...values));
  const y0 = fan[0].year, y1 = fan.at(-1).year;
  const sx = yr => M.left + (yr - y0) / (y1 - y0) * W, sy = v => M.top + (1 - (v - y.lo) / (y.hi - y.lo)) * H;
  const band = (lo, hi) => `M${fan.map(p => `${sx(p.year).toFixed(1)},${sy(p[hi]).toFixed(1)}`).join('L')}L${[...fan].reverse().map(p => `${sx(p.year).toFixed(1)},${sy(p[lo]).toFixed(1)}`).join('L')}Z`;
  const line = points => points.map(([yr, v], i) => `${i ? 'L' : 'M'}${sx(yr).toFixed(1)},${sy(v).toFixed(1)}`).join('');
  const grid = y.ticks.map(v => `<line x1="${M.left}" x2="${M.left + W}" y1="${sy(v).toFixed(1)}" y2="${sy(v).toFixed(1)}" stroke="${v === 0 ? '#888' : '#e3e3e3'}"/>
<text x="${M.left - 8}" y="${(sy(v) + 4).toFixed(1)}" font-size="11" fill="#333" text-anchor="end">${fmt(v, y.digits)}</text>`).join('\n');
  const xTicks = [];
  for (let yr = Math.ceil(y0 / 10) * 10; yr <= y1; yr += 10) xTicks.push(yr);
  const xAxis = xTicks.map(yr => `<text x="${sx(yr).toFixed(1)}" y="${M.top + H + 18}" font-size="11" fill="#333" text-anchor="middle">${yr}</text>`).join('\n');
  const basePoints = base.map((v, i) => [y0 + i, v]).filter(([, v]) => Number.isFinite(v));
  const ly = M.top + H + 38;
  const legend = `<rect x="${M.left}" y="${ly - 8}" width="22" height="10" fill="${colour}" fill-opacity="0.18"/><text x="${M.left + 28}" y="${ly + 1}" font-size="11" fill="#222">percentiles 5–95</text>
<rect x="${M.left + 150}" y="${ly - 8}" width="22" height="10" fill="${colour}" fill-opacity="0.38"/><text x="${M.left + 178}" y="${ly + 1}" font-size="11" fill="#222">25–75</text>
<line x1="${M.left + 240}" x2="${M.left + 266}" y1="${ly - 3}" y2="${ly - 3}" stroke="${colour}" stroke-width="2"/><text x="${M.left + 272}" y="${ly + 1}" font-size="11" fill="#222">mediana</text>
<line x1="${M.left + 350}" x2="${M.left + 376}" y1="${ly - 3}" y2="${ly - 3}" stroke="#111" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${M.left + 382}" y="${ly + 1}" font-size="11" fill="#222">sin choques de mercado</text>`;
  const foot = stamp.map((s, i) => `<text x="${M.left}" y="${ly + 22 + i * 14}" font-size="9.5" fill="#666">${esc(s)}</text>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ${font}>
<title>${esc(title)}</title>${desc ? `<desc>${esc(desc)}</desc>` : ''}
<rect width="${width}" height="${height}" fill="#ffffff"/>
<text x="${M.left}" y="24" font-size="17" font-weight="700" fill="#111">${esc(title)}</text>
<text x="${M.left}" y="44" font-size="12" fill="#555">${esc(axis)}</text>
${grid}
<line x1="${M.left}" x2="${M.left + W}" y1="${M.top + H}" y2="${M.top + H}" stroke="#333"/>
${xAxis}
<path d="${band(5, 95)}" fill="${colour}" fill-opacity="0.18" stroke="none"/>
<path d="${band(25, 75)}" fill="${colour}" fill-opacity="0.38" stroke="none"/>
<path d="${line(fan.map(p => [p.year, p[50]]))}" fill="none" stroke="${colour}" stroke-width="2"/>
${basePoints.length ? `<path d="${line(basePoints)}" fill="none" stroke="#111" stroke-width="1.5" stroke-dasharray="6 4"/>` : ''}
${legend}
${foot}
</svg>`;
}
