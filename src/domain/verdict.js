// The ONE sustainability verdict used everywhere in the app.
// Built on the verdict milestones of the train journey
// (`summarizeCollapseMilestones`, src/shared/crisis-narrative.js), so cards,
// train, charts and Excel always agree. Since 1.36 it has three layers:
// - the risk of fiscal stress (fiscal S0 index; sourced): its first year of
//   sustained high risk is the reference year, `firstProblemYear`;
// - the narrative of rescue, haircut and default (editable assumptions);
// - pension adequacy (average pension against the ILO 40 % reference), apart.

import { describeTrainJourney } from '../train-journey.js';
import { DEFAULT_LIMITS } from '../sustainability.js';
import { num } from '../shared/number-format.js';

// A break year «on the edge»: a variable came within this distance of the threshold that alone would have made
// the risk high in an earlier year (docs/REVISION-ADVERSARIAL-2026-11-24.md, 55; docs/modelo/04).
export const EDGE_GAP = 0.5;

// One rule for the verdict and the sustainability light (the author, lote 2): a system
// breaks («Se rompe») in its first problem year, that is the first of `riskSustainYears`
// years in a row of high risk, or the year the average pension falls below the ILO
// reference. A rescue, a haircut or a default only follow a break; they do not make it.
// `state` is the light's name for the same tone (src/domain/sustainability-light.js).
export const VERDICT_TONES = Object.freeze({
  ok: Object.freeze({ tone: 'ok', state: 'holds', label: 'Aguanta', icon: '●', color: '#15803d' }),
  effort: Object.freeze({ tone: 'effort', state: 'weakens', label: 'Aguanta, con avisos', icon: '●', color: '#b45309' }),
  fail: Object.freeze({ tone: 'fail', state: 'breaks', label: 'Se rompe', icon: '●', color: '#b91c1c' })
});

const cache = new WeakMap();
const pct = x => `${(x * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;

/** Tone and sentence from the verdict milestones. Shared by computeVerdict,
 * the stored grid cells and pages that already hold a train journey (Viaje). */
export function verdictFromMilestones(cm = {}) {
  const highYear = cm.firstSustainedHighYear ?? null;
  const bailoutYear = cm.firstBailoutYear ?? null;
  const restructuringYear = cm.firstRestructuringYear ?? null;
  const defaultYear = cm.firstDefaultYear ?? null;
  const rescuedYear = cm.rescuedInYear ?? null;
  const pensionYear = cm.pensionInsufficientYear ?? null;
  const floor = cm.pensionFloor ?? 0.40;
  const firstProblemYear = [highYear, pensionYear].filter(Number.isInteger).sort((a, b) => a - b)[0] ?? null;
  const failure = firstProblemYear == null ? null : highYear != null && highYear <= (pensionYear ?? Infinity) ? 'debt' : 'pension';

  const debtSentence = highYear == null ? ''
    : defaultYear ? `Desde ${highYear} el riesgo de crisis de deuda es alto. Sin rescate, el simulador supone que el Estado deja de pagar su deuda en ${defaultYear}. Es un supuesto, no una previsión.`
      : restructuringYear ? `Desde ${highYear} el riesgo de crisis de deuda es alto. Con la deuda sin estabilizarse, el simulador supone un rescate en ${bailoutYear} y una quita (perdonar parte de la deuda) en ${restructuringYear}. Son supuestos, no previsiones.`
        // «Llega a 2070» only when the reader's own measure came once the risk was high and the rescue leaves years to
        // run: a measure years before, or a rescue in the last year, carries nothing (1.82).
        : bailoutYear ? `Desde ${highYear} el riesgo de crisis de deuda es alto. El simulador supone un rescate en ${bailoutYear}${rescuedYear && rescuedYear >= highYear && bailoutYear < 2070 ? ', y con él llega a 2070' : ''}. Es un supuesto, no una previsión.`
          : `Desde ${highYear} el riesgo de crisis de deuda es alto.`;
  const nearMiss = cm.risk?.nearMiss ?? null;
  const edge = highYear != null && nearMiss && nearMiss.gap < EDGE_GAP && nearMiss.year < highYear ? nearMiss : null;
  const edgeSentence = edge ? ` Está al filo: en ${edge.year}, el indicador «${edge.label}» quedó a ${edge.gap < 0.005 ? 'menos de 0,01' : num(edge.gap, 2, { fixed: true })} ${edge.unit.startsWith('%') ? 'puntos del PIB' : edge.unit} de su umbral; si lo hubiera cruzado, el riesgo alto habría empezado antes.` : '';
  const pensionSentence = pensionYear == null ? ''
    : `En ${pensionYear} la pensión media cae por debajo del ${pct(floor)} del salario medio (referencia de la OIT).`;

  // A warning without a break: a moderate year, or a high one not sustained.
  const warningYear = cm.firstStressYear ?? cm.firstHighRiskYear ?? null;
  const base = firstProblemYear != null ? VERDICT_TONES.fail
    : warningYear != null ? VERDICT_TONES.effort : VERDICT_TONES.ok;
  const sentence = [debtSentence + edgeSentence, pensionSentence].filter(Boolean).join(' ') ||
    (cm.firstStressYear ? `Llega a 2070 sin riesgo alto sostenido (riesgo moderado o alto puntual desde ${cm.firstStressYear}).` : 'Llega a 2070 sin riesgo alto sostenido.');
  return {
    ...base,
    sustainedHighRiskYear: highYear,
    // Years in a row of high risk that make «se rompe» (riskSustainYears), for the texts.
    sustainYears: cm.risk?.options?.sustainYears ?? 2,
    highRiskYear: cm.firstHighRiskYear ?? null,
    moderateRiskYear: cm.firstStressYear ?? null,
    debtNotStabilisingFrom: cm.risk?.debtNotStabilisingFrom ?? cm.debtNotStabilisingFrom ?? null,
    bailoutYear,
    restructuringYear,
    defaultYear,
    rescuedYear,
    pensionInsufficientYear: pensionYear,
    firstProblemYear,
    // The near miss before the break, when it is within EDGE_GAP of the threshold (null otherwise).
    edge,
    // What breaks first: the financing of the State, or the adequacy of pensions.
    failure,
    sentence
  };
}

/**
 * @param {object} result  simulation result (`{ config, years }`)
 * @param {object} [opts]  `{ config, limits }`
 * @returns {{ tone, label, color, firstProblemYear, sustainedHighRiskYear, bailoutYear, restructuringYear, defaultYear, rescuedYear, pensionInsufficientYear, failure, sentence, journey }}
 */
export function computeVerdict(result, { config = result?.config, limits = DEFAULT_LIMITS } = {}) {
  if (!result?.years?.length) return null;
  const key = JSON.stringify(limits ?? null);
  const hit = cache.get(result);
  if (hit && hit.key === key) return hit.verdict;

  const journey = describeTrainJourney(result, {
    config: result.config ?? config,
    limits,
    selectedYear: result.years[0].year
  });
  const verdict = { ...verdictFromMilestones(journey.collapseMilestones), journey };
  cache.set(result, { key, verdict });
  return verdict;
}
