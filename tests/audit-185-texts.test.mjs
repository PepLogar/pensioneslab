// Audit of 1.85.0 (docs/AUDITORIA-1.85-2026-11-26.md), texts, sources and publication: the figures the texts give
// match the engine's stored contrast, every engine data module cites a source on «Fuentes de datos», the sensitivity
// variants are scenarios the validator accepts, and the pages share one product name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { ASSUMPTIONS } from '../src/domain/assumptions-catalog.js';
import { collectSources, CITED_OUTSIDE_FIELDS } from '../src/domain/source-registry.js';
import { SENSITIVITY, variants } from '../src/domain/sensitivity.js';
import { exportStamp } from '../src/shared/citation.js';
import { hintOf } from '../src/shared/console-rows.js';
import { num } from '../src/shared/number-format.js';

const text = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const assumption = id => ASSUMPTIONS.find(a => a.id === id);
const PAGES = ['index.html', 'ayuda.html', 'consola.html', 'metodologia.html', 'graficos.html', 'sensibilidad.html', 'riesgo.html'];

test('«Población y empleo» gives the debt without the AIReF short run that the engine stored (5, 6)', () => {
  const w = JSON.parse(text('data/external-contrast.json')).airefMediumTerm.withoutOption;
  const value = assumption('poblacion-empleo').value;
  for (const v of [w.debt2050Base, w.debt2050]) assert.ok(value.includes(`${num(v, 1, { fixed: true })} %`), `${num(v, 1, { fixed: true })} % in «${value.slice(-120)}»`);
  assert.doesNotMatch(assumption('edad-jubilacion').value, /2052 a 2047/);
  assert.match(assumption('impuestos-sin-modelo').value, /1,7 % del PIB en 2070/);
});

test('the budget items say they use Eurostat COFOG 2024, as the engine does (11)', () => {
  const a = assumption('partidas');
  assert.ok(a.kinds.includes('O'));
  assert.match(a.source, /gov_10a_exp/);
  assert.doesNotMatch(`${a.value} ${a.source}`, /Sin fuente hasta ahora|En revisión/);
});

test('the console help does not say 65 keeps the 2026 ages while the exit-age path is on (8, 9)', () => {
  assert.equal(DEFAULT_CONFIG.retirementAgeExitPath, 1);
  assert.doesNotMatch(hintOf('retirementAge'), /se jubila a las edades de 2026|conserva el perfil/);
  const hint = hintOf('realReturn');
  assert.match(hint, /fondo común \(Mixto progresivo\)/);
  assert.match(hint, /1,25 puntos/);
  assert.doesNotMatch(hint, /ciclo vital \(Mixto progresivo\)|1,9 %/);
});

test('every engine data module gives a source row, INE and Imserso included, and the copies named here exist (13)', async () => {
  const modules = {};
  for (const f of readdirSync('data').filter(f => f.endsWith('.js'))) modules[`/data/${f}`] = await import(pathToFileURL(`data/${f}`).href);
  const sources = collectSources(modules);
  const cited = new Set(sources.flatMap(s => s.modules));
  const silent = Object.keys(modules).map(m => m.replace('/data/', 'data/')).filter(m => !cited.has(m));
  assert.deepEqual(silent, [], 'data modules with no source row');
  const publishers = new Set(sources.map(s => s.publisher));
  for (const p of ['INE', 'Imserso', 'Seguridad Social', 'Comisión Europea (DG ECFIN)']) assert.ok(publishers.has(p), p);
  assert.ok(sources.some(s => /t=65109/.test(s.url) && s.sha256?.startsWith('6fff72fa')), 'EPA 65109 with its SHA-256');
  assert.ok(sources.some(s => s.file?.endsWith('country-fiche-Spain.pdf') && s.sha256?.startsWith('073dca6b')), 'the AR fiche with its copy');
  // The copy, or (in the public repository, without copies of others' documents) its row in data/sources/README.md.
  const list = readFileSync('data/sources/README.md', 'utf8');
  for (const extra of Object.values(CITED_OUTSIDE_FIELDS).flat()) if (extra.file) assert.ok(existsSync(extra.file) || list.includes('`' + extra.file.replace('data/sources/', '') + '`'), extra.file);
});

test('sensitivity variants stay inside the validator, also at the edges the console allows (21)', () => {
  const edges = [{}, { riskPremiumAt10pp: 0.01 }, { riskPremiumAt10pp: 0.0068 }, { riskHighIndex: 0.31 }, { riskHighIndex: 0.29 },
    { riskModerateIndex: 0.35 }, { riskHighIndex: 0.05, riskModerateIndex: 0.05 }, { riskHighIndex: 1 }];
  for (const edge of edges) {
    const config = validateConfig({ ...DEFAULT_CONFIG, ...edge });
    for (const item of SENSITIVITY) for (const v of variants(item, config)) {
      assert.notEqual(v.value, config[item.key], `${item.id} at ${JSON.stringify(edge)}`);
      assert.doesNotThrow(() => validateConfig({ ...config, ...v.patch }), `${item.id} at ${JSON.stringify(edge)}: ${JSON.stringify(v.patch)}`);
    }
  }
  const page = text('src/pages/sensibilidad.js');
  assert.match(page, /configErrorText\(/);
  assert.match(page, /Promise\.allSettled/);
});

test('one product name on every page, and stamps keep «España» (25, 27)', () => {
  for (const page of PAGES) {
    const html = text(page);
    assert.match(/<title>(.*?)<\/title>/.exec(html)[1], /^Pensiones Lab · /, page);
    assert.doesNotMatch(html, /Pensiones Lab 3/, page);
  }
  assert.equal(exportStamp(null).scenarioInline, 'España, con las reglas de hoy (2026)');
  assert.match(exportStamp({ ...DEFAULT_CONFIG, retirementAge: 67 }).scenarioInline, /^escenario propio/);
  for (const page of ['src/pages/graficos.js', 'src/pages/sensibilidad.js']) assert.doesNotMatch(text(page), /scenario\.toLowerCase\(\)/, page);
});

test('the Sites package accepts and requires the files of public/, as the Hostinger one (26)', () => {
  const script = text('scripts/prepare-sites-package.mjs');
  const files = name => /const PUBLIC_FILES = (\[[^\]]*\])/.exec(text(name))?.[1];
  assert.equal(files('scripts/prepare-sites-package.mjs'), files('scripts/prepare-hostinger-package.mjs'));
  assert.match(script, /PUBLIC_FILES\.includes\(file\.path\)/);
  assert.match(script, /for \(const name of PUBLIC_FILES\)/);
  assert.doesNotMatch(script, /five pages|cinco páginas/);
});
