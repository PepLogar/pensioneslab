// The sustainability light: does each system hold until 2070, until when, and
// what would it take to hold. It answers the first question of the simulator
// («si no se sostiene, cobras 0») in plain words; the technical reading (fiscal
// S0 index, ILO reference) stays one click away. Built on the app-wide verdict
// (src/domain/verdict.js); the price comes from src/domain/sustainability-price.js.
// Kept free of the engine and the guide map so the home page stays light. Pure functions.
import { S0_SHORT } from '../shared/risk-wording.js';
import { NBSP, percent, points } from '../shared/number-format.js';

export const LIGHT_START_YEAR = 2026;

export const LIGHT_STATES = Object.freeze({
  holds: Object.freeze({ state: 'holds', label: 'Aguanta', color: 'green' }),
  weakens: Object.freeze({ state: 'weakens', label: 'Aguanta, con avisos', color: 'amber' }),
  breaks: Object.freeze({ state: 'breaks', label: 'Se rompe', color: 'red' })
});

// A mix of the guide's four levers, small for its kind, that holds until 2070 without leaving
// more debt than today: one combination that holds, not the only one (the pages say
// «Una combinación que basta… Hay otras»). Since 1.60 the author chooses it among those that
// pass (docs/PLAN-1.60-INVERSION-PUBLICA.md); scripts/calibrate-guide-recipes.mjs checks it
// (docs/evidence/recetas-guia-minimas.json, with what the rule alone would give);
// the guide's buttons in src/pages/palancas.js use the same values. Mixto con ahorro propio
// (1.52) has no workshop: its recipe shows in the light, the Laboratorio and Soluciones.
export const GUIDE_MIN_RECIPES = Object.freeze({
  payg: Object.freeze({ retirementAge: 68, irpfSurcharge: 20, contribution: 2, otherCut: 3 }),
  ndc: Object.freeze({ retirementAge: 68, irpfSurcharge: 10, contribution: 1.5, otherCut: 3 }),
  progressive: Object.freeze({ retirementAge: 68, irpfSurcharge: 30, contribution: 2.5, otherCut: 7 }),
  mixedGradual: Object.freeze({ retirementAge: 68, irpfSurcharge: 30, contribution: 2.5, otherCut: 6 })
});

/** «2,5 puntos»: contribution points with the number rule of the project. */
export function contributionPoints(value) {
  return points(value, 1);
}

/** «15 %»: the IRPF surcharge of a lever, already in percent. */
export function irpfPercent(value) {
  return percent(value, 1);
}

const CODE = { low: 'l', moderate: 'm', high: 'h' };
const LEVEL = { l: 'low', m: 'moderate', h: 'high' };

/** Risk path (`riskPathOf`) → one letter per year from 2026: l, m, h or - (no reading). */
export function encodeRiskPath(path) {
  const byYear = new Map((path ?? []).map(p => [p.year, p.level]));
  const last = Math.max(LIGHT_START_YEAR, ...byYear.keys());
  let out = '';
  for (let year = LIGHT_START_YEAR; year <= last; year++) out += CODE[byYear.get(year)] ?? '-';
  return out;
}

export function decodeRiskPath(text) {
  return [...(text ?? '')].map((ch, i) => ({ year: LIGHT_START_YEAR + i, level: LEVEL[ch] ?? null }));
}

/**
 * The light of one system.
 * @param {object} verdict  app-wide verdict (computeVerdict or verdictFromMilestones)
 * @param {{year: number, level: string|null}[]} path  yearly risk of fiscal stress
 */
const WORDS = ['', 'un año', 'dos años seguidos', 'tres años seguidos', 'cuatro años seguidos', 'cinco años seguidos'];
const yearsInRow = n => WORDS[n ?? 2] ?? `${n} años seguidos`;

export function sustainabilityLight(verdict, path) {
  if (!verdict) return null;
  // The state is the verdict's own (one rule, src/domain/verdict.js): the light never decides it again.
  const base = LIGHT_STATES[verdict.state];
  if (!base) throw new TypeError('sustainabilityLight needs a verdict from verdictFromMilestones or computeVerdict');
  const breakYear = base === LIGHT_STATES.breaks ? verdict.firstProblemYear : null;
  const flojea = verdict.moderateRiskYear ?? verdict.highRiskYear ?? null;
  // Once a system breaks it stays broken: the strip does not turn green again
  // because the index dips for a year after a rescue.
  const cells = (path ?? []).map(p => ({
    year: p.year,
    color: breakYear != null && p.year >= breakYear ? 'red'
      : p.level === 'low' ? 'green' : p.level ? 'amber' : 'none'
  }));
  const debt = verdict.failure === 'debt';
  // On the edge (src/domain/verdict.js, EDGE_GAP): a small change could bring the break earlier; the headline says so.
  const edge = breakYear != null && verdict.failure === 'debt' ? verdict.edge ?? null : null;
  const headline = breakYear != null ? `Se rompe en ${breakYear}${edge ? ' (al filo)' : ''}`
    : flojea != null ? 'Aguanta hasta 2070, con avisos' : 'Aguanta hasta 2070';
  const why = breakYear == null
    ? (flojea != null ? `Desde ${flojea} hay años en que la deuda da un aviso de riesgo, pero no llega a romperse.` : 'Sin años de aviso.')
    // Not a sudden loss of trust (1.51, the author): a simile for the whole path, with two
    // halves that hold every year in every base debt failure (the deficit and the interest
    // bill). In «seguir igual» the surcharge and the snowball proper come after the break
    // year, and a «de golpe» system breaks at once (docs/RECORRIDO-1.51-OTRA-VUELTA.md).
    : debt ? (breakYear <= LIGHT_START_YEAR + 2 ? 'La deuda se dispara desde el primer año, y después crece como una bola de nieve.' : 'La deuda crece como una bola de nieve: cada año se pide más prestado y se pagan más intereses.')
      : 'La pensión media deja de ser suficiente: menos del 40 % del salario medio.';
  const technical = breakYear == null
    ? 'Sin riesgo alto sostenido de tensión fiscal hasta 2070 (' + S0_SHORT + ') y la pensión media por encima del 40 % del salario medio (referencia de la OIT).'
    : debt ? `Riesgo alto sostenido de tensión fiscal desde ${breakYear}: el ${S0_SHORT}, supera el umbral ${yearsInRow(verdict.sustainYears)}. Es una señal de riesgo, no una previsión de crisis.`
      : `En ${breakYear} la pensión media cae por debajo del 40 % del salario medio (referencia del Convenio 102 de la OIT).`;
  const edgeWhy = edge ? ` Está al filo: en ${edge.year} faltó muy poco para que el riesgo alto empezara antes.` : '';
  return { ...base, breakYear, failure: verdict.failure ?? null, flojeaYear: flojea, headline, why: why + edgeWhy, technical, cells, edge,
    pensionInsufficientYear: verdict.pensionInsufficientYear ?? null };
}

/**
 * The reason two or more broken lights share, to say it once over them (the light's `groupWhy`
 * and the system cards); null when no reason repeats. A reason of its own stays in its row.
 * @param {(object|null)[]} lights  results of sustainabilityLight
 */
export function sharedBreakWhy(lights) {
  const count = new Map();
  for (const light of lights) if (light?.state === LIGHT_STATES.breaks.state) count.set(light.why, (count.get(light.why) ?? 0) + 1);
  return [...count].find(([, times]) => times > 1)?.[0] ?? null;
}

/**
 * Plain sentences of the price: one per lever alone and one for the combination, in the
 * taller's units (src/domain/guide-levers.js). A lever alone that does not hold within the
 * values tried (the edge of the map or of the search) says so: past that edge nothing was
 * run. The recipe is one combination that holds, not the only one nor the smallest.
 */
export function priceSentences(price) {
  if (!price) return [];
  const out = [];
  if ('ageOnly' in price) out.push(price.ageOnly == null
    ? `Solo con la edad: jubilarse a los ${price.ageMax} aún no basta (no se ha probado más allá).`
    : price.ageOnly <= 65 ? 'Con la edad de hoy ya aguanta.'
      : `Solo con la edad: jubilarse a los ${price.ageOnly}.`);
  if ('irpfOnly' in price) out.push(price.irpfOnly == null
    ? `Solo con impuestos: recaudar un ${irpfPercent(price.irpfMax)} más por IRPF aún no basta (no se ha probado más allá).`
    : price.irpfOnly === 0 ? 'Sin subir impuestos ya aguanta.'
      : `Solo con impuestos: recaudar un ${irpfPercent(price.irpfOnly)} más por IRPF.`);
  const r = price.recipe;
  if (r) out.push(`Una combinación que basta sin dejar en 2070 más deuda que hoy: jubilarse a los ${r.retirementAge}, recaudar un ${irpfPercent(r.irpfSurcharge)} más por IRPF, subir la cotización ${contributionPoints(r.contribution)} y recortar un ${percent(r.otherCut, 1)} el resto del gasto público. Hay otras.`);
  return out;
}

/**
 * One way to hold, in one sentence: the Resumen's opening and «Compartir mi conclusión», in Modo
 * experto. A lever alone when one is enough, else the combination; never one that does not hold
 * (U1, #45). When neither lever alone holds and there is no combination, it says so. Null without a price.
 */
export function holdingWay(price) {
  if (!price) return null;
  const r = price.recipe;
  const way = price.ageOnly != null ? `jubilarse a los ${price.ageOnly}`
    : price.irpfOnly > 0 ? `recaudar un ${irpfPercent(price.irpfOnly)} más por IRPF`
      : r ? `jubilarse a los ${r.retirementAge}, recaudar un ${irpfPercent(r.irpfSurcharge)} más por IRPF, subir la cotización ${contributionPoints(r.contribution)} y recortar un ${percent(r.otherCut, 1)} el resto del gasto público`
        : null;
  if (way) return `Para que aguante bastaría, por ejemplo, con ${way}.`;
  return price.ageOnly === null && price.irpfOnly === null
    ? `Ni jubilarse a los ${price.ageMax} ni recaudar un ${irpfPercent(price.irpfMax)} más por IRPF bastan por sí solos.`
    : null;
}

/** How to read the price's units, under the rows that show one (the taller's wording). */
export const PRICE_UNITS_NOTE = `Cómo leer lo que haría falta: recaudar un 10${NBSP}% más por IRPF es que quien paga 100${NBSP}€ de IRPF pase a pagar 110${NBSP}€. Un punto más de cotización son 1${NBSP}€ más por cada 100${NBSP}€ de sueldo, entre empresa y trabajador. Cada cambio lo paga alguien: quien se jubila más tarde, quien paga IRPF, empresas y trabajadores, o los demás servicios públicos.`;

// Only orders the keys present: Mixto con ahorro propio shows up only where a page loads it.
export const LIGHT_ORDER = Object.freeze(['payg', 'ndc', 'progressive', 'mixedGradual', 'funded', 'mixed', 'retro1985']);
export const LIGHT_NOTES = Object.freeze({
  payg: 'El sistema de hoy',
  ndc: 'Reparto con una cuenta virtual por persona',
  progressive: 'Paso a un fondo común conforme fallecen quienes hoy cobran pensión',
  mixedGradual: 'La misma parte de la cuota de todos, poco a poco al ahorro propio desde 2027',
  funded: 'Todo a ahorro propio, de golpe',
  mixed: 'Parte a ahorro propio, de golpe',
  retro1985: 'No es una opción de hoy: nadie puede volver a 1985. Es una prueba: cómo estaríamos, con los supuestos del simulador, si el cambio hacia un fondo hubiera empezado entonces.'
});
export const PRICE_OWN_SCENARIO = 'Con tu escenario, lo que haría falta para aguantar no está calculado: las combinaciones ya calculadas parten de las reglas de hoy.';
export const PRICE_MISSING = 'Su precio para aguantar aún no está calculado.';

/**
 * Rows of the light in the usual order.
 * @param {{key, label, verdict, path}[]} items  one per system
 * @param {object|null} prices  `{ [sysKey]: priceToHold(...) }` from the guide map, when loaded
 * @param {{origin?: boolean}} [opts]  false when the scenario is not the origin one:
 *   the map and the recipes were found for the origin scenario, so no price is given.
 */
export function buildLightRows(items, prices = null, { origin = true } = {}) {
  const byKey = new Map(items.map(item => [item.key, item]));
  return LIGHT_ORDER.filter(key => byKey.has(key)).map(key => {
    const { label, verdict, path } = byKey.get(key);
    if (!origin) return { key, label, note: LIGHT_NOTES[key], light: sustainabilityLight(verdict, path), price: null, priceMissing: PRICE_OWN_SCENARIO };
    return { key, label, note: LIGHT_NOTES[key], light: sustainabilityLight(verdict, path),
      // Without the map (not loaded, or from an older engine) only the combination is known.
      price: prices?.[key] ?? (GUIDE_MIN_RECIPES[key] ? { recipe: GUIDE_MIN_RECIPES[key] } : null),
      priceMissing: GUIDE_MIN_RECIPES[key] ? null : PRICE_MISSING };
  });
}

/** The narrative stops in plain words, flagged as an assumption (src/shared/crisis-narrative.js). */
export function plainAftermath(verdict) {
  if (!verdict?.bailoutYear && !verdict?.defaultYear) return '';
  const steps = verdict.defaultYear && !verdict.bailoutYear ? `sin rescate, el Estado deja de pagar su deuda en ${verdict.defaultYear}`
    : [verdict.bailoutYear && `un rescate en ${verdict.bailoutYear}`,
      verdict.restructuringYear && `una quita de la deuda en ${verdict.restructuringYear}`,
      verdict.defaultYear && `el impago en ${verdict.defaultYear}`].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' y $1');
  return `Lo que suele venir después (supuesto del simulador): ${steps}.`;
}

/** Plain label, tone and sentence of a verdict, for the citizen pages (the guide). */
export function plainVerdict(verdict) {
  const light = sustainabilityLight(verdict, []);
  if (!light) return { label: '—', tone: 'effort', sentence: '' };
  return { label: light.headline, tone: verdict.tone,
    sentence: [light.why, plainAftermath(verdict)].filter(Boolean).join(' ') };
}
