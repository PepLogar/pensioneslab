// «Metodología» (metodologia.html) reads everything from the modules the engine uses; these tests keep its
// pointers true: every assumption says a place the console has, every setting shows a starting value, and
// every source the data modules cite has a link, and its local copy (when present) still has its SHA-256.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { ROWS } from '../src/shared/console-rows.js';
import { ASSUMPTIONS, ASSUMPTION_GROUPS } from '../src/domain/assumptions-catalog.js';
import { settingPlace, assumptionPlaces, startingValue, CONSOLE_TABS } from '../src/domain/methodology.js';
import { collectSources } from '../src/domain/source-registry.js';
import { SQUEEZE_FIELDS, LIMIT_FIELDS } from '../src/domain/consola-measures.js';

test('every assumption has a type, a group and a place in the console or a reason it is fixed', () => {
  const groups = new Set(ASSUMPTION_GROUPS.map(g => g.id));
  const fieldLabels = { ricos: SQUEEZE_FIELDS.map(f => f.label), limites: LIMIT_FIELDS.map(f => f.label), partidas: [], calendario: [] };
  assert.equal(new Set(ASSUMPTIONS.map(a => a.id)).size, ASSUMPTIONS.length);
  for (const a of ASSUMPTIONS) {
    assert.ok(groups.has(a.group), a.id);
    assert.ok(a.kinds.length && a.kinds.every(k => ['O', 'R', 'S'].includes(k)), a.id);
    for (const key of a.at ?? []) assert.ok(settingPlace(key), `${a.id}: ${key} is not a setting of the catalogue`);
    if (a.tab) {
      assert.ok(CONSOLE_TABS[a.tab[0]], `${a.id}: tab ${a.tab[0]}`);
      for (const f of a.tab[1]) assert.ok(fieldLabels[a.tab[0]].includes(f), `${a.id}: «${f}» is not in tab ${a.tab[0]}`);
    }
    const { places, fixed } = assumptionPlaces(a);
    assert.ok(places.length || fixed, `${a.id} says nowhere`);
  }
});

test('every setting of the console shows a starting value', () => {
  for (const row of ROWS) assert.notEqual(startingValue(row, DEFAULT_CONFIG), '', row.entry.key);
});

test('the description of the model cites files and lines that exist', () => {
  const docs = readdirSync('docs/modelo').filter(f => f.endsWith('.md'));
  assert.ok(docs.length >= 5);
  const lines = new Map();
  const count = path => lines.get(path) ?? lines.set(path, readFileSync(path, 'utf8').split('\n').length).get(path);
  let refs = 0;
  for (const doc of docs) {
    const text = readFileSync(`docs/modelo/${doc}`, 'utf8');
    assert.match(text, /^## \d+ · /m, `${doc} starts its section with «## N · »`);
    for (const [ref, path, from, to] of text.matchAll(/((?:src|data|tests)\/[\w./-]+\.(?:js|mjs|json)):(\d+)(?:[-–](\d+))?/g)) {
      refs++;
      assert.ok(existsSync(path), `${doc}: ${ref}, the file is not here`);
      assert.ok(Number(to ?? from) <= count(path), `${doc}: ${ref}, past the end of the file`);
    }
  }
  assert.ok(refs > 300, `only ${refs} references`);
});

test('every cited source has a link, and the copies kept here match their SHA-256', async () => {
  const modules = {};
  for (const f of readdirSync('data').filter(f => f.endsWith('.js'))) modules[`/data/${f}`] = await import(pathToFileURL(`data/${f}`).href);
  const sources = collectSources(modules);
  assert.ok(sources.length >= 50, `only ${sources.length} sources`);
  for (const s of sources) {
    assert.match(s.url, /^https?:\/\//);
    if (s.file && s.sha256 && existsSync(s.file)) assert.equal(createHash('sha256').update(readFileSync(s.file)).digest('hex'), s.sha256, s.file);
  }
});
