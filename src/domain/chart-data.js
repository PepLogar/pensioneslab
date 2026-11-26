// «Gráficos» (graficos.html): the lines of a chart, read from the same series as the CSV export
// (src/domain/series-dictionary.js), so a chart and the file show the same figures. A chart holds
// variables of one unit; amounts can be shown in euros of 2026, in euros of each year or in % of GDP.
// Pure: no DOM.
import { SERIES_VARIABLES, SERIES_UNITS, seriesContext } from './series-dictionary.js';

export const VARIABLES = new Map(SERIES_VARIABLES.map(v => [v.id, v]));

export const VIEWS = Object.freeze({
  native: 'tal cual',
  nominal: 'en euros de cada año',
  gdp: 'en % del PIB'
});

/** The views a unit allows: amounts in real euros can also be nominal; aggregates also a share of GDP. */
export function viewsFor(unit) {
  if (unit === 'meur2026') return ['native', 'nominal', 'gdp'];
  if (unit === 'eur2026') return ['native', 'nominal'];
  return ['native'];
}

/** The unit as the axis says it, after the view. */
export function axisUnit(unit, view) {
  if (view === 'gdp') return '% del PIB del mismo año';
  if (view === 'nominal') return unit === 'meur2026' ? 'millones de euros de cada año' : 'euros de cada año';
  return SERIES_UNITS[unit]?.text ?? unit;
}

function valueIn(view, variable, point, context) {
  let value;
  try { value = variable.get(point, context); } catch { return null; }
  if (!Number.isFinite(value)) return null;
  if (view === 'nominal') return value * point.priceIndex;
  // Millions of euros of 2026 over GDP in euros of 2026 (the engine's real amounts).
  if (view === 'gdp') return point.gdp > 0 ? value * 1e6 / point.gdp * 100 : null;
  return value;
}

/**
 * @param {{ key: string, label: string, result: object }[]} runs  the scenario and the systems
 * @param {{ variables: string[], systems: string[], from: number, to: number, view: string }} spec
 * @returns {{ unit: string|null, lines: { system: string, systemLabel: string, variable: string, variableName: string, points: [number, number|null][] }[] }}
 */
export function chartLines(runs, spec) {
  const variables = spec.variables.map(id => VARIABLES.get(id)).filter(Boolean);
  const unit = variables[0]?.unit ?? null;
  const same = variables.filter(v => v.unit === unit);
  const view = viewsFor(unit).includes(spec.view) ? spec.view : 'native';
  const lines = [];
  for (const run of runs.filter(r => spec.systems.includes(r.key))) {
    const context = seriesContext(run.result);
    const years = (run.result?.years ?? []).filter(p => p.year >= spec.from && p.year <= spec.to);
    for (const variable of same) {
      lines.push({ system: run.key, systemLabel: run.label, variable: variable.id, variableName: variable.name,
        points: years.map(p => [p.year, valueIn(view, variable, p, context)]) });
    }
  }
  return { unit, view, axis: unit ? axisUnit(unit, view) : '', lines };
}
