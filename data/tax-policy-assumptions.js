/** Official inputs and explicit approximations for the dated rescue policy.
 * Original tax revenue levels and historical model versions are not replaced. */
export const TAX_POLICY_ASSUMPTIONS = Object.freeze({
  id: 'es-tax-policy-rescue-20261018-v1',
  informationCutoff: '2026-10-18',
  baselineVatRates: Object.freeze({ general: .21, reduced: .10, superReduced: .04 }),
  vatFinalExpenditure2025Million: Object.freeze({
    general: 394493.985, reduced: 237657.778, superReduced: 63284.720,
    total: 695436.483
  }),
  sources: Object.freeze({
    vatRates: 'https://www3.agenciatributaria.gob.es/Sede/iva/calculo-iva-repercutido-clientes/tipos-impositivos-iva.html',
    vatFinalExpenditure: 'https://sede.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_2025/Cuadro_8.7_es_es.xlsx',
    vatSnapshot: 'data/sources/rescue-vat2025-8.7.xlsx',
    vatSnapshotSha256: '2e01307b301ac7d6f790ae90ea0b67a5377869987f43f5e8065cfbfdafecd5c9',
    vatCells: 'AG9 total; AG12 superreducido; AG15 reducido; AG16 general. Millones de euros. Datos provisionales 2025.',
    irpfProfile: 'data/revenue-bases-v4.js: profile2024, original AEAT casilla 505',
    employmentExpense: 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a19'
  }),
  assumptions: Object.freeze({
    vat: 'Hold the AEAT2025 final-expenditure mix fixed. Apply its weighted statutory-rate change to the existing aggregate VAT-like pool. This extrapolation is a proxy, not territorial or household microsimulation. Zero-rated and exempt purchases are not changed.',
    irpf: 'Each AEAT2024 declaration group is represented by its observed mean general base. Apply the existing2024-to2026 wage bridge and the supplied nominal mean-income index; scale declarations by the supplied demographic proxy. Thresholds are real2026 euros. Group means cannot recover within-group distribution or exact marginal revenue.',
    payroll: 'User-supplied gross pay, withholding, social contributions and taxable base. Additional annual IRPF is spread over12 months for illustration, not an AEAT withholding calculation. Without an explicit base, gross less social contributions less2000 euros is only a simplified employment-income proxy.',
    consumption: 'Personal basket uses full VAT pass-through and unchanged quantities; VAT is paid when buying, never deducted from the payslip. The aggregate model retains its existing IRPF-disposable-income response; no new VAT-price elasticity is estimated.'
  })
});
