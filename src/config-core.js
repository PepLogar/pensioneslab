/** Pure configuration checks; defaults belong to the explicit data context. */
// taxRevenueGDP starts at the console box's 5 %: at 0 the revenue left after the excluded items turns negative,
// and the pension transfer with it (audit 1.85, 3).
const RANGES = {
  contributionRate: [0, 0.5], taxRevenueGDP: [0.05, 0.6], pensionBudgetShare: [0, 1],
  retirementAge: [50, 100, true], replacementRate: [0.2, 1],
  realWageGrowth: [-0.02, 0.04], entrantGrowth: [-0.02, 0.02],
  longevityGain: [0, 0.80], realReturn: [-0.05, 0.08], feeRate: [0, 0.02],
  realInterestRate: [-0.02, 0.06], inflationRate: [0, 0.1],
  marketShock: [-0.5, 0], initialDebtGDP: [0, 2]
};
const SYSTEMS = ['payg', 'ndc', 'funded', 'mixed'];
const PILLARS = ['payg', 'ndc', 'funded'];

function checkedObject(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const copy = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) {
      throw new TypeError(`Unknown ${label} field: ${String(key)}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${label}.${key} cannot be an accessor`);
    copy[key] = descriptor.value;
  }
  return copy;
}

/** Merge a partial configuration without coercion, accessors or unknown keys. */
export function resolveConfig(input, defaults) {
  const patch = checkedObject(input, Object.keys(defaults), 'config');
  const mixPatch = Object.hasOwn(patch, 'mix') ? checkedObject(patch.mix, PILLARS, 'mix') : {};
  const config = { ...defaults, ...patch, mix: { ...defaults.mix, ...mixPatch } };
  if (!SYSTEMS.includes(config.system)) throw new RangeError('Invalid system');
  for (const [key, [min, max, integer]] of Object.entries(RANGES)) {
    const value = config[key];
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      throw new RangeError(`Invalid ${key}: expected ${min}…${max}${integer ? ' (integer)' : ''}`);
    }
  }
  for (const key of PILLARS) {
    if (!Number.isFinite(config.mix[key]) || config.mix[key] < 0 || config.mix[key] > 1) {
      throw new RangeError(`Invalid mix.${key}`);
    }
  }
  if (Math.abs(PILLARS.reduce((sum, key) => sum + config.mix[key], 0) - 1) > 1e-9) {
    throw new RangeError('Mixed-system weights must sum to 1');
  }
  return config;
}

export function weightsFor(config) {
  return config.system === 'mixed' ? { ...config.mix } : {
    payg: config.system === 'payg' ? 1 : 0,
    ndc: config.system === 'ndc' ? 1 : 0,
    funded: config.system === 'funded' ? 1 : 0
  };
}

