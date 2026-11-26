// Employment and inflation until 2030 as the AIReF expects (config.airefShortRunEmployment, src/shared/short-run-employment.js).
// On by default since 1.69; with the starting settings, FTE employment and real GDP grow as the AIReF's in 2027–2030,
// the newcomers stay (more workers and, later, more retirees) and the debt falls. docs/DECISIONES.md, 24/11/2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { SHORT_RUN_EMPLOYMENT, shortRunEntrantFactor, shortRunProductivityLevel } from '../src/shared/short-run-employment.js';

const off = simulate(validateConfig({ ...DEFAULT_CONFIG, airefShortRunEmployment: 0 })).years;
const on = simulate(validateConfig(DEFAULT_CONFIG)).years;
const at = (years, y) => years.find(r => r.year === y);
const growth = (years, y, f) => 100 * (f(at(years, y)) / f(at(years, y - 1)) - 1);

test('on by default since 1.69, and the helpers do nothing when off', () => {
  assert.equal(DEFAULT_CONFIG.airefShortRunEmployment, 1);
  const off = { ...DEFAULT_CONFIG, airefShortRunEmployment: 0 };
  assert.equal(shortRunEntrantFactor(2028, off), 1);
  assert.equal(shortRunProductivityLevel(2030, off), 1);
  assert.equal(shortRunEntrantFactor(2031, { airefShortRunEmployment: 1 }), 1, 'only 2027–2030');
});

test('on, employment and real GDP grow as the AIReF\'s in 2027–2030 (starting settings)', () => {
  for (const y of [2027, 2028, 2029, 2030]) {
    assert.ok(Math.abs(growth(on, y, p => p.workers) - SHORT_RUN_EMPLOYMENT.target.employmentFTE[y]) < 0.02, `${y} employment`);
    assert.ok(Math.abs(growth(on, y, p => p.gdp) - SHORT_RUN_EMPLOYMENT.target.realGDP[y]) < 0.02, `${y} real GDP`);
  }
  assert.equal(at(on, 2026).debtGDP, at(off, 2026).debtGDP, '2026 is the opening');
  // Prices follow the AIReF deflator in 2027–2030, then the scenario's inflation.
  for (const y of [2027, 2028, 2029, 2030]) assert.ok(Math.abs(growth(on, y, p => p.priceIndex) / 100 - SHORT_RUN_EMPLOYMENT.inflation[y]) < 1e-9, `${y} prices`);
  assert.ok(Math.abs(growth(on, 2031, p => p.priceIndex) / 100 - DEFAULT_CONFIG.inflationRate) < 1e-9, '2031 prices');
});

test('the newcomers stay: more workers and later more retirees; the debt falls', () => {
  assert.ok(at(on, 2050).workers > at(off, 2050).workers * 1.02);
  assert.ok(at(on, 2070).retirees > at(off, 2070).retirees);
  assert.ok(at(on, 2050).debtGDP < at(off, 2050).debtGDP - 3);
  assert.ok(at(on, 2070).debtGDP < at(off, 2070).debtGDP - 8);
});
