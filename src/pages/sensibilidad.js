// «Sensibilidad»: which assumption decides the result of the scenario open in the console. Each assumption
// of src/domain/sensitivity.js is moved one at a time (about 35 runs of the engine, in parallel in the pool
// of workers); the tornado shows the chosen measure, the table all four. Exports: the tornado in SVG, the table in CSV.
import { getState, subscribe } from '../shared/scenario-store.js';
import { simulateAsync } from '../shared/sim-client.js';
import { scenarioSystemName } from '../shared/scenario-labels.js';
import { exportStamp, stampLine, stampCommentLines } from '../shared/citation.js';
import { configErrorText } from '../shared/config-error-text.js';
import { saveFile } from '../shared/save-file.js';
import { SENSITIVITY, variants, measures, rankEffects, settingLabel } from '../domain/sensitivity.js';
import { tornadoSvg } from '../views/tornado-svg.js';
import { resultCacheKey, readResult, saveResult, savedWhen } from '../shared/result-cache.js';
import { num as formatNum } from '../shared/number-format.js';
import { mountSiteHeader } from '../shared/site-header.js';

mountSiteHeader();

const $ = selector => document.querySelector(selector);
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const say = text => { $('[data-sx-status]').textContent = text; };
// The real minus sign (−) and the comma, as everywhere (src/shared/number-format.js).
const num = (v, d = 0) => formatNum(v, d, { fixed: true });
const signed = (v, d = 0) => Number.isFinite(v) ? `${v > 0 ? '+' : v < 0 ? '−' : '±'}${num(Math.abs(v), d)}` : '—';
const year = y => y ?? 'nunca';

const METRICS = {
  debt2070: { title: 'Deuda pública en 2070', axis: '% del PIB', digits: 0 },
  breakYear: { title: 'Año en que se rompe', axis: 'año (2071 = no se rompe antes de 2071)', digits: 0 },
  pension2050: { title: 'Pensión frente al salario en 2050', axis: '% del salario medio, con el dividendo si lo hay', digits: 1 },
  gap2050: { title: 'Lo que falta para pensiones en 2050', axis: '% del PIB', digits: 2 }
};

let ranked = null, base = null, config = null, token = 0;

// force: compute again even when a summary of a previous visit is kept (src/shared/result-cache.js).
async function run(force = false) {
  const mine = ++token;
  ranked = null;
  $('[data-sx-svg]').disabled = $('[data-sx-csv]').disabled = true;
  $('[data-sx-rerun]').hidden = true;
  config = getState().config;
  $('[data-sx-scenario]').textContent = `Tu escenario: ${scenarioSystemName(config)}`;
  const jobs = SENSITIVITY.map(item => ({ item, runs: variants(item, config) }));
  const total = 1 + jobs.reduce((n, j) => n + j.runs.length, 0);
  // The key holds every variant's patch, so a change of the steps in src/domain/sensitivity.js misses too.
  const cacheKey = resultCacheKey('sensibilidad', config, { variants: jobs.map(j => [j.item.id, j.runs.map(v => v.patch)]) });
  const kept = force ? null : await readResult(cacheKey);
  if (mine !== token) return;
  if (kept && kept.value.ms?.length === total - 1) {
    base = kept.value.base;
    jobs.flatMap(j => j.runs).forEach((v, i) => { v.m = kept.value.ms[i]; });
    ranked = rankEffects(base, jobs);
    say(`Resultado ${savedWhen(kept.savedAt)}, con este escenario y esta versión: no se ha vuelto a calcular.`);
    $('[data-sx-svg]').disabled = $('[data-sx-csv]').disabled = false;
    $('[data-sx-rerun]').hidden = false;
    render();
    return;
  }
  let done = 0;
  const step = () => say(`Calculando ${++done} de ${total}…`);
  say(`Calculando 0 de ${total}…`);
  const failed = [];
  try {
    // All at once: the client's pool of workers runs them in parallel across cores (src/shared/sim-client.js).
    // A variant that fails does not hide the others: they are shown, and the page says how many failed and why.
    const one = async v => { const m = measures(await simulateAsync({ ...config, ...v.patch })); if (mine === token) step(); return m; };
    const all = [{ patch: {} }, ...jobs.flatMap(j => j.runs)];
    const settled = await Promise.allSettled(all.map(one));
    if (mine !== token) return;
    if (settled[0].status === 'rejected') throw settled[0].reason;
    base = settled[0].value;
    all.slice(1).forEach((v, i) => {
      const s = settled[i + 1];
      if (s.status === 'fulfilled') v.m = s.value;
      else { v.failed = true; failed.push(s.reason); }
    });
    if (failed.length) for (const j of jobs) j.runs = j.runs.filter(v => !v.failed);
    else saveResult(cacheKey, { base, ms: settled.slice(1).map(s => s.value) });
  } catch (error) {
    if (mine === token) say(`No se ha podido calcular. ${configErrorText(error, 'El escenario no se puede simular.')}`);
    return;
  }
  if (mine !== token) return;
  ranked = rankEffects(base, jobs.filter(j => j.runs.length));
  say(failed.length ? `No se ${failed.length === 1 ? 'ha' : 'han'} podido calcular ${failed.length} de ${total - 1} variantes. Se muestran las demás. Motivo: ${configErrorText(failed[0], 'su valor no se puede simular.')}` : '');
  $('[data-sx-svg]').disabled = $('[data-sx-csv]').disabled = false;
  render();
}

const metricValue = (m, key) => key === 'breakYear' ? (m.breakYear ?? 2071) : m[key];
const variantText = (item, v) => `${item.show(v.value)}`;

function tornadoRows(key) {
  const reach = r => Math.max(0, ...r.effects.map(e => Math.abs(metricValue(e.m, key) - metricValue(base, key)) || 0));
  return ranked.filter(r => reach(r) > (key === 'breakYear' ? 0 : 1e-6)).sort((a, b) => reach(b) - reach(a)).map(r => ({
    label: `${settingLabel(r.item.key)}`,
    base: metricValue(base, key),
    bars: r.effects.map((e, i) => ({ value: metricValue(e.m, key), text: variantText(r.item, e), low: r.item.kind === 'flip' || e.value < config[r.item.key] }))
  }));
}

function svgFor(key) {
  const meta = METRICS[key];
  const stamp = exportStamp(config);
  return tornadoSvg(tornadoRows(key), {
    title: `Qué supuesto decide: ${meta.title.toLowerCase()}`, axis: meta.axis, digits: meta.digits,
    stamp: [stampLine(stamp), `Tu escenario: ${scenarioSystemName(config)} (${stamp.scenarioInline}). Cada supuesto, de uno en uno. ${stamp.caveat}`],
    desc: stamp.cite
  });
}

function render() {
  if (!ranked) return;
  const key = $('[data-sx-metric]').value;
  const rows = tornadoRows(key);
  $('[data-sx-chart]').innerHTML = rows.length ? svgFor(key) : `<p>Ningún supuesto mueve «${esc(METRICS[key].title.toLowerCase())}» en este escenario.</p>`;
  const active = ranked.filter(r => !r.idle);
  const body = active.flatMap(r => r.effects.map((e, i) => `<tr>${i === 0 ? `<th scope="row" rowspan="${r.effects.length}">${esc(settingLabel(r.item.key))}<br><span class="sx-muted">${esc(r.item.group)}</span></th>
      <td rowspan="${r.effects.length}">${esc(r.item.show(config[r.item.key]))}</td>` : ''}
    <td>${esc(variantText(r.item, e))}</td>
    <td class="num">${num(e.m.debt2070)} <span class="sx-muted">(${signed(e.delta.debt2070)})</span></td>
    <td class="num">${year(e.m.breakYear)} <span class="sx-muted">(${e.delta.breakYear ? signed(e.delta.breakYear) : '='})</span></td>
    <td class="num">${num(e.m.pension2050, 1)} <span class="sx-muted">(${signed(e.delta.pension2050, 1)})</span></td>
    <td class="num">${num(e.m.gap2050, 2)} <span class="sx-muted">(${signed(e.delta.gap2050, 2)})</span></td>
    ${i === 0 ? `<td rowspan="${r.effects.length}" class="sx-muted">${esc(r.item.why)}</td>` : ''}</tr>`)).join('');
  $('[data-sx-table]').innerHTML = `<table class="sx-table"><thead><tr><th scope="col">Supuesto</th><th scope="col">En tu escenario</th><th scope="col">Variante</th>
    <th scope="col">Deuda 2070, % PIB</th><th scope="col">Se rompe</th><th scope="col">Pensión/salario 2050, %</th><th scope="col">Falta 2050, % PIB</th><th scope="col">Paso elegido</th></tr>
    <tr class="sx-base"><th scope="row" colspan="3">Tu escenario</th><td class="num">${num(base.debt2070)}</td><td class="num">${year(base.breakYear)}</td><td class="num">${num(base.pension2050, 1)}</td><td class="num">${num(base.gap2050, 2)}</td><td></td></tr></thead>
    <tbody>${body}</tbody></table>`;
  const idle = ranked.filter(r => r.idle).map(r => settingLabel(r.item.key));
  $('[data-sx-idle]').textContent = idle.length ? `Sin efecto en este escenario (no mueven ninguna de las cuatro medidas): ${idle.join('; ')}. Por ejemplo, las respuestas a los impuestos solo actúan si el escenario sube impuestos.` : '';
}

function csvText() {
  const q = v => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const n = v => (Number.isFinite(v) ? String(Number(v.toFixed(6))) : '');
  const head = ['supuesto', 'clave', 'grupo', 'valor_escenario', 'variante', 'deuda_2070_pct_pib', 'delta_deuda', 'anio_se_rompe', 'delta_anios', 'pension_salario_2050_pct', 'delta_pension', 'falta_2050_pct_pib', 'delta_falta', 'paso'];
  const rows = [['tu_escenario', '', '', '', '', n(base.debt2070), '', base.breakYear ?? '', '', n(base.pension2050), '', n(base.gap2050), '', '']];
  for (const r of ranked) for (const e of r.effects) rows.push([settingLabel(r.item.key), r.item.key, r.item.group, r.item.show(config[r.item.key]), variantText(r.item, e),
    n(e.m.debt2070), n(e.delta.debt2070), e.m.breakYear ?? '', e.delta.breakYear, n(e.m.pension2050), n(e.delta.pension2050), n(e.m.gap2050), n(e.delta.gap2050), r.item.why]);
  return [...stampCommentLines(exportStamp(config)), '# Cada supuesto, de uno en uno, alrededor de tu escenario. anio_se_rompe vacío: no se rompe antes de 2071.', [head, ...rows].map(r => r.map(q).join(';')).join('\n')].join('\n');
}

const today = () => new Date().toISOString().slice(0, 10);
$('[data-sx-metric]').addEventListener('change', render);
$('[data-sx-rerun]').addEventListener('click', () => run(true));
$('[data-sx-svg]').addEventListener('click', async () => {
  const key = $('[data-sx-metric]').value;
  try { say(await saveFile({ name: `pensiones-lab-sensibilidad-${key}-${today()}.svg`, mime: 'image/svg+xml', ext: '.svg', make: () => new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svgFor(key)}`], { type: 'image/svg+xml' }) })); }
  catch (error) { say(`No se ha podido exportar: ${error?.message ?? error}`); }
});
$('[data-sx-csv]').addEventListener('click', async () => {
  try { say(await saveFile({ name: `pensiones-lab-sensibilidad-${today()}.csv`, mime: 'text/csv', ext: '.csv', make: () => new Blob([csvText()], { type: 'text/csv;charset=utf-8' }) })); }
  catch (error) { say(`No se ha podido exportar: ${error?.message ?? error}`); }
});

// A change of the scenario in the console (another tab) starts again; a change of only the year does not.
let lastKey = null;
const restart = () => { const key = JSON.stringify(getState().config); if (key !== lastKey) { lastKey = key; run(); } };
subscribe(restart);
restart();
