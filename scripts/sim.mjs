// Run scenarios without a browser and write their yearly series, the same CSV as the console's «CSV»
// (src/domain/series-dictionary.js), for R, Python or a spreadsheet. Each scenario is a file the console
// exports or imports, read as «Importar» reads it. The help (--ayuda) says how to use it, in Spanish.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { parseImportedModelFile } from '../src/shared/excel-models-io.js';
import { comparisonConfigs, scenarioSystemName } from '../src/shared/scenario-labels.js';
import { dictionaryFileText } from '../src/shared/export-files.js';
import { longSeriesCSV } from '../src/domain/series-dictionary.js';
import { exportStamp, stampCommentLines } from '../src/shared/citation.js';
import { computeVerdict } from '../src/domain/verdict.js';

const HELP = `Pensiones Lab 3 sin navegador: las series anuales de uno o varios escenarios, en el mismo CSV que «CSV» de la consola.

  npm run sim -- [opciones] [escenario.json ...]

Cada escenario es un archivo que la consola exporta o importa (.json, .xlsx o el .csv de series con su enlace).
Sin archivos, las reglas de hoy. Cada escenario va con su nombre de archivo en la columna «sistema».

  --sistemas          añade cada sistema con los ajustes del primer escenario, como «CSV sistemas»
  --diccionario       escribe el diccionario de variables en lugar de las series
  --salida archivo    escribe en un archivo en lugar de la pantalla
  --ayuda             esta ayuda

El veredicto de cada ejecución sale por el canal de errores, para que el CSV quede limpio.`;

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const option = name => { const i = args.indexOf(name); if (i < 0) return null; const [, value] = args.splice(i, 2); return value; };
if (flag('--ayuda') || flag('-h')) { console.log(HELP); process.exit(0); }
const withSystems = flag('--sistemas');
const dictionary = flag('--diccionario');
const out = option('--salida');
const unknown = args.filter(a => a.startsWith('--'));
if (unknown.length) { console.error(`Opción desconocida: ${unknown.join(' ')}. Usa --ayuda.`); process.exit(2); }

// Each file read as «Importar» reads it; what a file does not say keeps today's rules.
const scenarios = [];
for (const path of args) {
  try {
    const imported = await parseImportedModelFile(new Uint8Array(readFileSync(path)), path, DEFAULT_CONFIG);
    scenarios.push({ key: basename(path, extname(path)).replace(/[;\s]+/g, '_'), config: imported.config });
  } catch (error) {
    console.error(`No se ha podido leer ${path}: ${error?.message ?? error}`);
    process.exit(1);
  }
}
if (!scenarios.length) scenarios.push({ key: 'reglas_de_hoy', config: DEFAULT_CONFIG });
const first = scenarios[0].config;
// The link of the first scenario has no address here: the console opens it from its «#escenario=…».
const stamp = exportStamp(first, { origin: '' });

let text;
if (dictionary) text = dictionaryFileText(first, stamp);
else {
  const runs = scenarios.map(s => ({ key: s.key, result: simulate(s.config) }));
  if (withSystems) {
    for (const entry of comparisonConfigs(first, { includeRetro1985: true, includeMixedGradual: true })) runs.push({ key: entry.key, result: simulate(entry.config) });
  }
  for (const { key, result } of runs) {
    const v = computeVerdict(result);
    const last = result.years.at(-1);
    console.error(`${key}: ${scenarioSystemName(result.config)} · ${v?.firstProblemYear ? `se rompe en ${v.firstProblemYear}` : 'aguanta hasta 2070'} · deuda ${last.year} ${last.debtGDP.toFixed(0)} % del PIB`);
  }
  text = [...stampCommentLines(stamp),
    `# Ejecuciones: ${runs.map(r => r.key).join(', ')}.${withSystems ? ' Los sistemas llevan los ajustes del primer escenario.' : ''} Variables y unidades: npm run sim -- --diccionario.`,
    longSeriesCSV(runs)].join('\n');
}
if (out) { writeFileSync(out, `${text}\n`); console.error(`Escrito: ${out}`); }
else process.stdout.write(`${text}\n`);
