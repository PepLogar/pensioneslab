// Lightweight default configuration and validator for all pages.
// Identical to model-current-v10 defaults, without loading demographic tables
// or instantiating the cohort simulation engine on the main thread.
import { CURRENT_SPAIN } from '../../data/current-spain-v8.js';
import { DEBT_POLICY_2026 } from '../../data/debt-policy-2026.js';
import { createFiscalCompositionV10 } from '../fiscal-composition-v10.js';
import {
  resolveConfig,
  weightsFor,
  DEFAULT_FUTURE_SCENARIO,
  DEFAULT_PROGRESSIVE_TRANSITION,
  DEFAULT_REVALUATION_CONFIG,
  DEFAULT_FISCAL_MEASURES,
  DEFAULT_FISCAL_RESCUES,
  DEFAULT_DEBT_RESTRUCTURINGS,
  DEFAULT_PAYMENT_ADJUSTMENTS,
  DEFAULT_ISSUANCE_TERM_YEARS,
  DEFAULT_SOVEREIGN_RISK
} from '../config-current-v10.js';
import { CALIBRATION_ID, STATE_VERSION, STORAGE_SUFFIX } from './storage-ids.js';

export const BASE_YEAR = CURRENT_SPAIN.baseYear;
export const END_YEAR = CURRENT_SPAIN.endYear;
// The names of the saved state live in storage-ids.js, with the history of STATE_VERSION, so the
// header does not load this module (docs/PROPUESTA-PESO-PAGINAS-2026-11-09.md).
export { CALIBRATION_ID, STATE_VERSION, STORAGE_SUFFIX };
if (CALIBRATION_ID !== CURRENT_SPAIN.id) throw new Error(`storage-ids.js names ${CALIBRATION_ID}, but the starting data are ${CURRENT_SPAIN.id}`);

const base = { ...CURRENT_SPAIN.base };
base.otherRevenue = base.totalRevenue - base.pensionContributions;
base.otherPrimarySpending = base.totalSpending - base.interest - base.publicPensionBenefits;
Object.freeze(base);
const composition = createFiscalCompositionV10(base);
const payroll = base.workers * base.wage;
// Opening change of the effective labour tax rate per contribution point and per +100 % of IRPF (guide notes).
export const LABOUR_WEDGE = composition.labourWedge;
// The opening pension share as a share of the revenue without the Recovery Plan grants (src/current-fiscal-v13.js).
export const PENSION_SHARE_SCALE = composition.opening.pensionShareScale;

export const DEFAULT_CONFIG = Object.freeze({
  system: 'payg',
  mix: Object.freeze({ payg: 0.34, ndc: 0.33, funded: 0.33 }),
  contributionRate: base.ordinaryPensionPool / payroll,
  taxRevenueGDP: base.otherRevenue / base.gdp,
  pensionBudgetShare: base.assignedStateResources / (base.otherRevenue - composition.opening.baseImputedContributions - composition.opening.baseMutuaContributions),
  retirementAge: 65,
  replacementRate: 0.77,
  realWageGrowth: 0,
  entrantGrowth: 0,
  ...DEFAULT_FUTURE_SCENARIO,
  longevityGain: 0,
  realReturn: 0.03,
  feeRate: 0.005,
  realInterestRate: (1 + DEBT_POLICY_2026.newIssuanceNominalRate) / 1.02 - 1,
  inflationRate: 0.02,
  marketShock: 0,
  initialDebtGDP: base.debt / base.gdp,
  newDebtTermYears: DEFAULT_ISSUANCE_TERM_YEARS,
  ...DEFAULT_SOVEREIGN_RISK,
  ...DEFAULT_PROGRESSIVE_TRANSITION,
  ...DEFAULT_REVALUATION_CONFIG,
  ...DEFAULT_FISCAL_MEASURES,
  fiscalRescues: DEFAULT_FISCAL_RESCUES,
  debtRestructurings: DEFAULT_DEBT_RESTRUCTURINGS,
  paymentAdjustments: DEFAULT_PAYMENT_ADJUSTMENTS
});

export function validateConfig(input = {}) {
  const config = resolveConfig(input, DEFAULT_CONFIG);
  if (config.initialDebtGDP !== DEFAULT_CONFIG.initialDebtGDP) {
    throw new RangeError('The starting debt is fixed; reforms change only the future');
  }
  return config;
}

export const systemWeights = input => weightsFor(validateConfig(input));
