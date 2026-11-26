// The tornado of «Sensibilidad» as a standalone SVG: one row per assumption, a bar from the scenario's value
// to what each variant gives (blue, the step down or the other option; orange, the step up), largest first.
// Every style inline, the stamp at the foot and the citation in <desc>, as the charts of «Gráficos». Pure.
import { num as formatNum } from '../shared/number-format.js';
import { niceTicks } from './chart-svg.js';

const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// The real minus sign (−) and the comma, as everywhere (src/shared/number-format.js).
const fmt = (v, d = 0) => formatNum(v, d, { fixed: true });
export const LOW = '#0072B2', HIGH = '#D55E00';

/**
 * @param {{ label: string, base: number, bars: { value: number, text: string, low: boolean }[] }[]} rows  largest first
 * @param {{ title: string, axis: string, digits?: number, stamp?: string[], desc?: string, width?: number }} o
 */
export function tornadoSvg(rows, { title, axis, digits = 0, stamp = [], desc = '', width = 960 }) {
  const font = 'font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif"';
  const rowH = 26, M = { left: 300, right: 120, top: 70, bottom: 40 + stamp.length * 14 };
  const height = M.top + rows.length * rowH + M.bottom;
  const W = width - M.left - M.right;
  const base = rows[0]?.base ?? 0;
  const values = [base, ...rows.flatMap(r => r.bars.map(b => b.value))].filter(Number.isFinite);
  const t = niceTicks(Math.min(...values), Math.max(...values), 6);
  const sx = v => M.left + (v - t.lo) / (t.hi - t.lo) * W;
  const grid = t.ticks.map(v => `<line x1="${sx(v).toFixed(1)}" x2="${sx(v).toFixed(1)}" y1="${M.top - 6}" y2="${M.top + rows.length * rowH}" stroke="#e3e3e3"/>
<text x="${sx(v).toFixed(1)}" y="${M.top - 10}" font-size="11" fill="#333" text-anchor="middle">${fmt(v, t.digits)}</text>`).join('\n');
  const body = rows.map((r, i) => {
    const y = M.top + i * rowH, mid = y + rowH / 2;
    const bars = r.bars.map(b => {
      const x0 = sx(Math.min(base, b.value)), x1 = sx(Math.max(base, b.value));
      const right = b.value >= base;
      return `<rect x="${x0.toFixed(1)}" y="${(y + 5).toFixed(1)}" width="${Math.max(1, x1 - x0).toFixed(1)}" height="${rowH - 10}" fill="${b.low ? LOW : HIGH}" fill-opacity="0.85"><title>${esc(`${r.label}: ${b.text} → ${fmt(b.value, digits)}`)}</title></rect>
<text x="${(right ? x1 + 4 : x0 - 4).toFixed(1)}" y="${(mid + 4).toFixed(1)}" font-size="10.5" fill="#333" text-anchor="${right ? 'start' : 'end'}">${esc(b.text)}</text>`;
    }).join('\n');
    return `<text x="${M.left - 10}" y="${(mid + 4).toFixed(1)}" font-size="11.5" fill="#111" text-anchor="end">${esc(r.label.length > 46 ? `${r.label.slice(0, 45)}…` : r.label)}</text>
${bars}`;
  }).join('\n');
  const foot = stamp.map((s, i) => `<text x="16" y="${height - M.bottom + 30 + i * 14}" font-size="9.5" fill="#666">${esc(s)}</text>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ${font}>
<title>${esc(title)}</title>${desc ? `<desc>${esc(desc)}</desc>` : ''}
<rect width="${width}" height="${height}" fill="#ffffff"/>
<text x="16" y="24" font-size="17" font-weight="700" fill="#111">${esc(title)}</text>
<text x="16" y="44" font-size="12" fill="#555">${esc(axis)} · línea: tu escenario (${fmt(base, digits)}) · <tspan fill="${LOW}">■</tspan> abajo u otra opción · <tspan fill="${HIGH}">■</tspan> arriba</text>
${grid}
${body}
<line x1="${sx(base).toFixed(1)}" x2="${sx(base).toFixed(1)}" y1="${M.top - 6}" y2="${M.top + rows.length * rowH}" stroke="#111" stroke-width="1.5"/>
${foot}
</svg>`;
}
