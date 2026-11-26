// Lightweight labels and constants (no simulation code), safe for any page.
import { lifeExpectancyAtRetirement } from './longevity-table.js';
import { closingClauseChange } from './closing-clause.js';
import { settingName, settingValueText } from './settings-catalog.js';
import { budgetShareSetApart } from './budget-share-rule.js';
import { ageStepsText } from './retirement-age-steps.js';

// 1.52: the «de golpe» ones say so, as the gradual ways sit beside them.
export const SYSTEM_NAMES = { payg: 'Reparto', ndc: 'Cuentas nocionales', funded: 'Capitalización de golpe', mixed: 'Mixto de golpe' };

/**
 * The 4 core policy benchmarks shown by default across all pages:
 * 1) Reparto (`payg`), 2) Cuentas nocionales (`ndc`),
 * 3) Mixto progresivo (`progressive`), 4) Si el mixto progresivo hubiera empezado en 1985 (`retro1985`).
 * The 2 "de golpe" transition-shock models (`funded`, `mixed`) are hidden by default.
 * Mixto con ahorro propio (`mixedGradual`) joins after Mixto progresivo while it is the reader's system (mainSystemKeys).
 */
export const DEFAULT_VISIBLE_SYSTEM_KEYS = Object.freeze(['payg', 'ndc', 'progressive', 'retro1985']);
export const DE_GOLPE_SYSTEM_KEYS = Object.freeze(['funded', 'mixed']);

// The fund of the reference Mixto progresivo is common, not personal (decision of the author,
// 7/11/2026): each person keeps a recorded share and the pension follows it; nobody inherits it.
export const COMMON_FUND_STYLE = 'common-fund';
export const isCommonFund = config => config?.capitalizationStyle === COMMON_FUND_STYLE;

// Half public and half funded as the final goal (decision of the author, 6/11/2026; 60 % until 1.61).
// The pace follows today's pensions as they end (7/11/2026; a fixed calendar until 1.62): transitionYears
// and transitionRelaySchedule stay for a reader who picks another pace, and do nothing here.
export const FLAGSHIP_PROGRESSIVE = Object.freeze({
  system: 'mixed',
  transitionMode: 'pension-runoff',
  transitionCutoffAge: 48,
  transitionYears: 24,
  transitionTargetFunded: 0.50,
  transitionPublicPillar: 'custom-split',
  transitionNdcShare: 0.85,
  transitionRelaySchedule: 'announced',
  capitalizationStyle: COMMON_FUND_STYLE
});

export const FLAGSHIP_RETRO_1985 = Object.freeze({
  system: 'mixed',
  transitionMode: 'two-stage-relay',
  transitionCutoffAge: 41,
  transitionYears: 41,
  transitionTargetFunded: 0.65,
  transitionPublicPillar: 'custom-split',
  transitionNdcShare: 0.90,
  transitionRelaySchedule: 'announced',
  capitalizationStyle: 'dividend-endowment'
});

export function isRetro1985Active(config) {
  return Boolean(
    config &&
    config.system === 'mixed' &&
    config.transitionMode !== 'none' &&
    config.transitionYears === 41 &&
    config.transitionCutoffAge === 41
  );
}

/**
 * «Mixto con ahorro propio» (1.52), the mixed system of El recorrido with its default rules: a third
 * of every contribution goes, step by step over 24 years, to a fund; the rest is shared
 * 34:33 between pay-as-you-go and notional accounts. «Mixto de golpe» does it at once.
 * Linear-ramp with system-default does not read the last three keys (cut-off age, notional
 * share, relay calendar); they are DEFAULT_CONFIG's values, so choosing Mixto con ahorro propio from
 * any scenario (1985 too) gives the same, precomputed run.
 */
export const MIXED_GRADUAL = Object.freeze({
  system: 'mixed', mix: Object.freeze({ payg: 0.34, ndc: 0.33, funded: 0.33 }), transitionMode: 'linear-ramp',
  transitionYears: 24, transitionTargetFunded: 0.33, transitionPublicPillar: 'system-default', capitalizationStyle: 'balanced-standard',
  transitionCutoffAge: 48, transitionNdcShare: 0.85, transitionRelaySchedule: 'announced'
});

/** A mixed system that moves to the fund step by step, the same for every age (the route's). */
export function isMixedGradualActive(config) {
  return Boolean(config && config.system === 'mixed' && config.transitionMode === 'linear-ramp' && config.transitionPublicPillar === 'system-default');
}

/** True when the «Mixto progresivo» entry is the reference recipe: no transition yet, the 1985 experiment or Mixto con ahorro propio (R2). */
export function progressiveUsesFlagship(config) {
  return config.transitionMode === 'none' || isRetro1985Active(config) || isMixedGradualActive(config)
    // Reparto or Cuentas nocionales carrying Mixto con ahorro propio's transition (an import, an old saved
    // state): «the reader's transition» would run a Mixto con ahorro propio under «Mixto progresivo».
    || (activeSystemKey(config) !== 'progressive' && isMixedGradualActive({ ...config, system: 'mixed' }));
}

/** The «Mixto progresivo» run beside the scenario: the recipe, or the reader's own transition on the mixed system. */
export function progressiveEntryConfig(config, flagship = FLAGSHIP_PROGRESSIVE) {
  return progressiveUsesFlagship(config) ? { ...config, ...flagship } : { ...config, system: 'mixed' };
}

/** The «Mixto con ahorro propio» run: the reader's own while it is the scenario, else its preset on the reader's data (R3). */
export function mixedGradualEntryConfig(config) {
  return isMixedGradualActive(config) ? config : { ...config, ...MIXED_GRADUAL, mix: { ...MIXED_GRADUAL.mix } };
}

/**
 * A system without a transition reads none of its rules: choosing one puts back today's (DEFAULT_CONFIG's, pinned by
 * a test), so that a mixto left behind shows no setting «cambiado» in Reparto. Nothing is lost: the three ways with a
 * transition (1985, Mixto progresivo, Mixto con ahorro propio) bring all of theirs when chosen from one.
 */
export const STATIC_TRANSITION_RESET = Object.freeze({
  transitionYears: 20, transitionCutoffAge: 48, transitionTargetFunded: 0.65, transitionPublicPillar: 'ndc-bridge',
  transitionNdcShare: 0.85, transitionRelaySchedule: 'announced'
});

/**
 * The configuration patch that switches the scenario to one of the main models: the one rule of every selector
 * (the Laboratorio's buttons and lists, ⚙ Ajustes, the other pages; A10, 16/11/2026). Choosing the gradual
 * system already in use keeps the reader's own rules (R4). Choosing 1985 keeps the reader's return on savings,
 * as the comparisons run it: only the 1985 tax-cut tool writes a return of its own.
 */
export function selectSystemPatch(key, config, flagship) {
  if (key === 'retro1985') return { ...FLAGSHIP_RETRO_1985 };
  if (key === 'mixedGradual') return isMixedGradualActive(config) ? { system: 'mixed' } : { ...MIXED_GRADUAL, mix: { ...MIXED_GRADUAL.mix } };
  if (key === 'progressive') return progressiveUsesFlagship(config) ? { ...flagship } : { system: 'mixed' };
  return { system: key, transitionMode: 'none', capitalizationStyle: 'balanced-standard', ...STATIC_TRANSITION_RESET };
}

export function isProgressiveActive(config) {
  return config.transitionMode !== 'none' && !isRetro1985Active(config) && (config.system === 'mixed' || config.system === 'funded');
}

/**
 * The models compared side by side: the four static systems, «Mixto progresivo» (the reference
 * recipe unless the scenario is a Mixto progresivo), optionally Mixto con ahorro propio (opt-in, never in the
 * default list: its keys feed the precompute) and the 1985 counterfactual.
 * Order: payg, ndc, funded, mixed, progressive, [mixedGradual], [retro1985].
 */
export function comparisonConfigs(config, { includeRetro1985 = false, includeMixedGradual = false } = {}) {
  const statics = Object.keys(SYSTEM_NAMES).map(system => ({
    key: system,
    system,
    progressive: false,
    retro1985: false,
    label: SYSTEM_INFO[system].plain,
    technical: SYSTEM_INFO[system].technical,
    config: { ...config, system, transitionMode: 'none', capitalizationStyle: 'balanced-standard' }
  }));
  const baseList = [...statics, {
    key: 'progressive',
    system: 'mixed',
    progressive: true,
    retro1985: false,
    label: SYSTEM_INFO.progressive.plain,
    technical: SYSTEM_INFO.progressive.technical,
    config: progressiveEntryConfig(config)
  }];
  if (includeMixedGradual) {
    baseList.push({
      key: 'mixedGradual',
      system: 'mixed',
      progressive: true,
      retro1985: false,
      label: SYSTEM_INFO.mixedGradual.plain,
      technical: SYSTEM_INFO.mixedGradual.technical,
      config: mixedGradualEntryConfig(config)
    });
  }
  if (!includeRetro1985) return baseList;
  return [...baseList, {
    key: 'retro1985',
    system: 'mixed',
    progressive: true,
    retro1985: true,
    label: SYSTEM_INFO.retro1985.plain,
    technical: SYSTEM_INFO.retro1985.technical,
    config: { ...config, ...FLAGSHIP_RETRO_1985 }
  }];
}

/**
 * «Los cuatro sistemas» of the Laboratorio: its charts and its PDF report (docs/REVISION-EXPORTAR-2026-11-08.md).
 * Reparto, Cuentas nocionales, Mixto progresivo and Mixto con ahorro propio, built as Comparar builds them, with
 * the reader's levers; the reader's own system is the reader's run. A reader on another system (a «de golpe» one
 * or 1985) gets it added at the end, with its name. Until 8/11/2026 these were the four static systems with
 * the reader's transition kept, so a Mixto progresivo read «Mixto de golpe».
 */
export const LAB_SYSTEM_KEYS = Object.freeze(['payg', 'ndc', 'progressive', 'mixedGradual']);
export function labSystemEntries(config) {
  const active = activeSystemKey(config);
  const byKey = new Map(comparisonConfigs(config, { includeMixedGradual: true }).map(entry => [entry.key, entry]));
  const list = LAB_SYSTEM_KEYS.map(key => ({ key, name: byKey.get(key).label, config: key === active ? config : byKey.get(key).config, own: key === active }));
  if (!LAB_SYSTEM_KEYS.includes(active)) list.push({ key: active, name: scenarioSystemName(config), config, own: true });
  return list;
}

/** Plain name, technical name and a one-line explanation for each model. */
export const SYSTEM_INFO = Object.freeze({
  payg: { plain: 'Reparto', technical: 'Reparto · sistema actual (caja + impuestos)',
    oneLiner: 'Las cotizaciones de cada año pagan las pensiones de ese año. Hoy cubren unos 7 de cada 10 €; el resto sale de impuestos generales y deuda. No guarda ahorro a tu nombre.' },
  ndc: { plain: 'Cuentas nocionales', technical: 'Cuentas nocionales (cuenta apuntada)',
    oneLiner: 'Sigue siendo reparto, pero tu pensión se calcula con lo cotizado en una cuenta virtual, sin dinero real detrás.' },
  funded: { plain: 'Capitalización de golpe', technical: 'Capitalización inmediata',
    oneLiner: 'Desde mañana tus cotizaciones van a un fondo a tu nombre… y las pensiones actuales se pagan con deuda.' },
  mixed: { plain: 'Mixto de golpe', technical: 'Mixto fijo inmediato',
    oneLiner: 'Desde mañana una parte de la cuota (por defecto, un tercio) va a tu fondo; el resto sigue pagando las pensiones de hoy (por defecto, 34 % por el reparto y 33 % por cuentas nocionales).' },
  progressive: { plain: 'Mixto progresivo', technical: 'Mixto Progresivo (empezando en 2027)',
    oneLiner: 'Cambia según la edad. Los mayores conservan sus derechos y aportan poco al fondo. Los jóvenes pasan a un fondo común, con su parte anotada, al ritmo en que fallecen quienes hoy cobran pensión. Las cuentas nocionales hacen de puente.' },
  mixedGradual: { plain: 'Mixto con ahorro propio', technical: 'Mixto con rampa lineal (empezando en 2027)',
    oneLiner: 'Una parte de la cotización de todos pasa poco a poco a un fondo a tu nombre (por defecto, hasta un tercio en 24 años); el resto sigue pagando las pensiones de hoy, por el reparto y por cuentas nocionales.' },
  retro1985: { plain: '⏳ Si el mixto progresivo hubiera empezado en 1985', technical: 'Contrafactual 1985 · Nocional + fondo capitalizado',
    oneLiner: 'Cómo estaríamos si el cambio hacia un fondo hubiera empezado en 1985. No es historia real: es una reconstrucción con supuestos.' }
});

/** Patches used by the scenario bar to undo one family of changes. */
export const AI_RESET_PATCH = Object.freeze({
  automationRegime: 'status-quo-payroll', publicAdminAutomationShare: 0, aiAutomationShare: 0, robotAutomationShare: 0,
  automationTargetYear: 2030, automationProductivityGain: 0, automationRedeployment: 1, reemploymentWageLoss: 0,
  displacementSupportRate: 0.4, automationWagePassThrough: 1
});
// The undo of «Sistema: …» in the scenario bars: Reparto, with every rule of the transition as today (A10).
export const SYSTEM_RESET_PATCH = Object.freeze({ system: 'payg', transitionMode: 'none', capitalizationStyle: 'balanced-standard', ...STATIC_TRANSITION_RESET });

export function hasAiShock(config) {
  return (config.automationRegime ?? 'status-quo-payroll') !== 'status-quo-payroll' ||
    (config.aiAutomationShare ?? 0) + (config.robotAutomationShare ?? 0) + (config.publicAdminAutomationShare ?? 0) > 0;
}

/** Short human name of the scenario's pension model. */
export function scenarioSystemName(config) {
  if (isRetro1985Active(config)) return SYSTEM_INFO.retro1985.plain;
  if (isMixedGradualActive(config)) return SYSTEM_INFO.mixedGradual.plain;
  return isProgressiveActive(config) ? SYSTEM_INFO.progressive.plain : SYSTEM_INFO[config.system]?.plain ?? config.system;
}

export function activeSystemKey(config) {
  if (!config) return 'payg';
  if (isRetro1985Active(config)) return 'retro1985';
  if (isMixedGradualActive(config)) return 'mixedGradual';
  if (isProgressiveActive(config)) return 'progressive';
  return config.system || 'payg';
}

/**
 * 1.52 · Comparar, Mixto, Gráficos, IA and Resumen add Mixto con ahorro propio only while it is the
 * reader's system, as the «de golpe» ones; the Laboratorio and ¿Cuándo se rompe? always show
 * it. The single switch.
 */
export function includeMixedGradualFor(config) {
  return activeSystemKey(config) === 'mixedGradual';
}

/** The main cards in order: the four benchmarks, with Mixto con ahorro propio after «Mixto progresivo» when shown. */
export function mainSystemKeys(config, { mixedGradual = includeMixedGradualFor(config) } = {}) {
  return mixedGradual ? ['payg', 'ndc', 'progressive', 'mixedGradual', 'retro1985'] : [...DEFAULT_VISIBLE_SYSTEM_KEYS];
}

/**
 * The origin data (`defaults`, DEFAULT_CONFIG) with the scenario's chosen system kept, in its
 * standard form. A reset that should not change the reader's system uses it.
 */
export function originWithSystem(config, defaults, flagship = FLAGSHIP_PROGRESSIVE) {
  return { ...defaults, ...selectSystemPatch(activeSystemKey(config), defaults, flagship) };
}

const CANONICAL_SYSTEM_PATCHES = {
  // The static ones as choosing them gives (A10): an undo of «Cambio a un fondo, a medida» leaves nothing behind.
  payg: { system: 'payg', transitionMode: 'none', capitalizationStyle: 'balanced-standard', ...STATIC_TRANSITION_RESET },
  ndc: { system: 'ndc', transitionMode: 'none', capitalizationStyle: 'balanced-standard', ...STATIC_TRANSITION_RESET },
  funded: { system: 'funded', transitionMode: 'none', capitalizationStyle: 'balanced-standard', ...STATIC_TRANSITION_RESET },
  mixed: { system: 'mixed', transitionMode: 'none', capitalizationStyle: 'balanced-standard', ...STATIC_TRANSITION_RESET },
  progressive: FLAGSHIP_PROGRESSIVE,
  mixedGradual: MIXED_GRADUAL,
  retro1985: FLAGSHIP_RETRO_1985
};

const fmtNum = (v, d = 1) => Number(v).toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: 0 });
// «1 punto», «1,5 puntos»: the size, without its sign.
const points = v => { const shown = fmtNum(Math.abs(v), 1); return `${shown} ${shown === '1' ? 'punto' : 'puntos'}`; };

/**
 * Inspects `config` against `defaults` (DEFAULT_CONFIG) and returns:
 * - `isOrigin`: true when identical to Spain 2026 baseline (payg, zero tweaks)
 * - `isCustom`: true when any parameter/lever differs from the canonical system preset
 * - `systemKey` / `systemLabel`: active base model
 * - `customItems`: array of `{ id, label, patch, today? }` for every custom parameter modification;
 *   `today` is the value under the rules of today, said next to the change (the scenario bar)
 * - `suggestedName`: human-readable name for saving this custom adjustment in the browser
 */
export function describeScenarioStatus(config, defaults) {
  if (!config || !defaults) {
    return { isOrigin: true, isCustom: false, systemKey: 'payg', systemLabel: SYSTEM_INFO.payg.plain, customItems: [], suggestedName: 'Reglas de hoy (2026)' };
  }
  const sysKey = activeSystemKey(config);
  const sysLabel = SYSTEM_INFO[sysKey]?.plain ?? sysKey;
  const canonicalBase = { ...defaults, ...(CANONICAL_SYSTEM_PATCHES[sysKey] ?? CANONICAL_SYSTEM_PATCHES.payg) };
  const sameAs = (target, key) => JSON.stringify(config[key]) === JSON.stringify(target[key]);

  const customItems = [];
  const handled = new Set(['system', 'mix', 'transitionMode', 'transitionYears', 'transitionCutoffAge', 'transitionTargetFunded', 'transitionPublicPillar', 'transitionNdcShare', 'transitionRelaySchedule', 'capitalizationStyle']);

  // Check if transition / system parameters themselves were customized away from canonical preset
  // The relay calendar only matters while the two-stage relay is selected, and the
  // duration does nothing when the pace follows today's pensions.
  const transitionCustom = [...handled].some(k => !sameAs(canonicalBase, k) &&
    (k !== 'transitionRelaySchedule' || config.transitionMode === 'two-stage-relay') &&
    (k !== 'transitionYears' || config.transitionMode !== 'pension-runoff'));
  if (transitionCustom) {
    customItems.push({
      id: 'custom-transition',
      label: `Cambio a un fondo, a medida (${config.transitionMode === 'pension-runoff' ? 'según fallecen los pensionistas' : `${config.transitionYears}a`} · ${config.transitionMode === 'linear-ramp' ? 'sin corte de edad' : `corte ${config.transitionCutoffAge}a`} · ${Math.round((config.transitionTargetFunded ?? 0) * 100)} % fondo${config.transitionMode === 'two-stage-relay' && config.transitionRelaySchedule === 'legacy-extended' ? ' · calendario anterior a 1.21' : ''})`,
      patch: CANONICAL_SYSTEM_PATCHES[sysKey] ?? SYSTEM_RESET_PATCH
    });
  }

  const mark = (...keys) => keys.forEach(k => handled.add(k));

  mark('retirementAge');
  if (!sameAs(defaults, 'retirementAge')) {
    customItems.push({
      id: 'retirementAge',
      label: `${settingName('retirementAge')}: ${config.retirementAge} años`,
      today: `${defaults.retirementAge} años`,
      patch: { retirementAge: defaults.retirementAge }
    });
  }

  // How the higher age comes in, right after it (docs/PROPUESTA-CALENDARIO-EDAD-2026-11-11.md). Without a
  // rise of two years or more the steps move nothing, and the bar says so.
  mark('retirementAgeStepYears');
  if (!sameAs(defaults, 'retirementAgeStepYears')) {
    const rise = config.retirementAge - defaults.retirementAge;
    customItems.push({
      id: 'retirementAgeStepYears',
      label: `La edad sube por tramos: ${ageStepsText(config.retirementAgeStepYears)}${rise > 1 ? '' : rise > 0 ? ' (sin efecto: la edad sube un solo año)' : ' (sin efecto: la edad no sube)'}`,
      today: 'de golpe',
      patch: { retirementAgeStepYears: defaults.retirementAgeStepYears }
    });
  }

  mark('pensionRevaluationMode', 'pensionRevaluationRate');
  if (!sameAs(defaults, 'pensionRevaluationMode') || !sameAs(defaults, 'pensionRevaluationRate')) {
    // 'cpi-points' is already the gap; a fixed nominal rate ('manual') is measured against this scenario's inflation.
    const diffPts = config.pensionRevaluationMode === 'cpi-points' ? (config.pensionRevaluationRate ?? 0) * 100
      : ((config.pensionRevaluationRate ?? 0) - (config.inflationRate ?? defaults.inflationRate ?? 0.02)) * 100;
    const revLabel = config.pensionRevaluationMode === 'cpi'
      ? 'con los precios (el IPC)'
      : `${points(diffPts)} ${diffPts >= 0 ? 'más' : 'menos'} que los precios, cada año`;
    customItems.push({
      id: 'revaluation',
      label: `${settingName('pensionRevaluationRate')}: ${revLabel}`,
      today: defaults.pensionRevaluationMode === 'cpi' ? 'con los precios (el IPC)' : undefined,
      patch: { pensionRevaluationMode: defaults.pensionRevaluationMode, pensionRevaluationRate: defaults.pensionRevaluationRate }
    });
  }

  mark('closingClause', 'closingClauseAnySystem');
  const clause = closingClauseChange(config, defaults);
  if (clause) customItems.push({ id: 'closingClause', label: clause.short, patch: clause.patch });

  mark('replacementRate');
  if (Math.abs((config.replacementRate ?? 0.77) - (defaults.replacementRate ?? 0.77)) > 1e-4) {
    customItems.push({
      id: 'replacementRate',
      label: `${settingName('replacementRate')}: ${Math.round(config.replacementRate * 100)} %`,
      today: `${Math.round((defaults.replacementRate ?? 0.77) * 100)} %`,
      patch: { replacementRate: defaults.replacementRate }
    });
  }

  mark('irpfSurcharge');
  if (Math.abs((config.irpfSurcharge ?? 0) - (defaults.irpfSurcharge ?? 0)) > 1e-4) {
    customItems.push({
      id: 'irpfSurcharge',
      label: `${settingName('irpfSurcharge')}: +${fmtNum(config.irpfSurcharge * 100, 1)} %`,
      today: 'sin recargo',
      patch: { irpfSurcharge: defaults.irpfSurcharge }
    });
  }

  mark('vatSurcharge');
  if (Math.abs((config.vatSurcharge ?? 0) - (defaults.vatSurcharge ?? 0)) > 1e-4) {
    customItems.push({
      id: 'vatSurcharge',
      label: `${settingName('vatSurcharge')}: +${fmtNum(config.vatSurcharge * 100, 1)} %`,
      today: 'sin recargo',
      patch: { vatSurcharge: defaults.vatSurcharge }
    });
  }

  mark('otherTaxSurcharge');
  if (Math.abs((config.otherTaxSurcharge ?? 0) - (defaults.otherTaxSurcharge ?? 0)) > 1e-4) {
    customItems.push({
      id: 'otherTaxSurcharge',
      label: `${settingName('otherTaxSurcharge')}: +${fmtNum(config.otherTaxSurcharge * 100, 1)} %`,
      today: 'sin recargo',
      patch: { otherTaxSurcharge: defaults.otherTaxSurcharge }
    });
  }

  mark('contributionRate');
  if (Math.abs((config.contributionRate ?? 0) - (defaults.contributionRate ?? 0)) > 1e-4) {
    const delta = (config.contributionRate - defaults.contributionRate) * 100;
    customItems.push({
      id: 'contributionRate',
      label: `${settingName('contributionRate')}: ${delta >= 0 ? '+' : '−'}${points(delta)}`,
      today: 'la de 2026',
      patch: { contributionRate: defaults.contributionRate }
    });
  }

  mark('paymentAdjustments');
  if (!sameAs(defaults, 'paymentAdjustments') && Array.isArray(config.paymentAdjustments) && config.paymentAdjustments.length > 0) {
    const first = config.paymentAdjustments[0];
    const lbl = config.paymentAdjustments.length === 1 && first.publicPensionCut === 0 && first.otherSpendingCut > 0
      ? `${settingName('paymentAdjustments')}: −${fmtNum(first.otherSpendingCut * 100, 1)} %`
      : `Plan de recortes de pensiones y otros pagos (${config.paymentAdjustments.length})`;
    customItems.push({
      id: 'paymentAdjustments',
      label: lbl,
      today: 'sin recortes',
      patch: { paymentAdjustments: defaults.paymentAdjustments }
    });
  }

  mark('fiscalRescues');
  if (!sameAs(defaults, 'fiscalRescues') && Array.isArray(config.fiscalRescues) && config.fiscalRescues.length > 0) {
    customItems.push({
      id: 'fiscalRescues',
      label: `${settingName('fiscalRescues')} (${config.fiscalRescues.length})`,
      today: 'ninguno',
      patch: { fiscalRescues: defaults.fiscalRescues }
    });
  }

  mark('debtRestructurings');
  if (!sameAs(defaults, 'debtRestructurings') && Array.isArray(config.debtRestructurings) && config.debtRestructurings.length > 0) {
    customItems.push({
      id: 'debtRestructurings',
      label: `${settingName('debtRestructurings')} (${config.debtRestructurings.length})`,
      today: 'ninguna',
      patch: { debtRestructurings: defaults.debtRestructurings }
    });
  }

  mark('entrantGrowth');
  if (Math.abs((config.entrantGrowth ?? 0) - (defaults.entrantGrowth ?? 0)) > 1e-5) {
    const delta = config.entrantGrowth * 100;
    customItems.push({
      id: 'entrantGrowth',
      label: `${settingName('entrantGrowth')}: ${delta >= 0 ? '+' : '−'}${fmtNum(Math.abs(delta), 2)} % al año`,
      today: 'la referencia',
      patch: { entrantGrowth: defaults.entrantGrowth }
    });
  }

  mark('productivityGrowth', 'realWageGrowth');
  if (Math.abs((config.productivityGrowth ?? 0) - (defaults.productivityGrowth ?? 0)) > 1e-5 ||
      Math.abs((config.realWageGrowth ?? 0) - (defaults.realWageGrowth ?? 0)) > 1e-5) {
    const delta = (config.productivityGrowth || config.realWageGrowth || 0) * 100;
    customItems.push({
      id: 'productivityGrowth',
      label: `${settingName('productivityGrowth')}: ${delta >= 0 ? '+' : '−'}${fmtNum(Math.abs(delta), 2)} puntos al año`,
      today: 'la referencia',
      patch: { productivityGrowth: defaults.productivityGrowth, realWageGrowth: defaults.realWageGrowth }
    });
  }

  mark('targetFertility');
  if (!sameAs(defaults, 'targetFertility') && (config.targetFertility ?? 0) > 0) {
    customItems.push({
      id: 'targetFertility',
      label: `${settingName('targetFertility')}: ${fmtNum(config.targetFertility, 1)}`,
      today: 'la referencia oficial',
      patch: { targetFertility: defaults.targetFertility }
    });
  }

  mark('longevityGain');
  if (Math.abs((config.longevityGain ?? 0) - (defaults.longevityGain ?? 0)) > 1e-5) {
    const age = config.retirementAge ?? 65;
    const lifeAt = year => Math.round(lifeExpectancyAtRetirement(config.longevityGain ?? 0, year, age));
    customItems.push({
      id: 'longevityGain',
      label: `${settingName('longevityGain')}: quien se jubila a los ${age} vive hasta ~${lifeAt(2026)}→${lifeAt(2050)}→${lifeAt(2070)}`,
      today: 'la de partida',
      patch: { longevityGain: defaults.longevityGain }
    });
  }

  mark('realReturn');
  if (Math.abs((config.realReturn ?? 0.03) - (defaults.realReturn ?? 0.03)) > 1e-5) {
    customItems.push({
      id: 'realReturn',
      label: `${settingName('realReturn')}: ${fmtNum(config.realReturn * 100, 1)} %`,
      today: `${fmtNum((defaults.realReturn ?? 0.03) * 100, 1)} %`,
      patch: { realReturn: defaults.realReturn }
    });
  }

  for (const k of Object.keys(AI_RESET_PATCH)) mark(k);
  if (hasAiShock(config)) {
    const hours = Math.round(((config.aiAutomationShare ?? 0) + (config.robotAutomationShare ?? 0)) * 100);
    const unemployedPct = Math.round(((config.aiAutomationShare ?? 0) + (config.robotAutomationShare ?? 0)) * (1 - (config.automationRedeployment ?? 1)) * 100);
    const regime = config.automationRegime ?? 'status-quo-payroll';
    const isPureUnemploymentLever = regime === 'status-quo-payroll' && (config.automationProductivityGain ?? 0) === 0 && (config.robotAutomationShare ?? 0) === 0 && unemployedPct > 0;
    if (isPureUnemploymentLever) {
      customItems.push({
        id: 'ai',
        label: `IA: paro adicional +${unemployedPct} %`,
        today: 'sin ola de IA',
        patch: AI_RESET_PATCH
      });
    } else {
      const what = regime.startsWith('demarquia') ? 'Demarquía' : regime === 'robot-tax-payg' ? 'impuesto robots' : regime === 'capital-boom-dividend' ? 'dividendo robots' : `paro IA ${unemployedPct} %`;
      customItems.push({
        id: 'ai',
        label: `IA: ${hours} % de las horas · ${what}`,
        today: 'sin ola de IA',
        patch: AI_RESET_PATCH
      });
    }
  }

  // Every other change by its name, the catalogue's (docs/PROPUESTA-ORDEN-AJUSTES-2026-11-10.md, batch 3): until
  // 10/11/2026 they were «N supuestos lab», and the bar is there to say what has been changed. The share of the
  // other revenue that the tax surcharges move by the budget rule is not a change of its own.
  const remainingKeys = Object.keys(defaults).filter(k => !handled.has(k) && !sameAs(defaults, k) && (k !== 'pensionBudgetShare' || budgetShareSetApart(config, defaults)));
  for (const key of remainingKeys) {
    const value = settingValueText(key, config[key]);
    customItems.push({
      id: key,
      label: value === null ? `${settingName(key) ?? key}: cambiado` : `${settingName(key) ?? key}: ${value}`,
      today: settingValueText(key, defaults[key]) ?? undefined,
      patch: { [key]: defaults[key] }
    });
  }

  const isCustom = customItems.length > 0;
  const isOrigin = sysKey === 'payg' && !isCustom;
  const shortSys = sysKey === 'progressive' ? 'Mixto progresivo'
    : sysKey === 'retro1985' ? 'Desde 1985'
    : sysKey === 'ndc' ? SYSTEM_INFO.ndc.plain
    : sysKey === 'payg' ? 'Reparto'
    : sysLabel;
  // The name offered for «Mis escenarios» (60 letters at most): whole changes while they fit, then how many more.
  // The names are the catalogue's since 10/11/2026 and longer: cut at 58 letters, they ended in the middle of a word.
  let suggestedName = shortSys, named = 0;
  for (const item of customItems) {
    const rest = customItems.length - named - 1;
    const next = `${suggestedName} · ${item.label}`;
    if (next.length + (rest ? ` · y ${rest} más`.length : 0) > 58) break;
    suggestedName = next; named++;
  }
  if (named < customItems.length) suggestedName += ` · ${named ? 'y ' : ''}${customItems.length - named} cambio${customItems.length - named > 1 ? 's' : ''}${named ? ' más' : ''}`;

  return {
    isOrigin,
    isCustom,
    systemKey: sysKey,
    systemLabel: sysLabel,
    customItems,
    suggestedName
  };
}
