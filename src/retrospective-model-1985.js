/**
 * Synthetic retrospective experiment, not a reconstruction of observed Spain.
 * A single cohort/fiscal run starts from an explicit 1984 opening and carries
 * every balance through 2070. No future pension, fund, deficit or debt target
 * is an input, and no result from a 2026 run is rescaled into a historical one.
 */
import { CURRENT_SPAIN } from '../data/current-spain-v8.js';
import { omitInactivePastRights } from './shared/ndc-past-rights.js';
import { omitDefaultInvestmentShare } from './shared/public-capital.js';
import { omitDefaultAgeSteps } from './shared/retirement-age-steps.js';
import { DEBT_POLICY_2026 } from '../data/debt-policy-2026.js';
import { RETIREMENT_AGE_WEIGHTS } from '../data/current-pension-stock.js';
import { OFFICIAL_MORTALITY_EUROPOP2025 as OFFICIAL_MORTALITY } from '../data/official-mortality-europop2025.js';
import { AR2024_DEMOGRAPHY as AR } from '../data/official-demography.js';
import { createCurrentCohorts } from './current-cohorts-v10.js';
import { createSimulator } from './current-simulation-core-v10.js';
import { createCurrentFiscalEngineV13 } from './current-fiscal-v13.js';
import { ISSUANCE_LADDER_ID, issuanceMaturityWeights } from './debt-issuance.js';
import { createCurrentPolicyV7 } from './current-policy-v7.js';
import { createFiscalCompositionV10 } from './fiscal-composition-v10.js';
import { createMutuaPensionBridgeV8 } from './mutua-pension-bridge-v8.js';
import { createWagePathV6 } from './wage-path-v6.js';
import { createMortality } from './mortality-core.js';
import { cohort } from './cohort-core.js';
import { automationAt } from './automation-scenario.js';
import { describeAutomationParadigmEffect, captiveOptions } from './progressive-transition.js';
import { fertilityFactor } from './fertility-scenario.js';
import { paymentSpendingAdjustment } from './payment-spending-adjustment.js';
import { paymentAdjustmentForYear } from './config-current-v10.js';
import { DEFAULT_CONFIG, validateConfig } from './shared/default-config.js';
import { ageingCarePoints } from './ageing-care.js';

const OPENING_YEAR = 1984;
const CURRENT_YEAR = 2026;
const END_YEAR = 2070;
const STATION_YEARS = [1985, 1995, 2000, 2008, 2012, 2020, 2026];

export const RETROSPECTIVE_1985_ASSUMPTIONS = Object.freeze({
  id: 'retrospective-1985-ledger-v1',
  status: 'Experimento retrospectivo sintético; no reconstrucción histórica validada ni previsión oficial.',
  priceBasis: 'Todos los importes reales están expresados en euros de poder adquisitivo de 2026.',
  openingYear: OPENING_YEAR,
  firstReformYear: 1985,
  openingFundedAssets: 0,
  openingNotionalBalance: 0,
  openingTreasuryCash: 0,
  openingDebtGDP: 0.40,
  openingWorkersPerRetiree: 3.4,
  historicalEmploymentGrowth: 0.012,
  historicalRealWageGrowth: 0.01,
  historicalProductivityGrowth: 0.01,
  historicalInflation: 0.02,
  historicalNominalDebtRate: 0.04,
  historicalInitialDebtMaturityYears: 8,
  sources: Object.freeze([
    { path: 'data/current-spain-v8.js', kind: 'calibracion-2026', use: 'Anclas de empleo, salario, productividad, prestación media y perímetro fiscal de 2026; no son datos de 1984.' },
    { path: 'src/current-cohorts-v10.js', kind: 'proxy-retrospectivo', use: 'Perfil de edad y sexo de 2026 trasladado a 1984 y escalado; no se afirma reproducir el baby boom ni el empleo histórico.' },
    { path: 'data/official-mortality-europop2025.js', kind: 'proxy-retrospectivo', use: 'Mortalidad proyectada de 2026 congelada antes de 2026; después se usa la trayectoria disponible. No es mortalidad observada de 1985.' },
    { path: 'data/official-demography.js', kind: 'proyeccion-de-referencia', use: 'Desde 2026, trayectorias de empleo, productividad y otras pensiones de la referencia ya usada por el proyecto.' },
    { path: 'src/retrospective-model-1985.js', kind: 'hipotesis-sinteticas', use: 'Deuda inicial del 40 %, ratio 3,4 y crecimientos constantes declarados arriba. No están estimados ni calibrados a resultados.' },
    { path: 'src/progressive-transition.js', kind: 'hipotesis-de-cartera', use: 'Rentabilidad y primas de la cartera elegida son supuestos configurables, no rendimientos históricos realizados.' },
    { path: 'src/current-fiscal-v13.js', kind: 'reglas-contables', use: 'Financiación por caja y deuda con vencimientos, intereses y prima condicional. La curva de plazos de 2026 se reutiliza como proxy explícita en todo el experimento.' }
  ]),
  funding: Object.freeze({
    fundedAssets: 'Fondo inicial cero. Solo recibe cuotas desviadas una vez desde la nómina y el rendimiento supuesto de sus activos; paga prestaciones y legados.',
    notionalRights: 'Créditos virtuales separados de activos invertidos. Sus cuotas entran en caja pública y financian pagos públicos.',
    legacyRights: 'Derechos anteriores a 1985 aproximados por carrera plana y protegidos en el pilar público; no se convierten en activos del fondo.',
    publicBudget: 'Cuotas públicas más otros ingresos explícitos; el reparto de impuestos a pensiones es interno y no crea ingresos.',
    shortfall: 'El déficit y sus intereses consumen caja o generan deuda; el superávit amortiza deuda o acumula caja. Ningún flujo se ajusta para asegurar cobertura.',
    otherReserves: 'No se importa una hucha observada en 2026 ni se añade una reserva, aportación institucional o dividendo robot sin financiador.'
  }),
  historicalFiscalPolicy: 'Antes de 2026: cuota ordinaria configurada, sin MEI ni solidaridad; otros ingresos y otros gastos primarios mantienen las participaciones de la calibración 2026. IPC 2 % y tipo nominal base 4 % son hipótesis. Prima de riesgo y plazos mantienen las reglas del experimento.',
  historicalControls: 'Rentabilidad, cartera, transición, cuota y edad de jubilación se ensayan desde 1985. Fertilidad, IA, desviaciones macro, revalorización manual y medidas fiscales fechadas actúan desde 2027. No hay inflación histórica observada.',
  continuity: 'No se reinician cohortes, activos, derechos, caja, deuda ni contratos en 2026. Solo cambia la fuente explícita de los insumos macro y fiscales.',
  comparability: 'Las seis vías actuales parten de la foto calibrada de 2026. Esta vía llega a 2026 desde hipótesis de 1984: sus jubilados, pasivos y resultados no se igualan a esa foto y no prueban un ahorro frente a la España observada.'
});

let model;

function createRetrospectiveModel() {
  const H = RETROSPECTIVE_1985_ASSUMPTIONS;
  const base = { ...CURRENT_SPAIN.base };
  base.otherRevenue = base.totalRevenue - base.pensionContributions;
  base.otherPrimarySpending = base.totalSpending - base.interest - base.publicPensionBenefits;
  const current = createCurrentCohorts({ ...base, baseYear: CURRENT_YEAR, endYear: END_YEAR,
    entryAge: 22, retirementAge: 65, careerYears: 43, accruedReplacementRate: .77,
    retirementAgeWeights: RETIREMENT_AGE_WEIGHTS });
  const wages = createWagePathV6(base, current);
  const composition = createFiscalCompositionV10(base);
  const mutuaBridge = createMutuaPensionBridgeV8(base);
  const historicYears = CURRENT_YEAR - OPENING_YEAR;
  const openingWorkers = base.workers / (1 + H.historicalEmploymentGrowth) ** historicYears;
  const openingWage = base.wage / (1 + H.historicalRealWageGrowth) ** historicYears;
  const openingProductivity = base.gdp / base.workers / (1 + H.historicalProductivityGrowth) ** historicYears;
  const openingGDP = openingWorkers * openingProductivity;
  const openingRetirees = openingWorkers / H.openingWorkersPerRetiree;
  const openingPension = base.retirementAnnualBenefits / base.retirees * openingWage / base.wage;
  const cohortBase = { ...current.COHORT_BASE, baseYear: OPENING_YEAR, endYear: END_YEAR,
    workers: openingWorkers, wage: openingWage, gdp: openingGDP, retirees: openingRetirees,
    retirementAnnualBenefits: openingRetirees * openingPension,
    legacyReplacementRate: openingPension / openingWage };
  const defaults = { ...DEFAULT_CONFIG, initialDebtGDP: H.openingDebtGDP };
  const mortalityYears = Array.from({ length: OFFICIAL_MORTALITY.years.at(-1) - OPENING_YEAR + 1 }, (_, i) => OPENING_YEAR + i);
  const mortality = createMortality({ years: mortalityYears, ages: OFFICIAL_MORTALITY.ages,
    mortalityMx: Object.fromEntries(['M', 'F'].map(sex => [sex, mortalityYears.map(year =>
      OFFICIAL_MORTALITY.mortalityMx[sex][Math.max(CURRENT_YEAR, year) - OFFICIAL_MORTALITY.years[0]])])) });
  // Cohorts are labelled year − age from single-age stocks: their mortality is that of age + 0,5, as in the main
  // engine (src/current-cohorts-v10.js, COHORT_AGE_SHIFT; 1.76).
  const halfYearSurvival = (year, age, sex, longevityGain = 0) => mortality.halfYearSurvival(
    year, age + 0.5 - longevityGain * Math.max(0, year - CURRENT_YEAR), sex, 0);
  const factorCache = new Map();
  function annuityFactor(year, age, sex, startHalf = 0, longevityGain = 0, halfRate = 0) {
    const key = `${year}|${age}|${sex}|${startHalf}|${longevityGain}|${halfRate}`;
    if (factorCache.has(key)) return factorCache.get(key);
    let factor = 0, survival = 1, half = startHalf, y = year, a = age;
    while (true) {
      const step = halfYearSurvival(y, a, sex, longevityGain) / (1 + halfRate);
      if (y >= mortalityYears.at(-1) && a - longevityGain * Math.max(0, y - CURRENT_YEAR) >= OFFICIAL_MORTALITY.ages.at(-1)) {
        if (!(step < 1)) throw new RangeError('Retrospective annuity tail does not converge');
        factor += .5 * survival / (1 - step);
        break;
      }
      factor += .5 * survival;
      survival *= step;
      if (half === 1) { y++; a++; half = 0; } else half = 1;
    }
    if (!(Number.isFinite(factor) && factor > 0)) throw new RangeError('Invalid retrospective annuity');
    factorCache.set(key, factor);
    return factor;
  }
  const initialReference = current.initialCohorts().map(item => ({ ...item,
    birthYear: item.birthYear - historicYears,
    size: item.size * (item.retired ? openingRetirees / base.retirees : openingWorkers / base.workers),
    legacyAnnual: item.legacyAnnual * openingWage / base.wage
  }));
  const initialCohorts = () => initialReference.map(item => ({ ...item }));
  const targetAge = (item, retirementAge = 65) => (item.targetRetirementAge ?? 65) + retirementAge - 65;
  const shouldRetire = (item, year, half, config) => year - item.birthYear >= targetAge(item, config.retirementAge) && (half === 1 || !item.hasWorked);
  function employmentExposure(item, year, retirementAge = 65, longevityGain = 0) {
    const age = year - item.birthYear, target = targetAge(item, retirementAge);
    if (item.retired || (age >= target && !item.hasWorked)) return 0;
    return item.size * .5 * (1 + (age < target ? halfYearSurvival(year, age, item.sex, longevityGain) : 0));
  }
  const referenceEmployment = year => year < CURRENT_YEAR
    ? base.workers * (1 + H.historicalEmploymentGrowth) ** (year - CURRENT_YEAR)
    : current.referenceEmployment(year);
  const referenceEntries = new Map();
  let active = initialCohorts().filter(item => !item.retired);
  for (let year = OPENING_YEAR + 1; year <= END_YEAR; year++) {
    const continuing = active.reduce((sum, item) => sum + employmentExposure(item, year), 0);
    const needed = Math.max(0, referenceEmployment(year) - continuing);
    const candidates = year > CURRENT_YEAR ? current.entrantCohorts(year) :
      ['M', 'F'].flatMap(sex => RETIREMENT_AGE_WEIGHTS.map(row => ({ ...cohort(year - 22, row.weight * .5, sex),
        targetRetirementAge: row.age, youngEntryShare: 1 })));
    const exposure = candidates.reduce((sum, item) => sum + employmentExposure(item, year), 0);
    if (!(exposure > 0)) throw new RangeError('Missing retrospective entrant profile');
    const entries = candidates.map(item => ({ ...item, size: item.size * needed / exposure }));
    referenceEntries.set(year, entries);
    active.push(...entries.map(item => ({ ...item })));
    active = active.filter(item => !shouldRetire(item, year, 1, { retirementAge: 65 }));
    for (const item of active) {
      item.size *= halfYearSurvival(year, year - item.birthYear, item.sex) ** 2;
      item.hasWorked = true;
    }
  }
  function entrantCohorts(year, growthDeviation = 0, config = {}) {
    const trend = (1 + growthDeviation) ** Math.max(0, year - CURRENT_YEAR);
    return referenceEntries.get(year).map(item => {
      const fertilityScale = 1 + (item.youngEntryShare ?? 0) * (fertilityFactor(item.birthYear, config.targetFertility ?? 0) - 1);
      return { ...item, fertilityScale, size: item.size * trend * fertilityScale };
    });
  }
  const rawWage = (year, growth, config) => year < CURRENT_YEAR
    ? base.wage * (1 + H.historicalRealWageGrowth) ** (year - CURRENT_YEAR)
    : wages.productionWage(year, growth, config);
  const rawProductivity = (year, growth = 0) => year < CURRENT_YEAR
    ? base.gdp / base.workers * (1 + H.historicalProductivityGrowth) ** (year - CURRENT_YEAR)
    : current.outputPerWorker(year, growth);
  let cachedYear, cachedConfig, cachedTech;
  function technology(year, config) {
    if (year !== cachedYear || config !== cachedConfig) {
      cachedYear = year; cachedConfig = config;
      cachedTech = automationAt(year, config, CURRENT_YEAR);
    }
    return cachedTech;
  }
  const paradigmAt = (year, config) => describeAutomationParadigmEffect(year, config, technology(year, config), CURRENT_YEAR);
  const referenceWage = (year, growth, config) => rawWage(year, growth, config) * technology(year, config).wageFactor;
  const priceIndex = (year, config) => year <= CURRENT_YEAR
    ? (1 + H.historicalInflation) ** (year - CURRENT_YEAR)
    : (1 + config.inflationRate) ** (year - CURRENT_YEAR);
  const policy = createCurrentPolicyV7(base, { priceIndex,
    nominalWageIndex: (year, config) => referenceWage(year, config.realWageGrowth, config) * priceIndex(year, config) / base.wage });
  const fiscalBase = { baseYear: OPENING_YEAR, gdp: openingGDP, debt: openingGDP * H.openingDebtGDP,
    interest: openingGDP * H.openingDebtGDP * H.historicalNominalDebtRate,
    otherPrimarySpending: openingGDP * base.otherPrimarySpending / base.gdp };
  const fiscal = createCurrentFiscalEngineV13(fiscalBase, { policy: { ...DEBT_POLICY_2026,
    id: 'retrospective-synthetic-opening-debt-v1', baseYear: OPENING_YEAR,
    initialMaturityWeights: Array.from({ length: H.historicalInitialDebtMaturityYears }, (_, i) =>
      ({ maturityYear: OPENING_YEAR + i + 1, weight: 1 / H.historicalInitialDebtMaturityYears })) },
    maturityWeightsForTerm: issuanceMaturityWeights, issuanceProfile: ISSUANCE_LADDER_ID });
  const annualConfig = (year, config) => year <= CURRENT_YEAR ? { ...config,
    inflationRate: H.historicalInflation,
    realInterestRate: (1 + H.historicalNominalDebtRate) / (1 + H.historicalInflation) - 1 } : config;
  function fiscalParts(gdp, config, year, previous, income) {
    if (year < CURRENT_YEAR) return {
      generalTaxRevenueOverride: gdp * config.taxRevenueGDP,
      otherPrimarySpendingOverride: gdp * base.otherPrimarySpending / base.gdp,
      nonCashRevenue: 0, restrictedMutuaRevenue: 0, mutuaPensionTransfer: 0, earmarkedRevenue: 0, pensionShareScale: 1
    };
    const price = priceIndex(year, config);
    const anchor = year === 2028 ? gdp * price : previous?.fiscal2028NominalGDP ?? null;
    const spendingAnchor = year === 2028 ? income.spendingGDP * price : previous?.fiscal2028SpendingNominalGDP ?? null;
    const drivers = policy.baseResponse(year, config);
    const values = composition.accounts({ year, gdp, realPayroll: income.realPayroll, priceIndex: price,
      ordinaryContributionAdjustment: drivers.ordinaryAdjustment,
      mutuaContributionAdjustment: drivers.mutuaAdjustment,
      gdp2028: anchor === null ? null : { nominalGDP: anchor },
      spendingGDP2028: spendingAnchor === null ? null : { nominalGDP: spendingAnchor }, config, ...income });
    const mutua = mutuaBridge.accounts({ realPayroll: income.realPayroll, mutuaContributions: values.fiscalComposition.mutuaContributions });
    const adjusted = paymentSpendingAdjustment(values, mutua.mutuaPensionTransfer, paymentAdjustmentForYear(config.paymentAdjustments, year));
    const paradigm = paradigmAt(year, config);
    // From 2026 the same pressure of ageing on health and long-term care as the current model.
    const careAgeingSpending = ageingCarePoints(year, config, current.lifeExpectancyAt65, CURRENT_YEAR) / 100 * income.spendingGDP;
    return { ...values, ...adjusted, ...mutua, careAgeingSpending,
      generalTaxRevenueOverride: values.generalTaxRevenueOverride + paradigm.fiscalRevenueDelta,
      otherPrimarySpendingOverride: Math.max(0, (adjusted.otherPrimarySpendingOverride ?? values.otherPrimarySpendingOverride) + income.displacementSupport + paradigm.fiscalSpendingDelta + careAgeingSpending),
      nonCashRevenue: values.fiscalComposition.imputedSocialContributions,
      restrictedMutuaRevenue: values.fiscalComposition.mutuaContributions,
      earmarkedRevenue: values.fiscalComposition.temporaryMatchedRevenue, pensionShareScale: composition.opening.pensionShareScale,
      contributionBaseDrivers: drivers,
      fiscal2028NominalGDP: anchor, fiscal2028SpendingNominalGDP: spendingAnchor };
  }
  const fiscalOptions = p => ({ generalTaxRevenueOverride: p.generalTaxRevenueOverride,
    otherPrimarySpendingOverride: p.otherPrimarySpendingOverride, nonCashRevenue: p.nonCashRevenue,
    restrictedMutuaRevenue: p.restrictedMutuaRevenue, mutuaPensionTransfer: p.mutuaPensionTransfer,
    earmarkedRevenue: p.earmarkedRevenue, pensionShareScale: p.pensionShareScale });
  const fiscalMetadata = p => Object.fromEntries(['fiscalComposition', 'fiscalMeasures', 'fiscalRescue', 'careAgeingSpending',
    'paymentSpendingAdjustment', 'contributionBaseDrivers', 'revenueDrivers', 'mutuaCapitalCostTransfer',
    'mutuaReinsuranceTransfer', 'fiscal2028NominalGDP', 'fiscal2028SpendingNominalGDP'].filter(key => p[key] !== undefined).map(key => [key, p[key]]));
  const otherShare = year => {
    const row = AR.annual[Math.max(CURRENT_YEAR, year) - AR.baseYear];
    return row.publicPensionSpendingGDPpct - row.earningsRelatedRetirementSpendingGDPpct;
  };
  const engine = createSimulator({ base: cohortBase, defaults,
    retirementContributionShare: base.retirementContributionShare,
    initialCohorts, entrantCohorts, employmentExposure, shouldRetire, referenceEmployment,
    expectedRetirementYear: (item, year, config) => Math.max(year, item.birthYear + Math.ceil(targetAge(item, config.retirementAge))),
    employmentShare: (item, year, half, config) => item.retired || shouldRetire(item, year, half, config) ? 0 : technology(year, config).paidWorkShare,
    referenceWage,
    outputPerWorker: (year, growth, config) => rawProductivity(year, growth) * technology(year, config).productivityFactor * paradigmAt(year, config).autonomousGdpMultiplier,
    spendingOutputPerWorker: rawProductivity,
    newAwardRate: year => year < CURRENT_YEAR ? .77 : current.newAwardRate(year),
    halfYearSurvival, annuityFactor,
    futureScenarioAt: (year, config) => ({ ...technology(year, config), ...paradigmAt(year, config),
      targetFertility: config.targetFertility, productivityGrowth: config.productivityGrowth, wageGrowth: config.realWageGrowth }),
    displacementSupport: (year, config, displacedWorkers) => displacedWorkers * rawWage(year, config.realWageGrowth, config) *
      technology(year, config).wageBeforeReemploymentFactor * config.displacementSupportRate * (1 - paradigmAt(year, config).displacementSupportOffset),
    contributionRates: (year, config) => year < CURRENT_YEAR ? {
      retirementRate: config.contributionRate * base.retirementContributionShare,
      protectedRate: config.contributionRate * (1 - base.retirementContributionShare), meiRate: 0
    } : policy.contributionRates(year, config),
    pensionInPaymentRealIndex: (year, item, config) => year <= CURRENT_YEAR ? 1 : policy.pensionInPaymentRealIndex(year, item, config),
    otherPensionSpendingShare: year => base.otherPensionBenefits / base.gdp * otherShare(year) / otherShare(CURRENT_YEAR),
    initialFiscalAccounts(gdp, benefits, contributions, config, debtRatio, mei, income) {
      const p = fiscalParts(gdp, config, OPENING_YEAR, null, income);
      const result = fiscal.initialFiscalAccounts(gdp, benefits, contributions, config, debtRatio, mei, fiscalOptions(p));
      const price = priceIndex(OPENING_YEAR, config);
      const ledger = result.debtVintageLedger.map(row => ({ ...row, principalNominal: row.principalNominal * price }));
      return { ...result, priceIndex: price, debtVintageLedger: ledger, baseRateDebtVintageLedger: ledger };
    },
    publicAccounts(gdp, benefits, contributions, previous, config, year, mei, income) {
      const p = fiscalParts(gdp, config, year, previous, income);
      return { ...fiscal.publicAccounts(gdp, benefits, contributions, previous, annualConfig(year, config), year, mei, { ...fiscalOptions(p), ...captiveOptions(previous, config) }),
        ...fiscalMetadata(p) };
    }, marketShockYear: 2035, capitalizationBaseYear: CURRENT_YEAR, trackRetirementFlows: true,
    // The year's price change, historical before 2026 (the captive fund's real return; since 1.75).
    inflationAt: (year, config) => annualConfig(year, config).inflationRate });

  return input => {
    // The 1985 counterfactual does not model the AIReF's short run to 2030 (airefShortRunEmployment, src/shared/
    // short-run-employment.js): it would take only its lower wage, not its employment or prices. It runs without it
    // (docs/REVISION-ADVERSARIAL-2026-11-24.md, 6 and 18).
    const config = validateConfig({ ...input, airefShortRunEmployment: 0 });
    const computed = engine.simulate({ ...config, initialDebtGDP: H.openingDebtGDP });
    // This includes a calculated 2026 flow, unlike the current-model snapshot.
    for (const point of computed.years) point.retro1985 = true;
    const years = computed.years.filter(point => point.year >= CURRENT_YEAR);
    return { ...computed, config: omitDefaultAgeSteps(omitDefaultInvestmentShare(omitInactivePastRights(config))), years, retro1985: true, modelVersion: H.id,
      historicalYears: computed.years.filter(point => point.year <= CURRENT_YEAR),
      historical1985: computed.years.filter(point => STATION_YEARS.includes(point.year)),
      assumptions: H,
      summary: { firstGapYear: years.find(point => point.pensionGap > 0)?.year ?? null,
        maxGapGDP: Math.max(...years.map(point => point.pensionGapGDP)), endDebtGDP: years.at(-1).debtGDP,
        endBaseRateDebtGDP: years.at(-1).baseRateDebtGDP } };
  };
}

export function simulateRetrospective1985(input = {}) {
  model ??= createRetrospectiveModel();
  return model(input);
}
