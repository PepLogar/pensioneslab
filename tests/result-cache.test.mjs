// The summaries kept between visits by «Sensibilidad» and «Riesgo» (src/shared/result-cache.js): the key
// holds everything a summary depends on, so a changed scenario, page, parameter or version never reuses an
// old one; equivalent scenarios share it. Without IndexedDB (node) every read misses and nothing throws.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { SIMULATION_METHODOLOGY } from '../src/simulation-methodology.js';
import { APP_VERSION } from '../src/shared/app-version.js';
import { CALIBRATION_ID } from '../src/shared/storage-ids.js';
import { resultCacheKey, readResult, saveResult, savedWhen, RESULT_CACHE_VERSION } from '../src/shared/result-cache.js';

const base = resultCacheKey('sensibilidad', DEFAULT_CONFIG, { a: 1 });

test('the key holds the versions, the calibration, the page, the scenario and the parameters', () => {
  const k = JSON.parse(base);
  assert.equal(k.methodology, SIMULATION_METHODOLOGY);
  assert.equal(k.app, APP_VERSION);
  assert.equal(k.calibration, CALIBRATION_ID);
  assert.equal(k.cache, RESULT_CACHE_VERSION);
  assert.notEqual(resultCacheKey('riesgo', DEFAULT_CONFIG, { a: 1 }), base, 'page');
  assert.notEqual(resultCacheKey('sensibilidad', { ...DEFAULT_CONFIG, productivityGrowth: 0.001 }, { a: 1 }), base, 'scenario');
  assert.notEqual(resultCacheKey('sensibilidad', { ...DEFAULT_CONFIG, system: 'ndc' }, { a: 1 }), base, 'system');
  assert.notEqual(resultCacheKey('sensibilidad', DEFAULT_CONFIG, { a: 2 }), base, 'parameters');
});

test('equivalent scenarios share the key: what cannot change a result does not split it', () => {
  // A transition setting does nothing to the pay-as-you-go system (src/shared/sim-key.js).
  const payg = { ...DEFAULT_CONFIG, system: 'payg' };
  assert.equal(resultCacheKey('riesgo', { ...payg, transitionYears: payg.transitionYears + 5 }), resultCacheKey('riesgo', payg));
});

test('without IndexedDB, reads miss and writes do nothing, without throwing', async () => {
  assert.equal(await saveResult(base, { x: 1 }), false);
  assert.equal(await readResult(base), null);
  assert.match(savedWhen('2026-11-24T17:05:00Z'), /^guardado el \d\d\/11\/2026 a las \d\d:05$/);
  assert.equal(savedWhen('no es una fecha'), 'guardado antes');
});

test('the key carries the engine fingerprint, and the fingerprint follows every file of src/ and data/ (16)', async () => {
  const { ENGINE_FINGERPRINT } = await import('../src/shared/result-cache.js');
  assert.equal(JSON.parse(base).engine, ENGINE_FINGERPRINT);
  const { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { engineFingerprint } = await import('../scripts/engine-fingerprint.mjs');
  assert.match(readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8'), /__ENGINE_FINGERPRINT__: JSON\.stringify\(engineFingerprint\(/);
  const dir = mkdtempSync(path.join(tmpdir(), 'fp-'));
  try {
    mkdirSync(path.join(dir, 'src')); mkdirSync(path.join(dir, 'data'));
    writeFileSync(path.join(dir, 'src', 'a.js'), 'export const a = 1;');
    writeFileSync(path.join(dir, 'data', 'b.json'), '{"b":1}');
    const first = engineFingerprint(dir);
    assert.equal(engineFingerprint(dir), first, 'same files, same fingerprint');
    writeFileSync(path.join(dir, 'data', 'b.json'), '{"b":2}');
    assert.notEqual(engineFingerprint(dir), first, 'a changed data file');
    writeFileSync(path.join(dir, 'src', 'c.md'), 'notes');
    assert.equal(engineFingerprint(dir), engineFingerprint(dir), 'stable');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
