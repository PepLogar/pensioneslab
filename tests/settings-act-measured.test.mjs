// What the console shows is what acts (1.88, docs/DECISIONES.md, 27/11/2026). A sweep of every setting in every system
// (909 runs) found settings in sight that changed nothing; the folding rules were fixed. These cases, one per kind of
// fix, check both sides with the engine: the rule shows a setting only where moving it changes the run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { settingsPatch } from '../src/shared/settings-panel.js';
import { settingActsOn } from '../src/shared/setting-systems.js';
import { settingWaits } from '../src/shared/setting-needs.js';
import { mixPatch } from '../src/domain/consola-measures.js';

const base = {};
const configOf = system => (base[system] ??= (() => { const b = validateConfig(DEFAULT_CONFIG); return validateConfig({ ...b, ...settingsPatch('system', system, b) }); })());
const sigs = new Map();
const sig = config => {
  const key = JSON.stringify(config);
  if (!sigs.has(key)) sigs.set(key, JSON.stringify(simulate(config).years.map(y => [y.debtGDP, y.averagePensionAnnual, y.fundedAssetsGDP, y.gdp, y.retirees])));
  return sigs.get(key);
};
const shown = (key, config) => settingActsOn(key, config) && !settingWaits(key, config);

// [system, setting, patch that moves it, whether it acts]
const CASES = [
  ['progressive', 'transitionCutoffAge', { transitionCutoffAge: 59 }, true],
  ['mixedGradual', 'transitionCutoffAge', { transitionCutoffAge: 59 }, false],   // «Rampa anual» is the same at every age
  ['mixedGradual', 'transitionYears', { transitionYears: 36 }, true],
  ['progressive', 'transitionYears', { transitionYears: 36 }, false],           // the pace is the pensioners' deaths
  ['progressive', 'transitionNdcShare', { transitionNdcShare: 0.5 }, true],
  ['mixedGradual', 'transitionNdcShare', { transitionNdcShare: 0.5 }, false],   // the public part follows the mix
  ['mixedGradual', 'mix', config => mixPatch(config, 'payg', 60), true],
  ['progressive', 'mix', config => mixPatch(config, 'payg', 60), false],
  ['ndc', 'replacementRate', { replacementRate: 0.64 }, false],                 // no new pay-as-you-go rights
  ['payg', 'realReturn', { realReturn: 0.05 }, false],                          // no fund
  ['ndc', 'ndcPhaseInYears', { ndcPhaseInYears: 33 }, false],                   // the entry by generations is off
  ['payg', 'pointsSustainabilityFactor', { pointsSustainabilityFactor: 0.6 }, false],
  ['payg', 'retirementAgeStepYears', { retirementAgeStepYears: 2 }, false],     // the age does not rise
  ['retro1985', 'retirementAgeLink', { retirementAgeLink: 1 }, false],          // the 1985 model has no linked age
  ['retro1985', 'europop2023', { europop2023: 1 }, false]
];

for (const [system, key, move, acts] of CASES) {
  test(`${system}: «${key}» ${acts ? 'acts and is in sight' : 'changes nothing and is folded'}`, () => {
    const config = configOf(system);
    const moved = validateConfig({ ...config, ...(typeof move === 'function' ? move(config) : move) });
    assert.equal(sig(moved) !== sig(config), acts, 'the engine');
    assert.equal(shown(key, config), acts, 'the console');
  });
}
