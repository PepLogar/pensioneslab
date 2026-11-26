// «Gráficos»: a builder of charts over the scenario open in the console and the six systems with its
// settings (the 1985 counterfactual too), the scenarios saved in this browser and the «Supuestos de otros» profiles
// (src/domain/reference-profiles.js), added by ticking them. Each chart picks variables of one unit (the CSV's series), the
// systems, the years and the view (euros of 2026, of each year, or % of GDP), and exports a standalone SVG
// with the stamp. The figures are the CSV's (src/domain/chart-data.js). Charts are kept in this browser.
import { getState, getSavedCustomScenarios, CUSTOM_PRESETS_KEY } from '../shared/scenario-store.js';
import { BASE_YEAR, END_YEAR } from '../shared/default-config.js';
import { bindScenario } from '../shared/page-helpers.js';
import { simulateAsync } from '../shared/sim-client.js';
import { loadComparison } from '../shared/comparison-systems.js';
import { scenarioSystemName } from '../shared/scenario-labels.js';
import { exportStamp, stampLine } from '../shared/citation.js';
import { saveFile } from '../shared/save-file.js';
import { REFERENCE_PROFILES, profileConfig } from '../domain/reference-profiles.js';
import { SERIES_VARIABLES, SERIES_UNITS } from '../domain/series-dictionary.js';
import { VARIABLES, VIEWS, viewsFor, chartLines } from '../domain/chart-data.js';
import { chartSvg, PALETTE } from '../views/chart-svg.js';
import { mountSiteHeader } from '../shared/site-header.js';

mountSiteHeader();

const $ = selector => document.querySelector(selector);
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const say = text => { $('[data-gx-status]').textContent = text; };
const KEY = 'pensiones-lab3:graficos-v1';
const OWN = 'tu_escenario';

let runs = null;               // [{ key, label, result }]: the scenario, the systems, then the saved scenarios
let order = [OWN];             // runs in their colour order
let base = [];                 // the scenario and the systems; the saved ones come after
const SAVED = 'guardado:';
// «All» is the scenario and the systems; a saved scenario is added by ticking it.
const systemsOf = chart => chart.systems ?? order.filter(k => !k.startsWith(SAVED));
const STARTERS = [
  { title: 'Deuda pública', variables: ['deuda_pct_pib'], systems: null, view: 'native' },
  { title: 'Pensión media y pensión pagable al mes', variables: ['pension_media_mensual', 'pension_pagable_mensual'], systems: [OWN], view: 'native' },
  { title: 'Ingresos y gasto públicos', variables: ['ingresos_publicos', 'gasto_publico'], systems: [OWN], view: 'gdp' }
];
const fresh = s => ({ title: s.title, variables: [...s.variables], systems: s.systems, from: BASE_YEAR, to: END_YEAR, view: s.view, zero: true });

function loadCharts() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (Array.isArray(saved)) return saved.filter(c => c && Array.isArray(c.variables)).map(c => ({ ...fresh({ title: '', variables: [], systems: null, view: 'native' }), ...c, variables: c.variables.filter(v => VARIABLES.has(v)) }));
  } catch { /* the starters */ }
  return STARTERS.map(fresh);
}
let charts = loadCharts();
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(charts)); } catch { /* only for this visit */ } };

// The variable list, by group, with its unit.
const GROUPS = [...new Set(SERIES_VARIABLES.map(v => v.group))];
const variableOptions = unit => GROUPS.map(g => `<optgroup label="${esc(g)}">${SERIES_VARIABLES.filter(v => v.group === g).map(v =>
  `<option value="${v.id}"${unit && v.unit !== unit ? ' disabled' : ''}>${esc(v.name)} (${esc(SERIES_UNITS[v.unit].code)})</option>`).join('')}</optgroup>`).join('');

function svgOf(chart) {
  const systems = systemsOf(chart);
  const data = chartLines(runs, { ...chart, systems });
  const state = getState();
  const stamp = exportStamp(state.config);
  const scenario = scenarioSystemName(state.config);
  return chartSvg(data, {
    title: chart.title || data.lines[0]?.variableName || 'Gráfico', systemOrder: order, zero: chart.zero,
    stamp: [stampLine(stamp), `Tu escenario: ${scenario} (${stamp.scenarioInline}). ${stamp.caveat}`],
    desc: stamp.cite
  });
}

function cardHtml(chart, i) {
  const unit = VARIABLES.get(chart.variables[0])?.unit ?? null;
  const systems = systemsOf(chart);
  const chips = chart.variables.map(id => `<span class="gx-chip">${esc(VARIABLES.get(id)?.name ?? id)}<button type="button" data-remove-var="${id}" aria-label="Quitar ${esc(VARIABLES.get(id)?.name ?? id)}">×</button></span>`).join(' ');
  const boxes = runs.map(r => `<label><input type="checkbox" data-system="${r.key}"${systems.includes(r.key) ? ' checked' : ''}><span class="gx-swatch" style="border-color:${PALETTE[order.indexOf(r.key) % PALETTE.length]}"></span>${esc(r.label)}</label>`).join('');
  const views = viewsFor(unit).map(v => `<option value="${v}"${v === chart.view ? ' selected' : ''}>${esc(VIEWS[v])}</option>`).join('');
  return `<section class="gx-card" data-chart="${i}">
    <div class="gx-controls">
      <span>Título</span><input type="text" class="gx-title" data-field="title" value="${esc(chart.title)}" maxlength="120">
      <span>Variables</span><div class="gx-row">${chips || '<em>ninguna</em>'}
        <select data-add-var aria-label="Añadir una variable"><option value="">Añadir variable…</option>${variableOptions(unit)}</select></div>
      <span>Sistemas</span><div class="gx-row">${boxes}</div>
      <span>Años y escala</span><div class="gx-row">
        <label>De <input type="number" class="gx-years" data-field="from" min="${BASE_YEAR}" max="${END_YEAR}" value="${chart.from}"></label>
        <label>a <input type="number" class="gx-years" data-field="to" min="${BASE_YEAR}" max="${END_YEAR}" value="${chart.to}"></label>
        <label>Unidad <select data-field="view">${views}</select></label>
        <label><input type="checkbox" data-field="zero"${chart.zero ? ' checked' : ''}> Eje desde 0</label></div>
    </div>
    <div class="gx-svg">${chart.variables.length ? svgOf(chart) : '<p>Añade una variable.</p>'}</div>
    <div class="gx-actions"><button type="button" data-export>Exportar SVG</button><button type="button" data-copy>Duplicar</button><button type="button" data-drop>Quitar</button></div>
  </section>`;
}

function render() {
  if (!runs) return;
  $('[data-gx-list]').innerHTML = charts.map(cardHtml).join('') || '<p>Sin gráficos. «Añadir gráfico» crea uno.</p>';
}

function update(i, change) {
  charts[i] = { ...charts[i], ...change };
  keep();
  const card = document.querySelector(`[data-chart="${i}"]`);
  if (card) card.outerHTML = cardHtml(charts[i], i);
}

const list = $('[data-gx-list]');
list.addEventListener('change', event => {
  const card = event.target.closest('[data-chart]');
  if (!card) return;
  const i = Number(card.dataset.chart), chart = charts[i], t = event.target;
  if (t.matches('[data-add-var]')) {
    const id = t.value;
    if (!id || chart.variables.includes(id)) return;
    const unit = VARIABLES.get(chart.variables[0])?.unit;
    if (unit && VARIABLES.get(id).unit !== unit) { say('Un gráfico lleva variables de una sola unidad.'); return; }
    const variables = [...chart.variables, id];
    const view = viewsFor(VARIABLES.get(id).unit).includes(chart.view) ? chart.view : 'native';
    update(i, { variables, view, title: chart.title || VARIABLES.get(id).name });
    return;
  }
  if (t.matches('[data-system]')) {
    const systems = new Set(systemsOf(chart));
    if (t.checked) systems.add(t.dataset.system); else systems.delete(t.dataset.system);
    update(i, { systems: order.filter(k => systems.has(k)) });
    return;
  }
  const field = t.dataset.field;
  if (field === 'zero') update(i, { zero: t.checked });
  else if (field === 'view') update(i, { view: t.value });
  else if (field === 'from' || field === 'to') {
    const v = Math.round(Number(t.value));
    if (!Number.isFinite(v)) { update(i, {}); return; }
    const year = Math.min(END_YEAR, Math.max(BASE_YEAR, v));
    const from = field === 'from' ? Math.min(year, chart.to - 1) : chart.from;
    const to = field === 'to' ? Math.max(year, chart.from + 1) : chart.to;
    update(i, { from, to });
  } else if (field === 'title') update(i, { title: t.value.trim() });
});
list.addEventListener('click', async event => {
  const card = event.target.closest('[data-chart]');
  if (!card) return;
  const i = Number(card.dataset.chart), chart = charts[i];
  const removeVar = event.target.closest('[data-remove-var]');
  if (removeVar) { update(i, { variables: chart.variables.filter(v => v !== removeVar.dataset.removeVar) }); return; }
  if (event.target.closest('[data-drop]')) { charts.splice(i, 1); keep(); render(); return; }
  if (event.target.closest('[data-copy]')) { charts.splice(i + 1, 0, { ...structuredClone(chart), title: `${chart.title} (copia)` }); keep(); render(); return; }
  if (event.target.closest('[data-export]')) {
    if (!chart.variables.length) { say('Añade una variable antes de exportar.'); return; }
    const slug = (chart.title || 'grafico').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const name = `pensiones-lab-grafico-${slug}-${new Date().toISOString().slice(0, 10)}.svg`;
    try { say(await saveFile({ name, mime: 'image/svg+xml', ext: '.svg', make: () => new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svgOf(chart)}`], { type: 'image/svg+xml' }) })); }
    catch (error) { say(`No se ha podido exportar: ${error?.message ?? error}`); }
  }
});
$('[data-gx-add]').addEventListener('click', () => {
  charts.push(fresh({ title: '', variables: [], systems: null, view: 'native' }));
  keep(); render();
  document.querySelector(`[data-chart="${charts.length - 1}"] [data-add-var]`)?.focus();
});

// The scenario open in the console, and each system with its settings.
// The saved scenarios: computed apart, so saving one in the console (another tab) adds it without recomputing the rest.
async function savedRuns() {
  const list = getSavedCustomScenarios();
  const [results, profiles] = await Promise.all([Promise.all(list.map(s => simulateAsync(s.config).catch(() => null))), profileRuns()]);
  return [...list.map((s, i) => ({ key: SAVED + s.id, label: `Guardado: ${s.name}`, result: results[i] })).filter(r => r.result), ...profiles];
}
// The profiles do not depend on the open scenario: computed once per visit.
let profilesOnce = null;
function profileRuns() {
  profilesOnce ??= Promise.all(REFERENCE_PROFILES.map(p => simulateAsync(profileConfig(p)).catch(() => null)))
    .then(results => REFERENCE_PROFILES.map((p, i) => ({ key: SAVED + p.id, label: p.name, result: results[i] })).filter(r => r.result));
  return profilesOnce;
}
function setRuns(saved) {
  runs = [...base, ...saved];
  order = runs.map(r => r.key);
  // A saved scenario that was deleted leaves the charts that showed it.
  charts = charts.map(c => c.systems ? { ...c, systems: c.systems.filter(k => !k.startsWith(SAVED) || order.includes(k)) } : c);
}
window.addEventListener('storage', async event => {
  if (event.key !== CUSTOM_PRESETS_KEY || !runs) return;
  say('Leyendo los guardados…');
  setRuns(await savedRuns());
  say('');
  render();
});

bindScenario({
  load: async state => {
    const [own, others, saved] = await Promise.all([simulateAsync(state.config), loadComparison(state.config, state.limits, { includeMixedGradual: true }), savedRuns()]);
    return { base: [{ key: OWN, label: 'Tu escenario', result: own }, ...others.map(s => ({ key: s.key, label: s.label.replace(/^⏳ /, ''), result: s.result }))], saved };
  },
  onLoading: () => say('Calculando…'),
  render: (state, data) => {
    base = data.base;
    setRuns(data.saved);
    $('[data-gx-scenario]').textContent = `Tu escenario: ${scenarioSystemName(state.config)}`;
    say('');
    render();
  }
});
