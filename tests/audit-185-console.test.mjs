// Audit 1.85, group «Consola» (docs/AUDITORIA-1.85-2026-11-26.md, findings 15–18 and 23): what the console shows and
// imports is the open scenario's, and an engine error is not run twice. No engine run: the worker is a stand-in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.window ??= { addEventListener() {}, location: { origin: 'https://demarquia.org', pathname: '/pensioneslab/consola.html' } };
const { DEFAULT_CONFIG, validateConfig } = await import('../src/shared/default-config.js');
const { DEFAULT_LIMITS } = await import('../src/sustainability.js');
const { buildModelsXlsxBytes, parseImportedModelFile, extractZipTextEntries, buildZipArchive } = await import('../src/shared/excel-models-io.js');
const M = await import('../src/domain/consola-measures.js');
const { ROWS, rowChanged } = await import('../src/shared/console-rows.js');
const { settingsPatch } = await import('../src/shared/settings-panel.js');
const { TAX_POLICY_ASSUMPTIONS } = await import('../data/tax-policy-assumptions.js');

const TODAY = validateConfig(DEFAULT_CONFIG);

test('15: a new tax row of the Excel keeps today\'s reduced VAT and the Calendario threshold', async () => {
  const bytes = buildModelsXlsxBytes({ state: { config: TODAY, limits: DEFAULT_LIMITS, selectedYear: 2050 } });
  const entries = await extractZipTextEntries(bytes);
  const sheet2 = entries.get('xl/worksheets/sheet2.xml');
  const row = /<row r="(\d+)"[^>]*><c r="A\1"[^>]*><v>2030<\/v><\/c>.*?<\/row>/.exec(sheet2);
  const n = row[1];
  // IVA general 22 % and 2 IRPF points; the threshold column stays empty (0).
  const edited = sheet2.replace(row[0], row[0].replace(`<c r="D${n}"><v>0</v></c>`, `<c r="D${n}"><v>22</v></c>`).replace(`<c r="E${n}"><v>0</v></c>`, `<c r="E${n}"><v>2</v></c>`));
  const files = [...entries.keys()].map(name => ({ name, data: name === 'xl/worksheets/sheet2.xml' ? edited : entries.get(name) }));
  const back = await parseImportedModelFile(buildZipArchive(files), 'editado.xlsx', TODAY);
  const vat = TAX_POLICY_ASSUMPTIONS.baselineVatRates;
  assert.deepEqual(back.config.fiscalRescues, [{ year: 2030, vatGeneralRate: 0.22, vatReducedRate: vat.reduced, vatSuperReducedRate: vat.superReduced,
    irpfExtraPoints: 0.02, irpfThreshold: M.CALENDAR.fiscalRescues.blank.irpfThreshold }]);
});

test('16: «Ricos y empresas» shows the stored measures only when they are in the open scenario', () => {
  const stored = { ...M.SQUEEZE_DEFAULTS, irpfExtraPoints: 0.1, irpfThreshold: 150000 };
  const own = validateConfig(M.squeezePatch(TODAY, stored));
  assert.equal(M.squeezeShownFor(own, stored).irpfExtraPoints, 0.1, 'its own scenario');
  assert.equal(M.squeezeIsOn(M.squeezeShownFor(own, stored)), true, 'badge');
  // «Reglas de hoy», a catalog «Cotización» +1 and someone else's link: defaults and no badge.
  const cotizacion = validateConfig({ ...TODAY, ...settingsPatch('contributionRate', 1, TODAY) });
  const linked = validateConfig(M.squeezePatch(TODAY, { ...M.SQUEEZE_DEFAULTS, irpfExtraPoints: 0.2, irpfThreshold: 60000, corporateSurcharge: 0.3 }));
  for (const [name, config] of [['today', TODAY], ['cotización', cotizacion], ['link', linked]]) {
    assert.deepEqual(M.squeezeShownFor(config, stored), { ...M.SQUEEZE_DEFAULTS }, name);
    assert.equal(M.squeezeIsOn(M.squeezeShownFor(config, stored)), false, `${name} badge`);
  }
  // Changing one field from what is shown keeps the catalog's +1 point out of a squeeze it never had.
  const next = M.squeezePatch(cotizacion, { ...M.squeezeShownFor(cotizacion, stored), mode: 'static' });
  assert.deepEqual(next.fiscalRescues, []);
});

test('17: the box and the Calendario name the base of their cut; the console shows a cut above the box in words', () => {
  const row = ROWS.find(r => r.entry.key === 'paymentAdjustments');
  assert.match(row.unit, /gasto recortable/);
  assert.match(row.hint, /gasto recortable es el resto del gasto público sin sueldos públicos/);
  assert.equal(M.CALENDAR.paymentAdjustments.fields.find(f => f.key === 'otherSpendingCut').unit, '% recortable');
  const page = readFileSync(new URL('../src/pages/consola.js', import.meta.url), 'utf8');
  assert.match(page, /ABOVE_MAX_WHERE\[key\] && c\.format && value > c\.max\) return `<span class="cx-fixed"/);
  assert.match(page, /paymentAdjustments: 'Se cambia en la pestaña «Partidas del Estado» o en «Calendario»\.'/);
  assert.match(page, /del resto del gasto, <strong>\$\{num\(engineOtherCut\(config\) \* 100, 1\)\} %<\/strong> del gasto recortable/);
});

test('18: choosing a system is one change, not its standard transition settings', () => {
  for (const system of ['ndc', 'progressive', 'mixedGradual', 'retro1985']) {
    const config = validateConfig({ ...TODAY, ...settingsPatch('system', system, TODAY) });
    assert.deepEqual(ROWS.filter(r => rowChanged(r, config)).map(r => r.entry.key), ['system'], system);
  }
  const moved = validateConfig({ ...TODAY, ...settingsPatch('system', 'progressive', TODAY), transitionYears: 30 });
  assert.deepEqual(ROWS.filter(r => rowChanged(r, moved)).map(r => r.entry.key), ['system', 'transitionYears']);
  assert.deepEqual(ROWS.filter(r => rowChanged(r, TODAY)), []);
});

// A stand-in for the browser's Worker: answers with an engine error, or dies.
class FakeWorker {
  static mode = 'engine';
  static made = [];
  constructor() { this.on = { message: [], error: [] }; this.terminated = false; FakeWorker.made.push(this); }
  addEventListener(type, fn) { this.on[type].push(fn); }
  postMessage({ id }) {
    setTimeout(() => {
      if (FakeWorker.mode === 'engine') for (const fn of this.on.message) fn({ data: { id, error: 'boom', errorName: 'RangeError' } });
      else for (const fn of this.on.error) fn({});
    }, 0);
  }
  terminate() { this.terminated = true; }
}

test('23: an engine error from the worker reaches the caller; only a dead worker falls back to the main thread', async () => {
  globalThis.Worker = FakeWorker;
  try {
    // The 1985 experiment with a market path: on the main thread it fails at once with its own message.
    const retro = validateConfig({ ...TODAY, ...settingsPatch('system', 'retro1985', TODAY) });
    const runtime = { marketPath: [] };
    FakeWorker.mode = 'engine';
    const a = await import('../src/shared/sim-client.js?engine');
    await assert.rejects(a.simulateWithRuntime(retro, runtime), error => error instanceof RangeError && error.message === 'boom');
    FakeWorker.mode = 'dies';
    FakeWorker.made.length = 0;
    const b = await import('../src/shared/sim-client.js?dies');
    await assert.rejects(b.simulateWithRuntime(retro, runtime), /riesgo de mercado no está disponible/);
    assert.ok(FakeWorker.made.length > 0 && FakeWorker.made.every(w => w.terminated), 'the dead pool is terminated');
  } finally {
    delete globalThis.Worker;
  }
});
