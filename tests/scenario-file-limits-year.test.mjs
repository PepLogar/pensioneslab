// A scenario exported as JSON or Excel brings back, on import, its limits and the year consulted
// (review in Sites of 22/11/2026, docs/SITES-ESCENARIOS-IO-2026-11-22.md, defects 1 and 2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { scenarioFile } from '../src/shared/export-files.js';
import { exportStamp } from '../src/shared/citation.js';
import { buildModelsXlsxBytes, parseImportedModelFile } from '../src/shared/excel-models-io.js';

const state = { config: validateConfig({ ...DEFAULT_CONFIG, retirementAge: 67 }),
  limits: { maxDebtGDP: 172, maxPensionGapGDP: 7, minReplacementRate: 45 }, selectedYear: 2035 };
const stamp = exportStamp(state.config, { date: new Date('2026-11-22T12:00:00Z'), origin: 'http://127.0.0.1:5180' });

test('the JSON of a scenario imports back with its limits and its year', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify(scenarioFile(state, stamp)));
  const imported = await parseImportedModelFile(bytes, 'escenario.json', DEFAULT_CONFIG);
  assert.deepEqual([imported.limits, imported.selectedYear, imported.config.retirementAge], [state.limits, 2035, 67]);
});

test('the Excel of a scenario imports back with its limits and its year', async () => {
  const imported = await parseImportedModelFile(buildModelsXlsxBytes({ state }), 'escenario.xlsx', DEFAULT_CONFIG);
  assert.deepEqual([imported.limits, imported.selectedYear, imported.config.retirementAge], [state.limits, 2035, 67]);
});

test('a file without limits leaves the open ones (null)', async () => {
  const { limits, ...noLimits } = scenarioFile(state, stamp);
  const imported = await parseImportedModelFile(new TextEncoder().encode(JSON.stringify(noLimits)), 'viejo.json', DEFAULT_CONFIG);
  assert.equal(imported.limits, null);
});
