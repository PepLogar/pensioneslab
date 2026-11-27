// Whether an expert setting acts on the reader's system (docs/REVISION-AJUSTAR-LABORATORIO-2026-11-11.md, A).
// The lists are the catalogue's (SETTING_SYSTEMS); this adds what depends on the configuration itself.
import { SETTING_SYSTEMS, MEASURED_SYSTEMS } from './settings-catalog.js';
import { activeSystemKey, scenarioSystemName } from './scenario-labels.js';
import { CLOSING_CLAUSE_DEFAULTS } from './closing-clause.js';

/** False only when moving the setting is known to change nothing with this configuration's system. */
export function settingActsOn(key, config) {
  const systems = SETTING_SYSTEMS[key];
  if (!systems) return true;
  const system = activeSystemKey(config);
  if (!MEASURED_SYSTEMS.includes(system)) return true;
  // Measured with the engine (1.82, docs/REVISION-ADVERSARIAL-2026-11-25.md, 9-11):
  // - with an extra contribution to an own account, pay-as-you-go and notional accounts have a fund too: where it
  //   invests and its fee act (src/shared/sim-key.js keeps the style in the key for the same reason);
  // - in pay-as-you-go any mode other than «Ninguno» leaves today's law, so it switches the 2023 brake off whenever
  //   the brake is on and not already set for every system (src/shared/closing-clause.js);
  // - the Mixto progresivo's common fund caps the fee at 0,15 %, so below that the fee still acts: it stays listed.
  if ((system === 'payg' || system === 'ndc') && ['capitalizationStyle', 'feeRate', 'realReturn'].includes(key) && Number(config.fundedExtraContribution) > 0) return true;
  // - Cuentas nocionales with its entry by generations keeps a pay-as-you-go part for the older generations (1.88).
  if (system === 'ndc' && Number(config.ndcPhaseIn) === 1 && ['replacementRate', 'exitPathNoExtraPension', 'pointsSystem', 'pointsSustainabilityFactor'].includes(key)) return true;
  if (key === 'transitionMode' && system === 'payg') {
    return (config.closingClause ?? CLOSING_CLAUSE_DEFAULTS.closingClause) !== 'off' && Number(config.closingClauseAnySystem ?? 0) !== 1;
  }
  return systems.includes(system);
}

/** The line over the settings of other systems, the same in the Laboratorio and in the panel of Ajustes. */
export const otherSystemsNote = config => `No cambian nada con «${scenarioSystemName(config).replace(/^[^\p{L}]+/u, '')}». Se conservan, y vuelven a la vista cuando eliges su sistema.`;
export const otherSystemsTitle = count => `Ajustes de otros sistemas (${count})`;
