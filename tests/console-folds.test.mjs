// The console folds the settings that change nothing with the scenario (1.87, docs/DECISIONES.md, 26/11/2026):
// those of other systems and those that wait for a decision. Nothing is lost, the order is the catalogue's,
// a folded value is kept, and a folded change is still counted on its fold.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { SETTINGS_CHAPTERS } from '../src/shared/settings-catalog.js';
import { settingsPatch } from '../src/shared/settings-panel.js';
import { originWithSystem } from '../src/shared/scenario-labels.js';
import { ROWS, splitRows, FOLDS, foldTitle, rowChanged } from '../src/shared/console-rows.js';

const SYSTEMS = ['payg', 'ndc', 'progressive', 'mixedGradual', 'retro1985'];
const withSystem = (system, extra = {}) => {
  const base = validateConfig({ ...DEFAULT_CONFIG, ...extra });
  return validateConfig({ ...base, ...settingsPatch('system', system, base) });
};
const keys = rows => rows.map(r => r.entry.key);
const fold = kind => FOLDS.find(f => f.kind === kind);

test('every chapter, every system: the three groups add up to the chapter, in its order, with no row twice', () => {
  const variants = [{}, { fundedExtraContribution: 0.02 }, { closingClause: 'off' }, { aiAutomationShare: 0.2 }, { contributionRate: 0.3 }];
  for (const system of SYSTEMS) for (const extra of variants) {
    const config = withSystem(system, extra);
    for (const c of SETTINGS_CHAPTERS) {
      const rows = ROWS.filter(r => r.entry.chapter === c.id);
      const { acting, otherSystems, waiting } = splitRows(rows, config);
      const all = [...acting, ...otherSystems, ...waiting];
      assert.equal(all.length, rows.length, `${system} ${c.id}`);
      assert.equal(new Set(all).size, rows.length, `${system} ${c.id}: no row twice`);
      for (const group of [acting, otherSystems, waiting]) {
        const at = group.map(r => rows.indexOf(r));
        assert.deepEqual(at, [...at].sort((a, b) => a - b), `${system} ${c.id}: the catalogue's order`);
      }
    }
  }
});

test('in Reparto the fund settings fold, and an extra contribution brings where it invests and its fee back', () => {
  const chapter = ROWS.filter(r => r.entry.chapter === SETTINGS_CHAPTERS[0].id);
  const plain = splitRows(chapter, withSystem('payg'));
  assert.ok(keys(plain.acting).includes('system') && keys(plain.acting).includes('fundedExtraContribution'));
  for (const key of ['transitionCutoffAge', 'feeRate', 'capitalizationStyle', 'mix']) assert.ok(keys(plain.otherSystems).includes(key), key);
  const extra = splitRows(chapter, withSystem('payg', { fundedExtraContribution: 0.02 }));
  for (const key of ['feeRate', 'capitalizationStyle']) assert.ok(keys(extra.acting).includes(key), key);
  // The Mixto progresivo uses them: they are in sight.
  const progressive = splitRows(chapter, withSystem('progressive'));
  for (const key of ['transitionCutoffAge', 'feeRate', 'capitalizationStyle']) assert.ok(keys(progressive.acting).includes(key), key);
});

test('a setting that waits for a decision folds until it is taken', () => {
  const waitingKeys = config => keys(splitRows(ROWS, config).waiting);
  const today = withSystem('payg');
  const ai = ROWS.find(r => r.entry.key === 'automationTargetYear');
  assert.ok(ai, 'the catalogue still has it');
  assert.ok(waitingKeys(today).includes('automationTargetYear'));
  assert.ok(!waitingKeys(withSystem('payg', { aiAutomationShare: 0.2 })).includes('automationTargetYear'));
});

test('a folded value is kept and its change is still counted on the fold', () => {
  const chapter = ROWS.filter(r => r.entry.chapter === SETTINGS_CHAPTERS[0].id);
  const config = withSystem('payg', { feeRate: 0.01 });
  assert.equal(config.feeRate, 0.01, 'kept');
  const { otherSystems } = splitRows(chapter, config);
  const baseline = originWithSystem(config, DEFAULT_CONFIG);
  const changed = otherSystems.filter(r => rowChanged(r, config, baseline));
  assert.deepEqual(keys(changed), ['feeRate']);
  assert.equal(foldTitle(fold('otherSystems'), otherSystems.length, changed.length), `Ajustes de otros sistemas (${otherSystems.length} · 1 cambiado)`);
  assert.equal(foldTitle(fold('otherSystems'), 3, 2), 'Ajustes de otros sistemas (3 · 2 cambiados)');
  assert.equal(foldTitle(fold('waiting'), 4, 0), 'Sin efecto con tu escenario (4)');
  // Back to a system with a fund, the same value is in sight.
  const notional = validateConfig({ ...config, ...settingsPatch('system', 'ndc', config) });
  assert.equal(notional.feeRate, 0.01);
  assert.ok(keys(splitRows(chapter, notional).otherSystems).includes('feeRate'));
});

test('each fold says why its settings are there', () => {
  const config = withSystem('payg');
  const { otherSystems, waiting } = splitRows(ROWS, config);
  assert.match(fold('otherSystems').note(otherSystems, config), /^No cambian nada con «Reparto»/);
  assert.match(fold('waiting').note(waiting, config), /Se conservan/);
});

test('in Reparto the note says the fund\'s fee and investment come back with an extra contribution too', () => {
  const config = withSystem('payg');
  const chapter = ROWS.filter(r => r.entry.chapter === SETTINGS_CHAPTERS[0].id);
  assert.match(fold('otherSystems').note(splitRows(chapter, config).otherSystems, config), /cotización adicional/);
  const progressive = withSystem('progressive');
  assert.doesNotMatch(fold('otherSystems').note(splitRows(ROWS, progressive).otherSystems, progressive), /cotización adicional/);
});

test('while calculating, the verdict names the new system and says whose the figures still are (1.87.1)', async () => {
  const { calculatingText } = await import('../src/shared/console-rows.js');
  const payg = withSystem('payg'), mixed = withSystem('mixedGradual');
  assert.deepEqual(calculatingText(mixed, payg), { headline: 'Calculando «Mixto con ahorro propio»…', detail: 'Hasta que termine, los gráficos y la tabla son aún de «Reparto».',
    legend: 'Continua: el escenario anterior, «Reparto». Discontinua: reglas de hoy.' });
  assert.equal(calculatingText(withSystem('payg', { retirementAge: 67 }), payg).detail, 'Hasta que termine, los gráficos y la tabla son del escenario anterior.');
  assert.deepEqual(calculatingText(payg), { headline: 'Calculando «Reparto»…', detail: '', legend: '' });
  assert.match(calculatingText(withSystem('retro1985'), payg).headline, /^Calculando «Si el mixto/);
});
