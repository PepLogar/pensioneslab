// Shared scenario state for every page. All pages read and write the same
// localStorage key as the expert laboratory, so a change made in one page is
// visible in the others (also across open tabs, through the `storage` event).
// Uses lightweight default-config validation without loading demographic tables
// or legacy v1..v9 simulation models on the main thread.
import {
  DEFAULT_CONFIG,
  validateConfig,
  BASE_YEAR,
  END_YEAR,
  CALIBRATION_ID,
  STATE_VERSION,
  STORAGE_SUFFIX
} from './default-config.js';
import { DEFAULT_LIMITS, validateLimits } from '../sustainability.js';
import { OLDER_STATE_VERSIONS, configForStateVersion } from '../risk-state-migration.js';
import { describeScenarioStatus } from './scenario-labels.js';

export const STORAGE_KEY = `pensiones-lab:${CALIBRATION_ID}${STORAGE_SUFFIX}`;
import { CUSTOM_PRESETS_KEY, LIBRARY_LIMIT, readLibrary, writeLibrary, libraryEntry, libraryNotice, libraryFile, mergeLibraryFile } from './scenario-library.js';
export { CUSTOM_PRESETS_KEY };
const clone = value => JSON.parse(JSON.stringify(value));
const listeners = new Set();

function createDefaultState() {
  return {
    version: STATE_VERSION,
    calibration: CALIBRATION_ID,
    config: clone(DEFAULT_CONFIG),
    limits: clone(DEFAULT_LIMITS),
    expert: false, // kept in the stored state for compatibility with pensiones_lab_2; the console does not use it
    selectedYear: Math.min(END_YEAR, 2050), // the console opens on 2050
    saved: []
  };
}

// The longest state load() reads and save() writes (docs/REVISION-ADVERSARIAL-2026-11-24.md, 17): room for the
// scenario and three comparisons with every calendar full (about 70 000 characters).
export const MAX_STATE_CHARS = 200000;

export function parseStoredState(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_STATE_CHARS) throw new Error('Escenario demasiado grande');
  const input = JSON.parse(raw);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Escenario no válido');
  if (![...OLDER_STATE_VERSIONS, STATE_VERSION].includes(input.version) || input.calibration !== CALIBRATION_ID) {
    throw new Error('Versión o calibración distinta');
  }
  const configForVersion = config => configForStateVersion(config, input.version);
  const selectedYear = Number.isInteger(input.selectedYear) && input.selectedYear >= BASE_YEAR && input.selectedYear <= END_YEAR
    ? input.selectedYear
    : BASE_YEAR;
  const saved = Array.isArray(input.saved)
    ? input.saved.slice(0, 3).map(entry => ({
        id: String(entry.id),
        name: String(entry.name),
        config: clone(validateConfig(configForVersion(entry.config))),
        limits: clone(validateLimits(entry.limits))
      }))
    : [];
  const next = {
    version: STATE_VERSION,
    calibration: CALIBRATION_ID,
    config: clone(validateConfig(configForVersion(input.config))),
    limits: clone(validateLimits(input.limits)),
    expert: Boolean(input.expert),
    selectedYear,
    saved
  };
  if (input.migration && typeof input.migration === 'object') next.migration = clone(input.migration);
  return next;
}

let lastStoredRaw = null;
let invalidStoredState = false;
let saveFailed = false;
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    lastStoredRaw = raw;
    invalidStoredState = raw !== null;
    const loaded = raw === null ? createDefaultState() : parseStoredState(raw);
    invalidStoredState = false;
    return loaded;
  } catch { /* An invalid or old payload keeps the reference; never overwrite it here. */ }
  return createDefaultState();
}

function save() {
  if (invalidStoredState) return;
  try {
    const raw = JSON.stringify(state);
    // What load() would refuse is not written: the header bar says the change lasts only while the page is open.
    if (raw.length > MAX_STATE_CHARS) { saveFailed = true; return; }
    localStorage.setItem(STORAGE_KEY, raw);
    lastStoredRaw = raw;
    saveFailed = false;
  }
  catch { saveFailed = true; /* The page still works without storage; the header bar says so. */ }
}

/** True when the last change could not be written: it lasts only while the page is open. */
export function stateSaveFailed() { return saveFailed; }

// A storage event may still be queued when a user acts in this tab. Merge a
// patch into the latest saved state, retaining other tabs' limits/comparisons.
function currentStateForEdit() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === lastStoredRaw) return state;
    lastStoredRaw = raw;
    invalidStoredState = raw !== null;
    const loaded = raw === null ? createDefaultState() : parseStoredState(raw);
    invalidStoredState = false;
    return loaded;
  } catch { /* Keep the current in-memory state if storage is unavailable. */ }
  return state;
}

function emit() { for (const listener of listeners) listener(state); }

export function getState() { return state; }

/** The scenario as stored now: the Laboratorio writes it from the same tab, which sends no storage event. */
export function readCurrentState() { return currentStateForEdit(); }

/** Applies a partial config patch (validated) and/or a new year. */
export function updateScenario({ config = null, selectedYear = null, limits = null } = {}) {
  const next = { ...currentStateForEdit() };
  if (config) next.config = validateConfig({ ...next.config, ...config });
  // Your limits (the console's «Límites» tab): checked as the saved scenarios are.
  if (limits) next.limits = validateLimits({ ...next.limits, ...limits });
  if (Number.isInteger(selectedYear) && selectedYear >= BASE_YEAR && selectedYear <= END_YEAR) {
    next.selectedYear = selectedYear;
  }
  state = next;
  save();
  emit();
}

/** Replaces the whole config (reset, import, link, undo); limits and year only when given. */
export function replaceConfig(config, { selectedYear = null, limits = null } = {}) {
  state = {
    ...currentStateForEdit(),
    config: validateConfig(config),
    ...(limits ? { limits: validateLimits(limits) } : {}),
    ...(Number.isInteger(selectedYear) && selectedYear >= BASE_YEAR && selectedYear <= END_YEAR ? { selectedYear } : {})
  };
  save();
  emit();
}

/** Restores the exact Spain 2026 origin configuration and base year across the app. */
export function resetToOrigin() {
  replaceConfig(DEFAULT_CONFIG, { selectedYear: BASE_YEAR });
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('scenario-reset-origin'));
  }
}

/** Reads «Mis escenarios», the one library of saved scenarios (src/shared/scenario-library.js). */
export function getSavedCustomScenarios() {
  try { return readLibrary(localStorage); } catch { return []; }
}

/** What the reader should know about saved entries this version cannot read, or null. */
export function savedLibraryNotice() {
  try { return libraryNotice(localStorage); } catch { return null; }
}

// Throws when the list could not be written (src/shared/scenario-library.js says why):
// the reader is told, never shown «Guardado».
function writeSavedCustomScenarios(list) {
  writeLibrary(list, localStorage);
}

// The Laboratorio comparison table shows the entries marked «comparar» (at most 3);
// without marks, the 3 most recent, as before 1.42.
function savedForComparison(list) {
  const marked = list.filter(item => item.compare);
  return (marked.length ? marked : list).slice(0, 3).map((item, idx) => ({
    id: String(idx + 1), name: item.name, config: clone(item.config), limits: clone(item.limits)
  }));
}

/** Saves a scenario in «Mis escenarios» (same name: replaced) and syncs the comparison table. */
export function saveCustomScenario(name = '', customConfig = null, { compare = false } = {}) {
  const targetConfig = validateConfig(customConfig ?? state.config);
  const status = describeScenarioStatus(targetConfig, DEFAULT_CONFIG);
  const cleanName = (typeof name === 'string' ? name.trim() : '') || status.suggestedName || 'Mi ajuste personalizado';
  const finalName = cleanName.slice(0, 60);
  const currentList = getSavedCustomScenarios();
  const existingIdx = currentList.findIndex(item => item.name.toLowerCase() === finalName.toLowerCase());
  if (existingIdx < 0 && currentList.length >= LIBRARY_LIMIT) throw new Error(`Tienes ${LIBRARY_LIMIT} escenarios guardados. Borra uno antes de guardar otro.`);
  const entry = libraryEntry({
    id: existingIdx >= 0 ? currentList[existingIdx].id : String(Date.now()),
    name: finalName,
    createdAt: Date.now(),
    config: targetConfig,
    limits: state.limits,
    selectedYear: state.selectedYear,
    compare: compare || (existingIdx >= 0 && currentList[existingIdx].compare),
    stateVersion: STATE_VERSION
  });
  if (existingIdx >= 0) currentList[existingIdx] = entry;
  else currentList.unshift(entry);
  writeSavedCustomScenarios(currentList);
  state = { ...currentStateForEdit(), saved: savedForComparison(currentList) };
  save();
  emit();
  return entry;
}

/** Loads a previously saved custom scenario by id: config, limits and year, as the Laboratorio's panel does. */
export function loadCustomScenario(id) {
  const list = getSavedCustomScenarios();
  const found = list.find(item => item.id === String(id));
  if (!found) return null;
  state = {
    ...currentStateForEdit(),
    config: validateConfig(found.config),
    limits: validateLimits(found.limits ?? state.limits),
    selectedYear: found.selectedYear
  };
  save();
  emit();
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('scenario-preset-loaded', { detail: found }));
  }
  return found;
}

/** «Mis escenarios» as a file to download (8/11/2026). */
export function exportSavedScenarios(about = null) {
  return libraryFile(getSavedCustomScenarios(), about);
}

/** Adds a file's scenarios to «Mis escenarios»; returns how many were added, repeated or left out. */
export function importSavedScenarios(file) {
  const merged = mergeLibraryFile(getSavedCustomScenarios(), file);
  writeSavedCustomScenarios(merged.list);
  state = { ...currentStateForEdit(), saved: savedForComparison(merged.list) };
  save();
  emit();
  return merged;
}

/** Deletes a saved custom scenario by id from browser localStorage. */
export function deleteCustomScenario(id) {
  const list = getSavedCustomScenarios().filter(item => item.id !== String(id));
  writeSavedCustomScenarios(list);
  state = { ...currentStateForEdit(), saved: savedForComparison(list) };
  save();
  emit();
}

/** Applies a list change made elsewhere (Laboratorio panel) and syncs the comparison table. */
export function replaceSavedCustomScenarios(list) {
  writeSavedCustomScenarios(list);
  state = { ...currentStateForEdit(), saved: savedForComparison(getSavedCustomScenarios()) };
  save();
  emit();
}

/** Finds whether the given config matches one of the user's saved custom scenarios. */
export function findMatchingSavedScenario(config = state.config) {
  if (!config) return null;
  const targetJson = JSON.stringify(validateConfig(config));
  const list = getSavedCustomScenarios();
  return list.find(item => JSON.stringify(item.config) === targetJson) ?? null;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

window.addEventListener('storage', event => {
  if (event.key === CUSTOM_PRESETS_KEY) {
    emit();
    return;
  }
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  state = load();
  emit();
});
