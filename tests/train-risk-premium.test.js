import test from 'node:test';
import assert from 'node:assert/strict';
import { describeTrainRiskPremium } from '../src/train-journey.js';

test('risk station converts only monetary issuance effects once and keeps rates and projected inputs', () => {
  const point = {
    riskPremium: { openingDebtGDP: 1.2, threshold: 1, premiumRate: .01,
      baseNominalRate: .034, nominalRate: .044, capped: false, capRate: .12 },
    riskPremiumInterestOnIssuance: 100e6, riskPremiumAnnualCostOnIssuance: 200e6
  };
  const flow = { isBase: false, priceFactor: 1.1, debtAdded: 3e9,
    debtRefinanced: 19e9, grossDebtIssuance: 22e9 };
  const before = JSON.stringify({ point, flow });
  const risk = describeTrainRiskPremium(point, flow);
  assert.ok(Math.abs(risk.interestThisYear - 110e6) < .01);
  assert.ok(Math.abs(risk.annualCostOnIssuance - 220e6) < .01);
  assert.equal(risk.refinanced, flow.debtRefinanced);
  assert.equal(risk.additionalBorrowing, flow.debtAdded);
  assert.equal(risk.grossIssuance, flow.grossDebtIssuance);
  assert.equal(risk.premiumRate, .01);
  assert.equal(risk.nominalRate, .044);
  assert.equal(risk.openingDebtGDP, 1.2);
  assert.equal(JSON.stringify({ point, flow }), before);
  assert.notEqual(risk, point.riskPremium);
});

test('observed opening accounts and projections without risk metadata are never repriced by the view', () => {
  assert.equal(describeTrainRiskPremium({ riskPremium: { premiumRate: .1 } }, { isBase: true }), null);
  assert.equal(describeTrainRiskPremium({}, { isBase: false }), null);
});
