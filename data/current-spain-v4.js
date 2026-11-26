/** Same opening stocks and flows asv3. V4 changes the revenue mechanisms. */
import { CURRENT_SPAIN as PREVIOUS } from './current-spain-v3.js';
import { REVENUE_BASES_V4 } from './revenue-bases-v4.js';
export const CURRENT_SPAIN = Object.freeze({ ...PREVIOUS,
  id: 'es-current-2026-10-17-v4', previousCalibration: PREVIOUS.id,
  methods: Object.freeze({ ...PREVIOUS.methods,
    fiscal: 'Income taxes follow income bases; VAT follows a declared expenditure proxy; corporate tax follows a gross surplus proxy. Official observations anchor levels, not future targets. See INGRESOS-POR-BASES-v4.md.',
    imputedContributions: 'D612 and D122 are matched memorandum components of existing totals. No cash is created or assigned to pensions from this imputation.' }),
  sources: Object.freeze({ ...PREVIOUS.sources, revenueBases: REVENUE_BASES_V4.id })
});
