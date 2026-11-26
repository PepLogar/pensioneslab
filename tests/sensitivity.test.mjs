// «Sensibilidad» (sensibilidad.html): every assumption it moves is a setting of the catalogue, its variants sit
// around the scenario's value inside the setting's range, and the ranking puts the largest change first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { settingEntry } from '../src/shared/settings-catalog.js';
import { SENSITIVITY, variants, rankEffects } from '../src/domain/sensitivity.js';
import { tornadoSvg } from '../src/views/tornado-svg.js';

test('each assumption is a setting, and its variants are valid scenarios around the open one', () => {
  assert.equal(new Set(SENSITIVITY.map(s => s.id)).size, SENSITIVITY.length);
  for (const item of SENSITIVITY) {
    assert.ok(settingEntry(item.key), `${item.key} is in the catalogue`);
    const vs = variants(item, DEFAULT_CONFIG);
    assert.ok(vs.length >= 1 && vs.length <= 2, item.id);
    for (const v of vs) {
      assert.notEqual(v.value, DEFAULT_CONFIG[item.key], `${item.id}: a variant differs from the scenario`);
      assert.doesNotThrow(() => validateConfig({ ...DEFAULT_CONFIG, ...v.patch }), item.id);
    }
  }
  // A switch gives its other value; a step stops at the edge of its range.
  assert.deepEqual(variants(SENSITIVITY.find(s => s.key === 'stressPremium'), DEFAULT_CONFIG).map(v => v.value), [1]);
  assert.deepEqual(variants(SENSITIVITY.find(s => s.key === 'longevityGain'), DEFAULT_CONFIG).map(v => v.value), [0.3]);
  assert.deepEqual(Object.keys(variants(SENSITIVITY[0], DEFAULT_CONFIG)[0].patch), ['productivityGrowth', 'realWageGrowth']);
});

test('the ranking: largest change in debt first, then in the year it breaks; idle ones flagged', () => {
  const base = { debt2070: 100, breakYear: 2050, pension2050: 60, gap2050: 3 };
  const m = (debt2070, breakYear = 2050) => ({ debt2070, breakYear, pension2050: 60, gap2050: 3 });
  const rows = rankEffects(base, [
    { item: { id: 'a' }, runs: [{ value: 1, m: m(110) }] },
    { item: { id: 'b' }, runs: [{ value: 1, m: m(70) }, { value: 2, m: m(120) }] },
    { item: { id: 'c' }, runs: [{ value: 1, m: m(100, 2045) }] },
    { item: { id: 'd' }, runs: [{ value: 1, m: m(100) }] }
  ]);
  assert.deepEqual(rows.map(r => r.item.id), ['b', 'a', 'c', 'd']);
  assert.deepEqual(rows.map(r => r.idle), [false, false, false, true]);
  assert.equal(rows[2].effects[0].delta.breakYear, -5);
});

test('the tornado is a standalone SVG with a bar per variant', () => {
  const svg = tornadoSvg([{ label: 'Interés', base: 277, bars: [{ value: 206, text: '0,4 %', low: true }, { value: 389, text: '2,4 %', low: false }] }],
    { title: 'Qué supuesto decide', axis: '% del PIB', stamp: ['sello'], desc: 'cita' });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.equal((svg.match(/<rect [^>]*fill-opacity/g) ?? []).length, 2);
  assert.match(svg, /<desc>cita<\/desc>/);
});
