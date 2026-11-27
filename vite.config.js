import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { engineFingerprint } from './scripts/engine-fingerprint.mjs';

// La portada (index.html), la consola (consola.html), la metodología (metodologia.html), los gráficos (graficos.html), la sensibilidad (sensibilidad.html), el riesgo de mercado (riesgo.html), el informe (informe.html) y el worker del motor (src/shared/sim-worker.js).
export default defineConfig({
  root: '.',
  base: './',
  // Icons and the share image, copied as they are (public/).
  publicDir: 'public',
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
  preview: { host: '127.0.0.1', port: 5181, strictPort: true },
  // El motor pesa unos 600 kB minificado: es un solo bloque a propósito.
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 1000,
    rollupOptions: { input: { index: 'index.html', ayuda: 'ayuda.html', consola: 'consola.html', metodologia: 'metodologia.html', graficos: 'graficos.html', sensibilidad: 'sensibilidad.html', riesgo: 'riesgo.html', informe: 'informe.html' } } },
  worker: { format: 'es' },
  // Huella del motor para la caché de resultados (src/shared/result-cache.js): cambia con cualquier fichero de src/ o data/.
  define: { __ENGINE_FINGERPRINT__: JSON.stringify(engineFingerprint(fileURLToPath(new URL('.', import.meta.url)))) }
});
