// Saving and loading «Mis escenarios» (review of 31/10/2026, A05–A07; docs/CAMBIOS.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { DEFAULT_LIMITS } from '../src/sustainability.js';
import { readLibrary, writeLibrary, libraryNotice, LIBRARY_KEY, LIBRARY_BACKUP_KEY, PRESETS_MIGRATED_KEY, LIBRARY_NOT_SAVED } from '../src/shared/scenario-library.js';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const entry = (id, name) => ({ id, name, config: { ...DEFAULT_CONFIG }, limits: DEFAULT_LIMITS, selectedYear: 2040 });

test('A07: a library this version cannot read is never written over', () => {
  // Not a list (damaged, or a format to come), read before the one-time migration: copied aside first.
  const damaged = '{"futureOrCorrupt":true}';
  const s = memory({ [LIBRARY_KEY]: damaged });
  assert.match(libraryNotice(s), /no se puede leer/);
  assert.deepEqual(readLibrary(s), []);
  assert.equal(s.getItem(LIBRARY_BACKUP_KEY), damaged);
  // An entry this version cannot validate stays in the stored list, after what is written.
  const foreign = { id: '2', name: 'De otra versión', config: { system: 'nada' } };
  const t = memory({ [LIBRARY_KEY]: JSON.stringify([entry('1', 'Bien'), foreign]), [PRESETS_MIGRATED_KEY]: 'x' });
  assert.match(libraryNotice(t), /^Un escenario guardado no se puede leer/);
  writeLibrary([], t);
  assert.deepEqual(JSON.parse(t.getItem(LIBRARY_KEY)), [foreign]);
  assert.equal(libraryNotice(memory()), null);
});

test('A05 and A06: a save that was not written says so; loading brings back the saved year', async () => {
  const stored = new Map();
  let full = false;
  globalThis.localStorage = { getItem: k => (stored.has(k) ? stored.get(k) : null),
    setItem: (k, v) => { if (full) throw new Error('QuotaExceededError'); stored.set(k, String(v)); } };
  globalThis.window ??= { addEventListener() {}, dispatchEvent() {} };
  const store = await import('../src/shared/scenario-store.js');
  store.updateScenario({ selectedYear: 2050, config: { retirementAge: 67 } });
  const saved = store.saveCustomScenario('Año 2050');
  store.updateScenario({ selectedYear: 2035, config: { retirementAge: 68 } });
  store.loadCustomScenario(saved.id);
  assert.deepEqual([store.getState().selectedYear, store.getState().config.retirementAge], [2050, 67]);
  full = true;
  assert.throws(() => store.saveCustomScenario('Sin sitio'), { message: LIBRARY_NOT_SAVED });
  assert.ok(!store.getSavedCustomScenarios().some(e => e.name === 'Sin sitio'));
  store.updateScenario({ config: { retirementAge: 66 } });
  assert.equal(store.stateSaveFailed(), true, 'the header bar warns that changes are not being kept');
  full = false;
  store.updateScenario({ config: { retirementAge: 66 } });
  assert.equal(store.stateSaveFailed(), false);
});
