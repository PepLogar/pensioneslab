// The Sites package names the fingerprint of every source the build bundles (scripts/prepare-sites-package.mjs;
// docs/REVISION-ADVERSARIAL-2026-11-24.md, 42): each file or folder outside src/ that a page imports is in the list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const script = readFileSync(path.join(root, 'scripts/prepare-sites-package.mjs'), 'utf8');
const walk = dir => readdirSync(dir).flatMap(name => { const full = path.join(dir, name); return statSync(full).isDirectory() ? walk(full) : [full]; });

test('every source outside src/ that the build bundles is in the inventory', () => {
  const outside = new Set();
  for (const file of walk(path.join(root, 'src')).filter(f => f.endsWith('.js'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?:from |import\(|import\.meta\.glob\()\s*'([^']+)'/g)) {
      const target = path.relative(root, path.resolve(path.dirname(file), m[1].split('?')[0])).split(path.sep).join('/');
      if (!target.startsWith('src/') && !target.startsWith('..') && !target.startsWith('node_modules')) outside.add(target);
    }
  }
  assert.ok(outside.size >= 3, [...outside].join(', '));
  for (const target of outside) {
    // A file is named as it is; a glob by its folder (docs/modelo/*.md → 'docs/modelo'), or data/*.js by its walk.
    const named = script.includes(`'${target}'`) || script.includes(`'${path.posix.dirname(target)}'`) ||
      (/^data\/[^/]+\.js$/.test(target) && script.includes("walk(path.join(root, 'data')).filter(full => full.endsWith('.js'))"));
    assert.ok(named, `${target} is bundled but not in the inventory`);
  }
});
