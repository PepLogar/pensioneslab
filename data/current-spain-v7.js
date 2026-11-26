import { CURRENT_SPAIN as PREVIOUS } from './current-spain-v6.js';
import { MUTUAS_V7 as M } from './mutuas-v7.js';

const old = PREVIOUS.base;
const mutuaContributions = old.socialContributions2026 * M.observed2026.contributions / M.observed2026.systemContributions;
const tgssOrdinaryContributions = old.socialContributions2026 - mutuaContributions - old.meiAnnualPace - old.solidarityAnnualPace;
// Removing all mutua receipts AND retaining their benefits in the old ratio
// would deduct the cost of temporary incapacity twice. Match both perimeters.
const tgssPensionAllocationShare = M.observed2025.systemPensionBenefits /
  (M.observed2025.systemContributoryBenefits - M.observed2025.contributoryBenefits);
const ordinaryPensionPool = tgssOrdinaryContributions * tgssPensionAllocationShare;
const tgssOtherContributions = tgssOrdinaryContributions - ordinaryPensionPool;
const pensionContributions = ordinaryPensionPool + old.meiAnnualPace + old.solidarityAnnualPace;

export const CURRENT_SPAIN = Object.freeze({ ...PREVIOUS,
  id: 'es-current-2026-10-18-v7', previousCalibration: PREVIOUS.id,
  base: Object.freeze({ ...old, mutuaContributions, tgssOrdinaryContributions,
    tgssPensionAllocationShare, tgssOtherContributions, ordinaryPensionPool, pensionContributions,
    otherRevenue: old.totalRevenue - pensionContributions }),
  methods: Object.freeze({ ...PREVIOUS.methods,
    contributions: M.notes.pensions,
    mutuaOpening: M.notes.opening,
    mutuaCapitalCost: M.notes.capitalCost,
    mutuaSpending: M.notes.spending,
    otherContributions: 'Separate mutual-assigned, other TGSS, and remaining effective SEC contributions inside the same opening total. TGSS pension and other shares use the same TGSS base response. Mutual known common RG receipts use capped wages; other unidentified mutual professional bases retain a payroll proxy. No blanket RG ceiling is inferred.',
    openingReclassification: 'Preserve consolidated opening revenue/spending, total contributions, debt, wages and pension payroll. Change the estimated allocation of the same SS contributions; keep MEI and solidarity distinct. Mutual receipts cannot be routed to retirement reform, private assets or the general-revenue pension-allocation control.' }),
  sources: Object.freeze({ ...PREVIOUS.sources, mutuas: M.id })
});
