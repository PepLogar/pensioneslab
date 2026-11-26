import { describeSustainability, DEFAULT_LIMITS } from './sustainability.js';
import { describeFundingPressure } from './funding-pressure.js';
import { describeNominalMoneyFlow } from './fiscal-display-v9.js';
import { describeTrainPensionFunding } from './train-pension-funding.js';
import { needsFundingDecision } from './financing-gate.js';
import { describeStationFrictionAndBudget } from './budget-partitioner.js';
import { summarizeCollapseMilestones } from './shared/crisis-narrative.js';
import { workingPersonsOf } from './shared/working-persons.js';

const CALENDARS = [['fiscalRescues', 'taxes'], ['paymentAdjustments', 'payments'], ['debtRestructurings', 'restructuring']];

function finite(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid train station ${label}`);
  return value;
}

/** Reads the issuance surcharge already settled by the engine. Monetary
 * components are base-year euros in the projection and nominal exactly once
 * here, like the rest of the station accounts. The observed opening year is
 * never repriced. */
export function describeTrainRiskPremium(point, flow) {
  if (flow.isBase || !point.riskPremium) return null;
  const risk = point.riskPremium;
  return {
    ...risk,
    additionalBorrowing: flow.debtAdded,
    refinanced: flow.debtRefinanced,
    grossIssuance: flow.grossDebtIssuance,
    newDebtTermYears: point.newDebtTermYears ?? null,
    firstMaturityYear: point.newDebtFirstMaturityYear ?? null,
    lastMaturityYear: point.newDebtLastMaturityYear ?? null,
    maxNewDebtNominalRate: point.maxNewDebtNominalRate ?? risk.maxNominalRate ?? risk.nominalRate,
    interestThisYear: finite(point.riskPremiumInterestOnIssuance, 'riskPremiumInterestOnIssuance') * flow.priceFactor,
    annualCostOnIssuance: finite(point.riskPremiumAnnualCostOnIssuance, 'riskPremiumAnnualCostOnIssuance') * flow.priceFactor
  };
}

function describePath(result, config, limits) {
  const assessment = describeSustainability(result, limits);
  const baseYear = result.years[0].year;
  const options = { inflationRate: config.inflationRate, baseYear };
  const stations = result.years.map((point, index) => {
    const flow = describeNominalMoneyFlow(point, options);
    // Reuse the dashboard's exact snowball definition and selected limits.
    // This reads the supplied projection; it never calls the economic engine.
    const pressure = describeFundingPressure(result, flow, limits, options);
    const fundingDecision = needsFundingDecision(point, { baseYear });
    const current = assessment.years[index];
    const policyChanges = CALENDARS.flatMap(([key, kind]) =>
      (config[key] ?? []).filter(policy => policy.year === point.year).map(policy => ({ kind, ...policy })));
    const station = {
      year: point.year,
      status: index === 0 ? (point.retro1985 ? 'historical' : 'base') : current.status === 'outside' ? 'limit' :
        fundingDecision || current.status === 'pressure' ? 'funding' : 'covered',
      borrowing: flow.debtAdded, debt: flow.closingDebt,
      balance: flow.balance, shortfall: Math.max(0, -flow.balance), cashUsed: flow.cashUsed,
      stockFlowAdjustment: flow.stockFlowAdjustment,
      income: flow.totalInflow, outgo: flow.totalOutflow, interest: flow.interestCurrent,
      pensionMonthly: finite(point.averagePensionAnnual, 'averagePensionAnnual') / 12,
      replacementRate: Number.isFinite(point.replacementRate) ? point.replacementRate : 0,
      debtGDP: Number.isFinite(point.debtGDP) ? point.debtGDP : 0,
      baseRateDebtGDP: Number.isFinite(point.baseRateDebtGDP) ? point.baseRateDebtGDP : (Number.isFinite(point.debtGDP) ? point.debtGDP : 0),
      pensionGapGDP: Number.isFinite(point.pensionGapGDP) ? point.pensionGapGDP : 0,
      structuralPensionGapGDP: Number.isFinite(point.structuralPensionGapGDP) ? point.structuralPensionGapGDP : (Number.isFinite(point.pensionGapGDP) ? point.pensionGapGDP : 0),
      transitionContributionsGDP: Number.isFinite(point.transitionContributionsGDP) ? point.transitionContributionsGDP : 0,
      fundedAssets: Number.isFinite(point.fundedAssets) ? point.fundedAssets : 0,
      fundedAssetsGDP: Number.isFinite(point.fundedAssetsGDP) ? point.fundedAssetsGDP : (point.gdp > 0 && Number.isFinite(point.fundedAssets) ? point.fundedAssets / point.gdp * 100 : 0),
      // Contributors per retiree and «per worker» figures count persons who work (1.56);
      // `workers` stays the full-time equivalents of payroll and GDP.
      supportRatio: point.retirees > 0 ? workingPersonsOf(point) / point.retirees : 0,
      workers: finite(point.workers, 'workers'), workingPersons: finite(workingPersonsOf(point), 'workingPersons'),
      retirees: finite(point.retirees, 'retirees'),
      breaches: { ...current.breaches }, reasons: [...current.reasons],
      snowball: { ...pressure.snowball }, policyChange: policyChanges.length > 0, policyChanges,
      fundingDecision, publicPensionNeed: current.publicPensionNeed * flow.priceFactor,
      pensionFunding: describeTrainPensionFunding(point, { priceFactor: flow.priceFactor }),
      riskPremium: describeTrainRiskPremium(point, flow),
      // The year's price index: the station's accounts are in euros of its year; the screen divides
      // by it to show euros of 2026 (stationInEuros2026).
      priceIndex: flow.priceFactor,
      reference: null
    };
    station.seismic = describeStationFrictionAndBudget(point, flow, station, config, null, index > 0 ? result.years[index - 1] : null);
    return station;
  });
  const collapseMilestones = summarizeCollapseMilestones(stations, { years: result.years, config });
  for (const station of stations) {
    if (station.year === collapseMilestones.firstDefaultYear) station.collapseFlag = 'default';
    else if (station.year === collapseMilestones.firstRestructuringYear) station.collapseFlag = 'restructuring';
    else if (station.year === collapseMilestones.firstBailoutYear) station.collapseFlag = 'bailout';
    else if (station.year === collapseMilestones.firstStressYear) station.collapseFlag = 'stress';
    else station.collapseFlag = null;
  }
  return {
    stations,
    collapseMilestones,
    firstBailoutYear: collapseMilestones.firstBailoutYear,
    firstRestructuringYear: collapseMilestones.firstRestructuringYear,
    firstDefaultYear: collapseMilestones.firstDefaultYear,
    firstFundingYear: stations.slice(1).find(station => station.fundingDecision)?.year ?? null,
    firstBreachYear: assessment.firstBreachYear,
    // The reader's own minimum, in points of the wage: what `breaches.adequacy` was judged against.
    adequacyLimit: limits?.minReplacementRate ?? DEFAULT_LIMITS.minReplacementRate,
    firstRiskPremiumYear: stations.slice(1).find(station => station.riskPremium?.premiumRate > 0)?.year ?? null,
    snowballYear: stations[0].snowball.firstActiveYear,
    firstFrictionYear: stations.slice(1).find(station => station.seismic?.level === 'friction' || station.seismic?.level === 'explosion')?.year ?? null,
    firstExplosionYear: stations.slice(1).find(station => station.seismic?.level === 'explosion')?.year ?? null,
    // The 2023 closing clause, only when it is on: the first year the MEI rises.
    closingClause: result.closingClause ? describeClosingClauseMilestone(result) : null,
    closingClauseYear: result.closingClause?.ramps?.[0]?.start ?? null
  };
}

/** The evaluation that first starts a rise of the MEI, in a few words for the train. */
function describeClosingClauseMilestone(result) {
  const first = result.closingClause.evaluations.find(evaluation => evaluation.startsRamp);
  if (!first) return { note: 'Ninguna evaluación supera el 13,3 %' };
  const points = (first.excess * 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return { evaluationYear: first.year, note: `Exceso de ${points} puntos en la evaluación de ${first.year}` };
}

/** The board is a view over already calculated annual accounts. Public money
 * is nominal for each station; monthly pensions retain base-year purchasing
 * power and a twelve-payment equivalent. A limit breach is not payment default.
 * Continuity uses its OWN price path and the SAME user-selected limits. */
export function describeTrainJourney(result, {
  config = result?.config, limits, selectedYear = result?.years?.[0]?.year, reference = null
} = {}) {
  if (!config || !Number.isInteger(selectedYear)) throw new TypeError('A train configuration and integer selected year are required');
  const journey = describePath(result, config, limits);
  const selected = journey.stations.find(station => station.year === selectedYear);
  if (!selected) throw new RangeError('Selected train year is outside the calculated projection');
  let referenceMilestones = null, matchesReference = false;
  if (reference) {
    const continuity = describePath(reference, reference.config ?? config, limits);
    if (continuity.stations.length !== journey.stations.length ||
        continuity.stations.some((station, index) => station.year !== journey.stations[index].year)) {
      throw new RangeError('Continuity and train must cover the same annual horizon');
    }
    // The scenario is the reference itself when every station moves the same money: its milestones then have
    // nothing to be compared with (docs/REVISION-CUANDO-SE-ROMPE-EXPERTO-2026-11-11.md, A).
    matchesReference = continuity.stations.every((row, index) => {
      const own = journey.stations[index];
      return row.debt === own.debt && row.borrowing === own.borrowing
        && row.pensionMonthly === own.pensionMonthly && row.fundedAssetsGDP === own.fundedAssetsGDP;
    });
    for (let index = 0; index < journey.stations.length; index++) {
      const row = continuity.stations[index];
      journey.stations[index].reference = {
        borrowing: row.borrowing, debt: row.debt, pensionMonthly: row.pensionMonthly,
        replacementRate: row.replacementRate, debtGDP: row.debtGDP, baseRateDebtGDP: row.baseRateDebtGDP,
        pensionGapGDP: row.pensionGapGDP, fundedAssetsGDP: row.fundedAssetsGDP, supportRatio: row.supportRatio,
        status: row.status, breaches: { ...row.breaches }, snowball: { ...row.snowball },
        pensionFunding: row.pensionFunding, riskPremium: row.riskPremium, priceIndex: row.priceIndex
      };
    }
    referenceMilestones = {
      firstFundingYear: continuity.firstFundingYear,
      firstBreachYear: continuity.firstBreachYear,
      firstRiskPremiumYear: continuity.firstRiskPremiumYear,
      snowballYear: continuity.snowballYear,
      firstFrictionYear: continuity.firstFrictionYear,
      firstExplosionYear: continuity.firstExplosionYear,
      firstBailoutYear: continuity.firstBailoutYear,
      firstRestructuringYear: continuity.firstRestructuringYear,
      firstDefaultYear: continuity.firstDefaultYear,
      closingClauseYear: continuity.closingClauseYear
    };
  }
  return { ...journey, selected, referenceMilestones, matchesReference };
}

// What the screen shows: every amount in euros of 2026, like the pension
// (docs/PROPUESTA-EUROS-CONSTANTES-2026-11-09.md). The journey keeps the euros of each year, so no
// verdict, milestone or gate moves: within a year every amount is divided by the same price index.
// The budget of the year (`seismic`) keeps its euros and its `priceFactor`; its views divide when they show it.
const STATION_MONEY = ['borrowing', 'debt', 'balance', 'shortfall', 'cashUsed', 'stockFlowAdjustment', 'income', 'outgo', 'interest', 'publicPensionNeed'];
const FUNDING_MONEY = ['cost', 'contributions', 'mutuas', 'contributionsAndMutuas', 'taxes', 'missing'];
const PREMIUM_MONEY = ['additionalBorrowing', 'refinanced', 'grossIssuance', 'interestThisYear', 'annualCostOnIssuance'];

const deflate = (object, keys, index) => {
  if (!object) return object;
  const out = { ...object };
  for (const key of keys) if (Number.isFinite(out[key])) out[key] = out[key] / index;
  return out;
};
const fundingIn2026 = (funding, index) => funding && {
  ...deflate(funding, FUNDING_MONEY, index),
  excess: deflate(funding.excess, ['contributions', 'mutuas', 'taxes'], index)
};

/** A station with its amounts in euros of 2026 (its `reference`, «seguir igual», with its own prices). */
export function stationInEuros2026(station) {
  const index = station?.priceIndex;
  if (!(index > 0)) return station;
  const out = { ...deflate(station, STATION_MONEY, index),
    pensionFunding: fundingIn2026(station.pensionFunding, index),
    riskPremium: deflate(station.riskPremium, PREMIUM_MONEY, index),
    euros2026: true };
  const ref = station.reference, refIndex = ref?.priceIndex;
  if (ref && refIndex > 0) {
    out.reference = { ...deflate(ref, ['borrowing', 'debt'], refIndex),
      pensionFunding: fundingIn2026(ref.pensionFunding, refIndex),
      riskPremium: deflate(ref.riskPremium, PREMIUM_MONEY, refIndex) };
  }
  return out;
}

const stationsIn2026 = new WeakMap();
/** The journey for the screen. The callers wrap the same stations in a new object each time;
 * the converted stations are kept per stations array, so views can still tell when they changed. */
export function journeyInEuros2026(journey) {
  if (!journey?.stations) return journey;
  if (!stationsIn2026.has(journey.stations)) stationsIn2026.set(journey.stations, journey.stations.map(stationInEuros2026));
  const stations = stationsIn2026.get(journey.stations);
  const selected = journey.selected ? stations.find(station => station.year === journey.selected.year) ?? journey.selected : journey.selected;
  return { ...journey, stations, selected };
}
