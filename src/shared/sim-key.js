// Canonical cache key: parameters that cannot affect a system's result are
// reset (and only those: tests/result-cache.test.mjs checks that equal keys give equal runs), so e.g. moving a progressive-transition slider does not invalidate
// the cached PAYG, NDC or static ("de golpe") runs.
import { DEFAULT_CONFIG, validateConfig } from './default-config.js';
import { omitInactivePastRights } from './ndc-past-rights.js';
import { omitDefaultInvestmentShare } from './public-capital.js';
import { omitDefaultAgeSteps } from './retirement-age-steps.js';

const TRANSITION_KEYS = ['transitionYears', 'transitionCutoffAge', 'transitionTargetFunded', 'transitionPublicPillar', 'transitionNdcShare', 'transitionRelaySchedule'];

export function canonicalConfig(config) {
  const c = { ...validateConfig(config) };
  // Pay-as-you-go and notional accounts: the mix of the contribution does nothing. The transition mode does
  // (the 2023 brake applies only to today's PAYG law, src/shared/closing-clause.js, and the engine reads it for
  // runoff and progressive paths), and so does the portfolio style when there is an extra funded contribution
  // (src/current-simulation-core-v10.js): both stay in the key (docs/REVISION-ADVERSARIAL-2026-11-24.md, 13 and 30).
  if (c.system === 'payg' || c.system === 'ndc') {
    c.mix = DEFAULT_CONFIG.mix;
    if (c.transitionMode === 'none' && !(c.fundedExtraContribution > 0)) c.capitalizationStyle = 'balanced-standard';
    if (c.transitionMode === 'none') for (const key of TRANSITION_KEYS) c[key] = DEFAULT_CONFIG[key];
  } else if (c.transitionMode === 'none') {
    for (const key of TRANSITION_KEYS) c[key] = DEFAULT_CONFIG[key];
    if (c.system === 'funded') c.mix = DEFAULT_CONFIG.mix;
  }
  // Since 1.54 the engine ignores lafferOutputResponse (kept only so older scenarios load):
  // it cannot split the cache. The full Laffer response always stays in the key.
  delete c.lafferOutputResponse;
  // The 1.52 experiment is left out while it does not act: keys and fingerprints
  // of every stored result stay as they were (src/shared/ndc-past-rights.js). Since 1.56
  // the VAT in the Laffer wedge (option 3b) is on by default and always stays in the key.
  // So is the 1.61 share of a cut that falls on investment while it stays pro rata, and the steps
  // of the retirement age while the rise comes at once (src/shared/retirement-age-steps.js).
  return omitDefaultAgeSteps(omitDefaultInvestmentShare(omitInactivePastRights(c)));
}

export function simulationKey(config) {
  return JSON.stringify(canonicalConfig(config));
}
