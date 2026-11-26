import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, BASE_YEAR } from '../src/shared/default-config.js';
import { pensionToWage, describeSustainability } from '../src/sustainability.js';
import { describePensionAdequacy } from '../src/shared/crisis-narrative.js';
import { firstOutsideYear } from '../src/domain/consola-measures.js';

const NO_LIMIT = { maxDebtGDP: 500, maxPensionGapGDP: 30 };

test('pensionToWage: replacement rate plus twelve dividends and the bonus, over the wage', () => {
  assert.equal(pensionToWage({ replacementRate: 0.5, wage: 30000 }), 0.5);
  const future = { citizenDividendEffectiveMonthly: 100, citizenDividendMonthly: 999, demarquiaPensionBonusAnnual: 1800 };
  assert.ok(Math.abs(pensionToWage({ replacementRate: 0.3, wage: 30000, futureScenario: future }) - 0.4) < 1e-12);
  assert.ok(Math.abs(pensionToWage({ replacementRate: 0.3, wage: 12000, futureScenario: { citizenDividendMonthly: 100 } }) - 0.4) < 1e-12);
  assert.equal(pensionToWage({ replacementRate: 0.3, wage: 0, futureScenario: future }), 0.3);
  assert.equal(pensionToWage({ wage: 30000 }), null);
});

test('default run: the dividend is zero, so the measure is the replacement rate', () => {
  const run = simulate({ ...DEFAULT_CONFIG });
  for (const p of run.years) assert.equal(pensionToWage(p), p.replacementRate, String(p.year));
});

test('with a dividend, adequacy, your limits and sustainability read the same measure', () => {
  const run = simulate({ ...DEFAULT_CONFIG, automationRegime: 'capital-boom-dividend' });
  const late = run.years.at(-1);
  const q = pensionToWage(late);
  assert.ok(q > late.replacementRate, 'the dividend raises the measure');
  // A floor between the replacement rate and the measure: none of the three sees a breach in the last year.
  const floor = (late.replacementRate + q) / 2;
  assert.equal(describePensionAdequacy(run.years, { floor }).path.at(-1).adequate, true);
  const limits = { ...NO_LIMIT, minReplacementRate: floor * 100 };
  assert.equal(describeSustainability(run, limits).years.at(-1).breaches.adequacy, false);
  const lastOnly = { years: [{ ...late, year: BASE_YEAR + 1, debtGDP: 0, pensionGapGDP: 0 }] };
  assert.equal(firstOutsideYear(lastOnly, limits), null);
  // Every year the three agree on the breach of the same floor.
  const adequacy = describePensionAdequacy(run.years, { floor }).path;
  const sustainability = describeSustainability(run, limits).years;
  run.years.forEach((p, k) => {
    assert.equal(adequacy[k].rate, pensionToWage(p), String(p.year));
    assert.equal(sustainability[k].breaches.adequacy, !adequacy[k].adequate, String(p.year));
    const one = { years: [{ ...p, year: BASE_YEAR + 1, debtGDP: 0, pensionGapGDP: 0 }] };
    assert.equal(firstOutsideYear(one, limits) !== null, !adequacy[k].adequate, String(p.year));
  });
});
