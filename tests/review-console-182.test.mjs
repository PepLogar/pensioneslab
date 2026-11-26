// The console and texts batch of the adversarial review (docs/REVISION-ADVERSARIAL-2026-11-25.md, 9-22; 1.82).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { comparisonConfigs } from '../src/shared/scenario-labels.js';
import { settingActsOn } from '../src/shared/setting-systems.js';
import { payablePensionAnnual, payablePensionFactor } from '../src/shared/payable-pension.js';
import { computeVerdict } from '../src/domain/verdict.js';
import { sustainabilityLight } from '../src/domain/sustainability-light.js';
import { squeezePatch } from '../src/domain/consola-measures.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const sig = r => JSON.stringify(r.years.map(y => [y.debtGDP, y.averagePensionAnnual, y.fundedAssetsGDP]));
const run = c => simulate(validateConfig({ ...DEFAULT_CONFIG, ...c }));

test('with an extra own-account contribution, where it invests and its fee act in pay-as-you-go and notional accounts', () => {
  for (const system of ['payg', 'ndc']) {
    const base = { system, fundedExtraContribution: 0.03 };
    assert.equal(settingActsOn('capitalizationStyle', validateConfig({ ...DEFAULT_CONFIG, ...base })), true, system);
    assert.equal(settingActsOn('feeRate', validateConfig({ ...DEFAULT_CONFIG, ...base })), true, system);
    assert.equal(settingActsOn('capitalizationStyle', validateConfig({ ...DEFAULT_CONFIG, system })), false, `${system} without it`);
  }
  const b = sig(run({ system: 'payg', fundedExtraContribution: 0.03 }));
  assert.notEqual(sig(run({ system: 'payg', fundedExtraContribution: 0.03, capitalizationStyle: 'lifecycle-ap7' })), b);
  assert.notEqual(sig(run({ system: 'payg', fundedExtraContribution: 0.03, feeRate: 0.015 })), b);
});

test('the mode acts in pay-as-you-go while the 2023 brake can apply, and the common fund\'s fee acts', () => {
  const at = c => validateConfig({ ...DEFAULT_CONFIG, ...c });
  assert.equal(settingActsOn('transitionMode', at({ system: 'payg' })), true);
  assert.equal(settingActsOn('transitionMode', at({ system: 'payg', closingClause: 'off' })), false);
  assert.equal(settingActsOn('transitionMode', at({ system: 'ndc' })), false);
  const progressive = comparisonConfigs(DEFAULT_CONFIG).find(e => e.key === 'progressive').config;
  assert.equal(settingActsOn('feeRate', validateConfig(progressive)), true);
});

test('the payable pension freezes and cuts only the public part', () => {
  const funded = comparisonConfigs(DEFAULT_CONFIG).find(e => e.key === 'funded').config;
  const result = simulate(validateConfig(funded));
  const verdict = computeVerdict(result, { config: result.config });
  assert.ok(Number.isInteger(verdict.bailoutYear), 'the funded system breaks by default');
  const r = result.years.find(y => y.year === 2070);
  // Since 1.86 the average leaves out the fund income of those with no public pension (audit 1.85, 1).
  const counted = r.publicRetirementBenefits + r.fundedBenefits - (r.fundedBenefitsNoClaim ?? 0);
  assert.ok(Math.abs(r.averagePensionAnnual * r.retirees - counted) / counted < 1e-9);
  const factor = payablePensionFactor(2070, verdict, result.config);
  assert.ok(factor < 1);
  const expected = (r.publicRetirementBenefits * factor + r.fundedBenefits - (r.fundedBenefitsNoClaim ?? 0)) / r.retirees;
  assert.ok(Math.abs(payablePensionAnnual(r, verdict, result.config) - expected) < 1e-6);
  assert.ok(payablePensionAnnual(r, verdict, result.config) > r.averagePensionAnnual * factor, 'the private annuity is kept');
  for (const file of ['src/pages/consola.js', 'src/domain/series-dictionary.js']) assert.match(read(file), /payablePensionAnnual\(/, file);
});

test('the light says the years in a row of riskSustainYears', () => {
  const result = run({ riskSustainYears: 3 });
  const verdict = computeVerdict(result, { config: result.config });
  const light = sustainabilityLight(verdict, null);
  assert.equal(verdict.sustainYears, 3);
  if (light.breakYear) assert.match(light.technical, /supera el umbral tres años seguidos/);
});

test('verdict and Excel texts: no «0,00 puntos», «llega a 2070» only for a measure in the trouble, simulated history named so', () => {
  const v = read('src/domain/verdict.js');
  assert.match(v, /edge\.gap < 0\.005 \? 'menos de 0,01'/);
  assert.match(v, /rescuedYear && rescuedYear >= highYear && bailoutYear < 2070 \? ', y con él llega a 2070'/);
  assert.doesNotMatch(read('src/shared/excel-models-io.js'), /'Histórico 1985-2025'/);
});

test('console boxes: another value is named, limits are the console\'s, a Calendario plan is shown in words, reset compares values', () => {
  const page = read('src/pages/consola.js');
  assert.match(page, /Otro valor \(/);
  assert.match(page, /\$\('\[data-cx-system\]'\)\.innerHTML = optionsHtml\(system\.options, system\.read\(config\), String\)/);
  assert.match(page, /value < Number\(input\.min\) \|\| value > Number\(input\.max\)/);
  assert.match(page, /c\.format && Number\.isFinite\(c\.min\) && value < c\.min/);
  assert.match(page, /\$\('\[data-cx-reset\]'\)\.disabled = sameConfig\(config, TODAY_CONFIG\)/);
});

test('raising only a wealth or corporate tax keeps today\'s contribution rate exactly', () => {
  const patched = squeezePatch(validateConfig(DEFAULT_CONFIG), { wealthTaxMultiplier: 1, corporateSurcharge: 0.2 });
  assert.equal(patched.contributionRate, DEFAULT_CONFIG.contributionRate);
});
