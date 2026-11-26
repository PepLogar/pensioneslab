// The Consola's own tabs (phase 2, 20/11/2026): taxes on the rich and on companies, the State's budget items, the
// calendar of dated measures and your limits. Each one turns plain numbers into a patch of the scenario, with the same
// rules as the tools that already do it on other pages. Pure: no DOM, no storage.
import { DEFAULT_CONFIG, PENSION_SHARE_SCALE, BASE_YEAR, END_YEAR } from '../shared/default-config.js';
import { applyMeasures, pensionBudgetShareWith } from '../shared/scenario-measures.js';
import { buildSqueezeConfigPatch, DEFAULT_SQUEEZE_PARAMS, isSqueezeActive } from '../shared/wealth-corporate-squeeze.js';
import { BUDGET_DEPARTMENTS, normalizeDepartmentCuts, totalWeightedCutShare, inferDepartmentCutsFromAggregate } from '../budget-partitioner.js';
import { DEFAULT_FUNDED_SOVEREIGN_SHARE } from '../config-current-v9.js';
import { otherSpendingEligibleOf } from '../payment-spending-adjustment.js';
import { DEFAULT_LIMITS, pensionToWage } from '../sustainability.js';

// ── Ricos y empresas («¿Y si pagan los ricos y las empresas…?» of «¿Cuándo se rompe?») ──
// Shown as the person reads them: points, % and euros. `scale` turns the shown value into the tool's own.
export const SQUEEZE_FIELDS = Object.freeze([
  { key: 'irpfThreshold', label: 'Renta desde la que se es «rico» en el IRPF', type: 'choice', unit: '€ al año',
    options: [[600000, '600.000'], [150000, '150.000'], [60000, '60.000'], [30000, '30.000']],
    hint: 'La subida del IRPF de la fila de abajo grava solo la parte de la renta que pasa de esta cifra.' },
  { key: 'irpfExtraPoints', label: 'Subida del IRPF a ese grupo', min: 0, max: 25, step: 1, scale: 100, unit: 'ptos',
    hint: 'Puntos más de tipo marginal para las rentas altas. En el modo realista se pierde un 29 % por la fuga de base (Agrawal y Foremny).' },
  { key: 'wealthTaxMultiplier', label: 'Impuesto a grandes fortunas y patrimonio', min: 0, max: 200, step: 25, scale: 100, unit: '% más',
    hint: 'Cuánto sube lo que recaudan hoy, unos 2.250 M€. En el modo realista se pierde un 20 % por la fuga.' },
  { key: 'corporateSurcharge', label: 'Recargo en el Impuesto sobre Sociedades', min: 0, max: 60, step: 5, scale: 100, unit: '% más',
    hint: 'Recargo sobre lo que recauda hoy, unos 52.120 M€. En el modo realista, recauda menos cuanto más se acerca el tipo al de la fila de abajo.' },
  { key: 'corporatePeakRate', label: 'Tipo de Sociedades que más recauda', min: 25, max: 90, step: 1, scale: 100, unit: '%',
    hint: 'Supuesto del modo realista: por encima de este tipo, subir Sociedades recauda menos. 61 % por defecto (CRS; Kawano y Slemrod).' },
  { key: 'employerSSExtraPoints', label: 'Sobrecargo a la cotización de la empresa', min: 0, max: 6, step: 0.5, scale: 100, unit: 'ptos',
    hint: 'Puntos más de cotización que paga la empresa.' },
  { key: 'godModeTaxEnforcement', label: 'Fraude fiscal que aflora', min: 0, max: 100, step: 5, scale: 100, unit: '%',
    hint: 'Parte del fraude de IVA, IRPF y Sociedades que se recauda. Las cifras del fraude son fijas (Comisión Europea, Fedea): aquí se elige qué parte aflora.' },
  { key: 'godModeUndergroundLabor', label: 'Empleo sumergido que pasa a cotizar', min: 0, max: 100, step: 5, scale: 100, unit: '%',
    hint: 'Parte del empleo y las horas en negro que pasan a cotizar.' },
  { key: 'mode', label: 'Cómo responde la economía', type: 'choice', unit: '',
    options: [['realistic', 'Realismo (fugas y Laffer)'], ['static', 'El papel lo aguanta todo']],
    hint: '«Realismo» descuenta lo que se pierde porque se declara y se trabaja menos. «El papel lo aguanta todo» supone que nada cambia.' }
]);
export const SQUEEZE_DEFAULTS = DEFAULT_SQUEEZE_PARAMS;
const SQUEEZE_TAX_YEAR = 2027;

/**
 * The scenario after these taxes: the same patch as «¿Cuándo se rompe?», through the common rule of measures, with two
 * differences that keep the rest of the console: only the 2027 row of the tax calendar is replaced (the other rows stay),
 * and the growth paths are not touched when the patch leaves them at zero.
 */
export function squeezePatch(config, params) {
  const patch = { ...buildSqueezeConfigPatch({ ...DEFAULT_SQUEEZE_PARAMS, ...params }) };
  delete patch.pensionBudgetShare;
  for (const key of ['realWageGrowth', 'entrantGrowth', 'productivityGrowth', 'taxRevenueGDP', 'realReturn']) if (!patch[key]) delete patch[key];
  const others = (config.fiscalRescues ?? []).filter(r => r.year !== SQUEEZE_TAX_YEAR);
  patch.fiscalRescues = sortByYear([...(patch.fiscalRescues ?? []), ...others]);
  return applyMeasures(config, patch);
}

// What the squeeze writes, as its fingerprint in the scenario: the 2027 tax row and the four tax and contribution keys.
const SQUEEZE_FINGERPRINT = ['irpfSurcharge', 'vatSurcharge', 'otherTaxSurcharge', 'contributionRate'];
const sameValue = (a, b) => typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9
  : a && b && typeof a === 'object' && typeof b === 'object' ? [...new Set([...Object.keys(a), ...Object.keys(b)])].every(k => sameValue(a[k], b[k]))
    : (a ?? null) === (b ?? null);
const taxRowOf = config => (config.fiscalRescues ?? []).find(r => r.year === SQUEEZE_TAX_YEAR) ?? null;

/** Whether these measures, applied to the scenario, give back the scenario's own fields: then they are its measures. */
export function squeezeMatches(config, params) {
  const applied = squeezePatch(config, params);
  return sameValue(taxRowOf(applied), taxRowOf(config)) && SQUEEZE_FINGERPRINT.every(k => sameValue(applied[k], config[k]));
}

/**
 * The measures the tab shows for the open scenario: the stored ones only when they are really in it (a link, a file, undo
 * or «Reglas de hoy» do not carry the stored ones); otherwise the defaults (audit 1.85, 16).
 */
export function squeezeShownFor(config, stored) {
  const params = { ...SQUEEZE_DEFAULTS, ...(stored ?? {}) };
  return stored && squeezeMatches(config, params) ? params : { ...SQUEEZE_DEFAULTS };
}

/** Whether the shown measures raise anything: the tab's badge. */
export const squeezeIsOn = params => isSqueezeActive(params);

// ── Partidas del Estado («Recortar otros gastos públicos, partida a partida») ──
// Two bases for one cut (audit 1.85, 17): the items' shares are of all other spending; the engine's cut, the box
// «Recortar otros gastos públicos» and the Calendario are of the spending it can cut (src/payment-spending-adjustment.js).
export const RECORTABLE_TEXT = 'El gasto recortable es el resto del gasto público sin sueldos públicos ni programas cofinanciados. En 2027 es cerca del 60 % del resto del gasto.';
export const DEPARTMENTS = BUDGET_DEPARTMENTS.map(d => Object.freeze({ id: d.id, label: d.label, share: d.share, maxCut: d.maxCut }));
const CUT_YEAR = 2027;

/** How the cut of the items reaches the engine: the year 2027 of a run gives the spending it applies to. */
function budgetOf(point) {
  const before = point?.paymentSpendingAdjustment?.otherSpendingBeforeAdjustment ?? point?.otherPrimarySpending ?? 0;
  // Without a cut yet, the engine's own eligible spending of that year (not a fixed share of it).
  const eligible = point ? otherSpendingEligibleOf(point) : 0;
  const composition = point?.fiscalComposition ?? {};
  // Without the Recovery Plan grants and times the scale, as the engine reads the share (src/current-fiscal-v13.js, since 1.73).
  const allocatable = Math.max(0, (point?.generalTaxRevenue ?? 0) - (composition.imputedSocialContributions ?? 0) - (composition.mutuaContributions ?? 0) -
    (composition.temporaryMatchedRevenue ?? 0)) * PENSION_SHARE_SCALE;
  return { before, eligible, allocatable };
}

/** The 2027 cut of other spending in the scenario, as the engine reads it. */
export const engineOtherCut = config => (config.paymentAdjustments ?? []).find(p => p.year === CUT_YEAR)?.otherSpendingCut ?? 0;

/** The items' cuts that give the scenario's cut, when they are not known: shared out by each item's room. */
export function inferCuts(config, point) {
  const { before, eligible } = budgetOf(point);
  const ratio = eligible > 0 ? before / eligible : 1;
  return inferDepartmentCutsFromAggregate(engineOtherCut(config) / ratio);
}

/** The scenario after cutting the items: as the partitioner of «¿Cuándo se rompe?» writes it. */
export function departmentsPatch(config, point, cuts, routeToPensions = true) {
  const norm = normalizeDepartmentCuts(cuts);
  const weighted = totalWeightedCutShare(norm);
  const { before, eligible, allocatable } = budgetOf(point);
  const engineCut = Math.min(1, Math.max(0, weighted * (eligible > 0 ? before / eligible : 1)));
  const extraShare = allocatable > 0 ? before * weighted / allocatable : 0;
  const existing = (config.paymentAdjustments ?? []).find(p => p.year === CUT_YEAR);
  const publicPensionCut = existing?.publicPensionCut ?? 0;
  const others = (config.paymentAdjustments ?? []).filter(p => p.year !== CUT_YEAR);
  const paymentAdjustments = sortByYear(engineCut > 0.0001 || publicPensionCut > 0.0001
    ? [{ year: CUT_YEAR, publicPensionCut, otherSpendingCut: Number(engineCut.toFixed(6)) }, ...others] : others);
  const withTaxes = pensionBudgetShareWith(config);
  const pensionBudgetShare = routeToPensions ? Math.min(1, Math.max(DEFAULT_CONFIG.pensionBudgetShare, Number((withTaxes + extraShare).toFixed(6)))) : withTaxes;
  return { paymentAdjustments, pensionBudgetShare, weighted };
}

// ── Calendario: the three lists of dated measures, as tables ──
const pct = (key, label, max, step = 0.1) => ({ key, label, min: 0, max, step, scale: 100, unit: '%' });
export const CALENDAR = Object.freeze({
  fiscalRescues: { title: 'Impuestos', hint: 'Desde su año, el IVA y el IRPF de la fila valen hasta la fila siguiente. No se suman.',
    fields: [pct('vatGeneralRate', 'IVA general', 100), pct('vatReducedRate', 'IVA reducido', 100), pct('vatSuperReducedRate', 'IVA superreducido', 100),
      { key: 'irpfExtraPoints', label: 'IRPF adicional', min: 0, max: 30, step: 0.5, scale: 100, unit: 'ptos' },
      { key: 'irpfThreshold', label: 'Desde la renta', min: 0, max: 1000000, step: 1000, scale: 1, unit: '€' }],
    blank: { vatGeneralRate: 0.21, vatReducedRate: 0.10, vatSuperReducedRate: 0.04, irpfExtraPoints: 0, irpfThreshold: 30000 } },
  paymentAdjustments: { title: 'Recortes', hint: `Desde su año, el recorte de la fila vale hasta la fila siguiente. La fila de 2027 es también la de «Recortar otros gastos públicos» y la de Partidas. «Otros gastos» se mide sobre el gasto recortable, como esa casilla. ${RECORTABLE_TEXT}`,
    fields: [pct('publicPensionCut', 'Pensiones públicas', 100), { ...pct('otherSpendingCut', 'Otros gastos', 100), unit: '% recortable' }],
    blank: { publicPensionCut: 0, otherSpendingCut: 0 } },
  debtRestructurings: { title: 'Acuerdos de deuda', hint: 'Una quita y unas condiciones nuevas para la deuda viva, en ese año.',
    fields: [pct('haircut', 'Quita', 100, 1), { key: 'termYears', label: 'Plazo', min: 1, max: 50, step: 1, scale: 1, unit: 'años' },
      pct('nominalRate', 'Interés', 30), pct('fundedSovereignShare', 'Ahorro en deuda española', 100, 1), pct('creditorDiscountRate', 'Rendimiento exigido', 30)],
    blank: { haircut: 0, termYears: 10, nominalRate: 0.02, fundedSovereignShare: DEFAULT_FUNDED_SOVEREIGN_SHARE, creditorDiscountRate: 0.03 } }
});
export const CALENDAR_YEARS = Object.freeze([BASE_YEAR + 1, END_YEAR]);

const sortByYear = list => [...list].sort((a, b) => a.year - b.year);

/** A list with one row changed, added or removed: ordered by year, which must be unique and within 2027–2070. */
export function calendarPatch(config, listKey, { index = -1, field = null, value = null, add = false, remove = false } = {}) {
  const spec = CALENDAR[listKey];
  const list = (config[listKey] ?? []).map(row => ({ ...row }));
  if (add) {
    const taken = new Set(list.map(r => r.year));
    let year = Math.max(CALENDAR_YEARS[0], ...list.map(r => r.year + 1), 2030);
    while (taken.has(year) && year < CALENDAR_YEARS[1]) year++;
    if (taken.has(year) || year > CALENDAR_YEARS[1]) throw new RangeError('No queda ningún año libre entre 2027 y 2070.');
    list.push({ year, ...spec.blank });
  } else if (remove) {
    list.splice(index, 1);
  } else if (field === 'year') {
    const year = Math.round(value);
    if (year < CALENDAR_YEARS[0] || year > CALENDAR_YEARS[1]) throw new RangeError('El año tiene que estar entre 2027 y 2070.');
    if (list.some((r, i) => i !== index && r.year === year)) throw new RangeError(`Ya hay una fila en ${year}.`);
    list[index].year = year;
  } else {
    const f = spec.fields.find(x => x.key === field);
    list[index][field] = Number((value / f.scale).toFixed(8));
  }
  return { [listKey]: sortByYear(list) };
}

// ── Límites y mezcla ──
export const LIMIT_FIELDS = Object.freeze([
  { key: 'maxDebtGDP', label: 'Deuda pública máxima', min: 0, max: 500, step: 5, unit: '% PIB', hint: 'Tu alarma: el año en que la deuda pasa de aquí. No es un impago ni el veredicto.' },
  { key: 'maxPensionGapGDP', label: 'Lo que puede faltar para pensiones', min: 0, max: 30, step: 0.5, unit: '% PIB', hint: 'Tu alarma: el año en que lo que falta, después de cotizaciones e impuestos ya asignados, pasa de aquí.' },
  { key: 'minReplacementRate', label: 'Pensión media mínima', min: 0, max: 100, step: 1, unit: '% salario', hint: 'Tu alarma: el año en que la pensión media baja de este porcentaje del salario medio. Cuenta también el dividendo ciudadano, si el sistema lo paga: es la misma medida que la pensión suficiente.' }
]);
export { DEFAULT_LIMITS };

/** The first year the run leaves your limits, or null. */
export function firstOutsideYear(result, limits = DEFAULT_LIMITS) {
  const row = (result?.years ?? []).find(r => r.year > BASE_YEAR && (r.debtGDP > limits.maxDebtGDP || r.pensionGapGDP > limits.maxPensionGapGDP
    || (pensionToWage(r) ?? NaN) * 100 < limits.minReplacementRate));
  return row?.year ?? null;
}

export const MIX_FIELDS = Object.freeze([['payg', 'Reparto'], ['ndc', 'Cuentas nocionales'], ['funded', 'Capitalización']]);
/** The mix with one part set: the other two share what is left, in their proportion, so the three add up to 100 %. */
export function mixPatch(config, key, percentValue) {
  const value = Math.min(1, Math.max(0, percentValue / 100));
  const mix = { ...(config.mix ?? DEFAULT_CONFIG.mix) };
  const others = MIX_FIELDS.map(([k]) => k).filter(k => k !== key);
  const rest = others.reduce((s, k) => s + mix[k], 0);
  mix[key] = value;
  for (const k of others) mix[k] = rest > 0 ? (1 - value) * mix[k] / rest : (1 - value) / others.length;
  const total = Object.values(mix).reduce((s, v) => s + v, 0);
  for (const k of Object.keys(mix)) mix[k] = Number((mix[k] / total).toFixed(6));
  mix[others[1]] = Number((1 - mix[key] - mix[others[0]]).toFixed(6));
  return { mix };
}
