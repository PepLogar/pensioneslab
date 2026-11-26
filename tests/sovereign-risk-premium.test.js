import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SOVEREIGN_RISK, LEGACY_SOVEREIGN_RISK, sovereignRiskPremium } from '../src/sovereign-risk-premium.js';
import { EUROPEAN_RISK_CALIBRATION } from '../data/risk-calibration-europe-2026.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} differs from ${b}`);
const anchor = { realInterestRate: .014039215686274309, inflationRate: .02 };
const config = { ...anchor, ...LEGACY_SOVEREIGN_RISK };

test('quadratic premium starts continuously at the threshold and preserves the nominal base', () => {
  for (const [ratio, premium] of [[.8, 0], [1, 0], [1.1, .0025], [1.2, .01], [1.3, .0225], [1.4, .04]]) {
    const risk = sovereignRiskPremium(ratio, config);
    close(risk.premiumRate, premium);
    close(risk.baseNominalRate, .03432);
    close(risk.nominalRate, .03432 + premium);
    assert.equal(risk.capped, false);
    assert.equal(risk.threshold, 1);
    assert.equal(risk.capRate, .12);
    assert.ok(Object.isFrozen(risk));
  }
  close(sovereignRiskPremium(1 + 1e-9, config).premiumRate, .0025 * (1e-8) ** 2);
  assert.deepEqual(sovereignRiskPremium(1.2, config),
    sovereignRiskPremium(1.2, { ...config, ...LEGACY_SOVEREIGN_RISK }));
});

test('European calibration has a positive reference spread, correct linear units and no double count', () => {
  const slope = EUROPEAN_RISK_CALIBRATION.slopeBasisPointsPerDebtGDPPoint;
  let last = 0;
  for (const [ratio, extraDebtPoints] of [[0, 0], [.9, 0], [1.014, 0], [1.114, 10], [1.214, 20], [1.408, 39.4]]) {
    const risk = sovereignRiskPremium(ratio, anchor);
    close(risk.premiumRate, extraDebtPoints * slope / 10000);
    close(risk.totalSpreadRate, .00454 + risk.premiumRate);
    close(risk.impliedRiskFreeRate, .02978);
    close(risk.nominalRate, .03432 + risk.premiumRate);
    assert.ok(risk.totalSpreadRate > 0 && risk.totalSpreadRate >= last);
    assert.equal(risk.riskModel, 'european-linear');
    last = risk.totalSpreadRate;
  }
  assert.equal(sovereignRiskPremium(1.409, anchor).beyondCalibrationRange, true);
  assert.equal(sovereignRiskPremium(1.408, anchor).beyondCalibrationRange, false);
  close(DEFAULT_SOVEREIGN_RISK.riskPremiumAt10pp, slope / 1000);
  for (const ratio of [15, 1e100, Number.MAX_VALUE]) {
    const risk = sovereignRiskPremium(ratio, anchor);
    close(risk.premiumRate, .12);
    assert.equal(risk.capped, true);
  }
  for (const patch of [{ riskPremiumAt10pp: 0 }, { riskPremiumCap: 0 }]) {
    const risk = sovereignRiskPremium(Number.MAX_VALUE, { ...anchor, ...patch });
    close(risk.premiumRate, 0);
    close(risk.totalSpreadRate, .00454);
  }
  assert.throws(() => sovereignRiskPremium(1, { ...anchor, riskModel: 'unknown' }), RangeError);
  assert.throws(() => sovereignRiskPremium(1, { ...anchor, riskModel: null }), RangeError);
});

test('explicit cap prevents overflow; zero slope or cap disables the premium', () => {
  for (const ratio of [2, 1e100, Number.MAX_VALUE]) {
    const risk = sovereignRiskPremium(ratio, config);
    close(risk.premiumRate, .12);
    close(risk.nominalRate, .15432);
    assert.equal(risk.capped, true);
  }
  for (const patch of [{ riskPremiumAt10pp: 0 }, { riskPremiumCap: 0 }]) {
    close(sovereignRiskPremium(Number.MAX_VALUE, { ...config, ...patch }).premiumRate, 0);
  }
  const tiny = sovereignRiskPremium(1e100, { ...config, riskPremiumAt10pp: Number.MIN_VALUE });
  assert.ok(Number.isFinite(tiny.premiumRate) && tiny.premiumRate >= 0);
  assert.throws(() => sovereignRiskPremium(NaN, config), RangeError);
  assert.throws(() => sovereignRiskPremium(1, { ...config, riskDebtThreshold: -1 }), RangeError);
  assert.throws(() => sovereignRiskPremium(1, { ...config, riskPremiumCap: null }), RangeError);
});
