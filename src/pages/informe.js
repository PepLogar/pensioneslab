// «Informe»: the scenario open in the console as a document to print or save as PDF (1.89; reworked in 1.90 after
// docs/AUDITORIA-INFORME-1.89-2026-11-27.md). Only that scenario (src/domain/scenario-report.js says why). The
// browser's own print dialog makes the PDF: no library, and the figures, charts and texts are the console's.
// It follows the console: a change there is drawn again here.
import { getState, subscribe, findMatchingSavedScenario } from '../shared/scenario-store.js';
import { simulateAsync } from '../shared/sim-client.js';
import { buildScenarioReport } from '../domain/scenario-report.js';
import { chartLines } from '../domain/chart-data.js';
import { chartSvg } from '../views/chart-svg.js';
import { exportStamp, stampLine } from '../shared/citation.js';
import { linkTooLong } from '../shared/share-link.js';
import { configErrorText } from '../shared/config-error-text.js';
import { num } from '../shared/number-format.js';
import { APP_VERSION } from '../shared/app-version.js';
import { mountSiteHeader } from '../shared/site-header.js';

mountSiteHeader();

const $ = selector => document.querySelector(selector);
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const say = text => { $('[data-ix-status]').textContent = text; };
const fx = (v, d = 0) => Number.isFinite(v) ? num(v, d, { fixed: true }) : '—';
let sectionId = 0;
const section = (title, body) => { const id = `ix-s${++sectionId}`; return `<section class="ix-section" aria-labelledby="${id}"><h2 id="${id}">${esc(title)}</h2>${body}</section>`; };
const table = (head, bodies, label = '') => `<table class="ix-table"${label ? ` aria-label="${esc(label)}"` : ''}><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>${bodies.map(b => `<tbody>${b}</tbody>`).join('')}</table>`;
const note = html => `<p class="ix-note">${html}</p>`;

const SHORT = { falta_pensiones_pct_pib: 'lo que falta', coste_transicion_pct_pib: 'cotización que va al fondo' };
function chart(spec, report, result) {
  // A risk indicator comes as points (the verdict's own figures); the rest as series of the CSV.
  const data = spec.points
    ? { axis: spec.axis, lines: [{ system: 'scenario', systemLabel: 'Línea', variable: spec.id, variableName: 'este escenario', points: spec.points }] }
    : chartLines([{ key: 'scenario', label: report.systemName, result }], { ...spec, systems: ['scenario'], from: 2026, to: 2070, view: 'native' });
  // The threshold that decides the break, as a dashed line (1.91).
  if (spec.threshold && data.lines.length) data.lines.push({ system: 'scenario', systemLabel: 'Línea', variable: 'threshold', variableName: spec.threshold.label,
    points: data.lines[0].points.map(([year]) => [year, spec.threshold.value]) });
  const several = data.lines.length > 1;
  if (several) for (const line of data.lines) { line.systemLabel = 'Línea'; line.variableName = SHORT[line.variable] ?? line.variableName; }
  // A short description for screen readers: from where to where (the citation stays in exported SVG files).
  const describe = line => {
    if (line.variable === 'threshold') return line.variableName;
    const pts = line.points.filter(([, v]) => v !== null);
    return pts.length ? `${several ? `${line.variableName}: ` : ''}de ${num(pts[0][1], 1)} en ${pts[0][0]} a ${num(pts.at(-1)[1], 1)} en ${pts.at(-1)[0]}` : '';
  };
  const label = `${spec.title} (${data.axis}). ${data.lines.map(describe).filter(Boolean).join('. ')}.`;
  // The red line of the break only where the break shows: the debt and the chart that decides it (1.91).
  const svg = chartSvg(data, { title: spec.title, systemOrder: ['scenario'], stamp: [], desc: '', width: 690, height: several ? 250 : 225, marks: spec.mark ? report.chartMarks : [], legend: several })
    .replace('<svg ', `<svg role="img" aria-label="${esc(label)}" `);
  return `<figure class="ix-chart">${svg}</figure>`;
}

// Which charts carry the red line, and why only those (1.91).
function breakNote(report) {
  const year = report.verdict.breakYear;
  if (!year) return '';
  if (report.why.failure === 'pension') return note(`La raya roja marca ${year}, el año en que se rompe: la pensión media baja del ${esc(num(report.why.floor))} % del salario medio.`);
  const deciding = report.charts.filter(c => c.deciding).map(c => `«${esc(c.title)}»`);
  if (!deciding.length) return note(`La raya roja marca ${year}, el año en que se rompe: el riesgo de crisis de deuda pasa a alto y sigue alto.`);
  return note(`La raya roja marca ${year}, el año en que se rompe. Ese año ${deciding.length === 1 ? `el indicador ${deciding[0]} cruza su umbral` : `los indicadores ${deciding.join(' y ')} cruzan su umbral`}, y el riesgo de crisis de deuda pasa a alto. Por eso la raya solo está en la deuda y en ${deciding.length === 1 ? 'ese gráfico' : 'esos gráficos'}: las demás curvas no deciden la ruptura.`);
}

function headHtml(report, stamp) {
  const v = report.verdict;
  return `<header class="ix-head">
    <p class="ix-kicker">Informe del escenario · Pensiones Lab (beta)</p>
    <h1>${esc(report.name ?? report.systemName)}</h1>
    <p class="ix-meta">${report.name ? `Sistema: ${esc(report.systemName)} · ` : ''}Año consultado: ${report.selectedYear} · ${esc(stampLine(stamp))}</p>
    <p class="ix-verdict" data-state="${esc(v.state ?? '')}"><strong>${esc(v.headline)}</strong>${v.why ? ` ${esc(v.why)}` : ''}</p>
    <dl class="ix-facts">${report.facts.map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join('')}</dl>
  </header>`;
}

function changesHtml(report) {
  const base = `«Al empezar» es el valor con que empieza ${esc(report.systemName)}: el de hoy, con el sistema en su forma de partida.`;
  if (report.unchanged) return section('Lo que has cambiado', `<p>Nada: es ${esc(report.systemName)} tal como empieza, sin ningún ajuste movido, sin medidas con fecha y con los límites de partida.</p>`);
  const inert = i => i.inert ? ' <span class="ix-inert">(no cambia nada en este escenario)</span>' : '';
  const groups = report.changes.map(c => `<tr class="ix-group"><th colspan="3" scope="rowgroup">${esc(c.chapter)}</th></tr>`
    + c.items.map(i => `<tr><th scope="row">${esc(i.name)}${inert(i)}</th><td>${esc(i.value)} ${esc(i.unit)}</td><td>${esc(i.start)} ${esc(i.unit)}</td></tr>`).join(''));
  if (report.mix) groups.push(`<tr class="ix-group"><th colspan="3" scope="rowgroup">Límites y mezcla</th></tr><tr><th scope="row">Mezcla de la cotización de jubilación${inert(report.mix)}</th><td>${esc(report.mix.value)}</td><td>${esc(report.mix.start)}</td></tr>`);
  const settings = groups.length ? table(['Ajuste', 'En este escenario', 'Al empezar'], groups, 'Ajustes cambiados') + note(base) : '';
  const calendars = report.calendars.map(c => `<h3>Medidas con fecha: ${esc(c.title.toLowerCase())}</h3>`
    + table(c.columns, [c.rows.map(r => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')], `Medidas con fecha: ${c.title}`)
    + note('Cada fila vale desde su año hasta la fila siguiente.')).join('');
  const limits = report.limits.length ? '<h3>Tus límites</h3>'
    + table(['Límite', 'En este escenario', 'Al empezar'], [report.limits.map(i => `<tr><th scope="row">${esc(i.name)}</th><td>${esc(i.value)}</td><td>${esc(i.start)}</td></tr>`).join('')], 'Tus límites')
    + note('Los límites solo marcan el primer año en que el escenario se sale de ellos. No cambian el veredicto.') : '';
  return section('Lo que has cambiado', settings + calendars + limits);
}

function whyHtml(report) {
  const w = report.why, a = w.aftermath, breaks = report.verdict.state === 'breaks';
  const parts = [];
  if (w.failure === 'pension') parts.push(`<p>Se rompe porque la pensión media baja del ${num(w.floor)} % del salario medio, el suelo que se usa para decir que una pensión es suficiente.</p>`);
  else if (w.firing.length) parts.push(`<p>${breaks ? `En ${w.year}, el año en que se rompe,` : `En ${w.year},`} pasan de su umbral estos indicadores del índice de riesgo fiscal:</p><ul class="ix-list">${w.firing.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`);
  else if (!breaks) parts.push('<p>Ningún año llega a riesgo fiscal alto hasta 2070.</p>');
  if (w.edge) parts.push(`<p>El indicador que quedó más cerca antes de tiempo: «${esc(w.edge.label)}», a ${num(w.edge.gap, 2)} puntos de su umbral en ${w.edge.year}.</p>`);
  if (w.rule) parts.push(`<p>${esc(w.rule)}</p>`);
  if (a.bailoutYear || a.defaultYear) {
    const events = [a.bailoutYear && `un rescate en ${a.bailoutYear}`, a.restructuringYear && `una quita de la deuda en ${a.restructuringYear}`, a.defaultYear && `un impago en ${a.defaultYear}`].filter(Boolean);
    parts.push(`<p>Después, el simulador supone ${events.join(' y ')}. Son supuestos, no previsiones.</p>`);
    const freeze = a.freezeYears ? `Desde ${a.bailoutYear ?? a.defaultYear}, la pensión que se podría pagar («pagable») no sube con los precios durante ${a.freezeYears} años.` : '';
    const cut = (a.restructuringYear || a.defaultYear) && a.cut ? ` Desde ${a.restructuringYear ?? a.defaultYear}, su parte pública baja un ${num(a.cut * 100)} %.` : '';
    if (freeze || cut) parts.push(`<p>${freeze}${cut}</p>`);
  }
  if (w.pensionInsufficientYear && w.failure !== 'pension') parts.push(`<p>Desde ${w.pensionInsufficientYear}, la pensión media baja del ${num(w.floor)} % del salario medio.</p>`);
  return section(breaks ? 'Por qué se rompe' : 'Qué vigilar', parts.join(''));
}

function moneyHtml(report) {
  const f = report.funding, hasFund = f.some(r => r.funded > 0.0005), hasNdc = f.some(r => r.ndc > 0.0005);
  const hasTransition = f.some(r => r.transition > 0.0005), surplus = f.some(r => r.surplus);
  const paid = table(['Año', 'Coste', 'Cotizaciones y mutuas', 'Impuestos asignados', 'Falta', ...(hasTransition ? ['Cotización que va al fondo'] : [])],
    [f.map(r => `<tr><th scope="row">${r.year}</th><td>${fx(r.cost, 1)}</td><td>${fx(r.contributions, 1)}</td><td>${fx(r.taxes, 1)}</td><td>${fx(r.missing, 2)}</td>${hasTransition ? `<td>${fx(r.transition, 2)}</td>` : ''}</tr>`).join('')], 'Cómo se pagan las pensiones públicas');
  const which = table(['Año', 'Ganadas hasta 2026', 'Reparto, ganado desde 2027', 'Cuentas nocionales', 'Otras pensiones públicas', ...(hasFund ? ['Rentas del fondo (privadas)'] : [])],
    [f.map(r => `<tr><th scope="row">${r.year}</th><td>${fx(r.legacy, 1)}</td><td>${fx(r.payg, 1)}</td><td>${fx(r.ndc, 1)}</td><td>${fx(r.other, 1)}</td>${hasFund ? `<td>${fx(r.funded, 1)}</td>` : ''}</tr>`).join('')], 'Qué pensiones se pagan');
  const state = table(['Año', 'Ingresos', 'Gasto', 'Saldo primario', 'Intereses', 'Saldo', 'Necesidades de financiación', 'Deuda', 'De ella, por la prima de riesgo'],
    [report.accounts.map(r => `<tr><th scope="row">${r.year}</th><td>${fx(r.revenue, 1)}</td><td>${fx(r.spending, 1)}</td><td>${fx(r.primary, 1)}</td><td>${fx(r.interest, 1)}</td><td>${fx(r.balance, 1)}</td><td>${fx(r.financingNeeds, 1)}</td><td>${fx(r.debt, 1)}</td><td>${r.premiumDebt > 0.05 ? fx(r.premiumDebt, 1) : '—'}</td></tr>`).join('')], 'Cuentas del Estado');
  return section('Cómo se pagan las pensiones públicas', paid
      + note(`En % del PIB. Cotizaciones, impuestos asignados y lo que falta suman el coste. Lo que falta lo pone el resto del presupuesto o la deuda.${surplus ? ' Un año en que sobra, la falta sale 0; en «Cifras por años» sale en negativo.' : ''}${hasTransition ? ' «Cotización que va al fondo»: la que deja de pagar las pensiones de hoy, el coste de la transición. No es parte de la suma.' : ''}`)
      + '<h3>Qué pensiones se pagan</h3>' + which
      + note(`En % del PIB.${hasNdc ? ' Los saldos de las cuentas nocionales son derechos, no dinero ahorrado.' : ''}${hasFund ? ' Las rentas del fondo no son gasto público: las paga el fondo, que no es caja del Estado ni cancela su deuda.' : ''}`))
    + section('Cuentas del Estado', state + note('En % del PIB. Saldo primario: sin intereses. Necesidades de financiación: el déficit más la deuda que vence, sin letras del Tesoro. La última columna es la deuda que añade, acumulada, la prima de riesgo.'));
}

function yearsHtml(report) {
  const pay = report.payableDiffers;
  const head = ['Año', 'Deuda % PIB', 'Pensión €/mes', ...(pay ? ['Pagable €/mes'] : []), '% salario', 'Falta % PIB', 'Intereses % PIB', 'Fondo % PIB', 'Gasto en pensiones % PIB'];
  const body = report.rows.map(r => `<tr${r.consulted ? ' class="is-year"' : ''}${r.broken ? ' data-broken' : ''}><th scope="row">${r.year}${r.broken ? ' †' : ''}</th><td>${fx(r.debtGDP, 1)}</td><td>${fx(r.pensionMonthly)}</td>${pay ? `<td>${fx(r.payableMonthly)}</td>` : ''}<td>${fx(r.replacementPct, 1)}</td><td>${fx(r.gapGDP, 2)}</td><td>${fx(r.interestGDP, 2)}</td><td>${r.fundGDP === null ? '—' : fx(r.fundGDP, 1)}</td><td>${fx(r.pensionSpendingGDP, 1)}</td></tr>`).join('');
  return section('Cifras por años', table(head, [body], 'Cifras por años')
    + note(`Euros de 2026. La pensión es la media de jubilación, pública y del fondo, repartida en 12 pagas.${pay ? ` «Pagable» es la que se podría pagar desde el ${report.why.aftermath.bailoutYear ? 'rescate' : 'impago'} (ver «Por qué se rompe»).` : ''} En negrita, el año consultado.${report.verdict.breakYear ? ` Con †, desde ${report.verdict.breakYear}, cuando se rompe.` : ''}`));
}

function assumptionsHtml(report) {
  const s = report.systemText;
  const card = s ? `<h3>${esc(s.name)}</h3>${note(`Así es ${esc(report.systemName)} en su forma de partida. Lo que has cambiado está en «Lo que has cambiado».`)}<dl class="ix-system">
    <div><dt>Qué es</dt><dd>${esc(s.what)}</dd></div><div><dt>La pensión</dt><dd>${esc(s.pension)}</dd></div>
    <div><dt>Quién entra y cuándo</dt><dd>${esc(s.entry)}</dd></div><div><dt>La cotización</dt><dd>${esc(s.contribution)}</dd></div>
    ${s.fund ? `<div><dt>El fondo</dt><dd>${esc(s.fund)}</dd></div>` : ''}<div><dt>Las pensiones de hoy</dt><dd>${esc(s.today)}</dd></div></dl>` : '';
  const verdict = '<h3>Cómo se juzga si aguanta</h3>' + table(['Supuesto', 'Valor', 'Tipo'],
    [report.verdictAssumptions.map(a => `<tr><th scope="row">${esc(a.name)}</th><td class="ix-text">${esc(a.value)}</td><td class="ix-text">${esc(a.kinds.join('; '))}</td></tr>`).join('')], 'Supuestos del veredicto');
  const common = `<h3>Supuestos de este escenario</h3><ul class="ix-list">${report.assumptions.map(a => `<li><strong>${esc(a.title)}.</strong> ${esc(a.text)}</li>`).join('')}</ul>`;
  return section('Supuestos', common + card + verdict);
}

function readingHtml() {
  return section('Cómo leer este informe', `<ul class="ix-list">
    <li>2026 es el punto de partida: datos publicados y algunas cifras reconstruidas a partir de ellos. Desde 2027 todo es simulación, con los supuestos de arriba.</li>
    <li>Los importes van en euros de 2026: con el poder de compra de hoy.</li>
    <li>«Lo que falta para pensiones» no es el déficit del Estado: es solo lo que las cotizaciones y los impuestos asignados no cubren.</li>
    <li>«Gasto público en pensiones» suma todas las pensiones públicas. La «pensión media» es solo la de jubilación, con su parte pública y la del fondo.</li>
    <li>«Se rompe», el rescate y la quita son reglas del simulador para leer el riesgo. No son previsiones de lo que pasará.</li>
  </ul>`);
}

function sourcesHtml(stamp) {
  const methodology = stamp.link.split('consola.html')[0] + 'metodologia.html#fuentes';
  return section('Fuentes principales', `<ul class="ix-list">
    <li>Población: Eurostat, EUROPOP2025. Empleo: INE, EPA.</li>
    <li>Pensiones: Seguridad Social, pensiones en vigor por edad; Ageing Report 2024 de la Comisión Europea.</li>
    <li>Cuentas públicas: IGAE, Tesoro Público y Banco de España. Impuestos: AEAT.</li>
    <li>Corto plazo y contraste: AIReF. Riesgo fiscal: Comisión Europea, Debt Sustainability Monitor 2022.</li>
  </ul>${note(`La lista completa, con la fecha y la huella de cada dato, está en Metodología, «Fuentes de datos»: ${esc(methodology)}`)}`);
}

function citeHtml(report, stamp) {
  const cite = stamp.cite.replace(` ${stamp.link}.`, '').replace('Escenario propio (en el enlace)', 'Escenario propio');
  const reopen = !report.link ? `Sus ajustes son los de ${esc(report.systemName)} al empezar: en la consola, pulsa «Reglas de hoy» y elige ese sistema.${report.limits.length ? ' Tus límites no van en el enlace: ponlos de nuevo en «Límites y mezcla».' : ''}`
    : report.link === 'long' ? 'El enlace sería demasiado largo: guarda el escenario en JSON desde la consola para volver a abrirlo.'
      : `Para volver a abrirlo: <a href="${esc(report.link)}">enlace del escenario</a>, en la versión digital de este informe. El enlace lleva los ajustes, pero no tus límites ni el año consultado. También puedes guardarlo en JSON desde la consola.`;
  return section('Reproducir y citar', `<p>${reopen}</p><p>Con otra versión del simulador, o con otros datos, las cifras pueden cambiar. Esta usa ${esc(stampLine(stamp))}.</p>
    <p><strong>Cita:</strong> ${esc(cite)}</p><p>${esc(stamp.licence)}</p>
    <p><strong>${esc(stamp.caveat)}</strong> La calibración es agregada y experimental: el informe no es un derecho legal ni una recomendación.</p>`);
}

function render(state, result) {
  sectionId = 0;
  const saved = findMatchingSavedScenario(state.config);
  const stamp = exportStamp(state.config);
  const hash = stamp.link.split('consola.html')[1] ?? '';
  const link = !hash ? null : linkTooLong(hash) ? 'long' : stamp.link;
  const report = buildScenarioReport(state, result, { name: saved?.name ?? null, link });
  $('[data-ix-doc]').innerHTML = headHtml(report, stamp) + changesHtml(report) + whyHtml(report)
    + section('Cuándo hace falta ayuda', report.milestones.length
      ? table(['Año', 'Qué pasa'], [report.milestones.map(m => `<tr><th scope="row">${m.year}</th><td class="ix-text">${esc(m.label)}</td></tr>`).join('')], 'Cuándo hace falta ayuda')
      : '<p>Ningún aviso hasta 2070.</p>')
    + moneyHtml(report) + yearsHtml(report)
    + section('Evolución de 2026 a 2070', `${breakNote(report)}<div class="ix-charts">${report.charts.map(c => chart(c, report, result)).join('')}</div>`)
    + assumptionsHtml(report) + readingHtml() + sourcesHtml(stamp) + citeHtml(report, stamp);
  document.title = `Pensiones Lab · Informe · ${report.name ?? report.systemName}`;
  // The page footer of the printed copy, with the version (CSS cannot read it).
  $('[data-ix-page]').textContent = `@page{@bottom-left{content:"Pensiones Lab ${APP_VERSION} (beta) · Informe del escenario · Simulación con supuestos, no una previsión oficial";font:7.5pt system-ui,sans-serif;color:#555}}`;
}

let token = 0;
async function run() {
  const mine = ++token;
  const state = getState();
  const doc = $('[data-ix-doc]');
  $('[data-ix-print]').disabled = true;
  doc.dataset.busy = 'true';
  say('Calculando…');
  let result;
  try {
    result = await simulateAsync(state.config);
  } catch (error) {
    if (mine !== token) return;
    doc.innerHTML = `<p class="ix-error" role="alert">No se ha podido calcular este escenario: ${esc(configErrorText(error, 'algún ajuste tiene un valor con el que el motor no sabe hacer las cuentas.'))} Vuelve a la consola y deshaz el último cambio.</p>`;
    delete doc.dataset.busy;
    say('');
    return;
  }
  if (mine !== token) return;
  try {
    render(state, result);
    $('[data-ix-print]').disabled = false;
    say('Informe listo.');
  } catch (error) {
    console.error('No se pudo componer el informe', error);
    doc.innerHTML = '<p class="ix-error" role="alert">El escenario se ha calculado, pero el informe no se ha podido componer. Es un fallo de esta página: avísanos con «Fallos y mejoras».</p>';
    say('');
  }
  delete doc.dataset.busy;
}

$('[data-ix-print]').addEventListener('click', () => window.print());
run();
// A change in the console (another tab) is drawn again here.
subscribe(() => run());
