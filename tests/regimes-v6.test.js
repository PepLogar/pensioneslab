import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_SPAIN } from '../data/current-spain-v6.js';
import { REGIMES_V6 as R } from '../data/regimes-v6.js';
import { CONTRIBUTION_BASES_V5 as RG } from '../data/contribution-bases-v5.js';
import { createCurrentPolicyV5 } from '../src/current-policy-v5.js';
import { createCurrentPolicyV6, meiRate } from '../src/current-policy-v6.js';

// Pure policy arithmetic. No simulation imports or external forecast targets.
const base = CURRENT_SPAIN.base;
const payroll0 = base.workers * base.wage;
const config = Object.freeze({ contributionRate: base.ordinaryPensionPool / payroll0,
  inflationRate: .02, pensionRevaluationMode: 'cpi', pensionRevaluationRate: 0 });
const nominalWageIndex = year => 1.35 ** ((year - 2026) / 5);
const priceIndex = year => 1.02 ** (year - 2026);
const options = { nominalWageIndex, priceIndex };
const previous = createCurrentPolicyV5(base, options);
const central = createCurrentPolicyV6(base, options);
const sensitivity = createCurrentPolicyV6(base, { ...options, selfEmployedBaseMode: 'constant-real' });
function close(actual, expected, tolerance = .01) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}`);
}

test('central retains v5 exactly and the RETA sensitivity preserves the common opening', () => {
  for (const year of [2026, 2027, 2031]) {
    assert.deepEqual(central.contributionRates(year, config), previous.contributionRates(year, config));
    const old = previous.baseResponse(year, config), current = central.baseResponse(year, config);
    for (const key of Object.keys(old)) assert.equal(current[key], old[key]);
    assert.equal(current.retaOrdinaryAdjustmentDelta, 0);
    assert.equal(current.retaMeiAdjustmentDelta, 0);
  }
  assert.deepEqual(sensitivity.contributionRates(2026, config), central.contributionRates(2026, config));
  assert.throws(() => createCurrentPolicyV6(base, { ...options, selfEmployedBaseMode: 'invented' }), RangeError);
});

test('constant real RETA base replaces only RETA wage growth and applies employment and MEI once', () => {
  for (const year of [2027, 2031]) {
    const wage = nominalWageIndex(year), prices = priceIndex(year);
    const response = sensitivity.baseResponse(year, config);
    const oldResponse = previous.baseResponse(year, config);
    const rates = sensitivity.contributionRates(year, config);
    const oldRates = previous.contributionRates(year, config);
    for (const key of ['maximumAnnualNominal', 'cappedBaseIndex', 'solidarityRGIndex',
      'solidarityAdjustment', 'solidarityUpperAdjustment']) {
      assert.equal(response[key], oldResponse[key]);
    }
    assert.equal(rates.solidarityRate, oldRates.solidarityRate);
    assert.equal(rates.solidarityRateUpper, oldRates.solidarityRateUpper);
    const ordinaryMassIndex = RG.ordinaryRGShare * response.cappedBaseIndex +
      R.ordinaryRETAShare * prices + (1 - RG.ordinaryRGShare - R.ordinaryRETAShare) * wage;
    const meiMassIndex = RG.meiRGShare * response.cappedBaseIndex +
      R.meiRETAShare * prices + (1 - RG.meiRGShare - R.meiRETAShare) * wage;
    for (const employment of [1, 1.15]) {
      const nominalPayroll = payroll0 * employment * wage;
      const ordinaryRate = rates.retirementRate + rates.protectedRate - rates.meiRate - rates.solidarityRate;
      close(nominalPayroll * ordinaryRate, base.ordinaryPensionPool * employment * ordinaryMassIndex);
      close(nominalPayroll * rates.retirementRate,
        base.ordinaryPensionPool * base.retirementContributionShare * employment * ordinaryMassIndex);
      close(nominalPayroll * rates.meiRate,
        base.meiAnnualPace * employment * meiMassIndex * meiRate(year) / meiRate(2026));
      // Difference cancels exactly the RETA real-wage component, not employment.
      close(nominalPayroll * (rates.meiRate - oldRates.meiRate),
        base.meiAnnualPace * R.meiRETAShare * employment * (prices - wage) * meiRate(year) / meiRate(2026));
    }
    for (const system of ['payg', 'ndc', 'funded', 'mixed']) {
      assert.deepEqual(sensitivity.contributionRates(year, { ...config, system }), rates);
      const noOrdinary = sensitivity.contributionRates(year, { ...config, system, contributionRate: 0 });
      assert.equal(noOrdinary.retirementRate, 0); // No individual rights from MEI or solidarity.
      close(noOrdinary.protectedRate, noOrdinary.meiRate + noOrdinary.solidarityRate, 1e-12);
    }
  }
});
