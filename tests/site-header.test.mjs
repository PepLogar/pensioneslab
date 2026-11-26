// The beta label and the «Fallos y mejoras» link in every header (src/shared/site-header.js): static in the HTML, and
// an e-mail that carries what is needed to reproduce a fault without passing the length mail programs accept.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.window ??= { addEventListener() {}, dispatchEvent() {} };
const { feedbackHref, versionLabel, MAX_MAILTO_CHARS } = await import('../src/shared/site-header.js');
const { APP_VERSION } = await import('../src/shared/app-version.js');
const { DEFAULT_CONFIG } = await import('../src/shared/default-config.js');
const { CREDITS } = await import('../src/shared/credits.js');

const PAGES = ['index.html', 'ayuda.html', 'consola.html', 'metodologia.html', 'graficos.html', 'sensibilidad.html', 'riesgo.html'];
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const body = href => decodeURIComponent(href.split('body=')[1]);

test('every header says «Beta» and links the comments by e-mail, even without JavaScript', () => {
  for (const page of PAGES) {
    const html = read(page);
    assert.match(html, /<span class="site-beta" data-site-version[^>]*>Beta<\/span>/, page);
    assert.match(html, new RegExp(`<a class="site-feedback" data-site-feedback href="mailto:${CREDITS.email}\\?subject=`), page);
  }
  for (const script of ['consola', 'metodologia', 'graficos', 'sensibilidad', 'riesgo']) {
    assert.match(read(`src/pages/${script}.js`), /^mountSiteHeader\(\);$/m, script);
  }
  assert.equal(versionLabel(), `Beta · versión ${APP_VERSION}`);
});

test('the e-mail carries the version, the page, the scenario\'s link and the browser', () => {
  const href = feedbackHref({ config: { ...DEFAULT_CONFIG, retirementAge: 67 }, page: 'graficos.html', origin: 'https://example.org', userAgent: 'UA-test' });
  assert.ok(href.startsWith(`mailto:${CREDITS.email}?subject=`));
  const text = body(href);
  assert.match(text, new RegExp(`Versión: ${APP_VERSION.replace(/\./g, '\\.')} beta`));
  assert.match(text, /Página: graficos\.html/);
  assert.match(text, /Escenario: https:\/\/example\.org\/consola\.html#escenario=/);
  assert.match(text, /Navegador: UA-test/);
  assert.match(body(feedbackHref({ config: null })), /Escenario: las reglas de hoy/);
});

test('a scenario too long for the e-mail is left out with a note, never cut', () => {
  const big = { ...DEFAULT_CONFIG, paymentAdjustments: Array.from({ length: 40 }, (_, i) => ({ year: 2027 + i, publicPensionCut: 0.01 * (i % 5), otherSpendingCut: 0.001 * i })) };
  const href = feedbackHref({ config: big, page: 'index.html', origin: 'https://example.org', userAgent: 'UA' });
  assert.ok(href.length <= MAX_MAILTO_CHARS, String(href.length));
  assert.match(body(href), /Escenario: (demasiado largo para el correo|demasiado grande para un enlace)/);
});
