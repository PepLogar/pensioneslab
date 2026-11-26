/** User-selected comparison criteria, not legal limits or a solvency model. */
export const DEFAULT_LIMITS = Object.freeze({
  maxDebtGDP: 150, maxPensionGapGDP: 5, minReplacementRate: 40
});
const RANGES = { maxDebtGDP: [0, 500], maxPensionGapGDP: [0, 30], minReplacementRate: [0, 100] };
const LABELS = { base: 'Año base', within: 'Dentro de tus límites',
  pressure: 'Presión de financiación', outside: 'Fuera de tus límites' };
// Amounts are euros in the model's price basis. Ignore sub-cent arithmetic
// residue in derived flows, never round the actual scenario or ratio limits.
const EURO_TOLERANCE = 0.01;
const positiveEuros = value => value > EURO_TOLERANCE ? value : 0;

/** Merge a partial limits object; never coerce, clamp or silently discard keys. */
export function validateLimits(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new TypeError('Limits must be a plain object');
  }
  const limits = { ...DEFAULT_LIMITS };
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !Object.hasOwn(RANGES, key)) {
      throw new TypeError(`Unknown limits field: ${String(key)}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`limits.${key} cannot be an accessor`);
    limits[key] = descriptor.value;
  }
  for (const [key, [min, max]] of Object.entries(RANGES)) {
    const value = limits[key];
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new RangeError(`Invalid ${key}: expected ${min}…${max}`);
    }
  }
  return limits;
}

function finite(point, key, nonnegative = false) {
  const value = point[key];
  if (!Number.isFinite(value) || (nonnegative && value < 0)) {
    throw new RangeError(`Invalid scenario ${point.year}.${key}`);
  }
  return value;
}

/**
 * Read annual model outputs only. Gross private funded reserves and NDC rights
 * never offset public debt, public pension need or the selected thresholds.
 * Missing/nonfinite measures fail explicitly instead of claiming success.
 */
export function describeSustainability(result, inputLimits = {}) {
  const limits = validateLimits(inputLimits);
  if (!Array.isArray(result?.years) || result.years.length === 0) {
    throw new TypeError('A nonempty annual scenario is required');
  }
  const years = result.years.map((point, index) => {
    if (!point || !Number.isInteger(point.year) ||
        (index > 0 && point.year !== result.years[index - 1].year + 1)) {
      throw new RangeError('Scenario years must be consecutive integers');
    }
    const pensionGap = finite(point, 'pensionGap'), stateBalance = finite(point, 'stateBalance');
    const debt = finite(point, 'debt', true), cash = finite(point, 'cash', true);
    const debtGDP = finite(point, 'debtGDP', true), gapGDP = finite(point, 'pensionGapGDP');
    finite(point, 'replacementRate', true);
    const replacementPct = pensionToWage(point) * 100;
    const fundedAssets = finite(point, 'fundedAssets', true);
    const count = finite(point, 'closingRetirementCount', true);
    const publicPensionNeed = positiveEuros(pensionGap), pensionMargin = positiveEuros(-pensionGap);
    const stateDeficit = positiveEuros(-stateBalance);
    let newBorrowing = null, cashUsed = null, newRetirements = null;
    if (index > 0) {
      // fiscal-core re-expresses opening debt AND cash at the current real
      // price basis. Comparing with unadjusted prior debt confuses inflation
      // with borrowing; comparing with unadjusted prior cash overstates use.
      newBorrowing = positiveEuros(debt - finite(point, 'openingDebtReal', true));
      cashUsed = positiveEuros(finite(point, 'openingCashReal', true) - cash);
      const entries = count - result.years[index - 1].closingRetirementCount + finite(point, 'retiredDeaths', true);
      if (entries < -1e-7) throw new RangeError(`Inconsistent retirement stock identity: ${point.year}`);
      newRetirements = Math.max(0, entries);
    }
    // Strict thresholds: a value exactly on a chosen boundary is inside it.
    const breaches = { debt: debtGDP > limits.maxDebtGDP,
      pensionGap: gapGDP > limits.maxPensionGapGDP,
      adequacy: replacementPct < limits.minReplacementRate };
    const outside = Object.values(breaches).some(Boolean);
    const status = index === 0 ? 'base' : outside ? 'outside' :
      publicPensionNeed > 0 || stateDeficit > 0 ? 'pressure' : 'within';
    const reasons = [];
    if (index === 0) reasons.push('Referencia inicial; no determina el primer año de necesidad ni de incumplimiento.');
    if (breaches.debt) reasons.push(`La deuda supera tu límite del ${limits.maxDebtGDP}\u00a0% del PIB.`);
    if (breaches.pensionGap) reasons.push(`Lo que falta para pensiones supera tu límite del ${limits.maxPensionGapGDP}\u00a0% del PIB.`);
    if (breaches.adequacy) reasons.push(`La pensión media queda por debajo de tu mínimo del ${limits.minReplacementRate}\u00a0% del salario.`);
    if (publicPensionNeed > 0) reasons.push('Las pensiones públicas requieren financiación adicional a las cuotas y la asignación presupuestaria del escenario.');
    if (stateDeficit > 0) reasons.push('El conjunto de las cuentas públicas presenta déficit; su cobertura depende de la caja y la deuda.');
    if (status === 'within') reasons.push('Dentro de tus límites y sin necesidad adicional de pensiones ni déficit público en este año del escenario.');
    return { year: point.year, publicPensionNeed, pensionMargin, stateDeficit,
      newBorrowing, cashUsed, publicCash: cash, privateReserve: fundedAssets,
      newRetirements, status, label: LABELS[status], reasons, breaches };
  });
  return { years,
    firstPensionNeedYear: years.slice(1).find(point => point.publicPensionNeed > 0)?.year ?? null,
    firstBreachYear: years.slice(1).find(point => Object.values(point.breaches).some(Boolean))?.year ?? null,
    peakNeed: Math.max(...years.map(point => point.publicPensionNeed)),
    peakDebtGDP: Math.max(...result.years.map(point => point.debtGDP)) };
}

/**
 * The one measure of the pension against the wage, shared by pension adequacy
 * (src/shared/crisis-narrative.js), your limits (src/domain/consola-measures.js)
 * and this file: the engine's `replacementRate` (average pension over average
 * wage, already after any cut in payment) plus the citizen dividend (twelve
 * monthly payments) and the Demarquía pension bonus, both over the average
 * wage. Null when the replacement rate is missing.
 */
export function pensionToWage(point) {
  if (!Number.isFinite(point?.replacementRate)) return null;
  const future = point.futureScenario;
  const dividend = (future?.citizenDividendEffectiveMonthly ?? future?.citizenDividendMonthly ?? 0) * 12 +
    (future?.demarquiaPensionBonusAnnual ?? 0);
  return point.replacementRate + (point.wage > 0 ? dividend / point.wage : 0);
}
