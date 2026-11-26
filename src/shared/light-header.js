// The beta label and the comments link of the light pages (the landing page and the help), which load no engine and
// no data: version, page and browser, without a scenario. The tool pages use src/shared/site-header.js, which adds
// the scenario on screen.
import { APP_VERSION } from './app-version.js';
import { CREDITS } from './credits.js';

export function mountLightHeader(pageName) {
  for (const el of document.querySelectorAll('[data-site-version]')) el.textContent = `Beta · versión ${APP_VERSION}`;
  for (const link of document.querySelectorAll('[data-site-feedback]')) {
    link.addEventListener('click', () => {
      const subject = `Pensiones Lab ${APP_VERSION} (beta): fallo o mejora`;
      const body = ['Cuéntanos el fallo o la mejora:', '', '', '', '---', 'Datos (puedes borrar lo que quieras):',
        `Versión: ${APP_VERSION} beta`, `Página: ${pageName}`, `Navegador: ${navigator.userAgent}`].join('\n');
      link.href = `mailto:${CREDITS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
}
