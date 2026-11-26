// Thresholds and signalling power of the fiscal variables of the European
// Commission's S0 early-detection indicator of fiscal stress, transcribed from
// the Debt Sustainability Monitor 2022 (Institutional Paper 199), Box 1.1,
// Table 1, p. 40, anchored to the hash of the saved file. Hand transcription,
// checked against the extracted text; not a value computed by the project.
// `risky` says which side of the threshold signals stress (the table gives the
// safe side). `inEngine` marks the 8 variables the simulator can compute.
export const S0_THRESHOLDS_DSM2022 = Object.freeze({
  id: 'ec-s0-fiscal-thresholds-dsm2022-v1',
  kind: 'umbrales publicados (transcripción)',
  source: Object.freeze({
    title: 'Comisión Europea · Debt Sustainability Monitor 2022, Institutional Paper 199 (2023)',
    url: 'https://economy-finance.ec.europa.eu/system/files/2023-06/ip199_en_UPD.pdf',
    file: 'data/sources/crisis-metodologia-2026/ec-dsm-2022-ip199.pdf',
    sha256: '556353687736b082a286cbc4c820a5b0679da1fe4ec8b7c3b48bd2c46fbdf9b0',
    locator: 'Recuadro 1.1, tabla 1, p. 40: «Thresholds and signalling power of S0 indicator…»'
  }),
  horizonYears: 1,
  // Signals one year ahead; the weight of each variable is its signalling power
  // (1 − type I − type II error); the index is the weighted share of variables
  // that signal, over the variables available (EP 475, §3.4; DSM 2022, annex A2).
  fiscalIndexThreshold: 0.36,
  fiscalIndexPower: 0.28,
  overallIndexThreshold: 0.46,
  variables: Object.freeze([
    { id: 'balance', label: 'Saldo público', unit: '% del PIB', threshold: -9.61, risky: 'below', power: 0.07, inEngine: true },
    { id: 'primaryBalance', label: 'Saldo primario', unit: '% del PIB', threshold: 0.23, risky: 'below', power: 0.13, inEngine: true },
    { id: 'cyclicallyAdjustedBalance', label: 'Saldo ajustado por el ciclo', unit: '% del PIB', threshold: -2.50, risky: 'below', power: 0.23, inEngine: false },
    { id: 'stabilisingPrimaryBalance', label: 'Saldo primario que estabiliza la deuda', unit: '% del PIB', threshold: 2.34, risky: 'above', power: 0.08, inEngine: true },
    { id: 'grossDebt', label: 'Deuda pública bruta', unit: '% del PIB', threshold: 68.44, risky: 'above', power: 0.12, inEngine: true },
    { id: 'debtChange', label: 'Aumento de la deuda', unit: 'puntos del PIB', threshold: 8.06, risky: 'above', power: 0.12, inEngine: true },
    { id: 'shortTermDebt', label: 'Deuda pública a corto plazo', unit: '% del PIB', threshold: 13.20, risky: 'above', power: 0.20, inEngine: false },
    { id: 'netDebt', label: 'Deuda pública neta', unit: '% del PIB', threshold: 59.51, risky: 'above', power: 0.20, inEngine: false },
    { id: 'grossFinancingNeeds', label: 'Necesidades brutas de financiación', unit: '% del PIB', threshold: 15.95, risky: 'above', power: 0.26, inEngine: true },
    { id: 'interestGrowthDifferential', label: 'Diferencial tipo de interés-crecimiento', unit: 'puntos', threshold: 4.80, risky: 'above', power: 0.08, inEngine: true },
    { id: 'expenditureChange', label: 'Aumento del gasto público', unit: 'puntos del PIB', threshold: 1.90, risky: 'above', power: 0.11, inEngine: true },
    { id: 'consumptionChange', label: 'Aumento del consumo público', unit: 'puntos del PIB', threshold: 0.61, risky: 'above', power: 0.07, inEngine: false }
  ])
});
