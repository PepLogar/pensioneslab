import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LIMITS, validateLimits, describeSustainability } from '../src/sustainability.js';

const point = (year, patch = {}) => ({ year, pensionGap: 0, pensionGapGDP: 0,
  stateBalance: 0, debt: 0, debtGDP: 0, cash: 0, fundedAssets: 0,
  replacementRate: 0.6, closingRetirementCount: 100,
  openingDebtReal: 0, openingCashReal: 0, retiredDeaths: 0, ...patch });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test('límites parciales conservan precisión y rechazan entradas inválidas sin coerción', () => {
  const defaults = validateLimits();
  assert.deepEqual(defaults, DEFAULT_LIMITS);
  assert.notEqual(defaults, DEFAULT_LIMITS);
  assert.deepEqual(validateLimits({ maxDebtGDP: 150.123456 }), { ...DEFAULT_LIMITS, maxDebtGDP: 150.123456 });
  assert.deepEqual(validateLimits({ maxDebtGDP: 500, maxPensionGapGDP: 30, minReplacementRate: 0 }),
    { maxDebtGDP: 500, maxPensionGapGDP: 30, minReplacementRate: 0 });
  for (const input of [null, [], { maxDebtGDP: NaN }, { maxDebtGDP: Infinity },
    { maxDebtGDP: '150' }, { maxDebtGDP: -1 }, { maxDebtGDP: 500.01 },
    { maxPensionGapGDP: 30.01 }, { minReplacementRate: 100.01 },
    { unknown: 1 }, JSON.parse('{"__proto__":{}}')]) assert.throws(() => validateLimits(input));
  let read = false;
  assert.throws(() => validateLimits({ get maxDebtGDP() { read = true; return 150; } }), /accessor/);
  assert.equal(read, false);
});

test('caja y nueva deuda usan aperturas reales y no confunden inflación con financiación', () => {
  const years = [point(2022, { cash: 110 }),
    point(2023, { openingCashReal: 100, cash: 85, stateBalance: -15 }),
    point(2024, { openingCashReal: 85 / 1.1, cash: 0, debt: 10, stateBalance: -(85 / 1.1 + 10) }),
    point(2025, { openingDebtReal: 10 / 1.1, debt: 12, stateBalance: -(12 - 10 / 1.1) })];
  const described = describeSustainability({ years });
  assert.equal(described.years[0].newBorrowing, null);
  assert.equal(described.years[0].cashUsed, null);
  assert.equal(described.years[0].newRetirements, null);
  assert.equal(described.years[1].cashUsed, 15);
  assert.equal(described.years[1].newBorrowing, 0);
  close(described.years[2].cashUsed, 85 / 1.1);
  assert.equal(described.years[2].newBorrowing, 10);
  close(described.years[3].newBorrowing, 12 - 10 / 1.1);
  assert.equal(described.years[3].cashUsed, 0);
  assert.equal(described.years[1].status, 'pressure');
});

test('base excluida de primeros eventos, fronteras estrictas y tolerancia sólo monetaria', () => {
  const result = { years: [point(2022, { debtGDP: 200, pensionGapGDP: 6, pensionGap: 60, replacementRate: 0.3 }),
    point(2023, { debtGDP: 150, pensionGapGDP: 5, pensionGap: 50, replacementRate: 0.4,
      closingRetirementCount: 105, retiredDeaths: 2 }),
    point(2024, { debtGDP: 150.001, pensionGapGDP: 5.001, replacementRate: 0.39999,
      closingRetirementCount: 105 }),
    point(2025, { pensionGap: -12, stateBalance: -1e-7, closingRetirementCount: 105 })] };
  const described = describeSustainability(result);
  assert.equal(described.years[0].status, 'base');
  assert.deepEqual(described.years[1].breaches, { debt: false, pensionGap: false, adequacy: false });
  assert.equal(described.years[1].status, 'pressure');
  assert.equal(described.years[1].newRetirements, 7);
  assert.deepEqual(described.years[2].breaches, { debt: true, pensionGap: true, adequacy: true });
  assert.equal(described.firstPensionNeedYear, 2023);
  assert.equal(described.firstBreachYear, 2024);
  assert.equal(described.peakNeed, 60);
  assert.equal(described.peakDebtGDP, 200);
  assert.equal(described.years[3].status, 'within');
  assert.equal(described.years[3].label, 'Dentro de tus límites');
  assert.equal(described.years[3].pensionMargin, 12);
  const onlyBase = describeSustainability({ years: [result.years[0]] });
  assert.equal(onlyBase.firstBreachYear, null);
  assert.equal(onlyBase.firstPensionNeedYear, null);
  assert.throws(() => describeSustainability({ years: [point(2022, { replacementRate: null })] }), /replacementRate/);
  assert.throws(() => describeSustainability({ years: [point(2022), point(2023, { openingDebtReal: undefined })] }), /openingDebtReal/);
});

test('idénticas cuentas reciben idénticos criterios en los cuatro sistemas sin compensar activos privados', () => {
  const reports = ['payg', 'ndc', 'funded', 'mixed'].map((system, index) => {
    const result = { config: { system }, years: [point(2022), point(2023, {
      pensionGap: 20, pensionGapGDP: 6, stateBalance: -20,
      debt: 20, debtGDP: 160, fundedAssets: index * 1e12, notionalBalance: index * 2e12
    })] };
    const before = structuredClone(result), report = describeSustainability(result);
    assert.deepEqual(result, before);
    assert.equal(report.years[1].privateReserve, index * 1e12);
    assert.equal(report.years[1].newBorrowing, 20);
    return { ...report, years: report.years.map(({ privateReserve, ...rest }) => rest) };
  });
  for (const report of reports) assert.deepEqual(report, reports[0]);
  assert.equal(reports[0].years[1].status, 'outside');
});
