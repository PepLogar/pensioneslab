// «Los sistemas y sus supuestos» (src/domain/system-assumptions.js; Metodología and the help): what each system starts
// from is said with the engine's own values, so a change of a system's constants or of the engine shows up here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { comparisonConfigs, FLAGSHIP_PROGRESSIVE, MIXED_GRADUAL } from '../src/shared/scenario-labels.js';
import { closingClauseApplies } from '../src/shared/closing-clause.js';
import { CATALOG } from '../src/shared/console-rows.js';
import { COMMON_ASSUMPTIONS, SYSTEM_ASSUMPTIONS, systemNotice } from '../src/domain/system-assumptions.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const contrast = JSON.parse(read('data/external-contrast.json'));
const entries = comparisonConfigs(DEFAULT_CONFIG, { includeRetro1985: true, includeMixedGradual: true });

test('every system of the comparison has its sheet, its engine shares and, if chosen in the list, its notice', () => {
  assert.deepEqual(SYSTEM_ASSUMPTIONS.map(s => s.key).sort(), entries.map(e => e.key).sort());
  assert.deepEqual(contrast.systems.map(s => s.key).sort(), entries.map(e => e.key).sort());
  const listed = /options: \[\['payg', 'Reparto \(hoy\)'\][^\n]*/.exec(read('src/shared/settings-panel.js'))[0];
  for (const s of SYSTEM_ASSUMPTIONS) {
    assert.equal(listed.includes(`'${s.key}'`), s.selectable, `${s.key} selectable`);
    if (s.selectable) assert.ok(listed.includes(`'${s.name}'`), `${s.key} has the list's name`);
    assert.match(systemNotice(s.key), /Sus supuestos: Metodología › Los sistemas y sus supuestos\.$/);
    for (const f of s.fixed) assert.equal(f.name, CATALOG.get(f.key).name, `${s.key} ${f.key}`);
  }
  assert.ok(COMMON_ASSUMPTIONS.length >= 8);
});

test('the yearly shares stored for Metodología are the engine\'s', () => {
  const entry = entries.find(e => e.key === 'progressive');
  const run = simulate(validateConfig(entry.config));
  for (const w of contrast.systems.find(s => s.key === 'progressive').weights) {
    const r = run.years.find(y => y.year === w.year);
    assert.ok(Math.abs(r.effectiveFundedWeight - w.funded) < 1e-4 && Math.abs(r.effectiveNdcWeight - w.ndc) < 1e-4, String(w.year));
  }
});

test('what the sheets say matches the systems\' constants and the engine', () => {
  const sheet = key => SYSTEM_ASSUMPTIONS.find(s => s.key === key);
  assert.match(sheet('progressive').contribution, new RegExp(`el ${Math.round(100 * FLAGSHIP_PROGRESSIVE.transitionTargetFunded)} % de la parte de jubilación va al fondo`));
  assert.match(sheet('progressive').entry, new RegExp(`hasta ${FLAGSHIP_PROGRESSIVE.transitionCutoffAge - 8} años en 2026 lleva la parte completa`));
  assert.match(sheet('mixedGradual').entry, new RegExp(`en ${MIXED_GRADUAL.transitionYears} años`));
  // Ages up to cut-off − 8 take the whole target; older ones, less.
  const byAge = contrast.systems.find(s => s.key === 'progressive').byAge;
  for (const a of byAge) {
    if (a.age <= FLAGSHIP_PROGRESSIVE.transitionCutoffAge - 8) assert.equal(a.funded, FLAGSHIP_PROGRESSIVE.transitionTargetFunded, String(a.age));
    else assert.ok(a.funded < FLAGSHIP_PROGRESSIVE.transitionTargetFunded, String(a.age));
  }
  // The 2023 brake: on by default only in pay-as-you-go, as the sheets say.
  for (const e of entries) {
    const acts = closingClauseApplies(validateConfig(e.config));
    assert.equal(acts, e.key === 'payg', e.key);
    assert.equal(/^Actúa/.test(sheet(e.key).brake), acts, `${e.key} brake text`);
  }
});

test('Metodología shows it right after the Ficha, and the help links it', () => {
  const page = read('src/pages/metodologia.js');
  const order = [...page.matchAll(/^section\('([a-z]+)'/gm)].map(m => m[1]);
  assert.deepEqual(order.slice(0, 2), ['ficha', 'sistemas']);
  const help = read('ayuda.html');
  assert.match(help, /<section id="supuestos"/);
  assert.match(help, /href="metodologia\.html#sistemas"/);
  assert.ok(help.indexOf('id="sistema"') < help.indexOf('id="supuestos"'));
  assert.match(read('src/pages/consola.js'), /const chooseSystem = value => \{ apply\('system', value\); const text = systemNotice\(value\);/);
});
