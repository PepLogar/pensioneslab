// Fingerprint of the engine for the result cache (src/shared/result-cache.js; docs/REVISION-ADVERSARIAL-2026-11-24.md, 16):
// a SHA-256 of every .js and .json file under src/ and data/, by path and content. vite.config.js computes it when the
// server starts or the build runs and passes it in as __ENGINE_FINGERPRINT__, so any change of the engine or its data
// makes a new key, even without a new methodology version. Line endings count as written on disk.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const walk = dir => readdirSync(dir).flatMap(name => {
  const full = path.join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

export function engineFingerprint(root) {
  const hash = createHash('sha256');
  const files = ['src', 'data'].flatMap(dir => walk(path.join(root, dir)))
    .filter(file => /\.(js|json)$/.test(file))
    .map(file => path.relative(root, file).split(path.sep).join('/'))
    .sort();
  for (const file of files) hash.update(file + '\0').update(readFileSync(path.join(root, file))).update('\0');
  return hash.digest('hex').slice(0, 16);
}
