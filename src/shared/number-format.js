// One way to write numbers in the app (1.49, docs/DECISIONES-FORMATO-NUMEROS.md):
// - decimal comma and points for thousands from five digits (7036, 12.282), as the
//   browser writes es-ES and the RAE asks;
// - a non-breaking space between the number and its unit (16 %, 7036 €), so the unit
//   never ends up alone on the next line;
// - the real minus sign (−), never the hyphen;
// - «M€» in figures, «millones de euros» in sentences and «billones» from 10^12;
// - «puntos» in sentences and «p. p.» in tables for percentage points.
// Non-finite values are written as «—». Pure functions.

export const NBSP = '\u00a0';
export const MINUS = '\u2212';

const formatters = new Map();
function formatter(digits, fixed) {
  const key = `${digits}:${fixed}`;
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.NumberFormat('es-ES', { minimumFractionDigits: fixed ? digits : 0, maximumFractionDigits: digits }));
  }
  return formatters.get(key);
}

/**
 * A number in Spanish: «1.690.012», «22,2», «−9,8».
 * @param {number} value
 * @param {number} [digits] most decimals shown
 * @param {{ fixed?: boolean, sign?: boolean }} [options] fixed keeps trailing zeros;
 *   sign writes «+» before positive values
 */
export function num(value, digits = 0, { fixed = false, sign = false } = {}) {
  if (!Number.isFinite(value)) return '—';
  const text = formatter(digits, fixed).format(Math.abs(value));
  // A value that rounds to zero carries no sign: «0», not «−0» or «+0».
  if (/^[0,]+$/.test(text)) return text;
  return `${value < 0 ? MINUS : sign ? '+' : ''}${text}`;
}

/** A value already in percent: percent(22.2) → «22,2 %». */
export function percent(value, digits = 1, options = {}) {
  return Number.isFinite(value) ? `${num(value, digits, options)}${NBSP}%` : '—';
}

/** A share (0.222) written in percent: «22,2 %». */
export function share(value, digits = 1, options = {}) {
  return percent(value * 100, digits, options);
}

/** The floor an average pension is judged against, in points of the average wage (ILO Convention 102; `pensionAdequacyFloor`). */
export const PENSION_FLOOR_POINTS = 40;

/**
 * A figure judged against a floor, written so that rounding never lifts it onto the floor. A pension of
 * 39,97 % of the wage read «40 %» beside «la pensión deja de ser suficiente»: it takes the decimals it
 * needs to stay under, «39,97» (docs/COMPARACION-REPARTO-FONDO-COMUN-2026-11-14.md). At the floor or over
 * it, and for any other figure, it is num().
 * @param {number} value  in the unit of the floor (points of the wage)
 * @param {number} [digits]  the decimals it has when it is clear of the floor
 * @param {number | number[]} [floor]  one floor, or the ones a view judges it against (the floor of the
 *   scenario and the reader's own minimum): the lowest one it is under is the first that rounding reaches
 */
export function numUnderFloor(value, digits = 1, floor = PENSION_FLOOR_POINTS, options = {}) {
  const under = Number.isFinite(value) ? [floor].flat().filter(f => Number.isFinite(f) && value < f) : [];
  if (!under.length) return num(value, digits, options);
  const nearest = Math.min(...under);
  for (let d = digits; d <= 3; d++) if (shown(value, d) < nearest) return num(value, d, options);
  // So close that three decimals still read as the floor: cut, not rounded.
  return num(Math.floor(value * 1000) / 1000, 3, options);
}

// The value as num() will write it with these decimals. Not toFixed(): it gives «39.99» for 39,995, which
// num() writes «40» (docs/COMPARACION-REPARTO-FONDO-COMUN-2026-11-14.md, «Revisión posterior»).
const plain = new Map();
function shown(value, digits) {
  if (!plain.has(digits)) plain.set(digits, new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, useGrouping: false }));
  return Number(plain.get(digits).format(value));
}

/** A floor kept as a share (`pensionAdequacyFloor`: 0.45) in points of the wage (45); without one, the default. */
export const floorPoints = share => (Number.isFinite(share) ? Math.round(share * 1e4) / 100 : PENSION_FLOOR_POINTS);

/** numUnderFloor() with its sign: «39,97 %». */
export function percentUnderFloor(value, digits = 1, floor = PENSION_FLOOR_POINTS, options = {}) {
  return Number.isFinite(value) ? `${numUnderFloor(value, digits, floor, options)}${NBSP}%` : '—';
}

/**
 * Percentage points: «0,8 puntos» in sentences, «0,8 p. p.» with short (tables).
 * @param {number} value already in points
 */
export function points(value, digits = 1, { short = false, ...options } = {}) {
  if (!Number.isFinite(value)) return '—';
  const text = num(value, digits, options);
  if (short) return `${text}${NBSP}p.${NBSP}p.`;
  return `${text}${NBSP}${Math.abs(value) === 1 ? 'punto' : 'puntos'}`;
}

/** Euros: «1502 €», «27.200 €». */
export function euros(value, digits = 0, options = {}) {
  return Number.isFinite(value) ? `${num(value, digits, options)}${NBSP}€` : '—';
}

/**
 * An amount in euros written for figures and tables: «7036 M€», «166.693 M€»; from a
 * billion (10^12) on, «5,3 billones €». Never «mil M€».
 */
export function millions(value, digits = 0, options = {}) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1e12) return `${num(value / 1e12, 1, options)}${NBSP}billones${NBSP}€`;
  return `${num(value / 1e6, digits, options)}${NBSP}M€`;
}

/** millions() in two parts, for views that style the unit apart: { number: '166.693', unit: 'M€' }. */
export function moneyParts(value, digits = 0, options = {}) {
  if (!Number.isFinite(value)) return { number: '—', unit: '' };
  if (Math.abs(value) >= 1e12) return { number: num(value / 1e12, 1, options), unit: `billones${NBSP}€` };
  return { number: num(value / 1e6, digits, options), unit: 'M€' };
}

/** The same amount in a sentence: «3400 millones de euros», «5,3 billones de euros». */
export function moneyWords(value, digits = 0, options = {}) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1e12) return `${num(value / 1e12, 1, options)}${NBSP}billones de euros`;
  return `${num(value / 1e6, digits, options)}${NBSP}millones de euros`;
}
