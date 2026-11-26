// The contents of the files of the header's «Exportar» (src/shared/series-export.js downloads them):
// pure, so that the tests read exactly what a reader gets. docs/REVISION-EXPERTO-2026-11-08.md, 2 and 3.
import { exportStamp, stampCommentLines } from './citation.js';
import { longSeriesCSV, dictionaryCSV } from '../domain/series-dictionary.js';
import { CALIBRATION_ID, STATE_VERSION } from './default-config.js';

/** The long CSV: the «#» lines of the stamp, a line on what it holds, then the rows. */
export const seriesFileText = (runs, config, stamp = exportStamp(config)) => [...stampCommentLines(stamp),
  runs.length > 1
    ? '# Sistemas: tu_escenario es el tuyo; los demás llevan tus palancas, como en Comparar. Variables y unidades: el diccionario.'
    : '# Solo tu escenario (tu_escenario). Variables y unidades: el diccionario.',
  longSeriesCSV(runs)].join('\n');

/** The dictionary, after the «#» lines of the stamp. */
export const dictionaryFileText = (config, stamp = exportStamp(config)) => [...stampCommentLines(stamp), dictionaryCSV()].join('\n');

/** The scenario as JSON, readable by «Importar» (version and base), with its stamp under «about». */
export const scenarioFile = (state, stamp = exportStamp(state.config)) => ({
  kind: 'pensiones-lab-escenario',
  version: STATE_VERSION,
  calibration: CALIBRATION_ID,
  config: state.config,
  limits: state.limits,
  selectedYear: state.selectedYear,
  about: stamp
});
