// «Metodología» › Fuentes de datos: every source the calibration cites, read from the data modules
// themselves (data/*.js), so the list cannot drift from what the engine uses. A source is an object with
// a `url` or a `source` link (and, when the project keeps a copy, `file`, `snapshot`, `original` or `path`
// with its `sha256` or `rawResponseSHA256`), a string link whose field name ends in «URL» or «Source», or a
// link inside a `sources` map. Sources a module cites only in a comment or as a bare file path are in
// CITED_OUTSIDE_FIELDS below. tests/audit-185-texts.test.mjs checks that every data module gives a row.
// Pure: the page passes the modules (Vite's import.meta.glob), a test passes them from disk.

const PUBLISHERS = [
  [/(^|\.)tesoro\.es$/, 'Tesoro Público'],
  [/(^|\.)boe\.es$/, 'Boletín Oficial del Estado'],
  [/(^|\.)seg-social\.es$/, 'Seguridad Social'],
  [/(^|\.)bde\.es$/, 'Banco de España'],
  [/(^|\.)ine\.es$/, 'INE'],
  [/(^|\.)igae\.pap\.hacienda\.gob\.es$/, 'IGAE (Hacienda)'],
  [/(^|\.)hacienda\.gob\.es$/, 'Ministerio de Hacienda'],
  [/(^|\.)agenciatributaria\.gob\.es$/, 'Agencia Tributaria'],
  [/(^|\.)airef\.es$/, 'AIReF'],
  [/(^|\.)lamoncloa\.gob\.es$/, 'La Moncloa'],
  [/(^|\.)imserso\.es$/, 'Imserso'],
  [/(^|\.)congreso\.es$/, 'Congreso de los Diputados'],
  [/^ec\.europa\.eu$/, 'Eurostat'],
  [/^economy-finance\.ec\.europa\.eu$/, 'Comisión Europea (DG ECFIN)'],
  [/(^|\.)ecb\.europa\.eu$/, 'Banco Central Europeo'],
  [/(^|\.)nber\.org$/, 'NBER'],
  [/(^|\.)imf\.org$/, 'FMI']
];

/** Who publishes a URL, by its host; the host itself when it is not in the list. */
export function publisherOf(url) {
  let host = '';
  let pathname = '';
  try { ({ hostname: host, pathname } = new URL(url)); host = host.replace(/^www\d?\./, ''); } catch { return '—'; }
  // AMECO lives on Eurostat's host but is the Commission's (DG ECFIN).
  if (host === 'ec.europa.eu' && pathname.startsWith('/economy_finance/')) return 'Comisión Europea (DG ECFIN)';
  return PUBLISHERS.find(([re]) => re.test(host))?.[1] ?? host;
}

const isUrl = value => typeof value === 'string' && /^https?:\/\//.test(value);
const text = value => (typeof value === 'string' && value ? value : null);

const AR_FICHE = Object.freeze({
  url: 'https://economy-finance.ec.europa.eu/document/download/392994f2-c025-4066-bea8-f65cf4bcd411_en?filename=2024-ageing-report-country-fiche-Spain.pdf',
  file: 'data/sources/ar2024-fiche-es/2024-ageing-report-country-fiche-Spain.pdf',
  sha256: '073dca6b182b575cb78abe236e77db5014e78319cd0a0563e7ddaa161a307e3d'
});
const ED202609 = Object.freeze({
  url: 'https://www.seg-social.es/wps/wcm/connect/wss/9a130d7f-83d3-4009-aece-d56ab3b81aa0/ED202609.xlsx?MOD=AJPERES',
  file: 'data/sources/current-2026/ED202609.xlsx',
  sha256: '29dc25de4c5bbc1e4db4b1d6dd7090495046df1720aeeca6064ab3aa655ff7d2'
});
const LAB2 = folder => `copia de la versión anterior del proyecto (data/sources/${folder}/)`;

// Sources a data module cites only in a comment, as a bare file path or in a research file of pensiones_lab_2.
// Pages are the printed ones (data/official-demography.js, pageConvention). Copies not kept here say where they are.
export const CITED_OUTSIDE_FIELDS = Object.freeze({
  'data/epa-employment-2026.js': [{ id: 'ine-65109', url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=65109', file: 'data/sources/epa-2026/ine-65109-ocupados-sexo-edad.json',
    sha256: '6fff72fa674247c4e50cce8e89ada4db03eee4db5cfe7a2cc129d3bf3b443e70', table: 'EPA, tabla 65109' }],
  'data/disability-retirement-2026.js': [{ id: 'ED202609', ...ED202609, location: 'incapacidad permanente, 60–64 años' },
    { id: 'spainFiche', ...AR_FICHE, location: 'págs. 11 y 60; cuadro A2' }],
  'data/career-coverage-2026.js': [{ id: 'spainFiche', ...AR_FICHE, location: 'cuadro 17, pág. 34' }],
  'data/official-demography.js': [{ id: 'spainFiche', ...AR_FICHE }],
  'data/tax-policy-assumptions.js': [{ id: 'vatFinalExpenditure', url: 'https://sede.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_2025/Cuadro_8.7_es_es.xlsx',
    file: 'data/sources/rescue-vat2025-8.7.xlsx', sha256: '2e01307b301ac7d6f790ae90ea0b67a5377869987f43f5e8065cfbfdafecd5c9', table: 'cuadro 8.7' }],
  'data/prtr-calendar-2026.js': [{ id: 'airef-pfemp-2026', url: 'https://www.airef.es/wp-content/uploads/2026/05/Informe_Progreso_PFEMP/Informe-Seguimiento-PFEMP-2026.pdf',
    file: 'data/sources/airef-2026/informe-seguimiento-pfemp-2026.pdf', sha256: '7104e1a01f5b4d40322888fc00bec29b7b0b38c25e239fa6c7fce9e28da3420c', location: 'cuadros 17 a 19, págs. 67–68' }],
  'data/contribution-bases-v5.js': [
    { id: 'aeat-salary-centiles-2024', url: 'https://www3.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/mercado/2024/jrubikf2b7aac620fee24d8b74e173bdf7c55d6347fe85e.html', location: LAB2('contributions-v5') },
    { id: 'BOE-A-2023-6967', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2023-6967', location: LAB2('history-v3-policy') },
    { id: 'L_Entidades_Agosto_2026', url: 'https://www.seg-social.es/descarga/es/L_Entidades_Agosto_2026.pdf', file: 'data/sources/fmi-income-tgss-202608.pdf' }],
  'data/wage-bridge-v5.js': [
    { id: 'EAES2024', url: 'https://ine.es/dyngs/Prensa/EAES2024.htm', location: LAB2('wages-v5') },
    { id: 'EACL2024', url: 'https://www.ine.es/dyngs/Prensa/EACL2024.htm', location: LAB2('wages-v5') },
    { id: 'EACL2025', url: 'https://www.ine.es/dyngs/Prensa/EACL2025.htm', location: LAB2('wages-v5') },
    { id: 'aeat-vesge-202608', url: 'https://sede.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informe_VESGE/Informe_web.pdf', location: LAB2('wages-v5') }]
});

// Copies named without a folder, kept in pensiones_lab_2 and not here.
const FOLDER_OF_BARE_FILES = Object.freeze({ 'data/wage-forecast-v6.js': 'pensiones_lab_2/data/sources/wages-v6/' });

/**
 * @param {Record<string, object>} modules  data module path → its exports
 * @returns {{ label: string, url: string, publisher: string, file: string|null, sha256: string|null, where: string|null, modules: string[], at: string }[]}
 *   one row per distinct (url, file), in the modules' order; `modules` are the data modules that cite it. A link
 *   cited with and without a copy is one row, with the copy.
 */
export function collectSources(modules) {
  const rows = [];
  const add = (module, at, url, extra = {}) => {
    let file = text(extra.file) ?? text(extra.snapshot) ?? text(extra.original) ?? text(extra.path);
    if (file && !file.includes('/') && FOLDER_OF_BARE_FILES[module]) file = FOLDER_OF_BARE_FILES[module] + file;
    const sha256 = text(extra.sha256) ?? text(extra.rawResponseSHA256);
    const where = [extra.page != null ? `p. ${extra.page}` : null, extra.sheet ? `hoja ${extra.sheet}` : null, text(extra.table), text(extra.location)]
      .filter(Boolean).join(' · ') || null;
    const known = rows.find(r => r.url === url && (r.file === file || !r.file || !file));
    if (known) {
      if (!known.modules.includes(module)) known.modules.push(module);
      if (!known.file && file) Object.assign(known, { file, sha256: sha256 ?? known.sha256 });
      if (!known.sha256 && sha256 && known.file === file) known.sha256 = sha256;
      if (!known.where && where) known.where = where;
      return;
    }
    const label = typeof extra.id === 'string' ? extra.id : at.split('.').filter(s => !/^\d+$/.test(s)).pop();
    rows.push({ label, url, publisher: publisherOf(url), file, sha256, where, modules: [module], at });
  };
  for (const [path, exports] of Object.entries(modules)) {
    const module = path.replace(/^.*\/data\//, 'data/');
    const visited = new Set();
    const walk = (value, at) => {
      if (!value || typeof value !== 'object' || visited.has(value)) return;
      visited.add(value);
      const main = isUrl(value.url) ? 'url' : isUrl(value.source) ? 'source' : null;
      if (main) add(module, at, value[main], value);
      const inSources = /(^|\.)sources$/.test(at);
      for (const [k, v] of Object.entries(value)) {
        if (k === main) continue;
        if (isUrl(v) && (inSources || /(url|source)$/i.test(k))) add(module, at ? `${at}.${k}` : k, v);
        else if (typeof v === 'object') walk(v, at ? `${at}.${k}` : k);
      }
    };
    for (const [name, value] of Object.entries(exports)) walk(value, name);
    for (const extra of CITED_OUTSIDE_FIELDS[module] ?? []) add(module, extra.id, extra.url, extra);
  }
  return rows;
}
