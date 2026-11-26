import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRetrospective1985, RETROSPECTIVE_1985_ASSUMPTIONS } from '../src/retrospective-model-1985.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { FLAGSHIP_RETRO_1985 } from '../src/shared/scenario-labels.js';
import { describeNominalMoneyFlow } from '../src/fiscal-display-v9.js';
import { ledgerFailures, ledgerTolerance } from './helpers/ledger.mjs';

const config = { ...DEFAULT_CONFIG, ...FLAGSHIP_RETRO_1985 };
let baseline;
const reference = () => baseline ??= simulateRetrospective1985(config);
function close(actual, expected, message) {
  const tolerance = ledgerTolerance(actual, expected);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} != ${expected}`);
}

test('retrospective carries one ledger from a zero-funded 1984 opening through 2070', () => {
  const result = reference();
  const all = [...result.historicalYears.filter(point => point.year < 2026), ...result.years];
  assert.equal(all.length, 87);
  assert.equal(all[0].year, 1984);
  assert.equal(all[0].fundedAssets, 0);
  assert.equal(all[0].notionalBalance, 0);
  assert.equal(all[0].cash, 0);
  close(all[0].debt / all[0].gdp, RETROSPECTIVE_1985_ASSUMPTIONS.openingDebtGDP, 'explicit opening debt');
  assert.equal(result.historicalYears.at(-1), result.years[0]);
  assert.deepEqual(result.historical1985.map(point => point.year), [1985, 1995, 2000, 2008, 2012, 2020, 2026]);
  // The books, year after year (tests/helpers/ledger.mjs, shared with the forward engine).
  assert.deepEqual(ledgerFailures(all).slice(0, 5), []);
  for (let i = 1; i < all.length; i++) {
    const p = all[i];
    assert.equal(p.fundedExternalContributions, 0);
    assert.equal(p.fundedReserveTransfers, 0);
  }
  for (const year of [2025, 2026, 2027]) {
    const p = all.find(point => point.year === year);
    assert.doesNotThrow(() => describeNominalMoneyFlow(p, { inflationRate: config.inflationRate, isBase: false }));
  }
  close(result.years[0].priceIndex, 1, '2026 is the price numeraire');
  assert.match(result.assumptions.status, /sintético/);
});

test('no funded allocation creates no fund, return, payout or new-award backpack', () => {
  const result = simulateRetrospective1985({ ...config, mix: { payg: 0, ndc: 1, funded: 0 }, transitionTargetFunded: 0 });
  for (const point of [...result.historicalYears, ...result.years]) {
    for (const key of ['fundedAssets', 'fundedContributions', 'fundedInvestmentReturn', 'fundedBenefits', 'newAwardFundedCapitalPerRetiree']) {
      assert.equal(point[key], 0, `${key} ${point.year}`);
    }
  }
});

test('changing returns changes calculated 2026 outcomes without a pension or debt target', () => {
  const low = simulateRetrospective1985({ ...config, realReturn: 0 });
  const normal = reference();
  assert.ok(low.years[0].fundedAssets < normal.years[0].fundedAssets);
  assert.notEqual(low.years[0].averagePensionAnnual, normal.years[0].averagePensionAnnual);
  assert.notEqual(low.years[0].pensionGap, 0);
  assert.notEqual(normal.years[0].pensionGap, 0);
  assert.notEqual(normal.years[0].fundedAssetsGDP, 128.4);
});
