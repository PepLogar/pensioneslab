// The landing page (index.html; decision of the author, 25/11/2026): readable on a phone, one obvious button to the
// console, says why there is no phone version, sends old scenario links to the console, and loads no engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');

test('one obvious button, to the console, and the phone notice', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  const buttons = [...html.matchAll(/class="lp-cta"[^>]*>/g)];
  assert.equal(buttons.length, 1, 'a single button');
  assert.match(html, /<a class="lp-cta" href="consola\.html">Abrir la consola/);
  assert.match(html, /La consola está pensada para usarse en un ordenador/);
  assert.match(html, /decidimos no hacer una versión para móvil/);
  assert.match(html, /Tú eres el Consejo de Ministros/);
  assert.match(html, /hace falta entender cómo funciona una economía/);
});

test('an old shared link (index.html#escenario=…) goes on to the console with its scenario', () => {
  assert.match(html, /if \(\/\^#escenario=\/\.test\(location\.hash\)\) location\.replace\('consola\.html' \+ location\.hash\);/);
  assert.equal(read('src/shared/share-link.js').includes("SHARE_PARAM = 'escenario'"), true, 'the parameter the redirect looks for');
});

test('icons and share image exist, and the landing script loads no engine', () => {
  for (const file of ['public/favicon.svg', 'public/apple-touch-icon.png', 'public/og-image.png']) assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), file);
  assert.match(html, /<meta property="og:image" content="https:\/\/demarquia\.org\/pensioneslab\/og-image\.png">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/demarquia\.org\/pensioneslab\/">/);
  const importsOf = path => [...read(path).matchAll(/from '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(importsOf('src/pages/inicio.js'), ['../shared/light-header.js']);
  assert.deepEqual(importsOf('src/pages/ayuda.js'), ['../shared/light-header.js']);
  assert.deepEqual(importsOf('src/shared/light-header.js'), ['./app-version.js', './credits.js']);
  for (const page of ['consola.html', 'metodologia.html', 'graficos.html', 'sensibilidad.html', 'riesgo.html']) {
    assert.match(read(page), /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/, page);
  }
});

test('links to a page keep the folder the site is served from (demarquia.org/pensioneslab/)', async () => {
  const { appFolder } = await import('../src/shared/credits.js');
  const { exportStamp } = await import('../src/shared/citation.js');
  const saved = globalThis.location;
  try {
    globalThis.location = { href: 'https://demarquia.org/pensioneslab/consola.html#escenario=x', origin: 'https://demarquia.org' };
    assert.equal(appFolder(), 'https://demarquia.org/pensioneslab');
    assert.match(exportStamp(null).link, /^https:\/\/demarquia\.org\/pensioneslab\/consola\.html$/);
  } finally { globalThis.location = saved; }
  assert.equal(appFolder(), '');
});
