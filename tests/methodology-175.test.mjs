// Methodology 1.75 (docs/DECISIONES.md, 25/11/2026): the review of 1.72–1.74. A captive fund loses only the face
// value in a haircut and then earns the new coupon; the 1985 run deflates with its own prices; the items' cut sent
// to pensions is what it saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { FLAGSHIP_RETRO_1985 } from '../src/shared/scenario-labels.js';
import { DEPARTMENTS, departmentsPatch } from '../src/domain/consola-measures.js';

const at = (r, y) => r.years.find(p => p.year === y);
const haircut = (style, nominalRate) => simulate(validateConfig({ ...DEFAULT_CONFIG, system: 'mixed', capitalizationStyle: style,
  debtRestructurings: [{ year: 2045, haircut: 0.3, termYears: 20, nominalRate, fundedSovereignShare: 0.15, creditorDiscountRate: 0.04 }] }));

test('a captive fund loses the face value in a haircut, and the lower coupons come through its returns from that year', () => {
  const captive = haircut('sovereign-captive', 0.005), balanced = haircut('balanced-standard', 0.005);
  assert.equal(at(captive, 2045).fundedTermsLoss, 0);
  assert.ok(at(balanced, 2045).fundedTermsLoss > 0, 'a market portfolio still prices the new terms');
  const share = at(captive, 2045).fundedRestructuringLoss / at(captive, 2044).fundedAssets;
  // 30 % of the face value; the old bonds are worth a little under par, so a little over 30 % of their value.
  assert.ok(share > 0.29 && share < 0.32, String(share));
  // From the haircut year the fund earns the exchanged coupon (0.5 % nominal): a negative real return.
  assert.ok(at(captive, 2045).fundedInvestmentReturn < 0);
});

test('in the 1985 run, the captive fund\'s real return follows the run\'s own prices, not the scenario inflation', () => {
  const fund2026 = inflationRate => at(simulate(validateConfig({ ...DEFAULT_CONFIG, ...FLAGSHIP_RETRO_1985,
    capitalizationStyle: 'sovereign-captive', inflationRate })), 2026).fundedAssets;
  assert.ok(Math.abs(fund2026(0.03) / fund2026(0.02) - 1) < 1e-9);
});

test('an items\' cut sent to pensions gives them what it saves', () => {
  const base = simulate(DEFAULT_CONFIG);
  const cuts = Object.fromEntries(DEPARTMENTS.map((d, i) => [d.id, i === 0 ? d.maxCut : 0]));
  const { paymentAdjustments, pensionBudgetShare } = departmentsPatch(DEFAULT_CONFIG, at(base, 2027), cuts, true);
  const cut = simulate(validateConfig({ ...DEFAULT_CONFIG, paymentAdjustments, pensionBudgetShare }));
  for (const y of [2030, 2040]) {
    const extra = at(cut, y).pensionTaxTransfer - at(base, y).pensionTaxTransfer;
    const saved = at(cut, y).paymentSpendingAdjustment.otherSpendingReduction;
    assert.ok(Math.abs(extra / saved - 1) < 0.01, `${y}: ${extra / saved}`);
  }
});
