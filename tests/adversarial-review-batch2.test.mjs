// Batch 2 of the adversarial review (docs/REVISION-ADVERSARIAL-2026-11-24.md; docs/DECISIONES.md, 24/11/2026):
// texts, contrast and pages. Checks that keep each fix from coming back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { APP_VERSION } from '../src/shared/app-version.js';

const root = new URL('../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');
const json = path => JSON.parse(text(path));
const contrast = json('data/external-contrast.json');

test('package.json carries the app version (43)', () => {
  assert.equal(json('package.json').version, APP_VERSION);
});

test('a model reference to the settings catalogue points at the setting it names (26)', () => {
  const catalog = text('src/shared/settings-catalog.js').split(/\r?\n/);
  const lineOf = key => catalog.findIndex(l => l.includes(`{ key: '${key}'`)) + 1;
  let checked = 0;
  for (const name of readdirSync(new URL('docs/modelo/', root))) {
    for (const line of text(`docs/modelo/${name}`).split(/\r?\n/)) {
      const refs = [...line.matchAll(/settings-catalog\.js:(\d+)/g)];
      const keys = [...line.matchAll(/`([a-zA-Z][a-zA-Z0-9]*)`/g)].map(m => m[1]).filter(k => lineOf(k) > 0);
      if (refs.length !== 1 || keys.length !== 1) continue;
      assert.equal(Number(refs[0][1]), lineOf(keys[0]), `${name}: ${keys[0]}`);
      checked++;
    }
  }
  assert.ok(checked >= 5, `checked ${checked}`);
});

test('the IMF primary balance is its total balance plus interest paid, as the simulator\'s (47)', () => {
  const imf = json('data/external-forecasts-international-20261017.json').datasets.find(d => d.id === 'imf-articleiv-may2026');
  for (const row of contrast.imf) {
    const r = imf.annual.find(a => a.year === row.year);
    assert.ok(Math.abs(row.ref.primaryGDP - (r.governmentNetLendingBorrowingGDPpct + r.governmentInterestExpenseGDPpct)) < 1e-9, `${row.year}`);
  }
});

test('revenue and spending are compared with the AIReF without the PRTR of the simulator (46; calendar since 1.73)', () => {
  assert.deepEqual([2026, 2027, 2028, 2029, 2030].map(y => Number(contrast.prtr[y].toFixed(9))), [1.25, 0.3, 0.2, 0.1, 0]);
  assert.match(contrast.airefMediumTerm.rows[0].label, /sin PRTR/);
  assert.ok(contrast.airefDebt.rows.filter(r => /Ingresos|Gastos/.test(r.label)).every(r => /sin PRTR/.test(r.label)));
});

// The public repository has no copies of others' documents: there, data/sources/README.md must give the same fingerprint.
const listed = (file, sha) => { const list = text('data/sources/README.md'); return list.includes('`' + file.replace('data/sources/', '') + '`') && list.includes(sha); };
test('the sources the contrast reads are in the project, with their fingerprints (51, 52)', () => {
  const checks = [
    json('data/external-forecasts-airef-estudio-20260529.json').source,
    json('data/external-forecasts-airef-pfemp-20260514.json').source,
    json('data/external-forecasts-private-20261017.json').sources.funcas_report_20261015
  ];
  for (const s of checks) {
    if (existsSync(new URL(s.snapshot, root))) assert.equal(createHash('sha256').update(readFileSync(new URL(s.snapshot, root))).digest('hex'), s.sha256, s.snapshot);
    else assert.ok(listed(s.snapshot, s.sha256), `${s.snapshot}: neither the copy nor its row in data/sources/README.md`);
  }
});

test('pages and SVG views write numbers with the shared format: real minus sign, comma (40)', () => {
  for (const f of ['src/pages/metodologia.js', 'src/pages/sensibilidad.js', 'src/pages/riesgo.js', 'src/views/chart-svg.js', 'src/views/fan-svg.js', 'src/views/tornado-svg.js']) {
    assert.doesNotMatch(text(f), /toLocaleString\('es-ES'/, f);
  }
});
