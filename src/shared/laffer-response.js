// Response of the labour tax base to higher taxes on labour (Laffer effect).
// Calibrated on Trabandt and Uhlig, «The Laffer Curve Revisited» (NBER WP
// 15343, 2009; Journal of Monetary Economics 2011), table 6 for Spain: an
// effective labour tax rate of 36 % (1995–2007) and a long-run self-financing
// of 46 % for a labour tax change. Audit: docs/AUDITORIA-UMBRALES-LAFFER.md.
//
// The base follows B(τ) = B0 · ((1 − τ) / (1 − τ0))^ε, so revenue is
// R(τ) = τ · B(τ). The elasticity ε is chosen so that the marginal
// self-financing at τ0, τ0 · ε / (1 − τ0), equals the published 46 %.
// It is a steady-state result: the phase-in over years is an assumption of
// the project, because the source gives no adjustment speed. Since 1.54 the full
// response (lafferFullResponse, docs/PLAN-1.54-LAFFER-COMPLETO.md) also lowers the
// hours worked, and with them payroll, contributions, rights and GDP; with 0 only
// the revenue responds, as a line of its own (1.37–1.53).

export const LAFFER_SOURCE = Object.freeze({
  id: 'trabandt-uhlig-2009-t6-esp',
  citation: 'Trabandt y Uhlig, «The Laffer Curve Revisited», NBER WP 15343 (2009), tabla 6 (España); publicado en el Journal of Monetary Economics 58 (4), 2011',
  file: 'data/sources/audit-laffer-2026/w15343.pdf',
  labourTaxRate: 0.36,
  selfFinancing: 0.46,
  revenuePeakRate: 0.62,
  maxExtraRevenueShare: 0.13
});

export const LAFFER_DEFAULTS = Object.freeze({
  selfFinancing: LAFFER_SOURCE.selfFinancing,
  adjustYears: 10,
  labourTaxRate0: LAFFER_SOURCE.labourTaxRate,
  firstYear: 2027
});

/** Elasticity of the labour tax base that gives the requested marginal self-financing at τ0. */
export function lafferElasticity(selfFinancing = LAFFER_DEFAULTS.selfFinancing, labourTaxRate0 = LAFFER_DEFAULTS.labourTaxRate0) {
  return selfFinancing * (1 - labourTaxRate0) / labourTaxRate0;
}

/** Tax rate at which revenue peaks with this calibration: 1 / (1 + ε). */
export function lafferPeakRate(options = {}) {
  return 1 / (1 + lafferElasticity(options.selfFinancing, options.labourTaxRate0));
}

/** True when the new rate is past the revenue peak: one more point collects less. */
export function lafferPastPeak(dTau, options = {}) {
  return (options.labourTaxRate0 ?? LAFFER_DEFAULTS.labourTaxRate0) + dTau > lafferPeakRate(options) && (options.selfFinancing ?? LAFFER_DEFAULTS.selfFinancing) > 0;
}

/**
 * Long-run share of the static revenue of a labour tax change that is
 * actually collected, once the base has adjusted. 1 = static; below 1 the
 * base shrinks; negative past the peak.
 * @param {number} dTau  change of the effective labour tax rate (0.05 = +5 points)
 */
export function lafferRetainedShare(dTau, { selfFinancing = LAFFER_DEFAULTS.selfFinancing, labourTaxRate0 = LAFFER_DEFAULTS.labourTaxRate0 } = {}) {
  if (!Number.isFinite(dTau)) throw new RangeError('Invalid labour tax change');
  if (!(selfFinancing > 0)) return 1;
  const t0 = labourTaxRate0, eps = lafferElasticity(selfFinancing, t0);
  const t1 = Math.min(0.99, Math.max(0, t0 + dTau));
  const d = t1 - t0;
  if (Math.abs(d) < 1e-9) return 1 - selfFinancing;
  const revenue = t => t * Math.pow((1 - t) / (1 - t0), eps);
  return (revenue(t1) - t0) / d;
}

/** Long-run change of the labour tax base (hours and declared labour income), as a share. */
export function lafferBaseChange(dTau, { selfFinancing = LAFFER_DEFAULTS.selfFinancing, labourTaxRate0 = LAFFER_DEFAULTS.labourTaxRate0 } = {}) {
  if (!(selfFinancing > 0)) return 0;
  const t1 = Math.min(0.99, Math.max(0, labourTaxRate0 + dTau));
  return Math.pow((1 - t1) / (1 - labourTaxRate0), lafferElasticity(selfFinancing, labourTaxRate0)) - 1;
}

/** Share of the long-run response reached in a year: linear from the first year over adjustYears. */
export function lafferPhase(year, { adjustYears = LAFFER_DEFAULTS.adjustYears, firstYear = LAFFER_DEFAULTS.firstYear } = {}) {
  if (year < firstYear) return 0;
  return Math.min(1, (year - firstYear + 1) / Math.max(1, adjustYears));
}

/**
 * Revenue response of one year. `staticExtra` is the extra revenue a static
 * calculation gives for the labour tax measures (extra pension contributions
 * plus the labour part of the extra IRPF); `compensation` is the labour
 * compensation of the year, in the same units.
 * @returns {{ dTau: number, retained: number, phase: number, revenueResponse: number, baseChangeLongRun: number }}
 *   revenueResponse is negative when the base erosion loses revenue.
 */
export function lafferResponse({ staticExtra, compensation, year, selfFinancing = LAFFER_DEFAULTS.selfFinancing,
  adjustYears = LAFFER_DEFAULTS.adjustYears, labourTaxRate0 = LAFFER_DEFAULTS.labourTaxRate0 }) {
  if (![staticExtra, compensation].every(Number.isFinite) || compensation <= 0) throw new RangeError('Invalid Laffer response inputs');
  const dTau = staticExtra / compensation;
  const options = { selfFinancing, labourTaxRate0 };
  const retained = lafferRetainedShare(dTau, options);
  const phase = lafferPhase(year, { adjustYears });
  const revenueResponse = Math.abs(staticExtra) < 1e-9 ? 0 : -(1 - retained) * staticExtra * phase;
  return { dTau, retained, phase, revenueResponse, baseChangeLongRun: lafferBaseChange(dTau, options), pastPeak: lafferPastPeak(dTau, options) };
}

// Full response (option 2c of docs/DECISIONES-PALANCAS-INGRESOS.md, plan in
// docs/PLAN-1.54-LAFFER-COMPLETO.md): the lost hours lower full-time equivalent
// employment, so payroll, contributions, new rights, funded contributions and GDP
// fall together, and the year's revenue still loses the source's amount once.
// On by default since 1.54; 0 keeps the 1.53 response (a revenue line only).
export const LAFFER_FULL_DEFAULTS = Object.freeze({ lafferFullResponse: 1 });
export const LAFFER_FULL_RANGES = Object.freeze({ lafferFullResponse: [0, 1, true] });

/** True when the full response is switched on. */
export const lafferFullActive = config => Boolean(config?.lafferFullResponse);

/**
 * Hours worked in a year, as a share of those without a response.
 *
 * The revenue line loses τ1 · B · |ΔB/B| (τ1 = τ0 + dτ, B the labour compensation):
 * with a single labour tax, that is what R(τ) = τ · B(τ) gives. In the engine,
 * fewer hours take more than τ1 of each euro of compensation, because GDP,
 * consumption and profits fall with them: `revenuePerCompensation` (η) is what the
 * engine's bases lose per euro. The hours then fall by the base change × τ1 / η,
 * phased like the revenue line, so the bases lose what the source loses and the
 * 46 % self-financing holds. Without η (null), they fall by the base change.
 * @param {number} dTau  change of the effective labour tax rate of the year
 * @param {number|null} revenuePerCompensation  η, public revenue lost per euro of compensation
 */
export function lafferHours({ dTau, year, selfFinancing = LAFFER_DEFAULTS.selfFinancing,
  adjustYears = LAFFER_DEFAULTS.adjustYears, labourTaxRate0 = LAFFER_DEFAULTS.labourTaxRate0, revenuePerCompensation = null }) {
  if (!Number.isFinite(dTau)) throw new RangeError('Invalid labour tax change');
  const baseChangeLongRun = lafferBaseChange(dTau, { selfFinancing, labourTaxRate0 });
  const phase = lafferPhase(year, { adjustYears });
  const t1 = Math.min(0.99, Math.max(0, labourTaxRate0 + dTau));
  const scale = revenuePerCompensation > 0 ? t1 / revenuePerCompensation : 1;
  // A floor keeps some hours in absurd corners (η near zero); it never binds in the app's ranges.
  const hours = Math.max(0.05, 1 + baseChangeLongRun * phase * scale);
  return { dTau, baseChangeLongRun, phase, revenuePerCompensation, scale, hours };
}

// VAT in the labour wedge (option 3b of docs/DECISIONES-PALANCAS-INGRESOS.md, section 4,
// measured on 2/11/2026). Trabandt and Uhlig (2009, section 2.4; 2012, section 5.2): the
// consumption tax enters the same wedge as the labour tax, (1 − τn)/(1 + τc), so a VAT
// surcharge lowers the hours like the labour tax change that leaves that ratio unchanged.
// Its own Laffer curve has no peak (transfers and other incomes also pay it), so the VAT
// revenue keeps its static amount: only the hours, and with them every base, respond.
// On by default since 1.56 (decision of the author, 2/11/2026), with the engine's τc; the key
// always stays in the cache key and the config echo, as lafferFullResponse since 1.54.
// 0 = the VAT does not change the hours, as up to 1.55. Only acts with the full response.
export const LAFFER_VAT_DEFAULTS = Object.freeze({ lafferVatResponse: 1 });
export const LAFFER_VAT_RANGES = Object.freeze({ lafferVatResponse: [0, 1, true] });

/** True when the VAT surcharge enters the wedge: switched on, with the full response. */
export const lafferVatActive = config => Boolean(config?.lafferVatResponse) && lafferFullActive(config);

/**
 * Labour tax change equivalent to a VAT surcharge in the wedge of the source:
 * (1 − τn − Δτ)/(1 + τc) = (1 − τn)/(1 + τc + Δτc), so Δτ = (1 − τn) · Δτc / (1 + τc + Δτc).
 * The surcharge multiplies every VAT rate by (1 + s), so Δτc = s × the effective VAT rate
 * on household consumption. τn is the labour rate of the year before the VAT (τ0 plus the
 * labour measures); τc, every tax on that consumption (VAT and the other product taxes).
 * The surcharge on «other taxes» reaches the wedge through the other product taxes only, the
 * part of τc that is not VAT: the rest of those taxes (property, transfers) is no consumption tax.
 * @param {number} vatSurcharge  s (0.3 = +30 % of VAT)
 * @param {number} [productTaxSurcharge]  the same on the other product taxes
 * @param {number} labourRate  τn
 * @param {number} vatRate  effective VAT rate on household consumption
 * @param {number} consumptionTaxRate  τc
 */
export function lafferVatWedge({ vatSurcharge, labourRate, vatRate, consumptionTaxRate, productTaxSurcharge = 0 }) {
  if (![vatSurcharge, labourRate, vatRate, consumptionTaxRate, productTaxSurcharge].every(Number.isFinite) || vatRate < 0 || consumptionTaxRate < vatRate) {
    throw new RangeError('Invalid VAT wedge inputs');
  }
  const dTauC = vatSurcharge * vatRate + productTaxSurcharge * (consumptionTaxRate - vatRate);
  const tauN = Math.min(0.99, Math.max(0, labourRate));
  return { dTauC, dTau: (1 - tauN) * dTauC / (1 + consumptionTaxRate + dTauC) };
}
