/** Same dated opening photograph; versioned debt/policy mechanisms change the future. */
import { CURRENT_SPAIN as PREVIOUS } from './current-spain.js';
import { DEBT_POLICY_2026 } from './debt-policy-2026.js';
import { PENSION_POLICY_2026 } from './pension-policy-2026.js';
import { FISCAL_COMPOSITION_2026 } from './fiscal-composition-2026.js';

export const CURRENT_SPAIN = Object.freeze({ ...PREVIOUS,
  id: 'es-current-2026-10-17-v2', previousCalibration: PREVIOUS.id,
  base: Object.freeze({ ...PREVIOUS.base, averageDebtMaturity: DEBT_POLICY_2026.averageDebtMaturity }),
  methods: Object.freeze({ ...PREVIOUS.methods,
    debt: 'Opening AAPP nominal debt remains July2026. Treasury September maturity weights proxy AAPP; no remaining2026 fiscal bridge is invented. Fixed-rate vintages and midyear refinancing replace uniform annual repricing.',
    interest: 'The observed latest-month Treasury issuance yield anchors future issuance, separately from inherited interest/debt. Future yields remain scenario assumptions; debt issued during the year pays half-year interest.',
    indexation: 'Pensions in payment use prior-year consumption inflation with a zero floor;2027 uses an explicit BdE2026 forecast proxy, not completed legal CPI observations.',
    fiscal: 'Opening totals unchanged. IGAE2025 distinguishes other social contributions tied to payroll, taxes/other income tied to GDP, and public pay following the published2027–28 agreement as a conditional assumption.',
    reserveFund: 'March2026 observed total as memorandum, then MEI allocations. Future allocations to domestic government securities are an explicit hypothesis; no duplication in consolidated debt or public cash.' }),
  sources: Object.freeze({ ...PREVIOUS.sources,
    debtPolicy: DEBT_POLICY_2026.sources,
    pensionPolicy: PENSION_POLICY_2026.sources,
    fiscalComposition: FISCAL_COMPOSITION_2026.source })
});
