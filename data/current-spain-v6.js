import { CURRENT_SPAIN as PREVIOUS } from './current-spain-v5.js';
import { WAGE_FORECAST_V6 } from './wage-forecast-v6.js';
import { REGIMES_V6 } from './regimes-v6.js';

/** Same2026 observed/estimated opening; changes concern future source coverage. */
export const CURRENT_SPAIN = Object.freeze({ ...PREVIOUS,
  id: 'es-current-2026-10-18-v6', previousCalibration: PREVIOUS.id,
  methods: Object.freeze({ ...PREVIOUS.methods,
    forwardWages: '2027 growth from AMECO resident gross wages / resident employees. Apply to equivalent salary, not opening wage level. Beyond2027 retain AR real-rate scenario; explicit external wage paths take priority.',
    otherContributions: 'The non-pension share of the same estimated SS contributions uses the same identified/proxy regime base adjustment as the pension share. This reclassifies an existing residual; no new opening revenue is added. SEPE/mutualism and unidentified SEC residual retain prior proxies.' }),
  sources: Object.freeze({ ...PREVIOUS.sources, wageForecast: WAGE_FORECAST_V6.id, regimes: REGIMES_V6.id })
});
