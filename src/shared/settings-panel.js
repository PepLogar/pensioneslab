// The controls of the settings catalogue (src/shared/settings-catalog.js): how each reads the
// configuration and the patch it writes, through the same rules as pensiones_lab_2 (system choice,
// budget measures, the workshop's levers). Pure: the console (src/pages/consola.js) draws them.
// Pensiones Lab 3 keeps only these definitions; the site's settings panel was left out (docs/DECISIONES.md).
import { DEFAULT_CONFIG } from './default-config.js';
import { FLAGSHIP_PROGRESSIVE, activeSystemKey, selectSystemPatch, originWithSystem } from './scenario-labels.js';
import { applyMeasures } from './scenario-measures.js';
import { num as formatNumber } from './number-format.js';
import { budgetShareSetApart } from './budget-share-rule.js';
import { closingClauseApplies, keepsCurrentLaw } from './closing-clause.js';
import { AGE_STEPS_OPTIONS } from './retirement-age-steps.js';
import { SETTINGS_CATALOG, SETTINGS_CHAPTERS } from './settings-catalog.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
// The shared formatter (B1): about 2,5 ms less per redraw, the «−» sign of DECISIONES-FORMATO-NUMEROS and «—» for a value that is not a number.
const num = (value, digits = 0) => formatNumber(Number(value), digits, { fixed: true });
const signedPoints = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${num(Math.abs(value), 2).replace(/,00$/, '').replace(/(,\d)0$/, '$1')} puntos`;
const decimals = step => (String(step).split('.')[1] ?? '').length;

// The same system the cards and ways mark (a Reparto with a leftover transition is Reparto).
const systemKey = activeSystemKey;

/** The controls with a rule of their own, by catalogue key: how each reads the configuration and the patch it writes. */
const CUSTOM_CONTROLS = Object.freeze({
  system: { type: 'choice',
    options: [['payg', 'Reparto (hoy)'], ['ndc', 'Cuentas nocionales'], ['progressive', 'Mixto progresivo'], ['mixedGradual', 'Mixto con ahorro propio'], ['retro1985', 'Experimento: Mixto progresivo desde 1985']],
    read: systemKey, write: (v, c) => selectSystemPatch(v, c, FLAGSHIP_PROGRESSIVE) },
  retirementAge: { type: 'range', min: 60, max: 72, step: 1,
    read: c => c.retirementAge, write: v => ({ retirementAge: v }), format: v => `${v} años` },
  // A higher age at once in 2027, or one more year every few (docs/PROPUESTA-CALENDARIO-EDAD-2026-11-11.md).
  retirementAgeStepYears: { type: 'choice', options: AGE_STEPS_OPTIONS,
    read: c => c.retirementAgeStepYears ?? 0, write: v => ({ retirementAgeStepYears: v }) },
  retirementAgeLink: { type: 'choice',
    options: [[0, 'No'], [1 / 3, 'Sube 1/3 de lo que sube la esperanza de vida'], [2 / 3, 'Sube 2/3 de lo que sube la esperanza de vida'], [1, 'Sube lo mismo que la esperanza de vida']],
    read: c => c.retirementAgeLink ?? 0, write: v => ({ retirementAgeLink: v }) },
  replacementRate: { type: 'range', min: 50, max: 90, step: 1,
    read: c => Math.round(c.replacementRate * 100), write: v => ({ replacementRate: v / 100 }), format: v => `${v} % del sueldo` },
  // Points under the CPI, whatever the inflation ('cpi-points', since 24/11/2026). An older scenario with a
  // fixed nominal rate ('manual') shows its gap to the scenario's inflation; changing the box moves it to points.
  pensionRevaluationRate: { type: 'range', min: -2, max: 0, step: 0.5,
    read: c => c.pensionRevaluationMode === 'cpi-points' ? Number((c.pensionRevaluationRate * 100).toFixed(1))
      : c.pensionRevaluationMode === 'manual' ? Number(((c.pensionRevaluationRate - (c.inflationRate ?? 0.02)) * 100).toFixed(1)) : 0,
    write: v => v === 0 ? { pensionRevaluationMode: 'cpi', pensionRevaluationRate: 0 } : { pensionRevaluationMode: 'cpi-points', pensionRevaluationRate: Number((v / 100).toFixed(5)) },
    format: v => v === 0 ? 'Con los precios (el IPC)' : (p => `${p} ${p === '1' ? 'punto' : 'puntos'} ${v > 0 ? 'más' : 'menos'} que los precios, cada año`)(num(Math.abs(v), 1).replace(/,0$/, '')) },
  contributionRate: { type: 'range', min: 0, max: 5, step: 0.5,
    read: c => Number(((c.contributionRate - DEFAULT_CONFIG.contributionRate) * 100).toFixed(2)),
    write: v => ({ contributionRate: v === 0 ? DEFAULT_CONFIG.contributionRate : Number((DEFAULT_CONFIG.contributionRate + v / 100).toFixed(6)) }),
    format: v => v === 0 ? 'Sin subir' : `${signedPoints(v)} de cotización`.replace(/^([+−]1) puntos/, '$1 punto') },
  irpfSurcharge: { type: 'range', min: 0, max: 30, step: 5, measure: true,
    read: c => Math.round((c.irpfSurcharge ?? 0) * 100), write: v => ({ irpfSurcharge: v / 100 }), format: v => v ? `+${v} % sobre lo que se paga hoy` : 'Sin recargo' },
  vatSurcharge: { type: 'range', min: 0, max: 20, step: 5, measure: true,
    read: c => Math.round((c.vatSurcharge ?? 0) * 100), write: v => ({ vatSurcharge: v / 100 }), format: v => v ? `+${v} % sobre lo que se paga hoy` : 'Sin recargo' },
  otherTaxSurcharge: { type: 'range', min: 0, max: 30, step: 5, measure: true,
    read: c => Math.round((c.otherTaxSurcharge ?? 0) * 100), write: v => ({ otherTaxSurcharge: v / 100 }), format: v => v ? `+${v} % sobre lo que se paga hoy` : 'Sin recargo' },
  // The workshop's lever (GUIDE_LEVER_PATCHES.otherCut): one cut of the other spending from 2027.
  // Any other plan of payments (a crisis plan of the Laboratorio) reads as −1: out of this range.
  paymentAdjustments: { type: 'range', min: 0, max: 10, step: 1,
    read: c => {
      const list = Array.isArray(c.paymentAdjustments) ? c.paymentAdjustments : [];
      if (!list.length) return 0;
      return list.length === 1 && list[0].year === 2027 && !list[0].publicPensionCut ? Number((list[0].otherSpendingCut * 100).toFixed(1)) : -1;
    },
    write: v => ({ paymentAdjustments: v > 0 ? [{ year: 2027, publicPensionCut: 0, otherSpendingCut: v / 100 }] : [] }),
    format: v => v < 0 ? 'Un plan propio' : v === 0 ? 'Sin recorte' : `−${num(v, 1).replace(/,0$/, '')} % desde 2027` },
  // As the Laboratorio's box: today's law turns the clause on or off; another system replaces
  // that law, and the box applies the clause there too, keeping how it is read.
  closingClause: { type: 'toggle', read: closingClauseApplies,
    write: (v, c) => {
      const reading = (c.closingClause ?? 'off') === 'off' ? DEFAULT_CONFIG.closingClause : c.closingClause;
      if (keepsCurrentLaw(c)) return { closingClause: v ? reading : 'off' };
      return v ? { closingClause: reading, closingClauseAnySystem: 1 } : { closingClauseAnySystem: 0 };
    } },
  targetFertility: { type: 'choice',
    options: [[0, 'Referencia oficial (EUROPOP)'], [1, '1,0'], [1.2, '1,2'], [1.4, '1,4'], [1.6, '1,6'], [1.8, '1,8'], [2.1, '2,1']],
    read: c => c.targetFertility ?? 0, write: v => ({ targetFertility: v }) },
  entrantGrowth: { type: 'range', min: -0.5, max: 1, step: 0.25,
    read: c => Number(((c.entrantGrowth ?? 0) * 100).toFixed(2)), write: v => ({ entrantGrowth: v / 100 }),
    format: v => v ? `${v > 0 ? '+' : '−'}${num(Math.abs(v), 2)} % al año` : 'Referencia' },
  productivityGrowth: { type: 'range', min: -1, max: 1, step: 0.05,
    read: c => Number(((c.productivityGrowth ?? 0) * 100).toFixed(2)), write: v => ({ productivityGrowth: v / 100, realWageGrowth: v / 100 }),
    format: v => v ? `${v > 0 ? '+' : '−'}${num(Math.abs(v), 2)} puntos al año` : 'Referencia' },
  longevityGain: { type: 'range', min: 0, max: 0.8, step: 0.1,
    read: c => Number((c.longevityGain ?? 0).toFixed(2)), write: v => ({ longevityGain: Number(v.toFixed(2)) }),
    format: v => v ? `+${num(v * 100)} % de mejora` : 'Referencia' },
  realReturn: { type: 'range', min: 0, max: 6, step: 0.5,
    read: c => Number(((c.realReturn ?? 0) * 100).toFixed(2)), write: v => ({ realReturn: v / 100 }), format: v => `${num(v, 1)} % al año` },
  aiAutomationShare: { type: 'range', min: 0, max: 50, step: 5,
    read: c => Math.round((c.aiAutomationShare ?? 0) * 100), write: v => ({ aiAutomationShare: v / 100 }), format: v => v ? `${v} % de las horas` : 'Nada' },
  ageingCareSpending: { type: 'toggle',
    read: c => (c.ageingCareSpending ?? 1) > 0, write: v => ({ ageingCareSpending: v ? 1 : 0 }) }
});

/** A catalogue entry with a range or a switch, as a control: the stored value is the shown one over `scale`. */
function genericControl(entry) {
  if (entry.flag) return { type: 'toggle', read: c => Number(c[entry.key]) > 0, write: v => ({ [entry.key]: v ? 1 : 0 }) };
  const [min, max, step] = entry.range;
  const digits = decimals(step);
  const read = c => Number((Number(c[entry.key]) * entry.scale).toFixed(6));
  // Today's value comes back as it is stored, not as read with six decimals: moved and set back, the scenario
  // keeps its simulation key (docs/REVISION-LABORATORIO-TRES-VISTAS-2026-11-16.md, A11).
  const today = DEFAULT_CONFIG[entry.key];
  const isToday = v => typeof today === 'number' && Math.abs(v - read(DEFAULT_CONFIG)) < 1e-9;
  return { type: 'range', min, max, step, read,
    write: v => ({ [entry.key]: isToday(v) ? today : Number((v / entry.scale).toFixed(10)) }),
    format: v => `${num(v, digits)}${entry.unit ? ` ${entry.unit}` : ''}` };
}

/** Every setting the panel can move: its catalogue entry (key, name, chapter, level) and its control. */
export const SETTINGS_CONTROLS = Object.freeze(SETTINGS_CATALOG.filter(entry => entry.custom || entry.range || entry.flag).map(entry => {
  const control = entry.custom ? CUSTOM_CONTROLS[entry.key] : genericControl(entry);
  if (!control) throw new Error(`Sin control para ${entry.key}`);
  return Object.freeze({ key: entry.key, label: entry.name, chapter: entry.chapter, level: entry.level, help: entry.help ?? null, ...control });
}));
const CONTROLS = new Map(SETTINGS_CONTROLS.map(control => [control.key, control]));

/** The configuration patch of one control set to `value` (already parsed). */
export function settingsPatch(key, value, config) {
  const control = CONTROLS.get(key);
  if (!control) throw new RangeError(`Ajuste desconocido: ${key}`);
  const patch = control.write(value, config);
  return control.measure ? applyMeasures(config, patch) : patch;
}

const same = (a, b) => typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : JSON.stringify(a) === JSON.stringify(b);

/**
 * Whether the reader has moved a setting: against the rules of today with the chosen system in
 * its standard form, so that choosing «Mixto progresivo» is one change, not its ten keys.
 */
export function settingChanged(entry, config, baseline = originWithSystem(config, DEFAULT_CONFIG)) {
  if (entry.key === 'system') return systemKey(config) !== systemKey(DEFAULT_CONFIG);
  // The tax surcharges move this share by the budget rule: only a share set apart from it counts.
  if (entry.key === 'pensionBudgetShare') return budgetShareSetApart(config, DEFAULT_CONFIG);
  // «Productividad y salarios» moves both: wages count only when set apart from productivity.
  if (entry.key === 'realWageGrowth') return !same(config.realWageGrowth, baseline.realWageGrowth) && !same(config.realWageGrowth, config.productivityGrowth);
  return [entry.key, ...(entry.also ?? [])].some(key => !same(config[key], baseline[key]));
}

/** Per chapter: how many settings, how many in sight without Modo experto and how many changed. */
export function chapterSummary(config) {
  const baseline = originWithSystem(config, DEFAULT_CONFIG);
  return SETTINGS_CHAPTERS.map(chapter => {
    const entries = SETTINGS_CATALOG.filter(entry => entry.chapter === chapter.id);
    return { id: chapter.id, total: entries.length, basic: entries.filter(e => e.level === 'basic').length,
      changed: entries.filter(entry => settingChanged(entry, config, baseline)).length };
  });
}

/** Whether an option of a choice is the stored value: numbers within 1e-6, anything else equal. */
export const choiceMatches = (option, value) => option === value || Math.abs(Number(option) - Number(value)) < 1e-6;

/**
 * The options of a choice. A stored value that is none of them (a fertility of 1,5 set in another page) comes
 * first, selected, as «Otro valor (1,5)»: the control does not show another value as the scenario's
 * (docs/REVISION-LABORATORIO-TRES-VISTAS-2026-11-16.md, A12). Choosing it changes nothing (its value is empty).
 */
export function choiceOptionsHtml(options, value) {
  const matched = options.some(([v]) => choiceMatches(v, value));
  const shown = typeof value === 'number' ? value.toLocaleString('es-ES', { maximumFractionDigits: 4 }) : String(value ?? '');
  const other = matched ? '' : `<option value="" selected>Otro valor (${esc(shown)})</option>`;
  return other + options.map(([v, label]) => `<option value="${v}"${matched && choiceMatches(v, value) ? ' selected' : ''}>${esc(label)}</option>`).join('');
}
