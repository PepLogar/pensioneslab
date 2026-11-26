// Who is behind Pensiones Lab, how to write, and under which licences it is published
// (docs/PUBLICACION-CUESTIONES-LEGALES-2026-11-25.md; decision of the author, 25/11/2026: AGPL-3.0 for the code,
// CC BY 4.0 for texts, charts and results, and the developer named). The footer of every page carries the same line
// as static HTML (tests/credits.test.mjs checks it); the citation of every export and the legal notice read this.
export const CREDITS = Object.freeze({
  project: 'Pensiones Lab',
  initiative: 'Demarquía Planetaria · Cabeza Propia',
  initiativeHref: 'https://demarquia.org/Demarqu%C3%ADa_Planetaria',
  developer: 'Pep Logar AI Solutions',
  developerHref: 'https://aisolutions.peplogar.com/',
  company: 'Todo en Tinta Pep Logar S.L. (unidad Pep Logar AI Solutions)',
  companyId: 'CIF B86378981',
  address: 'Av. Europa, 232 · 28905 Getafe, Madrid, España',
  email: 'info@aisolutions.peplogar.com',
  phone: '(+34) 91 141 96 34',
  codeLicence: 'AGPL-3.0-or-later',
  codeLicenceHref: 'https://www.gnu.org/licenses/agpl-3.0.html',
  contentLicence: 'CC BY 4.0',
  contentLicenceHref: 'https://creativecommons.org/licenses/by/4.0/deed.es',
  sourceHref: 'https://github.com/PepLogar/pensioneslab',
  // The public address (decision of the author, 25/11/2026): a folder of demarquia.org, not the root of a domain.
  siteHref: 'https://demarquia.org/pensioneslab/',
  hosting: 'Hostinger, con el centro de datos en Alemania (Unión Europea)'
});

/** The folder the pages are served from, without the final slash (https://demarquia.org/pensioneslab when
 * published, http://127.0.0.1:5180 in development). Links to a page are built on it, never on the bare origin,
 * which would drop the folder. Outside a browser, ''. */
export const appFolder = () => globalThis.location?.href ? new URL('.', globalThis.location.href).href.replace(/\/$/, '') : '';

/** How to credit the work under CC BY 4.0 (the attribution the licence asks for). */
export const ATTRIBUTION = `${CREDITS.project} · ${CREDITS.initiative}. Desarrollo: ${CREDITS.developer}. ${CREDITS.contentLicence}.`;
