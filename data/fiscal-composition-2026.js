/** Official 2025 provisional S.13 components, not pension-specific forecasts.
 * Frozen IGAE workbook: Tabla1a, column AG (2025P), updated30/09/2026.
 * Amounts below are nominal euros; 2026 remains the original annual-pace estimate.
 */
export const FISCAL_COMPOSITION_2026 = Object.freeze({
  id: 'es-fiscal-composition-20261017-v2', asOf: '2026-10-17',
  source: 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/AAPP_A/A_AAPP.xlsx',
  original: 'data/sources/current-2026/fiscal-IGAE-A_AAPP-20260930.xlsx',
  sha256: '01925303ac94e6b5a3ef2c2057b08a3c830e50ff24c2cf34cf0c48deef58c563',
  publicationDate: '2026-09-30', year: 2025, status: 'provisional',
  allSocialContributions: (161450 + 54938 + 6842) * 1e6,
  socialContributionCells: Object.freeze(['AG22', 'AG23', 'AG24']),
  taxes: (114428 + 315 + 52189 + 24626 + 215023 + 5630 + 6047) * 1e6,
  taxCells: Object.freeze(['AG12', 'AG13', 'AG14', 'AG15', 'AG20', 'AG21', 'AG31']),
  publicEmployeeCompensation: 181502e6, compensationCell: 'AG38',
  totalRevenue: 725655e6, totalRevenueCell: 'AG7',
  totalSpending: 766296e6, totalSpendingCell: 'AG36',
  bridge2026NominalFactor: 1.055,
  publicWageAgreement: Object.freeze({
    source: 'https://www.hacienda.gob.es/docleyes/repositorio%20normativa/94837.htm',
    title: 'Acuerdo Marco por la mejora del empleo público y el servicio a la ciudadanía',
    published: '2026-02-07', location: 'Primero. Retribuciones',
    nominalGrowth: Object.freeze({ 2027: .045, 2028: .02 }),
    status: 'Published Government-union commitment; future implementation is an explicit scenario assumption, not an already approved annual budget.'
  })
});
