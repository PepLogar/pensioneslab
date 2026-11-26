// The console: consola.html loads the console, and every file the console needs exists. Static imports of
// the console, the worker it starts and the stylesheets are followed from consola.html; nothing points to a
// page of the old site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'consola.html'), 'utf8');

test('consola.html loads the console and its stylesheet, and they exist', () => {
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
  const styles = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(scripts, ['src/pages/consola.js']);
  assert.deepEqual(styles, ['src/consola.css']);
  for (const path of [...scripts, ...styles]) assert.ok(existsSync(resolve(root, path)), path);
});

test('every module the console imports, and the worker, exists', () => {
  const seen = new Set();
  const missing = [];
  const visit = file => {
    if (seen.has(file)) return;
    seen.add(file);
    if (!existsSync(file)) { missing.push(relative(root, file)); return; }
    const text = readFileSync(file, 'utf8');
    const re = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|import\s+|export\s[^'"]*?from\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
    for (const m of text.matchAll(re)) visit(resolve(dirname(file), m[1]));
    for (const m of text.matchAll(/new URL\(\s*['"](\.{1,2}\/[^'"]+\.m?js)['"]/g)) visit(resolve(dirname(file), m[1]));
  };
  visit(resolve(root, 'src/pages/consola.js'));
  assert.deepEqual(missing, []);
  assert.ok(seen.has(resolve(root, 'src/shared/sim-worker.js')), 'the console starts the engine worker');
});

test('the console asks for no precomputed results and links no page of the old site', () => {
  const client = readFileSync(resolve(root, 'src/shared/sim-client.js'), 'utf8');
  assert.doesNotMatch(client, /precomputed-scenarios\.json|fetch\(/);
  const page = readFileSync(resolve(root, 'src/pages/consola.js'), 'utf8') + html;
  // Only pages of this project (the methodology), never one of pensiones_lab_2.
  // External addresses (the licences) are not pages of a site.
  for (const [, href] of page.matchAll(/href="(?![a-z]+:)([^"#]+\.html)/g)) assert.ok(existsSync(resolve(root, href)), `links ${href}, which is not here`);
  assert.doesNotMatch(page, /site-nav|glossary|expert-mode|domain\/help/);
});

test('every element the console looks for is in consola.html', () => {
  const script = readFileSync(resolve(root, 'src/pages/consola.js'), 'utf8');
  const wanted = new Set([...script.matchAll(/\$\('\[(data-cx-[a-z-]+)\]/g)].map(m => m[1]));
  assert.ok(wanted.size > 10);
  for (const attr of wanted) assert.match(html, new RegExp(`${attr}[\\s>=]`), attr);
});
