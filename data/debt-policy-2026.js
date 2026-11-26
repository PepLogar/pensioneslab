/** Treasury observations available at the 17 October 2026 cutoff.
 * This is State debt, NOT an observed consolidated-general-government ladder.
 * Applying its maturity shape to AAPP debt is an explicit modelling bridge.
 */
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

// Labels read from the embedded official chart in 14.xlsx. Percentages are
// printed to two decimals and sum to 100.02; do not infer precise euro amounts.
const maturityBands = [
  [2026, 2026, 3.87], [2027, 2027, 12.85], [2028, 2028, 8.33],
  [2029, 2029, 9.83], [2030, 2030, 8.45], [2031, 2031, 6.41],
  [2032, 2032, 5.40], [2033, 2033, 7.80], [2034, 2035, 8.60],
  [2036, 2037, 6.99], [2038, 2040, 4.83], [2041, 2042, 3.79],
  [2043, 2044, 2.63], [2045, 2046, 1.56], [2047, 2048, 1.89],
  [2049, 2051, 2.00], [2052, 2053, 1.39], [2054, 2056, 1.73],
  [2064, 2066, 1.08], [2071, 2071, 0.59]
].map(([firstYear, lastYear, percent]) => ({ firstYear, lastYear, percent }));
// The percentages are of the TOTAL bars, which include Treasury bills (letras). Gross financing needs and the S0
// leave short-term debt out (docs/modelo/04), so the bills maturing in 2027 come out of that band: the yellow bar
// reads about 58.000 M€ against a TOTAL of about 201.500 M€ (12,85 %), i.e. 3,70 % of the stock (read from the
// chart's scale; 1.76, docs/REVISION-ADVERSARIAL-2026-11-25.md, 8). The 2026 band, bills included, is left out as
// before. What remains is spread over the later bands in proportion, as the rest of the stock.
export const OPENING_BILLS_2027_PERCENT = 3.70;
for (const row of maturityBands) if (row.firstYear === 2027) row.percent -= OPENING_BILLS_2027_PERCENT;
const futureTotal = maturityBands.filter(row => row.firstYear > 2026)
  .reduce((sum, row) => sum + row.percent, 0);
const initialMaturityWeights = maturityBands.filter(row => row.firstYear > 2026)
  .flatMap(row => Array.from({ length: row.lastYear - row.firstYear + 1 }, (_, i) => ({
    maturityYear: row.firstYear + i,
    weight: row.percent / futureTotal / (row.lastYear - row.firstYear + 1)
  })));

export const DEFAULT_NEW_ISSUANCE_NOMINAL_RATE = .03432;

export const DEBT_POLICY_2026 = freeze({
  id: 'es-treasury-2026-09-debt-policy-v3', cutoff: '2026-10-17',
  observationDate: '2026-09-30', baseYear: 2026,
  newIssuanceNominalRate: DEFAULT_NEW_ISSUANCE_NOMINAL_RATE,
  averageDebtMaturity: 7.85,
  newIssueAverageMaturity: 7.85,
  initialMaturityWeights,
  // An explicit proxy using stock residual life, not an observed issuance term.
  // Adjacent annual terms preserve the proxy mean without inventing a full curve.
  newIssueMaturityWeights: [{ years: 7, weight: .15 }, { years: 8, weight: .85 }],
  observed: {
    perimeter: 'Deuda del Estado; distinta de deuda consolidada AAPP',
    stockAverageMaturityYears: 7.85,
    stockDomesticAverageIssuanceYield: .02453,
    stockEffectiveYieldIncludingEstimatedIndexedInflation: .02449,
    septemberNewIssuanceEffectiveYield: .03413,
    septemberNewIssuanceIncludingEstimatedIndexedInflation: .03432,
    januarySeptemberNewIssuanceEffectiveYield: .02951,
    januarySeptemberNewIssuanceIncludingEstimatedIndexedInflation: .02971,
    maturityBands
  },
  assumptions: {
    initialStock: 'The caller supplies AAPP debt and annual interest. Existing vintage rates all equal initial interest/debt; Treasury stock yields are reference observations, not substituted AAPP interest.',
    initialMaturities: 'Exclude the 2026 maturity band and normalise the published 2027+ weights. Split only explicitly grouped years uniformly. July AAPP debt plus September State-debt shape does not reconstruct October–December issuance or redemptions.',
    newMaturities: '7.85 years is observed residual STOCK life reused as an assumed new-issue mean. The 15% seven-year/85% eight-year mix is a discretisation, not an observed financing plan.',
    rate: 'September 2026 effective new-issuance yield including estimated inflation on indexed securities; held constant unless the scenario supplies another rate. This is a proxy for AAPP marginal finance, not a forecast curve or its historical average cost.',
    timing: 'All annual maturities, net issuance and optional buybacks occur at midyear. New issues accrue half a year of interest, including borrowing needed to finance that interest.',
    instruments: 'All vintages are modelled at par with fixed nominal rates. No valuation gains, issue premia, exchange-rate changes or separate inflation-indexed principal are imputed.'
  },
  sources: [
    { id: 'treasury-maturity-september2026', page: 1,
      url: 'https://www.tesoro.es/documents/d/tesoro/02-pdf',
      file: 'data/sources/debt-2026/tesoro-02-202609.pdf',
      sha256: '046449af18670b52eb9dd4fcb412d752aa05d370b5e3eb870f7d6e56c90e4dbb' },
    { id: 'treasury-stock-cost-september2026', page: 2,
      url: 'https://www.tesoro.es/documents/d/tesoro/03-pdf',
      file: 'data/sources/debt-2026/tesoro-03-202609.pdf',
      sha256: '3b08a0534418c299b22ab23c48ed31429ec1e507a06c673a66f5969086992de7' },
    { id: 'treasury-issuance-cost-september2026', page: 1,
      url: 'https://www.tesoro.es/documents/d/tesoro/10-pdf',
      file: 'data/sources/debt-2026/tesoro-10-202609.pdf',
      sha256: '2d95db60ff26e5245199cd7e33fdf14126b5c9cb45bd1ae2aeaa9790789eb230' },
    { id: 'treasury-maturity-profile-september2026', location: 'sheet1; embedded image xl/media/image1.png',
      url: 'https://www.tesoro.es/documents/d/tesoro/14-xlsx',
      file: 'data/sources/debt-2026/tesoro-14-202609.xlsx',
      sha256: 'f62a310809ca022546c89364961a0b82f041a1f24b1c0002771d892a878ccc3c' }
  ],
  catalogURL: 'https://www.tesoro.es/deuda-publica/estad%C3%ADsticas-mensuales',
  consolidatedDebtSourceURL: 'https://www.bde.es/webbde/es/estadis/infoest/a11b.pdf'
});
