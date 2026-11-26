import { MUTUA_PENSION_BRIDGE_V8 as SOURCE } from '../data/mutua-pension-bridge-v8.js';

/** Separate the protected transfer from the existing mutual pool. This is an
 * explicit scenario proxy for financing, never an actuarial pension valuation. */
export function createMutuaPensionBridgeV8(base) {
  const payroll = base.workers * base.wage;
  const openingCapital = base.mutuaCapitalCostTransfer, openingReinsurance = base.mutuaReinsuranceTransfer;
  if (![payroll, base.mutuaContributions, openingCapital, openingReinsurance].every(Number.isFinite) ||
      payroll <= 0 || base.mutuaContributions < 0 || openingCapital < 0 || openingReinsurance < 0 ||
      openingCapital + openingReinsurance > base.mutuaContributions) throw new RangeError('Invalid mutual bridge opening');
  return Object.freeze({ assumptions: SOURCE.assumptions,
    accounts({ realPayroll, mutuaContributions }) {
      if (!Number.isFinite(realPayroll) || realPayroll <= 0 || !Number.isFinite(mutuaContributions) || mutuaContributions < 0) {
        throw new RangeError('Invalid mutual bridge context');
      }
      const factor = realPayroll / payroll;
      const mutuaCapitalCostTransfer = openingCapital * factor;
      const mutuaReinsuranceTransfer = openingReinsurance * factor;
      const mutuaPensionTransfer = mutuaCapitalCostTransfer + mutuaReinsuranceTransfer;
      if (mutuaPensionTransfer > mutuaContributions + .01) throw new RangeError('Mutual pension transfer exceeds its source pool');
      return { mutuaCapitalCostTransfer, mutuaReinsuranceTransfer, mutuaPensionTransfer };
    }
  });
}
