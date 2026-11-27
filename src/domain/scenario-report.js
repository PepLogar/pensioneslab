// «Informe» (informe.html): the scenario open in the console, as a document to print or save as PDF (1.89; reworked
// in 1.90 after docs/AUDITORIA-INFORME-1.89-2026-11-27.md). Only that scenario: other systems with the same settings
// are not in it, because the settings are tuned for this one and the others would only add noise (the author,
// 27/11/2026). It leads with whether the system holds, why, and who pays. Pure: no DOM; the page draws it.
import { BASE_YEAR, END_YEAR, DEFAULT_CONFIG } from '../shared/default-config.js';
import { SETTINGS_CHAPTERS } from '../shared/settings-catalog.js';
import { ROWS, rowChanged, shown, decimals, fixedText } from '../shared/console-rows.js';
import { choiceMatches } from '../shared/settings-panel.js';
import { settingActsOn } from '../shared/setting-systems.js';
import { settingWaits } from '../shared/setting-needs.js';
import { activeSystemKey, originWithSystem, scenarioSystemName } from '../shared/scenario-labels.js';
import { computeVerdict } from './verdict.js';
import { sustainabilityLight } from './sustainability-light.js';
import { riskPathOf, firingDescriptions, decidingIndicators, riskVariable } from '../views/risk-strip.js';
import { payablePensionAnnual, PAYABLE_PENSION_DEFAULTS } from '../shared/payable-pension.js';
import { SYSTEM_ASSUMPTIONS } from './system-assumptions.js';
import { ASSUMPTIONS, ASSUMPTION_KINDS } from './assumptions-catalog.js';
import { CALENDAR, LIMIT_FIELDS, DEFAULT_LIMITS, firstOutsideYear } from './consola-measures.js';
import { closingClauseApplies } from '../shared/closing-clause.js';
import { num } from '../shared/number-format.js';

const at = (result, year) => result?.years?.find(r => r.year === year) ?? null;
const stationAt = (verdict, year) => verdict?.journey?.stations?.find(s => s.year === year) ?? null;
const pctText = (v, d = 1, tail = '') => Number.isFinite(v) ? `${num(v, d)} %${tail}` : '—';
const inYears = y => Number.isInteger(y) && y >= BASE_YEAR && y <= END_YEAR;

/** The years of the tables: every ten years, the consulted year, and the years of the break, the rescue and the haircut. */
export function reportYears(selectedYear, ...events) {
  const years = new Set([BASE_YEAR, 2030, 2040, 2050, 2060, END_YEAR]);
  for (const y of [selectedYear, ...events]) if (inYears(y)) years.add(y);
  return [...years].sort((a, b) => a - b);
}

/** The charts, as series of the CSV (src/domain/series-dictionary.js): sustainability first; the fund only when there is one. */
// Since 1.91 the break is drawn where it happens (the author, 27/11/2026: «es curioso que se rompa todo en 2050»):
// the red line only on the debt and on the chart that decides the break, which carries its threshold. A debt break
// is decided by the indicators of the risk index that cross their threshold in the break year (the index goes by
// steps); a pension break, by the average pension against its floor.
export function reportCharts(result, { breakYear = null, failure = null, path = [], floor = 40 } = {}) {
  const pensionBreak = breakYear != null && failure === 'pension';
  const charts = [
    { id: 'debt', title: 'Deuda pública', variables: ['deuda_pct_pib'], mark: breakYear != null && !pensionBreak },
    ...decidingCharts(breakYear, failure, path),
    { id: 'gap', title: 'Lo que falta para pensiones y cotización que va al fondo', variables: ['falta_pensiones_pct_pib', 'coste_transicion_pct_pib'] },
    { id: 'ratio', title: 'Pensión media frente al salario medio', variables: ['pension_sobre_salario'], mark: pensionBreak, deciding: pensionBreak,
      threshold: pensionBreak ? { value: floor, label: `mínimo de suficiencia (${num(floor)} %)` } : null },
    { id: 'spending', title: 'Gasto público en pensiones', variables: ['gasto_pensiones_publicas_pct_pib'] }
  ];
  if ((result?.years ?? []).some(y => y.fundedAssetsGDP > 0)) charts.push({ id: 'fund', title: 'Fondos de capitalización', variables: ['fondos_pct_pib'] });
  return charts;
}

function decidingCharts(breakYear, failure, path) {
  if (breakYear == null || failure !== 'debt') return [];
  return decidingIndicators(breakYear, path).map(id => {
    const v = riskVariable(id);
    if (!v) return null;
    return { id: `risk-${id}`, title: v.label, axis: v.unit, mark: true, deciding: true,
      points: path.filter(p => p.year >= BASE_YEAR && p.year <= END_YEAR).map(p => [p.year, Number.isFinite(p.vars?.[id]) ? p.vars[id] : null]),
      threshold: { value: v.threshold, label: `${v.risky === 'above' ? 'umbral' : 'mínimo'} de la Comisión (${num(v.threshold, 2)})` } };
  }).filter(Boolean);
}

// A value as the console shows it: in words when the control says so (a plan of cuts reads «Un plan propio»), a
// stored value that no option holds as «Otro valor (…)», and numbers with the decimals they carry.
function valueText(row, config) {
  const c = row.control;
  if (!c) return { value: fixedText(row.entry, config), unit: '' };
  const v = c.read(config);
  if (c.format) return { value: c.format(v), unit: '' };
  if (c.type === 'choice' && !c.options.some(([value]) => choiceMatches(value, v))) return { value: `Otro valor (${typeof v === 'number' ? num(v, 2) : String(v ?? '')})`, unit: '' };
  if (c.type === 'range') return { value: num(v, Math.max(decimals(c.step), Number.isInteger(v) ? 0 : 2)), unit: row.unit };
  return { value: shown(row, config), unit: row.unit };
}

// The mix has no box in the chapters (it is set in «Límites y mezcla»): it is compared here, part by part.
const MIX_PARTS = [['payg', 'Reparto'], ['ndc', 'Nocionales'], ['funded', 'Fondo']];
const mixText = mix => MIX_PARTS.map(([k, label]) => `${label} ${num((mix?.[k] ?? 0) * 100)} %`).join(' · ');

// The years in which a dated measure starts, with its fields as a table row.
const calendarTable = (spec, list) => ({
  columns: ['Año', ...spec.fields.map(f => f.unit ? `${f.label} (${f.unit.trim()})` : f.label)],
  rows: list.map(row => [String(row.year), ...spec.fields.map(f => num((row[f.key] ?? 0) * (f.scale ?? 1), 2))])
});

// The system card speaks of this system only: sentences that compare with other systems are left out.
const dropOthers = text => String(text ?? '').split(/(?<=\.)\s+/).filter(t => !/referencia del laboratorio|Todos los sistemas/.test(t)).join(' ');

// The starting assumptions of this scenario, with its own values (not the defaults, and not other systems).
function scenarioAssumptions(config, verdict, system, hasFund) {
  const p = (v, d = 1) => `${num(v * 100, d)} %`;
  const retro = system === 'retro1985';
  const list = [
    { title: 'El punto de partida', text: retro ? 'Este experimento empieza en 1985 y llega a 2026 por su propio camino, con supuestos históricos: no parte de la España real de 2026.'
      : 'España en 2026: población, empleo, salarios, pensiones, impuestos y deuda de los datos oficiales.' },
    { title: 'Lo ganado se respeta', text: retro ? 'El cambio de sistema empieza en 1985.'
      : `Las pensiones de hoy y los derechos ganados hasta 2026 se pagan con las reglas de hoy. El sistema solo cambia lo que se cotiza desde 2027.${Number(config.ndcPastRights) === 1 && system === 'ndc' ? ' Aquí, además, lo ganado hasta 2026 pasa a la cuenta nocional.' : ''}` },
    { title: 'La cotización', text: `Para pensiones se cotiza el ${p(config.contributionRate, 2)} de los salarios. Cada euro cotizado va a un solo sitio: no puede pagar a la vez las pensiones de hoy y llenar un fondo. Si una parte deja de pagarlas, lo que falta lo ponen los impuestos y la deuda.` },
    { title: 'La edad', text: retro ? 'Todos se jubilan a la edad fijada: este experimento no sigue la senda de edad del Ageing Report.'
      : Number(config.retirementAgeExitPath) === 1 ? 'La gente se jubila cada vez más tarde, como prevén el Ageing Report y la AIReF.' : 'La edad a la que se jubila la gente no cambia con los años: la senda del Ageing Report está apagada.' },
    { title: 'El mundo', text: `Población de ${Number(config.europop2023) === 1 ? 'EUROPOP2023, la del Ageing Report' : 'EUROPOP2025'}. ${!retro && Number(config.airefShortRunEmployment) === 1 ? 'Empleo e inflación de la AIReF hasta 2030; después, i' : 'I'}nflación del ${p(config.inflationRate)} al año.` }
  ];
  if (hasFund) list.push({ title: 'Los mercados', text: `El fondo rinde un ${p(config.realReturn)} real al año, con una comisión del ${p(config.feeRate, 2)}, salvo lo que cambie dónde se invierte. Sin caída del mercado${config.marketShock ? ' salvo la que fijas' : ''}.` });
  const clauseYear = verdict?.journey?.closingClauseYear ?? null;
  list.push({ title: 'El freno de 2023', text: closingClauseApplies(config)
    ? `Está encendido: sube el MEI si el gasto neto en pensiones pasa del 13,3 % del PIB. ${clauseYear ? `Salta en ${clauseYear}.` : 'En este escenario no llega a saltar.'}`
    : 'Está apagado en este escenario.' });
  return list;
}

const LIMIT_BY_BREACH = { debt: 'maxDebtGDP', pensionGap: 'maxPensionGapGDP', adequacy: 'minReplacementRate' };

/**
 * @param {{ config: object, limits?: object, selectedYear?: number }} state  the console's scenario
 * @param {object} result  its run (simulate)
 * @param {{ name?: string|null, link?: string|null }} [options]  its saved name, and the link that reopens it
 */
export function buildScenarioReport(state, result, { name = null, link = null } = {}) {
  const config = state.config;
  const limits = state.limits ?? DEFAULT_LIMITS;
  const ownLimits = LIMIT_FIELDS.some(f => limits[f.key] !== DEFAULT_LIMITS[f.key]);
  const verdict = computeVerdict(result, { config, limits });
  const light = sustainabilityLight(verdict, riskPathOf(verdict));
  const breakYear = light?.state === 'breaks' ? light.breakYear ?? null : null;
  const bailoutYear = verdict?.bailoutYear ?? null, restructuringYear = verdict?.restructuringYear ?? null, defaultYear = verdict?.defaultYear ?? null;
  const selectedYear = state.selectedYear ?? 2050;
  const system = activeSystemKey(config);
  const systemName = scenarioSystemName(config).replace(/^[^\p{L}]+/u, '');
  const years = reportYears(selectedYear, breakYear, bailoutYear, restructuringYear, defaultYear);
  const payable = r => payablePensionAnnual(r, verdict, result.config ?? config) / 12;

  // 1 · The yearly table (the console's columns).
  const rows = years.map(year => {
    const r = at(result, year);
    if (!r) return null;
    return { year, debtGDP: r.debtGDP, pensionMonthly: r.averagePensionAnnual / 12, payableMonthly: payable(r),
      replacementPct: r.replacementRate * 100, gapGDP: r.pensionGapGDP, interestGDP: r.interest / r.gdp * 100,
      fundGDP: r.fundedAssetsGDP > 0 ? r.fundedAssetsGDP : null, pensionSpendingGDP: r.publicPensionSpendingGDP,
      consulted: year === selectedYear, broken: breakYear !== null && year >= breakYear };
  }).filter(Boolean);
  const payableDiffers = (result.years ?? []).some(r => Math.abs(payable(r) - r.averagePensionAnnual / 12) > 0.5);

  // 2 · Who pays the public pensions, and which pensions are paid (% of GDP; the station's figures are nominal).
  const funding = years.map(year => {
    const r = at(result, year), pf = stationAt(verdict, year)?.pensionFunding;
    if (!r || !pf) return null;
    const gdpNominal = r.gdp * (r.priceIndex ?? 1) / 100;
    const g = v => r.gdp > 0 ? v / r.gdp * 100 : null;
    return { year, surplus: r.pensionGapGDP < 0, cost: pf.cost / gdpNominal, contributions: pf.contributionsAndMutuas / gdpNominal, taxes: pf.taxes / gdpNominal,
      missing: pf.missing / gdpNominal, transition: r.transitionContributionsGDP ?? 0,
      legacy: g(r.legacyBenefits), payg: g(r.paygBenefits), ndc: g(r.ndcBenefits), other: g(r.otherPensionBenefits), funded: g(r.fundedBenefits) };
  }).filter(Boolean);

  // 3 · The State's accounts.
  const accounts = years.map(year => {
    const r = at(result, year), vars = stationAt(verdict, year)?.risk?.vars ?? {};
    if (!r || !(r.gdp > 0)) return null;
    return { year, revenue: r.totalPublicRevenue / r.gdp * 100, spending: r.totalPublicSpending / r.gdp * 100,
      primary: r.primaryBalance / r.gdp * 100, balance: r.stateBalance / r.gdp * 100, interest: r.interest / r.gdp * 100,
      financingNeeds: vars.grossFinancingNeeds ?? null, premiumDebt: r.riskPremiumDebtSnowballGDP ?? null, debt: r.debtGDP };
  }).filter(Boolean);

  // 4 · Why it breaks (or what warns when it holds): the indicators that fire, the edge, the rule, what follows.
  const riskYear = breakYear ?? verdict?.highRiskYear ?? verdict?.moderateRiskYear ?? null;
  const riskStation = riskYear ? stationAt(verdict, riskYear) : null;
  const why = {
    year: riskYear,
    failure: light?.failure ?? null,
    floor: (config.pensionAdequacyFloor ?? 0.4) * 100,
    firing: riskStation ? firingDescriptions(riskStation.risk) : [],
    edge: verdict?.edge ? { year: verdict.edge.year, label: verdict.edge.label, gap: verdict.edge.gap, unit: verdict.edge.unit } : null,
    rule: light?.technical ?? '',
    aftermath: { bailoutYear, restructuringYear, defaultYear,
      freezeYears: config.payablePensionFreezeYears ?? PAYABLE_PENSION_DEFAULTS.payablePensionFreezeYears,
      cut: config.payablePensionCut ?? PAYABLE_PENSION_DEFAULTS.payablePensionCut },
    pensionInsufficientYear: verdict?.pensionInsufficientYear ?? null
  };

  // 5 · When help is needed: the dated milestones of the run, in order. «(S)» marks the simulator's own assumptions.
  const j = verdict?.journey ?? {};
  const outside = firstOutsideYear(result, limits);
  const breaches = outside ? stationAt(verdict, outside)?.breaches ?? {} : {};
  const crossed = Object.entries(breaches).filter(([, b]) => b).map(([k]) => LIMIT_FIELDS.find(f => f.key === LIMIT_BY_BREACH[k])?.label).filter(Boolean);
  const milestones = [
    [result.summary?.firstGapYear, 'Primer año en que falta dinero para pensiones, después de cotizaciones e impuestos asignados'],
    [j.firstFundingYear, 'El Estado pide deuda nueva por primera vez: tiene déficit'],
    [j.snowballYear, 'El interés medio de la deuda supera el crecimiento de la economía: la deuda pesa más cada año'],
    [j.firstRiskPremiumYear, 'La deuda nueva empieza a pagar prima de riesgo'],
    [verdict?.moderateRiskYear !== verdict?.highRiskYear ? verdict?.moderateRiskYear : null, 'Riesgo fiscal moderado'],
    [verdict?.highRiskYear !== breakYear ? verdict?.highRiskYear : null, 'Riesgo fiscal alto'],
    [breakYear, 'Se rompe'],
    [bailoutYear, 'Rescate (supuesto del simulador)'],
    [restructuringYear, 'Quita de la deuda (supuesto del simulador)'],
    [defaultYear, 'Impago (supuesto del simulador)'],
    [j.closingClauseYear, 'Salta el freno de 2023: sube el MEI'],
    [verdict?.pensionInsufficientYear, `La pensión media baja del ${num((config.pensionAdequacyFloor ?? 0.4) * 100)} % del salario medio`],
    [outside, `Sale de ${ownLimits ? 'tus límites' : 'los límites de partida'}${crossed.length ? `: ${crossed.join(', ').toLowerCase()}` : ''}`]
  ].filter(([y]) => inYears(y)).map(([year, label]) => ({ year, label })).sort((a, b) => a.year - b.year);

  // 6 · What the reader changed: against today's rules with the chosen system in its standard form (as the console
  // counts it). A changed setting that does nothing with this scenario says so (1.88 measured them).
  const baseline = originWithSystem(config, DEFAULT_CONFIG);
  const changes = SETTINGS_CHAPTERS.map(chapter => ({ chapter: `${chapter.number} ${chapter.title}`,
    items: ROWS.filter(r => r.entry.chapter === chapter.id && r.entry.key !== 'system' && rowChanged(r, config, baseline)).map(r => {
      const now = valueText(r, config), start = valueText(r, baseline);
      return { name: r.entry.name, value: now.value, start: start.value, unit: now.unit,
        inert: !settingActsOn(r.entry.key, config) || settingWaits(r.entry.key, config, result) };
    }) })).filter(c => c.items.length);
  const mixChanged = MIX_PARTS.some(([k]) => Math.abs((config.mix?.[k] ?? 0) - (baseline.mix?.[k] ?? 0)) > 1e-6);
  const mix = mixChanged ? { value: mixText(config.mix), start: mixText(baseline.mix),
    inert: !settingActsOn('mix', config) || settingWaits('mix', config, result) } : null;
  const calendars = Object.entries(CALENDAR).filter(([key]) => (config[key] ?? []).length)
    .map(([key, spec]) => ({ title: spec.title, ...calendarTable(spec, config[key]) }));
  const limitChanges = LIMIT_FIELDS.filter(f => limits[f.key] !== DEFAULT_LIMITS[f.key]).map(f => ({ name: f.label,
    value: `${num(limits[f.key], decimals(f.step))} ${f.unit}`, start: `${num(DEFAULT_LIMITS[f.key], decimals(f.step))} ${f.unit}` }));
  const unchanged = !changes.length && !mix && !calendars.length && !limitChanges.length;

  // 7 · The headline: one consulted year for every figure, the payable pension when it differs.
  const sel = at(result, selectedYear);
  const pensionNow = sel ? sel.averagePensionAnnual / 12 : null, payableNow = sel ? payable(sel) : null;
  const facts = [
    [`Deuda pública en ${selectedYear}`, pctText(sel?.debtGDP, 0, ' del PIB')],
    selectedYear === END_YEAR ? ['Deuda pública en 2050', pctText(at(result, 2050)?.debtGDP, 0, ' del PIB')] : [`Deuda pública en ${END_YEAR}`, pctText(at(result, END_YEAR)?.debtGDP, 0, ' del PIB')],
    [`Lo que falta para pensiones en ${selectedYear}`, pctText(sel?.pensionGapGDP, 1, ' del PIB')],
    [`Pensión media en ${selectedYear}`, Number.isFinite(pensionNow) ? `${num(pensionNow)} €/mes de 2026${payableNow < pensionNow - 0.5 ? `; pagable ${num(payableNow)}` : ''}` : '—'],
    [`Pensión frente al salario en ${selectedYear}`, pctText(sel?.replacementRate * 100, 0)]
  ];

  const s = SYSTEM_ASSUMPTIONS.find(x => x.key === system) ?? null;
  // The verdict's rules with this scenario's values (several are settings of chapter 7 or 4).
  const freeze = config.payablePensionFreezeYears ?? PAYABLE_PENSION_DEFAULTS.payablePensionFreezeYears;
  const cut = config.payablePensionCut ?? PAYABLE_PENSION_DEFAULTS.payablePensionCut;
  const VALUES = {
    'riesgo-alto-moderado': `Índice desde ${num(config.riskHighIndex ?? 0.36, 2)} y desde ${num(config.riskModerateIndex ?? 0.29, 2)}`,
    'se-rompe': `${config.riskSustainYears ?? 2} años seguidos de riesgo alto`,
    'suficiencia-pension': `Pensión media de al menos el ${num((config.pensionAdequacyFloor ?? 0.4) * 100)} % del salario medio`,
    'pension-pagable': `${freeze ? `Sin subir con los precios ${freeze} años desde el rescate` : 'Sube con los precios también tras el rescate'}${cut ? ` y un ${num(cut * 100)} % menos de la parte pública desde la quita` : ''}`
  };
  const NAMES = { 'pension-pagable': 'Pensión pagable desde el rescate' };
  const pick = ids => ASSUMPTIONS.filter(a => ids.includes(a.id)).map(a => ({ name: NAMES[a.id] ?? a.name, value: VALUES[a.id] ?? a.value, kinds: a.kinds.map(k => ASSUMPTION_KINDS[k]) }));
  return {
    name, system, systemName, selectedYear, link,
    verdict: { state: light?.state ?? null, headline: light?.headline ?? '', why: light?.why ?? '', breakYear },
    facts, rows, payableDiffers, funding, accounts, why, milestones,
    changes, mix, calendars, limits: limitChanges, unchanged,
    assumptions: scenarioAssumptions(config, verdict, system, (result.years ?? []).some(y => y.fundedAssetsGDP > 0)),
    systemText: s && { name: s.name, what: dropOthers(s.what), pension: s.pension, entry: s.entry, contribution: s.contribution, fund: s.fund, today: s.today },
    verdictAssumptions: pick(['indice-riesgo', 'riesgo-alto-moderado', 'se-rompe', 'rescate-quita-impago', 'suficiencia-pension', 'pension-pagable']),
    charts: reportCharts(result, { breakYear, failure: light?.failure ?? null, path: riskPathOf(verdict), floor: why.floor }), chartMarks: [breakYear && { year: breakYear, label: 'Se rompe' }].filter(Boolean)
  };
}
