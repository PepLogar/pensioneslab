// «Gráficos» (graficos.html): a chart shows the CSV's figures. The % of GDP view of an amount is the engine's
// own ratio, the nominal view multiplies by the price index, a chart keeps one unit, and the SVG stands alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { chartLines, VARIABLES } from '../src/domain/chart-data.js';
import { chartSvg, niceTicks, PALETTE } from '../src/views/chart-svg.js';

const result = simulate(DEFAULT_CONFIG);
const runs = [{ key: 'tu_escenario', label: 'Tu escenario', result }];
const spec = patch => ({ variables: ['deuda'], systems: ['tu_escenario'], from: 2026, to: 2070, view: 'native', ...patch });

test('the views of an amount: % of GDP is the engine ratio, nominal is times the price index', () => {
  const gdp = chartLines(runs, spec({ view: 'gdp' })).lines[0].points;
  const nominal = chartLines(runs, spec({ view: 'nominal' })).lines[0].points;
  const native = chartLines(runs, spec()).lines[0].points;
  result.years.forEach((p, i) => {
    assert.ok(Math.abs(gdp[i][1] - p.debtGDP) < 1e-9, `${p.year} % PIB`);
    assert.ok(Math.abs(nominal[i][1] - native[i][1] * p.priceIndex) < 1e-6, `${p.year} nominal`);
  });
});

test('a chart keeps one unit, its years and its systems', () => {
  const data = chartLines(runs, spec({ variables: ['deuda', 'pension_media_mensual'], from: 2030, to: 2040, systems: ['tu_escenario', 'otro'] }));
  assert.deepEqual(data.lines.map(l => l.variable), ['deuda']);
  assert.deepEqual([data.lines[0].points[0][0], data.lines[0].points.at(-1)[0]], [2030, 2040]);
  assert.equal(VARIABLES.get('pension_media_mensual').unit, 'eur2026');
});

test('the SVG stands alone: its title, a path per line, round ticks and the citation', () => {
  const svg = chartSvg(chartLines(runs, spec({ view: 'gdp' })), { title: 'Deuda & más', systemOrder: ['tu_escenario'], stamp: ['sello'], desc: 'cita' });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<title>Deuda &amp; más<\/title><desc>cita<\/desc>/);
  assert.equal((svg.match(/<path /g) ?? []).length, 1);
  assert.doesNotMatch(svg, /class=|style=/, 'every style inline, as attributes');
  assert.deepEqual(niceTicks(0, 276.9).ticks, [0, 50, 100, 150, 200, 250, 300]);
  // The scenario, seven systems and a few saved scenarios, each with its own colour.
  assert.ok(new Set(PALETTE).size >= 12);
});
