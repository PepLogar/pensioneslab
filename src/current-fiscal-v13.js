/** V13: Treasury-observed yield differentials by maturity, centred on the
 * user's nominal anchor at 7.85 years. Each new bullet tranche fixes its own
 * coupon; funding uses the weighted mean and authorisations the maximum.
 * Also tracks the parallel base-rate debt trajectory (without the quadratic
 * sovereign risk-premium snowball) to separate primary/transition debt from
 * compound risk-premium stress.
 */
import { DEBT_POLICY_2026 } from '../data/debt-policy-2026.js';
import { validateDebtRestructurings } from './config-current-v9.js';
import { quoteTreasuryTermPricing } from './treasury-term-pricing.js';
import { debtTermMaturityWeights } from './debt-term.js';

function finite(value, name, minimum = -Infinity) {
  if (!Number.isFinite(value) || value < minimum) throw new RangeError(`Invalid ${name}`);
  return value;
}
function rate(value, name) {
  finite(value, name);
  if (value <= -1 || value >= 1) throw new RangeError(`Invalid ${name}`);
  return value;
}
function object(input, name, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new TypeError(`${name} must be a plain object`);
  }
  const copy = {};
  for (const key of Reflect.ownKeys(input)) {
    if (!allowed.includes(key)) throw new TypeError(`Unknown ${name}.${String(key)}`);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${key} cannot be an accessor`);
    copy[key] = descriptor.value;
  }
  return copy;
}
function adjustments(input) {
  const result = object(input, 'fiscal options', [
    'generalTaxRevenueOverride', 'otherPrimarySpendingOverride', 'stockFlowAdjustment', 'nonCashRevenue', 'restrictedMutuaRevenue', 'mutuaPensionTransfer',
    'earmarkedRevenue', 'pensionShareScale', 'captiveHoldings', 'captiveRepressionRate'
  ]);
  for (const key of ['generalTaxRevenueOverride', 'otherPrimarySpendingOverride']) {
    if (Object.hasOwn(result, key)) finite(result[key], key, 0);
  }
  result.nonCashRevenue = finite(result.nonCashRevenue ?? 0, 'nonCashRevenue', 0);
  result.restrictedMutuaRevenue = finite(result.restrictedMutuaRevenue ?? 0, 'restrictedMutuaRevenue', 0);
  result.mutuaPensionTransfer = finite(result.mutuaPensionTransfer ?? 0, 'mutuaPensionTransfer', 0);
  result.earmarkedRevenue = finite(result.earmarkedRevenue ?? 0, 'earmarkedRevenue', 0);
  result.pensionShareScale = finite(result.pensionShareScale ?? 1, 'pensionShareScale', Number.MIN_VALUE);
  result.captiveHoldings = finite(result.captiveHoldings ?? 0, 'captiveHoldings', 0);
  result.captiveRepressionRate = finite(result.captiveRepressionRate ?? 0, 'captiveRepressionRate', 0);
  if (result.mutuaPensionTransfer > result.restrictedMutuaRevenue) throw new RangeError('Mutual transfer exceeds restricted pool');
  result.stockFlowAdjustment = finite(result.stockFlowAdjustment ?? 0, 'stockFlowAdjustment');
  return result;
}
function budget(base, gdp, publicBenefits, publicContributions, config, meiContributions, options) {
  finite(gdp, 'gdp', Number.MIN_VALUE);
  finite(publicBenefits, 'publicBenefits', 0);
  finite(publicContributions, 'publicContributions', 0);
  finite(meiContributions, 'meiContributions', 0);
  if (meiContributions > publicContributions) throw new RangeError('MEI exceeds public contributions');
  const revenueShare = finite(config.taxRevenueGDP, 'taxRevenueGDP', 0);
  const pensionShare = finite(config.pensionBudgetShare, 'pensionBudgetShare', 0);
  if (pensionShare > 1) throw new RangeError('Invalid pensionBudgetShare');
  const generalTaxRevenue = options.generalTaxRevenueOverride ?? gdp * revenueShare;
  const otherPrimarySpending = options.otherPrimarySpendingOverride ?? gdp * base.otherPrimarySpending / base.gdp;
  if (options.nonCashRevenue + options.restrictedMutuaRevenue + options.earmarkedRevenue > generalTaxRevenue) throw new RangeError('Excluded revenue exceeds receipts');
  // Earmarked grants (the Recovery Plan since 1.73) are spent on their own programmes: they are not part of the
  // revenue a share of which goes to pensions. The share is the one of the 2026 opening, whose revenue carried the
  // 2025 grants; pensionShareScale turns it into the same share of the revenue without them.
  const pensionTaxTransfer = (generalTaxRevenue - options.nonCashRevenue - options.restrictedMutuaRevenue - options.earmarkedRevenue) *
    Math.min(1, pensionShare * options.pensionShareScale);
  const publicPensionContributions = publicContributions - meiContributions;
  const otherPublicBudget = generalTaxRevenue - pensionTaxTransfer + meiContributions - options.mutuaPensionTransfer;
  const otherBudgetBalance = otherPublicBudget - otherPrimarySpending;
  const pensionGap = publicBenefits - publicPensionContributions - pensionTaxTransfer - options.mutuaPensionTransfer;
  return { generalTaxRevenue, pensionTaxTransfer, otherPublicBudget, otherPrimarySpending,
    otherBudgetBalance, pensionGap, publicPensionContributions, meiContributions, mutuaPensionTransfer: options.mutuaPensionTransfer,
    totalPublicRevenue: generalTaxRevenue + publicContributions,
    primaryBalance: -pensionGap + otherBudgetBalance };
}
function weights(input, name, periodKey, baseYear) {
  if (!Array.isArray(input) || input.length === 0) throw new TypeError(`Missing ${name}`);
  const seen = new Set();
  const result = input.map(row => {
    const copy = object(row, name, [periodKey, 'weight']);
    if (!Number.isInteger(copy[periodKey]) || copy[periodKey] <= (periodKey === 'maturityYear' ? baseYear : 0) ||
        seen.has(copy[periodKey])) throw new RangeError(`Invalid ${name} period`);
    seen.add(copy[periodKey]);
    finite(copy.weight, `${name}.weight`, Number.MIN_VALUE);
    return Object.freeze(copy);
  });
  if (Math.abs(result.reduce((sum, row) => sum + row.weight, 0) - 1) > 1e-10) {
    throw new RangeError(`${name} must sum to one`);
  }
  return Object.freeze(result);
}
const sumPrincipal = ledger => ledger.reduce((sum, row) => sum + row.principalNominal, 0);
const sumRateAmount = ledger => ledger.reduce((sum, row) => sum + row.principalNominal * row.nominalRate, 0);
const tolerance = (...values) => Math.max(.01, Number.EPSILON * Math.max(1, ...values.map(Math.abs)) * 64);
function ledgerCopy(input, year) {
  if (!Array.isArray(input)) throw new TypeError('Missing debtVintageLedger');
  return input.map(row => {
    if (!Number.isInteger(row.maturityYear) || row.maturityYear < year ||
        !Number.isInteger(row.issueYear) || row.issueYear >= year || row.maturityYear <= row.issueYear) {
      throw new RangeError('Invalid debt vintage dates');
    }
    finite(row.principalNominal, 'vintage principal', 0);
    rate(row.nominalRate, 'vintage rate');
    return { ...row };
  });
}

function financingSolution(primary, sfa, oldInterest, due, debt, cash, newRate, survivingRate) {
  const b = -primary + sfa + oldInterest, k = .5 * newRate, c = .5 * survivingRate;
  const candidates = [
    { value: (b + k * (due - cash)) / (1 - k), min: cash, max: Infinity },
    { value: b + k * due, min: 0, max: cash },
    { value: (b + k * due) / (1 - k), min: -due, max: 0 },
    { value: (b + c * due) / (1 - c), min: -debt, max: -due },
    { value: b - c * (debt - due), min: -Infinity, max: -debt }
  ];
  const tol = tolerance(primary, sfa, debt, cash);
  const candidate = candidates.find(row => row.value >= row.min - tol && row.value <= row.max + tol);
  if (!candidate || !Number.isFinite(candidate.value)) throw new RangeError('Cannot reconcile annual debt financing');
  return Math.abs(candidate.value) < .000001 ? 0 : candidate.value;
}

// `maturityWeightsForTerm` turns the configured average term into annual bullet
// tranches: adjacent years by default; since 1.51 the current models pass the
// observed Treasury ladder (src/debt-issuance.js) and name it in `issuanceProfile`.
export function createCurrentFiscalEngineV13(input, { policy = DEBT_POLICY_2026,
  maturityWeightsForTerm = debtTermMaturityWeights, issuanceProfile = null } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new TypeError('Explicit fiscal base required');
  const base = {};
  for (const key of ['gdp', 'otherPrimarySpending', 'interest', 'debt']) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`Missing fiscal base.${key}`);
    base[key] = finite(descriptor.value, `base.${key}`, key === 'interest' ? -Infinity : 0);
  }
  if (!(base.gdp > 0) || (base.debt === 0 && base.interest !== 0)) throw new RangeError('Invalid fiscal base');
  const baseYear = input.baseYear ?? policy.baseYear ?? 2026;
  if (!Number.isInteger(baseYear)) throw new RangeError('Invalid baseYear');
  const initialWeights = weights(policy.initialMaturityWeights, 'initialMaturityWeights', 'maturityYear', baseYear);
  const policyIssueWeights = weights(policy.newIssueMaturityWeights, 'newIssueMaturityWeights', 'years', baseYear);
  const issuanceTerms = config => {
    const rows = config.newDebtTermYears === undefined ? policyIssueWeights : maturityWeightsForTerm(config.newDebtTermYears);
    return { newDebtTermYears: rows.reduce((sum, row) => sum + row.years * row.weight, 0), newDebtMaturityWeights: rows,
      ...(issuanceProfile ? { newDebtIssuanceProfile: issuanceProfile } : {}) };
  };
  Object.freeze(base);

  return Object.freeze({
    initialFiscalAccounts(gdp, publicBenefits, publicContributions, defaults, initialDebtGDP = base.debt / gdp,
      meiContributions = 0, inputOptions = {}) {
      const options = adjustments(inputOptions);
      if (options.stockFlowAdjustment !== 0) throw new RangeError('Base-year financial transactions need a separate observed opening bridge');
      const accounts = budget(base, gdp, publicBenefits, publicContributions, defaults, meiContributions, options);
      finite(initialDebtGDP, 'initialDebtGDP', 0);
      const debt = gdp * initialDebtGDP;
      if (debt === 0 && base.interest !== 0) throw new RangeError('Interest with no initial debt');
      const openingRate = rate(debt ? base.interest / debt : 0, 'opening portfolio rate');
      const debtVintageLedger = Object.freeze(initialWeights.map(row => Object.freeze({
        issueYear: baseYear, maturityYear: row.maturityYear,
        principalNominal: debt * row.weight, nominalRate: openingRate, origin: 'opening-proxy'
      })));
      // Base flows are a snapshot, never another deficit charged to the debt.
      return { ...accounts, fiscalYear: baseYear, priceIndex: 1,
        fiscalEngineVersion: 'nominal-vintages-v5-treasury-term-pricing', debtPolicyId: policy.id ?? null,
        ...issuanceTerms(defaults), newDebtFirstMaturityYear: null, newDebtLastMaturityYear: null,
        debtNextMaturityYear: debt > 0 ? Math.min(...debtVintageLedger.map(row => row.maturityYear)) : null,
        interest: base.interest, stateBalance: accounts.primaryBalance - base.interest,
        totalPublicSpending: publicBenefits + accounts.otherPrimarySpending + base.interest,
        debt, cash: 0, debtVintageLedger,
        baseRateDebt: debt, baseRateCash: 0, baseRateInterest: base.interest,
        baseRateStateBalance: accounts.primaryBalance - base.interest,
        riskPremiumDebtSnowball: 0, baseRateDebtVintageLedger: debtVintageLedger,
        openingDebtReal: null, openingCashReal: null,
        inflationDebtAdjustment: 0, stockFlowAdjustment: 0, financingNeed: null,
        nominalInterestRate: null, targetNominalInterestRate: null, maxNewDebtNominalRate: null,
        riskPremium: null, riskPremiumInterestOnIssuance: 0, riskPremiumAnnualCostOnIssuance: 0,
        effectiveNominalRate: openingRate, openingEffectiveNominalRate: null,
        interestOnOpeningDebt: base.interest, interestOnNewDebt: 0, refinancingShare: null,
        debtMaturities: null, debtRefinanced: null, grossDebtIssuance: null,
        debtBuybacks: null, debtRepaymentAtMaturity: null,
        debtAdded: null, debtRepaid: null, cashUsed: null, cashAdded: null };
    },

    publicAccounts(gdp, publicBenefits, publicContributions, previous, config, year,
      meiContributions = 0, inputOptions = {}) {
      const options = adjustments(inputOptions);
      const accounts = budget(base, gdp, publicBenefits, publicContributions, config, meiContributions, options);
      const terms = issuanceTerms(config), issueWeights = terms.newDebtMaturityWeights;
      if (!Number.isInteger(year) || year !== previous.fiscalYear + 1) throw new RangeError('Fiscal years must be consecutive');
      finite(previous.debt, 'previous.debt', 0);
      finite(previous.cash, 'previous.cash', 0);
      const priorPrice = finite(previous.priceIndex, 'previous.priceIndex', Number.MIN_VALUE);
      const inflation = finite(config.inflationRate, 'inflationRate');
      const realRate = finite(config.realInterestRate, 'realInterestRate');
      if (inflation <= -1 || realRate <= -1) throw new RangeError('Invalid price or rate factor');
      const priceIndex = finite(priorPrice * (1 + inflation), 'priceIndex', Number.MIN_VALUE);
      const originalOpeningDebtNominal = previous.debt * priorPrice;
      let openingDebtNominal = originalOpeningDebtNominal;
      const openingCashNominal = previous.cash * priorPrice;
      let ledger = ledgerCopy(previous.debtVintageLedger, year);
      if (Math.abs(sumPrincipal(ledger) - openingDebtNominal) > tolerance(openingDebtNominal)) {
        throw new RangeError('Debt stock differs from nominal vintages');
      }
      const restructuringPolicy = validateDebtRestructurings(config.debtRestructurings ?? [])
        .find(row => row.year === year);
      let debtRestructuring = null, writtenOffNominal = 0;
      if (restructuringPolicy) {
        writtenOffNominal = originalOpeningDebtNominal * restructuringPolicy.haircut;
        openingDebtNominal = originalOpeningDebtNominal - writtenOffNominal;
        const maturityYear = year + restructuringPolicy.termYears;
        ledger = openingDebtNominal > 0 ? [{ issueYear: year, maturityYear,
          principalNominal: openingDebtNominal, nominalRate: restructuringPolicy.nominalRate,
          origin: 'restructured-consolidated-debt' }] : [];
        debtRestructuring = Object.freeze({
          policy: Object.freeze({ ...restructuringPolicy }),
          originalPrincipalNominal: originalOpeningDebtNominal,
          remainingPrincipalNominal: openingDebtNominal,
          writtenOffNominal, maturityYear, priceIndex,
          scope: 'opening-consolidated-public-debt', amortization: 'bullet'
        });
      }
      const nominalGDP = finite(gdp * priceIndex, 'nominalGDP', Number.MIN_VALUE);
      const riskPremium = quoteTreasuryTermPricing(openingDebtNominal / nominalGDP, config,
        { maturityWeights: issueWeights });
      const targetNominalInterestRate = rate(riskPremium.nominalRate, 'issuance rate');
      const dueRows = ledger.filter(row => row.maturityYear === year);
      const surviving = ledger.filter(row => row.maturityYear > year);
      const due = sumPrincipal(dueRows), survivingDebt = sumPrincipal(surviving);
      const survivingRate = survivingDebt ? sumRateAmount(surviving) / survivingDebt : 0;
      const openingAnnualInterest = sumRateAmount(ledger);
      // A captive fund holds the State's bonds (capitalizationStyle 'sovereign-captive'): on them the State pays its
      // coupons less the financial repression, which is what the fund earns (src/progressive-transition.js). The
      // holdings are the fund's opening assets, at most the debt (after a haircut, the debt that is left).
      const captiveHeld = Math.min(options.captiveHoldings * priorPrice * (restructuringPolicy ? 1 - restructuringPolicy.haircut : 1), openingDebtNominal);
      const captiveInterestSavingNominal = captiveHeld * options.captiveRepressionRate;
      const oldInterestBeforeBuybacks = sumRateAmount(surviving) + .5 * sumRateAmount(dueRows) - captiveInterestSavingNominal;
      const primaryNominal = accounts.primaryBalance * priceIndex;
      const sfaNominal = options.stockFlowAdjustment * priceIndex;
      const need = financingSolution(primaryNominal, sfaNominal, oldInterestBeforeBuybacks,
        due, openingDebtNominal, openingCashNominal, targetNominalInterestRate, survivingRate);
      const cashUsedNominal = Math.min(openingCashNominal, Math.max(0, need));
      const debtAddedNominal = Math.max(0, need - cashUsedNominal);
      const debtRepaidNominal = Math.min(openingDebtNominal, Math.max(0, -need));
      const cashAddedNominal = Math.max(0, -need - debtRepaidNominal);
      const repaidAtMaturity = Math.min(due, debtRepaidNominal);
      const buybacks = Math.max(0, debtRepaidNominal - repaidAtMaturity);
      const refinanced = Math.max(0, due - repaidAtMaturity);
      const grossIssued = refinanced + debtAddedNominal;
      const oldInterest = oldInterestBeforeBuybacks - .5 * buybacks * survivingRate;
      const newInterest = .5 * grossIssued * targetNominalInterestRate;
      const interestNominal = oldInterest + newInterest;
      if (Math.abs(need - (-primaryNominal + interestNominal + sfaNominal)) >
          tolerance(need, interestNominal, primaryNominal)) throw new RangeError('Interest financing does not reconcile');
      const keptShare = survivingDebt ? Math.max(0, 1 - buybacks / survivingDebt) : 0;
      const nextLedger = surviving.map(row => ({ ...row, principalNominal: row.principalNominal * keptShare }));
      for (const row of riskPremium.tranches) nextLedger.push({ issueYear: year, maturityYear: year + row.years,
        principalNominal: grossIssued * row.weight, nominalRate: row.nominalRate,
        riskPremiumRate: riskPremium.premiumRate, termSpreadRate: row.termSpreadRate,
        treasuryCurveId: riskPremium.curveId, origin: 'new-issue-proxy' });
      const debtVintageLedger = Object.freeze(nextLedger.filter(row => row.principalNominal > 0).map(Object.freeze));
      const closingDebtNominal = sumPrincipal(debtVintageLedger);
      if (Math.abs(closingDebtNominal - (openingDebtNominal + debtAddedNominal - debtRepaidNominal)) >
          tolerance(closingDebtNominal, openingDebtNominal)) throw new RangeError('Debt principal does not reconcile');
      const money = nominal => nominal / priceIndex;
      const interest = money(interestNominal), stateBalance = accounts.primaryBalance - interest;
      const debt = money(closingDebtNominal);
      const cash = money(openingCashNominal - cashUsedNominal + cashAddedNominal);
      const openingDebtReal = money(originalOpeningDebtNominal), openingCashReal = money(openingCashNominal);
      const nominalExposure = openingDebtNominal - .5 * due - .5 * buybacks + .5 * grossIssued;

      // Parallel base-rate debt path (without sovereign risk-premium spread)
      let baseOpeningDebtNominal = (previous.baseRateDebt ?? previous.debt) * priorPrice;
      const baseOpeningCashNominal = (previous.baseRateCash ?? previous.cash) * priorPrice;
      let baseLedger = ledgerCopy(previous.baseRateDebtVintageLedger ?? previous.debtVintageLedger, year);
      if (restructuringPolicy) {
        const baseWrittenOffNominal = baseOpeningDebtNominal * restructuringPolicy.haircut;
        baseOpeningDebtNominal -= baseWrittenOffNominal;
        const maturityYear = year + restructuringPolicy.termYears;
        baseLedger = baseOpeningDebtNominal > 0 ? [{ issueYear: year, maturityYear,
          principalNominal: baseOpeningDebtNominal, nominalRate: restructuringPolicy.nominalRate,
          origin: 'restructured-consolidated-debt' }] : [];
      }
      const baseDueRows = baseLedger.filter(row => row.maturityYear === year);
      const baseSurviving = baseLedger.filter(row => row.maturityYear > year);
      const baseDue = sumPrincipal(baseDueRows), baseSurvivingDebt = sumPrincipal(baseSurviving);
      const baseSurvivingRate = baseSurvivingDebt ? sumRateAmount(baseSurviving) / baseSurvivingDebt : 0;
      const baseOldInterestBeforeBuybacks = sumRateAmount(baseSurviving) + .5 * sumRateAmount(baseDueRows) -
        Math.min(captiveHeld, baseOpeningDebtNominal) * options.captiveRepressionRate;
      const baseTargetNominalRate = rate(riskPremium.baseNominalRate, 'base issuance rate');
      const baseNeed = financingSolution(primaryNominal, sfaNominal, baseOldInterestBeforeBuybacks,
        baseDue, baseOpeningDebtNominal, baseOpeningCashNominal, baseTargetNominalRate, baseSurvivingRate);
      const baseCashUsedNominal = Math.min(baseOpeningCashNominal, Math.max(0, baseNeed));
      const baseDebtAddedNominal = Math.max(0, baseNeed - baseCashUsedNominal);
      const baseDebtRepaidNominal = Math.min(baseOpeningDebtNominal, Math.max(0, -baseNeed));
      const baseCashAddedNominal = Math.max(0, -baseNeed - baseDebtRepaidNominal);
      const baseRepaidAtMaturity = Math.min(baseDue, baseDebtRepaidNominal);
      const baseBuybacks = Math.max(0, baseDebtRepaidNominal - baseRepaidAtMaturity);
      const baseRefinanced = Math.max(0, baseDue - baseRepaidAtMaturity);
      const baseGrossIssued = baseRefinanced + baseDebtAddedNominal;
      const baseOldInterest = baseOldInterestBeforeBuybacks - .5 * baseBuybacks * baseSurvivingRate;
      const baseNewInterest = .5 * baseGrossIssued * baseTargetNominalRate;
      const baseInterestNominal = baseOldInterest + baseNewInterest;
      const baseKeptShare = baseSurvivingDebt ? Math.max(0, 1 - baseBuybacks / baseSurvivingDebt) : 0;
      const nextBaseLedger = baseSurviving.map(row => ({ ...row, principalNominal: row.principalNominal * baseKeptShare }));
      for (const row of riskPremium.tranches) nextBaseLedger.push({ issueYear: year, maturityYear: year + row.years,
        principalNominal: baseGrossIssued * row.weight, nominalRate: row.nominalRate - riskPremium.premiumRate,
        riskPremiumRate: 0, termSpreadRate: row.termSpreadRate,
        treasuryCurveId: riskPremium.curveId, origin: 'new-issue-proxy' });
      const baseRateDebtVintageLedger = Object.freeze(nextBaseLedger.filter(row => row.principalNominal > 0).map(Object.freeze));
      const baseClosingDebtNominal = sumPrincipal(baseRateDebtVintageLedger);
      const baseRateInterest = money(baseInterestNominal);
      const baseRateStateBalance = accounts.primaryBalance - baseRateInterest;
      const baseRateDebt = money(baseClosingDebtNominal);
      const baseRateCash = money(baseOpeningCashNominal - baseCashUsedNominal + baseCashAddedNominal);
      const riskPremiumDebtSnowball = debt - baseRateDebt;

      return { ...accounts, fiscalYear: year, priceIndex,
        fiscalEngineVersion: 'nominal-vintages-v5-treasury-term-pricing', debtPolicyId: policy.id ?? null,
        ...terms,
        newDebtFirstMaturityYear: grossIssued > 0 ? year + issueWeights[0].years : null,
        newDebtLastMaturityYear: grossIssued > 0 ? year + issueWeights.at(-1).years : null,
        debtNextMaturityYear: debtVintageLedger.length ? Math.min(...debtVintageLedger.map(row => row.maturityYear)) : null,
        interest, stateBalance, totalPublicSpending: publicBenefits + accounts.otherPrimarySpending + interest,
        debt, cash, debtVintageLedger,
        baseRateDebt, baseRateCash, baseRateInterest, baseRateStateBalance,
        riskPremiumDebtSnowball, baseRateDebtVintageLedger,
        openingDebtReal, openingCashReal,
        inflationDebtAdjustment: openingDebtReal - openingCashReal - (previous.debt - previous.cash),
        ...(debtRestructuring ? { debtWrittenOff: money(writtenOffNominal), debtRestructuring } : {}),
        stockFlowAdjustment: options.stockFlowAdjustment,
        financingNeed: -stateBalance + options.stockFlowAdjustment,
        nominalInterestRate: nominalExposure > 0 ? interestNominal / nominalExposure : 0,
        targetNominalInterestRate, maxNewDebtNominalRate: riskPremium.maxNominalRate, riskPremium,
        // Descriptive decomposition on actual gross issuance, not savings
        // against a no-premium counterfactual (issuance itself would change).
        riskPremiumInterestOnIssuance: money(.5 * grossIssued * riskPremium.premiumRate),
        riskPremiumAnnualCostOnIssuance: money(grossIssued * riskPremium.premiumRate),
        effectiveNominalRate: closingDebtNominal ? sumRateAmount(debtVintageLedger) / closingDebtNominal : 0,
        openingEffectiveNominalRate: openingDebtNominal ? openingAnnualInterest / openingDebtNominal : 0,
        interestOnOpeningDebt: money(oldInterest), interestOnNewDebt: money(newInterest),
        captiveInterestSaving: money(captiveInterestSavingNominal), captiveHoldingsNominal: captiveHeld,
        refinancingShare: openingDebtNominal ? due / openingDebtNominal : 0,
        debtMaturities: money(due), debtRefinanced: money(refinanced), grossDebtIssuance: money(grossIssued),
        debtBuybacks: money(buybacks), debtRepaymentAtMaturity: money(repaidAtMaturity),
        debtAdded: money(debtAddedNominal), debtRepaid: money(debtRepaidNominal),
        cashUsed: money(cashUsedNominal), cashAdded: money(cashAddedNominal) };
    }
  });
}
