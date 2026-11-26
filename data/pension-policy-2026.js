/** Official policy information available at 17 October 2026.
 * Rates are fractions, amounts are nominal EUR at the stated observation date.
 * Legal schedules are not aggregate revenue forecasts. No salary-tail imputation.
 */
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const PENSION_POLICY_2026 = freeze({
  informationCutoff: '2026-10-17', baseYear: 2026,
  mei: {
    schedule: [
      { from: 2023, through: 2023, total: .006, employer: .005, employee: .001 },
      { from: 2024, through: 2024, total: .007, employer: .0058, employee: .0012 },
      { from: 2025, through: 2025, total: .008, employer: .0067, employee: .0013 },
      { from: 2026, through: 2026, total: .009, employer: .0075, employee: .0015 },
      { from: 2027, through: 2027, total: .010, employer: .0083, employee: .0017 },
      { from: 2028, through: 2028, total: .011, employer: .0092, employee: .0018 },
      { from: 2029, through: 2050, total: .012, employer: .010, employee: .002 }
    ],
    createsIndividualRights: false, destination: 'Social Security Reserve Fund',
    after2050: 'No contribution projected beyond the explicit DT43 period; future legislation is unknown.',
    source: 'lgss', locator: 'Articles 127 bis and DT43'
  },
  solidarity: {
    // Excess-pay bands: (maximum, 1.1*maximum], (1.1,1.5], above1.5*maximum.
    years: [2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035,
      2036,2037,2038,2039,2040,2041,2042,2043,2044,2045],
    rates: [
      [.0092,.0100,.0117],[.0115,.0125,.0146],[.0138,.0150,.0175],
      [.0160,.0175,.0204],[.0183,.0200,.0233],[.0206,.0225,.0263],
      [.0229,.0250,.0292],[.0252,.0275,.0321],[.0275,.0300,.0350],
      [.0298,.0325,.0379],[.0321,.0350,.0408],[.0344,.0375,.0438],
      [.0367,.0400,.0467],[.0390,.0425,.0496],[.0413,.0450,.0525],
      [.0435,.0475,.0554],[.0458,.0500,.0583],[.0481,.0525,.0613],
      [.0504,.0550,.0642],[.0527,.0575,.0671],[.055,.060,.070]
    ],
    createsIndividualRights: false, aggregateRevenueImplemented: false,
    reason: 'No verified current excess-pay masses by statutory band; do not apply these rates to average wages or all payroll.',
    source: 'lgss', locator: 'Articles 19 bis and DT42'
  },
  maximumContributionBase: {
    monthlyEUR2026: 5101.20,
    extraAnnualGrowthPoints: .012, from: 2024, through: 2050,
    rule: 'Add 1.2 percentage points to the pension-revaluation percentage; not a 1.2% increase in all contribution revenue.',
    source: 'lgss', locator: 'Article 19.3 and DT38; 2026 amount: RDL3/2026 article3'
  },
  ordinaryRetirement: {
    schedule: [
      { from: 2026, through: 2026, longCareerMonths: 459, lowerAgeMonths: 780, upperAgeMonths: 802 },
      { from: 2027, through: null, longCareerMonths: 462, lowerAgeMonths: 780, upperAgeMonths: 804 }
    ],
    modelTreatment: 'Metadata only. Observed award-age weights are retained; career histories and early/late/partial retirement are not inferred.',
    source: 'lgss', locator: 'Article 205 and DT7'
  },
  pensionIndexation: {
    rule: 'Arithmetic mean of the 12 monthly year-on-year CPI rates from December(t-2) through November(t-1), floored at zero.',
    appliesTo: 'Contributory defined-benefit pensions already in payment at year opening; not new NDC/private annuities.',
    base2026RevaluationAlreadyIncluded: .027,
    firstPriorYearProxy: { year: 2026, rate: .039, kind: 'forecast-HICP-annual-average',
      isStatutoryCPIObservation: false, source: 'bdeOctober2026' },
    specialRulesNotModelled: ['Minimum supplements', 'PNC convergence', 'Maximum pensions', 'Individual international-pension exceptions'],
    source: 'lgss', locator: 'Article 58'
  },
  reserveFund: {
    observed2025: {
      date: '2025-12-31', totalAcquisitionBasisEUR: 14069806997.73,
      spanishGovernmentSecuritiesAcquisitionEUR: 13683704923.83,
      spanishGovernmentSecuritiesNominalEUR: 13525933000,
      spanishGovernmentSecuritiesAmortisedCostEUR: 13567049789.59,
      depositAtBankOfSpainEUR: 385846165.60,
      decemberDepositInterestAccruedEUR: 255908.30,
      externalSecuritiesEUR: 0, domesticGovernmentShareOfSecurities: 1,
      source: 'reserve2025', locator: 'Printed pages13 and31-32; PDF pages15 and33-34'
    },
    latestTotal2026: {
      date: '2026-03-31', totalEUR: 15267e6, roundedToMillion: true,
      source: 'reserveMarch2026', compositionAvailable: false,
      externalAssetsEUR: null, depositEUR: null
    },
    maximumWithdrawalShareGDP: {
      2033:.0010,2034:.0012,2035:.0015,2036:.0017,2037:.0019,2038:.0022,
      2039:.0025,2040:.0028,2041:.0046,2042:.0050,2043:.0054,2044:.0077,
      2045:.0082,2046:.0087,2047:.0091,2048:.0086,2049:.0084,2050:.0082,
      2051:.0053,2052:.0051,2053:.0050
    },
    withdrawalsRequireAnnualBudget: true, modelWithdrawalNominal: 0,
    modelReturnNominal: 0, source: 'lgss', locator: 'Article 121.2 (withdrawal ceilings, RDL2/2023)',
    modelTreatment: 'Opening total is a dated memorandum, not closing2026 cash. Future MEI is recorded as additional internal-government claims. No inferred external-asset SFA, no automatic deficit withdrawal, no automatic return.',
    consolidation: 'Spanish government securities and their internal coupons cancel within consolidated general government. A Bank of Spain deposit is an external asset of general government, but its 2026 amount is not known here.'
  },
  sources: {
    lgss: { url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724',
      snapshot: 'data/sources/current-2026/lgss-policy-snapshot-20261017.html',
      sha256: '349531be0a807b2649373f0777c9635f88ecc1cc503fc97846a5e634ce2bc8e6' },
    reserveRegulation: { url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2025-3188', publicationDate: '2025-02-19',
      snapshot: 'data/sources/current-2026/reserve-fund-regulation-20250219.html',
      sha256: 'b2a01c6662246109b686febfbbc1cb500c8120ea72b08d432bc83123ef4495f0' },
    reserve2025: { url: 'https://www.seg-social.es/descarga/es/15072026', publicationDate: '2026-08-07',
      publicationEvidence: 'Spanish Social Security catalogue date; English catalogue may differ.',
      snapshot: 'data/sources/current-2026/reserve-fund-2025-20260807.pdf',
      sha256: '5c8f6606c26ae8f813ed6d6be890fc6abe8ff7d82590b31576930998c736e27c' },
    reserveMarch2026: { url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/inclusion/Paginas/2026/130426-fondo-reserva-seguridad-social-abril.aspx?mode=Light',
      publicationDate: '2026-04-13', snapshot: 'data/sources/current-2026/reserve-fund-march2026.html',
      sha256: '20d2ab72689d873867a7ed5a015374d34a9725e5ef3ba0a739f149b16785afb5' },
    bdeOctober2026: { url: 'https://www.bde.es/wbe/es/publicaciones/analisis-economico-investigacion/proyecciones-macro-informe-trimestral/proyecciones-e-informe-trimestral-de-la-economia-espanola-tercer-trimestre-2026.html',
      publicationDate: '2026-10-09', locator: 'Table1, HICP2026',
      snapshot: 'data/sources/current-2026/bde-projections-october2026.html',
      sha256: '4f27d4d7e1d22efd188e2704e1eb7611f95181a4cb699b358f1dcba14410ab4e' },
    consolidation: { url: 'https://www.bde.es/wbe/es/noticias-eventos/actualidad-banco-espana/deuda-aapp-2026t2.html',
      publicationDate: '2026-09-30', locator: 'Intra-government consolidation and notes3/5' }
  }
});
