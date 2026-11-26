// npm run sim (scripts/sim.mjs): a scenario file the console exports gives, without a browser, the same series
// as the engine, with the stamp; an unknown option is refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { scenarioFile } from '../src/shared/export-files.js';
import { exportStamp } from '../src/shared/citation.js';

const run = args => spawnSync(process.execPath, ['scripts/sim.mjs', ...args], { encoding: 'utf8' });

test('a scenario file gives the engine\'s series, named after the file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pl3-sim-'));
  try {
    const config = validateConfig({ ...DEFAULT_CONFIG, retirementAge: 67 });
    const file = join(dir, 'edad67.json');
    writeFileSync(file, JSON.stringify(scenarioFile({ config, limits: undefined, selectedYear: 2050 }, exportStamp(config, { origin: '' }))));
    const { stdout, stderr, status } = run([file]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /^# Pensiones Lab /);
    // Since 1.76 the age of 67 holds to 2070 (it broke up to 1.75): the line gives the verdict either way.
    assert.match(stderr, /^edad67: Reparto · (se rompe en \d{4}|aguanta hasta 2070) · deuda 2070 \d+ % del PIB/);
    const rows = stdout.split('\n').filter(l => /^\d{4};/.test(l));
    assert.equal(rows.length, 45 * rows.filter(l => l.startsWith('2026;')).length);
    const debt2070 = Number(rows.find(l => l.startsWith('2070;edad67;deuda_pct_pib;')).split(';')[3]);
    assert.ok(Math.abs(debt2070 - simulate(config).years.find(y => y.year === 2070).debtGDP) < 1e-5);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an unknown option is refused', () => {
  const { status, stderr } = run(['--nada']);
  assert.equal(status, 2);
  assert.match(stderr, /Opción desconocida/);
});
