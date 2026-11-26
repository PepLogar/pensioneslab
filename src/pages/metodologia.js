// «Metodología»: la ficha de la versión, los supuestos con su tipo (O, R, S), los valores de partida de
// cada ajuste y las fuentes de datos. Todo se lee de los módulos que usa el motor (catálogo de ajustes,
// DEFAULT_CONFIG, data/*.js): la página no puede contar una cifra distinta de la que calcula la consola.
// La descripción del modelo y sus ecuaciones llegan después, sección a sección (docs/DECISIONES.md).
import { DEFAULT_CONFIG, BASE_YEAR, END_YEAR, CALIBRATION_ID, STATE_VERSION } from '../shared/default-config.js';
import { SETTINGS_CHAPTERS, SETTINGS_PARTS } from '../shared/settings-catalog.js';
import { ROWS } from '../shared/console-rows.js';
import { exportStamp } from '../shared/citation.js';
import { CREDITS, ATTRIBUTION } from '../shared/credits.js';
import { COMMON_ASSUMPTIONS, SYSTEM_ASSUMPTIONS, portfolioName } from '../domain/system-assumptions.js';
import { num } from '../shared/number-format.js';
import { ASSUMPTIONS, ASSUMPTION_GROUPS, ASSUMPTION_KINDS, UPCOMING_DATES } from '../domain/assumptions-catalog.js';
import { assumptionPlaces, startingValue, controlRange, CONSOLE_TABS } from '../domain/methodology.js';
import { collectSources } from '../domain/source-registry.js';
import { renderMarkdown, headingSlug } from '../shared/markdown.js';
import contrast from '../../data/external-contrast.json';
import { SQUEEZE_FIELDS, SQUEEZE_DEFAULTS, DEPARTMENTS, LIMIT_FIELDS, DEFAULT_LIMITS } from '../domain/consola-measures.js';
import { num as formatNum } from '../shared/number-format.js';
import { mountSiteHeader } from '../shared/site-header.js';

mountSiteHeader();

const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kind = k => `<span class="mx-kind" data-kind="${k}" title="${esc(ASSUMPTION_KINDS[k])}">${k}</span>`;
const table = (head, rows) => `<table class="mx-table"><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
const stamp = exportStamp(null);
const sections = [];
const section = (id, title, html, subs = []) => sections.push({ id, title, html, subs });

// 1 · Ficha
section('ficha', 'Ficha', `
  <dl class="mx-card">
    <dt>Aplicación</dt><dd>${esc(stamp.app)}</dd>
    <dt>Metodología del motor</dt><dd><code>${esc(stamp.methodology)}</code></dd>
    <dt>Datos (calibración)</dt><dd><code>${esc(CALIBRATION_ID)}</code></dd>
    <dt>Versión del estado guardado</dt><dd>${STATE_VERSION}</dd>
    <dt>Horizonte</dt><dd>${BASE_YEAR} (año base, observado) a ${END_YEAR}; las decisiones actúan desde ${BASE_YEAR + 1}</dd>
    <dt>Unidades</dt><dd>Euros de ${BASE_YEAR} salvo que se diga otra cosa; ratios sobre el PIB del año</dd>
    <dt>Cómo citar</dt><dd>${esc(stamp.cite)}</dd>
  </dl>
  <p><strong>Qué es.</strong> Un simulador agregado y experimental de las pensiones de España y de las cuentas del Estado que las pagan. Compara reparto, cuentas nocionales, capitalización y sus mezclas con las mismas palancas y la misma economía.</p>
  <p><strong>Qué no es.</strong> No es una previsión oficial, no calcula derechos legales individuales y no ordena los sistemas en un ranking validado. Los resultados dependen de los supuestos de esta página; cada uno dice si es observación, reconstrucción o supuesto.</p>
  <p><strong>Cuentas separadas.</strong> El motor lleva aparte los derechos nocionales, los activos invertidos, la financiación pública y las pensiones causadas antes de la reforma. Una misma cotización no paga a la vez el reparto y la capitalización.</p>`);

// 1b · Los sistemas y sus supuestos (src/domain/system-assumptions.js; the engine's shares in data/external-contrast.json,
// section 6). The first thing to read: what every system starts from and how each one handles it.
const sysPct = v => Number.isFinite(v) ? `${formatNum(100 * v, 0, { fixed: true })} %` : '—';
const sysN1 = v => formatNum(v, 1, { fixed: true });
const sysPct1 = v => Number.isFinite(v) ? `${formatNum(100 * v, 1, { fixed: true })} %` : '—';
const sysData = new Map((contrast.systems ?? []).map(s => [s.key, s]));
const sysCard = s => {
  const d = sysData.get(s.key);
  const row = (label, text) => text ? `<dt>${esc(label)}</dt><dd>${esc(text)}</dd>` : '';
  const fundLine = d?.fund ? `${s.fund} Rentabilidad real neta mientras se ahorra: ${sysPct1(d.fund.netActive)} al año; la renta se calcula al ${sysPct1(d.fund.annuityRate)} («${portfolioName(d.fund.style)}»).` : s.fund;
  const fixed = s.fixed.length ? `<p class="mx-muted">Ajustes que fija este sistema al elegirlo (capítulo «El sistema»; se pueden cambiar después):</p>
    ${table(['Ajuste', 'Valor'], s.fixed.map(f => `<tr><td>${esc(f.name)}</td><td>${esc(f.value)}</td></tr>`))}` : '';
  const years = d ? `<p class="mx-muted">A dónde va la cotización de jubilación, año a año, como la mide el motor con los ajustes de partida:</p>
    ${table(['Año', 'Reparto', 'Nocionales', 'Fondo'], d.weights.map(w => `<tr><td class="key">${w.year}</td><td class="num">${sysPct(w.payg)}</td><td class="num">${sysPct(w.ndc)}</td><td class="num">${sysPct(w.funded)}</td></tr>`))}` : '';
  const ages = d?.byAge ? `<p class="mx-muted">Parte de la cotización de jubilación de cada uno que va al fondo, según su edad en 2026, cuando el cambio ha terminado:</p>
    ${table(['Edad en 2026', 'Fondo', 'Nocionales', 'Reparto'], d.byAge.map(a => `<tr><td class="key">${a.age}</td><td class="num">${sysPct(a.funded)}</td><td class="num">${sysPct(a.ndc)}</td><td class="num">${sysPct(a.payg)}</td></tr>`))}` : '';
  const outcome = d ? `<p class="mx-muted">Con los ajustes de partida: deuda del ${sysN1(d.outcome.debt2050)} % del PIB en 2050 y del ${sysN1(d.outcome.debt2070)} % en 2070; pensión media del ${sysPct(d.outcome.replacement2050)} del salario medio en 2050${d.outcome.fund2070 > 0 ? `; fondo del ${sysN1(d.outcome.fund2070)} % del PIB en 2070` : ''}. El veredicto, en la consola.</p>` : '';
  return `<h3 id="sis-${s.key}">${esc(s.name)}${s.selectable ? '' : ' <span class="mx-muted">(no está en la lista «Sistema»)</span>'}</h3>
  <dl class="mx-card mx-sys">${row('Qué es', s.what)}${row('Cómo se calcula la pensión', s.pension)}${row('Quién entra y cuándo', s.entry)}${row('A dónde va la cotización', s.contribution)}${row('Dónde se invierte', fundLine)}${row('Las pensiones de hoy', s.today)}${row('Freno de 2023', s.brake)}</dl>
  ${fixed}${years}${ages}${outcome}`;
};
section('sistemas', 'Los sistemas y sus supuestos', `
  <p><strong>Lo primero que conviene mirar.</strong> Todos los sistemas parten de los mismos supuestos; lo que cambia es a dónde va la cotización de jubilación y cómo se calcula la pensión. Elegir un sistema en la consola fija algunos ajustes, que se pueden cambiar después; para comparar sistemas en limpio, pulsa antes «Reglas de hoy».</p>
  <h3 id="sis-comun">Lo que comparten todos</h3>
  <dl class="mx-card mx-sys">${COMMON_ASSUMPTIONS.map(a => `<dt>${esc(a.title)}</dt><dd>${esc(a.text)}</dd>`).join('')}</dl>
  ${SYSTEM_ASSUMPTIONS.map(sysCard).join('')}`,
  [{ id: 'sis-comun', title: 'Lo que comparten todos' }, ...SYSTEM_ASSUMPTIONS.map(s => ({ id: `sis-${s.key}`, title: s.name }))]);

// 2 · Modelo: docs/modelo/NN-*.md, en su orden. Cada archivo empieza por «## N · Título».
const modelDocs = Object.entries(import.meta.glob('../../docs/modelo/*.md', { query: '?raw', import: 'default', eager: true }))
  .sort(([a], [b]) => a.localeCompare(b)).map(([, text]) => text);
// Bajo el «Modelo» de la página, cada «##» del documento es un h3 y cada «###» un h4; los anclajes llevan «m-».
const modelHtml = modelDocs.map(text => renderMarkdown(text)
  .replace(/<(\/?)h([1-5])( id=")?/g, (_, close, n, id) => `<${close}h${Number(n) + 1}${id ? `${n === '2' ? ' class="mx-modh"' : ''} id="m-` : ''}`)).join('');
const modelSubs = modelDocs.map(text => text.match(/^## +(.+)$/m)?.[1]?.trim()).filter(Boolean).map(t => ({ id: `m-${headingSlug(t)}`, title: t }));
if (modelDocs.length) section('modelo', 'Modelo', `
  <p>Qué calcula el motor y cómo, con sus ecuaciones. Cada mecanismo cita el código que lo implementa (<code>ruta:línea</code>) y la clave de su ajuste. Leído del código de la metodología <code>${esc(stamp.methodology)}</code>; lo marcado «[sin verificar]» no se pudo confirmar en él.</p>
  <div class="mx-md">${modelHtml}</div>`, modelSubs);

// Contraste: data/external-contrast.json, written by scripts/contrast-external.mjs from the engine and the
// sources stored in the project (Ageing Report 2024, AIReF 2026, FMI, Funcas). Nothing is calibrated to them.
// The real minus sign (−) and the comma, as everywhere (src/shared/number-format.js).
const n1 = (v, d = 1) => formatNum(v, d, { fixed: true });
const diff = (a, b, d = 1) => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '—';
  const x = Number((a - b).toFixed(d));     // the sign of what is shown, not of the rounding noise
  return `${x > 0 ? '+' : x < 0 ? '−' : '±'}${n1(Math.abs(x), d)}`;
};
const years = contrast.longRun[0].cells.map(c => c.year);
const pairHead = ys => ys.map(y => `<th scope="col" class="num">${y}</th>`).join('');
const longRows = contrast.longRun.map(row => `<tr><th scope="row">${esc(row.label)}<br><span class="mx-muted">AR ${esc(row.arRow)}</span></th>
  ${row.cells.map(c => `<td class="num">${n1(c.sim)}<br><span class="mx-muted">${n1(c.ar)} · ${diff(c.sim, c.ar)}</span></td>`).join('')}</tr>`);
const sensYears = [2040, 2050, 2070];
const sensRows = contrast.sensitivities.flatMap(s => [`<tr><th scope="row" rowspan="${s.sim.length + 1}">${esc(s.label)}<br><span class="mx-muted">AR ${esc(s.arRow)}</span></th>
  <td>Ageing Report</td>${s.ar.map(v => `<td class="num">${n1(v, 2)}</td>`).join('')}</tr>`, ...s.sim.map(v => `<tr><td>${esc(v.how)}</td>${v.cells.map(c => `<td class="num">${n1(c, 2)}</td>`).join('')}</tr>`)]);
const SHORT = [['realGrowth', 'Crecimiento del PIB real, %'], ['inflation', 'Inflación, % (simulador: deflactor del PIB; FMI: IAPC; Funcas: IPC)'], ['employmentGrowth', 'Crecimiento del empleo, %'], ['debtGDP', 'Deuda, % del PIB'], ['balanceGDP', 'Saldo público, % del PIB'], ['interestGDP', 'Intereses, % del PIB'], ['revenueGDP', 'Ingresos públicos, % del PIB'], ['spendingGDP', 'Gasto público, % del PIB']];
const shortTable = (rows, label) => table(['Medida', ...rows.map(r => r.year)], SHORT.filter(([k]) => rows.some(r => Number.isFinite(r.ref[k])))
  .map(([k, l]) => `<tr><th scope="row">${esc(l)}</th>${rows.map(r => `<td class="num">${n1(r.sim[k])}<br><span class="mx-muted">${esc(label)} ${n1(r.ref[k])}</span></td>`).join('')}</tr>`));
const stale = contrast.methodology !== stamp.methodology;
// The AIReF's medium term (airefMediumTerm): its constant-policy path 2026–2030, rubric by rubric, and why the ratios part.
const am = contrast.airefMediumTerm;
const airefMediumHtml = am ? (() => {
  const m = am.macro, g = am.growth;
  const cells = r => r.sim.map((v, i) => `<td class="num">${n1(v)}<br><span class="mx-muted">AIReF ${n1(r.ref[i])}</span></td>`).join('');
  return `<h3 id="c-airef-medio">AIReF: medio plazo, 2026–2030</h3>
  <p class="mx-muted">Su senda a políticas constantes, sin nuevas medidas y sin PRTR (${esc(am.source)}, ${esc(am.tables)}). No supone que se cumpla el plan fiscal. Cada celda: el simulador; debajo, la AIReF. % del PIB.</p>
  ${table(['Medida', ...am.years, 'Cambio 2026–2030'], am.rows.map(r => `<tr><th scope="row">${esc(r.label)}</th>${cells(r)}<td class="num">${diff(r.sim.at(-1), r.sim[0])}<br><span class="mx-muted">AIReF ${diff(r.ref.at(-1), r.ref[0])}</span></td></tr>`))}
  <p class="mx-muted">Las pensiones del simulador y las prestaciones en efectivo de la AIReF no son lo mismo: las suyas incluyen desempleo, incapacidad y otras. Se comparan sus cambios.</p>
  ${table(['Crecimiento, %', ...g.years], [
    ['Gasto primario del simulador, en euros (sin descontar medidas ni gastos puntuales)', g.sim],
    ['Gasto primario neto comprometido en el plan fiscal', g.plan],
    ['Gasto primario neto de la AIReF, a políticas constantes', g.airef]
  ].map(([label, vals]) => `<tr><th scope="row">${esc(label)}</th>${vals.map(v => `<td class="num">${v == null ? '—' : n1(v)}</td>`).join('')}</tr>`))}
  ${table(['Crecimiento, %', ...m.years], [
    ['PIB nominal, simulador', m.simNominal], ['PIB nominal, AIReF', m.airefNominal],
    ['Empleo, simulador', m.simEmployment], ['Empleo equivalente a tiempo completo, AIReF', m.airefEmployment]
  ].map(([label, vals]) => `<tr><th scope="row">${esc(label)}</th>${vals.map(v => `<td class="num">${n1(v)}</td>`).join('')}</tr>`))}
  <p><strong>Lectura.</strong> Desde la 1.69, el simulador usa por defecto el empleo y la inflación que prevé la AIReF hasta 2030 (ajuste «Empleo e inflación hasta 2030 como prevé la AIReF»). Su PIB nominal crece de 2026 a 2030 un ${n1(m.cumulative.sim)} %, y el de la AIReF un ${n1(m.cumulative.airef)} %. En 2030 su saldo queda ${diff(am.rows[2].sim.at(-1), am.rows[2].ref.at(-1))} puntos frente al de la AIReF: los ingresos, ${diff(am.rows[0].sim.at(-1), am.rows[0].ref.at(-1))} (sobre todo el IRPF, que la AIReF sube más por la progresividad en frío), y los gastos, ${diff(am.rows[1].sim.at(-1), am.rows[1].ref.at(-1))}. Ingresos y gastos del simulador van sin su PRTR. A largo plazo, el empleo vuelve a crecer como el del Ageing Report (<code>docs/DECISIONES.md</code>, 24/11/2026).</p>
  ${am.withoutOption ? `<p><strong>Sin ese ajuste</strong>, con el empleo del Ageing Report y la inflación del escenario, el saldo del simulador sería ${am.withoutOption.balance.map(v => n1(v)).join(' / ')} en ${am.years[0]}–${am.years.at(-1)}, y la deuda de 2050 subiría del ${n1(am.withoutOption.debt2050Base)} al ${n1(am.withoutOption.debt2050)} %; la de 2070, del ${n1(am.withoutOption.debt2070Base)} al ${n1(am.withoutOption.debt2070)} %.</p>` : ''}
  <p class="mx-muted">${esc(am.adjustment.text)} (pág. ${am.adjustment.page}).</p>`;
})() : '';
// The AIReF's long-run debt (airefDebt): its published points against the simulator, and the identity with its primary balance.
const ad = contrast.airefDebt;
const airefDebtHtml = ad ? `<h3 id="c-airef-deuda">AIReF: la deuda a largo plazo</h3>
  <p class="mx-muted">Su escenario a políticas constantes, sin reglas fiscales (${esc(ad.source)}). Cada celda: el simulador; debajo, la AIReF cuando publica ese año.</p>
  ${table(['Medida', ...ad.years], ad.rows.map(r => `<tr><th scope="row">${esc(r.label)}</th>${r.sim.map((v, i) => `<td class="num">${n1(v)}${r.ref[i] == null ? '' : `<br><span class="mx-muted">AIReF ${n1(r.ref[i])}</span>`}</td>`).join('')}</tr>`))}
  <p><strong>Lectura: por qué la deuda se separa.</strong> En 2050, el simulador gasta en pensiones el ${n1(ad.pensions.at(-1))} % del PIB y la AIReF el ${n1(ad.pensions2050Airef ?? 16.4)} % (con su propia demografía). Si las cuentas del simulador se rehacen con su crecimiento y sus intereses, pero con el saldo primario de la AIReF, la deuda de 2050 pasa del ${n1(ad.identity[0].values.at(-1))} % al ${n1(ad.identity[1].values.at(-1))} %, frente a su ${n1(ad.identity[2].values.at(-1))} %. El saldo primario explica ${diff(ad.identity[1].values.at(-1), ad.identity[0].values.at(-1))} puntos; los otros ${diff(ad.identity[2].values.at(-1), ad.identity[1].values.at(-1))} salen del crecimiento nominal y de los intereses, que en la AIReF son otros. Los ingresos y gastos del simulador se muestran sin su PRTR. Desde la 1.73, el motor lo lleva con el calendario de la AIReF, el mismo en ingresos y en gastos: ${n1(contrast.prtr?.[2026] ?? 1.25, 2)} puntos de PIB en 2026 y nada desde 2030 (<code>docs/DECISIONES.md</code>, 25/11/2026).</p>
  ${table(['Deuda, % del PIB', ...ad.years], ad.identity.map(p => `<tr><th scope="row">${esc(p.label)}</th>${p.values.map(v => `<td class="num">${n1(v)}</td>`).join('')}</tr>`))}` : '';
// Why the debt parts from the IMF's (debtGap): the debt identity with the IMF's blocks, one at a time.
const dg = contrast.debtGap;
const dgLast = label => dg?.paths.find(p => p.label === label)?.values.at(-1);
const debtGapHtml = dg ? `<p><strong>Lectura: por qué la deuda se separa de la del FMI.</strong> La deuda de cada año es la del anterior, rebajada por lo que crece el PIB nominal, más los intereses y menos el saldo primario. Si se cambian en el simulador sus bloques por los del FMI, de uno en uno, se ve qué pesa:</p>
  ${table(['Deuda, % del PIB', ...dg.years], dg.paths.map(p => `<tr><th scope="row">${esc(p.label)}</th>${p.values.map(v => `<td class="num">${n1(v)}</td>`).join('')}</tr>`))}
  <ul class="mx-list">
    <li><strong>Saldo primario (${diff(dgLast('Con el saldo primario del FMI'), dgLast('Simulador'))} puntos en ${dg.years.at(-1)}).</strong> El simulador sigue las reglas de hoy: su gasto primario pasa del ${n1(dg.primarySpending.sim[0])} % al ${n1(dg.primarySpending.sim.at(-1))} % del PIB, con más pensiones y más sanidad. En el FMI pasa del ${n1(dg.primarySpending.imf[0])} % al ${n1(dg.primarySpending.imf.at(-1))} %. Su escenario central no es la meta de consolidación del Gobierno: incorpora medidas ya identificadas, la progresividad en frío (impuestos que suben con la inflación sin tocar las tarifas), subidas graduales de cotizaciones y el calendario de los fondos europeos (fuente guardada: <code>data/external-forecasts-international-20261017.json</code>).</li>
    <li><strong>Crecimiento (${diff(dgLast('Con el PIB nominal del FMI'), dgLast('Simulador'))} puntos).</strong> El simulador frena hacia el ${n1(contrast.imf.at(-1).sim.realGrowth)} % real por la demografía. El FMI mantiene el ${n1(contrast.imf.at(-1).ref.realGrowth)} %, más que el Ageing Report.</li>
    <li><strong>Intereses (${diff(dgLast('Con los intereses del FMI'), dgLast('Simulador'))} puntos).</strong> El FMI paga algo más.</li>
    <li><strong>Lo que queda.</strong> La deuda publicada por el FMI (${n1(dgLast('FMI, publicado'))} %) no sale entera de sus propias cifras (${n1(dgLast('Y con la deuda de partida del FMI'))} %). La diferencia es su ajuste entre déficit y deuda, que ${dgLast('FMI, publicado') >= dgLast('Y con la deuda de partida del FMI') ? 'la sube: por ejemplo, préstamos o compras de activos financieros' : 'la baja: por ejemplo, ventas de activos o uso de depósitos'}. Su saldo primario es aquí el saldo total más los intereses pagados, como en el simulador.</li>
  </ul>` : '';
// The two readings of the long-run table, computed by the script (pensionersGap, levelGap).
const x = v => `×${n1(v, 3)}`;
const gap = contrast.pensionersGap, lvl = contrast.levelGap;
const spCell = year => contrast.longRun.find(r => r.id === 'spending')?.cells.find(c => c.year === year) ?? { sim: null, ar: null };
const sp2026 = spCell(2026), sp2050 = spCell(2050);
const readingHtml = gap && lvl ? `<p><strong>Lectura: por qué los jubilados crecen más.</strong> De ${gap.from} a ${gap.to}, los jubilados del simulador crecen ${x(gap.factors.simulator.total)} y los pensionistas del Ageing Report ${x(gap.factors.ageingReport.total)}. La diferencia se reparte en tres factores, que multiplicados la dan entera:</p>
  <ul class="mx-list">
    <li><strong>Demografía, ${x(gap.split.demography)}.</strong> EUROPOP2025, la del simulador, da ${n1(gap.population65.simulator[1] / 1e6)} millones de mayores de 65 en ${gap.to}. La proyección del Ageing Report da ${n1(gap.population65.ageingReport[1] / 1e6)} millones.</li>
    <li><strong>Definición, ${x(gap.split.definition)}.</strong> El Ageing Report cuenta todas las pensiones, también las de viudedad e incapacidad de menores de 65, que crecen menos. El simulador cuenta solo jubilación.</li>
    <li><strong>Cobertura, ${x(gap.split.coverage)}.</strong> El Ageing Report sube la edad de salida del empleo de ${n1(gap.exitAge[0])} a ${n1(gap.exitAge[1])} años, y el simulador sigue por defecto esa misma senda (desde la 1.68). Lo que queda en este factor son otras diferencias de cobertura entre los jubilados del simulador y los pensionistas de 65 o más del Ageing Report.</li>
  </ul>
  <p><strong>Lectura: por qué el gasto empieza más bajo.</strong> La diferencia ya está en 2022, el año base del Ageing Report: su gasto de pensiones públicas abarca más que la medida de la AIReF y el Ministerio (${n1(lvl.ageingReport[0] - lvl.observed[0], 2)} puntos). Hasta 2025 crece: el Ageing Report preveía que el gasto subiera ${n1(lvl.ageingReport[3] - lvl.ageingReport[0], 2)} puntos de PIB y subió ${n1(lvl.observed[3] - lvl.observed[0], 2)}, porque el PIB creció más que su crecimiento potencial (${lvl.arPotentialGrowth.slice(0, 3).map(v => n1(v)).join(', ')} % en 2023–2025). El simulador arranca del dato observado. De 2026 a 2050, el simulador sube ${diff(sp2050.sim, sp2026.sim, 2)} puntos y el Ageing Report ${diff(sp2050.ar, sp2026.ar, 2)}.</p>
  ${table(['Gasto bruto en pensiones, % del PIB', ...lvl.years], [
    `<tr><th scope="row">Ageing Report 2024</th>${lvl.ageingReport.map(v => `<td class="num">${n1(v, 2)}</td>`).join('')}</tr>`,
    `<tr><th scope="row">Observado (la medida de la AIReF y el Ministerio)</th>${lvl.observed.map(v => `<td class="num">${n1(v, 2)}</td>`).join('')}</tr>`,
    `<tr><th scope="row">Simulador</th>${lvl.simulator.map(v => `<td class="num">${n1(v, 2)}</td>`).join('')}</tr>`])}` : '';
section('contraste', 'Contraste con otras proyecciones', `
  ${stale ? `<p><strong>Aviso:</strong> este contraste se calculó con la metodología <code>${esc(contrast.methodology)}</code>, no con la actual. Hay que volver a ejecutar <code>node scripts/contrast-external.mjs</code>.</p>` : ''}
  <p>El escenario de partida (reglas de hoy) frente a lo que publican otros, guardado en el proyecto. <strong>Nada se calibra a estas fuentes</strong>: las diferencias son el resultado, no un error que se haya corregido. Definiciones distintas (por ejemplo, jubilados frente a todos los pensionistas) se dicen en cada fila. Calculado el ${esc(contrast.generatedAt.slice(0, 10))} con <code>scripts/contrast-external.mjs</code>.</p>
  <h3 id="c-ar">Largo plazo: Ageing Report 2024 (Comisión Europea), España</h3>
  <p class="mx-muted">Cada celda: el simulador; debajo, el Ageing Report y la diferencia. Desde la 1.69, el simulador toma de 2027 a 2030 el empleo y la inflación de la AIReF: en 2030, el crecimiento y el empleo lo reflejan. Anexo estadístico, hojas ESa y ESb, comprobado con su SHA-256.</p>
  ${table(['Medida', ...years], longRows)}
  ${readingHtml}
  <h3 id="c-ar-own">El mismo escenario con los supuestos del Ageing Report</h3>
  <p class="mx-muted">Con el perfil «Supuestos del Ageing Report 2024» de la consola: su población (EUROPOP2023), su empleo y su edad de jubilación, que sube; los años de más no suben la pensión, porque su pensión de entrada ya cuenta con esa edad. «Actualizado» aplica sus crecimientos al gasto observado de 2025, como hace la regla de gasto. Gasto en pensiones, % del PIB; ocupados de 2070, 2026 = 100:</p>
  ${table(['Escenario', ...years, 'Ocupados 2070', 'Deuda 2070'], contrast.withArAssumptions.rows.map(r => `<tr><th scope="row">${esc(r.label)}</th>${r.spending.map(v => `<td class="num">${n1(v)}</td>`).join('')}<td class="num">${n1(r.contributorsIndex2070)}</td><td class="num">${r.debt2070 == null ? '—' : n1(r.debt2070)}</td></tr>`))}
  <h3 id="c-ar-sens">Sensibilidades del Ageing Report, con las palancas del simulador</h3>
  <p class="mx-muted">Cambio del gasto en pensiones frente a su escenario base, en puntos de PIB.</p>
  ${table(['Sensibilidad', 'Cómo', ...sensYears], sensRows)}
  <h3 id="c-airef">AIReF: la regla de gasto de 2023</h3>
  <p class="mx-muted">La misma ventana (2022–2050) y la misma lectura: la primera evaluación propia del simulador (${contrast.airef.year}) frente a ${esc(contrast.airef.source)}.</p>
  ${table(['Medida', 'Simulador', 'AIReF', 'Diferencia'], contrast.airef.rows.map(r => `<tr><th scope="row">${esc(r.label)}</th><td class="num">${n1(r.sim, 2)}</td><td class="num">${n1(r.ref, 2)}</td><td class="num">${diff(r.sim, r.ref, 2)}</td></tr>`))}
  ${airefDebtHtml}
  ${airefMediumHtml}
  <h3 id="c-corto">Corto plazo: FMI (mayo de 2026) y Funcas (octubre de 2026)</h3>
  <p class="mx-muted">Cada celda: el simulador; debajo, la fuente.</p>
  ${shortTable(contrast.imf, 'FMI')}
  ${shortTable(contrast.funcas, 'Funcas')}
  ${debtGapHtml}`,
  [{ id: 'c-ar', title: 'Ageing Report 2024' }, { id: 'c-ar-own', title: 'Con sus supuestos' }, { id: 'c-ar-sens', title: 'Sus sensibilidades' }, { id: 'c-airef', title: 'AIReF' }, { id: 'c-airef-deuda', title: 'Deuda de la AIReF' }, { id: 'c-airef-medio', title: 'AIReF a medio plazo' }, { id: 'c-corto', title: 'FMI y Funcas' }]);

// 3 · Supuestos
const assumptionRow = a => {
  const { places, fixed } = assumptionPlaces(a);
  const where = [...places.map(esc), fixed ? `<span class="mx-muted">${esc(fixed)}</span>` : ''].filter(Boolean).join('<br>');
  return `<tr id="s-${esc(a.id)}"><th scope="row">${esc(a.name)}</th><td>${esc(a.value)}${a.history ? `<br><span class="mx-muted">${esc(a.history)}</span>` : ''}</td>
    <td class="key">${a.kinds.map(kind).join('')}</td><td>${esc(a.source)}</td><td>${where || '—'}</td><td class="key">${a.doc ? `<code>${esc(a.doc)}</code>` : '—'}</td></tr>`;
};
section('supuestos', 'Supuestos', `
  <p>${Object.entries(ASSUMPTION_KINDS).map(([k, label]) => `${kind(k)} ${esc(label)}`).join(' · ')}. Un supuesto puede llevar varios tipos: el dato observado y lo que el simulador supone sobre él.</p>
  <p class="mx-muted">«Dónde se cambia» da el capítulo y el nombre del ajuste en la consola (búscalo con «/»). «Auditoría» nombra el documento de trabajo que lo justifica, de la versión anterior del proyecto, que no está publicada.</p>
  ${ASSUMPTION_GROUPS.map(g => `<h3 id="sg-${g.id}">${esc(g.title)}</h3>${table(['Supuesto', 'Valor', 'Tipo', 'Fuente', 'Dónde se cambia', 'Auditoría'], ASSUMPTIONS.filter(a => a.group === g.id).map(assumptionRow))}`).join('')}`,
  ASSUMPTION_GROUPS.map(g => ({ id: `sg-${g.id}`, title: g.title })));

// 3 · Valores de partida
const settingRow = row => `<tr><th scope="row">${esc(row.entry.name)}</th><td class="key"><code>${esc(row.entry.key)}</code></td>
  <td>${esc(startingValue(row, DEFAULT_CONFIG))}</td><td>${esc(controlRange(row))}</td><td>${esc(row.hint)}</td></tr>`;
const fieldRow = (f, value) => `<tr><th scope="row">${esc(f.label)}</th><td class="key"><code>${esc(f.key)}</code></td>
  <td>${esc(f.options ? f.options.find(([v]) => v === value)?.[1] ?? value : `${num(value * (f.scale ?? 1), 2)} ${f.unit ?? ''}`)}</td>
  <td>${esc(f.options ? f.options.map(([, l]) => l).join(' · ') : `${num(f.min)} – ${num(f.max)}, paso ${num(f.step, 2)}`)}</td><td>${esc(f.hint ?? '')}</td></tr>`;
const settingsHead = ['Ajuste', 'Clave', 'Valor de partida', 'Lo que admite', 'Qué mueve'];
section('partida', 'Valores de partida', `
  <p>El escenario de partida es España en ${BASE_YEAR} con las reglas de hoy (botón «Reglas de hoy» de la consola). Cada ajuste, con su clave en los archivos exportados, su valor de partida y lo que admite.</p>
  ${SETTINGS_CHAPTERS.map(c => `<h3 id="pc-${c.id}">${c.number} · ${esc(c.title)} <span class="mx-muted">(${esc(SETTINGS_PARTS[c.part])})</span></h3>
    <p class="mx-muted">${esc(c.question)}</p>${table(settingsHead, ROWS.filter(r => r.entry.chapter === c.id).map(settingRow))}`).join('')}
  <h3 id="pc-ricos">Pestaña «${CONSOLE_TABS.ricos}»</h3>${table(settingsHead, SQUEEZE_FIELDS.map(f => fieldRow(f, SQUEEZE_DEFAULTS[f.key])))}
  <h3 id="pc-partidas">Pestaña «${CONSOLE_TABS.partidas}»</h3>
  ${table(['Partida', 'Clave', 'Parte del resto del gasto', 'Recorte máximo'], DEPARTMENTS.map(d => `<tr><th scope="row">${esc(d.label)}</th><td class="key"><code>${esc(d.id)}</code></td><td class="num">${num(d.share * 100, 1)} %</td><td class="num">${num(d.maxCut * 100, 1)} %</td></tr>`))}
  <h3 id="pc-limites">Pestaña «${CONSOLE_TABS.limites}»: tus límites</h3>${table(settingsHead, LIMIT_FIELDS.map(f => fieldRow({ ...f, scale: 1 }, DEFAULT_LIMITS[f.key])))}`,
  [...SETTINGS_CHAPTERS.map(c => ({ id: `pc-${c.id}`, title: `${c.number} · ${c.title}` })),
    { id: 'pc-ricos', title: CONSOLE_TABS.ricos }, { id: 'pc-partidas', title: CONSOLE_TABS.partidas }, { id: 'pc-limites', title: 'Tus límites' }]);

// 4 · Fuentes de datos
const sources = collectSources(import.meta.glob('../../data/*.js', { eager: true }));
const publishers = [...new Set(sources.map(s => s.publisher))].sort((a, b) => a.localeCompare(b, 'es'));
const sourceRow = s => `<tr><td class="key"><code>${esc(s.label)}</code></td><td><a href="${esc(s.url)}" rel="noreferrer">${esc(decodeURI(s.url).replace(/^https?:\/\/(www\.)?/, '').slice(0, 90))}</a>${s.where ? `<br><span class="mx-muted">${esc(s.where)}</span>` : ''}</td>
  <td>${s.file ? `<code>${esc(s.file)}</code>${s.sha256 ? `<br><span class="mx-hash" title="SHA-256 ${esc(s.sha256)}">SHA-256 ${esc(s.sha256.slice(0, 16))}…</span>` : ''}` : '<span class="mx-muted">sin copia</span>'}</td>
  <td>${s.modules.map(m => `<code>${esc(m)}</code>`).join('<br>')}</td></tr>`;
section('fuentes', 'Fuentes de datos', `
  <p>Las cifras del simulador son elaboración propia a partir de estas fuentes; las instituciones citadas no avalan sus resultados (<a href="#aviso-licencias">condiciones</a>).</p>
  <p>${sources.length} fuentes, leídas de los módulos de datos que usa el motor (<code>data/*.js</code>), también las que citan en sus notas. La copia es el archivo que se descargó, con su huella SHA-256: quien lo descargue de nuevo puede comprobar si ha cambiado. Las copias no se publican, porque son de sus autores. Algunas se descargaron para la versión anterior del proyecto, y se dice así. Las fuentes bibliográficas de los supuestos están en su tabla.</p>
  ${publishers.map(p => `<h3 id="f-${esc(p.replace(/\W+/g, '-'))}">${esc(p)}</h3>${table(['Dato', 'Enlace', 'Copia descargada (no publicada)', 'Lo usa'], sources.filter(s => s.publisher === p).map(sourceRow))}`).join('')}`,
  publishers.map(p => ({ id: `f-${p.replace(/\W+/g, '-')}`, title: p })));

// 5 · Próximas citas
section('citas', 'Próximas citas', `<p>Publicaciones que cambiarían datos o cifras del simulador.</p>
  ${table(['Cuándo', 'Qué', 'Fuente', 'Qué cambia'], UPCOMING_DATES.map(d => `<tr><td class="key">${esc(d.when)}</td><td>${esc(d.what)}</td><td>${esc(d.source)}</td><td>${esc(d.changes)}</td></tr>`))}`);

// 6 · Aviso legal y privacidad (docs/PUBLICACION-CUESTIONES-LEGALES-2026-11-25.md). The data of the company and the
// licences come from src/shared/credits.js.
const C = CREDITS;
section('aviso', 'Aviso legal y privacidad', `
  <p class="mx-muted">Versión del 25 de noviembre de 2026.</p>
  <h3 id="aviso-quien">Quién responde de esta web</h3>
  <p>Pensiones Lab es un simulador experimental de sistemas de pensiones. Forma parte de <a href="${esc(C.initiativeHref)}" rel="noreferrer">Demarquía Planetaria</a> · Cabeza Propia, proyectos personales de su autor, sin personalidad jurídica. La desarrolla y la mantiene:</p>
  <ul><li>${esc(C.company)}</li><li>${esc(C.companyId)}</li><li>${esc(C.address)}</li>
    <li><a href="mailto:${esc(C.email)}">${esc(C.email)}</a> · ${esc(C.phone)} · <a href="${esc(C.developerHref)}" rel="noreferrer">aisolutions.peplogar.com</a></li></ul>
  <p>Usarla es gratis. No hay registro, ni publicidad, ni nada que comprar.</p>
  <h3 id="aviso-que">Qué es y qué no es</h3>
  <ul><li>Es una simulación con supuestos declarados. No es una previsión oficial, ni el cálculo de una pensión, ni un derecho reconocido.</li>
    <li>No es asesoramiento financiero ni de inversión. Las carteras con nombre («Suecia AP7», «cartera noruega»…) son supuestos de rentabilidad, no productos ni recomendaciones.</li>
    <li>No es un organismo público ni habla por ninguno. Usa datos de la Seguridad Social, el INE, la AEAT, el Banco de España, la AIReF, la Comisión Europea y otros, que no respaldan estos resultados. Los perfiles de «Supuestos de otros» son aproximaciones del simulador, no resultados de esas instituciones.</li>
    <li>Puede tener errores. Se ofrece como está, sin garantía. Si ves uno, escríbenos.</li></ul>
  <h3 id="aviso-datos">Tus datos</h3>
  <p>Lo que haces aquí se queda en tu navegador: el escenario, los escenarios guardados, tus límites y los resúmenes de Sensibilidad y Riesgo (en el almacenamiento local y en IndexedDB). No nos llegan y no podemos verlos.</p>
  <ul><li>Para borrarlo: «Volver a las reglas de hoy» quita tu escenario; borrar los datos del sitio en tu navegador lo quita todo.</li>
    <li>No hay cookies, ni analítica, ni contenido de terceros: la página no carga nada de fuera. Ese almacenamiento es el que pide tu propio trabajo, así que no hay aviso de cookies.</li>
    <li>Un enlace compartido lleva los ajustes del escenario detrás de «#», que no se envía al servidor. No lleva datos personales.</li></ul>
  <p>Si nos escribes, recibimos tu dirección de correo y lo que nos cuentes. Responsable: ${esc(C.company)}. Para qué: para contestarte y mejorar la aplicación. Base: tu propia petición. Plazo: el que haga falta para atender tu mensaje y mejorar la aplicación; después se borran. A quién se dan: a nadie. Puedes pedir ver, corregir o borrar tus datos, u oponerte a su uso, en <a href="mailto:${esc(C.email)}">${esc(C.email)}</a>, y reclamar ante la Agencia Española de Protección de Datos.</p>
  <p>El alojamiento: como cualquier web, el servidor anota la dirección IP y la página pedida, para funcionar y protegerse. Lo hace el proveedor del alojamiento, ${esc(C.hosting)}, por encargo nuestro y con sus propias condiciones.</p>
  <h3 id="aviso-licencias">Licencias y cómo citar</h3>
  <ul><li><strong>Textos, gráficos y resultados:</strong> <a href="${esc(C.contentLicenceHref)}" rel="noreferrer">${esc(C.contentLicence)}</a>. Puedes copiarlos, adaptarlos y usarlos, también con fines comerciales, si citas la obra, enlazas la licencia y dices qué has cambiado. Cita así: «${esc(ATTRIBUTION)}», con la versión y el enlace del escenario (la ficha da la cita completa).</li>
    <li><strong>Código:</strong> <a href="${esc(C.codeLicenceHref)}" rel="noreferrer">GNU AGPL-3.0</a> o posterior. Quien lo modifique y lo ofrezca, también por red, debe publicar su código con la misma licencia y conservar en su interfaz el crédito «${esc(C.project)} · ${esc(C.initiative)} · desarrollo ${esc(C.developer)}» (término adicional de la sección 7 b). Código fuente: <a href="${esc(C.sourceHref)}" rel="noreferrer">${esc(C.sourceHref.replace('https://', ''))}</a>.</li>
    <li><strong>Datos de terceros:</strong> no los cubren estas licencias. Se reutilizan en las condiciones de cada organismo, citados con su fuente y su fecha en «Fuentes de datos». Las cifras son elaboración propia a partir de ellos.</li>
    <li>La página no lleva bibliotecas de terceros, salvo un fragmento de Vite (licencia MIT) que carga los módulos.</li></ul>
  <h3 id="aviso-cambios">Cambios</h3>
  <p>Si este aviso cambia, cambia su fecha, arriba.</p>`,
  [{ id: 'aviso-quien', title: 'Quién responde' }, { id: 'aviso-que', title: 'Qué es y qué no' }, { id: 'aviso-datos', title: 'Tus datos' }, { id: 'aviso-licencias', title: 'Licencias y cita' }]);

document.querySelector('[data-mx-stamp]').textContent = `${stamp.app} · metodología ${stamp.methodology} · datos ${stamp.calibration}`;
document.querySelector('[data-mx-toc]').innerHTML = sections.map(s => `<a href="#${s.id}">${esc(s.title)}</a>${s.subs.map(x => `<a class="sub" href="#${esc(x.id)}">${esc(x.title)}</a>`).join('')}`).join('');
document.querySelector('[data-mx-body]').innerHTML = sections.map(s => `<h2 id="${s.id}">${esc(s.title)}</h2>${s.html}`).join('');
// The sections are drawn here, after the browser looked for the address's #: go to it now (e.g. the footer's #aviso).
if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
