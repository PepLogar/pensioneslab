// Public capital (1.60, docs/PLAN-1.60-INVERSION-PUBLICA.md and
// docs/PROPUESTA-INVERSION-PUBLICA-2026-11-05.md). Up to 1.59 a cut of «other spending» cost GDP
// only through the demand multiplier of 1.38, which fades in two years. That spending also holds
// public investment, and less investment leaves less public capital for decades.
//
// publicCapitalElasticity: long-run elasticity of output to public capital. 0.122 for capital
// installed by central government [O], Bom and Ligthart (2014), a meta-analysis of 68 studies;
// 0.170 for core infrastructure. With 0 the engine is that of 1.59.
//
// Assumptions of the project [S]: a cut lowers investment pro rata; depreciation and the growth
// of reference investment are declared below; the effect is symmetric, because almost all the
// evidence looks at rises in investment, not falls. Health and education stay out: their
// long-run effect on output is not measured, so that part of the cut has no cost in GDP.
//
// cutInvestmentShare (1.61, docs/PROPUESTA-RECORTE-INVERSION-2026-11-06.md) [S]: how hard a cut falls
// on investment compared with the whole of that spending. 1 = pro rata, as in 1.60; 0 = untouched;
// 3 = three times the cut, above the 2.3 [R] of Spain in 2009–2014. The euros of the cut do not
// change: what investment does not give, the rest of the spending gives, and the other way round.
import { paymentAdjustmentForYear } from '../config-current-v9.js';

export const PUBLIC_CAPITAL_SOURCE = Object.freeze({
  id: 'bom-ligthart-2014',
  citation: 'Bom y Ligthart, «What have we learned from three decades of research on the productivity of public capital?», Journal of Economic Surveys 28(5), 2014',
  elasticity: 0.122,
  coreInfrastructure: 0.17
});

export const PUBLIC_CAPITAL_DEFAULTS = Object.freeze({ publicCapitalElasticity: PUBLIC_CAPITAL_SOURCE.elasticity, cutInvestmentShare: 1 });
export const PUBLIC_CAPITAL_RANGES = Object.freeze({ publicCapitalElasticity: [0, 0.2], cutInvestmentShare: [0, 3] });
export const PUBLIC_CAPITAL_DEPRECIATION = 0.04;
export const PUBLIC_CAPITAL_GROWTH = 0.015;
const FIRST_YEAR = 2027;

const paths = new WeakMap();

/**
 * Public capital of a scenario over that of the same path without cuts: 1 in 2027, and each year
 * x = [(1 − δ) · x₋₁ + (δ + g) · (1 − c₋₁)] / (1 + g), with c₋₁ the level of the cut of other
 * spending the year before, times cutInvestmentShare: a year's investment is capital the year
 * after. It depends only on the cut calendar, so cutting and undoing the cut follow the same slow rule.
 * @param {number} year
 * @param {{paymentAdjustments?: object[], cutInvestmentShare?: number}} config
 */
export function publicCapitalRatio(year, config) {
  const calendar = config.paymentAdjustments ?? [];
  if (year <= FIRST_YEAR || !calendar.some(policy => policy.otherSpendingCut > 0)) return 1;
  let path = paths.get(config);
  if (!path) paths.set(config, path = [1]);
  const share = config.cutInvestmentShare ?? PUBLIC_CAPITAL_DEFAULTS.cutInvestmentShare;
  for (let y = FIRST_YEAR + path.length; y <= year; y++) {
    const cut = Math.min(1, (paymentAdjustmentForYear(calendar, y - 1)?.otherSpendingCut ?? 0) * share);
    const before = path.at(-1);
    path.push(before === 1 && cut === 0 ? 1
      : ((1 - PUBLIC_CAPITAL_DEPRECIATION) * before + (PUBLIC_CAPITAL_DEPRECIATION + PUBLIC_CAPITAL_GROWTH) * (1 - cut)) / (1 + PUBLIC_CAPITAL_GROWTH));
  }
  return path[year - FIRST_YEAR];
}

/** The config without the share while it is the default, so cache keys, fingerprints and stored
 *  results keep their exact shape, as with the 1.52 experiment (src/shared/ndc-past-rights.js). */
export function omitDefaultInvestmentShare(config) {
  if (config?.cutInvestmentShare !== PUBLIC_CAPITAL_DEFAULTS.cutInvestmentShare) return config;
  const { cutInvestmentShare, ...rest } = config;
  return rest;
}

/** What public capital does to the wage and the output per worker of a year: 1 without cuts, with elasticity 0 or with investment spared. */
export function publicCapitalFactor(year, config) {
  const elasticity = config.publicCapitalElasticity ?? 0;
  return elasticity > 0 ? publicCapitalRatio(year, config) ** elasticity : 1;
}
