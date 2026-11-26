/** V2-only policy choices. Shared/v1 validation remains unchanged. */
import { resolveConfig as resolveBaseConfig } from './config-core.js';
export { weightsFor } from './config-core.js';

export const DEFAULT_REVALUATION_CONFIG = Object.freeze({
  pensionRevaluationMode: 'cpi', pensionRevaluationRate: 0
});
const POLICY_KEYS = Object.keys(DEFAULT_REVALUATION_CONFIG);

export function validateRevaluationChoice(mode, rate) {
  // 'cpi': the prior year's CPI (the law). 'cpi-points': that CPI plus pensionRevaluationRate (points a
  // year, + or −), so it keeps its gap to prices whatever the inflation (since 24/11/2026). 'manual': a
  // fixed nominal rate, kept so that older scenarios give the same results.
  if (mode !== 'cpi' && mode !== 'manual' && mode !== 'cpi-points') throw new RangeError('Invalid pensionRevaluationMode');
  if (!Number.isFinite(rate) || rate < -.10 || rate > .10) {
    throw new RangeError('Invalid pensionRevaluationRate: expected -0.10…0.10 per year (nominal, or points over the CPI)');
  }
  return { pensionRevaluationMode: mode, pensionRevaluationRate: rate };
}

function split(input, label) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const base = Object.create(null), choice = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string') throw new TypeError(`Unknown ${label} field: ${String(key)}`);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${label}.${key} cannot be an accessor`);
    (POLICY_KEYS.includes(key) ? choice : base)[key] = descriptor.value;
  }
  return { base, choice };
}

/** Old v2 payloads omit the two choices and retain CPI by default. Unknown
 * fields, invalid base config and unsafe object shapes still fail in the same
 * base validator. Never pass the extensions into a v1/shared configuration.
 */
export function resolveConfig(input = {}, defaults) {
  const patch = split(input, 'config'), initial = split(defaults, 'defaults');
  const initialChoice = { ...DEFAULT_REVALUATION_CONFIG, ...initial.choice };
  validateRevaluationChoice(initialChoice.pensionRevaluationMode, initialChoice.pensionRevaluationRate);
  const choice = { ...initialChoice, ...patch.choice };
  const checkedChoice = validateRevaluationChoice(choice.pensionRevaluationMode, choice.pensionRevaluationRate);
  return { ...resolveBaseConfig(patch.base, initial.base), ...checkedChoice };
}
