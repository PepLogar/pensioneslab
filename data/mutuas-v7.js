/** Official budget observations, NOT consolidated SEC accounts or a forecast.
 * Amounts in EUR; locators/extractions/original hashes live in the two research
 * files; the originals they name (data/sources/mutuas-v7-*) are copies in pensiones_lab_2 only. No future fiscal outcome is used. */
const million = 1e6;
export const MUTUAS_V7 = Object.freeze({
  id: 'es-mutuas-20261018-v7', cutoff: '2026-10-18',
  url: 'https://www.seg-social.es/descarga/es/ResMUTUAS_DiciembreProvisional_2025.xlsx',
  incomeResearch: 'data/mutuas-v7-income-research.json',
  spendingResearch: 'data/mutuas-v7-spending-research.json',
  observed2025: Object.freeze({
    systemContributions: 176918.38 * million, tgssContributions: 153858.97 * million,
    contributions: 23059.41 * million,
    systemPensionBenefits: 182526.29 * million,
    systemContributoryBenefits: 206359.59 * million,
    contributoryBenefits: 13972.33 * million,
    transfersToSS: 5124.77 * million,
    pensionCapitalCost: 1706.93414 * million,
    identifiedPrimarySpending: 16297.00 * million,
    interest: 2.18 * million,
    unresolvedCapitalTransfers: 183.73 * million
  }),
  observed2026: Object.freeze({
    period: '2026-01/2026-08', status: 'provisional net recognised budget rights',
    systemContributions: 126032.44 * million,
    tgssContributions: 112429.04 * million,
    contributions: 13603.40 * million,
    tgssMEIAndSolidarity: 4074.65 * million,
    tgssRG: 92720.01 * million, tgssRETA: 8124.70 * million,
    commonRG: 4008.87 * million, commonRETA: 580.58 * million,
    commonMar: 10.50 * million, commonCoal: .14 * million,
    professional: 8730.67 * million, cessation: 272.64 * million
  }),
  notes: Object.freeze({
    opening: 'Apply the Jan-Aug mutual share to the existing full-year2026 SS estimate. Preserve its total; not a new observed annual receipt or a seasonal12/8 extrapolation.',
    pensions: 'TGSS ordinary receipts use the2025 pension/contributory-spending proxy after removing mutual benefits from its denominator. This is an allocation estimate, not a legal pension contribution rate.',
    capitalCost: 'Observed actuarial internal payments for permanent disability and death: memo only. Not the annual pension payroll, fresh consolidated income, a private contribution or a projected mutual reserve. Mutual contributions are not wholly unrelated to pensions.',
    spending: 'Existing consolidated public expenditure already includes final mutual spending. Do not add budget chapters, capital-cost payments or reinsurance again. Primary spending subtotal excludes unresolved capital transfers and is not a complete SEC bridge.'
  })
});
const d = MUTUAS_V7.observed2026;
export const MUTUA_BASE_WEIGHTS_V7 = Object.freeze({
  tgssOrdinaryRG: d.tgssRG / (d.tgssContributions - d.tgssMEIAndSolidarity),
  tgssOrdinaryRETA: d.tgssRETA / (d.tgssContributions - d.tgssMEIAndSolidarity),
  mutuaCommonRG: d.commonRG / d.contributions,
  mutuaCommonRETA: d.commonRETA / d.contributions
});
