// Batch 4 of the adversarial review (docs/REVISION-ADVERSARIAL-2026-11-24.md; docs/DECISIONES.md, 25/11/2026):
// the checks that were missing. The books of the forward engine, the chain of migrations, the shared link,
// equal cache keys giving equal runs, and the size of a saved state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig, STATE_VERSION, CALIBRATION_ID } from '../src/shared/default-config.js';
import { comparisonConfigs, FLAGSHIP_PROGRESSIVE } from '../src/shared/scenario-labels.js';
import { configForStateVersion } from '../src/risk-state-migration.js';
import { encodeScenarioHash, decodeScenarioHash, linkTooLong, SHARE_PARAM } from '../src/shared/share-link.js';
import { simulationKey } from '../src/shared/sim-key.js';
import { ledgerFailures } from './helpers/ledger.mjs';

const MEASURES = {
  paymentAdjustments: [{ year: 2030, publicPensionCut: 0.05, otherSpendingCut: 0.03 }],
  fiscalRescues: [{ year: 2035, vatGeneralRate: 0.25, vatReducedRate: 0.1, vatSuperReducedRate: 0.04, irpfExtraPoints: 0.03, irpfThreshold: 30000 }],
  debtRestructurings: [{ year: 2045, haircut: 0.2, termYears: 20, nominalRate: 0.03, fundedSovereignShare: 0.15, creditorDiscountRate: 0.03 }]
};

test('the forward engine keeps its books in every system and with every measure (34)', () => {
  const cases = [
    ...comparisonConfigs(DEFAULT_CONFIG).map(entry => [entry.key, entry.config]),
    ['payg with cuts, a tax rescue and a haircut', { ...DEFAULT_CONFIG, ...MEASURES }],
    ['progressive with the same measures', { ...DEFAULT_CONFIG, ...FLAGSHIP_PROGRESSIVE, ...MEASURES }]
  ];
  for (const [name, config] of cases) {
    const failures = ledgerFailures(simulate(validateConfig(config)).years);
    assert.deepEqual(failures.slice(0, 5), [], name);
  }
});

test('the migrations chain: each older state moves to every later default it missed (35)', () => {
  const old = { ...DEFAULT_CONFIG, unmodeledTaxesFollowGDP: 0, retirementAgeExitPath: 0, airefShortRunEmployment: 0, retaReform2032: 0 };
  const keys = ['unmodeledTaxesFollowGDP', 'retirementAgeExitPath', 'airefShortRunEmployment', 'retaReform2032'];
  const table = Object.fromEntries([32, 33, 34, 35, 36].map(v => [v, keys.map(k => configForStateVersion(old, v)[k])]));
  assert.deepEqual(table, {
    32: [1, 1, 1, 1],
    33: [0, 1, 1, 1],
    34: [0, 0, 1, 1],
    35: [0, 0, 0, 1],
    36: [0, 0, 0, 0]
  });
  assert.equal(STATE_VERSION, 36);
});

const hashWith = diff => `#${SHARE_PARAM}=${Buffer.from(JSON.stringify(diff)).toString('base64url')}`;

test('a shared link opens what was shared, migrates an older one and says why it refuses one (15, 35)', () => {
  const mine = validateConfig({ ...DEFAULT_CONFIG, retirementAgeExitPath: 0, airefShortRunEmployment: 0, retirementAge: 67 });
  const back = decodeScenarioHash(encodeScenarioHash(mine, DEFAULT_CONFIG), DEFAULT_CONFIG, validateConfig);
  assert.deepEqual(back.config, mine, 'round trip keeps the choices that are off');
  assert.equal(encodeScenarioHash(DEFAULT_CONFIG, DEFAULT_CONFIG), null, 'the origin has no link');
  // A link of state 33 had neither the exit path nor the AIReF short run: it moves to both, as a saved state.
  const older = decodeScenarioHash(hashWith({ retirementAgeExitPath: 0, airefShortRunEmployment: 0, _version: 33, _calibration: CALIBRATION_ID }), DEFAULT_CONFIG, validateConfig);
  assert.deepEqual([older.config.retirementAgeExitPath, older.config.airefShortRunEmployment], [1, 1]);
  // Each refusal is a sentence for the reader, never a silent fall back to the reader's own scenario.
  for (const diff of [{ retirementAge: 67, _calibration: 'otra-base' }, { retirementAge: 67, _version: 999 }, { someFutureKey: 1, _version: STATE_VERSION }]) {
    assert.match(decodeScenarioHash(hashWith(diff), DEFAULT_CONFIG, validateConfig)?.rejected ?? '', /enlace/, JSON.stringify(diff));
  }
  assert.equal(decodeScenarioHash('#otra-cosa', DEFAULT_CONFIG, validateConfig), null, 'no link, nothing to say');
});

test('a link too long to open is flagged before it is offered, and refused with a sentence (15)', () => {
  const years = Array.from({ length: 44 }, (_, i) => 2027 + i);
  const big = validateConfig({ ...DEFAULT_CONFIG,
    paymentAdjustments: years.map(year => ({ year, publicPensionCut: 0.0123, otherSpendingCut: 0.0234 })),
    fiscalRescues: years.slice(0, 24).map(year => ({ year, vatGeneralRate: 0.2234, vatReducedRate: 0.1123, vatSuperReducedRate: 0.0412, irpfExtraPoints: 0.0123, irpfThreshold: 30123 })) });
  const hash = encodeScenarioHash(big, DEFAULT_CONFIG);
  assert.ok(linkTooLong(hash), `length ${hash.length}`);
  assert.match(decodeScenarioHash(hash, DEFAULT_CONFIG, validateConfig).rejected, /demasiado largo/);
  assert.equal(linkTooLong(encodeScenarioHash({ ...DEFAULT_CONFIG, retirementAge: 67 }, DEFAULT_CONFIG)), false);
});

// The same figures: a field one run leaves out and the other writes as 0 counts as equal (the common fund writes
// fundedPooledBalances = 0 even without a funded part).
const runs = new Map();
const runOf = config => { const key = JSON.stringify(validateConfig(config)); if (!runs.has(key)) runs.set(key, figures(simulate(JSON.parse(key)).years)); return runs.get(key); };
const figures = rows => rows.map(row => Object.fromEntries(Object.entries(row).filter(([, v]) => v !== 0 && v != null)));

test('equal cache keys give equal runs for every setting the key leaves out (30)', () => {
  // Under pressure (an earlier age, the frozen exit), so a setting that mattered would show.
  const pressure = { ...DEFAULT_CONFIG, retirementAge: 64, retirementAgeExitPath: 0 };
  const pairs = [
    ['payg: the mix', { ...pressure, system: 'payg' }, { ...pressure, system: 'payg', mix: { payg: 0.4, ndc: 0.3, funded: 0.3 } }],
    ['payg: a transition setting without a transition', { ...pressure, system: 'payg' }, { ...pressure, system: 'payg', transitionYears: pressure.transitionYears + 7, transitionTargetFunded: 0.5 }],
    ['ndc: the portfolio style without a funded part', { ...pressure, system: 'ndc' }, { ...pressure, system: 'ndc', capitalizationStyle: 'common-fund' }],
    ['funded at once: the mix and a transition setting', { ...pressure, system: 'funded', transitionMode: 'none' }, { ...pressure, system: 'funded', transitionMode: 'none', mix: { payg: 0.5, ndc: 0, funded: 0.5 }, transitionCutoffAge: 40 }]
  ];
  for (const [name, a, b] of pairs) {
    assert.equal(simulationKey(a), simulationKey(b), `${name}: same key`);
    assert.deepEqual(runOf(b), runOf(a), `${name}: same run`);
  }
});

test('the browser state is written only within the size it can be read back (17)', async () => {
  const store = new Map();
  globalThis.window ??= { addEventListener() {} };
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  const { MAX_STATE_CHARS, parseStoredState, updateScenario, stateSaveFailed, getState, STORAGE_KEY } = await import('../src/shared/scenario-store.js');
  updateScenario({ config: { ...DEFAULT_CONFIG, retirementAge: 67 } });
  assert.equal(stateSaveFailed(), false);
  assert.equal(parseStoredState(store.get(STORAGE_KEY)).config.retirementAge, 67, 'what is written reads back');
  // A full state with three comparisons, every calendar full, fits.
  const years = Array.from({ length: 44 }, (_, i) => 2027 + i);
  const full = { ...getState(), config: { ...DEFAULT_CONFIG,
    paymentAdjustments: years.map(year => ({ year, publicPensionCut: 0.0123456, otherSpendingCut: 0.0234567 })),
    fiscalRescues: years.map(year => ({ year, vatGeneralRate: 0.2234567, vatReducedRate: 0.1123456, vatSuperReducedRate: 0.0412345, irpfExtraPoints: 0.0123456, irpfThreshold: 30123 })),
    debtRestructurings: years.map(year => ({ year, haircut: 0.0123456, termYears: 20, nominalRate: 0.0312345, fundedSovereignShare: 0.15, creditorDiscountRate: 0.03 })) } };
  full.saved = [1, 2, 3].map(id => ({ id: String(id), name: `c${id}`, config: full.config, limits: full.limits }));
  const raw = JSON.stringify(full);
  assert.ok(raw.length < MAX_STATE_CHARS, `full state ${raw.length}`);
  assert.equal(parseStoredState(raw).saved.length, 3);
  // Over the limit, load() refuses it; save() checks the same limit before writing (src/shared/scenario-store.js).
  assert.throws(() => parseStoredState(raw + ' '.repeat(MAX_STATE_CHARS)), /demasiado grande/);
});
