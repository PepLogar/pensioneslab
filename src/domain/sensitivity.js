// «Sensibilidad» (sensibilidad.html): which assumption decides the result. Each assumption of «El mundo»,
// «Cómo responde la economía», the debt and the yardstick moves one at a time around the value it has in the
// open scenario (a step down and up, or the other option of a switch), everything else fixed. The effect is
// measured on the debt of 2070, the year «se rompe», the pension against the wage in 2050 and what is missing
// for pensions in 2050. The steps are the project's choice of a plausible range (S), said with each one.
// Pure: the page runs the engine.
import { computeVerdict } from './verdict.js';
import { pensionToWage } from '../sustainability.js';
import { settingEntry } from '../shared/settings-catalog.js';

const pct = v => `${(v * 100).toLocaleString('es-ES', { maximumFractionDigits: 2 }).replace('-', '−')} %`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// kind: 'delta' (± step, clamped), 'scale' (× (1 ∓ f), clamped), 'flip' (the other value of a 0/1 switch), 'set' (two values).
// `range` is the validator's range of the setting (src/config-current-v10.js); `floorKey` names a setting the value may
// not go below (the validator's pair rule), so every variant is a scenario the engine accepts.
export const SENSITIVITY = Object.freeze([
  { id: 'productividad', group: 'El mundo', key: 'productivityGrowth', also: ['realWageGrowth'], kind: 'delta', step: 0.005, range: [-0.01, 0.01], show: pct, why: '±0,5 puntos al año de productividad y salarios, juntos como en la consola' },
  { id: 'inmigracion', group: 'El mundo', key: 'entrantGrowth', kind: 'delta', step: 0.005, range: [-0.005, 0.01], show: pct, why: '±0,5 puntos al año de nuevas incorporaciones al empleo' },
  { id: 'empleo-airef', group: 'El mundo', key: 'airefShortRunEmployment', kind: 'flip', show: v => v ? 'como la AIReF' : 'del Ageing Report', why: 'el empleo y la inflación de 2027 a 2030 como prevé la AIReF (más empleo por la inmigración), o los del Ageing Report y el escenario' },
  { id: 'poblacion', group: 'El mundo', key: 'europop2023', kind: 'flip', show: v => v ? 'EUROPOP2023' : 'EUROPOP2025', why: 'la población de Eurostat de 2025, o la de 2023 con la que se hizo el Ageing Report' },
  { id: 'fecundidad', group: 'El mundo', key: 'targetFertility', kind: 'set', low: 1.0, high: 1.6, show: v => v ? v.toLocaleString('es-ES') : 'referencia', why: '1,0 y 1,6 hijos por mujer, frente a la referencia de EUROPOP2025 (≈ 1,2–1,4)' },
  { id: 'longevidad', group: 'El mundo', key: 'longevityGain', kind: 'delta', step: 0.3, range: [0, 0.8], show: v => `${v.toLocaleString('es-ES')} años/año`, why: '0,3 años más de vida por año de calendario' },
  { id: 'inflacion', group: 'El mundo', key: 'inflationRate', kind: 'delta', step: 0.01, range: [0, 0.1], show: pct, why: '±1 punto de inflación' },
  { id: 'rentabilidad', group: 'El mundo', key: 'realReturn', kind: 'delta', step: 0.01, range: [0, 0.06], show: pct, why: '±1 punto de rentabilidad real de los fondos' },
  { id: 'sanidad', group: 'El mundo', key: 'ageingCareSpending', kind: 'flip', show: v => v ? 'sí' : 'no', why: 'sanidad y dependencia crecen, o no, con el envejecimiento' },
  { id: 'senda-edad', group: 'El mundo', key: 'retirementAgeExitPath', kind: 'flip', show: v => v ? 'senda del Ageing Report' : 'perfil de 2026', why: 'la edad efectiva de jubilación sigue, o no, la senda del Ageing Report (+1,37 años desde 2040, con el premio por demora)' },
  { id: 'laffer', group: 'Cómo responde la economía', key: 'lafferSelfFinancing', kind: 'delta', step: 0.15, range: [0, 0.9], show: pct, why: '±15 puntos de autofinanciación de las subidas al trabajo' },
  { id: 'laffer-completa', group: 'Cómo responde la economía', key: 'lafferFullResponse', kind: 'flip', show: v => v ? 'sí' : 'no', why: 'las horas perdidas bajan, o no, cotizaciones, derechos y PIB' },
  { id: 'laffer-iva', group: 'Cómo responde la economía', key: 'lafferVatResponse', kind: 'flip', show: v => v ? 'sí' : 'no', why: 'el IVA baja, o no, las horas' },
  { id: 'impuestos-sin-modelo', group: 'Cómo responde la economía', key: 'unmodeledTaxesFollowGDP', kind: 'flip', show: v => v ? 'con el PIB' : 'fijos', why: 'los impuestos sin modelo propio, fijos o con el PIB' },
  { id: 'permanencia', group: 'Cómo responde la economía', key: 'retirementDelayEmployment', kind: 'delta', step: 0.2, range: [0.4, 1], show: pct, why: '±20 puntos de quienes siguen trabajando al retrasar la jubilación' },
  { id: 'interes', group: 'La deuda', key: 'realInterestRate', kind: 'delta', step: 0.01, range: [-0.02, 0.06], show: pct, why: '±1 punto de interés real de la deuda' },
  { id: 'prima', group: 'La deuda', key: 'riskPremiumAt10pp', kind: 'scale', f: 0.5, range: [0, 0.01], show: v => `${(v * 1e4).toLocaleString('es-ES', { maximumFractionDigits: 1 })} pb`, why: 'la prima por deuda, a la mitad y una vez y media' },
  { id: 'umbral-prima', group: 'La deuda', key: 'riskDebtThreshold', kind: 'delta', step: 0.2, range: [0.6, 2], show: pct, why: '±20 puntos de PIB en la deuda desde la que sube el interés' },
  { id: 'prima-crisis', group: 'La deuda', key: 'stressPremium', kind: 'flip', show: v => v ? 'sí' : 'no', why: 'prima de riesgo por crisis, o no' },
  { id: 'plazo', group: 'La deuda', key: 'newDebtTermYears', kind: 'set', low: 7, high: 12, show: v => `${v.toLocaleString('es-ES')} años`, why: 'deuda nueva a 7 y a 12 años de media' },
  { id: 'riesgo-alto', group: 'La vara de medir', key: 'riskHighIndex', kind: 'delta', step: 0.06, range: [0.05, 1], floorKey: 'riskModerateIndex', show: v => v.toLocaleString('es-ES'), why: '±0,06 en el índice desde el que el riesgo es alto' },
  { id: 'anios-rompe', group: 'La vara de medir', key: 'riskSustainYears', kind: 'delta', step: 1, range: [1, 10], show: v => `${v} ${v === 1 ? 'año' : 'años'}`, why: '±1 año seguido de riesgo alto para decir «se rompe»' }
]);

/** The two variants of an assumption around the scenario's value: [{ side, value, patch }]; one when the other is the same value. */
export function variants(item, config) {
  const now = config[item.key];
  const [lo, hi] = item.range ?? [-Infinity, Infinity];
  const floor = item.floorKey && Number.isFinite(config[item.floorKey]) ? Math.max(lo, config[item.floorKey]) : lo;
  let values;
  if (item.kind === 'flip') values = [now ? 0 : 1];
  else if (item.kind === 'set') values = [item.low, item.high];
  else if (item.kind === 'scale') values = [clamp(now * (1 - item.f), floor, hi), clamp(now * (1 + item.f), floor, hi)];
  else values = [clamp(now - item.step, floor, hi), clamp(now + item.step, floor, hi)];
  values = [...new Set(values.map(v => Number(v.toFixed(10))))].filter(v => v !== now);
  return values.map(value => ({ value, patch: Object.fromEntries([item.key, ...(item.also ?? [])].map(k => [k, value])) }));
}

/** What a run says, for the comparison. */
export function measures(result) {
  const at = y => result.years.find(p => p.year === y);
  const verdict = computeVerdict(result);
  const p2050 = at(2050), p2070 = at(2070);
  return {
    debt2070: p2070?.debtGDP ?? null,
    breakYear: verdict?.firstProblemYear ?? null,
    pension2050: p2050 ? (pensionToWage(p2050) ?? NaN) * 100 : null,
    gap2050: p2050?.pensionGapGDP ?? null
  };
}

/**
 * The rows of the table and the tornado: per assumption, its base value, its variants with their measures
 * and their change from the base, ordered by the largest change in the debt of 2070.
 */
export function rankEffects(base, rows) {
  return rows.map(row => {
    const effects = row.runs.map(r => ({ ...r, delta: { debt2070: r.m.debt2070 - base.debt2070, pension2050: r.m.pension2050 - base.pension2050, gap2050: r.m.gap2050 - base.gap2050,
      // Years earlier (−) or later (+) it breaks; «never» counts as 2071 so a variant that stops the break shows.
      breakYear: (r.m.breakYear ?? 2071) - (base.breakYear ?? 2071) } }));
    const reach = Math.max(0, ...effects.map(e => Math.abs(e.delta.debt2070) || 0));
    const breakReach = Math.max(0, ...effects.map(e => Math.abs(e.delta.breakYear)));
    const idle = effects.every(e => Math.abs(e.delta.debt2070) < 0.05 && e.delta.breakYear === 0 && Math.abs(e.delta.pension2050) < 0.05 && Math.abs(e.delta.gap2050) < 0.005);
    return { ...row, effects, reach, breakReach, idle };
  }).sort((a, b) => b.reach - a.reach || b.breakReach - a.breakReach);
}

export const settingLabel = key => settingEntry(key)?.name ?? key;
