// A series CSV exported by the console can be imported back: its header carries the scenario's link
// (# Escenario: …#escenario=…), and a header without it is the scenario of today's rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { simulate } from '../src/simulation.js';
import { seriesFileText } from '../src/shared/export-files.js';
import { exportStamp } from '../src/shared/citation.js';
import { parseImportedModelFile } from '../src/shared/excel-models-io.js';

const origin = 'http://127.0.0.1:5180';
const csvOf = config => seriesFileText([{ key: 'tu_escenario', result: simulate(config) }], config,
  exportStamp(config, { date: new Date('2026-11-22T12:00:00Z'), origin }));
const bytes = text => new TextEncoder().encode(text);

test('the series CSV of a changed scenario imports back with its settings', async () => {
  const config = validateConfig({ ...DEFAULT_CONFIG, retirementAge: 67 });
  const imported = await parseImportedModelFile(bytes(csvOf(config)), 'series.csv', DEFAULT_CONFIG);
  assert.equal(imported.config.retirementAge, 67);
  assert.ok(imported.importedKeysCount >= 1);
});

test('the series CSV of today\'s rules imports back as today\'s rules', async () => {
  const changed = validateConfig({ ...DEFAULT_CONFIG, retirementAge: 70 });
  const imported = await parseImportedModelFile(bytes(csvOf(DEFAULT_CONFIG)), 'series.csv', changed);
  assert.equal(imported.config.retirementAge, DEFAULT_CONFIG.retirementAge);
});

test('a CSV with neither settings nor a scenario link is still refused', async () => {
  await assert.rejects(parseImportedModelFile(bytes('a;b\n1;2\n'), 'otro.csv', DEFAULT_CONFIG), /No se encontraron claves/);
});
