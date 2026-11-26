/**
 * Progressive Mixed Transition Engine (Mixto Progresivo).
 *
 * Models how a PAYG pension system like Spain's can transition progressively
 * toward Capitalization / Mixed pillars, exploring these transition risks:
 *   1. The Polish/Hungarian Sovereign Debt Trap (diverting 100% of cash on day 1
 *      while paying 100% of legacy pensions, triggering a sovereign risk spiral).
 *   2. The "Sandwich Generation" Compound-Interest Trap (diverting contributions
 *      of workers aged 48-64 who have <15 years left and cannot benefit from
 *      exponential compound returns, while starving the public box today).
 *   3. The Baby-Boom Peak Collision (2027-2045 demographic crest).
 *   4. The Aaron-Samuelson Net Return vs Growth Trap (r_net <= g).
 *   5. Capital Depletion vs Intergenerational Wealth Preservation.
 */

export const TRANSITION_MODES = Object.freeze([
  'none',
  'cohort-ramp',
  'two-stage-relay',
  'pension-runoff',
  'salary-cap-shield',
  'baby-boom-shield',
  'entrants-only',
  'linear-ramp'
]);

// Calendar of the two-stage relay. 'announced' reaches the target after exactly
// transitionYears; 'legacy-extended' keeps the pre-1.21 rule (16 + years - 8)
// so that scenarios saved before that version reproduce their results.
export const TRANSITION_RELAY_SCHEDULES = Object.freeze(['announced', 'legacy-extended']);

export const TRANSITION_PUBLIC_PILLARS = Object.freeze([
  'system-default',
  'ndc-bridge',
  'payg-bridge',
  'custom-split'
]);

export const CAPITALIZATION_STYLES = Object.freeze([
  'balanced-standard',
  'lifecycle-ap7',
  'collective-cdc',
  'common-fund',
  'dividend-endowment',
  'sovereign-captive'
]);

export const AUTOMATION_REGIMES = Object.freeze([
  'status-quo-payroll',
  'robot-tax-payg',
  'capital-boom-dividend',
  'demarquia-funcionarios-primero',
  'demarquia-planetaria-au50'
]);

/**
 * How much of each favourable assumption of an automation regime is taken as true.
 * 1 reproduces the coefficients built into each regime; 0 removes that channel.
 * The same six dimensions apply to every regime, so families of solutions can be
 * compared on equal terms ("what has to be true for it to work").
 */
export const PARADIGM_ASSUMPTION_KEYS = Object.freeze([
  'paradigmRevenueScale',   // new revenue from automated production or profits
  'paradigmSupportScale',   // share of support for displaced workers paid outside the state
  'paradigmReturnScale',    // extra return on capital from AI
  'paradigmOutputScale',    // extra (or lost) output relative to the payroll economy
  'paradigmAdminScale',     // savings from automating public administration
  'paradigmDividendScale'   // citizen dividend counted as income of retirees
]);
export const DEFAULT_PARADIGM_ASSUMPTIONS = Object.freeze(Object.fromEntries(PARADIGM_ASSUMPTION_KEYS.map(key => [key, 1])));

export const DEFAULT_PROGRESSIVE_TRANSITION = Object.freeze({
  transitionMode: 'none',
  transitionYears: 20,
  transitionCutoffAge: 48,
  transitionTargetFunded: 0.65,
  transitionPublicPillar: 'ndc-bridge',
  transitionNdcShare: 0.85,
  transitionRelaySchedule: 'announced',
  capitalizationStyle: 'balanced-standard',
  automationRegime: 'status-quo-payroll',
  publicAdminAutomationShare: 0,
  ...DEFAULT_PARADIGM_ASSUMPTIONS
});

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Stage lengths of the two-stage relay, in years after the base year. The
 * announced calendar keeps the 16-year Baby Boom stage when the ramp is long
 * enough (two thirds of the duration otherwise) and ends at transitionYears.
 */
export function relayStageYears(config = {}) {
  const transitionYears = clamp(Number.isFinite(config.transitionYears) ? config.transitionYears : 20, 1, 44);
  if (config.transitionRelaySchedule === 'legacy-extended') {
    return { stage1: 16, stage2: Math.max(1, transitionYears - 8) };
  }
  const stage1 = transitionYears < 2 ? 0 : clamp(Math.round(transitionYears * 2 / 3), 1, Math.min(16, transitionYears - 1));
  return { stage1, stage2: transitionYears - stage1 };
}

/** Tags who is paid a pension in the base year; returns how many they are. */
export function markBasePensioners(cohorts) {
  let people = 0;
  for (const item of cohorts) {
    if (!item.retired) continue;
    item.basePensioner = true;
    people += item.size;
  }
  return people;
}

/** The share of the base year's pensioners who are still alive. */
export function basePensionersLeft(cohorts, people) {
  let left = 0;
  for (const item of cohorts) if (item.basePensioner) left += item.size;
  return people > 0 ? left / people : 0;
}

/**
 * Computes the cohort-specific and year-specific pillar weights { payg, ndc, funded }
 * for an active cohort `item` in simulation `year`.
 *
 * Guaranteed invariants:
 * - payg >= 0, ndc >= 0, funded >= 0
 * - payg + ndc + funded === 1
 * - When config.transitionMode === 'none', returns `baseWeights` unchanged.
 *
 * `pensionersLeft` is the share of the base year's pensioners still alive, read only by
 * 'pension-runoff'. The engine measures it; with the default nobody has gone yet.
 */
export function cohortTransitionWeights(item, year, config, baseWeights, baseYear = 2026, pensionersLeft = 1) {
  const mode = config?.transitionMode ?? 'none';
  if (mode === 'none' || year <= baseYear) {
    return baseWeights;
  }

  // If the user selected a progressive transition while in 'payg' or 'ndc',
  // or in 'mixed'/'funded', determine the long-run target funded share:
  // - In 'funded': target is 1.0 (100% capitalization at full maturity)
  // - In 'mixed' (or when progressive transition is activated): uses transitionTargetFunded
  //   if system === 'mixed' and transitionTargetFunded > 0, or baseWeights.funded.
  const rawTargetFunded = config.system === 'funded'
    ? 1
    : config.system === 'mixed'
      ? clamp(Number.isFinite(config.transitionTargetFunded) ? config.transitionTargetFunded : baseWeights.funded, 0, 1)
      : baseWeights.funded;

  // A mixed system with a 0 % target keeps its public split and sends nothing to the fund: falling back to the
  // static mix would send a third «de golpe» (1.76; docs/REVISION-ADVERSARIAL-2026-11-25.md, 7).
  if (rawTargetFunded <= 0 && config.system !== 'mixed') {
    return baseWeights;
  }

  const transitionYears = clamp(Number.isFinite(config.transitionYears) ? config.transitionYears : 20, 1, 44);
  const cutoffAge = clamp(Number.isFinite(config.transitionCutoffAge) ? config.transitionCutoffAge : 48, 25, 65);
  // 8-year cohort phase-in band below cutoffAge (Swedish 1938-1953 style):
  // workers aged <= cutoffAge - 8 in 2026 still have >= 23-25 years of compound
  // interest ahead of them and participate fully in the progressive ramp.
  const youngFullAge = Math.max(22, cutoffAge - 8);
  const ageAtStart = baseYear - item.birthYear;
  const elapsed = Math.max(0, year - baseYear);

  // 1. Generational cohort factor:
  // Workers <= youngFullAge participate at 100%; workers above cutoffAge are shielded from
  // heavy Stage-2 PAYG carve-outs, but (except in entrants-only or captive-trap) participate
  // in the universal Stage-1 occupational/MEI seed (~2.5-3.5% of salary, like Sweden's AP7 floor)
  // so every retiring cohort between 2030 and 2045 also builds a real heritable capital cushion.
  const seniorSeed = (mode === 'entrants-only' || config.capitalizationStyle === 'sovereign-captive')
    ? 0
    : clamp(0.48 * (1 - (ageAtStart - cutoffAge) / Math.max(8, 68 - cutoffAge)), 0.28, 0.48);
  const cohortFactor = ageAtStart <= youngFullAge
    ? 1
    : ageAtStart >= cutoffAge
      ? seniorSeed
      : clamp(seniorSeed + (1 - seniorSeed) * ((cutoffAge - ageAtStart) / Math.max(1, cutoffAge - youngFullAge)), seniorSeed, 1);

  // 2. Time ramp factor (0 -> 1 over transitionYears)
  const linearTimeRamp = clamp(elapsed / transitionYears, 0.12, 1);

  // 3. Demographic baby-boom shield factor:
  // Keeps cash diversion gentler during 2027-2043 (baby boom retirement inflow)
  // and accelerates from 2044-2070 as legacy obligations naturally subside.
  const boomShieldRamp = elapsed <= 16
    ? clamp(0.18 + 0.37 * (elapsed / 16), 0.18, 0.55)
    : clamp(0.55 + 0.45 * ((elapsed - 16) / Math.max(1, transitionYears - 8)), 0.55, 1);

  let progress = 1;
  if (mode === 'cohort-ramp') {
    const ramp = clamp(0.45 + 0.55 * (elapsed / transitionYears), 0.45, 1);
    progress = cohortFactor * ramp;
  } else if (mode === 'two-stage-relay') {
    // Stage 1 (2027-2042, Baby Boom peak): moderate funded entry for young cohorts (30% -> 58%),
    // while shifting the remaining public contributions from classic PAYG to Notional (NDC).
    // Stage 2 (post-peak): relay from NDC to Funded up to 100% of target. With the
    // announced calendar both stages end at transitionYears (see relayStageYears).
    const { stage1, stage2 } = relayStageYears(config);
    const relayRamp = elapsed <= stage1
      ? clamp(0.30 + 0.28 * (elapsed / stage1), 0.30, 0.58)
      : stage2 > 0 ? clamp(0.58 + 0.42 * ((elapsed - stage1) / stage2), 0.58, 1) : 1;
    progress = cohortFactor * relayRamp;
  } else if (mode === 'pension-runoff') {
    // The author's definition (7/11/2026): no calendar, the fund grows as today's pensions end.
    // Other pensions are still entering: docs/PROPUESTA-RITMO-MIXTO-PROGRESIVO-2026-11-07.md.
    progress = cohortFactor * (1 - clamp(pensionersLeft, 0, 1));
  } else if (mode === 'salary-cap-shield') {
    // Solid public base + fast capitalization of middle/upper contribution capacity for active cohorts
    const capRamp = clamp(0.60 + 0.40 * (elapsed / Math.max(1, transitionYears * 0.75)), 0.60, 1);
    progress = cohortFactor * capRamp;
  } else if (mode === 'entrants-only') {
    progress = cohortFactor;
  } else if (mode === 'linear-ramp') {
    progress = linearTimeRamp;
  } else if (mode === 'baby-boom-shield') {
    progress = cohortFactor * boomShieldRamp;
  }

  const funded = clamp(rawTargetFunded * progress, 0, 1);
  const publicShare = 1 - funded;

  const publicPillar = config?.transitionPublicPillar ?? 'ndc-bridge';
  if (publicPillar === 'ndc-bridge' || publicPillar === 'custom-split') {
    const ndcShare = clamp(Number.isFinite(config.transitionNdcShare) ? config.transitionNdcShare : 0.85, 0, 1);
    // In two-stage-relay, even older cohorts above cutoffAge convert new accrual
    // from classic PAYG to Notional Accounts so structural deficit stops growing immediately.
    const effectiveNdcShare = mode === 'two-stage-relay'
      ? Math.max(ndcShare, 0.85)
      : ndcShare;
    const ndc = publicShare * effectiveNdcShare;
    const payg = publicShare - ndc;
    return { payg, ndc, funded };
  }
  if (publicPillar === 'payg-bridge') {
    return { payg: publicShare, ndc: 0, funded };
  }

  // 'system-default': preserve relative payg/ndc split from baseWeights, defaulting to payg
  const basePublic = baseWeights.payg + baseWeights.ndc;
  if (basePublic > 1e-9) {
    const payg = publicShare * (baseWeights.payg / basePublic);
    const ndc = publicShare - payg;
    return { payg, ndc, funded };
  }
  return { payg: publicShare, ndc: 0, funded };
}

/**
 * Compatibility metadata only. A progressive transition has no autonomous
 * institutional match or AP1/MEI reserve in this model. Funding must pass through
 * a real, identified balance before any support can be introduced.
 */
/**
 * Presentation helper: calendar year in which the time ramp of `cohortTransitionWeights`
 * reaches its full target for a fully participating cohort. It mirrors the formulas above
 * without changing them: the relay follows `relayStageYears`; the Baby Boom shield runs
 * 16 years plus `transitionYears - 8`.
 * Returns null for modes without a time ramp ('none', 'entrants-only', 'pension-runoff').
 */
export function transitionRampEndYear(config = {}, baseYear = 2026) {
  const mode = config.transitionMode ?? 'none';
  const transitionYears = clamp(Number.isFinite(config.transitionYears) ? config.transitionYears : 20, 1, 44);
  const relay = relayStageYears(config);
  const elapsed = mode === 'two-stage-relay'
    ? relay.stage1 + relay.stage2
    : mode === 'baby-boom-shield'
    ? 16 + Math.max(1, transitionYears - 8)
    : mode === 'salary-cap-shield'
      ? Math.max(1, transitionYears * 0.75)
      : mode === 'cohort-ramp' || mode === 'linear-ramp'
        ? transitionYears
        : null;
  return elapsed === null ? null : baseYear + Math.ceil(elapsed);
}

/** Short and long labels for the ramp slider, using the effective completion year. */
export function describeTransitionRamp(config = {}, baseYear = 2026) {
  if (config.transitionMode === 'pension-runoff') {
    return { value: 'Según fallecen los pensionistas de hoy', hint: `Sin calendario: el fondo crece conforme fallecen quienes cobraban pensión en ${baseYear}, así que la duración no cambia el resultado.` };
  }
  const years = config.transitionYears ?? 20;
  const endYear = transitionRampEndYear(config, baseYear);
  if (endYear === null) {
    return { value: `${years} años · sin rampa temporal`, hint: 'Este algoritmo aplica la meta desde el primer año según la edad; la duración no cambia el resultado.' };
  }
  const legacy = config.transitionMode === 'two-stage-relay' && config.transitionRelaySchedule === 'legacy-extended'
    ? ' Calendario anterior a 1.21, conservado de un escenario guardado: dura más de lo indicado.' : '';
  const stage1 = config.transitionMode === 'two-stage-relay' ? relayStageYears(config).stage1
    : config.transitionMode === 'baby-boom-shield' ? 16 : null;
  return {
    value: `${years} años · meta plena en ${endYear}`,
    hint: stage1 > 0 && endYear - baseYear > stage1
      ? `Dos etapas: ${stage1} años de entrada suave (${baseYear + 1}–${baseYear + stage1}) y relevo de ${endYear - baseYear - stage1} años hasta ${endYear}.${legacy}`
      : `La cuota al fondo alcanza la meta de las cohortes jóvenes en ${endYear}.${legacy}`
  };
}

/**
 * Presentation helper for the cutoff age. Mirrors `seniorSeed` in `cohortTransitionWeights`:
 * cohorts above the cutoff keep their previous rights, but in most modes they still send a
 * reduced share (28–48 % of the full-participation rate) of new eligible contributions to the fund.
 */
export function describeTransitionCutoff(config = {}) {
  const mode = config.transitionMode ?? 'none';
  const cutoff = config.transitionCutoffAge ?? 48;
  if (mode === 'linear-ramp') {
    return { value: `${cutoff} años · no se aplica`, hint: 'La rampa anual trata igual a todas las edades: este algoritmo no usa la edad de corte.' };
  }
  if (mode === 'entrants-only' || config.capitalizationStyle === 'sovereign-captive') {
    return { value: `≥ ${cutoff} años: sin aportación al fondo`, hint: 'Los mayores del corte no envían cuotas nuevas al fondo; sus derechos previos siguen protegidos.' };
  }
  return {
    value: `≥ ${cutoff} años: aportación reducida`,
    hint: 'Los mayores del corte conservan sus derechos previos, pero envían al fondo entre el 28 % y el 48 % del ritmo pleno; sus nuevos devengos públicos cambian.'
  };
}

export function describeProgressiveTransitionFiscalShield(year, config = {}, baseYear = 2026) {
  return {
    active: config.transitionMode !== undefined && config.transitionMode !== 'none' && year > baseYear,
    coInvestmentMatchFactor: 1,
    treasuryCarveOutShare: 1,
    abmPublicBenefitFactor: 1,
    fundingSource: 'none'
  };
}

/**
 * Computes the macroeconomic, fiscal, capital-return and Citizen/Planetary Dividend
 * effects of the selected AI/Robotics & RBU/Demarquía regime (`automationRegime`).
 *
 * When `automationRegime === 'status-quo-payroll'` and `publicAdminAutomationShare === 0`,
 * returns strictly neutral values so all baseline tests remain 100% unchanged.
 */
export function describeAutomationParadigmEffect(year, config = {}, tech = {}, baseYear = 2026) {
  const regime = config?.automationRegime ?? 'status-quo-payroll';
  const rawAdminShare = clamp(Number.isFinite(config?.publicAdminAutomationShare) ? config.publicAdminAutomationShare : 0, 0, 1);

  if ((regime === 'status-quo-payroll' && rawAdminShare === 0) || year <= baseYear) {
    return {
      regime,
      active: false,
      progress: tech?.progress ?? 0,
      autonomousGdpMultiplier: 1,
      productivityFrictionFactor: 1,
      aiCapitalReturnBoost: 0,
      robotEquityContribBoost: 0,
      effectiveAdminShare: 0,
      publicAdminAutomatedPosts: 0,
      cap1NetSavings: 0,
      cap2InvisibleSavings: 0,
      iutAdminSavings: 0,
      robotOrIutRevenueBoost: 0,
      displacementSupportOffset: 0,
      fiscalRevenueDelta: 0,
      fiscalSpendingDelta: 0,
      citizenDividendMonthly: 0,
      purchasingPowerMultiplier: 1,
      citizenDividendEffectiveMonthly: 0,
      demarquiaPensionBonusAnnual: 0
    };
  }

  const targetYear = clamp(Number.isInteger(config?.automationTargetYear) ? config.automationTargetYear : 2035, baseYear + 1, 2070);
  const progress = Number.isFinite(tech?.progress)
    ? tech.progress
    : clamp((year - baseYear) / Math.max(1, targetYear - baseYear), 0, 1);

  const automatedShare = Number.isFinite(tech?.automatedShare)
    ? tech.automatedShare
    : clamp(((config?.aiAutomationShare ?? 0) + (config?.robotAutomationShare ?? 0)) * progress, 0, 1);
  const unredeployedShare = Number.isFinite(tech?.unredeployedShare)
    ? tech.unredeployedShare
    : automatedShare * (1 - clamp(config?.automationRedeployment ?? 1, 0, 1));
  const paidWorkShare = Number.isFinite(tech?.paidWorkShare)
    ? tech.paidWorkShare
    : Math.max(0.05, 1 - unredeployedShare);
  const prodGain = clamp(config?.automationProductivityGain ?? 0, 0, 0.5);
  const wagePassThrough = clamp(config?.automationWagePassThrough ?? 1, 0, 1);
  const capitalCaptureShare = 1 - wagePassThrough;

  // 1. Autonomous Machine Production & Tax Friction on Productivity
  let autonomousGdpMultiplier = 1;
  let productivityFrictionFactor = 1;
  if (regime === 'robot-tax-payg') {
    // Taxing robots recovers 75% of autonomous machine output but introduces a 25% friction drag on productivity gain
    productivityFrictionFactor = (1 + prodGain * progress * 0.75) / Math.max(1, 1 + prodGain * progress);
    autonomousGdpMultiplier = paidWorkShare > 0
      ? ((paidWorkShare + unredeployedShare * 0.75) / paidWorkShare) * productivityFrictionFactor
      : 1;
  } else if (regime === 'capital-boom-dividend' || regime === 'demarquia-funcionarios-primero') {
    // Autonomous robots/AI keep producing the displaced hours' output + 8% machine uptime efficiency
    autonomousGdpMultiplier = paidWorkShare > 0
      ? (paidWorkShare + unredeployedShare * 1.08) / paidWorkShare
      : 1;
  } else if (regime === 'demarquia-planetaria-au50') {
    // AU50 + zero tax friction in the productive circuit + open access to Fondo Común robots/AI/land
    const au50AbundanceFactor = 1 + 0.16 * progress;
    autonomousGdpMultiplier = paidWorkShare > 0
      ? ((paidWorkShare + unredeployedShare * 1.15) / paidWorkShare) * au50AbundanceFactor
      : au50AbundanceFactor;
  }

  // 2. AI & Robotics Capital Return Boom (r_capital >> g_wages)
  let aiCapitalReturnBoost = 0;
  // No robot co-contribution is paid: no payer or asset reserve is modeled.
  const robotEquityContribBoost = 0;
  if (regime === 'capital-boom-dividend') {
    aiCapitalReturnBoost = clamp(
      progress * (automatedShare * 0.022 + prodGain * (0.45 + 0.55 * capitalCaptureShare) * 0.032),
      0,
      0.032
    );

  } else if (regime === 'demarquia-funcionarios-primero') {
    aiCapitalReturnBoost = clamp(
      progress * (automatedShare * 0.020 + prodGain * (0.40 + 0.60 * capitalCaptureShare) * 0.030 + 0.004),
      0,
      0.032
    );

  } else if (regime === 'demarquia-planetaria-au50') {
    aiCapitalReturnBoost = clamp(
      progress * (automatedShare * 0.025 + prodGain * 0.036 + 0.011),
      0,
      0.038
    );

  }

  // 3. Public Administration Automation ("Funcionarios Primero": 3,043,024 employees)
  // Cost per employee: 2,900 €/mo (2,500 € salary+SS + 400 € office/energy) vs 1,000 €/mo RBU = 1,900 €/mo (22,800 €/yr) net saving.
  // Plus Chapter 2 Invisible Savings: ~8,500 M€/yr (energy >85%, cleaning/security >90%, office rentals 100%, transport ~30%).
  const defaultAdminTarget = regime === 'demarquia-funcionarios-primero'
    ? Math.max(rawAdminShare, 0.65)
    : regime === 'demarquia-planetaria-au50'
      ? Math.max(rawAdminShare, 0.85)
      : rawAdminShare;
  const effectiveAdminShare = clamp(progress * defaultAdminTarget, 0, 1);
  const publicAdminAutomatedPosts = Math.round(effectiveAdminShare * 3043024);
  const cap1NetSavings = publicAdminAutomatedPosts * 22800; // up to ~69.38 mil M€/yr in real 2026 euros
  const cap2InvisibleSavings = effectiveAdminShare * 8.5e9; // up to 8.50 mil M€/yr in real 2026 euros

  // 4. Regime-specific Fiscal & Dividend Mechanics
  let iutAdminSavings = 0;
  let robotOrIutRevenueBoost = 0;
  let displacementSupportOffset = 0;
  let citizenDividendMonthly = 0;
  let purchasingPowerMultiplier = 1;
  let demarquiaPensionBonusAnnual = 0;

  // Approximate Spanish baseline payroll reference (~650 mil M€ in 2026 real terms)
  const lostPayrollProxy = unredeployedShare * 650e9;

  if (regime === 'robot-tax-payg') {
    // Robot tax recovers 38% of displaced payroll + 15% of productivity surplus, funding fiscal RBU
    robotOrIutRevenueBoost = lostPayrollProxy * 0.38 + progress * prodGain * 22e9;
    citizenDividendMonthly = unredeployedShare > 0
      ? Math.round(clamp(450 + unredeployedShare * 950, 450, 980))
      : 0;
  } else if (regime === 'capital-boom-dividend') {
    // Sovereign AI Equity Fund covers 65% of displaced worker support outside state debt
    displacementSupportOffset = 0.65;
    robotOrIutRevenueBoost = progress * (automatedShare * 18e9 + prodGain * 24e9);
    citizenDividendMonthly = Math.round(progress * (380 + automatedShare * 850 + prodGain * 600));
  } else if (regime === 'demarquia-funcionarios-primero') {
    // Gran Hoguera Fiscal + Impuesto Único Transitorio (IUT 50% on personal consumption withdrawals):
    // - Saves 17,500 M€/yr in tax compliance & administrative bureaucracy
    // - Captures 50% on automated profit withdrawals, neutralizing the 7:1 labor-tax collapse
    iutAdminSavings = progress * 17.5e9;
    robotOrIutRevenueBoost = lostPayrollProxy * 0.68 + progress * prodGain * 35e9;
    displacementSupportOffset = 0.75;
    citizenDividendMonthly = Math.round(clamp(progress * (1000 + prodGain * 450), 0, 1450));
    purchasingPowerMultiplier = 1 + 0.45 * progress;
  } else if (regime === 'demarquia-planetaria-au50') {
    // Full Demarquía Planetaria (AU50 + Copropiedad Planetaria Universal + Bóveda Común + Sortition Governance):
    // - Eurozone benchmark Dividendo Planetario: 1,268.52 €/mo per person (5,074.08 €/mo family of 4) at current wealth,
    //   scaling with AI/Robotics productivity and multiplying real purchasing power by up to 3x.
    iutAdminSavings = progress * 20e9;
    robotOrIutRevenueBoost = lostPayrollProxy * 0.85 + progress * (38e9 + prodGain * 65e9);
    displacementSupportOffset = 0.90;
    const baseEurozoneDP = 1268.52;
    citizenDividendMonthly = Math.round(progress * baseEurozoneDP * (1 + prodGain * 0.85 + automatedShare * 0.35));
    purchasingPowerMultiplier = 1 + 2.0 * progress; // Reaches 3.0x at full maturity
    // El Fin de las Pensiones -> Transición hacia la Abundancia Vitalicia (hybrid bridge + DP boost)
    demarquiaPensionBonusAnnual = progress * (3600 + prodGain * 6000 + automatedShare * 3200);
  }

  // Share of each favourable assumption taken as true (1 = the regime as designed).
  const scale = key => clamp(Number.isFinite(config?.[key]) ? config[key] : 1, 0, 1.5);
  const outputScale = scale('paradigmOutputScale');
  autonomousGdpMultiplier = 1 + (autonomousGdpMultiplier - 1) * outputScale;
  productivityFrictionFactor = 1 + (productivityFrictionFactor - 1) * outputScale;
  aiCapitalReturnBoost *= scale('paradigmReturnScale');
  displacementSupportOffset = clamp(displacementSupportOffset * scale('paradigmSupportScale'), 0, 1);
  robotOrIutRevenueBoost *= scale('paradigmRevenueScale');
  const adminScale = scale('paradigmAdminScale');
  const cap1Savings = cap1NetSavings * adminScale;
  const cap2Savings = cap2InvisibleSavings * adminScale;
  iutAdminSavings *= adminScale;
  const dividendScale = scale('paradigmDividendScale');
  citizenDividendMonthly = Math.round(citizenDividendMonthly * dividendScale);
  purchasingPowerMultiplier = 1 + (purchasingPowerMultiplier - 1) * dividendScale;
  demarquiaPensionBonusAnnual *= dividendScale;

  const fiscalRevenueDelta = robotOrIutRevenueBoost;
  const fiscalSpendingDelta = -(cap1Savings + cap2Savings + iutAdminSavings);

  return {
    regime,
    active: true,
    progress,
    autonomousGdpMultiplier,
    productivityFrictionFactor,
    aiCapitalReturnBoost,
    robotEquityContribBoost,
    effectiveAdminShare,
    publicAdminAutomatedPosts,
    cap1NetSavings: cap1Savings,
    cap2InvisibleSavings: cap2Savings,
    iutAdminSavings,
    robotOrIutRevenueBoost,
    displacementSupportOffset,
    fiscalRevenueDelta,
    fiscalSpendingDelta,
    citizenDividendMonthly,
    purchasingPowerMultiplier,
    citizenDividendEffectiveMonthly: Math.round(citizenDividendMonthly * purchasingPowerMultiplier),
    demarquiaPensionBonusAnnual
  };
}

/**
 * Computes cohort-specific and retirement-phase investment returns according to
 * the chosen `capitalizationStyle` ('balanced-standard', 'lifecycle-ap7',
 * 'collective-cdc', 'common-fund', 'dividend-endowment', 'sovereign-captive') and any active
 * AI/Robotics capital-boom regime (`automationRegime`).
 */
/** Financial repression on a captive fund (points of nominal rate a year): the State pays less than its coupons on the
 * bonds the fund must hold, from 135 % of GDP of debt, up to 0.7 points. The fund loses it and the State saves it. */
export const captiveRepressionRate = previousDebtGDP => previousDebtGDP > 135 ? Math.min(0.007, (previousDebtGDP - 135) * 0.00006) : 0;
// The bonds a captive fund holds and the repression on them, for the State's accounts (src/current-fiscal-v13.js; since 1.74).
export const captiveOptions = (previous, config) => config?.capitalizationStyle === 'sovereign-captive'
  ? { captiveHoldings: previous.fundedAssets ?? 0, captiveRepressionRate: captiveRepressionRate(previous.debtGDP ?? 105) } : {};

export function cohortCapitalizationReturns({
  age = 40,
  year = 2027,
  config,
  previousDebtGDP = 105,
  previousStateRate = null,
  inflation = null,
  marketShockYear = 2039,
  baseYear = 2026
}) {
  const style = config?.capitalizationStyle ?? 'balanced-standard';
  const baseReal = Number.isFinite(config?.realReturn) ? config.realReturn : 0.03;
  const baseFee = Number.isFinite(config?.feeRate) ? config.feeRate : 0.005;
  const isShockYear = year === marketShockYear;
  const rawShock = isShockYear && Number.isFinite(config?.marketShock) ? config.marketShock : 0;
  const paradigm = describeAutomationParadigmEffect(year, config, {}, baseYear);
  const aiBoost = style === 'sovereign-captive' ? 0 : paradigm.aiCapitalReturnBoost;

  if (style === 'lifecycle-ap7') {
    // Swedish AP7 Såfa style:
    // - Ages <= 54: 100% global equities (+2.1% real equity risk premium, 0.12% institutional fee)
    // - Ages 55..65: automatic glidepath toward defensive fixed income, shielding 75% of market shocks
    // - Retired: balanced global payout portfolio (+0.6% over base, 0.12% fee)
    const instFee = Math.min(baseFee, 0.0012);
    const equityShare = age <= 54 ? 1 : age >= 65 ? 0.35 : clamp(1 - 0.65 * ((age - 54) / 11), 0.35, 1);
    const activeGross = baseReal + (0.021 + aiBoost) * equityShare;
    const shockPassThrough = age >= 55 ? 0.25 : 0.85;
    const activeAnnualNet = activeGross - instFee + rawShock * shockPassThrough;
    const annuityAnnualNet = baseReal + 0.006 + aiBoost * 0.65 - instFee;
    const retiredAnnualNet = annuityAnnualNet + rawShock * 0.20;
    return {
      activeHalfReturn: Math.sqrt(Math.max(0.05, 1 + activeAnnualNet)) - 1,
      retiredHalfReturn: Math.sqrt(Math.max(0.05, 1 + retiredAnnualNet)) - 1,
      annuityHalfReturn: Math.sqrt(Math.max(0.05, 1 + annuityAnnualNet)) - 1,
      headlineNetReturn: baseReal + 0.021 + aiBoost - instFee,
      retirementYieldNet: annuityAnnualNet,
      aiCapitalReturnBoost: aiBoost
    };
  }

  if (style === 'collective-cdc') {
    // Stylized collective portfolio assumptions, not calibrated CDC outcomes:
    // 0.15% fee; +1.6pp active / +1.3pp retired premium over base return.
    // No collective reserve exists to absorb a market loss: pass the shock on.
    const instFee = Math.min(baseFee, 0.0015);
    const activeAnnualNet = baseReal + 0.016 + aiBoost - instFee + rawShock;
    const annuityAnnualNet = baseReal + 0.013 + aiBoost * 0.75 - instFee;
    const retiredAnnualNet = annuityAnnualNet + rawShock;
    return {
      activeHalfReturn: Math.sqrt(Math.max(0.05, 1 + activeAnnualNet)) - 1,
      retiredHalfReturn: Math.sqrt(Math.max(0.05, 1 + retiredAnnualNet)) - 1,
      annuityHalfReturn: Math.sqrt(Math.max(0.05, 1 + annuityAnnualNet)) - 1,
      headlineNetReturn: baseReal + 0.016 + aiBoost - instFee,
      retirementYieldNet: annuityAnnualNet,
      aiCapitalReturnBoost: aiBoost
    };
  }

  // The common fund (1.64) invests like this one; what differs is who keeps a balance at death.
  if (style === 'dividend-endowment' || style === 'common-fund') {
    // Norwegian Sovereign / Global Dividend Endowment:
    // - Premia aligned since 1.41 with Norway's GPFG: 4.1 % real net a year in
    //   1998–2024 (NBIM annual report 2024, data/sources/audit-carteras-2026/), i.e.
    //   a 3 % base + 1.25 % − 0.15 % fee (+1.0 % in retirement). Before: +1.9 / +1.65.
    // - These return premia and reduced shock exposures are scenario assumptions,
    //   not funded guarantees; negative returns can reduce inherited capital.
    const instFee = Math.min(baseFee, 0.0015);
    const activeAnnualNet = baseReal + 0.0125 + aiBoost - instFee + rawShock * 0.50;
    const annuityAnnualNet = baseReal + 0.010 + aiBoost * 0.85 - instFee;
    const retiredAnnualNet = annuityAnnualNet + rawShock * 0.25;
    return {
      activeHalfReturn: Math.sqrt(Math.max(0.05, 1 + activeAnnualNet)) - 1,
      retiredHalfReturn: Math.sqrt(Math.max(0.05, 1 + retiredAnnualNet)) - 1,
      annuityHalfReturn: Math.sqrt(Math.max(0.05, 1 + annuityAnnualNet)) - 1,
      headlineNetReturn: baseReal + 0.0125 + aiBoost - instFee,
      retirementYieldNet: annuityAnnualNet,
      aiCapitalReturnBoost: aiBoost
    };
  }

  if (style === 'sovereign-captive') {
    // Captive Domestic Sovereign Debt Trap (Spain Reserve Fund 2000-2011 / Poland OFE / Argentina):
    // - It holds the State's own bonds and earns what the State pays on them (since 1.74): the coupon rate of the
    //   debt entering the year (previousStateRate), less the financial repression, in real terms. The State saves
    //   that repression on the fund's bonds (src/current-fiscal-v13.js, captiveInterestSaving), so the value
    //   no longer disappears (docs/REVISION-ADVERSARIAL-2026-11-24.md, 1).
    // - Higher management fees (>= 0.60%). Without the State's rate (the guide's display), the old proxy: <= 1.4 % real.
    const repressionDrag = captiveRepressionRate(previousDebtGDP);
    const priceGrowth = Number.isFinite(inflation) ? inflation : (Number.isFinite(config?.inflationRate) ? config.inflationRate : 0.02);
    const marketGross = Number.isFinite(previousStateRate) ? (1 + previousStateRate) / (1 + priceGrowth) - 1 : Math.min(baseReal, 0.014);
    const captiveGross = Number.isFinite(previousStateRate) ? (1 + previousStateRate - repressionDrag) / (1 + priceGrowth) - 1 : marketGross - repressionDrag;
    const captiveFee = Math.max(baseFee, 0.006);
    const activeAnnualNet = captiveGross - captiveFee + rawShock * 0.40;
    // Retirees earn what the State pays too: the State saves the repression on all the fund's bonds, so a half
    // given back to retirees had no payer (1.76; docs/REVISION-ADVERSARIAL-2026-11-25.md, 3).
    const annuityAnnualNet = captiveGross - captiveFee;
    const retiredAnnualNet = annuityAnnualNet + rawShock * 0.30;
    return {
      activeHalfReturn: Math.sqrt(Math.max(0.05, 1 + activeAnnualNet)) - 1,
      retiredHalfReturn: Math.sqrt(Math.max(0.05, 1 + retiredAnnualNet)) - 1,
      annuityHalfReturn: Math.sqrt(Math.max(0.05, 1 + annuityAnnualNet)) - 1,
      headlineNetReturn: captiveGross - captiveFee, captiveRepressionRate: repressionDrag, captiveMarketGross: marketGross,
      retirementYieldNet: annuityAnnualNet,
      aiCapitalReturnBoost: 0
    };
  }

  // 'balanced-standard': exact standard model behavior (+ optional AI capital boom when active)
  const netReturn = baseReal + aiBoost - baseFee + rawShock;
  const annuityNetReturn = baseReal + aiBoost * 0.80 - baseFee;
  return {
    activeHalfReturn: Math.sqrt(1 + netReturn) - 1,
    retiredHalfReturn: Math.sqrt(1 + netReturn) - 1,
    annuityHalfReturn: Math.sqrt(1 + annuityNetReturn) - 1,
    headlineNetReturn: annuityNetReturn,
    retirementYieldNet: annuityNetReturn,
    aiCapitalReturnBoost: aiBoost
  };
}

export const CAPITALIZATION_STYLE_META = Object.freeze({
  'balanced-standard': {
    shortLabel: 'Cartera Equilibrada (Base)',
    badge: '3,0 % real · 0,50 % com.',
    description: 'Cartera mixta constante en todas las edades usando tus barras de rentabilidad y comisión.'
  },
  'lifecycle-ap7': {
    shortLabel: 'Ciclo de Vida Global (Suecia AP7)',
    badge: 'Supuesto: prima joven +2,1 ptos',
    description: 'Hipótesis de prima bursátil por edad, comisión máxima de 0,12 % y menor exposición al shock desde los 55. Referencias: bolsa mundial 1900–2024, 5,2 % real (UBS 2025); AP7 Såfa, 9,8 % nominal al año en 2000–2022. No garantiza rendimientos ni capital.'
  },
  'collective-cdc': {
    shortLabel: 'Colectiva CDC (hipótesis)',
    badge: 'Prima supuesta +1,6 / +1,3 ptos',
    description: 'Hipótesis de cartera colectiva con comisión máxima de 0,15 %. Sin reserva externa: el fondo soporta íntegramente el shock configurado.'
  },
  'common-fund': {
    shortLabel: 'Fondo común (cartera noruega)',
    badge: 'Prima +1,25 / +1,0 ptos · sin herencia',
    description: 'El dinero es de todos y cada persona tiene una parte anotada, de la que sale parte de su pensión. Lo de quien fallece antes de jubilarse se queda en el fondo, no se hereda. Cartera global como la del fondo soberano noruego, que rindió un 4,1 % real neto al año en 1998–2024 (NBIM). No garantiza rendimientos ni capital.'
  },
  'dividend-endowment': {
    shortLabel: 'Fondo Soberano Dividendos (Herencia)',
    badge: 'Prima +1,25 / +1,0 ptos (fondo noruego)',
    description: 'Cartera global como el fondo soberano noruego, que rindió un 4,1 % real neto al año en 1998–2024 (NBIM). La opción de retirar solo rendimientos positivos conserva capital salvo pérdidas de inversión.'
  },
  'sovereign-captive': {
    shortLabel: '⚠️ Deuda Pública Cautiva (Trampa)',
    badge: '~−0,7 %–1,3 % neto (r < g)',
    description: 'Escenario estilizado: el fondo se queda con bonos del propio Estado, con comisiones bancarias. Cobra lo que el Estado paga por su deuda, que rinde poco y frena el interés compuesto. Con la deuda por encima del 135 % del PIB sufre además represión financiera: el Estado le paga menos y se ahorra esa diferencia. En una quita, su exposición a la deuda pública es total.'
  }
});

export const LABORATORY_PRESETS = Object.freeze([
  {
    id: 'swedish-ap7-relay',
    title: '🇸🇪 Vía Sueca AP7 + Doble Relevo',
    subtitle: 'Transición gradual con cuentas nocionales y supuestos de cartera por edad',
    payoutMode: 'annuity',
    patch: {
      system: 'mixed',
      transitionMode: 'two-stage-relay',
      transitionCutoffAge: 48,
      transitionYears: 20,
      transitionTargetFunded: 0.65,
      transitionPublicPillar: 'custom-split',
      transitionNdcShare: 0.85,
      transitionRelaySchedule: 'announced',
      capitalizationStyle: 'lifecycle-ap7'
    }
  },
  {
    id: 'dutch-cdc-shield',
    title: '🇳🇱 Escudo Baby Boom + Colectiva CDC',
    subtitle: 'Entrada gradual durante el pico de jubilaciones y cartera colectiva sin reserva externa',
    payoutMode: 'annuity',
    patch: {
      system: 'mixed',
      transitionMode: 'baby-boom-shield',
      transitionCutoffAge: 50,
      transitionYears: 24,
      transitionTargetFunded: 0.60,
      transitionPublicPillar: 'custom-split',
      transitionNdcShare: 1.0,
      transitionRelaySchedule: 'announced',
      capitalizationStyle: 'collective-cdc'
    }
  },
  {
    id: 'dynastic-endowment',
    title: '🏛️ Patrimonio Familiar 100 % Heredable',
    subtitle: 'Compara retirar solo rendimientos positivos con consumir el fondo mediante una renta',
    payoutMode: 'preserve',
    patch: {
      system: 'mixed',
      transitionMode: 'salary-cap-shield',
      transitionCutoffAge: 46,
      transitionYears: 18,
      transitionTargetFunded: 0.80,
      transitionPublicPillar: 'custom-split',
      transitionNdcShare: 0.80,
      transitionRelaySchedule: 'announced',
      capitalizationStyle: 'dividend-endowment'
    }
  },
  {
    id: 'captive-polish-trap',
    title: '🚨 Contraejemplo: Trampa Polaca + Bono Cautivo',
    subtitle: 'Explora una rampa sin corte de edad y una cartera concentrada en deuda nacional',
    payoutMode: 'annuity',
    patch: {
      system: 'mixed',
      transitionMode: 'linear-ramp',
      transitionCutoffAge: 62,
      transitionYears: 8,
      transitionTargetFunded: 0.65,
      transitionPublicPillar: 'payg-bridge',
      transitionNdcShare: 0,
      transitionRelaySchedule: 'announced',
      capitalizationStyle: 'sovereign-captive'
    }
  },
  {
    id: 'standard-progressive',
    title: '↺ Mixto Progresivo Base (3 % real)',
    subtitle: 'Configuración progresiva estándar con la cartera equilibrada de referencia',
    payoutMode: 'annuity',
    patch: {
      system: 'mixed',
      transitionMode: 'cohort-ramp',
      transitionCutoffAge: 48,
      transitionYears: 20,
      transitionTargetFunded: 0.65,
      transitionPublicPillar: 'ndc-bridge',
      transitionNdcShare: 0.85,
      transitionRelaySchedule: 'announced',
      capitalizationStyle: 'balanced-standard'
    }
  },
  {
    // An approximation to «Cómo reformar el sistema de pensiones» (Centro Ruth Richardson, 2026),
    // docs/REVISION-PORTADA-2026-11-06.md. From the report: notional accounts by cohort from those
    // born in 1970, 5 % more each (p. 28); the retirement age follows two thirds of life expectancy
    // (p. 31); portfolios by age (p. 23). The ramp is ours: its 1,2 points in 2032, 3,2 in 2042 and
    // 4-5 from 2043 (p. 31) as 20 % of the retirement contribution in 24 years. The voluntary third
    // pillar is left out, and the brake is the simulator's cash rule, not the Swedish balance.
    id: 'three-pillars-ruth-richardson',
    title: '🏛️ Tres pilares (Centro Ruth Richardson)',
    subtitle: 'Aproximación a su informe de 2026: cuentas nocionales por generaciones y fondos de empleo hasta el 20 % de la cotización. Sin el ahorro voluntario',
    payoutMode: 'annuity',
    patch: {
      system: 'mixed',
      transitionMode: 'linear-ramp',
      transitionCutoffAge: 48,
      transitionYears: 24,
      transitionTargetFunded: 0.2,
      transitionPublicPillar: 'custom-split',
      transitionNdcShare: 1,
      transitionRelaySchedule: 'announced',
      capitalizationStyle: 'lifecycle-ap7',
      ndcPhaseIn: 1,
      ndcPhaseInFirstCohort: 1970,
      ndcPhaseInYears: 20,
      ndcBalancing: 1,
      retirementAgeLink: 2 / 3
    }
  }
]);

// Keys that only one preset sets: choosing another one takes them back to their default.
const PRESET_RESET = Object.freeze({ ndcPhaseIn: 0, ndcPhaseInFirstCohort: 1971, ndcPhaseInYears: 20, ndcBalancing: 0, retirementAgeLink: 0 });

/** What choosing a preset writes on the scenario. */
export const presetPatch = preset => ({ ...PRESET_RESET, ...preset.patch });

export const AUTOMATION_REGIME_META = Object.freeze({
  'status-quo-payroll': {
    category: 'asimilable',
    shortLabel: '1 · Impuestos de hoy (sobre las nóminas)',
    badge: '7:1 dependencia trabajo · tijera fiscal',
    description: 'Sigue financiando el Estado con nóminas humanas (~294.400 M€ IRPF+SS vs ~40.000 M€ Sociedades) y paga subsidios/RBU con deuda. Con alta IA/robótica sufre la «tijera fiscal»: caen los ingresos y explota el gasto.'
  },
  'robot-tax-payg': {
    category: 'asimilable',
    shortLabel: '2 · Gravar la producción automatizada',
    badge: 'Grava robots · Frena 25 % prod. · 0 € capital',
    description: 'Enfoque clásico asimilable: obliga a las horas automatizadas a «cotizar» al Reparto para sostener pensiones y RBU fiscal. Alivia parte del déficit, pero lastra un 25 % la ganancia tecnológica y deja al ciudadano con 0 € de propiedad.'
  },
  'capital-boom-dividend': {
    category: 'asimilable',
    shortLabel: '3 · Ciudadanos dueños del capital',
    badge: 'Copropietario de IA (r ↑↑) + Fondo Ciudadano',
    description: 'Los robots producen PIB autónomo y disparan los márgenes del capital (r ≫ g), impulsando la rentabilidad de las mochilas de capitalización productiva y un Fondo Soberano que reparte Dividendo Tecnológico.'
  },
  'demarquia-funcionarios-primero': {
    category: 'demarquia',
    shortLabel: '4 · Automatizar primero el Estado (Demarquía, fase 1)',
    badge: '+22.800 €/año por plaza · Bóveda Común + IUT 50 %',
    description: 'Invierte la transición para cerrar la tijera fiscal (demarquia.org): automatiza primero la Administración Pública con IA Soberana y Bóveda Común (de 2.900 €/mes a 1.000 €/mes RBU = 22.800 €/año ahorro/plaza + 8.500 M€ Cap. 2) y aplica la simplificación fiscal con el Impuesto Único Transitorio (IUT 50 % solo al retirar a consumo).'
  },
  'demarquia-planetaria-au50': {
    category: 'demarquia',
    shortLabel: '5 · Demarquía Planetaria (AU50)',
    badge: 'Socio 50/50 · DP ~1.268 €/mes (×3 poder adq.)',
    description: 'Cambio total de reglas del juego (demarquia.org/Demarquía_Planetaria): Copropiedad Planetaria Universal, Asociación Universal al 50 % (AU50 sin impuestos en el circuito productivo, retención estructural del 5 %), Gobernanza por Sorteo (<1 % coste) y Dividendo Planetario Vitalicio que supera y hace obsoletas las pensiones tradicionales.'
  }
});

// All automation scenarios share the same world (how much is automated, how
// many are redeployed, productivity, wages and support); they differ only in
// the rules: regime, pension design and public administration automation.
export const AI_WAVE_WORLD = Object.freeze({
  aiAutomationShare: 0.35,
  robotAutomationShare: 0.20,
  automationTargetYear: 2040,
  automationRedeployment: 0.40,
  automationProductivityGain: 0.30,
  automationWagePassThrough: 0.20,
  reemploymentWageLoss: 0.15,
  displacementSupportRate: 0.45
});

export const AUTOMATION_LABORATORY_PRESETS = Object.freeze([
  {
    id: 'ai-mortal-scissors',
    title: '🚨 La ola de IA con los impuestos de hoy',
    subtitle: '55 % de las horas automatizadas en 2040 con las reglas actuales: caen las nóminas y sube la deuda',
    payoutMode: 'annuity',
    patch: {
      system: 'payg',
      transitionMode: 'none',
      capitalizationStyle: 'balanced-standard',
      automationRegime: 'status-quo-payroll',
      publicAdminAutomationShare: 0,
      ...AI_WAVE_WORLD
    }
  },
  {
    id: 'ai-robot-tax-patch',
    title: '🤖 Gravar la producción automatizada',
    subtitle: 'Un impuesto sobre robots e IA sustituye a las cotizaciones perdidas; pensiones públicas con cuentas nocionales',
    payoutMode: 'annuity',
    patch: {
      system: 'ndc',
      transitionMode: 'none',
      capitalizationStyle: 'balanced-standard',
      automationRegime: 'robot-tax-payg',
      publicAdminAutomationShare: 0,
      ...AI_WAVE_WORLD
    }
  },
  {
    id: 'ai-robot-owners-ap7',
    title: '🏦 Ciudadanos dueños del capital',
    subtitle: 'Mixto progresivo con fondos que invierten en la automatización y un fondo ciudadano',
    payoutMode: 'preserve',
    patch: {
      system: 'mixed',
      transitionMode: 'two-stage-relay',
      transitionCutoffAge: 48,
      transitionYears: 18,
      transitionTargetFunded: 0.70,
      transitionPublicPillar: 'custom-split',
      transitionNdcShare: 0.85,
      transitionRelaySchedule: 'announced',
      capitalizationStyle: 'dividend-endowment',
      automationRegime: 'capital-boom-dividend',
      publicAdminAutomationShare: 0.25,
      ...AI_WAVE_WORLD
    }
  },
  {
    id: 'demarquia-phase1-funcionarios',
    title: '🏛️ Automatizar primero el Estado (Demarquía, fase 1)',
    subtitle: 'Automatiza el 70 % de la Administración, impuesto único al retirar beneficios (IUT) y renta base de 1.000 € para quienes salen',
    payoutMode: 'preserve',
    patch: {
      system: 'mixed',
      transitionMode: 'two-stage-relay',
      transitionCutoffAge: 48,
      transitionYears: 16,
      transitionTargetFunded: 0.75,
      transitionPublicPillar: 'custom-split',
      transitionNdcShare: 0.85,
      transitionRelaySchedule: 'announced',
      capitalizationStyle: 'dividend-endowment',
      automationRegime: 'demarquia-funcionarios-primero',
      publicAdminAutomationShare: 0.70,
      ...AI_WAVE_WORLD
    }
  },
  {
    id: 'demarquia-planetary-au50',
    title: '🌍 Demarquía Planetaria (AU50)',
    subtitle: 'Explora las hipótesis fiscales y productivas de AU50 sin garantizar deuda ni pensiones',
    payoutMode: 'preserve',
    patch: {
      system: 'mixed',
      transitionMode: 'salary-cap-shield',
      transitionCutoffAge: 46,
      transitionYears: 15,
      transitionTargetFunded: 0.85,
      transitionPublicPillar: 'custom-split',
      transitionNdcShare: 0.90,
      transitionRelaySchedule: 'announced',
      capitalizationStyle: 'dividend-endowment',
      automationRegime: 'demarquia-planetaria-au50',
      publicAdminAutomationShare: 0.90,
      ...AI_WAVE_WORLD
    }
  }
]);

export const TRANSITION_MODE_LABELS = Object.freeze({
  'cohort-ramp': 'Corte por Edad + Rampa Anual (Modelo Sueco/Estonio)',
  'two-stage-relay': 'Doble Relevo (1º Reparto→Nocional · 2º Nocional→Capitalización, dentro de la rampa)',
  'pension-runoff': 'Según fallecen los pensionistas de hoy (sin calendario)',
  'salary-cap-shield': 'Suelo Solidario (Reparto/Nocional) + Techo Capitalizado',
  'baby-boom-shield': 'Escudo Pico Baby Boom (2027-2043 suave + aceleración 2044-2070)',
  'entrants-only': 'Corte Generacional Puro (solo menores de la edad de corte)',
  'linear-ramp': 'Rampa Anual Uniforme (sin corte de edad)',
  'none': 'De golpe en 2027 (sin transición progresiva · dispara coste inicial)'
});

export const TRANSITION_PILLAR_LABELS = Object.freeze({
  'ndc-bridge': 'Puente Cuentas Nocionales (Suecia: mantiene caja hoy y equilibra derechos futuros)',
  'custom-split': 'Reparto personalizado entre Cuentas Nocionales y Suelo de Reparto',
  'payg-bridge': 'Puente Reparto clásico (mantiene caja hoy pero acumula promesa DB tradicional)',
  'system-default': 'Según proporción Reparto / Nocional de la mezcla base'
});

/**
 * Computes real-time diagnostics for the 5 classic pension transition traps,
 * comparing the Progressive Mixed configuration against abrupt Capitalization
 * and static Mixed transitions.
 */
export function describeTransitionTraps({
  progressiveResult,
  staticFundedResult,
  staticMixedResult,
  config,
  displayYear = 2050,
  baseYear = 2026
}) {
  const activeMode = config.transitionMode === 'none' ? 'cohort-ramp' : config.transitionMode;
  const idx2030 = Math.max(0, Math.min(progressiveResult.years.length - 1, 2030 - baseYear));
  const idxDisplay = Math.max(0, Math.min(progressiveResult.years.length - 1, displayYear - baseYear));
  const idx2070 = progressiveResult.years.length - 1;

  const prog2030 = progressiveResult.years[idx2030];
  const progDisp = progressiveResult.years[idxDisplay];
  const prog2070 = progressiveResult.years[idx2070];

  const fund2030 = staticFundedResult.years[idx2030];
  const fundDisp = staticFundedResult.years[idxDisplay];
  const mixDisp = staticMixedResult.years[idxDisplay];

  const trans2030Prog = prog2030?.transitionContributionsGDP ?? 0;
  const trans2030Fund = fund2030?.transitionContributionsGDP ?? 0;
  const debtSavingVsFunded = (fundDisp?.debtGDP ?? 0) - (progDisp?.debtGDP ?? 0);
  const debtSavingVsStaticMix = (mixDisp?.debtGDP ?? 0) - (progDisp?.debtGDP ?? 0);

  const trap1Status = trans2030Prog <= 1.25 ? 'ok' : trans2030Prog <= 2.2 ? 'warn' : 'danger';

  const cutoffAge = config.transitionCutoffAge ?? 48;
  const usesCohortCutoff = ['cohort-ramp', 'two-stage-relay', 'pension-runoff', 'salary-cap-shield', 'baby-boom-shield', 'entrants-only'].includes(activeMode);
  const trap2Status = !usesCohortCutoff ? 'danger' : cutoffAge <= 52 ? 'ok' : 'warn';

  const transitionYears = config.transitionYears ?? 20;
  const eff2030 = (prog2030?.effectiveFundedWeight ?? 0) * 100;
  const effDisp = (progDisp?.effectiveFundedWeight ?? 0) * 100;
  const eff2070 = (prog2070?.effectiveFundedWeight ?? 0) * 100;
  const trap3Status = activeMode === 'baby-boom-shield' || activeMode === 'two-stage-relay' || activeMode === 'pension-runoff' || transitionYears >= 18
    ? 'ok'
    : transitionYears >= 10
      ? 'warn'
      : 'danger';

  const pillar = config.transitionPublicPillar ?? 'ndc-bridge';
  // Under 'system-default' the public part follows the base mix (reparto : nocional), not transitionNdcShare.
  const ndcShare = pillar === 'payg-bridge' ? 0
    : pillar === 'system-default' ? ((m => (m.payg + m.ndc) > 1e-9 ? m.ndc / (m.payg + m.ndc) : 0)(config.mix ?? { payg: 1, ndc: 0 }))
      : (config.transitionNdcShare ?? 0.85);
  const trap4Status = (pillar === 'ndc-bridge' || pillar === 'custom-split') && ndcShare >= 0.65
    ? 'ok'
    : pillar === 'payg-bridge' || ndcShare < 0.30
      ? 'danger'
      : 'warn';

  const capStyle = config.capitalizationStyle ?? 'balanced-standard';
  const capReturns = cohortCapitalizationReturns({
    age: 35,
    year: displayYear,
    config,
    previousDebtGDP: progDisp?.debtGDP ?? 110
  });
  const netRealReturn = capReturns.headlineNetReturn;
  const wageGrowth = config.realWageGrowth ?? 0;
  const spread = netRealReturn - wageGrowth;
  const trap5Status = capStyle === 'sovereign-captive' || spread <= 0.009
    ? 'danger'
    : spread >= 0.018
      ? 'ok'
      : 'warn';
  const styleMeta = CAPITALIZATION_STYLE_META[capStyle] ?? CAPITALIZATION_STYLE_META['balanced-standard'];

  return {
    activeMode,
    trans2030Prog,
    trans2030Fund,
    debtSavingVsFunded,
    debtSavingVsStaticMix,
    eff2030,
    effDisp,
    eff2070,
    netRealReturn,
    spread,
    traps: [
      {
        id: 'polish-debt-spiral',
        title: '1. Trampa Polaca (Deuda circular y prima de riesgo)',
        status: trap1Status,
        badge: trap1Status === 'ok' ? 'Desvío inicial bajo' : trap1Status === 'warn' ? 'Desvío inicial moderado' : 'Desvío inicial alto',
        summary: `Cuotas destinadas al fondo en 2030: ${trans2030Prog.toFixed(2).replace('.', ',')} % del PIB (vs. ${trans2030Fund.toFixed(2).replace('.', ',')} % en Capitalización de golpe). No financian simultáneamente el reparto.`,
        detail: `Deuda en ${displayYear}: ${Math.abs(debtSavingVsFunded).toFixed(1).replace('.', ',')} ptos de PIB ${debtSavingVsFunded >= 0 ? 'menos' : 'más'} que capitalización inmediata y ${Math.abs(debtSavingVsStaticMix).toFixed(1).replace('.', ',')} ptos ${debtSavingVsStaticMix >= 0 ? 'menos' : 'más'} que mixto fijo, bajo estos supuestos.`
      },
      {
        id: 'sandwich-generation',
        title: usesCohortCutoff ? `2. Trampa Generación Sándwich (Corte ≥ ${cutoffAge} años)` : '2. Trampa Generación Sándwich (sin corte de edad)',
        status: trap2Status,
        badge: trap2Status === 'ok' ? '✅ Protegida' : trap2Status === 'warn' ? '⚠️ Corte alto' : '🚨 Sin corte de edad',
        summary: usesCohortCutoff
          ? `La participación en el fondo disminuye para las cohortes de mayor edad; algunas conservan una aportación inicial reducida.`
          : 'Desvía cuotas de mayores de 50 años sin horizonte para interés compuesto.',
        detail: usesCohortCutoff
          ? `El corte de ${cutoffAge} años modula la cuota según el horizonte laboral. Cada euro capitalizado deja de entrar en el pilar público.`
          : 'Activa el Corte por Edad para no desviar cuotas de quienes se jubilan pronto.'
      },
      {
        id: 'baby-boom-collision',
        title: '3. Colisión con el Pico Baby Boom (2027–2045)',
        status: trap3Status,
        badge: trap3Status === 'ok' ? '✅ Rampa acompasada' : trap3Status === 'warn' ? '⚠️ Rampa rápida' : '🚨 Choque demográfico',
        summary: `Cuota media desviada al fondo: ${eff2030.toFixed(1).replace('.', ',')} % (2030) → ${effDisp.toFixed(1).replace('.', ',')} % (${displayYear}) → ${eff2070.toFixed(1).replace('.', ',')} % (2070).`,
        detail: activeMode === 'two-stage-relay'
          ? 'Doble relevo activo: contiene el desvío en 2027-2042 pasándolo a Nocionales y acelera la capitalización desde 2043.'
          : activeMode === 'pension-runoff'
            ? 'Sin calendario: el desvío crece conforme fallecen los pensionistas de hoy. Mientras tanto siguen entrando baby boomers con pensiones mayores, así que ese dinero no queda libre del todo.'
          : activeMode === 'baby-boom-shield'
            ? 'El Escudo Baby Boom frena el desvío de caja entre 2027 y 2043 (pico de altas) y acelera la capitalización desde 2044.'
            : `Rampa de ${transitionYears} años: dosifica la entrada al fondo mientras se absorbe la ola demográfica.`
      },
      {
        id: 'swedish-ndc-bridge',
        title: '4. Juego Reparto vs. Nocional en el Pilar Público',
        status: trap4Status,
        badge: trap4Status === 'ok' ? `✅ ${Math.round(ndcShare * 100)}\u00a0% Nocional` : trap4Status === 'warn' ? '⚠️ Puente mixto' : '🚨 Acumula deuda DB',
        summary: pillar === 'payg-bridge'
          ? '100 % de la parte pública sigue en Reparto clásico (DB), acumulando déficit futuro.'
          : `${Math.round(ndcShare * 100)} % a Cuentas Nocionales y ${Math.round((1 - ndcShare) * 100)} % a Suelo de Reparto en la parte pública.`,
        detail: 'Las cuotas nocionales financian pagos públicos actuales y generan derechos contables futuros. No son activos invertidos ni garantizan el equilibrio fiscal.'
      },
      {
        id: 'aaron-samuelson',
        title: `5. Motor de Capitalización (${styleMeta.shortLabel})`,
        status: trap5Status,
        badge: trap5Status === 'ok' ? '✅ Interés compuesto alto' : trap5Status === 'warn' ? '⚠️ Diferencial moderado' : '🚨 Trampa bono cautivo',
        summary: `Retorno real neto: ${(netRealReturn * 100).toFixed(2).replace('.', ',')} %/año (diferencial ${(spread >= 0 ? '+' : '') + (spread * 100).toFixed(2).replace('.', ',')} ptos sobre salarios).`,
        detail: `Capital acumulado al jubilarse: ${Math.round(progDisp?.newAwardFundedCapitalPerRetiree ?? 0).toLocaleString('es-ES')} € en ${displayYear} y ${Math.round(prog2070?.newAwardFundedCapitalPerRetiree ?? 0).toLocaleString('es-ES')} € en 2070.`
      }
    ]
  };
}

