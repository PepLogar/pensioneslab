/** Descriptive cross-country calibration, frozen 2026-10-23.
 * Raw observations, hashes and reproducible OLS are in
 * pensiones_lab_2/docs/evidence/research-eu-risk/ (not copied here). This is not a causal debt elasticity.
 */
export const EUROPEAN_RISK_CALIBRATION = Object.freeze({
  id: 'ecb-2026-09-eurostat-2026-q2-v1',
  yieldPeriod: '2026-09',
  debtPeriod: '2026-Q2',
  retrievedDate: '2026-10-23',
  benchmark: 'DE',
  sampleCountries: Object.freeze(['AT', 'BE', 'ES', 'FI', 'FR', 'GR', 'IT', 'NL', 'PT']),
  slopeBasisPointsPerDebtGDPPoint: 0.9057714052976071,
  rSquared: 0.8007438947549523,
  referenceDebtRatio: 1.014,
  referenceSpreadRate: .00454,
  observedMinDebtRatio: .437,
  observedMaxDebtRatio: 1.408,
  // This spread decomposes the preserved Spanish issuance anchor. Its implied
  // risk-free reference is synthetic, not the current German ten-year yield.
  normalization: 'preserve-spanish-issuance-anchor',
  yieldSource: 'https://data-api.ecb.europa.eu/service/data/IRS/M.DE+FR+ES+IT+PT+GR+BE+AT+NL+FI.L.L40.CI.0000.EUR.N.Z?startPeriod=2026-09&endPeriod=2026-09&format=csvdata',
  debtSource: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10q_ggdebt?lang=EN&freq=Q&unit=PC_GDP&sector=S13&na_item=GD&time=2026-Q2'
});
