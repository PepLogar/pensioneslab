// 1.64: the fund of the reference Mixto progresivo is common. Same contributions and portfolio
// as a personal one; whoever dies before retiring leaves their share in the fund, and it
// never reaches the public accounts (docs/PROPUESTA-FONDO-SOBERANO-2026-11-07.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, STATE_VERSION } from '../src/shared/default-config.js';
import { FLAGSHIP_PROGRESSIVE, COMMON_FUND_STYLE, isCommonFund, MIXED_GRADUAL, FLAGSHIP_RETRO_1985 } from '../src/shared/scenario-labels.js';
import { configForStateVersion } from '../src/risk-state-migration.js';
import { CAPITALIZATION_STYLES, CAPITALIZATION_STYLE_META, cohortCapitalizationReturns } from '../src/progressive-transition.js';
import { validateConfig } from '../src/model-current-v10.js';

const common = { ...DEFAULT_CONFIG, ...FLAGSHIP_PROGRESSIVE };
const personal = { ...common, capitalizationStyle: 'dividend-endowment' };
const sum = (result, key) => result.years.reduce((total, point) => total + (point[key] ?? 0), 0);

test('only the reference Mixto progresivo has a common fund', () => {
  assert.equal(FLAGSHIP_PROGRESSIVE.capitalizationStyle, COMMON_FUND_STYLE);
  assert.ok(isCommonFund(common));
  for (const config of [DEFAULT_CONFIG, MIXED_GRADUAL, FLAGSHIP_RETRO_1985]) assert.equal(isCommonFund(config), false);
  assert.ok(CAPITALIZATION_STYLES.includes(COMMON_FUND_STYLE));
  assert.ok(CAPITALIZATION_STYLE_META[COMMON_FUND_STYLE]);
  assert.equal(validateConfig(common).capitalizationStyle, COMMON_FUND_STYLE);
});

test('it earns what the personal fund with the same portfolio earns', () => {
  for (const age of [30, 60, 70]) {
    const args = { age, year: 2040 };
    assert.deepEqual(cohortCapitalizationReturns({ ...args, config: common }), cohortCapitalizationReturns({ ...args, config: personal }));
  }
});

test('nobody inherits, and the fund ledger still closes', () => {
  const shared = simulate(common), own = simulate(personal);
  assert.equal(sum(shared, 'fundedBequests'), 0);
  assert.ok(sum(shared, 'fundedPooledBalances') > 0);
  assert.ok(sum(own, 'fundedBequests') > 0);
  assert.equal('fundedPooledBalances' in own.years.at(-1), false);
  for (const point of shared.years) {
    assert.ok(Math.abs(point.fundedBalanceResidual) < 1, `fondo ${point.year}`);
    // One contribution, one destination: what enters the fund does not pay this year's pensions.
    assert.ok(Math.abs(point.contributionAllocationResidual) < 1, `aportación ${point.year}`);
  }
});

test('what stays in the fund reaches pensions, not the public accounts', () => {
  const shared = simulate(common).years.at(-1), own = simulate(personal).years.at(-1);
  assert.ok(shared.fundedAssets > own.fundedAssets);
  assert.ok(shared.averagePensionAnnual > own.averagePensionAnnual);
  assert.ok(Math.abs(shared.debtGDP - own.debtGDP) < 0.5);
});

test('a saved reference recipe moves to the common fund; the reader\'s own rules stay', () => {
  const saved = { ...common, capitalizationStyle: 'lifecycle-ap7' };
  assert.equal(configForStateVersion(saved, 31).capitalizationStyle, COMMON_FUND_STYLE);
  assert.equal(configForStateVersion(saved, STATE_VERSION).capitalizationStyle, 'lifecycle-ap7');
  for (const change of [{ transitionCutoffAge: 50 }, { transitionTargetFunded: 0.4 }, { transitionNdcShare: 0.5 }, { capitalizationStyle: 'balanced-standard' }, { transitionMode: 'cohort-ramp' }]) {
    const own = { ...saved, ...change };
    assert.equal(configForStateVersion(own, 31).capitalizationStyle, own.capitalizationStyle);
  }
});

test('the calendar recipe of 1.62 reaches the common fund through every step', () => {
  const old = { ...common, transitionMode: 'two-stage-relay', capitalizationStyle: 'lifecycle-ap7' };
  const moved = configForStateVersion(old, 30);
  assert.equal(moved.transitionMode, 'pension-runoff');
  assert.equal(moved.capitalizationStyle, COMMON_FUND_STYLE);
});
