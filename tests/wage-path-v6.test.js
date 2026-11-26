import test from 'node:test';
import assert from 'node:assert/strict';
import { createWagePathV6 } from '../src/wage-path-v6.js';
import { WAGE_FORECAST_V6 } from '../data/wage-forecast-v6.js';

const base = Object.freeze({ wage: 30_000 });
const realIndices = Object.freeze({
  2026: 1,
  2027: 1.012,
  2028: 1.012 * 1.025,
  2029: 1.012 * 1.025 * .99
});
const demographics = Object.freeze({
  referenceWage(year, deviation = 0) {
    return base.wage * realIndices[year] * (1 + deviation) ** (year - 2026);
  }
});
const close = (actual, expected) => assert.ok(
  Math.abs(actual - expected) <= 1e-11 * Math.max(1, Math.abs(expected)),
  `${actual} differs from ${expected}`
);

test('identified 2027 nominal wage growth preserves the opening level and deflates once', () => {
  const path = createWagePathV6(base, demographics);
  const factor = WAGE_FORECAST_V6.nominalWageIndexByYear[2027];
  assert.equal(path.productionWage(2026, .005, { inflationRate: .08 }), base.wage);
  for (const inflationRate of [.02, .08]) {
    const realWage = path.productionWage(2027, 0, { inflationRate });
    close(realWage * (1 + inflationRate) / base.wage, factor);
    close(path.productionWage(2027, .005, { inflationRate }), realWage * 1.005);
  }
});

test('after 2027 the inherited real rates resume; external CPI does not extend the nominal forecast', () => {
  const path = createWagePathV6(base, demographics);
  const config = { inflationRate: .02 };
  const wage27 = path.productionWage(2027, 0, config);
  close(path.productionWage(2028, 0, config) / wage27, 1.025);
  close(path.productionWage(2029, 0, config) / path.productionWage(2028, 0, config), .99);
  const rows = Object.freeze([
    Object.freeze({ year: 2026, consumerPriceIndex: 1 }),
    Object.freeze({ year: 2027, consumerPriceIndex: 1.04 }),
    Object.freeze({ year: 2028, consumerPriceIndex: 1.04 * 1.01 }),
    Object.freeze({ year: 2029, consumerPriceIndex: 1.04 * 1.01 * 1.03 })
  ]);
  const external = createWagePathV6(base, demographics, rows);
  const real = external.conditionedRows.map(row => row.nominalWageIndex / row.consumerPriceIndex);
  close(real[1], WAGE_FORECAST_V6.nominalWageIndexByYear[2027] / 1.04);
  close(real[2] / real[1], 1.025);
  close(real[3] / real[2], .99);
  assert.ok(rows.every(row => !Object.hasOwn(row, 'nominalWageIndex')));
});

test('an explicit complete external nominal wage path takes priority without altering its rows', () => {
  const rows = Object.freeze([
    Object.freeze({ year: 2026, consumerPriceIndex: 1, nominalWageIndex: 1 }),
    Object.freeze({ year: 2027, consumerPriceIndex: 1.03, nominalWageIndex: 1.06 }),
    Object.freeze({ year: 2028, consumerPriceIndex: 1.05, nominalWageIndex: 1.075 })
  ]);
  const path = createWagePathV6(base, demographics, rows);
  assert.equal(path.conditionedRows, rows);
  assert.equal(path.conditionedRows[1].nominalWageIndex, 1.06);
  assert.equal(path.assumptions.suppliedNominalWagesTakePriority, true);
});
