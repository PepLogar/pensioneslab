import { createCurrentPolicyV2, solidarityRates } from './current-policy-v2.js';
import { PENSION_POLICY_2026 as POLICY } from '../data/pension-policy-2026.js';
import { CONTRIBUTION_BASES_V5 as D } from '../data/contribution-bases-v5.js';
import { WAGE_BRIDGE_V5 as W } from '../data/wage-bridge-v5.js';
import { shortRunInflationRate } from './shared/short-run-employment.js';
export { meiRate, accumulateReserve } from './current-policy-v2.js';

/** Annual smoothing of published centile means. Counts are fixed weights,
 * NOT national worker counts. No invented within-centile/Pareto distribution. */
export function salaryBaseMasses(nominalSalaryIndex, annualMaximum) {
  if (!(Number.isFinite(nominalSalaryIndex) && nominalSalaryIndex > 0 &&
    Number.isFinite(annualMaximum) && annualMaximum > 0)) throw new RangeError('Invalid salary/base index');
  let gross = 0, capped = 0;
  const excess = [0, 0, 0];
  for (const [count, salary2024] of D.centiles) {
    const pay = salary2024 * W.nominal2024To2026 * nominalSalaryIndex;
    gross += count * pay;
    capped += count * Math.min(pay, annualMaximum);
    excess[0] += count * Math.min(Math.max(pay - annualMaximum, 0), .1 * annualMaximum);
    excess[1] += count * Math.min(Math.max(pay - 1.1 * annualMaximum, 0), .4 * annualMaximum);
    excess[2] += count * Math.max(pay - 1.5 * annualMaximum, 0);
  }
  return { gross, capped, excess };
}

export function createCurrentPolicyV5(base, { nominalWageIndex,
  priorYearInflationRates = {}, pensionRevaluationRates = {} } = {}) {
  if (typeof nominalWageIndex !== 'function') throw new TypeError('Nominal wage path required');
  const inherited = createCurrentPolicyV2(base, { priorYearInflationRates, pensionRevaluationRates });
  const baseYear = base.baseYear ?? 2026, payroll = base.workers * base.wage;
  const maximum0 = 12 * POLICY.maximumContributionBase.monthlyEUR2026;
  const opening = salaryBaseMasses(1, maximum0);
  const initialRates = solidarityRates(baseYear);
  const weighted = (m, r) => m.excess.reduce((sum, b, i) => sum + b * r[i], 0);
  const initialSolidarity = weighted(opening, initialRates);
  if (!(initialSolidarity > 0 && Number.isFinite(base.solidarityAnnualPace) && base.solidarityAnnualPace >= 0)) throw new RangeError('Invalid solidarity opening');
  const prior = { [POLICY.pensionIndexation.firstPriorYearProxy.year]: POLICY.pensionIndexation.firstPriorYearProxy.rate, ...priorYearInflationRates };
  function baseResponse(year, config) {
    if (!Number.isInteger(year) || year < baseYear) throw new RangeError('Invalid contribution year');
    let maximum = maximum0;
    for (let y = baseYear + 1; y <= year; y++) {
      // Legal ceiling keeps its own inflation proxy even if the user cuts or
      // freezes pensions. Explicit research revaluations are separate inputs.
      // The prior year's inflation: observed, else the AIReF's in 2027–2030 with config.airefShortRunEmployment,
      // else the scenario's (docs/REVISION-ADVERSARIAL-2026-11-24.md, 7).
      const legal = Math.max(0, pensionRevaluationRates[y] ?? prior[y - 1] ?? shortRunInflationRate(y - 1, config) ?? config.inflationRate);
      const extra = y <= POLICY.maximumContributionBase.through ? POLICY.maximumContributionBase.extraAnnualGrowthPoints : 0;
      maximum *= 1 + legal + extra;
    }
    const wage = nominalWageIndex(year, config), masses = salaryBaseMasses(wage, maximum);
    const cappedIndex = masses.capped / opening.capped;
    const factors = solidarityRates(year).map((r, i) => r / initialRates[i]);
    const solidarityRGIndex = weighted(masses, solidarityRates(year)) / initialSolidarity;
    // Convert mass-per-worker indices into effective rates on the existing
    // payroll. The core supplies employment × wage exactly once.
    return { maximumAnnualNominal: maximum, nominalWageIndex: wage, cappedBaseIndex: cappedIndex,
      cappedToWage: cappedIndex / wage,
      ordinaryAdjustment: 1 + D.ordinaryRGShare * (cappedIndex / wage - 1),
      meiAdjustment: 1 + D.meiRGShare * (cappedIndex / wage - 1),
      solidarityRGIndex,
      solidarityAdjustment: D.solidarityRGShare * solidarityRGIndex / wage + (1 - D.solidarityRGShare) * Math.min(...factors),
      // Only the small Mar residual retains a conditional rate-ratio range.
      // No guaranteed total revenue interval is asserted for the RG proxy.
      solidarityUpperAdjustment: D.solidarityRGShare * solidarityRGIndex / wage + (1 - D.solidarityRGShare) * Math.max(...factors) };
  }
  return Object.freeze({ ...inherited, baseResponse,
    contributionRates(year, config) {
      const old = inherited.contributionRates(year, config), b = baseResponse(year, config);
      const mei = old.meiRate * b.meiAdjustment;
      const solidarity = base.solidarityAnnualPace / payroll * b.solidarityAdjustment;
      return { retirementRate: old.retirementRate * b.ordinaryAdjustment,
        protectedRate: (old.protectedRate - old.meiRate) * b.ordinaryAdjustment + mei + solidarity,
        meiRate: mei, solidarityRate: solidarity,
        solidarityRateUpper: base.solidarityAnnualPace / payroll * b.solidarityUpperAdjustment };
    },
    assumptions: Object.freeze({ ...inherited.assumptions,
      contributionBase: 'AEAT2024 full-year salary100-centile conditional profile. Published means × shared salary bridge, a12-month ceiling and unchanged composition. Normalised to observed/estimated2026 receipts, not future fiscal targets.',
      exposure: 'TGSS Jan-Aug2026 RG shares: ordinary RG/system ordinary assigned to pension pool; MEI RG/MEI; solidarity RG/solidarity. They are budget exposures, not an exact RG0111 tax-base distribution. Other effective SEC contributions retain payroll proxy.',
      ceiling: 'LGSS19.3/DT38: legal pension inflation proxy plus1.2percentage points through2050; legal proxy alone thereafter. Manual pension policy does not alter this separate ceiling. Annual HICP is an explicit approximation to legal Dec-Nov CPI.',
      solidarity: 'Same wages and moving maximum as capped contributions. Normalised RG three-band statutory yield; Mar residual keeps payroll/minimum-rate-ratio assumption. All solidarity remains public, without individual rights or reserve allocation.',
      solidarityLimitations: 'Annual centile means, common-territory selection and fixed shape are approximations; no exact monthly/multiple-job/foral/RETA/minimum-base distribution is inferred. Not a guaranteed revenue interval or validated projection.' })
  });
}
