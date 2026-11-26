// The beta label with the version, and the «Fallos y mejoras» link, in the header of every page (decision of the
// author, 25/11/2026). Both are static HTML (data-site-version, data-site-feedback), so they show without JavaScript;
// this fills in the version and, on click, writes an e-mail with what is needed to reproduce a fault: version, page,
// the scenario's link and the browser. Nothing is sent by the page: the reader's mail program opens with the text,
// which they can read, change or delete before sending.
import { APP_VERSION } from './app-version.js';
import { SIMULATION_METHODOLOGY } from '../simulation-methodology.js';
import { CREDITS, appFolder } from './credits.js';
import { encodeScenarioHash, linkTooLong } from './share-link.js';
import { DEFAULT_CONFIG } from './default-config.js';
import { getState } from './scenario-store.js';

export const STAGE = 'Beta';
export const versionLabel = () => `${STAGE} · versión ${APP_VERSION}`;

// Mail programs and browsers cut long mailto addresses: past this, the scenario's link is left out with a note.
export const MAX_MAILTO_CHARS = 1900;

/** The mailto address of a comment: subject and body with the details, under MAX_MAILTO_CHARS. */
export function feedbackHref({ config = null, page = '', origin = '', userAgent = '' } = {}) {
  const subject = `Pensiones Lab ${APP_VERSION} (beta): fallo o mejora`;
  let hash = null;
  try { hash = config ? encodeScenarioHash(config, DEFAULT_CONFIG) : null; } catch { hash = null; }
  const tooLong = hash && linkTooLong(hash);
  const scenario = !hash ? 'las reglas de hoy (sin cambios)'
    : tooLong ? 'demasiado grande para un enlace (puedes adjuntar el JSON que guarda la consola)'
    : `${origin}/consola.html${hash}`;
  const body = details => [
    'Cuéntanos el fallo o la mejora:', '', '', '',
    '---',
    'Datos para reproducirlo (puedes borrar lo que quieras):',
    `Versión: ${APP_VERSION} beta, metodología ${SIMULATION_METHODOLOGY}`,
    `Página: ${page || '—'}`,
    `Escenario: ${details}`,
    `Navegador: ${userAgent || '—'}`
  ].join('\n');
  const href = text => `mailto:${CREDITS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body(text))}`;
  const full = href(scenario);
  return full.length <= MAX_MAILTO_CHARS ? full
    : href('demasiado largo para el correo (puedes pegar aquí el enlace que copia la consola, o adjuntar su JSON)');
}

/** Fills the version label and arms the feedback link of the page's header. */
export function mountSiteHeader() {
  if (typeof document === 'undefined') return;
  for (const el of document.querySelectorAll('[data-site-version]')) {
    el.textContent = versionLabel();
    el.title = `Versión de pruebas: puede tener fallos y cambiar. Metodología ${SIMULATION_METHODOLOGY}.`;
  }
  for (const link of document.querySelectorAll('[data-site-feedback]')) {
    // Written on click, so it carries the scenario on screen at that moment.
    link.addEventListener('click', () => {
      let config = null;
      try { config = getState().config; } catch { config = null; }
      link.href = feedbackHref({ config, page: location.pathname.split('/').pop() || 'consola.html',
        origin: appFolder(), userAgent: navigator.userAgent });
    });
  }
}
