// «Riesgo de mercado»: bands of uncertainty for the debt and the fund when the funds' real return varies at
// random (src/domain/market-risk.js, from pensiones_lab_2). Runs on demand: «Calcular» launches the paths in
// the pool of workers. Exports the two fans in one SVG and the bands in CSV.
import { getState, subscribe } from '../shared/scenario-store.js';
import { simulateAsync, simulateWithRuntime } from '../shared/sim-client.js';
import { scenarioSystemName } from '../shared/scenario-labels.js';
import { exportStamp, stampLine, stampCommentLines } from '../shared/citation.js';
import { saveFile } from '../shared/save-file.js';
import { MARKET_RISK_DEFAULTS, marketRiskChoices, returnPaths, summarizeMarketRun, aggregateMarketRuns, marketRiskToCSV } from '../domain/market-risk.js';
import { fanSvg } from '../views/fan-svg.js';
import { resultCacheKey, readResult, saveResult, savedWhen } from '../shared/result-cache.js';
import { num as formatNum } from '../shared/number-format.js';
import { mountSiteHeader } from '../shared/site-header.js';

mountSiteHeader();

const $ = selector => document.querySelector(selector);
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const say = text => { $('[data-rx-status]').textContent = text; };
// The real minus sign (−) and the comma, as everywhere (src/shared/number-format.js).
const num = (v, d = 0) => formatNum(v, d, { fixed: true });
const field = name => $(`[data-rx="${name}"]`);

const OWN = 'tu_escenario';
let done = null, token = 0;

function choices() {
  const config = getState().config;
  return [{ key: OWN, label: `Tu escenario (${scenarioSystemName(config)})`, config }, ...marketRiskChoices(config).map(e => ({ key: e.key, label: e.label, config: e.config }))];
}
function fillSystems() {
  const was = field('system').value || 'progressive';
  const list = choices();
  field('system').innerHTML = list.map(c => `<option value="${c.key}"${c.key === was ? ' selected' : ''}>${esc(c.label)}</option>`).join('');
  $('[data-rx-scenario]').textContent = `Tu escenario: ${scenarioSystemName(getState().config)}`;
}
field('sigma').value = MARKET_RISK_DEFAULTS.sigma * 100;
field('paths').value = MARKET_RISK_DEFAULTS.paths;
field('seed').value = MARKET_RISK_DEFAULTS.seed;
field('memory').value = String(MARKET_RISK_DEFAULTS.memory);
fillSystems();

const params = () => ({ ...MARKET_RISK_DEFAULTS,
  sigma: Math.min(0.3, Math.max(0, Number(field('sigma').value) / 100 || 0)),
  paths: Math.min(1000, Math.max(20, Math.round(Number(field('paths').value) || MARKET_RISK_DEFAULTS.paths))),
  seed: Math.max(1, Math.round(Number(field('seed').value) || MARKET_RISK_DEFAULTS.seed)),
  tails: field('tails').value, memory: Number(field('memory').value) });

// force: compute again even when a summary of a previous visit is kept (src/shared/result-cache.js).
async function run(force = false) {
  const mine = ++token;
  // The scenario as it was when the run started: the stamp and link of the exports must cite it, even if the console
  // changes it meanwhile (docs/REVISION-ADVERSARIAL-2026-11-24.md, 44).
  const startConfig = getState().config;
  const choice = choices().find(c => c.key === field('system').value);
  const p = params();
  $('[data-rx-svg]').disabled = $('[data-rx-csv]').disabled = true;
  $('[data-rx-run]').disabled = true;
  $('[data-rx-rerun]').hidden = true;
  const cacheKey = resultCacheKey('riesgo', choice.config, { system: choice.key, params: p });
  const kept = force ? null : await readResult(cacheKey);
  if (mine !== token) return;
  if (kept?.value?.agg && kept.value.base) {
    done = { choice, params: p, agg: kept.value.agg, base: kept.value.base, config: startConfig };
    say(`Resultado ${savedWhen(kept.savedAt)}, con este escenario y estos ajustes: no se ha vuelto a calcular.`);
    render();
    $('[data-rx-svg]').disabled = $('[data-rx-csv]').disabled = false;
    $('[data-rx-run]').disabled = false;
    $('[data-rx-rerun]').hidden = false;
    return;
  }
  const paths = returnPaths(p);
  let count = 0;
  say(`Calculando 0 de ${paths.length + 1}…`);
  try {
    const step = () => { if (mine === token && ++count % 5 === 0) say(`Calculando ${count} de ${paths.length + 1}…`); };
    const [base, ...runs] = await Promise.all([simulateAsync(choice.config).then(r => (step(), summarizeMarketRun(r))),
      ...paths.map(path => simulateWithRuntime(choice.config, { returnShocks: path }).then(r => (step(), summarizeMarketRun(r))))]);
    if (mine !== token) return;
    done = { choice, params: p, agg: aggregateMarketRuns(runs, base), base, config: startConfig };
    saveResult(cacheKey, { agg: done.agg, base });
    say('');
    render();
    $('[data-rx-svg]').disabled = $('[data-rx-csv]').disabled = false;
  } catch (error) {
    if (mine === token) say(`No se ha podido calcular: ${error?.message ?? error}`);
  } finally { if (mine === token) $('[data-rx-run]').disabled = false; }
}

const stampLines = () => { const s = exportStamp(done.config); return { s, lines: [stampLine(s), `${done.choice.label}. ${done.agg.paths} trayectorias, volatilidad ${num(done.params.sigma * 100)} %, colas ${done.params.tails === 'fat' ? 'gruesas' : 'normales'}, memoria ${num(done.params.memory, 1)}, semilla ${done.params.seed}. ${s.caveat}`] }; };
function fans() {
  const { s, lines } = stampLines();
  const common = { stamp: lines, desc: s.cite };
  return {
    fund: fanSvg(done.agg.fundFan, done.base.fundPath, { ...common, title: `Fondo de pensiones · ${done.choice.label}`, axis: '% del PIB del mismo año', colour: '#009E73' }),
    debt: fanSvg(done.agg.debtFan, done.base.debtPath, { ...common, title: `Deuda pública · ${done.choice.label}`, axis: '% del PIB del mismo año', colour: '#D55E00' })
  };
}

function render() {
  if (!done) return;
  const { agg, base } = done;
  const noFund = agg.fundFan.every(p => !p[95]);
  const pct = q => (o, d = 0) => num(o?.[q], d);
  const row = (label, o, unit, d = 0) => `<tr><th scope="row">${esc(label)}</th>${[5, 25, 50, 75, 95].map(q => `<td class="num">${pct(q)(o, d)}</td>`).join('')}<td class="sx-muted">${esc(unit)}</td></tr>`;
  $('[data-rx-summary]').innerHTML = `${noFund ? '<p><strong>Este sistema no tiene fondo:</strong> la rentabilidad de los fondos no le afecta y el abanico es una línea.</p>' : ''}
    <p><strong>Se rompe antes de 2071 en el ${num(agg.crisisProbability * 100)} % de las trayectorias</strong>${agg.medianCrisisYear ? `: año mediano ${num(agg.medianCrisisYear)}, entre ${agg.firstCrisisYear} y ${agg.lastCrisisYear}` : ''}. Sin choques de mercado: ${base.firstProblemYear ? `se rompe en ${base.firstProblemYear}` : 'aguanta hasta 2070'}.${agg.pensionFailureShare ? ` En el ${num(agg.pensionFailureShare * 100)} % se rompe por la pensión, no por la deuda.` : ''}</p>
    <table class="sx-table"><thead><tr><th scope="col">En 2070</th><th scope="col">p5</th><th scope="col">p25</th><th scope="col">mediana</th><th scope="col">p75</th><th scope="col">p95</th><th scope="col"></th></tr></thead><tbody>
    ${row('Fondo', agg.fund2070, '% del PIB', 1)}${row('Deuda', agg.debt2070, '% del PIB')}${row('Primera pensión', agg.firstPension2070, '€ de 2026 al mes')}</tbody></table>`;
  const f = fans();
  $('[data-rx-fund]').innerHTML = f.fund;
  $('[data-rx-debt]').innerHTML = f.debt;
}

// Both fans in one file, one above the other.
function combinedSvg() {
  const f = fans();
  const h = svg => Number(/height="(\d+)"/.exec(svg)[1]);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${h(f.fund) + h(f.debt)}" viewBox="0 0 960 ${h(f.fund) + h(f.debt)}">
<title>Riesgo de mercado · ${esc(done.choice.label)}</title><desc>${esc(exportStamp(done.config).cite)}</desc>
${f.fund.replace('<svg ', '<svg x="0" y="0" ')}
${f.debt.replace('<svg ', `<svg x="0" y="${h(f.fund)}" `)}
</svg>`;
}

const today = () => new Date().toISOString().slice(0, 10);
$('[data-rx-run]').addEventListener('click', () => run());
$('[data-rx-rerun]').addEventListener('click', () => run(true));
$('[data-rx-svg]').addEventListener('click', async () => {
  try { say(await saveFile({ name: `pensiones-lab-riesgo-${done.choice.key}-${today()}.svg`, mime: 'image/svg+xml', ext: '.svg', make: () => new Blob([combinedSvg()], { type: 'image/svg+xml' }) })); }
  catch (error) { say(`No se ha podido exportar: ${error?.message ?? error}`); }
});
$('[data-rx-csv]').addEventListener('click', async () => {
  const text = [...stampCommentLines(exportStamp(done.config)), marketRiskToCSV({ system: done.choice.key, params: done.params, agg: done.agg })].join('\n');
  try { say(await saveFile({ name: `pensiones-lab-riesgo-${done.choice.key}-${today()}.csv`, mime: 'text/csv', ext: '.csv', make: () => new Blob([text], { type: 'text/csv;charset=utf-8' }) })); }
  catch (error) { say(`No se ha podido exportar: ${error?.message ?? error}`); }
});
// A change of settings here or of the scenario in the console asks for a new run; nothing is recomputed on its own.
const stale = () => { if (done) say('Ajustes cambiados: pulsa «Calcular».'); };
document.querySelector('.gx-controls').addEventListener('change', stale);
subscribe(() => { fillSystems(); stale(); });
say('Pulsa «Calcular».');
