// Share a scenario with a link: only the settings that differ from the origin
// scenario travel, as base64url JSON in the hash (`#escenario=…`), so the link
// stays short and never leaves the browser in a request. Opening it never
// replaces the reader's own scenario until they accept it (src/shared/site-nav.js).
// Pure functions; validation is the caller's (validateConfig). Since the review of
// 31/10/2026 a link also names its state version and its base, so an older link is
// read with the same migrations as a saved state and a foreign one is refused.
import { CALIBRATION_ID, STATE_VERSION } from './default-config.js';
import { OLDER_STATE_VERSIONS, configForStateVersion } from '../risk-state-migration.js';

export const SHARE_PARAM = 'escenario';
// The longest code a link may carry (encode and decode agree: docs/REVISION-ADVERSARIAL-2026-11-24.md, 15).
export const MAX_LINK_CHARS = 6000;

const toBase64Url = text => btoa(String.fromCharCode(...new TextEncoder().encode(text)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = code => new TextDecoder().decode(Uint8Array.from(
  atob(code.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0)));

/** Settings of `config` that differ from `defaults` (deep comparison through JSON). */
export function scenarioDiff(config, defaults) {
  return Object.fromEntries(Object.entries(config)
    .filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(defaults[key])));
}

/** `#escenario=…` for this config; null when it is the origin scenario. Check it with linkTooLong before offering it. */
export function encodeScenarioHash(config, defaults) {
  const diff = scenarioDiff(config, defaults);
  if (!Object.keys(diff).length) return null;
  // Since 1.46 every link says whether the closing clause is on: a link without it is older and keeps it off.
  diff.closingClause = config.closingClause ?? 'off';
  diff._version = STATE_VERSION;
  diff._calibration = CALIBRATION_ID;
  return `#${SHARE_PARAM}=${toBase64Url(JSON.stringify(diff))}`;
}

/** True when the link of this hash would not open: its code is over MAX_LINK_CHARS (save the scenario in JSON instead). */
export function linkTooLong(hash) {
  const code = new RegExp(`[#&]${SHARE_PARAM}=([A-Za-z0-9_-]+)`).exec(hash ?? '')?.[1] ?? '';
  return code.length > MAX_LINK_CHARS;
}

/**
 * The shared settings in a hash, or null. Never throws on a broken link. A link of
 * another base, or of a version this one cannot read, gives `{ rejected }`: a sentence
 * for the reader instead of a scenario.
 * @returns {null | { rejected: string } | { diff: object, config: object }} `config` = defaults + diff, validated
 */
export function decodeScenarioHash(hash, defaults, validate) {
  const match = new RegExp(`[#&]${SHARE_PARAM}=([A-Za-z0-9_-]+)`).exec(hash ?? '');
  if (!match) return null;
  if (match[1].length > MAX_LINK_CHARS) return { rejected: 'Este enlace es demasiado largo para abrirse: pide el escenario en un archivo JSON.' };
  try {
    const diff = JSON.parse(fromBase64Url(match[1]));
    if (!diff || typeof diff !== 'object' || Array.isArray(diff)) return null;
    const { _version: version, _calibration: calibration } = diff;
    delete diff._version;
    delete diff._calibration;
    if (calibration !== undefined && calibration !== CALIBRATION_ID) {
      return { rejected: `Este enlace es de otra base de datos (${String(calibration).slice(0, 60)}) y esta versión usa ${CALIBRATION_ID}: no se abre para no mezclar sus supuestos con los de hoy.` };
    }
    if (version !== undefined && version !== STATE_VERSION && !OLDER_STATE_VERSIONS.includes(version)) {
      return { rejected: `Este enlace es de una versión del simulador que esta no sabe leer (estado ${String(version).slice(0, 12)}): no se abre para no cambiar lo que significa.` };
    }
    const unknown = Object.keys(diff).filter(key => !Object.hasOwn(defaults, key));
    if (unknown.length) return { rejected: `Este enlace trae ajustes que esta versión no conoce (${unknown.slice(0, 3).join(', ').slice(0, 120)}): ábrelo con una versión más reciente del simulador.` };
    const settings = Object.hasOwn(diff, 'closingClause') ? diff : { ...diff, closingClause: 'off' };
    // A link made before versions keeps the meaning it had (the clause above); an older
    // version goes through the saved-state migrations.
    const merged = version === undefined ? { ...defaults, ...settings } : configForStateVersion({ ...defaults, ...settings }, version);
    // `diff`: what really differs from the origin (a link always names the clause, even when it is the default).
    return { diff: scenarioDiff(settings, defaults), config: validate(merged) };
  } catch {
    return null;
  }
}
