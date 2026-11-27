// The package for Hostinger (npm run hostinger): the site at https://demarquia.org/pensioneslab/ (decision of the
// author, 25/11/2026). An isolated Vite build, checked, with a ZIP that holds ONLY the web files at its top level
// (unzip it inside the pensioneslab folder), and beside it, outside the ZIP so they are not published, a README with
// the steps, an inventory and the ZIP's SHA-256. Local packaging only: nothing is uploaded or published.
//   npm run hostinger                          → output/hostinger/pensioneslab-<version>-<date>/ and its .zip
//   npm run hostinger -- output/hostinger/name → that folder (it must be new and inside output/hostinger)
// The tree must be committed: the inventory names the commit the package comes from.
import { readFileSync, writeFileSync, readdirSync, existsSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const { APP_VERSION } = await import(pathToFileURL(path.join(root, 'src/shared/app-version.js')));
const { SIMULATION_METHODOLOGY } = await import(pathToFileURL(path.join(root, 'src/simulation-methodology.js')));
const { STATE_VERSION, CALIBRATION_ID } = await import(pathToFileURL(path.join(root, 'src/shared/storage-ids.js')));
const { CREDITS } = await import(pathToFileURL(path.join(root, 'src/shared/credits.js')));

// The pages the build makes (vite.config.js), the fixed files of public/, and what each build must have.
const PAGES = ['index.html', 'ayuda.html', 'consola.html', 'metodologia.html', 'graficos.html', 'sensibilidad.html', 'riesgo.html', 'informe.html'];
const PUBLIC_FILES = ['favicon.svg', 'apple-touch-icon.png', 'og-image.png'];
const REQUIRED = [/^assets\/sim-worker-.*\.js$/, /^assets\/simulation-.*\.js$/, /^assets\/.*\.css$/];

if (git('status', '--porcelain')) throw new Error('Hay cambios sin commit: el inventario debe nombrar el commit exacto. Haz commit primero.');
const today = new Date().toISOString().slice(0, 10);
const allowedRoot = path.resolve(root, 'output/hostinger');
const target = path.resolve(root, process.argv[2] || `output/hostinger/pensioneslab-${APP_VERSION}-${today}`);
if (!target.startsWith(allowedRoot + path.sep)) throw new Error('El destino debe estar dentro de output/hostinger.');
if (existsSync(target)) throw new Error(`Ya existe ${path.relative(root, target)}: usa un destino nuevo.`);
const web = path.join(target, 'pensioneslab');

// 1 · The isolated build.
execFileSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', web, '--emptyOutDir'],
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
const files = walk(web).map(full => ({ path: slash(path.relative(web, full)), bytes: lstatSync(full).size, sha256: sha(readFileSync(full)) }))
  .sort((a, b) => a.path.localeCompare(b.path));
for (const file of files) {
  if (!(PAGES.includes(file.path) || PUBLIC_FILES.includes(file.path) || /^assets\/[A-Za-z0-9_.-]+\.(?:js|css)$/.test(file.path))) throw new Error(`Recurso no previsto: ${file.path}`);
}
for (const name of [...PAGES, ...PUBLIC_FILES]) if (!files.some(file => file.path === name)) throw new Error(`Falta ${name}`);
for (const pattern of REQUIRED) if (!files.some(file => pattern.test(file.path))) throw new Error(`Falta recurso requerido: ${pattern}`);
const names = new Set(files.map(file => file.path));
let references = 0;
for (const file of files.filter(file => /\.(html|js|css)$/.test(file.path))) {
  const contents = readFileSync(path.join(web, file.path), 'utf8');
  // As in the Sites package: in a page, its src and href; in a module, the sibling modules and styles it loads and
  // the pages it links. Root-relative paths ("/x") would break inside the folder, so they are refused.
  const patterns = file.path.endsWith('.html')
    ? [/\b(?:src|href)=["']([^"']+)["']/g]
    : [/["'](\.\/[A-Za-z0-9_.-]+\.(?:js|css)|(?:\.\.\/)?[a-z]+\.html)(?:[?#][^"'\s]*)?["']/g];
  for (const pattern of patterns) for (const match of contents.matchAll(pattern)) {
    const ref = match[1];
    if (/^(?:[a-z]+:|#|\/\/)/i.test(ref)) continue;
    if (ref.startsWith('/')) throw new Error(`Ruta desde la raíz del dominio, que no funciona en /pensioneslab/: ${file.path} -> ${ref}`);
    // A page named inside a module is resolved by the browser from the document, at the root, not from assets/.
    const base = !file.path.endsWith('.html') && /\.html$/.test(ref.split(/[?#]/)[0]) ? '.' : path.posix.dirname(file.path);
    const resolved = path.posix.normalize(path.posix.join(base, ref.split(/[?#]/)[0]));
    if (!names.has(resolved)) throw new Error(`Recurso ausente: ${file.path} -> ${ref}`);
    references++;
  }
}

// 3 · Inventory and README, beside the web files (not inside them).
const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
const inventory = {
  preparedAt: new Date().toISOString(), application: 'pensioneslabs3', appVersion: APP_VERSION,
  methodology: SIMULATION_METHODOLOGY, stateVersion: STATE_VERSION, calibration: CALIBRATION_ID,
  sourceCommit: git('rev-parse', 'HEAD'), destination: CREDITS.siteHref, hosting: CREDITS.hosting, published: false,
  build: 'Isolated Vite build; no engine or calibration modifications', pages: PAGES, publicFiles: PUBLIC_FILES,
  resourcesChecked: references, bytes, files
};
writeFileSync(path.join(target, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
const zipName = `${path.basename(target)}.zip`;
const readme = `# Pensiones Lab · paquete para Hostinger

Versión ${APP_VERSION} (beta), metodología ${SIMULATION_METHODOLOGY}, estado guardado ${STATE_VERSION}, calibración ${CALIBRATION_ID}.
Commit de origen: ${inventory.sourceCommit}. Preparado el ${today}. No está publicado.

## Destino

${CREDITS.siteHref} — la carpeta \`pensioneslab\` dentro de la carpeta pública de demarquia.org en Hostinger (normalmente \`public_html/pensioneslab\`).

## Cómo subirlo

1. En hPanel, abre el Administrador de archivos de demarquia.org y entra en \`public_html\`.
2. Si existe una versión anterior en \`pensioneslab\`, bórrala entera (o renómbrala para guardarla). No mezcles versiones: los nombres de los archivos de \`assets/\` cambian en cada versión.
3. Crea la carpeta \`pensioneslab\` (si no existe) y entra en ella.
4. Sube \`${zipName}\` y descomprímelo ahí mismo. Dentro deben quedar \`index.html\`, \`consola.html\`, las demás páginas, los iconos y la carpeta \`assets\`, sin otra carpeta en medio. Ojo: el Administrador de archivos puede extraerlo en una subcarpeta (\`pensioneslab/pensioneslab-…/\`); si pasa, mueve todo su contenido un nivel arriba. Después borra el ZIP: mientras esté ahí, cualquiera puede descargarlo. Y comprueba que estás en el Administrador de archivos de demarquia.org, no en el de otra web de la cuenta.
5. Comprueba en el navegador:
   - ${CREDITS.siteHref} abre la portada, con «Beta · versión ${APP_VERSION}»;
   - «Abrir la consola» calcula y da un veredicto (la primera vez tarda unos segundos);
   - «? Ayuda», Metodología, Gráficos, Sensibilidad y Riesgo abren;
   - un escenario guardado sigue ahí al recargar.

También puedes subir los archivos de la carpeta \`pensioneslab/\` de este paquete por FTP, en vez del ZIP.

## Qué contiene

- El ZIP: solo los archivos de la web (${files.length} archivos, ${bytes} bytes): ${PAGES.length} páginas, ${PUBLIC_FILES.length} iconos e imagen para compartir, y \`assets/\`.
- Fuera del ZIP, para tu control y no para subir: este README, \`inventory.json\` (commit, versiones y huella de cada archivo) y \`${zipName}.sha256\`.
- No hay credenciales, dependencias de desarrollo, documentación interna, estado de navegador ni escenarios personales. Los capítulos del modelo van dentro de Metodología, a propósito.
- Todas las rutas son relativas: la web funciona dentro de la carpeta sin configurar nada. Se comprobaron ${references} referencias locales y ninguna parte de la raíz del dominio.
- Hay que servirla por HTTPS, no abrirla desde el disco.
`;
writeFileSync(path.join(target, 'README-HOSTINGER.md'), readme);

// 4 · ZIP of the web files only, at its top level, and its fingerprint (Windows tar; elsewhere, zip by hand).
const zip = path.join(path.dirname(target), zipName);
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : null;
if (tar && existsSync(tar)) {
  execFileSync(tar, ['-a', '-c', '-f', zip, '-C', web, ...readdirSync(web)]);
  writeFileSync(path.join(target, `${zipName}.sha256`), `${sha(readFileSync(zip)).toUpperCase()}  ${zipName}\n`);
}
console.log(JSON.stringify({ target: slash(path.relative(root, target)), zip: existsSync(zip) ? slash(path.relative(root, zip)) : null,
  zipBytes: existsSync(zip) ? lstatSync(zip).size : null, files: files.length, bytes, references, commit: inventory.sourceCommit,
  version: APP_VERSION, methodology: SIMULATION_METHODOLOGY, destination: CREDITS.siteHref }, null, 2));
