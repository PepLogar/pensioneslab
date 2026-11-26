// The console greys a setting that changes nothing with the chosen system (src/shared/setting-systems.js). Measured
// with the engine: in pay-as-you-go and in notional accounts there is no fund, so moving every setting of the move to a
// fund, of where it invests and of the mix at once leaves the run as it was; and the mix row speaks Spanish (1.81).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { comparisonConfigs } from '../src/shared/scenario-labels.js';
import { settingActsOn } from '../src/shared/setting-systems.js';
import { SETTINGS_CATALOG } from '../src/shared/settings-catalog.js';
import { fixedText } from '../src/shared/console-rows.js';

const FUND_MOVES = { transitionCutoffAge: 38, transitionYears: 30, transitionTargetFunded: 0.3, capitalizationStyle: 'lifecycle-ap7',
  mix: { payg: 0.2, ndc: 0.2, funded: 0.6 }, transitionMode: 'two-stage-relay', transitionNdcShare: 0.2,
  transitionRelaySchedule: 'legacy-extended', transitionPublicPillar: 'custom-split', feeRate: 0.015 };
// The engine's own row fields (audit 1.85, 20): every one must be a number, or the comparison checks nothing.
const FIELDS = ['debtGDP', 'averagePensionAnnual', 'fundedAssetsGDP', 'publicPensionSpendingGDP'];
const sig = r => {
  for (const y of r.years) for (const k of FIELDS) assert.ok(Number.isFinite(y[k]), `${y.year} ${k} is a number`);
  return JSON.stringify(r.years.map(y => FIELDS.map(k => y[k])));
};

test('without a fund, the fund settings change nothing and are greyed', () => {
  for (const e of comparisonConfigs(DEFAULT_CONFIG).filter(x => ['payg', 'ndc'].includes(x.key))) {
    const base = validateConfig(e.config);
    assert.equal(sig(simulate(validateConfig({ ...base, ...FUND_MOVES }))), sig(simulate(base)), e.key);
    for (const key of Object.keys(FUND_MOVES)) if (!(key === 'transitionMode' && e.key === 'payg')) assert.equal(settingActsOn(key, base), false, `${e.key} ${key}`);
    assert.equal(settingActsOn('fundedExtraContribution', base), true, `${e.key} extra contribution acts`);
  }
});

test('the mix row names its parts in Spanish', () => {
  const entry = SETTINGS_CATALOG.find(s => s.key === 'mix');
  assert.equal(fixedText(entry, DEFAULT_CONFIG), 'Reparto 34 % · Nocionales 33 % · Fondo 33 %');
});
