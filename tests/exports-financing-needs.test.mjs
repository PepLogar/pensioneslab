// The financing needs in what a reader takes away (docs/PROPUESTA-EXPORTAR-NECESIDADES-2026-11-09.md,
// option A, approved by the author on 9/11/2026): the long CSV carries the maturities and the needs
// without bills, the gross issuance says it has no bills, what the engine leaves empty in the opening
// year stays empty, and the Excel column takes the dictionary's name. No engine number moves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG } from '../src/model-current-v10.js';
import { simulate } from '../src/simulation.js';
import { SERIES_VARIABLES, longSeriesCSV, dictionaryCSV } from '../src/domain/series-dictionary.js';
import { describeRiskPath } from '../src/shared/sovereign-risk.js';
import { buildModelsXlsxBytes, extractZipTextEntries } from '../src/shared/excel-models-io.js';

const result = simulate(DEFAULT_CONFIG);
const get = (id, p) => SERIES_VARIABLES.find(v => v.id === id).get(p);
const NEW = ['vencimientos_deuda', 'necesidades_brutas_financiacion_pct_pib'];
const EMPTY_AT_START = ['necesidad_financiacion', 'emision_bruta_deuda', 'tipo_deuda_nueva', ...NEW];

test('the two new variables sit in «Estado», after the gross issuance, and say «sin letras»', () => {
  const ids = SERIES_VARIABLES.map(v => v.id);
  const at = ids.indexOf('emision_bruta_deuda');
  assert.deepEqual(ids.slice(at + 1, at + 3), NEW);
  for (const id of NEW) assert.equal(SERIES_VARIABLES.find(v => v.id === id).group, 'Estado');
  const dictionary = dictionaryCSV();
  assert.match(dictionary, /\nemision_bruta_deuda;[^\n]*el simulador no emite letras/);
  assert.match(dictionary, /\nnecesidades_brutas_financiacion_pct_pib;Estado;Necesidades brutas de financiación, sin letras;pct_PIB;[^\n]*15,95 %/);
});

test('the opening year leaves the five empty, not zero; the next years add up', () => {
  const rows = longSeriesCSV([{ key: 'payg', result }]).split('\n');
  const cell = (year, id) => rows.find(row => row.startsWith(`${year};payg;${id};`)).split(';')[3];
  for (const id of EMPTY_AT_START) assert.equal(cell(2026, id), '', `2026 ${id}`);
  assert.notEqual(cell(2026, 'saldo_publico'), '', 'the opening year keeps what the engine has');
  const path = describeRiskPath(result.years).path;
  for (const p of result.years.filter(point => [2027, 2030, 2050].includes(point.year))) {
    const need = get('necesidad_financiacion', p);
    const maturities = get('vencimientos_deuda', p);
    assert.ok(Math.abs(get('emision_bruta_deuda', p) - (need + maturities)) < 1e-6 * maturities, `${p.year}: issuance = need + maturities`);
    const needs = 100 * (Math.max(0, need) + maturities) / get('pib', p);
    assert.ok(Math.abs(get('necesidades_brutas_financiacion_pct_pib', p) - needs) < 1e-9, `${p.year}: needs = (need + maturities) / GDP`);
    assert.equal(get('necesidades_brutas_financiacion_pct_pib', p), path.find(st => st.year === p.year).vars.grossFinancingNeeds, `${p.year}: the risk index reads the same number`);
  }
});

test('the Excel column takes the dictionary\'s name in both sheets', async () => {
  const source = readFileSync(new URL('../src/shared/excel-models-io.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Necesidades_Financiacion_Pct_PIB/);
  assert.equal((source.match(/'necesidades_brutas_financiacion_pct_pib \[pct_PIB\]'/g) ?? []).length, 2);
  const entries = await extractZipTextEntries(buildModelsXlsxBytes({ state: { config: DEFAULT_CONFIG, limits: {}, selectedYear: 2050 }, activeResult: result }));
  const text = [...entries.values()].join('\n');
  assert.ok(text.includes('necesidades_brutas_financiacion_pct_pib [pct_PIB]'));
  assert.ok(text.includes('Necesidades brutas de financiación, sin letras'), 'and the «Diccionario» sheet defines it');
});
