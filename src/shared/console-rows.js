// The rows of the console's settings table: every setting of the catalogue, in its chapter, with its control
// (or its fixed value), its unit and its help. Shared by the console (src/pages/consola.js) and the
// methodology page (src/pages/metodologia.js), so both show the same values. No DOM.
import { SETTINGS_CATALOG } from './settings-catalog.js';
import { SETTINGS_CONTROLS, choiceMatches, settingChanged } from './settings-panel.js';
import { shortHints, primary, revaluation, advanced, limitDefs, fiscalMeasures } from './lab-controls.js';
import { CAPITALIZATION_STYLE_META, AUTOMATION_REGIME_META, TRANSITION_PUBLIC_PILLARS } from '../progressive-transition.js';
import { num } from './number-format.js';
import { RECORTABLE_TEXT } from '../domain/consola-measures.js';
import { settingActsOn, otherSystemsNote, otherSystemsTitle } from './setting-systems.js';
import { activeSystemKey, scenarioSystemName } from './scenario-labels.js';
import { settingWaits, waitingNote, waitingTitle } from './setting-needs.js';

export const CATALOG = new Map(SETTINGS_CATALOG.map(entry => [entry.key, entry]));

// La ayuda de cada ajuste: la del catálogo (SETTING_HELP), y después la del Laboratorio y la nota, sin repetir.
export const HINTS = new Map();
for (const d of [...primary, ...revaluation, ...advanced, ...limitDefs, ...fiscalMeasures]) if (d.hint) HINTS.set(d.key, d.hint);
export const hintOf = key => [...new Set([CATALOG.get(key)?.help, shortHints[key], HINTS.get(key) ?? CATALOG.get(key)?.note].filter(Boolean))].join(' ');

// La unidad junto a la casilla, para los controles con regla propia (los demás llevan la del catálogo).
export const CUSTOM_UNITS = {
  retirementAge: 'años', replacementRate: '% sueldo', pensionRevaluationRate: 'puntos frente a los precios', contributionRate: 'puntos de cotización',
  irpfSurcharge: '% sobre lo de hoy', vatSurcharge: '% sobre lo de hoy', otherTaxSurcharge: '% sobre lo de hoy', paymentAdjustments: '% del gasto recortable',
  entrantGrowth: '% al año', productivityGrowth: 'ptos al año', longevityGain: 'años/año', realReturn: '% al año', aiAutomationShare: '% horas'
};

// Ajustes sin control en el catálogo del panel: aquí tienen casilla.
const pctControl = (key, min, max, step) => ({ type: 'range', min, max, step, unit: '%',
  read: c => Number(((c[key] ?? 0) * 100).toFixed(4)), write: v => ({ [key]: Number((v / 100).toFixed(8)) }) });
const intControl = (key, min, max, unit) => ({ type: 'range', min, max, step: 1, unit, read: c => c[key] ?? 0, write: v => ({ [key]: Math.round(v) }) });
const REGIME_LABEL = key => (AUTOMATION_REGIME_META[key]?.shortLabel ?? key).replace(/^\d+ · /, '');
const PILLAR_LABEL = { 'system-default': 'La del sistema', 'ndc-bridge': 'Puente nocional', 'payg-bridge': 'Puente de reparto', 'custom-split': 'Reparto a medida' };
export const EXTRA_CONTROLS = {
  transitionMode: { type: 'choice', options: [['none', 'Ninguno'], ['cohort-ramp', 'Edad + rampa'], ['two-stage-relay', 'Doble relevo'], ['pension-runoff', 'Según fallecen los pensionistas'],
    ['salary-cap-shield', 'Suelo solidario + techo capitalizado'], ['baby-boom-shield', 'Escudo del Baby Boom'], ['entrants-only', 'Solo generaciones nuevas'], ['linear-ramp', 'Rampa anual']],
    read: c => c.transitionMode, write: v => ({ transitionMode: v }),
    hint: 'Cómo pasa la cotización al fondo en el Mixto progresivo, el Mixto con ahorro propio y el experimento desde 1985. En Reparto y en Cuentas nocionales no lleva nada al fondo. Pero en Reparto, cualquier forma que no sea «Ninguno» deja la ley de hoy. Entonces el freno de 2023 deja de actuar, salvo que lo vuelvas a encender.' },
  transitionCutoffAge: { ...intControl('transitionCutoffAge', 30, 62, 'años'), hint: 'Quien tenga menos de esta edad en 2027 lleva al fondo la parte completa. Los mayores llevan una parte menor. No cuenta con la forma «Rampa anual», la del Mixto con ahorro propio.' },
  transitionYears: { ...intControl('transitionYears', 5, 41, 'años'), hint: 'Años hasta llegar a la parte de la cuota que acaba en el fondo. No cuenta con «Según fallecen los pensionistas», la forma del Mixto progresivo. Tampoco con «Solo generaciones nuevas».' },
  transitionTargetFunded: { ...pctControl('transitionTargetFunded', 20, 100, 1), hint: 'Parte de la cotización de jubilación que acaba en el fondo al final del cambio.' },
  transitionNdcShare: { ...pctControl('transitionNdcShare', 0, 100, 5), hint: 'De lo que no va al fondo, la parte que se anota en cuentas nocionales; el resto sigue en reparto. Solo cuenta con la parte pública «Puente nocional» o «Reparto a medida». Con el «Doble relevo», solo cuenta por encima del 85 %.' },
  transitionPublicPillar: { type: 'choice', options: TRANSITION_PUBLIC_PILLARS.map(k => [k, PILLAR_LABEL[k] ?? k]),
    read: c => c.transitionPublicPillar, write: v => ({ transitionPublicPillar: v }),
    hint: 'Qué paga las pensiones públicas mientras dura el cambio a un fondo. «Puente de reparto»: todo en reparto. «La del sistema»: reparto y nocionales como en la mezcla. «Puente nocional» y «Reparto a medida» hacen la misma cuenta. En los dos, la parte nocional la fija «Cambio a un fondo: parte pública nocional o de reparto».' },
  transitionRelaySchedule: { type: 'choice', options: [['announced', 'El anunciado'], ['legacy-extended', 'El anterior a la 1.21']],
    read: c => c.transitionRelaySchedule, write: v => ({ transitionRelaySchedule: v }),
    hint: 'Calendario del doble relevo. «El anunciado» llega a la meta justo en los años elegidos; el anterior solo sirve para escenarios guardados antes de la 1.21.' },
  capitalizationStyle: { type: 'choice', options: Object.entries(CAPITALIZATION_STYLE_META).map(([k, m]) => [k, m.shortLabel.replace(/^⚠️ /, '')]),
    read: c => c.capitalizationStyle, write: v => ({ capitalizationStyle: v }), hint: 'Dónde se invierte el fondo. Cambia la rentabilidad y quién se queda el capital.' },
  retirementAgeCap: { type: 'range', min: 0, max: 80, step: 1, unit: 'años', read: c => c.retirementAgeCap ?? 0, write: v => ({ retirementAgeCap: Math.round(v) }),
    hint: 'Edad máxima a la que puede llegar la edad ligada a la esperanza de vida. 0 = sin tope.' },
  riskModel: { type: 'choice', options: [['european-linear', 'Europea lineal'], ['legacy-quadratic', 'Cuadrática anterior']],
    read: c => c.riskModel, write: v => ({ riskModel: v }), hint: 'Cómo sube el interés de la deuda cuando la deuda pasa de su referencia.' },
  automationRegime: { type: 'choice', options: ['status-quo-payroll', 'robot-tax-payg', 'capital-boom-dividend', 'demarquia-funcionarios-primero', 'demarquia-planetaria-au50'].map(k => [k, REGIME_LABEL(k)]),
    read: c => c.automationRegime, write: v => ({ automationRegime: v }), hint: 'Quién paga y de quién es lo que producen las máquinas. Los dos regímenes de Demarquía cuentan aunque la IA y los robots no hagan trabajo: automatizan buena parte de la Administración. «Gravar la producción automatizada» solo cuenta si alguien no se recoloca o si sube la productividad.' },
  automationRedeployment: { ...pctControl('automationRedeployment', 0, 100, 5), hint: 'De quienes pierden el trabajo por la automatización, la parte que encuentra otro empleo.' },
  automationProductivityGain: { ...pctControl('automationProductivityGain', 0, 50, 1), hint: 'Cuánto sube la producción por hora gracias a la automatización.' },
  publicAdminAutomationShare: { ...pctControl('publicAdminAutomationShare', 0, 95, 5), hint: 'Parte del trabajo de la Administración que hacen la IA y los robots. Con «Automatizar primero el Estado», solo cuenta por encima del 65 %. Con «Demarquía Planetaria», por encima del 85 %.' },
  lafferExemptContribution: { type: 'range', min: 0, max: 10, step: 0.1, unit: 'ptos', read: c => Number(((c.lafferExemptContribution ?? 0) * 100).toFixed(3)),
    write: v => ({ lafferExemptContribution: Number((v / 100).toFixed(6)) }), hint: 'Puntos de cotización que no restan horas: los del empleo sumergido que aflora.' }
};

// Dónde se cambian los ajustes del catálogo que no tienen casilla propia.
export const ELSEWHERE = { mix: 'Se cambia en la pestaña «Límites y mezcla».', fiscalRescues: 'Se cambia en la pestaña «Calendario».', debtRestructurings: 'Se cambia en la pestaña «Calendario».' };

// The base of a percentage, when another control shows the same quantity on another base (audit 1.85, 17).
const BASE_NOTES = { paymentAdjustments: `El porcentaje es del gasto recortable. ${RECORTABLE_TEXT} Por eso la pestaña «Partidas del Estado» da una cifra menor para el mismo recorte.` };

// Cada fila, por capítulo y en el orden del catálogo: un control, o un valor fijo tal como es.
export const PANEL = new Map(SETTINGS_CONTROLS.map(c => [c.key, c]));
export const ROWS = SETTINGS_CATALOG.map(entry => {
  const panel = PANEL.get(entry.key);
  const extra = EXTRA_CONTROLS[entry.key];
  if (panel) return { entry, control: panel, unit: CUSTOM_UNITS[entry.key] ?? (entry.custom ? '' : entry.unit ?? ''), hint: [hintOf(entry.key), BASE_NOTES[entry.key]].filter(Boolean).join(' ') };
  if (extra) return { entry, control: extra, unit: extra.unit ?? '', hint: [CATALOG.get(entry.key)?.help, extra.hint].filter(Boolean).join(' ') };
  return { entry, control: null, unit: '', hint: [hintOf(entry.key), entry.fixed ? 'Dato de partida: no se cambia.' : ELSEWHERE[entry.key] ?? ''].filter(Boolean).join(' ') };
});

// A row the reader moved: every row against today's rules with the chosen system in its standard form
// (originWithSystem), so choosing «Mixto progresivo» is one change, not its transition keys too (audit 1.85, 18).
export const rowChanged = (row, config, baseline) => Boolean(row.control) && settingChanged(row.entry, config, baseline);

// The rows of a view in three groups, in the catalogue's order (1.87, docs/DECISIONES.md, 26/11/2026): those that act,
// those of other systems and those that wait for a decision. The console shows the first and folds the other two;
// nothing is lost (the three add up to the rows given) and every value is kept, folded or not.
export function splitRows(rows, config, result = null) {
  const acting = [], otherSystems = [], waiting = [];
  for (const row of rows) {
    if (!settingActsOn(row.entry.key, config)) otherSystems.push(row);
    else if (settingWaits(row.entry.key, config, result)) waiting.push(row);
    else acting.push(row);
  }
  return { acting, otherSystems, waiting };
}

// In Reparto and Nocionales the fund's fee and where it invests also act with an extra contribution (setting-systems.js).
const EXTRA_CONTRIBUTION_KEYS = ['feeRate', 'capitalizationStyle'];
const extraContributionNote = (rows, config) => ['payg', 'ndc'].includes(activeSystemKey(config)) && rows.some(r => EXTRA_CONTRIBUTION_KEYS.includes(r.entry.key))
  ? ' La comisión y dónde se invierte el fondo vuelven también con una cotización adicional a una cuenta propia.' : '';

// Each fold: its title, with the changed rows it hides, and the line that says why they are there.
export const FOLDS = Object.freeze([
  { kind: 'otherSystems', title: n => otherSystemsTitle(n), note: (rows, config) => otherSystemsNote(config) + extraContributionNote(rows, config) },
  { kind: 'waiting', title: n => waitingTitle(n), note: (rows, config, result) => waitingNote(rows.map(r => r.entry.key), config, result) }
]);
export const foldTitle = (fold, count, changed) => changed
  ? fold.title(count).replace(/\)$/, ` · ${changed} cambiado${changed === 1 ? '' : 's'})`) : fold.title(count);

// What the verdict says while a scenario is calculated (1.87.1): the charts and the table are still the previous
// scenario's, and it names its system so that no figure is read as the new one's. `before` is null on the first run.
const systemWords = config => `«${scenarioSystemName(config).replace(/^[^\p{L}]+/u, '')}»`;
export function calculatingText(config, before = null) {
  const now = systemWords(config);
  if (!before) return { headline: `Calculando ${now}…`, detail: '', legend: '' };
  const then = systemWords(before);
  return { headline: `Calculando ${now}…`, detail: `Hasta que termine, los gráficos y la tabla son ${then === now ? 'del escenario anterior' : `aún de ${then}`}.`,
    // The legend under the charts says «este escenario» of the solid line: until the new one arrives, it is the previous one.
    legend: `Continua: el escenario anterior${then === now ? '' : `, ${then}`}. Discontinua: reglas de hoy.` };
}

export const decimals = step => { const s = String(step ?? 1); return s.includes('.') ? s.split('.')[1].length : 0; };
export const shown = (row, config) => {
  if (!row.control) return '';
  const v = row.control.read(config);
  if (row.control.type === 'toggle') return v ? 'Sí' : 'No';
  if (row.control.type === 'choice') return row.control.options.find(([value]) => choiceMatches(value, v))?.[1] ?? String(v);
  return num(v, decimals(row.control.step));
};
// The parts of the mix by their names in the console, never the engine's keys.
const PART_NAMES = { payg: 'Reparto', ndc: 'Nocionales', funded: 'Fondo' };
export const fixedText = (entry, config) => {
  const v = config[entry.key];
  if (Array.isArray(v)) return v.length ? `${v.length} medida${v.length === 1 ? '' : 's'}` : 'Ninguna';
  if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => `${PART_NAMES[k] ?? k} ${num(x * 100)} %`).join(' · ');
  return typeof v === 'number' ? num(v * (entry.key === 'initialDebtGDP' ? 100 : 1), 1) + (entry.key === 'initialDebtGDP' ? ' % PIB' : '') : String(v);
};

