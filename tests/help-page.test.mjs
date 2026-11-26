// The help page (ayuda.html; decision of the author, 25/11/2026) names the console's buttons, chapters, tabs and
// systems as the console shows them: if one is renamed, this fails and the help is updated with it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SETTINGS_CHAPTERS } from '../src/shared/settings-catalog.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const help = read('ayuda.html');
const consoleHtml = read('consola.html');
const consoleJs = read('src/pages/consola.js');
const text = help.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('it explains a new game first: «Reglas de hoy», what it resets and what it keeps, and how to undo', () => {
  const nueva = /<section id="nueva"[\s\S]*?<\/section>/.exec(help)[0];
  assert.ok(help.indexOf('id="nueva"') < help.indexOf('id="partes"'), 'the first section');
  for (const part of ['Reglas de hoy', 'todos', 'No toca tus escenarios guardados ni tus límites', 'Deshacer']) assert.ok(nueva.includes(part), part);
  assert.match(consoleHtml, /data-cx-reset[^>]*>Reglas de hoy</);
  assert.match(consoleJs, /\$\('\[data-cx-reset\]'\)\.addEventListener\('click', \(\) => \{ replaceWhole\(DEFAULT_CONFIG\)/, 'the button resets the whole configuration');
});

test('the buttons it names are the console\'s', () => {
  for (const label of ['Deshacer', 'Rehacer', 'Reglas de hoy', 'Abrir', 'Borrar', 'Guardar', 'CSV', 'Excel', 'JSON', 'Importar', 'Enlace', 'Atajos', 'Año a año', 'Todos los sistemas']) {
    assert.ok(consoleHtml.includes(`>${label}<`), `console: ${label}`);
    assert.ok(text.includes(label), `help: ${label}`);
  }
  assert.match(consoleJs, />Usar<\/button>/);
  assert.ok(text.includes('Usar'));
});

test('the systems, chapters and tabs it names are the console\'s', () => {
  const systems = /options: \[\['payg', 'Reparto \(hoy\)'\][^\n]*/.exec(read('src/shared/settings-panel.js'))[0];
  for (const name of ['Reparto (hoy)', 'Cuentas nocionales', 'Mixto progresivo', 'Mixto con ahorro propio']) {
    assert.ok(systems.includes(`'${name}'`), `console: ${name}`);
    assert.ok(help.includes(`<dt>${name}</dt>`), `help: ${name}`);
  }
  assert.ok(systems.includes('desde 1985') && help.includes('<dt>Experimento desde 1985</dt>'));
  for (const chapter of SETTINGS_CHAPTERS) {
    const name = chapter.title ?? chapter.name ?? chapter.label;
    assert.ok(text.includes(name), `chapter ${name}`);
  }
  for (const tab of ['Ricos y empresas', 'Partidas del Estado', 'Calendario', 'Límites y mezcla']) {
    assert.ok(consoleJs.includes(`'${tab}'`), `console tab ${tab}`);
    assert.ok(text.includes(tab), `help tab ${tab}`);
  }
});

test('the prepared scenarios it describes are the console\'s «Supuestos de otros»', () => {
  assert.match(consoleJs, /<optgroup label="Supuestos de otros">/);
  assert.match(consoleJs, /<optgroup label="En este navegador">/);
  assert.ok(text.includes('Supuestos de otros') && text.includes('En este navegador'));
  assert.ok(text.includes('la AIReF') && text.includes('Ageing Report 2024'));
  for (const page of ['consola.html', 'graficos.html', 'sensibilidad.html', 'riesgo.html', 'metodologia.html']) {
    assert.match(read(page), /<a class="site-help" href="ayuda\.html"/, `${page} links the help`);
  }
});
