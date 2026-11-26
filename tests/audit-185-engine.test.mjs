// Audit 1.85 (docs/AUDITORIA-1.85-2026-11-26.md), engine group: findings 2, 3, 4 and 22. Finding 1 is in
// tests/career-coverage.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { configErrorText } from '../src/shared/config-error-text.js';
import { createCurrentCohorts } from '../src/current-cohorts-v10.js';
import { CURRENT_SPAIN } from '../data/current-spain-v8.js';
import { RETIREMENT_AGE_WEIGHTS } from '../data/current-pension-stock.js';

test('2: wages far above productivity stop with a message, not a wage bill above GDP', () => {
  assert.throws(() => simulate({ ...DEFAULT_CONFIG, realWageGrowth: 0.04 }),
    e => e instanceof RangeError && /^Este escenario deja la remuneración de los asalariados por encima de la renta que genera el PIB\./.test(e.message)
      && configErrorText(e) === e.message);
});

test('3: other public revenue starts at the console box\'s 5 %, with a message in Spanish', () => {
  for (const taxRevenueGDP of [0, 0.049]) {
    assert.throws(() => simulate({ ...DEFAULT_CONFIG, taxRevenueGDP }), e => {
      assert.match(e.message, /^Invalid taxRevenueGDP: expected 0\.05…0\.6$/);
      assert.match(configErrorText(e), /^«Nivel de los demás ingresos públicos»: ese valor queda fuera/);
      return true;
    });
  }
});

test('4: productivity far above wages names that gap in its message', () => {
  assert.throws(() => simulate({ ...DEFAULT_CONFIG, productivityGrowth: 0.04 }),
    e => e instanceof RangeError && /la productividad crece mucho más que los salarios/.test(e.message));
});

test('22: the life-expectancy link keeps one rule per config object, and a new object with another rule starts again', () => {
  const make = () => createCurrentCohorts({ ...CURRENT_SPAIN.base, baseYear: 2026, endYear: 2070, entryAge: 22, retirementAge: 65,
    careerYears: 43, accruedReplacementRate: .77, retirementAgeWeights: RETIREMENT_AGE_WEIGHTS });
  const third = { ...DEFAULT_CONFIG, retirementAgeLink: 1 / 3 }, full = { ...DEFAULT_CONFIG, retirementAgeLink: 1 };
  const capped = { ...full, retirementAgeCap: 67 };
  const births = Array.from({ length: 45 }, (_, i) => 1961 + i);
  const fresh = config => { const c = make(); return births.map(birthYear => c.linkedAgeOffset({ birthYear }, config)); };
  const want = { third: fresh(third), full: fresh(full), capped: fresh(capped) };
  assert.notDeepEqual(want.third, want.full);
  assert.notDeepEqual(want.full, want.capped);
  const shared = make();
  for (const [name, config] of [['third', third], ['full', full], ['third', { ...third }], ['capped', capped], ['full', full]]) {
    assert.deepEqual(births.map(birthYear => shared.linkedAgeOffset({ birthYear }, config)), want[name], name);
  }
});
