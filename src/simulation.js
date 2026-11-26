import { simulate as simulateCurrent } from './model-current-v10.js';
import { simulateRetrospective1985 } from './retrospective-model-1985.js';
import { isRetro1985Active } from './shared/scenario-labels.js';
import { SIMULATION_METHODOLOGY } from './simulation-methodology.js';

// One dispatch for the laboratory, workers, fallback and build-time results.
// The retrospective runs its entire ledger; it never rewrites a future run.
export function simulate(config, runtime = null) {
  // Run-only options (market paths for risk experiments) exist for the current
  // model only; the 1985 retrospective keeps its own complete ledger.
  if (runtime && isRetro1985Active(config)) throw new RangeError('El riesgo de mercado no está disponible para el contrafactual de 1985');
  const result = isRetro1985Active(config)
    ? simulateRetrospective1985(config)
    : simulateCurrent(config, runtime ?? undefined);
  return { ...result, methodologyVersion: SIMULATION_METHODOLOGY };
}
