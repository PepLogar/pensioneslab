// One library of saved scenarios: «Mis escenarios» (docs/DISENO-BIBLIOTECA-ESCENARIOS.md).
// The header bar, Experimentos, Soluciones and, since 1.42, the Laboratorio's
// preset panel and its «Guardar para comparar» all read and write this list.
// It keeps the storage key of «Mis escenarios»; the Laboratorio presets
// (`presets-v1`) are copied in once and their old key is left untouched.
// Kept light on purpose: it loads on every page, so it validates with the default
// config only and never imports the full model (src/scenario-presets.js does).
import { validateConfig, BASE_YEAR, END_YEAR, CALIBRATION_ID, STORAGE_SUFFIX, STATE_VERSION } from './default-config.js';
import { DEFAULT_LIMITS, validateLimits } from '../sustainability.js';
import { preserveLegacyRiskConfig, preserveLegacyRelayConfig, keepClosingClauseOff, configForStateVersion } from '../risk-state-migration.js';

export const CUSTOM_PRESETS_KEY = `pensiones-lab:${CALIBRATION_ID}:custom-presets-v1`;
export const LIBRARY_KEY = CUSTOM_PRESETS_KEY;
// Same key as src/scenario-presets.js (checked by tests/round-23.test.mjs).
export const LEGACY_PRESET_KEY = `pensiones-lab:${CALIBRATION_ID}${STORAGE_SUFFIX}:presets-v1`;
export const LIBRARY_LIMIT = 30;
export const PRESETS_MIGRATED_KEY = `${CUSTOM_PRESETS_KEY}:presets-migrated`;
const clone = value => JSON.parse(JSON.stringify(value));

/** The sentence for a file or an entry of a later version, in the words of a shared link of one (src/shared/share-link.js). */
const laterVersion = version => `Es de una versión del simulador posterior a esta (estado ${String(version).slice(0, 12)}; esta lee hasta el ${STATE_VERSION}): no se carga para no cambiar lo que significa.`;

/**
 * A checked entry: config and limits validated, a year inside the horizon. One stamped by a later
 * version is not read: its settings mean what that version meant, and stamping it as this one's
 * would make the later version migrate it again (docs/REVISION-ESTADO-ACTUAL-2026-11-13.md, 2).
 * The stored library keeps it as it is (readStored: `foreign`), and a file skips it.
 */
export function libraryEntry(entry) {
  if (Number(entry.stateVersion) > STATE_VERSION) throw new Error(laterVersion(entry.stateVersion));
  const year = Number(entry.selectedYear);
  return {
    id: String(entry.id),
    name: String(entry.name || 'Mi escenario').trim().slice(0, 60) || 'Mi escenario',
    createdAt: Number(entry.createdAt) || 0,
    // The one chain of migrations (configForStateVersion, src/risk-state-migration.js), as for the browser state,
    // JSON copies and Excel: until 24/11/2026 this list had its own copy, stuck at state 32, so entries saved
    // before 1.67–1.69 kept the old defaults (docs/REVISION-ADVERSARIAL-2026-11-24.md, 14). The stamp began at
    // state 24 (1.51): an entry without it is from 23 or before. Entries saved before 1.46 have no closing clause
    // and keep it off; the legacy risk and relay guards only add keys that are missing.
    config: clone(validateConfig(configForStateVersion(keepClosingClauseOff(preserveLegacyRelayConfig(preserveLegacyRiskConfig(entry.config))), entryStateVersion(entry)))),
    limits: clone(validateLimits(entry.limits ?? DEFAULT_LIMITS)),
    selectedYear: Number.isInteger(year) && year >= BASE_YEAR && year <= END_YEAR ? year : BASE_YEAR,
    compare: entry.compare === true,
    stateVersion: STATE_VERSION
  };
}

/** The state an entry was saved with: its stamp, or 23 when it has none (stamped since state 24). */
const entryStateVersion = entry => Number.isFinite(Number(entry.stateVersion)) && entry.stateVersion !== null && entry.stateVersion !== '' ? Number(entry.stateVersion) : 23;

/** Name not used yet in the list: «X», «X (2)», «X (3)»… */
export function freeName(list, name, exceptId = null) {
  const taken = new Set(list.filter(e => e.id !== exceptId).map(e => e.name.toLocaleLowerCase('es')));
  const base = String(name).trim().slice(0, 55) || 'Mi escenario';
  if (!taken.has(base.toLocaleLowerCase('es'))) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base} (${n})`.toLocaleLowerCase('es'))) return `${base} (${n})`;
}

/** Id not used yet in the list: «X», «X-2», «X-3»… */
function freeId(list, base) {
  const taken = new Set(list.map(e => e.id));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export const LIBRARY_FILE_KIND = 'pensiones-lab-mis-escenarios';
export const LIBRARY_FILE_FORMAT = 1;

/** «Mis escenarios» as a file: each entry with its state version, so a later version can migrate it. */
export function libraryFile(list, about = null) {
  return { format: LIBRARY_FILE_FORMAT, kind: LIBRARY_FILE_KIND, calibration: CALIBRATION_ID, stateVersion: STATE_VERSION,
    ...(about ? { about } : {}), scenarios: list };
}

/**
 * A file's scenarios added after the current ones. One already there with the same name,
 * settings, limits and year is skipped: an entry is a snapshot, and one that differs in its year
 * or its limits is another one (docs/REVISION-ESTADO-ACTUAL-2026-11-13.md, 1). A name clash keeps
 * both («X (2)»); at most LIBRARY_LIMIT. Throws with a sentence for the reader when the file is
 * not one of these, is of another base or comes from a later version.
 */
export function mergeLibraryFile(list, file) {
  if (file?.kind !== LIBRARY_FILE_KIND || file.format !== LIBRARY_FILE_FORMAT || !Array.isArray(file.scenarios)) {
    throw new Error('No es un archivo de «Mis escenarios» de Pensiones Lab.');
  }
  if (file.calibration !== CALIBRATION_ID) throw new Error(`Es de otra base de datos (${String(file.calibration).slice(0, 60)}); esta versión usa ${CALIBRATION_ID}.`);
  if (Number(file.stateVersion) > STATE_VERSION) throw new Error(laterVersion(file.stateVersion));
  const out = [...list];
  let added = 0, repeated = 0, skipped = 0;
  const sameSnapshot = (a, b) => a.name.toLocaleLowerCase('es') === b.name.toLocaleLowerCase('es') && JSON.stringify(a.config) === JSON.stringify(b.config)
    && JSON.stringify(a.limits) === JSON.stringify(b.limits) && a.selectedYear === b.selectedYear;
  for (const raw of file.scenarios) {
    let entry;
    try { entry = libraryEntry({ ...raw, id: raw?.id ?? Date.now() }); } catch { skipped++; continue; }
    if (out.some(e => sameSnapshot(e, entry))) { repeated++; continue; }
    if (out.length >= LIBRARY_LIMIT) { skipped++; continue; }
    out.push({ ...entry, id: freeId(out, entry.id), name: freeName(out, entry.name) });
    added++;
  }
  return { list: out, added, repeated, skipped };
}

/** Laboratorio presets merged after the existing entries, keeping both on a name clash. */
export function mergePresets(list, presets) {
  const out = [...list];
  for (const preset of presets) {
    if (out.length >= LIBRARY_LIMIT) break;
    out.push(libraryEntry({ ...preset, id: `preset-${preset.id}`, name: freeName(out, preset.name), createdAt: 0 }));
  }
  return out;
}

// What this version can read of the stored library. `foreign`: entries it cannot validate
// (damaged, or written by a newer version), kept as stored. `damaged`: the stored text when
// it is not a list at all.
function readStored(storage) {
  const raw = storage.getItem(LIBRARY_KEY);
  const out = { list: [], foreign: [], damaged: null };
  if (raw === null) return out;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = null; }
  if (!Array.isArray(parsed)) return { ...out, damaged: raw };
  for (const entry of parsed) { try { out.list.push(libraryEntry(entry)); } catch { out.foreign.push(entry); } }
  return out;
}

// A library that is not a list is copied here before anything is written over it, one
// slot per distinct text; the copies are never overwritten (A07, docs/CAMBIOS.md).
export const LIBRARY_BACKUP_KEY = `${CUSTOM_PRESETS_KEY}:unreadable`;
const BACKUP_SLOTS = Object.freeze([1, 2, 3, 4, 5].map(n => n === 1 ? LIBRARY_BACKUP_KEY : `${LIBRARY_BACKUP_KEY}-${n}`));
export const LIBRARY_NOT_SAVED = 'No se ha podido guardar en este navegador: el almacenamiento está lleno o bloqueado. Tu escenario sigue abierto; copia su enlace para no perderlo.';
const LIBRARY_NO_BACKUP_SLOT = 'Tu biblioteca guardada no se puede leer con esta versión y ya hay cinco copias apartadas, así que no se sobrescribe. Tu escenario sigue abierto; copia su enlace para no perderlo.';

/** What the reader should know about the stored library, or null when it reads whole. */
export function libraryNotice(storage = globalThis.localStorage) {
  try {
    const { foreign, damaged } = readStored(storage);
    if (damaged !== null) return 'Tu biblioteca guardada no se puede leer. Se conserva tal cual y, antes de guardar otra cosa, se aparta una copia.';
    if (foreign.length === 1) return 'Un escenario guardado no se puede leer con esta versión: se conserva sin tocar.';
    if (foreign.length) return `${foreign.length} escenarios guardados no se pueden leer con esta versión: se conservan sin tocar.`;
  } catch { /* storage unavailable: nothing to say about it */ }
  return null;
}

export function readLibrary(storage = globalThis.localStorage) {
  let list = [];
  try { list = readStored(storage).list; } catch { list = []; }
  // Entries saved in the same millisecond before 1.43 (the one-time copy of 1.42's
  // comparisons) could share an id: the first keeps it, the others get «-2», «-3»…
  list = list.reduce((out, e) => { const id = freeId(out, e.id); out.push(id === e.id ? e : { ...e, id }); return out; }, []);
  // One-time copy of the Laboratorio presets; their own key stays as it was.
  try {
    if (storage.getItem(PRESETS_MIGRATED_KEY) === null) {
      const raw = storage.getItem(LEGACY_PRESET_KEY);
      const presets = raw === null ? [] : JSON.parse(raw)?.presets;
      if (Array.isArray(presets)) {
        const valid = [];
        for (const preset of presets) { try { valid.push(libraryEntry(preset)); } catch { /* skip */ } }
        list = mergePresets(list, valid);
      }
      writeLibrary(list, storage);
      storage.setItem(PRESETS_MIGRATED_KEY, new Date().toISOString());
    }
  } catch { /* an unreadable preset library is left untouched */ }
  return list.slice(0, LIBRARY_LIMIT);
}

/**
 * Writes the list. Entries this version cannot read stay after it, as they were; a stored
 * text that is not a list is first copied aside. Throws, with a message for the reader,
 * when nothing could be written.
 */
export function writeLibrary(list, storage = globalThis.localStorage) {
  const kept = list.slice(0, LIBRARY_LIMIT);
  try {
    const { foreign, damaged } = readStored(storage);
    if (damaged !== null && !BACKUP_SLOTS.some(key => storage.getItem(key) === damaged)) {
      const free = BACKUP_SLOTS.find(key => storage.getItem(key) === null);
      if (!free) throw new Error(LIBRARY_NO_BACKUP_SLOT);
      storage.setItem(free, damaged);
    }
    storage.setItem(LIBRARY_KEY, JSON.stringify([...kept, ...foreign]));
  } catch (error) {
    throw new Error(error?.message === LIBRARY_NO_BACKUP_SLOT ? LIBRARY_NO_BACKUP_SLOT : LIBRARY_NOT_SAVED);
  }
  return kept;
}

export function addToLibrary(list, { name, config, limits, selectedYear, compare = false }) {
  if (list.length >= LIBRARY_LIMIT) throw new Error(`Tienes ${LIBRARY_LIMIT} escenarios guardados. Borra uno antes de guardar otro.`);
  const entry = libraryEntry({ id: freeId(list, String(Date.now())), name: freeName(list, name), createdAt: Date.now(), config, limits, selectedYear, compare, stateVersion: STATE_VERSION });
  return [entry, ...list];
}

export function renameInLibrary(list, id, name) {
  return list.map(e => e.id === id ? { ...e, name: freeName(list, name, id) } : e);
}

export function updateInLibrary(list, id, { config, limits, selectedYear }) {
  return list.map(e => e.id === id ? libraryEntry({ ...e, config, limits, selectedYear }) : e);
}

export function removeFromLibrary(list, id) {
  return list.filter(e => e.id !== id);
}

/** Marks an entry for the Laboratorio's comparison table (at most 3 marked). */
export function toggleCompare(list, id) {
  const marked = list.filter(e => e.compare).length;
  return list.map(e => e.id !== id ? e : e.compare ? { ...e, compare: false }
    : marked >= 3 ? e : { ...e, compare: true });
}
