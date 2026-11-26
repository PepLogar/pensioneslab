import { CURRENT_SPAIN as PREVIOUS } from './current-spain-v7.js';
import { MUTUAS_V7 } from './mutuas-v7.js';
import { MUTUA_PENSION_BRIDGE_V8 as BRIDGE } from './mutua-pension-bridge-v8.js';

const annualScale = PREVIOUS.base.mutuaContributions / MUTUAS_V7.observed2026.contributions;
const mutuaCapitalCostTransfer = BRIDGE.observed2026.capitalCostRecognized * annualScale;
const mutuaReinsuranceTransfer = BRIDGE.observed2026.reinsuranceRecognized * annualScale;
export const CURRENT_SPAIN = Object.freeze({ ...PREVIOUS,
  id: 'es-current-2026-10-18-v8', previousCalibration: PREVIOUS.id,
  base: Object.freeze({ ...PREVIOUS.base, mutuaCapitalCostTransfer, mutuaReinsuranceTransfer,
    mutuaPensionTransfer: mutuaCapitalCostTransfer + mutuaReinsuranceTransfer }),
  methods: Object.freeze({ ...PREVIOUS.methods,
    mutuaCapitalCost: BRIDGE.assumptions.reconciliation,
    mutuaPensionFinancing: BRIDGE.assumptions.opening,
    mutuaForwardTransfer: BRIDGE.assumptions.projection,
    openingReclassification: 'Same v7 opening, control defaults and consolidated trajectory. Credit estimated protected mutua/TGSS financing to pensions once and debit other public resources by the same amount. No new contribution, tax, spending, right, debt or asset.' }),
  sources: Object.freeze({ ...PREVIOUS.sources, mutuaPensionBridge: BRIDGE.id })
});
