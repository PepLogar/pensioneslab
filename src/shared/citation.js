// Where and when an exported result comes from, and how to cite it (docs/REVISION-EXPERTO-2026-11-08.md,
// proposal 1): the app's version, the engine's methodology, the data, the date, the scenario's link and a
// sentence to cite. Every file the app exports carries it: Excel («Acerca_de»), CSV («#» lines that R,
// pandas and most tools skip), JSON («about»), PDF, images and the futures report.
import { SIMULATION_METHODOLOGY } from '../simulation-methodology.js';
import { CALIBRATION_ID, DEFAULT_CONFIG } from './default-config.js';
import { encodeScenarioHash } from './share-link.js';
import { APP_VERSION } from './app-version.js';
import { CREDITS, appFolder } from './credits.js';

/**
 * @param {object|null} config  the scenario exported; null for España de partida
 * @returns {{ app, version, methodology, calibration, date, day, scenario, scenarioInline, link, cite, caveat }}
 *   `scenarioInline` is `scenario` for the middle of a sentence: «España» keeps its capital
 */
export function exportStamp(config = null, { date = new Date(), origin = appFolder() } = {}) {
  const hash = config ? encodeScenarioHash(config, DEFAULT_CONFIG) : null;
  const link = `${origin}/consola.html${hash ?? ''}`;
  const day = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const scenario = hash ? 'Escenario propio (en el enlace)' : 'España, con las reglas de hoy (2026)';
  return {
    app: `Pensiones Lab ${APP_VERSION}`,
    version: APP_VERSION,
    methodology: SIMULATION_METHODOLOGY,
    calibration: CALIBRATION_ID,
    date: date.toISOString().slice(0, 10),
    day,
    scenario,
    scenarioInline: hash ? 'escenario propio (en el enlace)' : scenario,
    link,
    // The attribution CC BY 4.0 asks for: project, initiative, developer and licence (src/shared/credits.js, since 1.76).
    cite: `Pensiones Lab ${APP_VERSION} · ${CREDITS.initiative}; desarrollo: ${CREDITS.developer} (metodología ${SIMULATION_METHODOLOGY}; datos ${CALIBRATION_ID}). ${scenario}. Consultado el ${day}. ${link}. Licencia ${CREDITS.contentLicence}.`,
    licence: `Textos, gráficos y resultados: ${CREDITS.contentLicence} (${CREDITS.contentLicenceHref}). Código: ${CREDITS.codeLicence}.`,
    caveat: 'Simulación con supuestos, no una previsión oficial ni asesoramiento financiero.'
  };
}

/** The stamp as «#» lines, before the header of a CSV file. */
export const stampCommentLines = stamp => [
  `# ${stamp.app} · metodología ${stamp.methodology} · datos ${stamp.calibration} · ${stamp.date}`,
  `# Escenario: ${stamp.link}`,
  `# Cómo citar: ${stamp.cite}`,
  `# ${stamp.caveat}`
];

/** One line for an image or a printed page. */
export const stampLine = stamp => `${stamp.app} · metodología ${stamp.methodology} · datos ${stamp.calibration} · ${stamp.day}`;
