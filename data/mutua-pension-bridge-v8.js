/** Receiving TGSS budget rights/cash, distinct from mutual SIO indicators and
 * final pension expenditure. EUR throughout. Originals and page locators in
 * pensiones_lab_2/data/mutuas-v8-tgss-research.json and mutuas-v8-pensions-research.json (not copied here). */
const million = 1e6;
export const MUTUA_PENSION_BRIDGE_V8 = Object.freeze({
  id: 'es-mutua-pension-bridge-20261018-v8', cutoff: '2026-10-18',
  url: 'https://www.seg-social.es/wps/wcm/connect/wss/07e8352b-447a-4234-b302-49a3f502f5b2/L_Entidades_Diciembre%2BProvisional_2025.pdf?MOD=AJPERES',
  currentUrl: 'https://www.seg-social.es/descarga/es/L_Entidades_Agosto_2026.pdf',
  observed2025: Object.freeze({
    period: '2025', status: 'provisional full-year budget execution',
    capitalCostRecognized: 1663.38 * million, capitalCostCash: 1610.72 * million,
    reinsuranceRecognized: 1707.34 * million, reinsuranceCash: 1707.34 * million,
    commonServicesRecognized: 1687.31 * million,
    mutuaCapitalCostSIO: 1706.93414 * million,
    mutuaTransfersToSS: 5124.77 * million, tgssTransfersFromSS: 5060.79 * million,
    professionalPensionBenefits: 4036.93 * million,
    professionalPensionPayments: 4036.89 * million,
    professionalPensionsExcludingSupplements: 4006.43 * million
  }),
  observed2026: Object.freeze({
    period: '2026-01/2026-08', status: 'provisional accumulated budget execution',
    capitalCostRecognized: 1020.13 * million, capitalCostCash: 909.69 * million,
    reinsuranceRecognized: 1211.46 * million, reinsuranceCash: 1211.46 * million,
    commonServicesRecognized: 1200.43 * million,
    mutuaCapitalCostSIO: null,
    mutuaTransfersToSS: 3252.51 * million, tgssTransfersFromSS: 3433.54 * million,
    professionalPensionBenefits: 2741.98 * million, professionalPensionPayments: 2741.53 * million
  }),
  assumptions: Object.freeze({
    reconciliation: 'TGSS headings422 and423 identify recognised internal pension-financing resources, not new consolidated revenue. Heading421 common services is excluded. SIO capital-cost indicators and TGSS rights/cash differ; unresolved differences are not invented flows.',
    opening: 'Use the same Jan-Aug2026 period as mutual contributions. Apply the observed TGSS422 and423 / mutual contribution ratios to the already estimated2026 mutual pool. Annual estimate of recognised rights, not observed annual cash or annual pension cost.',
    projection: 'Hold the opening transfer ratio to the professional-contingency contribution proxy constant: grow with common employment and equivalent wages. No RG ceiling on unidentified professional bases; no demographic actuarial liability path inferred. Same assumptions for all systems.',
    destinations: 'Protected internal financing only. Retain the whole mutual pool outside the configurable tax-allocation base. Subtract the transfer from other public resources and credit it once to pension resources; no new pension rights, private assets or consolidated revenue/spending/debt.',
    pensions: 'AT/EP annual budget expenditure covers the existing stock, including IP renamed retirement and supplements; not exclusively mutual responsibility. Its12-payment convention is not a multiplier on annual obligations. Capital costs fund present/future liabilities and cannot be equated with that annual expenditure.',
    boundary: 'This is a reconciled budget classification with an explicit forward proxy, not a completed actuarial stock/flow bridge. Unused assigned resources are displayed separately and cannot automatically repay internal SS debt.'
  })
});
