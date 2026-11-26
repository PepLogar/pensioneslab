/** Maturity mix of new debt and refinancing since 1.51: the observed mix of the
 * Treasury's medium- and long-term issuance in 2025–2026
 * (data/debt-issuance-ladder-2026.js), stretched or shrunk to the chosen average
 * term. It replaces the 7- and 8-year bullets, whose single term echoed the 2027
 * maturity wave every eight years (docs/PROPUESTA-REGLA-SE-ROMPE.md). Only the
 * mix of terms changes: the pricing anchor stays at 7.85 years
 * (src/treasury-term-pricing.js) and older engines keep src/debt-term.js. */
import { DEBT_ISSUANCE_LADDER_2026 as LADDER } from '../data/debt-issuance-ladder-2026.js';

export const ISSUANCE_LADDER_ID = LADDER.id;
const MIN_TERM = 1, MAX_TERM = 50;

const total = LADDER.amountsByTerm.reduce((sum, row) => sum + row.nominalMillions, 0);
const observed = LADDER.amountsByTerm.map(row => ({ years: row.years, weight: row.nominalMillions / total }));
observed.at(-1).weight += 1 - observed.reduce((sum, row) => sum + row.weight, 0);
/** The observed ladder: integer terms and weights that sum to one. */
export const OBSERVED_ISSUANCE_LADDER = Object.freeze(observed.map(Object.freeze));
export const OBSERVED_ISSUANCE_MEAN_YEARS = observed.reduce((sum, row) => sum + row.years * row.weight, 0);
/** The default average term (9.88 years) issues the observed ladder as it is. */
export const DEFAULT_ISSUANCE_TERM_YEARS = Number(OBSERVED_ISSUANCE_MEAN_YEARS.toFixed(2));

const clampTerm = years => Math.min(MAX_TERM, Math.max(MIN_TERM, years));
const stretchedMean = scale => OBSERVED_ISSUANCE_LADDER.reduce((sum, row) => sum + row.weight * clampTerm(row.years * scale), 0);

/** Every rung multiplied by `scale`, kept within 1–50 years and split between the
 * two adjacent annual bullets, which preserves the stretched average exactly. */
function stretchedLadder(scale) {
  const byYears = new Map();
  const add = (years, weight) => byYears.set(years, (byYears.get(years) ?? 0) + weight);
  for (const row of OBSERVED_ISSUANCE_LADDER) {
    const term = clampTerm(row.years * scale), lower = Math.floor(term), upper = Math.ceil(term);
    add(lower, row.weight * (1 - (term - lower)));
    if (upper !== lower) add(upper, row.weight * (term - lower));
  }
  const rows = [...byYears.entries()].filter(([, weight]) => weight > 1e-12)
    .sort((a, b) => a[0] - b[0]).map(([years, weight]) => ({ years, weight }));
  const largest = rows.reduce((max, row) => row.weight > max.weight ? row : max, rows[0]);
  largest.weight += 1 - rows.reduce((sum, row) => sum + row.weight, 0);
  return Object.freeze(rows.map(Object.freeze));
}

const cache = new Map();
/** Annual bullet maturities of new issuance for an average term of 1–50 years. */
export function issuanceMaturityWeights(termYears = DEFAULT_ISSUANCE_TERM_YEARS) {
  if (typeof termYears !== 'number' || !Number.isFinite(termYears) || termYears < MIN_TERM || termYears > MAX_TERM) {
    throw new RangeError('newDebtTermYears must be between 1 and 50');
  }
  if (termYears === DEFAULT_ISSUANCE_TERM_YEARS) return OBSERVED_ISSUANCE_LADDER;
  if (!cache.has(termYears)) {
    // The stretched average rises continuously with the scale: bisection.
    let low = 0, high = MAX_TERM / OBSERVED_ISSUANCE_LADDER[0].years;
    for (let step = 0; step < 200 && high - low > 1e-15; step++) {
      const mid = (low + high) / 2;
      if (stretchedMean(mid) < termYears) low = mid; else high = mid;
    }
    cache.set(termYears, stretchedLadder(high));
  }
  return cache.get(termYears);
}
