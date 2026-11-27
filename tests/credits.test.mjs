// Credits, licences and notices for publication (docs/PUBLICACION-CUESTIONES-LEGALES-2026-11-25.md; src/shared/credits.js):
// every page shows the same credit line, the exports cite the developer and the licence, and the «Supuestos de otros»
// profiles say they are approximations, not those institutions' results.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CREDITS, ATTRIBUTION } from '../src/shared/credits.js';
import { exportStamp } from '../src/shared/citation.js';
import { REFERENCE_PROFILES } from '../src/domain/reference-profiles.js';

const text = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const PAGES = ['index.html', 'ayuda.html', 'consola.html', 'metodologia.html', 'graficos.html', 'sensibilidad.html', 'riesgo.html', 'informe.html'];
const creditLine = page => /<p class="[\w-]+ site-credits" data-site-credits>(.*?)<\/p>/.exec(text(page))?.[1];

test('every page carries the same credit line: developer, contact, both licences, no advice and the legal notice', () => {
  const lines = PAGES.map(creditLine);
  assert.ok(lines.every(Boolean), 'each page has one');
  assert.equal(new Set(lines).size, 1, 'and the same one');
  const line = lines[0];
  for (const part of [CREDITS.developer, CREDITS.developerHref, CREDITS.email, CREDITS.codeLicenceHref, CREDITS.contentLicenceHref, 'Cabeza Propia',
    'No es asesoramiento financiero', 'metodologia.html#aviso']) assert.ok(line.includes(part), part);
});

test('the citation of every export names the developer and the content licence', () => {
  const stamp = exportStamp(null, { origin: '' });
  assert.match(stamp.cite, new RegExp(`desarrollo: ${CREDITS.developer}`));
  assert.match(stamp.cite, /Licencia CC BY 4\.0\.$/);
  assert.match(stamp.licence, /AGPL-3\.0/);
  assert.match(stamp.caveat, /asesoramiento financiero/);
  assert.match(ATTRIBUTION, /Pep Logar AI Solutions\. CC BY 4\.0\.$/);
});

test('the repository states both licences and the attribution term', () => {
  assert.equal(JSON.parse(text('package.json')).license, 'AGPL-3.0-or-later');
  const licence = text('LICENSE.md');
  for (const part of ['GNU Affero General Public License', 'sección 7 b', 'Creative Commons Atribución 4.0', 'Lo que no cubren']) assert.ok(licence.includes(part), part);
});

test('the profiles of «Supuestos de otros» are approximations, not results of those institutions', () => {
  for (const p of REFERENCE_PROFILES) {
    assert.match(p.says, /^Aproximación del simulador/);
    assert.match(p.says, /ni está revisado por ella\.$/);
    assert.doesNotMatch(p.says, /tal cual/);
  }
});

test('the repository carries the official AGPL text, and the notice names the source code and the hosting with nothing pending', () => {
  const agpl = text('LICENSE');
  assert.match(agpl, /^\s*GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3, 19 November 2007/);
  assert.ok(agpl.length > 34000, 'the whole text');
  const page = text('src/pages/metodologia.js');
  assert.ok(page.includes('C.sourceHref') && CREDITS.sourceHref === 'https://github.com/PepLogar/pensioneslab');
  // The public repository (since 1.87.2): one commit, no copies of others' documents; the private one keeps the history.
  assert.ok(!page.includes('pensioneslabs3'), 'the page names the public repository, not the private one');
  assert.ok(page.includes('C.hosting') && /Hostinger/.test(CREDITS.hosting));
  assert.doesNotMatch(page, /Pendiente:/);
});
