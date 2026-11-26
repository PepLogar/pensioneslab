// Experiment (1.52): notional accounts also for the years worked before 2027.
// Sweden (1999), Poland (1999) and Latvia (1996) turned the past careers of
// people still working into an initial notional capital; Italy (1995, 2012) did
// not (docs/EXPERIMENTO-NOCIONALES-PASADO-1.52.md has the country mappings).
// The engine otherwise keeps every right earned before 2027 under today's rules
// (src/current-cohorts-v10.js). Off by default, and then left out of the cache
// key (src/shared/sim-key.js), so stored results and fingerprints do not change.
// Only acts with the pure notional system. Pure functions.

export const NDC_PAST_RIGHTS_DEFAULTS = Object.freeze({
  // 1 = the pre-2027 rights of people working in 2026 become notional capital in 2027.
  ndcPastRights: 0,
  // Value of that capital: 0 = what was contributed for retirement in those years,
  // at the 2026 rate (Sweden and Latvia); 1 = what buys, at the expected retirement
  // and in 2027 terms, the pension already earned (about Poland). In between, a mix.
  // Afterwards the capital follows the notional index like any balance.
  ndcPastRightsValue: 0,
  // Age in 2027 up to which the whole past career is converted, and from which
  // nothing is; linear in between. Sweden: born 1954 or later fully, born 1938 a
  // fifth, born 1937 or earlier nothing, i.e. (65 − age)/20 at ages 46 to 61 in
  // 1999, with a step to 0 at 62 that the line from 45 to 65 leaves out.
  ndcPastRightsAgeFull: 45,
  ndcPastRightsAgeNone: 65
});

export const NDC_PAST_RIGHTS_RANGES = Object.freeze({
  ndcPastRights: [0, 1, true],
  ndcPastRightsValue: [0, 1],
  ndcPastRightsAgeFull: [18, 75, true],
  ndcPastRightsAgeNone: [18, 75, true]
});

export const NDC_PAST_RIGHTS_KEYS = Object.freeze(Object.keys(NDC_PAST_RIGHTS_DEFAULTS));

/** True when the conversion acts: switched on and with the pure notional system. */
export const pastRightsActive = config => Boolean(config?.ndcPastRights) && config.system === 'ndc';

/** The config without the experiment's keys while it does not act, so cache keys,
 *  fingerprints and stored results keep their exact shape. */
export function omitInactivePastRights(config) {
  if (pastRightsActive(config)) return config;
  const out = { ...config };
  for (const key of NDC_PAST_RIGHTS_KEYS) delete out[key];
  return out;
}

/** Share of the past career converted at a given age in 2027 (0…1). With the
 *  second age below the first, the first one is a sharp threshold. */
export function pastRightsShare(age, config) {
  const full = config.ndcPastRightsAgeFull ?? NDC_PAST_RIGHTS_DEFAULTS.ndcPastRightsAgeFull;
  const none = config.ndcPastRightsAgeNone ?? NDC_PAST_RIGHTS_DEFAULTS.ndcPastRightsAgeNone;
  if (age <= full) return 1;
  if (age >= none) return 0;
  return (none - age) / (none - full);
}

/**
 * Initial notional capital for one person.
 * @param {number} legacyAnnual  the pension already earned (real euros a year)
 * @param {number} retirementRate  payroll share contributed for retirement
 * @param {number} careerYears  full career of the legacy proxy (43)
 * @param {number} accruedRate  replacement rate of that full career (0.77)
 * @param {number} divisor  notional annuity divisor at the expected retirement
 * @param {number} value  0 = contributions, 1 = the pension already earned
 */
export function pastRightsCapital({ legacyAnnual, retirementRate, careerYears, accruedRate, divisor, value }) {
  // The legacy proxy is a flat real career: legacyAnnual = wage × accruedRate × years / careerYears.
  const contributed = legacyAnnual * retirementRate * careerYears / accruedRate;
  const accrued = legacyAnnual * divisor;
  return contributed + value * (accrued - contributed);
}
