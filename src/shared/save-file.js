// Saving a file the page makes (console exports, chart SVGs). Where the browser allows it (Chrome, Edge),
// the page opens its own «Guardar como» before making the file, because the browser only allows it right
// after the click; then «Guardado» is said only once the file is written. Elsewhere the file is handed to
// the browser, and the page says so: it cannot know whether the browser saved it (docs/DECISIONES.md).

function handOver(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * @param {{ name: string, mime: string, ext: string, make: () => Promise<Blob>|Blob }} file
 * @returns {Promise<string>} the sentence to show: saved, cancelled or handed to the browser
 */
export async function saveFile({ name, mime, ext, make }) {
  let handle = null;
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      handle = await window.showSaveFilePicker({ suggestedName: name, startIn: 'downloads', types: [{ description: ext.slice(1).toUpperCase(), accept: { [mime]: [ext] } }] });
    } catch (error) {
      if (error?.name === 'AbortError') return 'No se ha guardado: cancelado.';
      handle = null;
    }
  }
  const blob = await make();
  if (handle) {
    const out = await handle.createWritable();
    await out.write(blob);
    await out.close();
    return `Guardado: ${handle.name}.`;
  }
  handOver(blob, name);
  return `Pasado al navegador: ${name}. Si no aparece, mira sus descargas (Ctrl+J).`;
}
