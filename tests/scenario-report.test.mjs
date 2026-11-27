// «Informe» (informe.html, 1.89; 1.90 after docs/AUDITORIA-INFORME-1.89-2026-11-27.md): the scenario open in the
// console, and only it (the author, 27/11/2026: the settings are tuned for one system, so the others would only add
// noise). Its figures are the engine's; it says why it breaks, when help is needed and who pays; every change the
// reader made is listed, the mix and the dated measures included.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { settingsPatch } from '../src/shared/settings-panel.js';
import { mixPatch } from '../src/domain/consola-measures.js';
import { buildScenarioReport, reportYears, reportCharts } from '../src/domain/scenario-report.js';

const b = validateConfig(DEFAULT_CONFIG);
const todayRun = simulate(b);
const today = buildScenarioReport({ config: b }, todayRun);
const mixed = validateConfig({ ...b, ...settingsPatch('system', 'mixedGradual', b) });
const tuned = validateConfig({ ...mixed, ...mixPatch(mixed, 'ndc', 50), retirementAge: 67, feeRate: 0.006,
  fiscalRescues: [{ year: 2030, vatGeneralRate: 0.22, vatReducedRate: 0.1, vatSuperReducedRate: 0.04, irpfExtraPoints: 0.025, irpfThreshold: 30000 }] });
const tunedRun = simulate(tuned);
const report = buildScenarioReport({ config: tuned, selectedYear: 2045, limits: { maxDebtGDP: 150, maxPensionGapGDP: 2.5, minReplacementRate: 40 } }, tunedRun, { name: 'Prueba' });

test('only the open scenario: the page never runs another system', () => {
  const page = readFileSync(new URL('../src/pages/informe.js', import.meta.url), 'utf8');
  const data = readFileSync(new URL('../src/domain/scenario-report.js', import.meta.url), 'utf8');
  for (const text of [page, data]) assert.doesNotMatch(text, /loadComparison|comparisonConfigs|comparison-systems/);
  assert.equal((page.match(/simulateAsync\(/g) ?? []).length, 1, 'one run: the scenario');
  assert.equal(report.system, 'mixedGradual');
});

test('the table is the engine\'s, with the consulted year and the years of the break, the rescue and the haircut', () => {
  const v = today.why.aftermath;
  assert.deepEqual(today.rows.map(r => r.year), reportYears(2050, today.verdict.breakYear, v.bailoutYear, v.restructuringYear));
  assert.ok(today.rows.some(r => r.year === v.bailoutYear) && today.rows.some(r => r.year === v.restructuringYear));
  for (const r of today.rows) assert.equal(r.debtGDP, todayRun.years.find(p => p.year === r.year).debtGDP);
  // The payable pension only differs from the rescue on, not from the break.
  const at = y => today.rows.find(r => r.year === y);
  assert.equal(at(today.verdict.breakYear).payableMonthly, at(today.verdict.breakYear).pensionMonthly);
  assert.ok(at(2060).payableMonthly < at(2060).pensionMonthly && today.payableDiffers);
});

test('why it breaks, when help is needed, and who pays', () => {
  assert.equal(today.verdict.state, 'breaks');
  assert.ok(today.why.firing.length >= 1 && today.why.firing.every(f => /umbral|mínimo/.test(f)), 'the indicators that fire');
  assert.ok(today.why.rule.length > 0);
  const years = today.milestones.map(m => m.year);
  assert.deepEqual(years, [...years].sort((a, c) => a - c), 'in order');
  assert.ok(today.milestones.some(m => m.label === 'Se rompe' && m.year === today.verdict.breakYear));
  for (const f of [...today.funding, ...report.funding]) {
    assert.ok(Math.abs(f.contributions + f.taxes + f.missing - f.cost) < 1e-6, `${f.year}: contributions, taxes and the gap add up to the cost`);
    assert.ok(Math.abs(f.legacy + f.payg + f.ndc + f.other - f.cost) < 0.05, `${f.year}: the public pensions paid are the cost`);
  }
  assert.ok(report.funding.some(f => f.transition > 0), 'a move to a fund has a transition cost');
  for (const a of today.accounts) assert.ok(Math.abs(a.revenue - a.spending - a.balance) < 0.2, `${a.year}: revenue − spending ≈ balance`);
});

test('every change of the reader is listed: settings, mix, dated measures and limits, with their decimals', () => {
  assert.equal(today.unchanged, true);
  assert.equal(buildScenarioReport({ config: mixed }, simulate(mixed)).unchanged, true, 'choosing a system alone changes nothing');
  const items = report.changes.flatMap(c => c.items.map(i => [i.name, i.value, i.start]));
  assert.deepEqual(items.find(i => i[0] === 'Edad de jubilación'), ['Edad de jubilación', '67 años', '65 años']);
  assert.deepEqual(items.find(i => i[0] === 'Comisión de gestión del fondo').slice(1).map(x => x.replace(/\s/g, ' ')), ['0,6 % al año', '0,5 % al año']);
  assert.equal(report.mix.value, 'Reparto 25 % · Nocionales 50 % · Fondo 25 %');
  assert.equal(report.mix.inert, false, 'in Mixto con ahorro propio the mix acts');
  assert.deepEqual(report.calendars[0].rows[0].slice(0, 2), ['2030', '22']);
  assert.ok(report.calendars[0].rows[0].includes('2,5'), 'IRPF 2,5 points, not 3');
  assert.deepEqual(report.limits, [{ name: 'Lo que puede faltar para pensiones', value: '2,5 % PIB', start: '5 % PIB' }]);
  assert.equal(report.unchanged, false);
});

test('the assumptions are this scenario\'s, with its values, and speak of no other system (review of 1.90)', () => {
  const texts = report.assumptions.map(a => a.text).join(' ');
  assert.match(texts.replace(/\s/g, ' '), /comisión del 0,6 %/, 'its fee, not the default');
  assert.doesNotMatch(texts + report.systemText.what, /Todos los sistemas|en todos los sistemas|referencia del laboratorio/);
  const cut = validateConfig({ ...b, payablePensionCut: 0.2 });
  const payable = buildScenarioReport({ config: cut }, todayRun).verdictAssumptions.find(a => a.name === 'Pensión pagable desde el rescate');
  assert.match(payable.value.replace(/\s/g, ' '), /20 % menos/);
  assert.ok(!today.milestones.some(m => /para pagarlas/.test(m.label)), 'new debt is not «for pensions»');
  assert.ok(report.funding.every(f => Math.abs(f.contributions + f.taxes + f.missing - f.cost) < 1e-6), 'the transition is not part of the sum');
});

test('the break is drawn where it happens: the debt and the indicator that crosses its threshold (1.91)', () => {
  const y = today.verdict.breakYear;
  const deciding = today.charts.filter(c => c.deciding);
  assert.ok(deciding.length >= 1 && deciding.every(c => c.mark && c.threshold && c.points), 'a chart for the deciding indicator, with its threshold');
  for (const c of deciding) {
    const value = yr => c.points.find(([year]) => year === yr)?.[1];
    assert.ok(value(y) > c.threshold.value && !(value(y - 1) > c.threshold.value), `${c.title}: crosses ${c.threshold.value} in ${y}`);
  }
  assert.deepEqual(today.charts.filter(c => c.mark).map(c => c.id), ['debt', ...deciding.map(c => c.id)], 'no red line on the pension charts');
  // A pension break marks the pension against its floor, and not the debt.
  const pension = reportCharts(todayRun, { breakYear: 2060, failure: 'pension', floor: 40 });
  assert.deepEqual(pension.filter(c => c.mark).map(c => c.id), ['ratio']);
  assert.equal(pension.find(c => c.id === 'ratio').threshold.value, 40);
  assert.ok(!reportCharts(todayRun).some(c => c.mark || c.deciding), 'nothing marked when it holds');
});
