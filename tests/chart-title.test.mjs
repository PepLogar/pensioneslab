// «Gráficos» (1.93): a chart's title names what it shows. The author's case, 27/11/2026: a duplicated «Deuda
// pública» changed to the nominal GDP still read «Deuda pública (copia)», on screen and in the exported SVG.
import test from 'node:test';
import assert from 'node:assert/strict';
import { autoTitle, isOwnTitle, settleTitle, changeVariables, variablesLine } from '../src/domain/chart-title.js';

const STARTERS = [
  { title: 'Deuda pública', variables: ['deuda_pct_pib'] },
  { title: 'Ingresos y gasto públicos', variables: ['ingresos_publicos', 'gasto_publico'] }
];

test('the title follows the variables until the reader writes one', () => {
  // A chart kept before 1.93, as in the author's screenshot: it is retitled when loaded.
  assert.equal(settleTitle({ title: 'Deuda pública (copia)', variables: ['pib_nominal'] }, STARTERS).title, 'PIB nominal');
  // A starter, or a copy of it, with its own variables keeps its title.
  assert.equal(settleTitle({ title: 'Ingresos y gasto públicos (copia)', variables: ['ingresos_publicos', 'gasto_publico'] }, STARTERS).title, 'Ingresos y gasto públicos (copia)');
  assert.equal(autoTitle(['deuda_pct_pib', 'pib_nominal']), 'Deuda pública y PIB nominal');
  // The reader's own title stays, whatever the variables.
  const own = settleTitle({ title: 'Mi gráfico', variables: ['pib_nominal'] }, STARTERS);
  assert.equal(own.ownTitle, true);
  assert.equal(settleTitle({ ...own, variables: ['deuda_pct_pib'] }, STARTERS).title, 'Mi gráfico');
  assert.equal(isOwnTitle({ title: 'PIB nominal', variables: ['deuda_pct_pib'] }, STARTERS), false, 'a variable name is not the reader\'s');
  assert.equal(settleTitle({ ownTitle: false, title: 'PIB nominal', variables: [] }, STARTERS).title, '');
});

test('changing the variables replaces even the reader\'s title, and the chart always names what it shows (1.94)', () => {
  const { chart, dropped } = changeVariables({ title: 'Mi gráfico', ownTitle: true, variables: ['deuda_pct_pib'] }, ['pib_nominal'], STARTERS);
  assert.deepEqual([chart.title, chart.ownTitle, dropped], ['PIB nominal', false, 'Mi gráfico']);
  assert.equal(changeVariables({ title: 'Deuda pública', variables: ['deuda_pct_pib'] }, ['pib_nominal'], STARTERS).dropped, null, 'a starter title is not the reader\'s');
  assert.equal(variablesLine({ title: 'Mi gráfico', variables: ['pib_nominal'] }), 'PIB nominal');
  assert.equal(variablesLine({ title: 'PIB nominal (copia)', variables: ['pib_nominal'] }), '', 'no repetition');
  assert.equal(variablesLine({ title: 'Ingresos y gasto públicos', variables: ['ingresos_publicos', 'gasto_publico'] }), 'Ingresos públicos y Gasto público total');
});
