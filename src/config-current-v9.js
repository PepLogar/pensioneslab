/** V9 adds explicit, recurring tax surcharges; prior validators stay frozen. */
import { resolveConfig as resolvePreviousConfig } from './config-current-v2.js';
export { weightsFor, DEFAULT_REVALUATION_CONFIG } from './config-current-v2.js';

export const DEFAULT_FISCAL_MEASURES = Object.freeze({
  irpfSurcharge: 0, vatSurcharge: 0, otherTaxSurcharge: 0
});
const KEYS = Object.keys(DEFAULT_FISCAL_MEASURES);
export const DEFAULT_FISCAL_RESCUES = Object.freeze([]);
const RESCUE_KEYS = ['year', 'vatGeneralRate', 'vatReducedRate', 'vatSuperReducedRate', 'irpfExtraPoints', 'irpfThreshold'];
export const DEFAULT_DEBT_RESTRUCTURINGS = Object.freeze([]);
const RESTRUCTURING_KEYS = ['year', 'haircut', 'termYears', 'nominalRate'];
// Explicit experiment assumption, not an observed or official portfolio share.
export const DEFAULT_FUNDED_SOVEREIGN_SHARE = .15;
// Nominal valuation yield for the exchange experiment; not an observed quote.
export const DEFAULT_CREDITOR_DISCOUNT_RATE = .03;
const CREDITOR_RESTRUCTURING_KEYS = [...RESTRUCTURING_KEYS, 'fundedSovereignShare'];
const TERMS_RESTRUCTURING_KEYS = [...CREDITOR_RESTRUCTURING_KEYS, 'creditorDiscountRate'];
export const DEFAULT_PAYMENT_ADJUSTMENTS = Object.freeze([]);
const PAYMENT_KEYS = ['year', 'publicPensionCut', 'otherSpendingCut'];

/** Dated payment levels, not reductions to accrued rights. Zero restores the
 * scheduled payment; the latest level replaces, rather than compounds, cuts. */
export function validatePaymentAdjustments(input) {
  if (!Array.isArray(input) || input.length > 44 || Reflect.ownKeys(input).length !== input.length + 1) {
    throw new TypeError('A dense payment adjustment calendar with at most 44 entries is required');
  }
  let previousYear = 2026;
  return Array.from({ length: input.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Payment adjustment entries must be stored values');
    const policy = descriptor.value;
    if (!policy || ![Object.prototype, null].includes(Object.getPrototypeOf(policy)) ||
        Reflect.ownKeys(policy).length !== PAYMENT_KEYS.length ||
        Reflect.ownKeys(policy).some(key => !PAYMENT_KEYS.includes(key) ||
          !Object.hasOwn(Object.getOwnPropertyDescriptor(policy, key), 'value'))) {
      throw new TypeError('A payment adjustment must contain exactly year, publicPensionCut and otherSpendingCut');
    }
    if (!Number.isInteger(policy.year) || policy.year <= previousYear || policy.year > 2070) {
      throw new RangeError('Payment adjustment years must be unique, increasing and within 2027…2070');
    }
    for (const key of PAYMENT_KEYS.slice(1)) {
      if (!Number.isFinite(policy[key]) || policy[key] < 0 || policy[key] > 1) throw new RangeError(`Invalid ${key}: expected 0…1`);
    }
    previousYear = policy.year;
    return Object.fromEntries(PAYMENT_KEYS.map(key => [key, policy[key]]));
  });
}

export function paymentAdjustmentForYear(calendar, year) {
  return calendar.findLast(policy => policy.year <= year) ?? null;
}

/** One-off debt exchanges. Each entry is an independent copy, with nominal
 * contract interest kept separate from the model's real funding assumption. */
export function validateDebtRestructurings(input) {
  if (!Array.isArray(input) || input.length > 44 ||
      Reflect.ownKeys(input).length !== input.length + 1) {
    throw new TypeError('A dense debt restructuring calendar with at most 44 entries is required');
  }
  let previousYear = 2026;
  return Array.from({ length: input.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Debt restructuring entries must be stored values');
    const policy = descriptor.value;
    if (!policy || ![Object.prototype, null].includes(Object.getPrototypeOf(policy)) ||
        ![RESTRUCTURING_KEYS.length, CREDITOR_RESTRUCTURING_KEYS.length, TERMS_RESTRUCTURING_KEYS.length].includes(Reflect.ownKeys(policy).length) ||
        Reflect.ownKeys(policy).some(key => !TERMS_RESTRUCTURING_KEYS.includes(key) ||
          !Object.hasOwn(Object.getOwnPropertyDescriptor(policy, key), 'value'))) {
      throw new TypeError('A debt restructuring must contain exactly the supported contract values');
    }
    if (!Number.isInteger(policy.year) || policy.year <= previousYear || policy.year > 2070) {
      throw new RangeError('Debt restructuring years must be unique, increasing and within 2027…2070');
    }
    if (!Number.isFinite(policy.haircut) || policy.haircut < 0 || policy.haircut > 1 ||
        !Number.isInteger(policy.termYears) || policy.termYears < 1 || policy.termYears > 50 ||
        !Number.isFinite(policy.nominalRate) || policy.nominalRate < 0 || policy.nominalRate > .30) {
      throw new RangeError('Invalid restructuring haircut, term or nominal interest');
    }
    const fundedSovereignShare = Object.hasOwn(policy, 'fundedSovereignShare')
      ? policy.fundedSovereignShare : DEFAULT_FUNDED_SOVEREIGN_SHARE;
    if (!Number.isFinite(fundedSovereignShare) || fundedSovereignShare < 0 || fundedSovereignShare > 1) {
      throw new RangeError('Invalid funded sovereign exposure: expected 0…1');
    }
    const creditorDiscountRate = Object.hasOwn(policy, 'creditorDiscountRate')
      ? policy.creditorDiscountRate : DEFAULT_CREDITOR_DISCOUNT_RATE;
    if (!Number.isFinite(creditorDiscountRate) || creditorDiscountRate < 0 || creditorDiscountRate > .30) {
      throw new RangeError('Invalid nominal creditor discount rate: expected 0…0.30');
    }
    previousYear = policy.year;
    return { ...Object.fromEntries(RESTRUCTURING_KEYS.map(key => [key, policy[key]])), fundedSovereignShare, creditorDiscountRate };
  });
}

/** Dated levels replace the previous rescue; they never stack with it.
 * Rates are fractions; the IRPF threshold is annual real 2026 euros. */
export function validateFiscalRescues(input) {
  if (!Array.isArray(input) || input.length > 44) throw new TypeError('A fiscal rescue calendar with at most 44 entries is required');
  let previousYear = 2026;
  return input.map(policy => {
    if (!policy || ![Object.prototype, null].includes(Object.getPrototypeOf(policy)) ||
        Reflect.ownKeys(policy).length !== RESCUE_KEYS.length ||
        Reflect.ownKeys(policy).some(key => !RESCUE_KEYS.includes(key) ||
          !Object.hasOwn(Object.getOwnPropertyDescriptor(policy, key), 'value'))) {
      throw new TypeError('A fiscal rescue must contain exactly the supported policy values');
    }
    if (!Number.isInteger(policy.year) || policy.year <= previousYear || policy.year > 2070) {
      throw new RangeError('Fiscal rescue years must be unique, increasing and within 2027…2070');
    }
    for (const key of ['vatGeneralRate', 'vatReducedRate', 'vatSuperReducedRate']) {
      if (!Number.isFinite(policy[key]) || policy[key] < 0 || policy[key] > 1) throw new RangeError(`Invalid ${key}: expected 0…1`);
    }
    if (!Number.isFinite(policy.irpfExtraPoints) || policy.irpfExtraPoints < 0 || policy.irpfExtraPoints > .30 ||
        !Number.isFinite(policy.irpfThreshold) || policy.irpfThreshold < 0 || policy.irpfThreshold > 1e6) {
      throw new RangeError('Invalid rescue IRPF points or real 2026 threshold');
    }
    previousYear = policy.year;
    return Object.fromEntries(RESCUE_KEYS.map(key => [key, policy[key]]));
  });
}

export function fiscalRescueForYear(calendar, year) {
  return calendar.findLast(policy => policy.year <= year) ?? null;
}

function split(input, label) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const previous = Object.create(null), measures = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string') throw new TypeError(`Unknown ${label} field: ${String(key)}`);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${label}.${key} cannot be an accessor`);
    (KEYS.includes(key) || key === 'fiscalRescues' || key === 'debtRestructurings' || key === 'paymentAdjustments' ? measures : previous)[key] = descriptor.value;
  }
  return { previous, measures };
}

export function validateFiscalMeasures(input) {
  for (const key of KEYS) {
    if (!Number.isFinite(input[key]) || input[key] < 0 || input[key] > 1) {
      throw new RangeError(`Invalid ${key}: expected 0…1 relative revenue surcharge`);
    }
  }
  return Object.fromEntries(KEYS.map(key => [key, input[key]]));
}

export function resolveConfig(input = {}, defaults) {
  const patch = split(input, 'config'), initial = split(defaults, 'defaults');
  const initialMeasures = validateFiscalMeasures({ ...DEFAULT_FISCAL_MEASURES, ...initial.measures });
  const measures = validateFiscalMeasures({ ...initialMeasures, ...patch.measures });
  const calendar = Object.hasOwn(patch.measures, 'fiscalRescues') ? patch.measures.fiscalRescues
    : Object.hasOwn(initial.measures, 'fiscalRescues') ? initial.measures.fiscalRescues : DEFAULT_FISCAL_RESCUES;
  const restructurings = Object.hasOwn(patch.measures, 'debtRestructurings') ? patch.measures.debtRestructurings
    : Object.hasOwn(initial.measures, 'debtRestructurings') ? initial.measures.debtRestructurings : DEFAULT_DEBT_RESTRUCTURINGS;
  const payments = Object.hasOwn(patch.measures, 'paymentAdjustments') ? patch.measures.paymentAdjustments
    : Object.hasOwn(initial.measures, 'paymentAdjustments') ? initial.measures.paymentAdjustments : DEFAULT_PAYMENT_ADJUSTMENTS;
  return { ...resolvePreviousConfig(patch.previous, initial.previous), ...measures,
    fiscalRescues: validateFiscalRescues(calendar), debtRestructurings: validateDebtRestructurings(restructurings),
    paymentAdjustments: validatePaymentAdjustments(payments) };
}
