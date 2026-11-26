/** Conditional financing rule, not a forecast of sovereign market access.
 * Ratios and rates are fractions: 1 is 100% debt/GDP; .0025 is 25 basis points.
 * The cap bounds the pricing experiment; it does not guarantee market access.
 */
import { EUROPEAN_RISK_CALIBRATION as calibration } from '../data/risk-calibration-europe-2026.js';

export const SOVEREIGN_RISK_MODELS = Object.freeze(['european-linear', 'legacy-quadratic']);
export const LEGACY_SOVEREIGN_RISK = Object.freeze({
  riskModel: 'legacy-quadratic',
  riskDebtThreshold: 1,
  riskPremiumAt10pp: .0025,
  riskPremiumCap: .12
});
export const DEFAULT_SOVEREIGN_RISK = Object.freeze({
  riskModel: 'european-linear',
  riskDebtThreshold: calibration.referenceDebtRatio,
  riskPremiumAt10pp: calibration.slopeBasisPointsPerDebtGDPPoint * 10 / 10000,
  riskPremiumCap: .12
});

function nonnegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid ${name}`);
  return value;
}

/** Price only new issuance using post-exchange opening nominal debt divided
 * by the current year's nominal GDP. Contract coupons are handled by vintages.
 * Missing fields adopt the selected model's defaults. Persisted older inputs
 * migrate explicitly to legacy-quadratic; fresh inputs use European calibration.
 */
export function sovereignRiskPremium(openingDebtGDP, config = {}) {
  nonnegative(openingDebtGDP, 'openingDebtGDP');
  const riskModel = config.riskModel === undefined ? DEFAULT_SOVEREIGN_RISK.riskModel : config.riskModel;
  if (!SOVEREIGN_RISK_MODELS.includes(riskModel)) throw new RangeError('Invalid riskModel');
  const defaults = riskModel === 'legacy-quadratic' ? LEGACY_SOVEREIGN_RISK : DEFAULT_SOVEREIGN_RISK;
  const value = key => config[key] === undefined ? defaults[key] : config[key];
  const threshold = nonnegative(value('riskDebtThreshold'), 'riskDebtThreshold');
  const at10pp = nonnegative(value('riskPremiumAt10pp'), 'riskPremiumAt10pp');
  const capRate = nonnegative(value('riskPremiumCap'), 'riskPremiumCap');
  const real = config.realInterestRate, inflation = config.inflationRate;
  if (!Number.isFinite(real) || !Number.isFinite(inflation) || real <= -1 || inflation <= -1) {
    throw new RangeError('Invalid base interest or inflation');
  }
  const baseNominalRate = (1 + real) * (1 + inflation) - 1;
  const excess = Math.max(0, openingDebtGDP - threshold);
  let premiumRate = 0, capped = false;
  if (excess > 0 && at10pp > 0 && capRate > 0) {
    // Compare against the cap before squaring. Even an extremely large debt
    // ratio must not overflow and turn the projection into Infinity or NaN.
    const capExcess = riskModel === 'legacy-quadratic'
      ? .1 * Math.sqrt(capRate) / Math.sqrt(at10pp)
      : (capRate / at10pp) * .1;
    capped = excess >= capExcess;
    premiumRate = capped ? capRate : Math.min(capRate, riskModel === 'legacy-quadratic'
      ? (Math.sqrt(at10pp) * (excess / .1)) ** 2 : (at10pp * excess) / .1);
  }
  // Optional stress premium of the year (src/shared/stress-premium.js), on top of the cap.
  const stressPremiumRate = Number.isFinite(config.stressPremiumNow) && config.stressPremiumNow > 0 ? config.stressPremiumNow : 0;
  premiumRate += stressPremiumRate;
  const nominalRate = baseNominalRate + premiumRate;
  if (!Number.isFinite(baseNominalRate) || baseNominalRate <= -1 ||
      !Number.isFinite(nominalRate) || nominalRate >= 1) {
    throw new RangeError('Invalid risk-adjusted issuance rate');
  }
  // Decomposition only: adding this reference spread again would double count.
  // The anchor is user-adjustable and differs in date/tenor from the ECB sample.
  const referenceSpreadRate = calibration.referenceSpreadRate;
  return Object.freeze({ openingDebtGDP, threshold, premiumRate, stressPremiumRate,
    baseNominalRate, nominalRate, capped, capRate, riskModel,
    referenceSpreadRate, totalSpreadRate: referenceSpreadRate + premiumRate,
    impliedRiskFreeRate: baseNominalRate - referenceSpreadRate,
    calibrationId: riskModel === 'european-linear' ? calibration.id : null,
    beyondCalibrationRange: riskModel === 'european-linear' &&
      (openingDebtGDP < calibration.observedMinDebtRatio || openingDebtGDP > calibration.observedMaxDebtRatio)
  });
}
