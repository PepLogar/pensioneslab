import { FISCAL_COMPOSITION_2026 as OFFICIAL } from '../data/fiscal-composition-2026.js';
import { PRTR_2026, prtrShare } from '../data/prtr-calendar-2026.js';

const COMPONENT_KEYS = ['allSocialContributions', 'taxes', 'publicEmployeeCompensation'];
function plainValues(value, keys, name) {
  if (!value || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`Plain ${name} required`);
  for (const key of Reflect.ownKeys(value)) {
    if (!keys.includes(key) || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) throw new TypeError(`Unknown ${name} field or accessor`);
    if (!Number.isFinite(value[key]) || value[key] < 0) throw new RangeError(`Invalid ${name}`);
  }
}

/** Opening components are observations/estimates of the SAME opening year.
 * Matched grants are an explicitly supplied exogenous programme, never a
 * future aggregate revenue/spending/deficit/debt target. Values use GDP shares.
 * With neither option this retains v2's fiscal mechanisms exactly.
 */
export function createFiscalCompositionV3(base, { openingComponents = {}, temporaryMatchedFlows = [] } = {}) {
  plainValues(openingComponents, COMPONENT_KEYS, 'opening component');
  if (!Array.isArray(temporaryMatchedFlows)) throw new TypeError('A matched-flow calendar is required');
  const flows = temporaryMatchedFlows.map((row, i) => {
    plainValues(row, ['year', 'gdpShare'], 'matched flow');
    if (Object.keys(row).length !== 2 || row.year !== 2026 + i || row.gdpShare > 1) throw new RangeError('Explicit consecutive matched-flow years from2026 required');
    return Object.freeze({ ...row });
  });
  const bridge = OFFICIAL.bridge2026NominalFactor;
  const baseOtherContributions = (openingComponents.allSocialContributions ?? OFFICIAL.allSocialContributions * bridge) - base.pensionContributions;
  const baseTaxes = openingComponents.taxes ?? OFFICIAL.taxes * bridge;
  // An explicit calendar (an external research context) starts in the opening year. Otherwise the Recovery Plan
  // (data/prtr-calendar-2026.js, since 1.73): the opening carries its 2025 share, and each year adds its own.
  const explicit = flows.length > 0;
  const baseMatched = (explicit ? flows[0].gdpShare : PRTR_2026.openingShare) * base.gdp;
  const baseOtherIncome = base.otherRevenue - baseOtherContributions - baseTaxes - baseMatched;
  const basePublicPay = openingComponents.publicEmployeeCompensation ?? OFFICIAL.publicEmployeeCompensation * bridge;
  const baseOtherPrimary = base.otherPrimarySpending - basePublicPay - baseMatched;
  if ([baseOtherContributions, baseTaxes, baseOtherIncome, basePublicPay, baseOtherPrimary].some(x => !Number.isFinite(x) || x < 0)) throw new RangeError('Components exceed the fiscal opening');
  const referenceRevenueShare = base.otherRevenue / base.gdp, basePayroll = base.workers * base.wage;
  return Object.freeze({
    opening: Object.freeze({ baseOtherContributions, baseTaxes, baseOtherIncome, basePublicPay, baseOtherPrimary, baseMatched, basePayroll, referenceRevenueShare }),
    assumptions: Object.freeze({ source: OFFICIAL.id,
      openingComponents: Object.freeze({ ...openingComponents }), temporaryMatchedFlows: Object.freeze(flows),
      recoveryPlan: explicit ? null : PRTR_2026.id,
      income: 'Other contributions follow payroll; taxes and ordinary other revenue follow GDP. User revenue settings scale these ordinary components; explicit matched grants retain their supplied calendar.',
      publicPay: 'Opening D.1 follows the published salary agreement +4.5% in2027 and +2% in2028, assuming constant headcount; its2028 GDP share is retained thereafter. This remains a proxy for total compensation.',
      spending: 'Other ordinary primary spending retains its opening GDP share. No future aggregate fiscal outputs are inputs.',
      temporary: 'Each supplied grant is removed from both opening residuals and added to revenue and expenditure together in the specified year. Later zeroes must be explicit assumptions, never inferred from missing source cells.',
      boundaries: 'No fiscal-drag coefficient, future DANA removal or unexplained stock-flow adjustment is fitted.' }),
    accounts({ year, gdp, realPayroll, priceIndex, gdp2028, config }) {
      if (!Number.isInteger(year) || year < 2026 || [gdp, realPayroll, priceIndex].some(x => !Number.isFinite(x) || x <= 0)) throw new RangeError('Invalid fiscal context');
      const flow = explicit ? flows[year - 2026] : null;
      if (explicit && !flow) throw new RangeError('No matched-flow assumption supplied for this year');
      const matched = (explicit ? flow.gdpShare : prtrShare(year)) * gdp;
      const revenueScale = config.taxRevenueGDP / referenceRevenueShare;
      const otherSocialContributions = baseOtherContributions * realPayroll / basePayroll * revenueScale;
      const taxes = baseTaxes * gdp / base.gdp * revenueScale;
      const otherNonTaxRevenue = baseOtherIncome * gdp / base.gdp * revenueScale + matched;
      let publicEmployeeCompensation = basePublicPay;
      if (year === 2027) publicEmployeeCompensation *= 1.045 / priceIndex;
      else if (year === 2028) publicEmployeeCompensation *= 1.045 * 1.02 / priceIndex;
      else if (year > 2028) {
        if (!gdp2028 || !Number.isFinite(gdp2028.nominalGDP) || gdp2028.nominalGDP <= 0) throw new RangeError('2028 nominal GDP anchor required');
        publicEmployeeCompensation *= 1.045 * 1.02 * gdp / gdp2028.nominalGDP;
      }
      const remainingOtherPrimarySpending = baseOtherPrimary * gdp / base.gdp + matched;
      return { generalTaxRevenueOverride: taxes + otherSocialContributions + otherNonTaxRevenue,
        otherPrimarySpendingOverride: publicEmployeeCompensation + remainingOtherPrimarySpending,
        fiscalComposition: { taxes, otherSocialContributions, otherNonTaxRevenue, publicEmployeeCompensation, remainingOtherPrimarySpending,
          temporaryMatchedRevenue: matched, temporaryMatchedSpending: matched } };
    }
  });
}
