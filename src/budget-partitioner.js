/**
 * Particionador del Presupuesto Público ("Disco Duro" + Treemap tipo Civio) y
 * detector de Puntos de Alta Fricción (⚡) y Explosión/Colapso (💥).
 *
 * Desglosa el gasto primario no pensionista (`otherPrimarySpending`) en 7 grandes
 * partidas funcionales,
 * con el gasto por funciones de Eurostat (COFOG) y, como tope de cada partida, el
 * mayor recorte observado en España en 2010–2014. Los umbrales de las señales de caja
 * (38 %, 11 %, 65 %) son supuestos del simulador.
 */
import { S0_SHORT } from './shared/risk-wording.js';
import { riskVariablesFromEngine, fiscalRiskIndex, riskLevel } from './shared/sovereign-risk.js';
import { BUDGET_COFOG_2024 } from '../data/budget-cofog-2024.js';
import { num, percent, share, millions } from './shared/number-format.js';
import { verdictOptions } from './shared/crisis-narrative.js';
import { firingDescriptions } from './views/risk-strip.js';
import { DEFAULT_CONFIG, PENSION_SHARE_SCALE } from './shared/default-config.js';
import { otherSpendingEligibleOf } from './payment-spending-adjustment.js';

// Spending by function from Eurostat COFOG (data/budget-cofog-2024.js): the 2024
// weight of each item and, as its limit, the deepest cut Spain actually made in
// 2010–2014 (an observation, not a physical floor). The «friction» point at half
// of it is an assumption of the simulator. docs/AUDITORIA-UMBRALES-RESTANTES.md.
const COFOG_META = Object.freeze({
  'health': [
    'Sanidad',
    'Sanidad',
    '🏥',
    '#d94826',
    'right',
    'listas de espera y saturación de la atención primaria',
    'Mayor recorte observado en 2010–2014 (−13,2 %)'
  ],
  'social': [
    'Protección social sin pensiones (incapacidad, desempleo, familia, exclusión)',
    'Protección social',
    '🤝',
    '#52a634',
    'center',
    'menos cobertura de desempleo, dependencia y ayudas familiares',
    'Mayor recorte observado en 2010–2014 (−15,7 %)'
  ],
  'economic': [
    'Asuntos económicos: infraestructuras, transporte, energía, industria y agricultura',
    'Infraestructuras y economía',
    '🏗️',
    '#8c62b5',
    'center',
    'obra pública paralizada y menos mantenimiento',
    'Mayor recorte observado en 2010–2014 (−25,4 %)'
  ],
  'education': [
    'Educación',
    'Educación',
    '🎓',
    '#8e63b7',
    'right',
    'aulas más llenas y menos becas',
    'Mayor recorte observado en 2010–2014 (−15,2 %)'
  ],
  'general': [
    'Servicios generales de las administraciones (sin intereses)',
    'Servicios generales',
    '⚙️',
    '#47b8ce',
    'right',
    'retrasos en trámites y organismos al mínimo',
    'Mayor recorte observado en 2010–2014 (−15,9 %)'
  ],
  'security': [
    'Defensa, orden público y justicia',
    'Defensa y justicia',
    '🛡️',
    '#ea7d24',
    'right',
    'juzgados y policía con menos medios',
    'Mayor recorte observado en 2010–2014 (−14,0 %)'
  ],
  'environment': [
    'Medio ambiente, vivienda y cultura',
    'Ambiente, vivienda y cultura',
    '🌳',
    '#43b5cb',
    'right',
    'menos vivienda pública, cultura y protección ambiental',
    'Mayor recorte observado en 2010–2014 (−41,4 %)'
  ]
});
export const BUDGET_DEPARTMENTS = Object.freeze(BUDGET_COFOG_2024.items.map(item => {
  const [label, shortLabel, icon, color, treemapGroup, friction, limit] = COFOG_META[item.id];
  return Object.freeze({
    id: item.id, label, shortLabel, icon, color, treemapGroup, cofog: item.cofog,
    share: item.share,
    frictionCut: Number((item.observedCut / 2).toFixed(4)),
    maxCut: item.observedCut,
    frictionWarning: `⚡ ${shortLabel}: ${friction} (señal orientativa, supuesto).`,
    collapseWarning: `💥 ${shortLabel}: ${limit}. Recortar más no tiene precedente reciente en España.`
  });
}));

// Máximo porcentaje agregado del resto del gasto que se puede recortar llevando
// cada partida a su mayor recorte observado en 2010–2014 (≈ 18,9 %).
export const MAX_TOTAL_CAJA_CUT_SHARE = BUDGET_DEPARTMENTS.reduce(
  (sum, dept) => sum + dept.share * dept.maxCut,
  0
);

// One-click presets of the partitioner (1.52), keyed by the COFOG ids of
// BUDGET_DEPARTMENTS; items left out are not cut. normalizeDepartmentCuts caps each
// cut at the item's deepest observed cut of 2010–2014, so the view describes them
// from the capped values. They replace the old ids (industry, defense, transfers,
// unemployment), which no longer existed and were silently dropped.
export const BUDGET_PRESET_CUTS = Object.freeze({
  selective: Object.freeze({ general: 0.30, economic: 0.25, security: 0.18 }),
  balancedMix: Object.freeze({ general: 0.22, economic: 0.18, security: 0.14 })
});

export function createDefaultDepartmentCuts() {
  return Object.fromEntries(BUDGET_DEPARTMENTS.map(dept => [dept.id, 0]));
}

export function normalizeDepartmentCuts(cuts = {}) {
  const result = {};
  for (const dept of BUDGET_DEPARTMENTS) {
    const raw = Number(cuts?.[dept.id] ?? 0);
    result[dept.id] = Number.isFinite(raw) ? Math.max(0, Math.min(dept.maxCut, raw)) : 0;
  }
  return result;
}

export function totalWeightedCutShare(cuts = {}) {
  const norm = normalizeDepartmentCuts(cuts);
  return BUDGET_DEPARTMENTS.reduce((sum, dept) => sum + dept.share * norm[dept.id], 0);
}

/**
 * Si el motor tiene ya un `otherSpendingCut` global (por ejemplo cargado de un
 * escenario previo), lo distribuye proporcionalmente al margen de cada partida
 * cuando el usuario no ha fijado recortes individuales distintos.
 */
export function inferDepartmentCutsFromAggregate(aggregateShareOfOtherPrimary = 0) {
  if (!(aggregateShareOfOtherPrimary > 0)) return createDefaultDepartmentCuts();
  const ratio = Math.min(1, aggregateShareOfOtherPrimary / MAX_TOTAL_CAJA_CUT_SHARE);
  return Object.fromEntries(
    BUDGET_DEPARTMENTS.map(dept => [dept.id, Number((dept.maxCut * ratio).toFixed(4))])
  );
}

/**
 * Evalúa la partición presupuestaria de una estación anual y detecta los
 * Puntos de Alta Fricción (⚡) y Puntos de Explosión / Ruptura (💥).
 */
export function describeStationFrictionAndBudget(point, flow, station, config, departmentCuts = null, previous = null) {
  const factor = flow.priceFactor;
  const otherAfterCut = point.otherPrimarySpending * factor;
  const otherBeforeCut = (point.paymentSpendingAdjustment?.otherSpendingBeforeAdjustment ?? point.otherPrimarySpending) * factor;
  const otherReduction = Math.max(0, otherBeforeCut - otherAfterCut);
  // The engine's own scope of a cut, also in a year without one (src/payment-spending-adjustment.js).
  const eligiblePool = otherSpendingEligibleOf(point) * factor;
  const maxCuttableCaja = otherBeforeCut * MAX_TOTAL_CAJA_CUT_SHARE;

  const actualCutShareOfOther = otherBeforeCut > 0 ? otherReduction / otherBeforeCut : 0;
  const cuts = departmentCuts
    ? normalizeDepartmentCuts(departmentCuts)
    : inferDepartmentCutsFromAggregate(actualCutShareOfOther);

  const pensionCost = station.pensionFunding?.cost ?? (point.publicBenefits * factor);
  const pensionContribAndMutuas = station.pensionFunding?.contributionsAndMutuas ?? 0;
  const pensionTaxesAssigned = station.pensionFunding?.taxes ?? (point.pensionTaxTransfer * factor);
  const pensionMissing = station.pensionFunding?.missing ?? 0;
  const pensionMissingShare = station.pensionFunding?.missingShare ?? 0;

  // Necesidad total de las pensiones públicas después de cotizaciones y mutuas
  const pensionStateSupportNeeded = Math.max(0, pensionCost - pensionContribAndMutuas);
  // Reference tax transfer: the opening share of the other revenue that goes to pensions
  // (DEFAULT_CONFIG.pensionBudgetShare, from the 2026 data), not the scenario's own share.
  // Earmarked grants (the Recovery Plan) stay out, as in the engine (src/current-fiscal-v13.js, since 1.73).
  const basePensionShare = Math.min(1, DEFAULT_CONFIG.pensionBudgetShare * PENSION_SHARE_SCALE);
  const earmarked = Number.isFinite(point.fiscalComposition?.temporaryMatchedRevenue)
    ? point.fiscalComposition.temporaryMatchedRevenue * factor : 0;
  const imputed = Number.isFinite(point.fiscalComposition?.imputedSocialContributions)
    ? point.fiscalComposition.imputedSocialContributions * factor : 0;
  const mutuas = Number.isFinite(point.fiscalComposition?.mutuaContributions)
    ? point.fiscalComposition.mutuaContributions * factor : 0;
  const allocatableRevenue = Math.max(0, point.generalTaxRevenue * factor - imputed - mutuas - earmarked);
  const baseTaxTransfer = allocatableRevenue * basePensionShare;

  // Agujero extraordinario de pensiones por encima de cuotas + transferencia base de 2026
  const extraPensionHoleBeyondBase = Math.max(0, pensionStateSupportNeeded - baseTaxTransfer);
  // Cuánto de ese agujero extraordinario sigue sin cubrir incluso tras tus recortes e impuestos
  const uncoveredAfterMeasures = pensionMissing;
  // Si se asignan impuestos a pensiones sin recortar ministerios ni subir impuestos,
  // el resto del presupuesto (otherBudgetBalance) entra en déficit y desplaza a la Caja General:
  const otherBudgetBalance = point.otherBudgetBalance * factor;
  const generalBoxDeficit = Math.max(0, -otherBudgetBalance);
  // Presión efectiva sobre la Caja General o Deuda: lo que les falta a las pensiones + lo que ya han recortado de ministerios
  const totalCajaPressure = uncoveredAfterMeasures + otherReduction;
  const maxCajaCapacityRatio = maxCuttableCaja > 0 ? totalCajaPressure / maxCuttableCaja : 0;

  const departments = BUDGET_DEPARTMENTS.map(dept => {
    const initialBudget = otherBeforeCut * dept.share;
    const cutPct = cuts[dept.id] ?? 0;
    const cutAmount = initialBudget * cutPct;
    const currentBudget = Math.max(0, initialBudget - cutAmount);
    const maxCutAmount = initialBudget * dept.maxCut;
    const floorAmount = initialBudget - maxCutAmount;
    const status = cutPct >= dept.maxCut - 0.002
      ? 'explosion'
      : cutPct >= dept.frictionCut
        ? 'friction'
        : 'normal';
    return {
      ...dept,
      initialBudget,
      cutPct,
      cutAmount,
      currentBudget,
      maxCutAmount,
      floorAmount,
      remainingCuttable: Math.max(0, maxCutAmount - cutAmount),
      status
    };
  });

  // Ordenar los ministerios que "se comería" el agujero de pensiones si no se tira de deuda
  let remainingHoleToIllustrate = uncoveredAfterMeasures;
  const eatenDepartments = [];
  for (const dept of [...departments].sort((a, b) => a.currentBudget - b.currentBudget)) {
    if (remainingHoleToIllustrate <= 0) break;
    if (remainingHoleToIllustrate >= dept.currentBudget * 0.65) {
      eatenDepartments.push(dept.shortLabel);
      remainingHoleToIllustrate -= dept.currentBudget;
    }
  }

  const events = [];

  // 1. Eje Presupuestario / Caja General vs Pensiones
  if (uncoveredAfterMeasures > maxCuttableCaja) {
    const overflow = uncoveredAfterMeasures - maxCuttableCaja;
    events.push({
      level: 'explosion',
      category: 'budget',
      icon: '💥',
      title: 'Lo que falta en pensiones supera el mayor recorte observado',
      detail: `Faltan ${millions((uncoveredAfterMeasures) / factor)} para pensiones: ${millions((overflow) / factor)} más de lo que daría recortar todas las partidas hasta su mayor recorte observado en 2010–2014 (${millions((maxCuttableCaja) / factor)}), que es una observación, no un límite. Obliga a emitir deuda o subir impuestos.`
    });
  } else if (totalCajaPressure > maxCuttableCaja) {
    events.push({
      level: 'explosion',
      category: 'budget',
      icon: '💥',
      title: 'Sobrecarga extrema sobre el presupuesto',
      detail: `Lo que falta en pensiones más lo ya recortado de otras partidas (${millions((totalCajaPressure) / factor)}) rebasa lo que daría recortar todas las partidas hasta su mayor recorte observado en 2010–2014 (${millions((maxCuttableCaja) / factor)}).`
    });
  } else if (uncoveredAfterMeasures > 0.38 * maxCuttableCaja || pensionMissingShare >= 0.11) {
    const eatenText = eatenDepartments.length
      ? ` Equivale a absorber el presupuesto entero de ${eatenDepartments.slice(0, 3).join(' + ')}.`
      : '';
    events.push({
      level: 'friction',
      category: 'budget',
      icon: '⚡',
      title: 'Lo que falta para pensiones aprieta el presupuesto',
      detail: `Tras tus medidas, lo que falta para pensiones son ${millions((uncoveredAfterMeasures) / factor)}/año, el ${share(pensionMissingShare)} del gasto en pensiones.${eatenText}`
    });
  }

  // Eventos por recortes departamentales elegidos por el usuario
  const collapsedDepts = departments.filter(d => d.status === 'explosion');
  const frictionDepts = departments.filter(d => d.status === 'friction');
  if (collapsedDepts.length > 0 && point.year > 2026) {
    events.push({
      level: 'explosion',
      category: 'policy',
      icon: '💥',
      title: `Límite de colapso en ${collapsedDepts.map(d => d.shortLabel).join(', ')}`,
      detail: collapsedDepts[0].collapseWarning
    });
  } else if (frictionDepts.length > 0 && point.year > 2026) {
    events.push({
      level: 'friction',
      category: 'policy',
      icon: '⚡',
      title: `Fricción por recortes en ${frictionDepts.map(d => d.shortLabel).join(', ')}`,
      detail: frictionDepts[0].frictionWarning
    });
  }


  // 2. Eje financiero: riesgo de tensión fiscal, con el índice fiscal del S0 de la
  // Comisión Europea (src/shared/sovereign-risk.js), el mismo del veredicto.
  const riskOptions = verdictOptions(config ?? {}).risk;
  const riskVars = previous ? riskVariablesFromEngine(point, previous, riskOptions) : null;
  const risk = riskVars ? fiscalRiskIndex(riskVars) : { index: null, firing: [] };
  const riskLvl = riskLevel(risk.index, riskOptions);
  const riskDetail = () => firingDescriptions({ firing: risk.firing, vars: riskVars }).join('; ');
  const snowball = Boolean(
    // Interest above growth with a primary deficit; no debt threshold (it had no source).
    station.snowball?.active &&
    (station.snowball?.primaryDeficit ?? 0) > 0
  );
  if (riskLvl === 'high') {
    events.push({
      level: 'explosion',
      category: 'debt',
      icon: '💥',
      title: 'Riesgo alto de tensión fiscal (' + S0_SHORT + ')',
      detail: `Índice ${num(risk.index, 2)} (umbral 0,36). Avisan: ${riskDetail()}. Es un aviso a uno o dos años, no una previsión de crisis.`
    });
  } else if (riskLvl === 'moderate' || snowball) {
    events.push({
      level: 'friction',
      category: 'debt',
      icon: '⚡',
      title: riskLvl === 'moderate' ? 'Riesgo moderado de tensión fiscal (índice fiscal del S0)' : 'Bola de nieve de la deuda',
      detail: riskLvl === 'moderate'
        ? `Índice ${num(risk.index, 2)} (moderado desde 0,29, alto desde 0,36). Avisan: ${riskDetail()}.${snowball ? ' Con bola de nieve activa.' : ''}`
        : `Deuda en ${percent(station.debtGDP)} del PIB con déficit primario y la bola de nieve de intereses activa.`
    });
  }

  // 3. Eje social: suficiencia de la pensión frente a las referencias de la OIT
  // (Convenio 102: 40 %; Convenio 128: 45 %), como pensión media sobre salario medio.
  const repPct = station.replacementRate * 100;
  const floorPct = verdictOptions(config ?? {}).pension.floor * 100;
  if (point.year > 2026 && repPct < floorPct) {
    events.push({
      level: 'explosion',
      category: 'social',
      icon: '💥',
      title: 'Pensión por debajo de la referencia de suficiencia (OIT)',
      detail: `La pensión media cae a ${Math.round(station.pensionMonthly).toLocaleString('es-ES')} €/mes, el ${percent(repPct)} del salario medio, por debajo del ${percent(floorPct, 0)} del Convenio 102 de la OIT (que mide la pensión de un beneficiario tipo frente a su salario anterior).`
    });
  } else if (point.year > 2026 && repPct < 45) {
    events.push({
      level: 'friction',
      category: 'social',
      icon: '⚡',
      title: 'Pensión cerca del suelo de suficiencia',
      detail: `La pensión media es el ${percent(repPct)} del salario medio (${Math.round(station.pensionMonthly).toLocaleString('es-ES')} €/mes de 2026), por debajo del 45 % del Convenio 128 de la OIT.`
    });
  }

  // 4. Eje fiscal y laboral: respuesta de la base a los impuestos sobre el trabajo,
  // la que ya descuenta el motor (src/shared/laffer-response.js, Trabandt y Uhlig).
  // Desde la 1.56 el recargo del IVA entra en la misma cuña, y desde la 1.58 el de los demás impuestos sobre productos (vatStaticExtra: la subida del
  // impuesto al trabajo equivalente, en euros); su propia recaudación no se recorta.
  const laffer = point.fiscalComposition?.laffer;
  const labourPaper = laffer?.staticExtra ?? 0, vatPaper = laffer?.vatStaticExtra ?? 0;
  if (point.year > 2026 && laffer && labourPaper + vatPaper > 0 && laffer.revenueResponse < 0 && point.gdp > 0) {
    const pctGDP = value => (value / point.gdp * 100).toLocaleString('es-ES', { maximumFractionDigits: 2 });
    const pastPeak = laffer.pastPeak;
    const vatOnly = !(labourPaper > 0);
    const hoursText = point.lafferOutput ? ` Las horas perdidas bajan el PIB un ${pctGDP(-point.lafferOutput * point.gdp / (1 + point.lafferOutput))} % este año${point.lafferHours ? ', y en la misma proporción la masa salarial, las cotizaciones y los derechos nuevos de pensión; esa pérdida de recaudación sale de las propias bases y no se cuenta dos veces' : ''}.` : '';
    const vatText = vatPaper > 0 ? `, y los impuestos sobre el consumo más altos pesan sobre las horas como otro ${pctGDP(vatPaper)} %, aunque su propia recaudación no se recorta` : '';
    events.push({
      level: pastPeak ? 'explosion' : 'friction',
      category: 'tax',
      icon: pastPeak ? '💥' : '⚡',
      title: pastPeak ? 'Más allá del máximo de la curva de Laffer: cada punto más recauda menos'
        : vatOnly ? 'El IVA más alto también hace trabajar menos horas' : 'Los impuestos al trabajo recaudan menos que en el papel',
      detail: vatOnly
        ? `Con los precios más altos, una hora de trabajo compra menos: el recargo del IVA pesa sobre las horas como una subida de los impuestos al trabajo del ${pctGDP(vatPaper)} % del PIB, y la base que se encoge resta ${pctGDP(-laffer.revenueResponse)} % este año. La recaudación del propio IVA no se recorta: su curva no tiene máximo (Trabandt y Uhlig; el ritmo del ajuste es un supuesto del simulador).${hoursText}`
        : `Las subidas de cotización e IRPF sobre el trabajo suman ${pctGDP(labourPaper)} % del PIB en el papel${vatText}; la base que se encoge (menos horas y renta declarada) resta ${pctGDP(-laffer.revenueResponse)} % este año. A largo plazo se recauda el ${Math.round(laffer.retained * 100)} % de lo previsto en el papel (Trabandt y Uhlig, España; el ritmo del ajuste es un supuesto del simulador).${hoursText}`
    });
  }

  const hasExplosion = events.some(e => e.level === 'explosion');
  const hasFriction = events.some(e => e.level === 'friction');
  const level = hasExplosion ? 'explosion' : hasFriction ? 'friction' : 'normal';

  const fiscalMeasuresNetNominal = (point.fiscalMeasures?.netRevenue ?? 0) * factor;

  return {
    level,
    events,
    budget: {
      priceFactor: factor,
      totalInflow: flow.totalInflow,
      totalOutflow: flow.totalOutflow,
      pensionCost,
      pensionContribAndMutuas,
      pensionTaxesAssigned,
      pensionMissing,
      pensionMissingShare,
      pensionStateSupportNeeded,
      baseTaxTransfer,
      extraPensionHoleBeyondBase,
      interestPaid: Math.max(0, flow.interestCurrent),
      otherBeforeCut,
      otherAfterCut,
      otherReduction,
      eligiblePool,
      maxCuttableCaja,
      maxCajaCapacityRatio,
      otherBudgetBalance,
      generalBoxDeficit,
      allocatableRevenue,
      fiscalMeasuresNetNominal,
      borrowing: flow.debtAdded ?? 0,
      departments,
      eatenDepartments
    }
  };
}
