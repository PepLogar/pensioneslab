import { CURRENT_SPAIN as PREVIOUS } from './current-spain-v4.js';
import { WAGE_BRIDGE_V5 as W } from './wage-bridge-v5.js';

/** Only the equivalent salary level is rebased. Opening fiscal totals, debt,
 * pension payroll and contribution receipts/recognised-right proxies are kept. */
export const CURRENT_SPAIN = Object.freeze({ ...PREVIOUS,
  id: 'es-current-2026-10-18-v5', asOf: '2026-10-18', previousCalibration: PREVIOUS.id,
  base: Object.freeze({ ...PREVIOUS.base, wage: W.eaes2024 * W.nominal2024To2026 }),
  methods: Object.freeze({ ...PREVIOUS.methods,
    salary: W.status,
    contributions: 'Observed2026 income anchors retained. Exposed RG shares use a capped100-centile AEAT salary proxy; other regimes retain the payroll proxy. One common base response before routing contributions across systems.',
    solidarity: 'RG excess-pay bands and ordinary capped bases share the same salaries and moving statutory ceiling. Small Mar residual retains the earlier payroll/rate scenario. Solidarity remains public, creates no rights and is excluded from MEI reserve allocations.' }),
  sources: Object.freeze({ ...PREVIOUS.sources, wageBridge: W.id,
    contributionBases: 'es-contribution-bases-research-20261018-v5' })
});
