# Pensiones Lab 3

Motor de simulación de pensiones de España y su consola de trabajo, de escritorio, con páginas de metodología, gráficos, sensibilidad y riesgo de mercado.
Compara reparto, cuentas nocionales, capitalización y sus mezclas, junto con los ingresos y la deuda del Estado, de 2026 a 2070.

Es una simulación con supuestos y calibración agregada: no es una previsión oficial, ni un derecho legal, ni un ranking validado.

## Arranque

```
npm install
npm run dev      # http://127.0.0.1:5180/
npm test         # pruebas del motor y de la página
npm run sim -- escenario.json   # series del escenario en CSV, sin navegador (npm run sim -- --ayuda)
npm run build    # dist/ (se sirve con npm run preview en http://127.0.0.1:5181/)
npm run hostinger   # paquete para un servidor propio en output/hostinger/, con ZIP (necesita el árbol con commit)
npm run sites    # paquete para Sites (necesita la identidad privada del Site, .openai/hosting.json)
```

Necesita Node 20 o posterior. La página no funciona abierta desde el disco (file://): necesita el servidor.

## Qué hay

- `index.html` y `src/pages/consola.js`: la consola. A la izquierda, todos los ajustes por capítulos, con su unidad, su valor de hoy y su ayuda (el «?»). A la derecha, el veredicto, cuatro gráficos y la tabla año a año o todos los sistemas con los mismos ajustes.
- `metodologia.html` y `src/pages/metodologia.js`: ficha de la versión y cómo citar, supuestos con su tipo (O, R, S) y dónde se cambian, valor de partida y rango de cada ajuste, fuentes de datos con su copia y SHA-256, y próximas citas. Lo lee todo de los módulos del motor (`src/domain/assumptions-catalog.js`, `src/shared/console-rows.js`, `data/*.js` por `src/domain/source-registry.js`).
- `graficos.html` y `src/pages/graficos.js`: constructor de gráficos del escenario abierto en la consola y de cada sistema con sus ajustes. Cada gráfico elige variables de una unidad (las series del CSV), sistemas, años y unidad (euros de 2026, de cada año o % del PIB). Se exporta en SVG con el sello y la cita (`src/domain/chart-data.js`, `src/views/chart-svg.js`).
- `sensibilidad.html` y `src/pages/sensibilidad.js`: qué supuesto decide el resultado del escenario abierto. Mueve de uno en uno 19 supuestos (el mundo, la respuesta de la economía, la deuda y la vara de medir) alrededor de su valor y mide la deuda de 2070, el año en que se rompe, la pensión frente al salario y lo que falta en 2050. Tornado en SVG y tabla en CSV (`src/domain/sensitivity.js`, `src/views/tornado-svg.js`). El resultado se guarda en el navegador y la siguiente visita con el mismo escenario lo muestra al instante (`src/shared/result-cache.js`); «Recalcular» lo calcula de nuevo.
- `riesgo.html` y `src/pages/riesgo.js`: bandas de incertidumbre (percentiles 5–95 y 25–75) del fondo y de la deuda cuando la rentabilidad de los fondos varía al azar, con su probabilidad de que se rompa. Trayectorias reproducibles por semilla (`src/domain/market-risk.js`, de pensiones_lab_2). SVG y CSV. Con los mismos ajustes y escenario, «Calcular» muestra el resultado guardado de una visita anterior; «Recalcular» lo calcula de nuevo.
- `src/simulation.js` y el resto de `src/`: el motor, que corre en un worker (`src/shared/sim-worker.js`).
- `scripts/sim.mjs` (`npm run sim`): el motor sin navegador. Lee los archivos de escenario que exporta la consola (.json, .xlsx o el .csv de series) y escribe sus series anuales en el mismo CSV que «CSV»; con `--sistemas`, también cada sistema con esos ajustes.
- `scripts/prepare-sites-package.mjs` (`npm run sites`): el paquete para Sites. Compila aparte las cinco páginas en `output/sites/pensioneslabs3-<versión>-<fecha>/`, comprueba que no sobra ni falta nada y que cada referencia local existe, y deja `inventory.json` (commit, versiones, huellas), `README-SITES.md`, el ZIP y su SHA-256. No sube ni publica: eso se hace en Sites.
- `scripts/contrast-external.mjs`: el contraste con el Ageing Report 2024, la AIReF, el FMI y Funcas que muestra la metodología (`data/external-contrast.json`). Se vuelve a ejecutar cuando cambia la metodología: `node scripts/contrast-external.mjs`.
- `data/`: la calibración (módulos JS). Las copias de los documentos que cita no se publican, porque son de sus autores: `data/sources/README.md` dice de dónde descargar cada una y da su huella SHA-256.
- `tests/`: pruebas del motor (identidades contables, transiciones, mezclas, conservación de escenarios) y de la página.

## De dónde viene

De pensiones_lab_2, versión 1.64.0, commit 5643450 (21/11/2026). Solo se migraron el motor y la consola; el motor da los mismos resultados, bit a bit. Las decisiones están en [DECISIONES.md](DECISIONES.md).
