// The six models of comparisonConfigs, plus Mixto con ahorro propio while it is the reader's system, with results and assessments.
// `keys`: only those models, for a page that shows one system or a few (docs/REVISION-ESPERA-AL-LLEGAR-2026-11-12.md):
// until 12/11/2026 every page asked for the six and drew nothing until it had them all.
import { simulateAsync, peekSimulation } from './sim-client.js';
import { describeSustainability } from '../sustainability.js';
import {
  SYSTEM_NAMES, SYSTEM_INFO, DEFAULT_VISIBLE_SYSTEM_KEYS, DE_GOLPE_SYSTEM_KEYS, FLAGSHIP_PROGRESSIVE, FLAGSHIP_RETRO_1985, MIXED_GRADUAL,
  isProgressiveActive, isRetro1985Active, isMixedGradualActive, activeSystemKey, includeMixedGradualFor, mainSystemKeys,
  progressiveEntryConfig, mixedGradualEntryConfig, comparisonConfigs
} from './scenario-labels.js';

export {
  SYSTEM_NAMES, SYSTEM_INFO, DEFAULT_VISIBLE_SYSTEM_KEYS, DE_GOLPE_SYSTEM_KEYS, FLAGSHIP_PROGRESSIVE, FLAGSHIP_RETRO_1985, MIXED_GRADUAL,
  isProgressiveActive, isRetro1985Active, isMixedGradualActive, activeSystemKey, includeMixedGradualFor, mainSystemKeys,
  progressiveEntryConfig, mixedGradualEntryConfig, comparisonConfigs
};

function attach(entry, result, limits) {
  return { ...entry, result, assessment: describeSustainability(result, limits) };
}

/** Synchronous version: only if every result is already cached. */
const entriesFor = (config, includeMixedGradual, keys) => comparisonConfigs(config, { includeRetro1985: true, includeMixedGradual })
  .filter(entry => !keys || keys.includes(entry.key));

export function peekComparison(config, limits, { includeMixedGradual = includeMixedGradualFor(config), keys = null } = {}) {
  const entries = entriesFor(config, includeMixedGradual, keys);
  const results = entries.map(entry => peekSimulation(entry.config));
  if (results.some(result => !result)) return null;
  return entries.map((entry, i) => attach(entry, results[i], limits));
}

export async function loadComparison(config, limits, { includeMixedGradual = includeMixedGradualFor(config), keys = null } = {}) {
  const entries = entriesFor(config, includeMixedGradual, keys);
  const results = await Promise.all(entries.map(entry => simulateAsync(entry.config)));
  return entries.map((entry, i) => attach(entry, results[i], limits));
}
