// Results kept between visits for the pages that run the engine many times («Sensibilidad», 41 runs, and
// «Riesgo», about 200): only the summary each page shows, a few kilobytes, in this browser's IndexedDB
// (docs/DECISIONES.md, 24/11/2026). A summary is reused only when the page, the app and methodology versions,
// the calibration, the canonical scenario (src/shared/sim-key.js) and the page's own parameters are the same,
// so a new methodology or a changed scenario never reuses an old result. Since 1.74 the key also carries the engine's
// fingerprint (scripts/engine-fingerprint.mjs, set by vite.config.js): a change of src/ or data/ without a new version
// misses too. Outside Vite (node, tests) the fingerprint is 'node'. It is a cache, not the saved state:
// losing it only means computing again. Without IndexedDB (private windows, tests) every read misses.
import { simulationKey } from './sim-key.js';
import { SIMULATION_METHODOLOGY } from '../simulation-methodology.js';
import { APP_VERSION } from './app-version.js';
import { CALIBRATION_ID } from './storage-ids.js';

// Bump when a page changes what it stores or how it summarises the runs.
export const RESULT_CACHE_VERSION = 1;
// eslint-disable-next-line no-undef
export const ENGINE_FINGERPRINT = typeof __ENGINE_FINGERPRINT__ === 'string' ? __ENGINE_FINGERPRINT__ : 'node';
const DB_NAME = 'pensioneslabs3-results', STORE = 'summaries', MAX_ENTRIES = 40;

/** The key of a page's summary: everything the summary depends on, as one string. */
export function resultCacheKey(page, config, params = {}) {
  return JSON.stringify({ cache: RESULT_CACHE_VERSION, page, app: APP_VERSION, methodology: SIMULATION_METHODOLOGY, engine: ENGINE_FINGERPRINT,
    calibration: CALIBRATION_ID, scenario: simulationKey(config), params });
}

let opening = null;
function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  opening ??= new Promise(resolve => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return opening;
}
const done = request => new Promise(resolve => { request.onsuccess = () => resolve(request.result); request.onerror = () => resolve(null); });

/** The stored summary for `key`, `{ value, savedAt }`, or null. Never throws. */
export async function readResult(key) {
  try {
    const db = await openDb();
    if (!db) return null;
    const entry = await done(db.transaction(STORE).objectStore(STORE).get(key));
    return entry?.key === key ? { value: entry.value, savedAt: entry.savedAt } : null;
  } catch { return null; }
}

/** Stores a summary (structured clone: NaN and null survive). Keeps the latest MAX_ENTRIES. Never throws. */
export async function saveResult(key, value) {
  try {
    const db = await openDb();
    if (!db) return false;
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    await done(store.put({ key, value, savedAt: new Date().toISOString() }));
    const all = await done(db.transaction(STORE).objectStore(STORE).getAll());
    if (Array.isArray(all) && all.length > MAX_ENTRIES) {
      const old = all.sort((a, b) => a.savedAt.localeCompare(b.savedAt)).slice(0, all.length - MAX_ENTRIES);
      const trim = db.transaction(STORE, 'readwrite').objectStore(STORE);
      for (const entry of old) trim.delete(entry.key);
    }
    return true;
  } catch { return false; }
}

/** «guardado el 24/11/2026 a las 18:05», for the status line. */
export function savedWhen(savedAt) {
  const d = new Date(savedAt);
  if (Number.isNaN(d.getTime())) return 'guardado antes';
  const two = n => String(n).padStart(2, '0');
  return `guardado el ${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} a las ${two(d.getHours())}:${two(d.getMinutes())}`;
}
