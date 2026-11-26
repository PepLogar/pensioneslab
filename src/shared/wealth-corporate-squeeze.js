// Pensiones Lab 3 keeps the analysis and the configuration patches; the interactive panel of the site
// (viaje.html) was left out (docs/DECISIONES.md).
// "What if the rich and corporations pay for it — and what if
// Hacienda goes God Mode (0% tax fraud, 0% underground economy, everyone contributing)?"
// Uses official AEAT IRPF bracket distributions (REVENUE_BASES_V4.profile2024)
// and IGAE corporate/employer contribution totals to contrast static ("paper")
// assumptions against dynamic Laffer, underground activity destruction, and
// future pension entitlements accrued by newly formalized workers.
import { S0_SHORT } from './risk-wording.js';
import { REVENUE_BASES_V4 as D } from '../../data/revenue-bases-v4.js';
import { WAGE_BRIDGE_V5 as W } from '../../data/wage-bridge-v5.js';
import { DEFAULT_CONFIG, LABOUR_WEDGE } from './default-config.js';
import { FLAGSHIP_PROGRESSIVE, FLAGSHIP_RETRO_1985, isRetro1985Active, activeSystemKey, selectSystemPatch } from './scenario-labels.js';
import { pensionBudgetShareWith } from './scenario-measures.js';
import { millions, share } from './number-format.js';
import { lafferRetainedShare, lafferBaseChange } from './laffer-response.js';
import { CURRENT_SPAIN } from '../../data/current-spain-v8.js';

const STORAGE_KEY = 'pensiones-lab:wealth-squeeze-v1';
const RETRO_TAXCUT_STORAGE_KEY = 'pensiones-lab:retro1985-taxcut-v1';
const intFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const dec1Fmt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
// The common format (src/shared/number-format.js): a non-breaking space before the unit, the real minus.
// The analyses come in euros of the year they read; the screen shows euros of 2026, like the train
// board next to it (docs/PROPUESTA-EUROS-CONSTANTES-2026-11-09.md). `shownIndex` is that year's price index.
let shownIndex = 1;
const indexOf = point => (point?.priceIndex > 0 ? point.priceIndex : 1);
const moneyM = v => millions(Number.isFinite(v) ? v / shownIndex : v);
const pct1 = v => share(v, 1, { fixed: true });
// The ladder caps each share of the hole at 150 % (computeConfiscationLadder): say so.
const holeShare = v => Number.isFinite(v) && v >= 1.5 ? 'más del 150\u00a0%' : pct1(v);

export const DEFAULT_RETRO1985_TAXCUT_PARAMS = Object.freeze({
  irpfUnder30kCut: 0,       // 0..1 (0% to 100% IRPF cut for incomes <= 30,000 € · 15.04M declarants = 67.1%)
  irpfMiddle30to60kCut: 0,  // 0..1 (0% to 100% IRPF cut for incomes 30,000 - 60,000 € · 5.79M declarants)
  corporateTaxCut: 0,       // 0..1 (0% to 100% Corporate Tax cut on 52,120 M€ · 0.50 = 12.5% Ireland rate / 0% SMEs)
  vatCut: 0,                // 0..0.50 (0% to 50% VAT cut on 114,428 M€ · 0.28 = general VAT from 21% to 15%)
  employerSSCutPoints: 0,   // 0..0.06 (0 to -6.0 pp employer & self-employed SS contribution cut)
  mode: 'dynamic'           // 'dynamic' (consumption & investment boost to GDP, wages & backpacks) | 'static'
});

export const RETRO1985_TAXCUT_PRESETS = Object.freeze({
  off: {
    id: 'off',
    label: '↺ Sin rebaja fiscal',
    params: { ...DEFAULT_RETRO1985_TAXCUT_PARAMS }
  },
  comboEstrella: {
    id: 'comboEstrella',
    label: 'Combinación 1985 (IRPF 0 % ≤30k € + Sociedades al 12,5 % + −25 % clase media)',
    params: {
      irpfUnder30kCut: 1.0,
      irpfMiddle30to60kCut: 0.25,
      corporateTaxCut: 0.50,
      vatCut: 0,
      employerSSCutPoints: 0,
      mode: 'dynamic'
    }
  },
  zeroIrpf30k: {
    id: 'zeroIrpf30k',
    label: '👷 IRPF 0 % hasta 30.000 € (libera a 15,04 M de españoles · 67 % declarantes)',
    params: {
      irpfUnder30kCut: 1.0,
      irpfMiddle30to60kCut: 0,
      corporateTaxCut: 0,
      vatCut: 0,
      employerSSCutPoints: 0,
      mode: 'dynamic'
    }
  },
  zeroSociedades: {
    id: 'zeroSociedades',
    label: '🏭 Sociedades 0 % Total (eliminar el 100 % del Impuesto de Sociedades)',
    params: {
      irpfUnder30kCut: 0,
      irpfMiddle30to60kCut: 0,
      corporateTaxCut: 1.0,
      vatCut: 0,
      employerSSCutPoints: 0,
      mode: 'dynamic'
    }
  },
  alivioFamilias: {
    id: 'alivioFamilias',
    label: '🛒 Alivio Total Familias (IRPF 0 % ≤30k € + IVA general al 15 % + −30 % clase media)',
    params: {
      irpfUnder30kCut: 1.0,
      irpfMiddle30to60kCut: 0.30,
      corporateTaxCut: 0,
      vatCut: 0.28,
      employerSSCutPoints: 0,
      mode: 'dynamic'
    }
  },
  pasarseFrenada: {
    id: 'pasarseFrenada',
    label: '⚠️ Pasarse de frenada (Quitar >165.000 M€ de golpe: ver dónde salta el déficit)',
    params: {
      irpfUnder30kCut: 1.0,
      irpfMiddle30to60kCut: 0.85,
      corporateTaxCut: 1.0,
      vatCut: 0.35,
      employerSSCutPoints: 0.04,
      mode: 'dynamic'
    }
  }
});

export function isRetro1985TaxCutActive(params) {
  if (!params) return false;
  return (params.irpfUnder30kCut ?? 0) > 0.005 ||
    (params.irpfMiddle30to60kCut ?? 0) > 0.005 ||
    (params.corporateTaxCut ?? 0) > 0.005 ||
    (params.vatCut ?? 0) > 0.005 ||
    (params.employerSSCutPoints ?? 0) > 0.0005;
}

/**
 * Computes the fiscal and macroeconomic impact of cutting taxes in the counterfactual
 * 1985 experiment, using the existing AEAT/IGAE bases and explicit behavioral assumptions.
 */
export function computeRetro1985TaxCutAnalysis(params = DEFAULT_RETRO1985_TAXCUT_PARAMS, yearPoint = null) {
  const p = { ...DEFAULT_RETRO1985_TAXCUT_PARAMS, ...params };
  const year = yearPoint?.year ?? 2026;
  const gdpRatio = yearPoint?.gdp ? (yearPoint.gdp * (yearPoint.priceIndex ?? 1)) / 1782963000000 : 1;

  // A counterfactual does not establish a historical fiscal dividend. Read the
  // current simulation balance without adding invented pension/interest savings
  // or subtracting a tax cut a second time. Monetary outputs below are nominal.
  const fiscalBalanceAvailable = Number.isFinite(yearPoint?.stateBalance);
  const currentFiscalBalance = fiscalBalanceAvailable ? yearPoint.stateBalance * (yearPoint.priceIndex ?? 1) : null;
  const freedPensionTaxes = null;
  const freedDebtInterest = null;
  const freedFiscalMargin = fiscalBalanceAvailable ? Math.max(0, currentFiscalBalance) : null;

  // 2. AEAT & IGAE Tax Bases in 2026 euros scaled by gdpRatio:
  // - Declarants <= 30,000 €: 15,041,728 people (67.1% of 22,411,726 total declarants), total IRPF liability ~24,520 M€
  // - Declarants 30,000 - 60,000 €: 5,790,767 people (25.8% of total declarants), total IRPF liability ~47,400 M€
  // - Corporate Tax (Impuesto sobre Sociedades): 52,120 M€ (2025) -> ~54,980 M€ in 2026
  // - VAT (IVA): 114,428 M€ (2025) -> ~120,720 M€ in 2026
  // - Employer & Self-Employed SS payroll base: ~815,000 M€
  const declarantsUnder30k = 15041728;
  const declarantsMiddle30to60k = 5790767;
  const totalDeclarants = 22411726;

  const baseIrpfUnder30k = 24520000000 * gdpRatio;
  const baseIrpfMiddle30to60k = 47400000000 * gdpRatio;
  const baseCorporateTax = D.tax2025.corporate * 1.055 * gdpRatio;
  const baseVat = D.tax2025.vatLike * 1.055 * gdpRatio;
  const basePayroll = (D.ine.compensation * 0.82) * 1.055 * gdpRatio;

  const cutIrpfUnder30k = baseIrpfUnder30k * p.irpfUnder30kCut;
  const cutIrpfMiddle30to60k = baseIrpfMiddle30to60k * p.irpfMiddle30to60kCut;
  const cutCorporate = baseCorporateTax * p.corporateTaxCut;
  const cutVat = baseVat * p.vatCut;
  const cutEmployerSS = basePayroll * p.employerSSCutPoints;

  const grossTaxCut = cutIrpfUnder30k + cutIrpfMiddle30to60k + cutCorporate + cutVat + cutEmployerSS;

  // 3. Response of the bases (since 1.37, with sources; docs/AUDITORIA-MODULO-RENTAS-ALTAS.md):
  // - Cuts on labour (the labour part of IRPF and employer contributions): the same
  //   long-run curve the engine uses (Trabandt and Uhlig, Spain, src/shared/laffer-response.js);
  //   a cut is partly self-financing, about 45 %.
  // - Corporate tax: the CRS curve with the peak at 61 % (Kawano and Slemrod): about 20 %.
  // - VAT: Trabandt and Uhlig find no peak for consumption taxes and give no
  //   self-financing figure: counted as static.
  // No growth, wage, employment or return boosts: they had no source and would count
  // the response of the bases twice.
  const labourShareOfIrpf = D.personalMix2025.salary / D.personalMix2025.total;
  const labourCut = (cutIrpfUnder30k + cutIrpfMiddle30to60k) * labourShareOfIrpf + cutEmployerSS;
  const compensation = D.ine.compensation * 1.055 * gdpRatio;
  const labourTaxChange = -labourCut / compensation;
  const labourReturn = labourCut * (1 - lafferRetainedShare(labourTaxChange));
  const corporateReturn = cutCorporate * (1 - corporateRetainedShare(-p.corporateTaxCut));
  const dynamicFeedbackReturn = p.mode === 'dynamic'
    ? labourReturn + corporateReturn
    : 0;

  const netFiscalCost = Math.max(0, grossTaxCut - dynamicFeedbackReturn);
  const remainingSurplus = currentFiscalBalance;
  const marginUsedShare = freedFiscalMargin > 0 ? netFiscalCost / freedFiscalMargin : null;
  const grossMarginUsedShare = freedFiscalMargin > 0 ? grossTaxCut / freedFiscalMargin : null;

  // 4. No macro boosts are injected into the engine; the labour base grows as in Trabandt and Uhlig.
  const wageGrowthBoost = 0;
  const productivityBoost = 0;
  const entrantGrowthBoost = 0;
  const realReturnBoost = 0;
  const labourBaseChangeLongRun = p.mode === 'dynamic' ? lafferBaseChange(labourTaxChange) : 0;

  // Per-person / household illustrative pocket gains in 2026 euros:
  const worker25kAnnualGain = Math.round(2480 * p.irpfUnder30kCut + 920 * (p.vatCut / 0.28));
  const pro45kAnnualGain = Math.round(2480 * p.irpfUnder30kCut + 3850 * p.irpfMiddle30to60kCut + 1350 * (p.vatCut / 0.28));
  const effectiveCorpRatePct = 25 * (1 - p.corporateTaxCut);
  const effectiveVatRatePct = 21 * (1 - p.vatCut);

  return {
    year,
    gdpRatio,
    fiscalBalanceAvailable,
    currentFiscalBalance,
    freedPensionTaxes,
    freedDebtInterest,
    freedFiscalMargin,
    declarantsUnder30k,
    declarantsMiddle30to60k,
    totalDeclarants,
    baseIrpfUnder30k,
    baseIrpfMiddle30to60k,
    baseCorporateTax,
    baseVat,
    cutIrpfUnder30k,
    cutIrpfMiddle30to60k,
    cutCorporate,
    cutVat,
    cutEmployerSS,
    grossTaxCut,
    dynamicFeedbackReturn,
    netFiscalCost,
    remainingSurplus,
    marginUsedShare,
    grossMarginUsedShare,
    wageGrowthBoost,
    productivityBoost,
    entrantGrowthBoost,
    realReturnBoost,
    labourReturn,
    corporateReturn,
    labourBaseChangeLongRun,
    worker25kAnnualGain,
    pro45kAnnualGain,
    effectiveCorpRatePct,
    effectiveVatRatePct
  };
}

/**
 * Translates the 1985 Tax-Cut parameters into a valid model-current-v10 config patch
 * on top of FLAGSHIP_RETRO_1985 so the Train, backpacks, wages, and public debt recalculate.
 */
export function buildRetro1985TaxCutConfigPatch(params = DEFAULT_RETRO1985_TAXCUT_PARAMS) {
  const p = { ...DEFAULT_RETRO1985_TAXCUT_PARAMS, ...params };
  const baseRetro = {
    ...SQUEEZE_RESET_PATCH,
    ...FLAGSHIP_RETRO_1985,
    realReturn: DEFAULT_CONFIG.realReturn
  };
  if (!isRetro1985TaxCutActive(p)) return baseRetro;

  const a = computeRetro1985TaxCutAnalysis(p);
  const gdp2026 = 1782963000000;
  const netCutGDPShare = a.netFiscalCost / gdp2026;
  const nextTaxRevGDP = Number(Math.max(0.08, DEFAULT_CONFIG.taxRevenueGDP - netCutGDPShare).toFixed(6));

  return {
    ...baseRetro,
    taxRevenueGDP: nextTaxRevGDP,
    realWageGrowth: Number(Math.min(0.04, DEFAULT_CONFIG.realWageGrowth + a.wageGrowthBoost).toFixed(5)),
    productivityGrowth: Number(Math.min(0.04, DEFAULT_CONFIG.productivityGrowth + a.productivityBoost).toFixed(5)),
    entrantGrowth: Number(Math.min(0.02, DEFAULT_CONFIG.entrantGrowth + a.entrantGrowthBoost).toFixed(5)),
    realReturn: Number(Math.min(0.08, DEFAULT_CONFIG.realReturn + a.realReturnBoost).toFixed(5))
  };
}

export function loadSavedRetro1985TaxCutParams() {
  try {
    const raw = localStorage.getItem(RETRO_TAXCUT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RETRO1985_TAXCUT_PARAMS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_RETRO1985_TAXCUT_PARAMS, ...parsed };
  } catch {
    return { ...DEFAULT_RETRO1985_TAXCUT_PARAMS };
  }
}

export function saveRetro1985TaxCutParams(params) {
  try {
    localStorage.setItem(RETRO_TAXCUT_STORAGE_KEY, JSON.stringify(params));
  } catch { /* ignore */ }
}

// Behavioural losses with a source (docs/AUDITORIA-MODULO-RENTAS-ALTAS.md; files in
// data/sources/audit-squeeze-2026/). Both come from changes between Spanish regions,
// where moving is easy: a national change, with no cheaper region to move to,
// would lose less, so they are upper references.
// - Top IRPF: Agrawal and Foremny (CESifo WP 7027, table A.21): a region raising the
//   top rate on income above 90.000 € loses about 29 % of the mechanical revenue
//   (9 % taxable income response, elasticity 0.15; 20 % mobility, elasticity 0.85).
// - Wealth tax: Agrawal, Foremny and Martínez-Toledano (AEJ: Applied 2025): with
//   Madrid at zero, the other regions lose 5 % of wealth tax revenue to mobility and
//   2.5 % of the income tax of wealth taxpayers, which is six times the wealth tax:
//   about 20 % of the wealth tax revenue in all.
export const SOURCED_SQUEEZE_LOSSES = Object.freeze({ topIrpf: 0.29, wealthTax: 0.20 });

// «Fraude fiscal cero» (docs/AUDITORIA-MODULO-RENTAS-ALTAS.md; data/sources/audit-fraude-2026/):
// - VAT compliance gap 2023: about 8.000 M€ (European Commission, «Mind the gap», SWD(2025) 421, Spain).
// - Corporate tax compliance gap: 11,9 % of the collected tax in 2016 (JRC method, same document).
// - IRPF fraud: about 1,7 % of GDP in 2008 (FEDEA, cited by the Commission: old, the only estimate).
// - Undeclared work: 6,7 % of private-sector labour input in 2019 (European Labour Authority, LIM).
// Paid at the average private wage and contribution rate, an upper bound: undeclared work is
// mostly low-paid. The closure and new-pension shares below remain assumptions of the simulator.
export const UNDECLARED_ECONOMY = Object.freeze({
  vatGapEUR: 8.0e9, corporateGapShare: 0.119, irpfFraudGDP: 0.017, undeclaredLabourShare: 0.067,
  taxShrinkage: 0.52, undeclaredJobsClosing: 0.42
});
const PRIVATE_COMPENSATION = D.ine.compensation - D.contributions2025.publicCompensation;
const CONTRIBUTION_RATE_ON_COMPENSATION = (D.contributions2025.actualEmployer + D.contributions2025.actualHousehold) / D.ine.compensation;
const PRIVATE_WORKER_SHARE = PRIVATE_COMPENSATION / D.ine.compensation;
const GDP_2026 = 1782963000000;

// Corporate tax: revenue R = A·t·(1 − t)^e (the net-of-tax elasticity form of the
// Congressional Research Service, R48913, 2026), peaking at t* = 1 / (1 + e). The
// default peak, 61 %, is Kawano and Slemrod (2016), the estimate that controls for
// base changes made with the rate (cited by the CRS). The OECD (WP 1407, 2017) puts
// the revenue-maximising effective marginal rate at 25 %, with Spain «particularly
// close», and Ortega-Gil et al. (2024) at 21,7 % for Spain (weak evidence): with
// those, a surcharge collects nothing. Editable in the panel. Statutory rate: 25 %.
export const CORPORATE_LAFFER = Object.freeze({ statutoryRate: 0.25, defaultPeakRate: 0.61, minPeakRate: 0.25, maxPeakRate: 0.9 });

/** Long-run share of the static revenue of a corporate tax surcharge (+0.35 = +35 % of the tax) that is collected. */
export function corporateRetainedShare(surcharge, peakRate = CORPORATE_LAFFER.defaultPeakRate) {
  // Negative values are cuts (−1 = the whole tax): the same curve.
  if (!Number.isFinite(surcharge) || surcharge === 0 || surcharge < -1) return 1;
  const peak = Math.min(CORPORATE_LAFFER.maxPeakRate, Math.max(CORPORATE_LAFFER.minPeakRate, peakRate));
  const e = 1 / peak - 1, t0 = CORPORATE_LAFFER.statutoryRate, t1 = Math.min(0.99, Math.max(0, t0 * (1 + surcharge)));
  const ratio = (t1 / t0) * Math.pow((1 - t1) / (1 - t0), e);
  return (ratio - 1) / surcharge;
}

export const DEFAULT_SQUEEZE_PARAMS = Object.freeze({
  irpfThreshold: 150000,         // € annual base: 600000, 150000, 60000, 30000
  irpfExtraPoints: 0,            // 0..0.25 (+0 to +25 pp marginal IRPF)
  wealthTaxMultiplier: 0,        // 0..2 (+0% to +200% extra on Wealth/Solidarity tax ~2.250 M€ base)
  corporateSurcharge: 0,         // 0..0.60 (+0% to +60% surcharge on Corporate Tax ~52.120 M€)
  corporatePeakRate: CORPORATE_LAFFER.defaultPeakRate, // corporate tax rate that maximises revenue (see CORPORATE_LAFFER)
  employerSSExtraPoints: 0,      // 0..0.06 (+0 to +6 pp employer social security rate)
  godModeTaxEnforcement: 0,      // 0..1 (0% to 100% eradication of tax evasion in VAT/IRPF/Corporate)
  godModeUndergroundLabor: 0,    // 0..1 (0% to 100% formalization of underground workers "todo el empleo sumergido cotizando")
  mode: 'realistic'              // 'realistic' (Laffer + subsistence destruction + future pension rights) | 'static' ("el papel lo aguanta todo")
});

export const SQUEEZE_PRESETS = Object.freeze({
  off: {
    id: 'off',
    label: 'Sin cambios fiscales (reglas de hoy)',
    params: { ...DEFAULT_SQUEEZE_PARAMS }
  },
  richOnly: {
    id: 'richOnly',
    label: '🎩 Más impuestos a rentas altas (>150.000 € y Fortunas)',
    params: {
      ...DEFAULT_SQUEEZE_PARAMS,
      irpfThreshold: 150000,
      irpfExtraPoints: 0.20,
      wealthTaxMultiplier: 1.5,
      mode: 'realistic'
    }
  },
  corpOnly: {
    id: 'corpOnly',
    label: '🏭 Más impuestos a empresas (Sociedades + Cuota patronal)',
    params: {
      ...DEFAULT_SQUEEZE_PARAMS,
      corporateSurcharge: 0.35,
      employerSSExtraPoints: 0.03,
      mode: 'realistic'
    }
  },
  godModeRealistic: {
    id: 'godModeRealistic',
    label: '👁️ Fraude fiscal cero (todo el empleo sumergido cotiza · realista)',
    params: {
      ...DEFAULT_SQUEEZE_PARAMS,
      godModeTaxEnforcement: 1.0,
      godModeUndergroundLabor: 1.0,
      mode: 'realistic'
    }
  },
  godModePaper: {
    id: 'godModePaper',
    label: '👁️🦄 Fraude fiscal cero (en papel, sin cierres ni nuevas pensiones)',
    params: {
      ...DEFAULT_SQUEEZE_PARAMS,
      godModeTaxEnforcement: 1.0,
      godModeUndergroundLabor: 1.0,
      mode: 'static'
    }
  },
  allOutPaper: {
    id: 'allOutPaper',
    label: '🦄 Todo junto en papel (Rentas altas + Empresas + Fraude cero)',
    params: {
      irpfThreshold: 150000,
      irpfExtraPoints: 0.22,
      wealthTaxMultiplier: 2.0,
      corporateSurcharge: 0.45,
      employerSSExtraPoints: 0.035,
      godModeTaxEnforcement: 1.0,
      godModeUndergroundLabor: 1.0,
      mode: 'static'
    }
  },
  allOutRealistic: {
    id: 'allOutRealistic',
    label: '📉 Todo junto realista (Rentas altas + Empresas + fraude cero con efecto Laffer)',
    params: {
      irpfThreshold: 150000,
      irpfExtraPoints: 0.22,
      wealthTaxMultiplier: 2.0,
      corporateSurcharge: 0.45,
      employerSSExtraPoints: 0.035,
      godModeTaxEnforcement: 1.0,
      godModeUndergroundLabor: 1.0,
      mode: 'realistic'
    }
  }
});

export const SQUEEZE_RESET_PATCH = Object.freeze({
  fiscalRescues: DEFAULT_CONFIG.fiscalRescues,
  irpfSurcharge: DEFAULT_CONFIG.irpfSurcharge,
  vatSurcharge: DEFAULT_CONFIG.vatSurcharge,
  otherTaxSurcharge: DEFAULT_CONFIG.otherTaxSurcharge,
  contributionRate: DEFAULT_CONFIG.contributionRate,
  pensionBudgetShare: DEFAULT_CONFIG.pensionBudgetShare,
  taxRevenueGDP: DEFAULT_CONFIG.taxRevenueGDP,
  realReturn: DEFAULT_CONFIG.realReturn,
  realWageGrowth: DEFAULT_CONFIG.realWageGrowth,
  entrantGrowth: DEFAULT_CONFIG.entrantGrowth,
  productivityGrowth: DEFAULT_CONFIG.productivityGrowth,
  lafferSelfFinancing: DEFAULT_CONFIG.lafferSelfFinancing,
  lafferExemptContribution: 0
});

export function detectRetro1985TaxCutFromConfig(config = {}) {
  return isRetro1985Active(config) &&
    (config.taxRevenueGDP ?? DEFAULT_CONFIG.taxRevenueGDP) < DEFAULT_CONFIG.taxRevenueGDP - 0.0005;
}

export function isSqueezeActive(params) {
  if (!params) return false;
  return (params.irpfExtraPoints ?? 0) > 0.001 ||
    (params.wealthTaxMultiplier ?? 0) > 0.01 ||
    (params.corporateSurcharge ?? 0) > 0.005 ||
    (params.employerSSExtraPoints ?? 0) > 0.0005 ||
    (params.godModeTaxEnforcement ?? 0) > 0.01 ||
    (params.godModeUndergroundLabor ?? 0) > 0.01;
}

// 1.52: thresholds just above rounding (patches round to 4–6 decimals). Until then a
// wealth tax +25 % (0,005) or a small share of undeclared work fell under them, so the
// panel thought the measure was gone and snapped its sliders back to zero.
export function detectSqueezeFromConfig(config = {}) {
  const rescue = (config.fiscalRescues ?? [])[0];
  const hasRescueIrpf = (rescue?.irpfExtraPoints ?? 0) > 0.001;
  const hasCorp = (config.otherTaxSurcharge ?? 0) > 0.0001;
  const hasVatOrIrpf = (config.vatSurcharge ?? 0) > 0.0001 || (config.irpfSurcharge ?? 0) > 0.0001;
  const hasEmployerSS = (config.contributionRate ?? DEFAULT_CONFIG.contributionRate) > DEFAULT_CONFIG.contributionRate + 0.0001;
  const hasMacroShift = Math.abs(config.entrantGrowth ?? 0) > 0.0005 || Math.abs(config.realWageGrowth ?? 0) > 0.0005;
  return hasRescueIrpf || hasCorp || hasVatOrIrpf || hasEmployerSS || (hasMacroShift && (hasRescueIrpf || hasCorp || hasVatOrIrpf));
}

/**
 * Computes the AEAT confiscation ladder: how many declarants exist above each
 * threshold in Spain, how much taxable base exceeds that threshold, and how
 * much could be raised even under 100% confiscation of every euro above the threshold.
 */
export function computeConfiscationLadder(pensionHoleEUR = 62256000000, incomeScale = 1) {
  const totalDeclarants = D.profile2024.reduce((s, r) => s + r.count, 0);
  const scale = W.nominal2024To2026 * Math.max(0.5, incomeScale);
  const tiers = [
    { threshold: 600000, title: 'Ultramillonarios (> 600.000 €/año)', currentMarginal: 0.47, note: 'Élite salarial y financiera' },
    { threshold: 150000, title: 'Rentas muy altas (> 150.000 €/año)', currentMarginal: 0.45, note: 'El 0,95 % de los declarantes' },
    { threshold: 60000, title: 'Profesionales y directivos (> 60.000 €/año)', currentMarginal: 0.40, note: 'Médicos, ingenieros, cuadros medios' },
    { threshold: 30000, title: 'Clase media trabajadora (> 30.000 €/año)', currentMarginal: 0.30, note: '1 de cada 3 trabajadores' }
  ];
  return tiers.map(tier => {
    let declarants = 0;
    let excessBase = 0;
    for (const row of D.profile2024) {
      if (row.count <= 0) continue;
      const avgBase = (row.generalBase / row.count) * scale;
      if (avgBase > tier.threshold) {
        declarants += row.count;
        excessBase += row.count * (avgBase - tier.threshold);
      }
    }
    const maxConfiscation100Pct = excessBase * (1 - tier.currentMarginal);
    const realistic20pp = excessBase * 0.20;
    const shareOfHole20pp = pensionHoleEUR > 0 ? Math.min(1.5, realistic20pp / pensionHoleEUR) : 0;
    const shareOfHole100Pct = pensionHoleEUR > 0 ? Math.min(1.5, maxConfiscation100Pct / pensionHoleEUR) : 0;
    return {
      ...tier,
      declarants,
      declarantShare: declarants / totalDeclarants,
      excessBase,
      realistic20pp,
      maxConfiscation100Pct,
      shareOfHole20pp,
      shareOfHole100Pct
    };
  });
}

/**
 * Computes static vs dynamic (Laffer + underground subsistence destruction +
 * accrued pension liabilities for newly formalized workers) impact for a
 * given year point and squeeze parameters.
 */
export function computeSqueezeAnalysis(params = DEFAULT_SQUEEZE_PARAMS, yearPoint = null) {
  const p = { ...DEFAULT_SQUEEZE_PARAMS, ...params };
  const year = yearPoint?.year ?? 2026;
  const yearsElapsed = Math.max(0, year - 2026);
  const gdpRatio = yearPoint?.gdp ? (yearPoint.gdp * (yearPoint.priceIndex ?? 1)) / 1782963000000 : 1;
  const pensionHole = yearPoint
    ? Math.max(0, ((yearPoint.publicPensionSpending ?? yearPoint.pensionSpending ?? 228949e6) - (yearPoint.pensionContributions ?? 166693e6)) * (yearPoint.priceIndex ?? 1))
    : 62256000000;

  // 1. Static ("Paper") revenues from Rich + Corporations
  const scale = W.nominal2024To2026 * gdpRatio;
  const irpfExcessBase = D.profile2024.reduce((sum, row) => {
    if (row.count <= 0) return sum;
    const avg = (row.generalBase / row.count) * scale;
    return sum + row.count * Math.max(0, avg - p.irpfThreshold * (yearPoint?.priceIndex ?? 1));
  }, 0);
  const staticIrpfExtra = irpfExcessBase * p.irpfExtraPoints;
  const baseWealthTax = 2250000000 * gdpRatio;
  const staticWealthExtra = baseWealthTax * p.wealthTaxMultiplier;
  const baseCorporateTax = D.tax2025.corporate * 1.055 * gdpRatio;
  const staticCorporateExtra = baseCorporateTax * p.corporateSurcharge;
  const basePayroll = (D.ine.compensation * 0.82) * 1.055 * gdpRatio;
  const staticEmployerSSExtra = basePayroll * p.employerSSExtraPoints;

  // 2. Static ("Paper") revenues from "Fraude fiscal cero"
  // Sourced gaps (UNDECLARED_ECONOMY): about 45.000 M€ of taxes and up to 12.000 M€ of contributions in 2026.
  const U = UNDECLARED_ECONOMY;
  const godVat = U.vatGapEUR * 1.055 * gdpRatio;
  const godCorporate = U.corporateGapShare * baseCorporateTax;
  const godIrpf = U.irpfFraudGDP * GDP_2026 * gdpRatio;
  const staticGodTaxExtra = (godVat + godCorporate + godIrpf) * p.godModeTaxEnforcement;
  const formalizedWorkersPaper = Math.round(U.undeclaredLabourShare * CURRENT_SPAIN.base.workers * PRIVATE_WORKER_SHARE * p.godModeUndergroundLabor);
  const staticGodLaborSSExtra = U.undeclaredLabourShare * PRIVATE_COMPENSATION * CONTRIBUTION_RATE_ON_COMPENSATION * 1.055 * gdpRatio * p.godModeUndergroundLabor;
  const staticGodTotal = staticGodTaxExtra + staticGodLaborSSExtra;

  const staticTotalExtra = staticIrpfExtra + staticWealthExtra + staticCorporateExtra + staticEmployerSSExtra + staticGodTotal;

  // 3. Dynamic Laffer / tax flight / underground destruction / accrued pension rights
  // Sourced shares of the static revenue lost (they already include the tax the
  // movers paid before): see SOURCED_SQUEEZE_LOSSES.
  const irpfFlightFraction = SOURCED_SQUEEZE_LOSSES.topIrpf;
  const wealthFlightFraction = SOURCED_SQUEEZE_LOSSES.wealthTax;
  const lostBaselineFromExile = 0;

  const corpLafferLossFraction = 1 - corporateRetainedShare(p.corporateSurcharge, p.corporatePeakRate);
  // The same long-run response of the labour base the engine applies (src/shared/laffer-response.js).
  const employerPassThroughLoss = staticEmployerSSExtra * (1 - lafferRetainedShare(p.employerSSExtraPoints * 100 * LABOUR_WEDGE.perContributionPoint));

  // God Mode reality checks:
  // (a) ~38% of claimed "underground tax gap" is either already captured via VAT when cash is spent in supermarkets/fuel or vanishes when hit with a 50% tax wedge
  // (b) ~42% of marginal underground jobs (repairs, hospitality, domestic care) disappear when forced to pay 21% VAT + 30% SS + IRPF
  // (c) Crucially: formalized workers who now contribute in white accrue full contributory pension entitlements! Over 15-30 years, their new pension claims eat up to 85% of their contributions.
  const accruedPensionLiabilityShare = Math.min(0.88, 0.12 + (yearsElapsed / 28) * 0.76);
  // Assumptions of the simulator, without a source:
  const godTaxShrinkage = staticGodTaxExtra * UNDECLARED_ECONOMY.taxShrinkage; // VAT already paid on spending + closures + enforcement cost
  const godLaborDestruction = staticGodLaborSSExtra * UNDECLARED_ECONOMY.undeclaredJobsClosing; // undeclared jobs that close when taxed
  const godLaborSurvivingSS = staticGodLaborSSExtra - godLaborDestruction;
  const godNewPensionLiability = godLaborSurvivingSS * accruedPensionLiabilityShare;
  const godTotalLeakage = godTaxShrinkage + godLaborDestruction + godNewPensionLiability;

  const richAndCorpLeakage =
    (staticIrpfExtra * irpfFlightFraction) +
    (staticWealthExtra * wealthFlightFraction) +
    lostBaselineFromExile +
    (staticCorporateExtra * corpLafferLossFraction) +
    employerPassThroughLoss;

  const dynamicLeakage = p.mode === 'realistic'
    ? richAndCorpLeakage + godTotalLeakage
    : 0;

  const netEffectiveRevenue = Math.max(-25e9, staticTotalExtra - dynamicLeakage);

  // Macro feedback for the engine. Since 1.37 there are no unsourced brakes on
  // wages, employment or productivity: the response of the labour base to the
  // employer contribution is Trabandt and Uhlig's, applied by the engine to the
  // revenue (src/shared/laffer-response.js). Adding a wage or employment brake on
  // top would count it twice. Shown here as the long-run change of that base.
  const labourBaseChangeLongRun = p.mode === 'realistic'
    ? lafferBaseChange(p.employerSSExtraPoints * 100 * LABOUR_WEDGE.perContributionPoint)
    : 0;
  // Formalisation reaches the engine once, as contributions (see buildSqueezeConfigPatch).
  // Until 1.37 it also added 0,22–0,45 % more entrants every year for 44 years: a
  // one-off level of about 5 % of employment counted again as growth. Removed.
  const wageGrowthPenalty = 0;
  const employmentGrowthPenalty = 0;
  const productivityPenalty = 0;
  const survivingFormalizedWorkers = p.mode === 'realistic'
    ? Math.round(formalizedWorkersPaper * (1 - UNDECLARED_ECONOMY.undeclaredJobsClosing))
    : formalizedWorkersPaper;

  return {
    year,
    pensionHole,
    irpfExcessBase,
    staticIrpfExtra,
    staticWealthExtra,
    staticCorporateExtra,
    staticEmployerSSExtra,
    staticGodTaxExtra,
    staticGodLaborSSExtra,
    staticGodTotal,
    godTaxShrinkage,
    godLaborDestruction,
    godNewPensionLiability,
    godTotalLeakage,
    formalizedWorkersPaper,
    survivingFormalizedWorkers,
    staticTotalExtra,
    dynamicLeakage,
    netEffectiveRevenue,
    staticHoleCoverage: pensionHole > 0 ? staticTotalExtra / pensionHole : 0,
    netHoleCoverage: pensionHole > 0 ? Math.max(0, netEffectiveRevenue) / pensionHole : 0,
    wageGrowthPenalty,
    employmentGrowthPenalty,
    productivityPenalty,
    labourBaseChangeLongRun,
    ladder: computeConfiscationLadder(pensionHole, gdpRatio)
  };
}

/** What each one-click 1985 tax cut costs, precomputed with the engine on the
 * origin scenario (scripts/precompute-retro-taxcuts.mjs), shown under its button. */
export function retroTaxcutCostText(cost) {
  if (!cost) return '';
  const pct = v => `${Math.round(v).toLocaleString('es-ES', { useGrouping: 'always' })} %`;
  const verdict = !cost.firstProblemYear ? 'aguanta hasta 2070'
    : cost.failure === 'pension' ? `pensión por debajo del 40 % en ${cost.firstProblemYear}` : `riesgo alto desde ${cost.firstProblemYear}`;
  return `Deuda ${pct(cost.debt2026)} del PIB en 2026 → ${pct(cost.debt2070)} en 2070 · intereses: ${pct(cost.interestShare2030)} de los ingresos en 2030 · ${verdict}`;
}

export function retroTaxcutCostNote(data) {
  const base = 'Calculado con el escenario de origen y cada rebaja aplicada desde 1985. El veredicto es el común del simulador: el primer año de riesgo alto sostenido de tensión fiscal (' + S0_SHORT + ')';
  return data.fundBackingWeight > 0
    ? `${base}, restando el ${Math.round(data.fundBackingWeight * 100)} % del fondo de pensiones de la variable de deuda del índice.`
    : `${base}. El fondo de pensiones es de sus partícipes y no se resta de la deuda.`;
}

/**
 * Translates the squeeze + God Mode parameters into a valid model-current-v10 configuration patch.
 */
export function buildSqueezeConfigPatch(params = DEFAULT_SQUEEZE_PARAMS) {
  const p = { ...DEFAULT_SQUEEZE_PARAMS, ...params };
  if (!isSqueezeActive(p)) return { ...SQUEEZE_RESET_PATCH };

  const analysis = computeSqueezeAnalysis(p);
  const realistic = p.mode === 'realistic';

  const effectiveIrpfPoints = realistic
    ? Number((p.irpfExtraPoints * (1 - SOURCED_SQUEEZE_LOSSES.topIrpf)).toFixed(4))
    : Number(p.irpfExtraPoints.toFixed(4));

  const fiscalRescues = effectiveIrpfPoints > 0.001
    ? [{
        year: 2027,
        vatGeneralRate: 0.21,
        vatReducedRate: 0.10,
        vatSuperReducedRate: 0.04,
        irpfExtraPoints: Math.min(0.30, effectiveIrpfPoints),
        irpfThreshold: p.irpfThreshold
      }]
    : [];

  // God mode tax enforcement maps to VAT + IRPF + Other tax surcharges
  // The sourced gaps as surcharges on each tax; realistic mode keeps 1 − taxShrinkage of them.
  const godFactor = realistic ? 1 - UNDECLARED_ECONOMY.taxShrinkage : 1.0;
  const U = UNDECLARED_ECONOMY;
  const irpfGapShare = U.irpfFraudGDP * GDP_2026 / (D.tax2025.personal * 1.055);
  const vatGapShare = U.vatGapEUR / D.tax2025.vatLike;
  const irpfSurcharge = Number(Math.min(0.40, p.godModeTaxEnforcement * irpfGapShare * godFactor).toFixed(4));
  const vatSurcharge = Number(Math.min(0.40, p.godModeTaxEnforcement * vatGapShare * godFactor).toFixed(4));

  // Realistic mode: corporate tax and the wealth tax keep their sourced shares;
  // enforcement keeps the simulator's own 48 % («fraude cero», not audited yet).
  const corpPart = p.corporateSurcharge * 0.58;
  // Corporate tax gap, expressed like the corporate surcharge (× 0.58 to the engine's remaining-tax base).
  const enforcementPart = p.godModeTaxEnforcement * U.corporateGapShare * 0.58;
  const wealthPart = p.wealthTaxMultiplier * 0.025;
  const otherTaxSurcharge = Number(Math.min(0.60, Math.max(0, realistic
    ? corpPart * corporateRetainedShare(p.corporateSurcharge, p.corporatePeakRate) + enforcementPart * godFactor + wealthPart * (1 - SOURCED_SQUEEZE_LOSSES.wealthTax)
    : corpPart + enforcementPart + wealthPart)).toFixed(4));

  // Full points: in realistic mode the engine discounts the labour base response
  // itself (lafferSelfFinancing); in paper mode it is switched off below.
  // Formalised undeclared work is new base, not a higher wedge: the engine leaves it out of its Laffer response.
  const formalisedPoints = analysis.staticGodLaborSSExtra / (CURRENT_SPAIN.base.workers * CURRENT_SPAIN.base.wage) * (realistic ? 1 - U.undeclaredJobsClosing : 1);
  const effectiveSSExtra = p.employerSSExtraPoints + formalisedPoints;
  // With no extra points, today's rate exactly: rounding it would mark «Cotización» as changed (1.82).
  const contributionRate = effectiveSSExtra > 0 ? Number(Math.min(0.35, DEFAULT_CONFIG.contributionRate + effectiveSSExtra).toFixed(6)) : DEFAULT_CONFIG.contributionRate;

  // The same rule as every other budget measure (src/shared/scenario-measures.js).
  const pensionBudgetShare = pensionBudgetShareWith({ irpfSurcharge, vatSurcharge, otherTaxSurcharge, fiscalRescues });

  return {
    fiscalRescues,
    irpfSurcharge,
    vatSurcharge,
    otherTaxSurcharge,
    contributionRate,
    pensionBudgetShare,
    lafferSelfFinancing: realistic ? DEFAULT_CONFIG.lafferSelfFinancing : 0,
    lafferExemptContribution: Number(Math.min(0.1, formalisedPoints).toFixed(6)),
    realWageGrowth: Number(Math.max(-0.02, Math.min(0.04, analysis.wageGrowthPenalty)).toFixed(5)),
    entrantGrowth: Number(Math.max(-0.02, Math.min(0.02, analysis.employmentGrowthPenalty)).toFixed(5)),
    productivityGrowth: Number(Math.max(-0.02, Math.min(0.04, analysis.productivityPenalty)).toFixed(5))
  };
}

/**
 * What a Real-mode patch adds to the squeeze's own outputs (1.52). Away from 1985, nothing:
 * the reader's transition stays (Mixto progresivo and Mixto con ahorro propio keep their 24 years; until
 * 1.52 every fiscal measure cut them to 20). Leaving 1985, the default transition length and
 * the system the reader had before 1985 come back (`systemBeforeRetro`, an activeSystemKey;
 * Reparto when unknown), through the same selectSystemPatch as the ways bar. Pure.
 * @param {object|null} config the current scenario config
 * @param {boolean} lastConfigWasRetro whether that config is the 1985 experiment
 * @param {string|null} systemBeforeRetro activeSystemKey of the last config that was not 1985
 */
export function realModeExtras(config, lastConfigWasRetro, systemBeforeRetro) {
  if (!lastConfigWasRetro) return {};
  const key = systemBeforeRetro && systemBeforeRetro !== 'retro1985' ? systemBeforeRetro : 'payg';
  return {
    transitionYears: DEFAULT_CONFIG.transitionYears,
    transitionCutoffAge: DEFAULT_CONFIG.transitionCutoffAge,
    // What the 1985 tax cuts wrote (buildRetro1985TaxCutConfigPatch) goes back too, also
    // when a Real preset is active (its patch does not carry these two keys).
    taxRevenueGDP: DEFAULT_CONFIG.taxRevenueGDP,
    realReturn: DEFAULT_CONFIG.realReturn,
    ...selectSystemPatch(key, config ?? FLAGSHIP_RETRO_1985, FLAGSHIP_PROGRESSIVE)
  };
}

// Only the 1985 tax cuts write these two keys (buildRetro1985TaxCutConfigPatch).
const RETRO_ONLY_RESET_KEYS = ['taxRevenueGDP', 'realReturn'];

/**
 * The patch Real mode applies: buildSqueezeConfigPatch plus realModeExtras. Away from 1985
 * its reset («Desactivar todo») leaves taxRevenueGDP and realReturn as the reader set them;
 * leaving 1985 it still undoes what the 1985 tax cuts wrote. Same arguments as realModeExtras. Pure.
 */
export function buildRealModePatch(params, config, lastConfigWasRetro, systemBeforeRetro) {
  const patch = buildSqueezeConfigPatch(params);
  if (!lastConfigWasRetro) for (const key of RETRO_ONLY_RESET_KEYS) delete patch[key];
  return { ...patch, ...realModeExtras(config, lastConfigWasRetro, systemBeforeRetro) };
}

export function loadSavedSqueezeParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SQUEEZE_PARAMS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SQUEEZE_PARAMS, ...parsed };
  } catch {
    return { ...DEFAULT_SQUEEZE_PARAMS };
  }
}

export function saveSqueezeParams(params) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch { /* ignore */ }
}
