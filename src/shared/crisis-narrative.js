// The milestones of the common verdict, in two layers (docs/PLAN-RIESGO-Y-RELATO.md):
// 1. the risk of fiscal stress (src/shared/sovereign-risk.js): sourced and
//    contrasted with history;
// 2. the narrative of rescue, haircut and default deduced from that risk with
//    editable rules. These are assumptions of the project: no published rule
//    says when a rescue becomes a haircut or a default.
// Pension adequacy is a third, separate dimension: it never mixes with the debt.
import { describeRiskPath } from './sovereign-risk.js';
import { pensionToWage } from '../sustainability.js';

export const NARRATIVE_DEFAULTS = Object.freeze({
  enabled: true,
  // Rescue: this many years in a row of high risk while the debt does not stabilise.
  bailoutYears: 2,
  // Haircut: after the rescue, this many more years of high risk without the debt stabilising.
  restructuringYears: 3,
  // «Sin rescate»: the rescue is not granted and the State defaults the year after.
  noRescue: false
});

export const PENSION_ADEQUACY_DEFAULTS = Object.freeze({ floor: 0.40 });

/** Options of the three layers from a configuration (missing keys → defaults). */
export function verdictOptions(config = {}) {
  const num = (key, fallback) => Number.isFinite(config[key]) ? config[key] : fallback;
  const risk = Object.fromEntries([['highIndex', 'riskHighIndex'], ['moderateIndex', 'riskModerateIndex'],
    ['sustainYears', 'riskSustainYears'], ['stabilisationYears', 'riskStabilisationYears'], ['fundBackingWeight', 'crisisFundBackingWeight']]
    .filter(([, key]) => Number.isFinite(config[key])).map(([option, key]) => [option, config[key]]));
  return {
    risk,
    narrative: {
      enabled: num('narrativeMilestones', 1) === 1,
      bailoutYears: num('narrativeBailoutYears', NARRATIVE_DEFAULTS.bailoutYears),
      restructuringYears: num('narrativeRestructuringYears', NARRATIVE_DEFAULTS.restructuringYears),
      noRescue: num('narrativeNoRescue', 0) === 1
    },
    pension: { floor: num('pensionAdequacyFloor', PENSION_ADEQUACY_DEFAULTS.floor) }
  };
}

const pct = x => `${(x * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;

/**
 * Rescue, haircut and default years from a risk path (`describeRiskPath`).
 * @param {object} risk
 * @param {object} [rules]  NARRATIVE_DEFAULTS overrides
 * @param {object} [o]      `{ hasActiveRescue }`: the user enacted a rescue policy
 */
export function describeNarrative(risk, rules = {}, { hasActiveRescue = false } = {}) {
  const r = { ...NARRATIVE_DEFAULTS, ...rules };
  const none = { rules: r, bailoutYear: null, restructuringYear: null, defaultYear: null, bailoutReason: null, restructuringReason: null, defaultReason: null };
  if (!r.enabled || !risk?.path) return none;
  const stabilisationYears = risk.options.stabilisationYears;
  const future = risk.path.filter(p => p.index != null);
  const bailout = future.find(p => p.highRun >= r.bailoutYears && p.unstableRun >= stabilisationYears);
  if (!bailout) return none;
  const out = { ...none, bailoutYear: bailout.year,
    bailoutReason: `Supuesto del simulador: ${r.bailoutYears} años seguidos de riesgo alto con la deuda sin estabilizarse desde ${bailout.year - bailout.unstableRun + 1} llevan a pedir un rescate.` };
  if (r.noRescue && !hasActiveRescue) {
    const next = future.find(p => p.year === bailout.year + 1);
    if (next) {
      out.defaultYear = next.year;
      out.defaultReason = `Supuesto del simulador («sin rescate»): el rescate de ${bailout.year} no llega y al año siguiente el Estado deja de poder pagar.`;
    }
    return out;
  }
  let run = 0;
  for (const p of future.filter(p => p.year > bailout.year)) {
    run = p.level === 'high' && p.unstableRun > 0 ? run + 1 : 0;
    if (run >= r.restructuringYears) {
      out.restructuringYear = p.year;
      out.restructuringReason = `Supuesto del simulador: tras el rescate de ${bailout.year}, ${r.restructuringYears} años más de riesgo alto sin que la deuda se estabilice llevan a una quita.`;
      break;
    }
  }
  return out;
}

/**
 * Average pension over average wage, with any citizen dividend, against a floor
 * (ILO Convention 102: 40 %). The engine's `replacementRate` already comes after
 * any pension cut in payment (it divides the benefits actually paid), so the cut
 * is not applied again here. A different measure from the Convention's (one
 * beneficiary against his own wage): the floor is a reference, editable.
 */
export function describePensionAdequacy(years = [], { floor = PENSION_ADEQUACY_DEFAULTS.floor } = {}) {
  const path = years.map(point => {
    // The same measure as your limits (src/domain/consola-measures.js) and
    // src/sustainability.js: replacement rate plus citizen dividend and
    // pension bonus over the average wage.
    const rate = pensionToWage(point);
    return { year: point.year, rate, adequate: rate == null ? null : rate >= floor };
  });
  const first = path.slice(1).find(p => p.adequate === false);
  return { floor, path, firstInsufficientYear: first?.year ?? null,
    reason: first ? `La pensión media cae al ${pct(first.rate)} del salario medio, por debajo de la referencia del ${pct(floor)} (Convenio 102 de la OIT).` : null };
}

/**
 * The verdict milestones of a projection. Keeps the shape the journey, the
 * stops and the verdict read (first bailout, restructuring and default years
 * with their reasons and stations) and adds the risk and adequacy layers.
 * @param {object[]} stations  train stations (one per engine year)
 * @param {object} o
 * @param {object[]} o.years   engine years, same order as the stations
 * @param {object} [o.config]
 */
export function summarizeCollapseMilestones(stations = [], { years = [], config = {} } = {}) {
  const opts = verdictOptions(config);
  const risk = describeRiskPath(years, opts.risk);
  // The same rule as the engine's crisis premium (src/shared/stress-premium.js, hasActiveRescue).
  const rescuePolicyStation = stations.find(st => st.year > (years[0]?.year ?? 2026) && (st.policyChanges ?? []).length > 0) ?? null;
  const hasActiveRescue = Boolean(rescuePolicyStation);
  const narrative = describeNarrative(risk, opts.narrative, { hasActiveRescue });
  const pension = describePensionAdequacy(years, opts.pension);
  stations.forEach((station, k) => {
    station.risk = risk.path[k] ?? null;
    station.pensionAdequacy = pension.path[k] ?? null;
  });
  const stationAt = year => stations.find(st => st.year === year) ?? null;
  return {
    // Risk layer (sourced).
    risk: { firstModerateYear: risk.firstModerateYear, firstHighYear: risk.firstHighYear,
      firstSustainedHighYear: risk.firstSustainedHighYear, debtNotStabilisingFrom: risk.debtNotStabilisingFrom, nearMiss: risk.nearMiss,
      highYears: risk.highYears, options: risk.options },
    firstStressYear: risk.firstModerateYear,
    firstHighRiskYear: risk.firstHighYear,
    firstSustainedHighYear: risk.firstSustainedHighYear,
    // Narrative layer (assumptions).
    narrative: { enabled: narrative.rules.enabled, rules: narrative.rules },
    firstBailoutYear: narrative.bailoutYear,
    firstBailoutReason: narrative.bailoutReason,
    firstBailoutStation: stationAt(narrative.bailoutYear),
    firstRestructuringYear: narrative.restructuringYear,
    firstRestructuringReason: narrative.restructuringReason,
    firstRestructuringStation: stationAt(narrative.restructuringYear),
    firstDefaultYear: narrative.defaultYear,
    firstDefaultReason: narrative.defaultReason,
    firstDefaultStation: stationAt(narrative.defaultYear),
    rescueActionYear: narrative.restructuringYear ?? narrative.bailoutYear ?? narrative.defaultYear ?? rescuePolicyStation?.year ?? null,
    rescuedInYear: rescuePolicyStation?.year ?? null,
    hasActiveRescue,
    // Pension adequacy (separate).
    pensionInsufficientYear: pension.firstInsufficientYear,
    pensionInsufficientReason: pension.reason,
    pensionFloor: pension.floor,
    isSolventThrough2070: !risk.firstSustainedHighYear && !narrative.bailoutYear
  };
}
