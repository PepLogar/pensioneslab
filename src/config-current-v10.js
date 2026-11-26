/** Future scenarios extend the current model without changing the v9 contract. */
import { resolveConfig as resolvePreviousConfig } from './config-current-v9.js';
import { DEFAULT_SOVEREIGN_RISK, SOVEREIGN_RISK_MODELS } from './sovereign-risk-premium.js';
import { DEFAULT_ISSUANCE_TERM_YEARS } from './debt-issuance.js';
import { NDC_OPTIONS_DEFAULTS, NDC_OPTIONS_RANGES } from './shared/ndc-options.js';
import { NDC_PAST_RIGHTS_DEFAULTS, NDC_PAST_RIGHTS_RANGES } from './shared/ndc-past-rights.js';
import { PAYABLE_PENSION_DEFAULTS, PAYABLE_PENSION_RANGES } from './shared/payable-pension.js';
import { STRESS_PREMIUM_DEFAULTS, STRESS_PREMIUM_RANGES } from './shared/stress-premium.js';
import { POINTS_DEFAULTS, POINTS_RANGES } from './shared/points-system.js';
import { RETIREMENT_DELAY_DEFAULTS, RETIREMENT_DELAY_RANGES } from './shared/retirement-delay.js';
import { PUBLIC_CAPITAL_DEFAULTS, PUBLIC_CAPITAL_RANGES } from './shared/public-capital.js';
import { AGE_STEPS_DEFAULTS, AGE_STEPS_RANGES } from './shared/retirement-age-steps.js';
import { LAFFER_FULL_DEFAULTS, LAFFER_FULL_RANGES, LAFFER_VAT_DEFAULTS, LAFFER_VAT_RANGES } from './shared/laffer-response.js';
import { CLOSING_CLAUSE_MODES, CLOSING_CLAUSE_DEFAULTS, CLOSING_CLAUSE_RANGES } from './shared/closing-clause.js';
import { DEFAULT_PROGRESSIVE_TRANSITION, TRANSITION_MODES, TRANSITION_PUBLIC_PILLARS, TRANSITION_RELAY_SCHEDULES, CAPITALIZATION_STYLES, AUTOMATION_REGIMES } from './progressive-transition.js';
export * from './config-current-v9.js';
export { DEFAULT_SOVEREIGN_RISK } from './sovereign-risk-premium.js';
export { DEFAULT_NEW_DEBT_TERM_YEARS } from './debt-term.js';
export { DEFAULT_ISSUANCE_TERM_YEARS } from './debt-issuance.js';
export { DEFAULT_PROGRESSIVE_TRANSITION, TRANSITION_MODES, TRANSITION_PUBLIC_PILLARS, TRANSITION_RELAY_SCHEDULES, CAPITALIZATION_STYLES, AUTOMATION_REGIMES } from './progressive-transition.js';

export const DEFAULT_FUTURE_SCENARIO = Object.freeze({
  targetFertility: 0,
  productivityGrowth: 0,
  aiAutomationShare: 0,
  robotAutomationShare: 0,
  automationTargetYear: 2030,
  automationRedeployment: 1,
  automationProductivityGain: 0,
  automationWagePassThrough: 1,
  reemploymentWageLoss: 0,
  displacementSupportRate: .4,
  // Share of the gain in life expectancy at 65 (since 2027) added to the retirement age of each generation.
  retirementAgeLink: 0,
  // 1: the link follows healthy life years (healthyLifeShare of the gain) instead of all years.
  retirementAgeLinkHealthy: 0,
  // Highest reference retirement age the link may reach (0 = no limit).
  retirementAgeCap: 0,
  // 1, the default since 1.68 (decision of the author, 24/11/2026, as the Ageing Report and the AIReF): the effective
  // retirement age follows the Ageing Report 2024 path of the labour-market exit age; each generation gets its rise
  // over 2026 in the year it turns 65 (+1.37 years from 2040). 0: the observed 2026 profile of retirement ages stays
  // frozen, as up to 1.67.
  retirementAgeExitPath: 1,
  // The population: 0, the default, EUROPOP2025 (since 1.55), with the Ageing Report levels of people
  // rebased to it; 1, EUROPOP2023, the population the Ageing Report 2024 was computed with (24/11/2026).
  europop2023: 0,
  // With the age path: 0, the default, the years it adds earn the delay bonus (the law, as the AIReF
  // models it); 1, they earn no extra pension, as in the Ageing Report (24/11/2026).
  exitPathNoExtraPension: 0,
  // The RETA reform still to deploy until 2032 (≈ 0.38 % of GDP, src/current-policy-v7.js): 1, the default since 1.71
  // (decision of the author, 24/11/2026: it is law and the AIReF counts it), it comes in as the AIReF estimates;
  // 0, the self-employed bases keep following wages from 2026, as up to 1.70.
  retaReform2032: 1,
  // Employment and inflation until 2030 as the AIReF expects (src/shared/short-run-employment.js): 1, the default
  // since 1.69 (decision of the author, 24/11/2026: to look as much as possible like the AIReF in the short run);
  // 0, the Ageing Report's reference employment and the scenario's inflation, as up to 1.68.
  airefShortRunEmployment: 1,
  // Share of the Ageing Report pressure of ageing on health and long-term care spending included
  // (1 = the official pressure, the default since 1.25; 0 = the constant share of GDP used before).
  ageingCareSpending: 1,
  // Share of the years of life gained that are lived in good health (Ageing Report baseline: 0.5).
  healthyLifeShare: 0.5,
  // Share of the domestic pension fund subtracted from the gross-debt variable of
  // the risk index (0 = gross debt, the default since 1.32). An optional
  // hypothesis: the fund belongs to its members, not to the State. It never
  // changes the debt path. Since 1.36 it touches only that one variable.
  crisisFundBackingWeight: 0,
  // Risk of fiscal stress (src/shared/sovereign-risk.js): fiscal S0 index levels
  // (0.36 published by the Commission; 0.29 moderate, a project adaptation), years
  // in a row that make a high risk «sustained», and years of primary balance below
  // the debt-stabilising one, with the debt rising, that make it «not stabilising».
  riskHighIndex: 0.36,
  riskModerateIndex: 0.29,
  riskSustainYears: 2,
  riskStabilisationYears: 5,
  // Narrative of rescue, haircut and default (src/shared/crisis-narrative.js):
  // editable assumptions of the project, not published rules. 1 = shown.
  narrativeMilestones: 1,
  narrativeBailoutYears: 2,
  narrativeRestructuringYears: 3,
  // 1 = the «sin rescate» path: the rescue is not granted and default follows.
  narrativeNoRescue: 0,
  // Pension adequacy, apart from the debt: average pension over average wage
  // below this floor (ILO Convention 102: 40 % of previous earnings).
  pensionAdequacyFloor: 0.40,
  // Response of the labour tax base to higher pension contributions and IRPF
  // (src/shared/laffer-response.js): long-run self-financing of a labour tax
  // change (Trabandt and Uhlig, Spain: 0.46; 0 = static revenue, as before
  // 1.37) and years to reach it (an assumption of the project).
  lafferSelfFinancing: 0.46,
  lafferAdjustYears: 10,
  // Retired in 1.54: 1 lowered GDP alone (default in 1.38–1.52). Still accepted so
  // older scenarios load, and ignored by the engine and the cache key.
  lafferOutputResponse: 0,
  // 1 = the full response (option 2c, docs/PLAN-1.54-LAFFER-COMPLETO.md), the default
  // since 1.54: the lost hours lower payroll, contributions, new rights and GDP, and the
  // revenue loss counts once. 0 = the 1.53 response, a revenue line only.
  ...LAFFER_FULL_DEFAULTS,
  // 1 = the VAT surcharge enters the labour wedge too, as in Trabandt and Uhlig, with the
  // full response only (option 3b, docs/DECISIONES-PALANCAS-INGRESOS.md, section 4). The
  // default since 1.56 (docs/PLAN-1.56-LOTE.md); 0 = the VAT does not change the hours.
  ...LAFFER_VAT_DEFAULTS,
  // Taxes without a model of their own (property, transactions, other): 1, the default since 1.67, they follow
  // nominal GDP, as the AIReF assumes (elasticity 1.00 of its «Resto»: Opinión sobre la sostenibilidad 2025,
  // cuadro 8, págs. 92–93); 0 = held in real euros, as up to 1.66. A choice of assumption, not data.
  unmodeledTaxesFollowGDP: 1,
  ...RETIREMENT_DELAY_DEFAULTS,
  ...PUBLIC_CAPITAL_DEFAULTS,
  // 0 = a higher retirement age reaches everyone at once from 2027; N = one more year every N years.
  ...AGE_STEPS_DEFAULTS,
  // Contribution-rate points that are new base (formalised undeclared work), not a
  // higher wedge: left out of the Laffer response. Set by the «fraude cero» panel.
  lafferExemptContribution: 0,
  // Short-run multiplier of other-spending cuts (src/shared/cut-multiplier.js):
  // Banco de España for Spain, 0.6 in tranquil times and 1.4 in turbulent ones
  // (here: after a year of high fiscal-stress risk). 0 = no GDP effect, as before 1.38.
  cutMultiplierCalm: 0.6,
  cutMultiplierStress: 1.4,
  // Notional-account design options and an extra funded contribution
  // (src/shared/ndc-options.js), all off by default since 1.39.
  ...NDC_OPTIONS_DEFAULTS,
  // Experiment (1.52): notional capital for the years worked before 2027
  // (src/shared/ndc-past-rights.js), off by default and then out of the cache key.
  ...NDC_PAST_RIGHTS_DEFAULTS,
  // The pension that could be paid after a break (src/shared/payable-pension.js):
  // presentation assumptions, like the narrative; they never change the engine.
  ...PAYABLE_PENSION_DEFAULTS,
  // Optional stress premium on new debt after a year of high risk (src/shared/stress-premium.js).
  ...STRESS_PREMIUM_DEFAULTS,
  // Points system in the German style (src/shared/points-system.js), off by default.
  ...POINTS_DEFAULTS,
  // The 2023 closing clause (src/shared/closing-clause.js): on since 1.46 in today's PAYG law.
  ...CLOSING_CLAUSE_DEFAULTS
});

const RANGES = Object.freeze({
  productivityGrowth: [-.02, .04],
  // 1.43: up to 95 % of hours automated in total, for the no-work world of «Otro tablero»
  // (docs/PLAN-1.43-DEMARQUIA.md). Together they cannot pass 100 %: checked below.
  aiAutomationShare: [0, .7],
  robotAutomationShare: [0, .45],
  automationTargetYear: [2027, 2070, true],
  automationRedeployment: [0, 1],
  automationProductivityGain: [0, .5],
  automationWagePassThrough: [0, 1],
  reemploymentWageLoss: [0, .3],
  displacementSupportRate: [0, 1],
  retirementAgeLink: [0, 1],
  retirementAgeLinkHealthy: [0, 1, true],
  retirementAgeCap: [0, 90, true],
  retirementAgeExitPath: [0, 1, true],
  europop2023: [0, 1, true],
  exitPathNoExtraPension: [0, 1, true],
  retaReform2032: [0, 1, true],
  airefShortRunEmployment: [0, 1, true],
  ageingCareSpending: [0, 1],
  healthyLifeShare: [0, 1],
  crisisFundBackingWeight: [0, 0.72],
  riskHighIndex: [0.05, 1],
  riskModerateIndex: [0.05, 1],
  riskSustainYears: [1, 10, true],
  riskStabilisationYears: [1, 15, true],
  narrativeMilestones: [0, 1, true],
  narrativeBailoutYears: [1, 10, true],
  narrativeRestructuringYears: [1, 15, true],
  narrativeNoRescue: [0, 1, true],
  pensionAdequacyFloor: [0.2, 0.7],
  lafferSelfFinancing: [0, 0.9],
  lafferAdjustYears: [1, 40, true],
  lafferOutputResponse: [0, 1, true],
  ...LAFFER_FULL_RANGES,
  ...LAFFER_VAT_RANGES,
  unmodeledTaxesFollowGDP: [0, 1, true],
  ...RETIREMENT_DELAY_RANGES,
  ...PUBLIC_CAPITAL_RANGES,
  ...AGE_STEPS_RANGES,
  lafferExemptContribution: [0, 0.1],
  cutMultiplierCalm: [0, 3],
  cutMultiplierStress: [0, 3],
  ...NDC_OPTIONS_RANGES,
  ...NDC_PAST_RIGHTS_RANGES,
  ...PAYABLE_PENSION_RANGES,
  ...STRESS_PREMIUM_RANGES,
  ...POINTS_RANGES,
  ...CLOSING_CLAUSE_RANGES,
  riskDebtThreshold: [.6, 2],
  riskPremiumAt10pp: [0, .01],
  riskPremiumCap: [0, .30],
  newDebtTermYears: [1, 50],
  transitionYears: [1, 44, true],
  transitionCutoffAge: [25, 65, true],
  transitionTargetFunded: [0, 1],
  transitionNdcShare: [0, 1],
  publicAdminAutomationShare: [0, 1],
  paradigmRevenueScale: [0, 1.5],
  paradigmSupportScale: [0, 1.5],
  paradigmReturnScale: [0, 1.5],
  paradigmOutputScale: [0, 1.5],
  paradigmAdminScale: [0, 1.5],
  paradigmDividendScale: [0, 1.5]
});
const KEYS = [...Object.keys(DEFAULT_FUTURE_SCENARIO), ...Object.keys(DEFAULT_SOVEREIGN_RISK),
  'newDebtTermYears', ...Object.keys(DEFAULT_PROGRESSIVE_TRANSITION)];

/** Read stored values only; inherited keys, getters and coercion are forbidden. */
export function splitFutureConfig(input, label = 'config') {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const previous = Object.create(null), future = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string') throw new TypeError(`Unknown ${label} field: ${String(key)}`);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${label}.${key} cannot be an accessor`);
    (KEYS.includes(key) ? future : previous)[key] = descriptor.value;
  }
  return { previous, future };
}

/** Useful when asking the frozen v9 state parser to validate old metadata. */
export function stripFutureConfig(input) {
  return { ...splitFutureConfig(input).previous };
}

function validateFuture(input) {
  if (!SOVEREIGN_RISK_MODELS.includes(input.riskModel)) {
    throw new RangeError(`Invalid riskModel: expected one of ${SOVEREIGN_RISK_MODELS.join(', ')}`);
  }
  if (!Number.isFinite(input.targetFertility) ||
      (input.targetFertility !== 0 && (input.targetFertility < .8 || input.targetFertility > 2.1))) {
    throw new RangeError('Invalid targetFertility: expected 0 (reference) or 0.8…2.1');
  }
  if (!TRANSITION_MODES.includes(input.transitionMode)) {
    throw new RangeError(`Invalid transitionMode: expected one of ${TRANSITION_MODES.join(', ')}`);
  }
  if (!TRANSITION_PUBLIC_PILLARS.includes(input.transitionPublicPillar)) {
    throw new RangeError(`Invalid transitionPublicPillar: expected one of ${TRANSITION_PUBLIC_PILLARS.join(', ')}`);
  }
  if (!TRANSITION_RELAY_SCHEDULES.includes(input.transitionRelaySchedule)) {
    throw new RangeError(`Invalid transitionRelaySchedule: expected one of ${TRANSITION_RELAY_SCHEDULES.join(', ')}`);
  }
  if (!CAPITALIZATION_STYLES.includes(input.capitalizationStyle)) {
    throw new RangeError(`Invalid capitalizationStyle: expected one of ${CAPITALIZATION_STYLES.join(', ')}`);
  }
  if (!AUTOMATION_REGIMES.includes(input.automationRegime)) {
    throw new RangeError(`Invalid automationRegime: expected one of ${AUTOMATION_REGIMES.join(', ')}`);
  }
  for (const [key, [min, max, integer]] of Object.entries(RANGES)) {
    if (!Number.isFinite(input[key]) || input[key] < min || input[key] > max ||
        (integer && !Number.isInteger(input[key]))) {
      throw new RangeError(`Invalid ${key}: expected ${min}…${max}${integer ? ' (integer)' : ''}`);
    }
  }
  if (input.riskModerateIndex > input.riskHighIndex) {
    throw new RangeError('Invalid riskModerateIndex: expected at most riskHighIndex');
  }
  // A09: combinations the engine cannot run, refused here with words for the reader
  // (they start «Este escenario», as the engine's own domain messages do).
  const automated = input.aiAutomationShare + input.robotAutomationShare;
  if (automated > 1) {
    throw new RangeError('Este escenario automatiza más del 100 % de las horas de trabajo entre la IA y los robots. Baja una de las dos.');
  }
  if (automated * (1 - input.automationRedeployment) >= 1 - 1e-9) {
    throw new RangeError('Este escenario no deja ninguna hora de trabajo pagada: la IA y los robots hacen todas y nadie se recoloca. Baja la automatización o sube la recolocación.');
  }
  if (!CLOSING_CLAUSE_MODES.includes(input.closingClause)) {
    throw new RangeError(`Invalid closingClause: expected one of ${CLOSING_CLAUSE_MODES.join(', ')}`);
  }
  return Object.fromEntries(KEYS.map(key => [key, input[key]]));
}

export function resolveConfig(input = {}, defaults) {
  const patch = splitFutureConfig(input), initial = splitFutureConfig(defaults, 'defaults');
  const previous = resolvePreviousConfig(patch.previous, initial.previous);
  // Legacy contexts used one deviation for both wages and output. Only a
  // context that supplies no independent default retains that old coupling.
  // The v10 runtime supplies its own productivity default: wage edits then
  // change wages alone. Saved v9 scenarios migrate both values explicitly.
  const initialFuture = validateFuture({ ...DEFAULT_FUTURE_SCENARIO, ...DEFAULT_SOVEREIGN_RISK,
    ...DEFAULT_PROGRESSIVE_TRANSITION,
    newDebtTermYears: DEFAULT_ISSUANCE_TERM_YEARS,
    productivityGrowth: Object.hasOwn(initial.future, 'productivityGrowth')
      ? initial.future.productivityGrowth : previous.realWageGrowth,
    ...initial.future });
  return { ...previous, ...validateFuture({ ...initialFuture, ...patch.future }) };
}
