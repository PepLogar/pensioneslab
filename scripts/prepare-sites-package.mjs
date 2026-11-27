// One command for the Sites package (npm run sites): an isolated Vite build of the seven pages, checked, with a
// verifiable inventory, a README, a ZIP and its SHA-256. Local packaging only: no registration, Git push, upload
// or publication; the author uploads it through the Sites flow.
//   npm run sites                      → output/sites/pensioneslabs3-<version>-<date>/ and .zip
//   npm run sites -- output/sites/name → that folder (it must be new and inside output/sites)
// The tree must be committed: the inventory names the commit the package comes from.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const { APP_VERSION } = await import(pathToFileURL(path.join(root, 'src/shared/app-version.js')));
const { SIMULATION_METHODOLOGY } = await import(pathToFileURL(path.join(root, 'src/simulation-methodology.js')));
const { STATE_VERSION, CALIBRATION_ID } = await import(pathToFileURL(path.join(root, 'src/shared/storage-ids.js')));

// The pages the build makes (vite.config.js), the fixed files of public/ (as in the Hostinger package), and what each
// build must have.
const PAGES = ['index.html', 'ayuda.html', 'consola.html', 'metodologia.html', 'graficos.html', 'sensibilidad.html', 'riesgo.html', 'informe.html'];
const PUBLIC_FILES = ['favicon.svg', 'apple-touch-icon.png', 'og-image.png'];
const REQUIRED = [/^assets\/sim-worker-.*\.js$/, /^assets\/simulation-.*\.js$/, /^assets\/.*\.css$/];

if (git('status', '--porcelain')) throw new Error('Hay cambios sin commit: el inventario debe nombrar el commit exacto. Haz commit primero.');
const today = new Date().toISOString().slice(0, 10);
const allowedRoot = path.resolve(root, 'output/sites');
const target = path.resolve(root, process.argv[2] || `output/sites/pensioneslabs3-${APP_VERSION}-${today}`);
if (!target.startsWith(allowedRoot + path.sep)) throw new Error('El destino debe estar dentro de output/sites.');
if (existsSync(target)) throw new Error(`Ya existe ${path.relative(root, target)}: usa un destino nuevo.`);
const dist = path.join(target, 'dist');

// 1 · The isolated build.
execFileSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', dist, '--emptyOutDir'],
  { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });

// 2 · What it made: only the pages, the fixed files and their assets, all present, every local reference resolved.
const slash = name => name.split(path.sep).join('/');
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name), stat = lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error('No se admiten enlaces simbólicos.');
    return stat.isDirectory() ? walk(full) : [full];
  });
}
const files = walk(dist).map(full => ({ path: slash(path.relative(dist, full)), bytes: lstatSync(full).size, sha256: sha(readFileSync(full)) }))
  .sort((a, b) => a.path.localeCompare(b.path));
for (const file of files) {
  if (!(PAGES.includes(file.path) || PUBLIC_FILES.includes(file.path) || /^assets\/[A-Za-z0-9_.-]+\.(?:js|css)$/.test(file.path))) throw new Error(`Recurso no previsto: ${file.path}`);
}
for (const page of PAGES) if (!files.some(file => file.path === page)) throw new Error(`Falta la página ${page}`);
for (const name of PUBLIC_FILES) if (!files.some(file => file.path === name)) throw new Error(`Falta ${name}`);
for (const pattern of REQUIRED) if (!files.some(file => pattern.test(file.path))) throw new Error(`Falta recurso requerido: ${pattern}`);
const names = new Set(files.map(file => file.path));
let references = 0;
for (const file of files.filter(file => /\.(html|js|css)$/.test(file.path))) {
  const contents = readFileSync(path.join(dist, file.path), 'utf8');
  // Local references emitted by this build: in a page, its src and href; in a module, the sibling modules and styles
  // it loads (the Worker and its fallback module too) and the pages it links. Quoted source paths such as
  // «../../data/…js» are citations shown to the reader, not resources, and are not checked.
  const patterns = file.path.endsWith('.html')
    ? [/\b(?:src|href)=["']([^"']+)["']/g]
    : [/["'](\.\/[A-Za-z0-9_.-]+\.(?:js|css)|(?:\.\.\/)?[a-z]+\.html)(?:[?#][^"'\s]*)?["']/g];
  for (const pattern of patterns) for (const match of contents.matchAll(pattern)) {
    const ref = match[1];
    if (/^(?:[a-z]+:|#|\/\/)/i.test(ref)) continue;
    // A page named inside a module is resolved by the browser from the document, at the root, not from assets/.
    const base = !file.path.endsWith('.html') && /\.html$/.test(ref.split(/[?#]/)[0]) ? '.' : path.posix.dirname(file.path);
    const resolved = path.posix.normalize(path.posix.join(base, ref.split(/[?#]/)[0]));
    if (!names.has(resolved)) throw new Error(`Recurso ausente: ${file.path} -> ${ref}`);
    references++;
  }
}

// 3 · Identity of the Site, inventory and README.
// The Site's identity is private and stays out of the repository: only the author has .openai/hosting.json.
const hostingFile = path.join(root, '.openai/hosting.json');
if (!existsSync(hostingFile)) throw new Error('Falta .openai/hosting.json, la identidad privada del Site. Para publicar en un servidor propio, usa npm run hostinger.');
const hosting = JSON.parse(readFileSync(hostingFile, 'utf8'));
if (!hosting.project_id || hosting.static?.directory !== 'dist') throw new Error('Falta la identidad real del Site o la raíz dist.');
mkdirSync(path.join(target, '.openai'), { recursive: true });
writeFileSync(path.join(target, '.openai/hosting.json'), JSON.stringify(hosting, null, 2) + '\n');
// Every source the build bundles: src/, data/*.js (the sources page), the contrast JSON (Metodología) and the
// model chapters, which the Metodología page shows on purpose (docs/REVISION-ADVERSARIAL-2026-11-24.md, 42).
const sourceFiles = [...PAGES, 'package.json', 'package-lock.json', 'vite.config.js', 'scripts/engine-fingerprint.mjs', 'data/external-contrast.json',
  ...walk(path.join(root, 'src')).map(full => slash(path.relative(root, full))),
  ...walk(path.join(root, 'data')).filter(full => full.endsWith('.js')).map(full => slash(path.relative(root, full))),
  ...walk(path.join(root, 'docs/modelo')).filter(full => full.endsWith('.md')).map(full => slash(path.relative(root, full)))].sort();
const sourceHashes = sourceFiles.map(name => ({ path: name, sha256: sha(readFileSync(path.join(root, name))) }));
const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
const inventory = {
  preparedAt: new Date().toISOString(), application: 'pensioneslabs3', appVersion: APP_VERSION,
  methodology: SIMULATION_METHODOLOGY, stateVersion: STATE_VERSION, calibration: CALIBRATION_ID,
  sourceCommit: git('rev-parse', 'HEAD'), sourceHashes, project_id: hosting.project_id, staticDirectory: 'dist', published: false,
  build: `Isolated Vite build of the ${PAGES.length} pages; no engine or calibration modifications`,
  pages: PAGES, resourcesChecked: references, bytes, files
};
writeFileSync(path.join(target, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
const readme = `# Pensiones Lab · paquete para Sites

Versión ${APP_VERSION}, metodología ${SIMULATION_METHODOLOGY}, estado guardado ${STATE_VERSION}, calibración ${CALIBRATION_ID}.
Commit de origen: ${inventory.sourceCommit}. Preparado el ${today}. No está publicado.

## Destino

Actualizar el Site existente, project_id: ${hosting.project_id}.
${hosting.url ? `URL: ${hosting.url}
` : ''}Conservar identidad, URL y audiencia. No crear otro sitio ni ampliar permisos para instalarlo.

## Sustitución

1. En el checkout del Site existente, sustituir la distribución anterior completa por dist/ de este paquete. No mezclarla con la anterior.
2. Conservar el project_id y la configuración de alojamiento que siga siendo necesaria; la raíz estática es dist.
3. Guardar una versión y publicarla con el flujo de Sites.
4. Comprobar en la URL alojada: las ${PAGES.length} páginas abren (${PAGES.join(', ')}), la consola calcula, y un escenario guardado se conserva.

## Datos y ajustes

Los módulos compilados llevan la calibración que necesitan. Las copias de documentos de otros no van: data/sources/README.md dice de dónde vienen.
No hay credenciales, dependencias de desarrollo, estado de navegador ni escenarios personales en dist/. Los capítulos del modelo (docs/modelo) sí van, a propósito: la página Metodología los muestra. El resto de docs/ no se publica.
Los escenarios guardados en ese navegador con un estado anterior se migran al ${STATE_VERSION} al abrirlos.
Servir por HTTP/HTTPS, no por file://. Es una herramienta de escritorio.

## Integridad

inventory.json identifica el commit, las huellas de las fuentes y las de los ${files.length} archivos publicables (${bytes} bytes).
Se comprobaron ${references} referencias locales entre páginas, módulos y estilos.
`;
writeFileSync(path.join(target, 'README-SITES.md'), readme);

// 4 · ZIP and its fingerprint (Windows tar makes the ZIP; elsewhere, zip the folder by hand).
const zip = `${target}.zip`;
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : null;
if (tar && existsSync(tar)) {
  execFileSync(tar, ['-a', '-c', '-f', zip, '-C', target, '.openai', 'dist', 'inventory.json', 'README-SITES.md']);
  writeFileSync(`${zip}.sha256`, `${sha(readFileSync(zip)).toUpperCase()}  ${path.basename(zip)}\n`);
}
console.log(JSON.stringify({ target: slash(path.relative(root, target)), zip: existsSync(zip) ? slash(path.relative(root, zip)) : null,
  zipBytes: existsSync(zip) ? lstatSync(zip).size : null, files: files.length, bytes, references, commit: inventory.sourceCommit,
  version: APP_VERSION, methodology: SIMULATION_METHODOLOGY, project_id: hosting.project_id }, null, 2));
