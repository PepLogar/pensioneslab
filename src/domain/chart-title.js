// The title of a chart in «Gráficos» (1.93): it follows its variables until the reader writes one. Before, a
// duplicated «Deuda pública» kept that title after its variable was changed to the nominal GDP, so the chart and
// its exported SVG named a variable they did not show (the author, 27/11/2026). Pure: no DOM.
import { VARIABLES } from './chart-data.js';

const COPY = / \(copia\)$/;
const bare = title => { let t = String(title ?? '').trim(); while (COPY.test(t)) t = t.replace(COPY, ''); return t; };
const nameOf = id => VARIABLES.get(id)?.name ?? null;
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/** «Deuda pública», «Ingresos públicos y Gasto público», «A, B y C»: the names of the variables. */
export function autoTitle(ids = []) {
  const names = ids.map(nameOf).filter(Boolean);
  return names.length < 2 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`;
}

/** Whether the title was written by the reader. Charts kept before 1.93 carry no flag: a title that is empty,
 * a starter's or a variable's name (with or without «(copia)») was not written by the reader. */
export function isOwnTitle(chart, starters = []) {
  if (typeof chart.ownTitle === 'boolean') return chart.ownTitle;
  const t = bare(chart.title), vars = chart.variables ?? [];
  if (!t) return false;
  return !starters.some(s => s.title === t) && t !== autoTitle(vars) && !vars.some(id => nameOf(id) === t)
    && ![...VARIABLES.values()].some(v => v.name === t);
}

/** The chart after its variables change (1.94): the title always follows them, the reader's own too, because an
 * occasional reader may change the variables, not look at the title, and publish a capture (the author, 27/11/2026).
 * `dropped` is the reader's title that was replaced, for the notice. */
export function changeVariables(chart, variables, starters = []) {
  const dropped = isOwnTitle(chart, starters) && chart.title ? chart.title : null;
  return { chart: { ...chart, variables, ownTitle: false, title: autoTitle(variables) }, dropped };
}

/** The line under the title naming the variables, when the title does not (a title the reader wrote, a starter's). */
export function variablesLine(chart) {
  const names = autoTitle(chart.variables ?? []);
  return names && bare(chart.title) !== names ? names : '';
}

/** The chart with a title that names what it shows (on loading kept charts): the reader's own stays; any other
 * follows the variables. */
export function settleTitle(chart, starters = []) {
  if (isOwnTitle(chart, starters)) return { ...chart, ownTitle: true };
  const t = bare(chart.title), vars = chart.variables ?? [];
  const fits = Boolean(t) && (t === autoTitle(vars) || (vars.length === 1 && nameOf(vars[0]) === t)
    || starters.some(s => s.title === t && sameList(s.variables, vars)));
  return { ...chart, ownTitle: false, title: fits ? chart.title : autoTitle(vars) };
}
