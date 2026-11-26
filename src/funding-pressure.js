import { describeSustainability, validateLimits } from './sustainability.js';
import { describePensionFunding, priceFactorFor } from './fiscal-display-v8.js';

const EURO_TOLERANCE = .01;
const PP_TOLERANCE = 1e-10;
const positive = value => value > EURO_TOLERANCE ? value : 0;

function finite(value, name, nonnegative = false) {
  if (!Number.isFinite(value) || (nonnegative && value < 0)) throw new RangeError(`Invalid funding pressure ${name}`);
  return value;
}

// An absent denominator is not infinite capacity or infinite load. Keep the
// absence explicit so presentation can say that no own resources are available.
function load(numerator, denominator) {
  finite(numerator, 'load numerator', true);
  finite(denominator, 'load denominator', true);
  if (denominator === 0) return numerator === 0 ? 0 : null;
  return finite(numerator / denominator * 100, 'load percentage', true);
}

/**
 * Read calculated annual accounts; never cap flows or change any policy limit.
 * `flow` is the selected year's describeNominalMoneyFlow result. All returned
 * monetary amounts are nominal; pp is percentage points of debt/GDP and growth
 * is a fraction. SS load covers SS pensions, not Clases Pasivas or private funds.
 *
 * Snowball decomposition: 100 * (I_t - g_t * D_(t-1)) / nominalGDP_t.
 * Total signed interest includes interest on new issuance. This is an ex-post
 * accounting contribution, not a prediction of exponential growth or default.
 * ECB Economic Bulletin 2/2019, equation 1 and Chart A definition of i:
 * https://www.ecb.europa.eu/press/economic-bulletin/focus/2019/html/ecb.ebbox201902_06~0c96ee6f7c.en.html
 * Primary deficits, financial adjustments and cash movements separately affect
 * the debt ratio. Gross refinancing is not additional debt in this indicator.
 */
export function describeFundingPressure(result, flow, limits, { inflationRate, baseYear = 2026 } = {}) {
  const validatedLimits = validateLimits(limits);
  const assessment = describeSustainability(result, validatedLimits);
  if (!Number.isInteger(baseYear) || result.years[0].year !== baseYear) {
    throw new RangeError('Funding pressure result must start at baseYear');
  }
  if (!flow || !Number.isInteger(flow.year)) throw new TypeError('A selected nominal money flow is required');
  const selectedIndex = result.years.findIndex(point => point.year === flow.year);
  if (selectedIndex < 0) throw new RangeError('Funding pressure selected year is missing');
  const point = result.years[selectedIndex], current = assessment.years[selectedIndex];
  const factors = result.years.map(row => priceFactorFor(row, { inflationRate, baseYear }));
  const priceFactor = factors[selectedIndex];
  if (flow.priceFactor !== priceFactor) throw new RangeError('Funding pressure flow price factor does not match the selected year');
  const funding = describePensionFunding(point, { priceFactor });
  const ownUsed = finite(funding.contributionsUsed + funding.mutuaUsed, 'SS own resources', true);
  const ownAvailable = finite(funding.contributions + funding.mutuaTransfer, 'SS available own resources', true);
  const benefits = funding.ssBenefits;

  let firstActiveYear = null, reinforcingYears = 0, selectedSnowball;
  for (let index = 0; index < result.years.length; index++) {
    const row = result.years[index], factor = factors[index];
    const nominalGDP = finite(finite(row.gdp, 'GDP', true) * factor, 'nominal GDP', true);
    if (nominalGDP === 0) throw new RangeError('Funding pressure nominal GDP must be positive');
    const interest = finite(finite(row.interest, 'interest') * factor, 'nominal interest');
    const primaryBalance = finite((finite(row.stateBalance, 'state balance') + row.interest) * factor, 'nominal primary balance');
    const primaryDeficit = positive(-primaryBalance);
    let pp = null, growth = null, active = false;
    if (index > 0) {
      const previousGDP = result.years[index - 1].gdp * factors[index - 1];
      growth = finite(nominalGDP / previousGDP - 1, 'nominal GDP growth');
      const openingDebt = finite(finite(row.openingDebtReal, 'opening debt', true) * factor, 'nominal opening debt', true);
      pp = finite((interest - growth * openingDebt) / nominalGDP * 100, 'snowball contribution');
      active = pp > PP_TOLERANCE;
      if (active && firstActiveYear === null) firstActiveYear = row.year;
      reinforcingYears = active && primaryDeficit > 0 ? reinforcingYears + 1 : 0;
    }
    if (index === selectedIndex) {
      selectedSnowball = { pp, growth, primaryDeficit, active, consecutiveReinforcingYears: reinforcingYears };
    }
  }

  const totalInflow = finite(flow.totalInflow, 'total inflow', true);
  const totalOutflow = finite(flow.totalOutflow, 'total outflow', true);
  return {
    ss: {
      loadPct: load(benefits, ownAvailable), ownUsed, ownAvailable, benefits,
      taxTransfer: funding.ssTaxTransfer, loanNeed: funding.ssUnfunded,
      capacityNote: ownAvailable === 0 && benefits > 0 ? 'Sin recursos propios para cubrir estos pagos.' : null
    },
    state: {
      loadPct: load(totalOutflow, totalInflow),
      deficit: finite(current.stateDeficit * priceFactor, 'nominal deficit', true),
      otherBalance: finite(finite(point.otherBudgetBalance, 'other budget balance') * priceFactor, 'nominal other budget balance'),
      ssTaxTransfer: funding.ssTaxTransfer,
      cashUsed: selectedIndex === 0 ? null : finite(flow.cashUsed, 'cash used', true),
      debtAdded: selectedIndex === 0 ? null : finite(flow.debtAdded, 'debt added', true)
    },
    debt: { loadPct: load(point.debtGDP, validatedLimits.maxDebtGDP), debtGDP: point.debtGDP, limit: validatedLimits.maxDebtGDP },
    status: current.status, breaches: { ...current.breaches }, reasons: [...current.reasons],
    limits: { ...validatedLimits }, firstBreachYear: assessment.firstBreachYear,
    snowball: { ...selectedSnowball, firstActiveYear }
  };
}
