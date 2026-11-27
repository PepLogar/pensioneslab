// La consola: la única página de Pensiones Lab 3. Todos los ajustes del motor en una tabla, y el resultado
// siempre a la vista (veredicto, cifras del año, cuatro gráficos, tabla por años o todos los sistemas).
// Herramienta de trabajo de escritorio: sin cabecera de sitio, sin glosario, sin Modo experto, sin recorridos.
// Viene de src/pages/consola.js de pensiones_lab_2 1.64.0 (docs/DECISIONES.md).
import { getState, subscribe, updateScenario, replaceConfig, readCurrentState,
  getSavedCustomScenarios, saveCustomScenario, loadCustomScenario, deleteCustomScenario } from '../shared/scenario-store.js';
import { DEFAULT_CONFIG, BASE_YEAR, END_YEAR, validateConfig } from '../shared/default-config.js';
import { SETTINGS_CATALOG, SETTINGS_CHAPTERS, searchCatalog } from '../shared/settings-catalog.js';
import { settingsPatch, choiceMatches } from '../shared/settings-panel.js';
import { PANEL, ROWS, shown, fixedText, decimals, rowChanged, splitRows, FOLDS, foldTitle, calculatingText } from '../shared/console-rows.js';
import { configErrorText } from '../shared/config-error-text.js';
import { bindScenario } from '../shared/page-helpers.js';
import { simulateAsync } from '../shared/sim-client.js';
import { computeVerdict } from '../domain/verdict.js';
import { payablePensionAnnual } from '../shared/payable-pension.js';
import { sustainabilityLight } from '../domain/sustainability-light.js';
import { riskPathOf, decidingIndicators, riskVariable } from '../views/risk-strip.js';
import { num } from '../shared/number-format.js';
import { loadComparison } from '../shared/comparison-systems.js';
import { activeSystemKey, originWithSystem } from '../shared/scenario-labels.js';
import { settingActsOn } from '../shared/setting-systems.js';
import { settingWaits, settingAnswersLine } from '../shared/setting-needs.js';
import { detectSqueezeFromConfig, loadSavedSqueezeParams, saveSqueezeParams } from '../shared/wealth-corporate-squeeze.js';
import { SQUEEZE_FIELDS, SQUEEZE_DEFAULTS, squeezePatch, squeezeShownFor, squeezeIsOn, DEPARTMENTS, engineOtherCut, inferCuts, departmentsPatch, CALENDAR, CALENDAR_YEARS, calendarPatch,
  LIMIT_FIELDS, DEFAULT_LIMITS, firstOutsideYear, MIX_FIELDS, mixPatch, RECORTABLE_TEXT } from '../domain/consola-measures.js';
import { seriesFileText, dictionaryFileText, scenarioFile } from '../shared/export-files.js';
import { exportStamp } from '../shared/citation.js';
import { saveFile } from '../shared/save-file.js';
import { decodeScenarioHash, linkTooLong } from '../shared/share-link.js';
import { buildModelsXlsxBytes, parseImportedModelFile, MAX_IMPORT_BYTES } from '../shared/excel-models-io.js';
import { REFERENCE_PROFILES, isReferenceProfile, referenceProfile, profileConfig } from '../domain/reference-profiles.js';
import { systemNotice } from '../domain/system-assumptions.js';
import { mountSiteHeader } from '../shared/site-header.js';

mountSiteHeader();

const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = selector => document.querySelector(selector);
let chapter = SETTINGS_CHAPTERS[0].id;
let query = '';
const openFolds = new Set();     // pliegues abiertos: «capítulo:tipo»
// El año consultado es el del escenario guardado: guardar, abrir, exportar y recargar llevan el mismo.
const yearNow = () => getState().selectedYear;
const setYear = v => updateScenario({ selectedYear: Math.min(END_YEAR, Math.max(BASE_YEAR, Math.round(v))) });
let latest = null;               // { state, result, reference }
let failed = false;
const CUTS_KEY = 'pensiones-lab:consola-partidas';
const errors = new Map();        // clave -> texto del último valor rechazado
const past = [], future = [];    // deshacer y rehacer: configuraciones enteras

const say = text => { $('[data-cx-status]').textContent = text; };

// A list's options; a stored value that is not among them (from a link, a file or an older scenario) shows as
// «Otro valor (…)» instead of passing for the first option, and runs as it is until another is chosen (1.82).
function optionsHtml(options, v, encode = JSON.stringify) {
  const matched = options.some(([value]) => choiceMatches(value, v));
  const other = matched ? '' : `<option value="" selected disabled>Otro valor (${esc(typeof v === 'number' ? num(v, 2) : String(v ?? ''))})</option>`;
  return other + options.map(([value, label]) => `<option value="${esc(encode(value))}"${matched && choiceMatches(value, v) ? ' selected' : ''}>${esc(label)}</option>`).join('');
}
// Same configuration whatever the order of its keys: validateConfig reorders them.
const stable = v => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
const sameConfig = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const TODAY_CONFIG = validateConfig(DEFAULT_CONFIG);

const ABOVE_MAX_WHERE = { paymentAdjustments: 'Se cambia en la pestaña «Partidas del Estado» o en «Calendario».' };
function inputHtml(row, config) {
  const { key } = row.entry, c = row.control;
  const id = `cx-${key}`;
  if (c.type === 'toggle') return `<input type="checkbox" id="${id}" data-key="${key}"${c.read(config) ? ' checked' : ''}>`;
  if (c.type === 'choice') return `<select id="${id}" data-key="${key}">${optionsHtml(c.options, c.read(config))}</select>`;
  // A value the box cannot hold (a plan of the Calendario read as −1) is shown in words; it is changed there.
  const value = c.read(config);
  if (c.format && Number.isFinite(c.min) && value < c.min) return `<span class="cx-fixed" title="Se cambia en la pestaña «Calendario».">${esc(c.format(value))}</span>`;
  // Above the box's top (a cut written by «Partidas del Estado»): also in words, never an invalid box (audit 1.85, 17).
  if (ABOVE_MAX_WHERE[key] && c.format && value > c.max) return `<span class="cx-fixed" title="${esc(ABOVE_MAX_WHERE[key])}">${esc(c.format(value))}</span>`;
  return `<input type="number" id="${id}" data-key="${key}" value="${c.read(config)}" min="${c.min}" max="${c.max}" step="${c.step}">`;
}

// Every row against the chosen system's own standard form (src/shared/console-rows.js, rowChanged).
const isChanged = (row, config, baseline = originWithSystem(config, DEFAULT_CONFIG)) => rowChanged(row, config, baseline);
const tipButton = (text, name) => text ? `<button type="button" class="cx-tip" data-tip="${esc(text)}" aria-label="Qué es: ${esc(name)}">?</button>` : '';

// A row inside a fold stays grey: it is there to be found, and it changes nothing with this scenario.
function rowHtml(row, config, result, baseline, idle = false, why = '') {
  const { entry } = row;
  const changed = isChanged(row, config, baseline);
  const error = errors.get(entry.key);
  return `<tr class="cx-row${changed ? ' is-changed' : ''}${idle ? ' is-idle' : ''}${error ? ' is-error' : ''}"${idle ? ' title="Con este sistema o estos ajustes, no cambia nada."' : ''}>
    <th scope="row"><label${row.control ? ` for="cx-${entry.key}"` : ''}>${esc(entry.name)}</label>${why ? `<small class="cx-why">${esc(why)}</small>` : ''}${error ? `<small class="cx-error">${esc(error)}</small>` : ''}</th>
    <td class="cx-value">${row.control ? inputHtml(row, config) : `<span class="cx-fixed">${esc(fixedText(entry, config))}</span>`}</td>
    <td class="cx-unit">${esc(row.unit)}</td>
    <td class="cx-today"${row.control ? ` title="${esc(shown(row, DEFAULT_CONFIG))}"` : ''}>${row.control ? esc(shown(row, DEFAULT_CONFIG)) : ''}</td>
    <td>${tipButton(row.hint, entry.name)}</td></tr>`;
}

// Las pestañas: los siete capítulos del catálogo y las cuatro propias de la consola.
const OWN_TABS = [['ricos', 'Ricos y empresas'], ['partidas', 'Partidas del Estado'], ['calendario', 'Calendario'], ['limites', 'Límites y mezcla']];
const TABLE_HEAD = '<thead><tr><th scope="col">Ajuste</th><th scope="col">Valor</th><th scope="col">Unidad</th><th scope="col">Hoy</th><th scope="col"></th></tr></thead>';
const shownNumber = (v, step) => Number(Number(v).toFixed(decimals(step)));
const boxHtml = (attrs, value, f) => `<input type="number" ${attrs} value="${shownNumber(value, f.step)}" min="${f.min}" max="${f.max}" step="${f.step}">`;
const ownRow = ({ label, input, unit = '', today = '', hint = '', changed = false, error = null, idle = false }) => `<tr class="cx-row${changed ? ' is-changed' : ''}${idle ? ' is-idle' : ''}${error ? ' is-error' : ''}">
    <th scope="row">${esc(label)}${error ? `<small class="cx-error">${esc(error)}</small>` : ''}</th>
    <td class="cx-value">${input}</td><td class="cx-unit">${esc(unit)}</td><td class="cx-today">${esc(today)}</td><td>${tipButton(hint, label)}</td></tr>`;
const note = text => `<p class="cx-note">${esc(text)}</p>`;

// The open scenario's measures: this browser's stored ones only when they are really in it (src/domain/consola-measures.js).
const squeezeShown = config => squeezeShownFor(config, loadSavedSqueezeParams());
function ricosHtml(config) {
  const p = squeezeShown(config);
  // Taxes or contributions raised elsewhere (the chapters, a link, a file) are not this tab's measures.
  const elsewhere = !squeezeIsOn(p) && detectSqueezeFromConfig(config)
    ? note('Este escenario ya sube impuestos o cotizaciones con otros ajustes, que esta pestaña no muestra. Si cambias una medida aquí, sustituye la cotización y los recargos de los capítulos. También sustituye la medida de 2027 del Calendario; las de otros años se quedan. Y sustituye tus valores de «Lo que se pierde al subir impuestos al trabajo» y de «Cotización que queda fuera de esa respuesta».') : '';
  const rows = SQUEEZE_FIELDS.map(f => {
    const input = f.type === 'choice'
      ? `<select data-x="ricos" data-field="${f.key}" aria-label="${esc(f.label)}">${f.options.map(([v, l]) => `<option value="${esc(JSON.stringify(v))}"${v === p[f.key] ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`
      : boxHtml(`data-x="ricos" data-field="${f.key}" aria-label="${esc(f.label)}"`, p[f.key] * f.scale, f);
    const today = f.type === 'choice' ? f.options.find(([v]) => v === SQUEEZE_DEFAULTS[f.key])?.[1] : num(SQUEEZE_DEFAULTS[f.key] * f.scale);
    return ownRow({ label: f.label, input, unit: f.unit, today, hint: f.hint, changed: p[f.key] !== SQUEEZE_DEFAULTS[f.key], error: errors.get(`ricos:${f.key}`) });
  }).join('');
  return note('Se traducen en ajustes del motor: recargos del IRPF, del IVA y de otros tributos, la cotización y el IRPF de 2027 del calendario. También fijan «Lo que se pierde al subir impuestos al trabajo» y «Cotización que queda fuera de esa respuesta». Y recalculan la «Parte de los demás ingresos que va a pensiones». Sustituyen lo que haya en esos ajustes.')
    + elsewhere + `<table class="cx-table">${TABLE_HEAD}<tbody>${rows}</tbody></table><p class="cx-actions"><button type="button" data-ricos-reset>Quitar estas medidas</button></p>`;
}

function savedCuts() { try { return JSON.parse(localStorage.getItem(CUTS_KEY) ?? 'null'); } catch { return null; } }
function cutsShown(config, point) {
  const saved = savedCuts();
  if (saved && Math.abs((saved.engineCut ?? 0) - engineOtherCut(config)) < 1e-5) return { cuts: saved.cuts, route: saved.route !== false };
  return { cuts: inferCuts(config, point), route: saved?.route !== false };
}
function partidasHtml(config) {
  const point = at(latest?.result, 2027);
  if (!point) return note('Calculando…');
  const { cuts, route } = cutsShown(config, point);
  const rows = DEPARTMENTS.map(d => ownRow({ label: d.label,
    input: boxHtml(`data-x="partidas" data-field="${d.id}" aria-label="Recorte de ${esc(d.label)}"`, (cuts[d.id] ?? 0) * 100, { min: 0, max: Number((d.maxCut * 100).toFixed(1)), step: 0.5 }),
    unit: '% recorte', today: `tope ${num(d.maxCut * 100, 1)}`, changed: (cuts[d.id] ?? 0) > 0,
    hint: `${num(d.share * 100, 1)} % del resto del gasto público. El tope es su mayor recorte observado entre 2010 y 2014.`, error: errors.get(`partidas:${d.id}`) })).join('');
  const total = DEPARTMENTS.reduce((s, d) => s + d.share * Math.min(d.maxCut, cuts[d.id] ?? 0), 0);
  return note('Recortes del resto del gasto público desde 2027, partida a partida. Hoy no se recorta nada.')
    + `<table class="cx-table">${TABLE_HEAD}<tbody>${rows}</tbody></table>`
    + `<p class="cx-actions"><span title="${esc(RECORTABLE_TEXT)}">Recorte total: <strong>${num(total * 100, 1)} %</strong> del resto del gasto, <strong>${num(engineOtherCut(config) * 100, 1)} %</strong> del gasto recortable.</span>
       <label><input type="checkbox" data-x="route"${route ? ' checked' : ''}> Pasar lo recortado a pensiones</label></p>`;
}

function calendarioHtml(config) {
  return Object.entries(CALENDAR).map(([listKey, spec]) => {
    const list = config[listKey] ?? [];
    const head = `<tr><th scope="col">Año</th>${spec.fields.map(f => `<th scope="col">${esc(f.label)}<small> ${esc(f.unit)}</small></th>`).join('')}<th scope="col"></th></tr>`;
    const rows = list.map((row, i) => `<tr class="cx-row">
      <td>${boxHtml(`data-x="cal" data-list="${listKey}" data-index="${i}" data-field="year" aria-label="Año"`, row.year, { min: CALENDAR_YEARS[0], max: CALENDAR_YEARS[1], step: 1 })}</td>
      ${spec.fields.map(f => `<td>${boxHtml(`data-x="cal" data-list="${listKey}" data-index="${i}" data-field="${f.key}" aria-label="${esc(f.label)} en ${row.year}"`, (row[f.key] ?? 0) * f.scale, f)}</td>`).join('')}
      <td><button type="button" class="cx-remove" data-cal-remove="${listKey}" data-index="${i}" aria-label="Quitar la fila de ${row.year}">x</button></td></tr>`).join('');
    const error = errors.get(`cal:${listKey}`);
    return `<section class="cx-calendar"><h2>${esc(spec.title)} ${tipButton(spec.hint, spec.title)}</h2>${error ? `<small class="cx-error">${esc(error)}</small>` : ''}
      <table class="cx-table cx-grid"><thead>${head}</thead><tbody>${rows || `<tr><td colspan="${spec.fields.length + 2}" class="cx-empty">Ninguna.</td></tr>`}</tbody></table>
      <p class="cx-actions"><button type="button" data-cal-add="${listKey}">Añadir un año</button></p></section>`;
  }).join('');
}

// The mix of the three parts (1.88, measured with the engine): with a move to a fund, the fund's part is «parte de la
// cuota que acaba en el fondo», and the mix gives only the split of the public part, and only with «La del sistema».
const mixActsOn = config => settingActsOn('mix', config) && !settingWaits('mix', config);
const MIX_WHERE = 'Cuánto va al fondo se elige en «Cambio a un fondo: parte de la cuota que acaba en el fondo» (capítulo 1).';
function mixNote(config, acts) {
  if (acts && activeSystemKey(config) === 'mixed') return 'Mezcla de la cotización de jubilación entre reparto, cuentas nocionales y fondo. Actúa entera.';
  if (['payg', 'ndc'].includes(activeSystemKey(config))) return 'Con tu sistema toda la cotización de jubilación es pública, así que esta mezcla no cambia nada. Cuenta en el Mixto con ahorro propio, donde reparte la parte pública entre reparto y nocionales.';
  if (acts) return `Mezcla de la cotización de jubilación. Con tu sistema solo cuenta la proporción entre reparto y nocionales: así se reparte la parte pública. ${MIX_WHERE} Por eso la casilla de capitalización no cambia nada aquí.`;
  return `Con tu sistema esta mezcla no cambia nada. ${MIX_WHERE} Cómo se reparte la parte pública se elige en «Cambio a un fondo: parte pública nocional o de reparto». La mezcla solo cuenta con la parte pública «La del sistema», la del Mixto con ahorro propio.`;
}
function limitesHtml(config) {
  const limits = getState().limits ?? DEFAULT_LIMITS;
  const lim = LIMIT_FIELDS.map(f => ownRow({ label: f.label, input: boxHtml(`data-x="limit" data-field="${f.key}" aria-label="${esc(f.label)}"`, limits[f.key], f),
    unit: f.unit, today: num(DEFAULT_LIMITS[f.key]), hint: f.hint, changed: limits[f.key] !== DEFAULT_LIMITS[f.key], error: errors.get(`limit:${f.key}`) })).join('');
  const mix = config.mix ?? DEFAULT_CONFIG.mix;
  const mixActs = mixActsOn(config);
  const mixRows = MIX_FIELDS.map(([key, label]) => ownRow({ label, input: boxHtml(`data-x="mix" data-field="${key}" aria-label="${esc(label)}"`, mix[key] * 100, { min: 0, max: 100, step: 1 }),
    unit: '%', today: num(DEFAULT_CONFIG.mix[key] * 100), changed: Math.abs(mix[key] - DEFAULT_CONFIG.mix[key]) > 1e-6, idle: !mixActs || key === 'funded',
    hint: 'Parte de la cotización de jubilación que va a cada pilar. Los tres suman 100 %: al cambiar uno, los otros dos se ajustan.' })).join('');
  return note('Límites propios: no cambian el veredicto. Marcan el primer año en que el escenario se sale de ellos.')
    + `<table class="cx-table">${TABLE_HEAD}<tbody>${lim}</tbody></table>`
    + note(mixNote(config, mixActs))
    + `<table class="cx-table">${TABLE_HEAD}<tbody>${mixRows}</tbody></table>`;
}
const OWN_TAB_HTML = { ricos: ricosHtml, partidas: partidasHtml, calendario: calendarioHtml, limites: limitesHtml };

// La búsqueda: la del catálogo (sin tildes, singular o plural, sinónimos) y, además, por la clave del motor.
const searchRows = text => {
  const keys = new Set(searchCatalog(text, ROWS.length).map(item => item.key));
  const q = text.trim().toLowerCase();
  return ROWS.filter(r => keys.has(r.entry.key) || r.entry.key.toLowerCase().includes(q));
};

// The settings that change nothing with this scenario are folded under the ones that act (1.87): those of other
// systems, and those that wait for a decision. A search opens the folds it finds something in.
function foldHtml(fold, id, rows, config, result, baseline, open) {
  if (!rows.length) return '';
  const changed = rows.filter(r => isChanged(r, config, baseline)).length;
  const title = foldTitle(fold, rows.length, changed);
  const head = open && query.trim() ? esc(title)
    : `<button type="button" data-cx-fold="${esc(id)}" aria-expanded="${open}">${open ? '▾' : '▸'} ${esc(title)}</button>`;
  return `<tbody class="cx-fold"><tr class="cx-fold-head${changed ? ' is-changed' : ''}"><th colspan="5" scope="rowgroup">${head}</th></tr>`
    + (open ? `<tr class="cx-fold-note"><td colspan="5">${esc(fold.note(rows, config, result))}</td></tr>` + rows.map(r => rowHtml(r, config, result, baseline, true, fold.kind === 'waiting' ? settingAnswersLine(r.entry.key) : '')).join('') : '')
    + '</tbody>';
}
function rowsHtml(rows, config, result, baseline) {
  const q = query.trim();
  if (!rows.length) return `<tbody><tr><td colspan="5" class="cx-empty">Ningún ajuste con «${esc(query)}».</td></tr></tbody>`;
  const groups = splitRows(rows, config, result);
  const where = q ? 'search' : chapter;
  // A row with a rejected value opens its fold, and it stays open once the value is put right (review of 1.87).
  for (const f of FOLDS) if (!q && groups[f.kind].some(r => errors.has(r.entry.key))) openFolds.add(`${where}:${f.kind}`);
  const acting = groups.acting.length ? groups.acting.map(r => rowHtml(r, config, result, baseline)).join('')
    : `<tr><td colspan="5" class="cx-empty">${q ? 'Lo que has buscado no cambia nada con este escenario.' : 'Con este escenario, ningún ajuste de este capítulo cambia nada.'}</td></tr>`;
  return `<tbody>${acting}</tbody>` + FOLDS.map(f => foldHtml(f, `${where}:${f.kind}`, groups[f.kind], config, result, baseline, Boolean(q) || openFolds.has(`${where}:${f.kind}`))).join('');
}

function renderPanel() {
  const config = getState().config;
  // The last result says whether the 2023 brake fires. While the new one is calculated the previous one stays: without
  // a result every row of the response to taxes would leave its fold and come back when it arrives (review of 1.87).
  const result = latest?.result ?? null;
  const q = query.trim().toLowerCase();
  const baseline = originWithSystem(config, DEFAULT_CONFIG);
  const count = id => ROWS.filter(r => r.entry.chapter === id && isChanged(r, config, baseline)).length;
  const ownCount = { ricos: squeezeIsOn(squeezeShown(config)) ? 1 : 0, partidas: engineOtherCut(config) > 0 ? 1 : 0,
    calendario: ['fiscalRescues', 'paymentAdjustments', 'debtRestructurings'].reduce((s, k) => s + (config[k]?.length ?? 0), 0), limites: 0 };
  $('[data-cx-tabs]').innerHTML = SETTINGS_CHAPTERS.map(c => [c.id, `${c.number} ${c.title}`, count(c.id)])
    .concat(OWN_TABS.map(([id, label]) => [id, label, ownCount[id]]))
    .map(([id, label, n]) => `<button type="button" role="tab" data-chapter="${id}" aria-selected="${!q && id === chapter}">${esc(label)}${n ? ` <b>${n}</b>` : ''}</button>`).join('');
  const body = $('[data-cx-body]');
  const scroll = body.scrollTop;
  if (!q && OWN_TAB_HTML[chapter]) body.innerHTML = OWN_TAB_HTML[chapter](config);
  else {
    const rows = q ? searchRows(query) : ROWS.filter(r => r.entry.chapter === chapter);
    body.innerHTML = `<table class="cx-table">${TABLE_HEAD}${rowsHtml(rows, config, result, baseline)}</table>`;
  }
  body.scrollTop = scroll;
}

// El motivo de un rechazo escrito aquí, o el del motor en español.
const ownErrorText = error => error instanceof RangeError && /^(No queda|El año|Ya hay)/.test(error.message) ? error.message : configErrorText(error, 'Ese valor no encaja con otro ajuste del escenario.');

// Un cambio en una pestaña propia: src/domain/consola-measures.js lo convierte en el parche del escenario.
function applyOwn(input) {
  const { x, field } = input.dataset;
  const config = getState().config;
  const value = input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT' ? JSON.parse(input.value) : Number(String(input.value).replace(',', '.'));
  const errorKey = x === 'cal' ? `cal:${input.dataset.list}` : `${x}:${field}`;
  if (typeof value === 'number' && !Number.isFinite(value)) { errors.set(errorKey, 'Escribe un número.'); renderPanel(); return; }
  try {
    if (x === 'limit') { const before = snap(); updateScenario({ limits: { [field]: value } }); past.push(before); future.length = 0; errors.delete(errorKey); renderPanel(); renderToolbar(); return; }
    let patch;
    if (x === 'ricos') {
      const f = SQUEEZE_FIELDS.find(s => s.key === field);
      const params = { ...squeezeShown(config), [field]: f.type === 'choice' ? value : Number((value / f.scale).toFixed(6)) };
      patch = squeezePatch(config, params);
      saveSqueezeParams(params);
    } else if (x === 'partidas' || x === 'route') {
      const point = at(latest?.result, 2027);
      if (!point) throw new RangeError('El año 2027 aún se está calculando.');
      const shownNow = cutsShown(config, point);
      const cuts = x === 'route' ? shownNow.cuts : { ...shownNow.cuts, [field]: value / 100 };
      const route = x === 'route' ? value : shownNow.route;
      const { weighted, ...rest } = departmentsPatch(config, point, cuts, route);
      patch = rest;
      try { localStorage.setItem(CUTS_KEY, JSON.stringify({ cuts, route, engineCut: rest.paymentAdjustments.find(p => p.year === 2027)?.otherSpendingCut ?? 0 })); } catch { /* se vuelve a leer del escenario */ }
    } else if (x === 'cal') {
      patch = calendarPatch(config, input.dataset.list, { index: Number(input.dataset.index), field, value });
    } else if (x === 'mix') {
      patch = mixPatch(config, field, value);
    }
    updateScenario({ config: patch });
    past.push({ config, limits: getState().limits }); future.length = 0;
    errors.delete(errorKey);
  } catch (error) {
    errors.set(errorKey, ownErrorText(error));
  }
  renderPanel(); renderToolbar();
}
function applyCalendar(listKey, options) {
  const config = getState().config;
  try { updateScenario({ config: calendarPatch(config, listKey, options) }); past.push({ config, limits: getState().limits }); future.length = 0; errors.delete(`cal:${listKey}`); }
  catch (error) { errors.set(`cal:${listKey}`, ownErrorText(error)); }
  renderPanel(); renderToolbar();
}

// El resultado: veredicto, cifras del año elegido, cuatro gráficos y la tabla.
// Cifras con decimales fijos, para que las columnas se alineen.
const fx = (v, d = 0) => num(v, d, { fixed: true });
const pct = (v, d = 1) => Number.isFinite(v) ? `${fx(v, d)} %` : '—';
const at = (result, y) => result?.years?.find(r => r.year === y) ?? null;
const SERIES = [
  { id: 'debt', title: 'Deuda pública, % PIB', pick: r => r.debtGDP },
  { id: 'ratio', title: 'Pensión media, % salario medio', pick: r => r.replacementRate * 100 },
  { id: 'gap', title: 'Falta para pensiones, % PIB', pick: r => r.pensionGapGDP },
  { id: 'interest', title: 'Intereses de la deuda, % PIB', pick: r => r.interest / r.gdp * 100 }
];

// Since 1.92 the red line of the break only where the break shows (as the report since 1.91): the debt and the
// indicator of the risk index that crosses its threshold that year, drawn as one more chart with that threshold;
// in a pension break, the average pension against its floor.
function breakSeries(verdict, light, state, reference) {
  const breakYear = light.state === 'breaks' ? light.breakYear : null;
  if (breakYear == null) return { breakYear, list: SERIES, cause: '' };
  if (light.failure === 'pension') {
    const floor = (state.config.pensionAdequacyFloor ?? 0.4) * 100;
    return { breakYear, cause: `cuando la pensión media baja del ${num(floor)} % del salario medio`,
      list: SERIES.map(s => s.id === 'ratio' ? { ...s, mark: true, threshold: floor } : s) };
  }
  const path = riskPathOf(verdict);
  let refPath = [];
  try { refPath = reference ? riskPathOf(computeVerdict(reference, { config: reference.config ?? DEFAULT_CONFIG })) : []; } catch { refPath = []; }
  const values = (list, id) => new Map(list.map(p => [p.year, p.vars?.[id]]));
  const deciding = decidingIndicators(breakYear, path).map(riskVariable).filter(Boolean).map(v => {
    const mine = values(path, v.id), ref = values(refPath, v.id);
    // A short caption in the narrow strip («Necesidades de financiación, % PIB»); the full name in its tooltip.
    return { id: `risk-${v.id}`, title: `${v.label.split(',')[0].replace(' brutas', '')}, ${v.unit.replace('% del PIB', '% PIB')}`, full: `${v.label} (${v.unit}), umbral de la Comisión ${num(v.threshold, 2)}`, mark: true, threshold: v.threshold,
      pick: r => mine.get(r.year), pickRef: r => ref.get(r.year) };
  });
  const list = SERIES.map(s => s.id === 'debt' ? { ...s, mark: true } : s);
  list.splice(1, 0, ...deciding);
  const names = deciding.map(d => `«${d.title.split(',')[0]}»`).join(' y ');
  return { breakYear, list, cause: deciding.length ? `cuando ${names} ${deciding.length === 1 ? 'cruza' : 'cruzan'} su umbral` : '' };
}

function chartSvg(series, result, reference, breakYear) {
  const year = yearNow();
  const W = 320, H = 116, L = 34, R = 6, T = 8, B = 18;
  const line = (res, pick) => (res?.years ?? []).map(r => [r.year, pick(r)]).filter(([, v]) => Number.isFinite(v));
  const mine = line(result, series.pick), ref = line(reference, series.pickRef ?? series.pick);
  const values = [...mine, ...ref].map(([, v]) => v).concat(Number.isFinite(series.threshold) ? [series.threshold] : []);
  if (!values.length) return '';
  let lo = Math.min(0, ...values), hi = Math.max(...values);
  if (hi - lo < 1e-9) hi = lo + 1;
  const x = y => L + (y - BASE_YEAR) / (END_YEAR - BASE_YEAR) * (W - L - R);
  const yv = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const path = pts => pts.map(([y, v], i) => `${i ? 'L' : 'M'}${x(y).toFixed(1)},${yv(v).toFixed(1)}`).join('');
  const mark = at(result, year);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.title)}, de ${BASE_YEAR} a ${END_YEAR}">
    <line x1="${L}" y1="${yv(lo)}" x2="${W - R}" y2="${yv(lo)}" class="cx-axis"/>
    <text x="${L - 4}" y="${yv(hi) + 4}" class="cx-tick" text-anchor="end">${num(hi)}</text>
    <text x="${L - 4}" y="${yv(lo)}" class="cx-tick" text-anchor="end">${num(lo)}</text>
    <text x="${L}" y="${H - 4}" class="cx-tick">${BASE_YEAR}</text><text x="${W - R}" y="${H - 4}" class="cx-tick" text-anchor="end">${END_YEAR}</text>
    ${breakYear ? `<line x1="${x(breakYear)}" y1="${T}" x2="${x(breakYear)}" y2="${yv(lo)}" class="cx-break"/>` : ''}
    ${Number.isFinite(series.threshold) ? `<line x1="${L}" y1="${yv(series.threshold)}" x2="${W - R}" y2="${yv(series.threshold)}" class="cx-threshold"/><text x="${L + 3}" y="${yv(series.threshold) - 3}" class="cx-tick cx-tick--threshold">umbral ${num(series.threshold, 2)}</text>` : ''}
    <line x1="${x(year)}" y1="${T}" x2="${x(year)}" y2="${yv(lo)}" class="cx-year"/>
    ${ref.length ? `<path d="${path(ref)}" class="cx-ref"/>` : ''}<path d="${path(mine)}" class="cx-mine"/>
    ${mark && Number.isFinite(series.pick(mark)) ? `<circle cx="${x(year)}" cy="${yv(series.pick(mark))}" r="2.5" class="cx-dot"/><text x="${Math.min(x(year) + 5, W - 40)}" y="${yv(series.pick(mark)) - 5}" class="cx-tick cx-tick--value">${num(series.pick(mark), 1)}</text>` : ''}
  </svg>`;
}

function renderRoad() {
  if (!latest || failed) return;
  const year = yearNow();
  const { state, result, reference } = latest;
  const verdict = computeVerdict(result, { config: state.config, limits: state.limits });
  const light = sustainabilityLight(verdict, riskPathOf(verdict));
  const row = at(result, year), last = at(result, END_YEAR);
  const facts = [
    [`Deuda ${year}`, pct(row?.debtGDP, 0)], [`Deuda ${END_YEAR}`, pct(last?.debtGDP, 0)],
    [`Pensión ${year}`, Number.isFinite(row?.averagePensionAnnual) ? `${num(row.averagePensionAnnual / 12)} €/mes` : '—'],
    ['Del salario medio', pct(row?.replacementRate * 100, 0)], ['Falta', `${pct(row?.pensionGapGDP)} PIB`],
    ['Fondo', row?.fundedAssetsGDP > 0 ? `${pct(row.fundedAssetsGDP, 0)} PIB` : '—'],
    ['Fuera de los límites', firstOutsideYear(result, state.limits ?? DEFAULT_LIMITS) ?? 'nunca']
  ];
  const road = $('[data-cx-verdict]');
  road.dataset.state = light.state;
  road.innerHTML = `<strong>${esc(light.headline)}</strong>${facts.map(([k, v]) => `<span><small>${esc(k)}</small> ${esc(v)}</span>`).join('')}`;
  road.title = light.why ?? '';
  const { breakYear, list, cause } = breakSeries(verdict, light, state, reference);
  const charts = $('[data-cx-charts]');
  charts.style.setProperty('--cx-n', String(list.length));
  charts.innerHTML = list.map(s => `<figure${s.full ? ` title="${esc(s.full)}"` : ''}><figcaption>${esc(s.title)}</figcaption>${chartSvg(s, result, reference, s.mark ? breakYear : null)}</figure>`).join('');
  $('[data-cx-legend]').textContent = `Continua: este escenario. Discontinua: reglas de hoy.${breakYear ? ` Raya roja: se rompe en ${breakYear}${cause ? `, ${cause} (línea roja de puntos)` : ''}.` : ''}`;
  $('[data-cx-table]').innerHTML = result.years.map(r => `<tr data-year="${r.year}"${r.year === year ? ' class="is-year"' : ''}${breakYear && r.year >= breakYear ? ' data-broken' : ''}>
    <th scope="row">${r.year}</th><td>${fx(r.debtGDP, 1)}</td><td>${fx(r.averagePensionAnnual / 12)}</td><td>${fx(payablePensionAnnual(r, verdict, result.config ?? state.config) / 12)}</td><td>${fx(r.replacementRate * 100, 1)}</td>
    <td>${fx(r.pensionGapGDP, 2)}</td><td>${fx(r.interest / r.gdp * 100, 2)}</td><td>${r.fundedAssetsGDP > 0 ? fx(r.fundedAssetsGDP, 1) : '—'}</td>
    <td>${fx(r.publicPensionSpendingGDP, 1)}</td></tr>`).join('');
  $(`[data-cx-table] tr[data-year="${year}"]`)?.scrollIntoView({ block: 'nearest' });
}

// «Todos los sistemas»: estos ajustes en cada sistema, lado a lado. Solo se calcula con la vista abierta.
let view = 'years';
let systems = { key: null, rows: null, token: 0 };
const USABLE = new Set(PANEL.get('system').options.map(([value]) => value));
async function renderSystems() {
  if (view !== 'systems') return;
  const host = $('[data-cx-systems]');
  const { config, limits } = getState();
  const year = yearNow();
  const key = JSON.stringify([config, limits]);
  if (systems.key !== key) {
    const mine = ++systems.token;
    host.innerHTML = note('Calculando cada sistema con estos ajustes…');
    try {
      const rows = await loadComparison(config, limits, { includeMixedGradual: true });
      if (mine !== systems.token) return;
      systems = { key, rows, token: mine };
    } catch (error) {
      if (mine === systems.token) host.innerHTML = note('No se han podido calcular los sistemas. Cambia de vista y vuelve a probar.');
      console.error(error);
      return;
    }
  }
  const current = activeSystemKey(config);
  const body = systems.rows.map(entry => {
    const verdict = computeVerdict(entry.result, { config: entry.config, limits });
    const light = sustainabilityLight(verdict, riskPathOf(verdict));
    const r = at(entry.result, year), last = at(entry.result, END_YEAR);
    const mineRow = entry.key === current;
    return `<tr${mineRow ? ' class="is-mine"' : ''}><th scope="row">${esc(entry.label)}</th><td class="cx-state" data-state="${light.state}">${esc(light.headline)}</td>
      <td>${fx(r?.debtGDP, 1)}</td><td>${fx(last?.debtGDP, 1)}</td><td>${fx(r?.averagePensionAnnual / 12)}</td><td>${fx(r?.replacementRate * 100, 1)}</td>
      <td>${fx(r?.pensionGapGDP, 2)}</td><td>${r?.fundedAssetsGDP > 0 ? fx(r.fundedAssetsGDP, 1) : '—'}</td>
      <td>${mineRow ? 'El abierto' : USABLE.has(entry.key) ? `<button type="button" data-use-system="${entry.key}">Usar</button>` : '<span title="Se rompe enseguida: no está en la lista de sistemas.">—</span>'}</td></tr>`;
  }).join('');
  host.innerHTML = `<table class="cx-table cx-yeartable"><thead><tr><th scope="col">Sistema, con estos ajustes</th><th scope="col">Veredicto</th><th scope="col">Deuda ${year} % PIB</th><th scope="col">Deuda ${END_YEAR}</th>
    <th scope="col">Pensión ${year} €/mes</th><th scope="col">% salario</th><th scope="col">Falta % PIB</th><th scope="col">Fondo % PIB</th><th scope="col"></th></tr></thead><tbody>${body}</tbody></table>`;
}
function setView(next) {
  view = next;
  for (const b of document.querySelectorAll('[data-view]')) b.setAttribute('aria-selected', String(b.dataset.view === view));
  $('[data-cx-systems]').hidden = view !== 'systems';
  $('[data-cx-years]').hidden = view !== 'years';
  renderSystems();
}
$('.cx-views').addEventListener('click', event => { const b = event.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
$('[data-cx-systems]').addEventListener('click', event => { const b = event.target.closest('[data-use-system]'); if (b) chooseSystem(b.dataset.useSystem); });

// Atajos: año, pestaña y vista sin dejar el teclado.
const ALL_TABS = () => [...document.querySelectorAll('[data-cx-tabs] [data-chapter]')].map(b => b.dataset.chapter);
function moveYear(step) { setYear(yearNow() + step); }
function moveTab(step) {
  const tabs = ALL_TABS();
  chapter = tabs[(tabs.indexOf(chapter) + step + tabs.length) % tabs.length];
  query = ''; $('[data-cx-search]').value = '';
  renderPanel();
  document.querySelector(`[data-cx-tabs] [data-chapter="${chapter}"]`)?.focus();
}
document.addEventListener('keydown', event => {
  if (event.altKey && !event.ctrlKey && !event.metaKey) {
    const act = { ArrowLeft: () => moveYear(-1), ArrowRight: () => moveYear(1), ArrowUp: () => moveTab(-1), ArrowDown: () => moveTab(1),
      v: () => setView(view === 'years' ? 'systems' : 'years'), V: () => setView(view === 'years' ? 'systems' : 'years') }[event.key];
    if (act) { event.preventDefault(); act(); }
    return;
  }
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.target.closest('input, select, textarea')) { event.preventDefault(); $('[data-cx-search]').focus(); }
});

// Escenarios guardados en este navegador.
function renderSaved() {
  const select = $('[data-cx-saved]');
  const list = getSavedCustomScenarios();
  const was = select.value;
  const option = s => `<option value="${esc(s.id)}"${s.id === was ? ' selected' : ''}>${esc(s.name)}</option>`;
  // Lo guardado en este navegador y, aparte, los supuestos de otras instituciones (src/domain/reference-profiles.js).
  select.innerHTML = `<optgroup label="En este navegador">${list.length ? list.map(option).join('') : '<option value="" disabled>Ninguno guardado</option>'}</optgroup>`
    + `<optgroup label="Supuestos de otros">${REFERENCE_PROFILES.map(option).join('')}</optgroup>`;
  if (!select.value) select.value = (list[0] ?? REFERENCE_PROFILES[0]).id;
  renderSavedButtons();
}
function renderSavedButtons() {
  const id = $('[data-cx-saved]').value;
  $('[data-cx-open]').disabled = !id;
  $('[data-cx-delete]').disabled = !id || isReferenceProfile(id);
}

function renderToolbar() {
  const config = getState().config, year = yearNow();
  const system = PANEL.get('system');
  $('[data-cx-system]').innerHTML = optionsHtml(system.options, system.read(config), String);
  $('[data-cx-year]').value = year;
  $('[data-cx-undo]').disabled = !past.length;
  $('[data-cx-redo]').disabled = !future.length;
  $('[data-cx-reset]').disabled = sameConfig(config, TODAY_CONFIG);
}

// Un cambio: por el almacén (validado), guardando la configuración anterior para «Deshacer».
function apply(key, value) {
  const before = getState().config;
  const row = ROWS.find(r => r.entry.key === key);
  try {
    const patch = PANEL.has(key) ? settingsPatch(key, value, before) : row.control.write(value, before);
    updateScenario({ config: patch });
    errors.delete(key);
    past.push({ config: before, limits: getState().limits }); future.length = 0;
  } catch (error) {
    errors.set(key, configErrorText(error, 'Ese valor no encaja con otro ajuste del escenario.'));
  }
  renderPanel(); renderToolbar();
}
// Cambiar la configuración entera (reglas de hoy, importar, enlace), con deshacer.
// «Deshacer» guarda configuración y límites; el año consultado no es un cambio del escenario.
const snap = () => ({ config: getState().config, limits: getState().limits });
function replaceWhole(config, { selectedYear = null, limits = null } = {}) {
  const before = snap();
  replaceConfig(config, { selectedYear, limits });
  past.push(before); future.length = 0;
  errors.clear();
  renderToolbar(); renderPanel();
}
function travel(from, to) {
  if (!from.length) return;
  to.push(snap());
  const back = from.pop();
  replaceConfig(back.config, { limits: back.limits });
  renderToolbar(); renderPanel();
}

function parse(input) {
  if (input.type === 'checkbox') return input.checked;
  if (input.tagName === 'SELECT') return JSON.parse(input.value);
  return Number(String(input.value).replace(',', '.'));
}

const panel = $('[data-cx-panel]');
panel.addEventListener('change', event => {
  const own = event.target.closest('[data-x]');
  if (own) { applyOwn(own); return; }
  const input = event.target.closest('[data-key]');
  if (!input) return;
  const value = parse(input);
  if (input.type === 'number' && !Number.isFinite(value)) { errors.set(input.dataset.key, 'Escribe un número.'); renderPanel(); return; }
  // The box's limits are the console's: the browser does not hold typed values to them (1.82).
  if (input.type === 'number' && (value < Number(input.min) || value > Number(input.max))) {
    errors.set(input.dataset.key, `Entre ${num(Number(input.min), decimals(Number(input.step) || 1))} y ${num(Number(input.max), decimals(Number(input.step) || 1))}.`); renderPanel(); return;
  }
  apply(input.dataset.key, value);
});
panel.addEventListener('click', event => {
  const fold = event.target.closest('[data-cx-fold]');
  if (fold) {
    const id = fold.dataset.cxFold;
    if (!openFolds.delete(id)) openFolds.add(id);
    renderPanel();
    document.querySelector(`[data-cx-fold="${CSS.escape(id)}"]`)?.focus();
    return;
  }
  const tab = event.target.closest('[data-chapter]');
  if (tab) { chapter = tab.dataset.chapter; query = ''; $('[data-cx-search]').value = ''; renderPanel(); return; }
  const add = event.target.closest('[data-cal-add]');
  if (add) { applyCalendar(add.dataset.calAdd, { add: true }); return; }
  const remove = event.target.closest('[data-cal-remove]');
  if (remove) { applyCalendar(remove.dataset.calRemove, { index: Number(remove.dataset.index), remove: true }); return; }
  if (event.target.closest('[data-ricos-reset]')) {
    const config = getState().config;
    try { updateScenario({ config: squeezePatch(config, SQUEEZE_DEFAULTS) }); saveSqueezeParams({ ...SQUEEZE_DEFAULTS }); past.push({ config, limits: getState().limits }); future.length = 0; }
    catch (error) { errors.set('ricos:mode', ownErrorText(error)); }
    renderPanel(); renderToolbar();
  }
});
$('[data-cx-search]').addEventListener('input', event => { query = event.target.value; renderPanel(); });
// Choosing a system says what it starts from; like a link's notice, it stays past the first «Calculando…».
const chooseSystem = value => { apply('system', value); const text = systemNotice(value); if (text) { linkNotice = text; say(text); } };
$('[data-cx-system]').addEventListener('change', event => chooseSystem(event.target.value));
$('[data-cx-year]').addEventListener('change', event => {
  const v = Number(event.target.value);
  if (Number.isFinite(v)) setYear(v); else renderToolbar();
});
$('[data-cx-table]').addEventListener('click', event => {
  const tr = event.target.closest('tr[data-year]');
  if (tr) setYear(Number(tr.dataset.year));
});
$('[data-cx-undo]').addEventListener('click', () => travel(past, future));
$('[data-cx-redo]').addEventListener('click', () => travel(future, past));
$('[data-cx-reset]').addEventListener('click', () => { replaceWhole(DEFAULT_CONFIG); say('Reglas de hoy. Deshacer vuelve atrás.'); });
document.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.target.closest('input, select, textarea')) return;
  if (event.key.toLowerCase() === 'z') { event.preventDefault(); travel(event.shiftKey ? future : past, event.shiftKey ? past : future); }
  if (event.key.toLowerCase() === 'y') { event.preventDefault(); travel(future, past); }
});

// Guardar, abrir y borrar escenarios del navegador.
$('[data-cx-save]').addEventListener('click', () => {
  try { const entry = saveCustomScenario($('[data-cx-name]').value); $('[data-cx-name]').value = ''; renderSaved(); $('[data-cx-saved]').value = entry.id; say(`Guardado: «${entry.name}».`); }
  catch (error) { say(`No se ha guardado: ${error?.message ?? error}`); }
});
$('[data-cx-saved]').addEventListener('change', renderSavedButtons);
$('[data-cx-open]').addEventListener('click', () => {
  const profile = referenceProfile($('[data-cx-saved]').value);
  if (profile) {
    try { replaceWhole(profileConfig(profile)); say(`Abierto: «${profile.name}». ${profile.says}`); }
    catch (error) { say(`No se ha abierto: ${error?.message ?? error}`); }
    return;
  }
  const before = snap();
  const found = loadCustomScenario($('[data-cx-saved]').value);
  if (!found) { say('No se encuentra ese escenario.'); renderSaved(); return; }
  past.push(before); future.length = 0; errors.clear();
  say(`Abierto: «${found.name}».`); renderToolbar(); renderPanel();
});
$('[data-cx-delete]').addEventListener('click', () => {
  const select = $('[data-cx-saved]');
  const name = select.selectedOptions[0]?.textContent ?? '';
  if (!select.value || !confirm(`¿Borrar «${name}» de este navegador? No se puede deshacer.`)) return;
  try { deleteCustomScenario(select.value); say(`Borrado: «${name}».`); } catch (error) { say(`No se ha borrado: ${error?.message ?? error}`); }
  renderSaved();
});

// Exportar e importar. Cada archivo lleva su sello (versión, metodología, datos, fecha y enlace).
const today = () => new Date().toISOString().slice(0, 10);
// Guardar: src/shared/save-file.js (su propio «Guardar como» donde se puede).
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FILES = {
  series: () => [`pensiones-lab-series-escenario-${today()}.csv`, 'text/csv', '.csv'],
  seriesAll: () => [`pensiones-lab-series-y-sistemas-${today()}.csv`, 'text/csv', '.csv'],
  dictionary: () => [`pensiones-lab-diccionario-${today()}.csv`, 'text/csv', '.csv'],
  json: () => [`pensiones-lab-escenario-${today()}.json`, 'application/json', '.json'],
  excel: () => [`pensiones-lab-${today()}.xlsx`, XLSX, '.xlsx']
};
async function runsOf(state, withSystems) {
  const [others, own] = await Promise.all([withSystems ? loadComparison(state.config, state.limits, { includeMixedGradual: true }) : [], simulateAsync(state.config)]);
  return { others, own, runs: [{ key: 'tu_escenario', result: own }, ...others.map(s => ({ key: s.key, result: s.result }))] };
}
const csv = text => new Blob([text], { type: 'text/csv;charset=utf-8' });
const EXPORTS = {
  async series() { const s = readCurrentState(); const { runs } = await runsOf(s, false); return csv(seriesFileText(runs, s.config)); },
  async seriesAll() { const s = readCurrentState(); const { runs } = await runsOf(s, true); return csv(seriesFileText(runs, s.config)); },
  async dictionary() { return csv(dictionaryFileText(readCurrentState().config)); },
  async json() { return new Blob([JSON.stringify(scenarioFile(readCurrentState()), null, 1)], { type: 'application/json' }); },
  async excel() { const state = readCurrentState(); const { others, own } = await runsOf(state, true);
    return new Blob([buildModelsXlsxBytes({ state, systems: others, activeResult: own })], { type: XLSX }); }
};
async function copyLink() {
  const link = exportStamp(readCurrentState().config).link;
  // A link over the length the reader accepts would open nothing: say so instead (src/shared/share-link.js).
  if (linkTooLong(link)) { say('Este escenario es demasiado grande para un enlace: guárdalo en JSON y comparte el archivo.'); return; }
  try { await navigator.clipboard.writeText(link); say('Enlace copiado.'); } catch { say(`Enlace: ${link}`); }
}
$('[data-cx-io]').addEventListener('click', async event => {
  const button = event.target.closest('[data-export]');
  if (!button) return;
  const kind = button.dataset.export;
  if (kind === 'import') { $('[data-cx-file]').click(); return; }
  if (kind === 'link') { await copyLink(); return; }
  const [name, mime, ext] = FILES[kind]();
  try { say(await saveFile({ name, mime, ext, make: () => { say('Preparando el archivo…'); return EXPORTS[kind](); } })); }
  catch (error) { say(`No se ha podido exportar: ${error?.message ?? error}`); }
});
$('[data-cx-file]').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > MAX_IMPORT_BYTES) throw new Error(`pesa ${num(file.size / 1048576, 1)} MB y el máximo es ${num(MAX_IMPORT_BYTES / 1048576)} MB`);
    const imported = await parseImportedModelFile(new Uint8Array(await file.arrayBuffer()), file.name, readCurrentState().config);
    replaceWhole(imported.config, { selectedYear: imported.selectedYear, limits: imported.limits });
    const kept = [imported.limits ? '' : 'tus límites', imported.selectedYear ? '' : 'el año'].filter(Boolean).join(' y ');
    say(`Importado ${file.name}: «${imported.modelName}»${imported.complete ? '' : `, ${imported.importedKeysCount} ${imported.importedKeysCount === 1 ? 'ajuste' : 'ajustes'}`}.${kept ? ` El archivo no trae ${kept}: siguen los de aquí.` : ''} Deshacer vuelve atrás.`);
  } catch (error) {
    say(`No se ha importado ${file.name}: ${error instanceof SyntaxError ? 'no es un JSON válido.' : configErrorText(error, 'no se puede leer.')}`);
  }
});

// La ayuda: al pasar el ratón o al enfocar el «?», nunca como texto en la página.
const tip = $('[data-cx-tooltip]');
const showTip = button => {
  tip.textContent = button.dataset.tip;
  tip.hidden = false;
  const box = button.getBoundingClientRect();
  const width = Math.min(380, window.innerWidth - 24);
  tip.style.width = `${width}px`;
  tip.style.left = `${Math.max(12, Math.min(box.right + 8, window.innerWidth - width - 12))}px`;
  tip.style.top = `${Math.max(12, Math.min(box.top - 4, window.innerHeight - tip.offsetHeight - 12))}px`;
};
const hideTip = () => { tip.hidden = true; };
for (const kind of ['mouseover', 'focusin']) document.addEventListener(kind, event => { const b = event.target.closest?.('.cx-tip, .cx-keys'); if (b) showTip(b); });
for (const kind of ['mouseout', 'focusout']) document.addEventListener(kind, event => { if (event.target.closest?.('.cx-tip, .cx-keys')) hideTip(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideTip(); });

// Un enlace con #escenario=…: se abre, y «Deshacer» devuelve el escenario que había.
// What the link says stays on screen through the first calculation («Calculando…» does not cover it).
const shared = decodeScenarioHash(location.hash, DEFAULT_CONFIG, validateConfig);
let linkNotice = null;
if (shared) {
  linkNotice = shared.rejected ?? 'Abierto el escenario del enlace. Deshacer vuelve al anterior.';
  if (!shared.rejected) replaceWhole(shared.config);
  say(linkNotice);
  history.replaceState(null, '', location.pathname + location.search);
}

// Un escenario que el motor no sabe calcular: se dice en el veredicto.
const failure = {
  show() {
    failed = true;
    const road = $('[data-cx-verdict]');
    road.dataset.state = 'breaks';
    road.innerHTML = '<strong>No se ha podido calcular este escenario.</strong><span>Algún ajuste tiene un valor con el que el motor no sabe hacer las cuentas. Deshaz el último cambio o vuelve a las reglas de hoy.</span>';
    say('');
    delete document.documentElement.dataset.cxBusy;
    $('.cx-road').removeAttribute('aria-busy');
  },
  clear() { failed = false; }
};

// While a scenario is calculated, the charts and the table still show the previous one. The verdict says so, and
// of which system they are, so that no figure is read as the new system's (1.87.1).
function staleNotice(config) {
  const road = $('[data-cx-verdict]');
  const { headline, detail, legend } = calculatingText(config, latest?.state.config ?? null);
  if (legend) $('[data-cx-legend]').textContent = legend;
  // Screen readers wait for the verdict instead of reading the interim notice on every change (review of 1.87.1).
  $('.cx-road').setAttribute('aria-busy', 'true');
  delete road.dataset.state;
  road.title = '';
  road.innerHTML = `<strong>${esc(headline)}</strong>${detail ? `<span>${esc(detail)}</span>` : ''}`;
}

bindScenario({
  load: async state => {
    const [result, reference] = await Promise.all([simulateAsync(state.config), simulateAsync(DEFAULT_CONFIG)]);
    return { result, reference };
  },
  failure,
  onLoading: state => { document.documentElement.dataset.cxBusy = 'true'; staleNotice(state.config); if (!linkNotice) say('Calculando…'); },
  render: (state, data) => {
    failed = false;
    latest = { state, ...data };
    delete document.documentElement.dataset.cxBusy;
    $('.cx-road').removeAttribute('aria-busy');
    if ($('[data-cx-status]').textContent === 'Calculando…') say('');
    linkNotice = null;
    renderToolbar(); renderPanel(); renderRoad(); renderSystems();
  }
});
renderToolbar(); renderPanel(); renderSaved();
// Cualquier cambio del escenario (aquí o en otra pestaña) mueve las casillas al momento; el resultado sigue a su cálculo.
subscribe(() => { renderToolbar(); renderPanel(); renderSaved(); });
