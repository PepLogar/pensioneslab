# Decisiones

## 22/11/2026 · Publicada Pensiones Lab 3 en el Site existente

Sustituida la distribución completa por la consola y su motor, como versión 3 de Sites. Se conservaron identificador, URL y acceso privado solo al propietario, sin cambios de permisos. La aplicación alojada carga y termina el cálculo; la petición sin sesión recibe 401. Se reutilizó el paquete verificado, sin repetir compilación ni batería de pruebas. [Recibo y documentación de la actualización](SITES-PUBLICACION-2026-11-22.md).

## 22/11/2026 · Paquete para sustituir la versión de Sites

Preparado el ZIP local de motor y consola para el Site existente, cuya identidad y acceso privado se verificaron por consulta. Cinco archivos web, configuración de alojamiento, inventario e instrucciones. Sin publicar, traer páginas antiguas ni modificar el motor. Seis comprobaciones focales correctas y arranque/cálculo de la compilación comprobados en Chrome. Detalles, huellas y límites en [PAQUETE-SITES-2026-11-22.md](PAQUETE-SITES-2026-11-22.md).

## 22/11/2026 · Nace Pensiones Lab 3: solo el motor y la consola

**Por qué.** El autor, sobre pensiones_lab_2: «migra únicamente motor y la consola, es lo único que se salva; el resto, en lugar de ayudar, resulta lioso para alguien normal como para el experto, demasiadas páginas». Un simulador que valga a la vez para expertos y para cualquiera es difícil; este se hace como herramienta de trabajo, «como si fuera para el CERN»: sin concesiones a móvil ni a vistosidad, funcional.

**De dónde.** pensiones_lab_2 1.64.0, commit 5643450 (21/11/2026), metodología `common-fund-1.64.0`, datos y estado guardado de la misma versión (`CALIBRATION_ID` y `STATE_VERSION` no cambian). pensiones_lab_2 no se tocó: solo se leyó y se copió de él (copia binaria, con sus finales de línea).

### Qué se migró

- El grafo de imports de `consola.html` → `src/pages/consola.js` (143 archivos) y el worker `src/shared/sim-worker.js`.
- Los datos que el motor lee o cita: los módulos de `data/*.js`, `data/official-mortality.js` (citado por el contrafactual de 1985), `data/mutuas-v7-income-research.json` y `data/mutuas-v7-spending-research.json` (citados como procedencia por `data/mutuas-v7.js`; no se descargan en ejecución).
- Las 45 fuentes de `data/sources/` que citan el motor y la consola (≈52 MB), con la misma ruta. Las completas (612 MB) siguen en `pensiones_lab_2/data/sources`. `.gitignore` aplica la misma regla que pensiones_lab_2 (`scripts/ignore-large-sources.mjs`): fuera de git los archivos de más de 1 MiB, salvo los que pensiones_lab_2 comprueba byte a byte; aquí son 4.

### Qué se quitó, y por qué

| Quitado | Por qué |
|---|---|
| `site-nav.js` (cabecera, menú, banda beta, barra del escenario, pie) | Es del sitio divulgativo. La barra de la consola hace lo que hacía falta de ella: guardar, abrir, exportar, importar y enlace. |
| `glossary.js` y su marcado automático | Del sitio. La ayuda de cada ajuste está en su «?». |
| `domain/help.js` (PAGE_HELP), `methodology-notes.js`, `doc-links.js`, `reveal.js`, `sticky-top.js` | Ayudas y navegación de páginas que ya no existen. |
| `expert-mode.js` (Modo experto) | En la consola todo está siempre a la vista. El estado guardado conserva el campo `expert` por compatibilidad, sin uso. |
| `last-answer.js`, `publish-answer.js`, `domain/scenario-answer.js`, `scenario-change-list.js` | Respuestas y avisos entre páginas del sitio. |
| `series-export.js`, `chart-image*.js`, la parte de botones de `excel-models-io.js` | La consola descarga los mismos archivos (CSV largo, diccionario, JSON del escenario, Excel) llamando directamente a `export-files.js` y a `buildModelsXlsxBytes`; importa con `parseImportedModelFile`. |
| Panel de Ajustes de `settings-panel.js` (HTML y `createSettingsPanel`) | Se conservan solo las definiciones de los controles (`SETTINGS_CONTROLS`, `settingsPatch`, `settingChanged`, `choiceMatches`). |
| Enlaces a páginas del sitio en `settings-catalog.js` (`SETTINGS_PLACES`, `SETTINGS_TOOLS`, `LAB_ELSEWHERE`, `LAB_CONTROL_KEYS`, `labControlHref`, `settingsCrossRef`, `settingLocalName`, `LEVER_SETTINGS`) | Apuntaban a páginas que no existen. Un ajuste sin casilla propia dice ahora en qué pestaña se cambia. |
| Panel interactivo de `viaje.html` en `wealth-corporate-squeeze.js` | Era de otra página. Se conservan el análisis y los parches de configuración, que usa la pestaña «Ricos y empresas». Con él se va la lectura de `data/retro1985-taxcuts.json`, que no se copia. |
| `data/precomputed-scenarios.json` y su lectura en `sim-client.js` | Sin caché precalculada: todo se calcula en el worker (unos 3–4 s por sistema la primera vez; luego, caché en memoria). Así no hay que recalcular nada al cambiar el motor. |
| `base.css`, `site.css` | Hoja propia y única: `src/consola.css`. |
| Scripts del sitio (precompute, build de páginas, check:pages…) y sus pruebas | No hacen falta. |

Archivos de pensiones_lab_2 que dejan de importarse y se borraron tras podar: 17 módulos (los de la tabla). El grafo queda en 126 archivos de `src/` y `data/`.

### La consola

- Una página, `index.html`, solo de escritorio: la página no se desplaza; lo hacen la lista de ajustes y la tabla, cada una en su caja. Sin media queries para móvil, sin animaciones ni adornos, tipografía del sistema, números con `tabular-nums` y decimales fijos en las tablas.
- Barra: sistema, año, deshacer/rehacer, reglas de hoy; escenarios guardados en el navegador (guardar, abrir, borrar); exportar CSV (escenario o todos los sistemas), diccionario, Excel y JSON; importar (.json, .xlsx, .csv); copiar enlace; atajos.
- Ajustes: los once capítulos de antes (los siete del catálogo, Ricos y empresas, Partidas del Estado, Calendario, Límites y mezcla), con unidad, valor de hoy y ayuda en el «?»: primero la del catálogo (`SETTING_HELP`), después la del Laboratorio. La búsqueda usa la del catálogo (sin tildes, singular o plural, sinónimos) y además la clave del motor.
- Resultado: veredicto, cifras del año, cuatro gráficos y la tabla por años o «Todos los sistemas».
- Un enlace `index.html#escenario=…` abre ese escenario; «Deshacer» devuelve el anterior. El sello de los archivos exportados enlaza a `index.html` (antes, a `resumen.html`).
- Puertos propios (5180 y 5181) para no compartir el almacenamiento del navegador con pensiones_lab_2 (4173).

### El motor es idéntico

Comprobado al migrar, con la configuración de partida y con cada sistema de la comparación (Reparto, Cuentas nocionales, Capitalización de golpe, Mixto de golpe, Mixto progresivo, Mixto con ahorro propio y el contrafactual de 1985): el hash de las filas 2026–2070 es el mismo en los dos proyectos. Lo fijan dos pruebas:

- `tests/engine-identity.test.mjs` (de pensiones_lab_2): hash del resultado completo de tres configuraciones, bit a bit.
- `tests/engine-reference.test.mjs` (nueva): siete indicadores por año, 2026–2070, de Reparto, Cuentas nocionales, Mixto progresivo y Mixto con ahorro propio, frente a `tests/fixtures/engine-reference-1.64.0.json`, generado con el motor de pensiones_lab_2.

Un cambio del motor cambia esas referencias a propósito y se explica aquí.

### Pruebas

Se copiaron de `pensiones_lab_2/tests` las que solo tocan archivos que existen aquí y pasan: identidades contables, transiciones, mezclas, conservación de escenarios y el motor. Más `tests/index-page.test.mjs` (la página carga la consola y nada apunta a archivos que no existen). En total, 30 archivos y 113 pruebas; `npm test` tarda unos 40 s.

Se dejaron fuera, aunque solo tocan archivos de aquí: `setting-needs-engine` y `setting-systems-engine` (reglas de la interfaz contra el motor, cientos de ejecuciones, varios minutos) y `startup.test.js` (lee `laboratorio.html`). Las pruebas de páginas, textos y scripts del sitio no se copiaron.

## 22/11/2026 · Exportar, importar y el enlace, probados en el navegador

Con un escenario cambiado (edad de jubilación 67: «Se rompe en 2050»):

- **Exportar:** salen bien los cinco archivos.
  - CSV del escenario: 3.201 líneas.
  - CSV de todos los sistemas: 25.566 líneas.
  - Diccionario.
  - JSON del escenario.
  - Excel (.xlsx válido).
  - Cada uno lleva su sello: versión, metodología, datos, fecha y enlace.
- **Importar:**
  - El JSON y el Excel devuelven el escenario («Se rompe en 2050»).
  - Un JSON roto da un aviso claro.
  - **Arreglado:** el CSV de series que exporta la propia consola no se podía importar, porque no trae una tabla de ajustes. Ahora se lee el enlace de su cabecera (`# Escenario: …#escenario=…`). Si la cabecera no trae enlace, es el escenario de las reglas de hoy. Un CSV sin ajustes ni enlace se sigue rechazando. Lo fija `tests/csv-roundtrip.test.mjs`.
- **Copiar el enlace:** el enlace copiado abre el escenario y se quita de la barra de direcciones.
- **Texto:** «1 ajustes» pasa a «1 ajuste».

Las pruebas son ahora 31 archivos y 116 pruebas.

## 22/11/2026 · Escenarios e intercambio comprobados en Sites

Revisión de la versión 3 publicada con dos agentes y tres escenarios sintéticos: Reparto base, Reparto a 67 y Mixto progresivo de referencia. Se contrastaron 9.585 filas CSV, 1.080 celdas de interfaz y 1.395 celdas de la serie activa Excel, sin diferencias respecto a las referencias al redondeo previsto. JSON/CSV/Excel conservan la configuración económica en los recorridos probados. Los nuevos guardados y sus límites sobreviven a recarga y reapertura.

Se reproducen dos defectos pendientes: el año visible está separado del año guardado/exportado; importar JSON omite los límites que contiene. Excel y CSV no transportan esos límites; CSV tampoco el año de consulta. No se han corregido ni desplegado cambios en esta ronda de revisión. Tres simulaciones locales, ninguna batería general.

Las pruebas se hicieron en el navegador integrado, separado de Chrome. Las nueve entradas de almacenamiento personal de Chrome coinciden byte por byte antes y después. Su biblioteca estaba vacía: no se acredita migración histórica de escenarios ausentes. La limpieza de los registros sintéticos del navegador integrado quedó sin verificar por bloqueo del diálogo en la herramienta.

Informe y evidencias: [SITES-ESCENARIOS-IO-2026-11-22.md](SITES-ESCENARIOS-IO-2026-11-22.md) y [recibo resumido](SITES-ESCENARIOS-IO-2026-11-22.json).

## 22/11/2026 · Corregidos los dos defectos de la revisión en Sites

Sobre [SITES-ESCENARIOS-IO-2026-11-22.md](SITES-ESCENARIOS-IO-2026-11-22.md):

- **Año consultado.** La consola ya no lleva su propio año: lee y escribe el `selectedYear` del escenario guardado. Elegir un año (casilla, fila de la tabla o Alt+flechas) lo guarda. Guardar, abrir, exportar, importar y recargar llevan el mismo año. Un navegador sin escenario empieza en 2050, como antes. Un estado ya guardado abre en el año que tenga (antes se guardaba 2026 aunque se viera 2050).
- **Límites al importar.** El JSON trae sus límites y se aplican. El Excel los lleva ahora en su copia íntegra (`escenario_completo`) y también se aplican. Un archivo sin límites (CSV de series, JSON antiguo o de claves sueltas, Excel anterior) deja los de aquí, y el aviso lo dice: «El archivo no trae tus límites: siguen los de aquí». Igual con el año.
- **Deshacer.** Guarda configuración y límites, no solo la configuración: deshacer una importación devuelve también los límites anteriores. Cambiar un límite se puede deshacer. El año consultado no se deshace: no es un cambio del escenario.

Comprobado en el navegador: 2035 en la tabla se guarda y sobrevive a la recarga. Importar un JSON con 172 / 7 / 45 y 2040 los aplica, y Deshacer vuelve a 150 / 5 / 40. Nuevas pruebas en `tests/scenario-file-limits-year.test.mjs` (JSON y Excel con límites y año; un archivo sin límites deja los abiertos). Son 32 archivos y 119 pruebas, todas correctas. Motor sin cambios.

## 22/11/2026 · Exportar abre su propio «Guardar como»

**Qué pasaba.** La consola decía «Descargado.» y Chrome no mostraba ninguna descarga, ni en local ni en Sites. Los archivos sí llegaban enteros a la carpeta de descargas, pero con nombres provisionales (`<guid>.tmp`) que Chrome nunca renombró. El Chrome del autor tiene «Preguntar dónde guardar» activado y su última carpeta es `A:\`, que no existe; lo más probable es que su diálogo falle sin avisar y la descarga quede a medias. La consola no podía saberlo: decía «Descargado» al entregar el archivo, no al guardarse.

**Qué cambia.**
- Donde el navegador lo permite (Chrome, Edge), cada botón abre el «Guardar como» de la propia consola, empezando en Descargas, antes de calcular. Solo dice «Guardado: nombre» cuando el archivo está escrito. Cancelar dice «No se ha guardado: cancelado».
- Donde no (Firefox, Safari o un marco que lo impida), el archivo se pasa al navegador como antes. El aviso ya no dice «Descargado», sino «Pasado al navegador: nombre. Si no aparece, mira sus descargas (Ctrl+J)».
- El enlace temporal del archivo dura 60 s en vez de 1,5 s.

Comprobado en el navegador integrado con un diálogo simulado: CSV y Excel se escriben enteros, cancelar no guarda nada, y sin diálogo el archivo pasa al navegador con el nuevo aviso. Falta probar el diálogo real en Chrome y dentro de Sites.

## 22/11/2026 · Página de metodología, fase 1

**Por qué.** El autor quiere ir añadiendo utilidades prácticas, empezando por una página con toda la metodología, los supuestos y las fuentes. Decidido: una página aparte (`metodologia.html`), enlazada desde la barra de la consola, y por fases.

**Fase 1 (hecha).** Todo se genera de los módulos que usa el motor, para que la página no pueda contar una cifra distinta de la que calcula la consola:

- **Ficha:** versión, metodología, datos, versión del estado, horizonte, unidades y cómo citar. Qué es y qué no es, y las cuentas que se llevan separadas.
- **Supuestos:** 39, con su tipo (O observación, R reconstrucción, S supuesto), valor, fuente, dónde se cambia en la consola y su auditoría. El catálogo viene de pensiones_lab_2 (`src/domain/assumptions-catalog.js`), pero «dónde se cambia» ya no es texto: son claves del catálogo de ajustes o pestañas de la consola, y la página escribe el capítulo y el nombre. Se quitaron las referencias a páginas de lab2 que no existen aquí. Se añadió «Tus límites».
- **Valores de partida:** los 118 ajustes por capítulo, con su clave, su valor de partida, lo que admite y qué mueve; y las pestañas propias (Ricos y empresas, Partidas del Estado, tus límites). Las filas de la consola pasan a `src/shared/console-rows.js`, que usan las dos páginas.
- **Fuentes de datos:** 57, leídas de `data/*.js` (`src/domain/source-registry.js`): enlace, editor, página u hoja, copia en el proyecto con su SHA-256 y qué módulos la usan.
- **Próximas citas:** publicaciones que cambiarían datos.

**Fase 2 (pendiente).** El modelo y sus ecuaciones, sección a sección, comprobado contra el motor 1.64: `MODELO.md` de pensiones_lab_2 describe la 0.23 y no sirve. Las auditorías que cita la tabla de supuestos siguen en `pensiones_lab_2/docs`.

Prueba nueva `tests/methodology.test.mjs`: cada supuesto apunta a ajustes y pestañas que existen; cada ajuste tiene valor de partida; cada fuente tiene enlace y su copia local coincide con su SHA-256. La compilación saca las dos páginas.

## 22/11/2026 · Página de metodología, fase 2: el modelo

**Qué hay.** La sección «Modelo» de `metodologia.html` muestra `docs/modelo/01` a `05`, en este orden:

1. Estructura del cálculo, población y economía.
2. Ingresos y gasto público.
3. Pensiones y sistemas.
4. Deuda, intereses y veredicto.
5. El contrafactual de 1985, la comparación de sistemas y la calibración de 2026.

Cada mecanismo lleva qué calcula, su ecuación, su lugar en el bucle anual, la clave y el valor de su ajuste, su tipo (O, R, S) y referencias `ruta:línea` al código. La página los pinta con `src/shared/markdown.js`, que viene de pensiones_lab_2.

**Cómo se escribió.**
- Cinco lectores independientes, uno por sección, describieron solo lo que hace el código de la metodología `common-fund-1.64.0`.
- Un revisor intentó refutarlos con 100 afirmaciones comprobadas contra el código y el motor: 87 correctas, 2 errores y 11 imprecisiones. Las ecuaciones centrales coinciden. Las 13 se corrigieron.
- `tests/methodology.test.mjs` comprueba que las más de 300 referencias `ruta:línea` existen, para que no se queden viejas sin aviso.

**Preguntas abiertas para el autor (marcadas en el texto o en «Límites»).**
- `budget-share-rule.js`: los coeficientes 0,14 / 0,11 / 0,08 / 0,06 / 0,52 no dicen de dónde salen.
- `budget-partitioner.js:173`: fija `basePensionShare` = 0,0959, frente al 0,1146 por defecto de `pensionBudgetShare`.
- El veredicto (`verdict.js`) y el semáforo (`sustainability-light.js`) dan etiquetas distintas al riesgo alto sostenido sin quita.
- La suficiencia de la pensión suma el dividendo ciudadano. Tus límites y `firstOutsideYear` no lo suman.
- «Pensión pagable»: sus dos ajustes no cambian las cuentas y ninguna vista de lab3 los enseña. Siguen en la consola sin efecto visible.
- El contrafactual de 1985 tiene textos desfasados: la mortalidad que cita y las «cinco vías».
- El 0,77 de la tasa de sustitución no lleva fuente.
- El motor separa `productivityGrowth` y `realWageGrowth`; el control de la consola mueve los dos a la vez.
- Desde 2051 el MEI vale 0, porque su calendario acaba en 2050.

## 22/11/2026 · Respuestas a las preguntas del modelo (metodología 1.65.0)

El autor pidió arreglar las preguntas abiertas de la fase 2. Decidió que el PIB de referencia del gasto siga a la productividad. Se hizo en dos tandas.

**Sin cambiar resultados.**
- **MEI.** Vale 0 desde 2051 porque la ley lo aplica hasta 2050. Es una observación, no un fallo, y se añade a Supuestos.
- **0,77 de la tasa de sustitución.** Es la tasa bruta de sustitución de las altas de jubilación de España en el Ageing Report 2024 (ficha de España, tabla 17), redondeada. Es el punto neutro de la escala y se añade a Supuestos.
- **Contrafactual de 1985.** Se corrigen dos textos: la mortalidad que cita y «seis vías».
- **Pensión pagable.** Ahora se ve: columna «Pagable €/mes» en la tabla año a año y serie `pension_pagable_mensual` en el CSV (72 variables). Es la pensión media congelada desde el rescate y recortada desde la quita. Con las reglas de hoy, en 2050 son 1.849 €/mes, frente a 2.224 prometidos.

**En el motor y sus lecturas.**
- **Veredicto y semáforo.** Siguen una sola regla: «se rompe» es riesgo alto durante `riskSustainYears` años seguidos, o una pensión insuficiente. El rescate, la quita y el impago solo cambian la frase. Las etiquetas pasan a «Aguanta», «Aguanta, con avisos» y «Se rompe» (`src/domain/verdict.js`, `src/domain/sustainability-light.js`).
- **Una sola medida de la pensión frente al salario.** `pensionToWage` (`src/sustainability.js`) incluye el dividendo ciudadano y el bono. La usan la suficiencia, tus límites y `describeSustainability`. Con las reglas de hoy, el dividendo es 0.
- **Partidas del Estado.** El desglose usa la parte de partida de los datos (0,1146, no 0,0959) y el gasto elegible del motor (no un 0,57 fijo). La consola también lo usa: antes, el primer recorte por partidas escribía en el motor un recorte un 7 % mayor del elegido.
- **Coeficientes de la regla de reparto.** Los coeficientes 0,14 / 0,11 / 0,08 / 0,06 / 0,52 no son «la mitad del ingreso extra»; se comparó y no cuadra. Quedan como supuestos con nombre y comentario. Calcularlos cambiaría la parte cada vez que se aplica una medida.
- **PIB de referencia del gasto.** Sigue a `productivityGrowth`, no a `realWageGrowth` (`src/current-simulation-core-v10.js:287`). La natalidad, la IA y el capital público siguen fuera, a propósito, como dicen el código y los comentarios. Hallazgo: si la productividad sube y los salarios no, la deuda de 2070 queda en el 286 %, frente al 277 % con las reglas de hoy. El gasto sigue al PIB, pero la mayor parte de los ingresos sigue a la masa salarial. Sociedades sí cobra sobre el margen que se abre: su base es el excedente bruto (PIB menos remuneración de asalariados). En 2070 recauda 2,2 veces más, del 3,1 % al 4,4 % del PIB. No basta, porque el IRPF, el IVA y las cotizaciones siguen a los salarios, y los «impuestos sin modelo propio» (57.000 M€) son constantes en euros reales. Los impuestos bajan del 25,3 % al 21,9 % del PIB. (Corregido el 22/11: una primera nota decía, por error, que Sociedades no cobraba sobre ese margen.)

**Metodología 1.65.0.** Con los ajustes de partida, los resultados son bit a bit los de la 1.64.0. Se comprobó así:
- Los hashes de identidad de la 1.64.0 (reparto, Mixto progresivo y un caso con medidas) se reproducen exactos quitando solo la etiqueta de metodología. Después se regeneraron.
- La referencia de cifras pasa a `tests/fixtures/engine-reference-1.65.0.json` con las mismas cifras.

Pruebas nuevas:
- `verdict-light-one-rule`
- `pension-to-wage-one-measure`
- `budget-share-sources`
- `spending-gdp-follows-productivity`

## 22/11/2026 · Impuestos sin modelo propio: fijos o con el PIB, a elegir

**Por qué.** El autor pidió que la elección entre los dos supuestos quede en manos de quien usa la consola. Los «impuestos sin modelo propio» son patrimonio, transmisiones y otros, unos 57.000 M€ en 2026. El motor no tiene una base propia para ellos.

**Qué cambia.**
- Hay un ajuste nuevo, `unmodeledTaxesFollowGDP`: «Los impuestos sin modelo propio crecen con el PIB». Está en el capítulo 6, «Cómo responde la economía».
- Apagado, por defecto, se quedan fijos en euros de 2026, como hasta ahora.
- Encendido, siguen al PIB nominal (`src/revenue-bases-v10.js`).

**Efecto.**
- Con las reglas de hoy, encender el ajuste baja la deuda de 2070 del 277 % al 221 %. Fijos, estos impuestos bajan del 4,3 % al 3,8 % del PIB, porque el PIB real crece.
- Con productividad +1 % y salarios planos, la deuda baja del 286 % al 218 %.

**Comprobación.** Por defecto, los resultados no cambian. La metodología sigue siendo la 1.65.0 y no cambia la versión del estado guardado. Los hashes de identidad se reproducen exactos quitando la clave nueva del eco de la configuración, y se regeneraron con ella. Las cifras de referencia no cambian. Prueba nueva: `tests/unmodeled-taxes-choice.test.mjs`.

## 23/11/2026 · Página de gráficos exportables

**Por qué.** El autor pidió una página para generar gráficos detallados y exportarlos. Eligió:
- un constructor, no un panel fijo;
- comparar el escenario abierto con los sistemas;
- exportar en SVG.

**Qué hay.** `graficos.html` se abre desde la barra de la consola, en otra pestaña.
- **Datos.** Calcula el escenario abierto en la consola y cada sistema con sus mismos ajustes, incluido el contrafactual de 1985, como «Todos los sistemas».
- **Variables.** Cada gráfico elige variables entre las 72 series del CSV. Todas deben tener la misma unidad: un gráfico con dos ejes engañaría.
- **Ajustes de cada gráfico.** Se eligen los sistemas, los años y la unidad: euros de 2026, euros de cada año (por el índice de precios) o % del PIB. También si el eje empieza en 0.
- **Colores y trazos.** Cada sistema tiene su color, de la paleta Okabe–Ito, legible con daltonismo. Cada variable tiene su trazo.
- **Cifras.** Salen de las mismas funciones que el CSV (`src/domain/chart-data.js`): el gráfico y el archivo no pueden diferir.
- **Exportar SVG.** El archivo es autónomo, con todos los estilos en el propio SVG, para abrirlo en el navegador, Inkscape o Illustrator. Lleva al pie el sello y la advertencia, y dentro (`<desc>`) la cita completa con el enlace del escenario. Se guarda con el mismo «Guardar como» que la consola, ahora en `src/shared/save-file.js`.
- **Memoria de la página.** Los gráficos se recuerdan en este navegador. Empieza con tres: deuda de todos los sistemas, pensión media y pagable, e ingresos y gasto en % del PIB.

**Comprobado en el navegador:**
- Rechaza mezclar unidades.
- Las unidades cambian el eje.
- Los años y los sistemas filtran.
- El SVG exportado es válido y lleva la cita.

Prueba nueva `tests/charts.test.mjs`: la vista en % del PIB coincide con la ratio del motor, la nominal es la real por el índice de precios y el SVG no depende de hojas de estilo.

## 23/11/2026 · Página de sensibilidad: qué supuesto decide

**Por qué.** Era la primera mejora propuesta: un evaluador pregunta qué supuesto decide el resultado, y nada en la herramienta lo decía. Ejemplo: un solo interruptor, el de los impuestos sin modelo propio, mueve la deuda de 2070 en 56 puntos.

**Qué hay.** `sensibilidad.html` se abre desde la barra de la consola.
- **Supuestos que mueve.** Son 19, de «El mundo», «Cómo responde la economía», la deuda y la vara de medir (`src/domain/sensitivity.js`).
- **Cómo los mueve.** De uno en uno, alrededor del valor que tienen en el escenario abierto y con todo lo demás fijo: un paso abajo y otro arriba, o la otra opción de un interruptor.
- **Los pasos.** Son elección del proyecto (S) y cada uno dice el suyo; por ejemplo, ±1 punto de interés real o 1,0 y 1,6 hijos por mujer.
- **Medidas.** La deuda de 2070, el año en que se rompe, la pensión frente al salario en 2050 (la misma medida única, con el dividendo) y lo que falta para pensiones en 2050.
- **Tornado.** Muestra la medida elegida, con el mayor efecto arriba.
- **Tabla.** Lleva las cuatro medidas, con su diferencia respecto al escenario.
- **Supuestos sin efecto.** Los que no mueven nada en ese escenario se nombran aparte. Por ejemplo, la respuesta de Laffer no actúa si el escenario no sube impuestos.
- **Exportar.** El tornado en SVG, con sello y cita, y la tabla en CSV, con el sello.
- **Cálculo.** Son unas 33 ejecuciones, todas a la vez en los workers: unos 36 s en este equipo, frente a casi 3 minutos una tras otra.

**Con las reglas de hoy.** La deuda de 2070 es del 277 % y se rompe en 2042. Lo que más la mueve:
- Vidas más largas (+0,3 años por año): +134 puntos.
- Interés real ±1 punto: −71 / +112.
- Hijos por mujer, 1,0 / 1,6: +40 / −96.
- Sanidad y dependencia sin crecer con el envejecimiento: −81.
- Productividad ∓0,5 puntos: +79 / −58.
- Impuestos sin modelo propio con el PIB: −55.

Con deuda nueva a 7 años, se rompe en 2034.

Prueba nueva `tests/sensitivity.test.mjs`.

## 23/11/2026 · Contraste con otras proyecciones

**Por qué.** Sin contraste, nadie puede saber si el punto de partida es razonable. Era la segunda mejora propuesta.

**Qué hay.** En `metodologia.html` hay una sección nueva, «Contraste con otras proyecciones». Lee `data/external-contrast.json`, que escribe `scripts/contrast-external.mjs` a partir del motor y de las fuentes guardadas. El script viene de pensiones_lab_2, sin su sección 5, porque necesitaba archivos que no se migraron. Nada se calibra a las fuentes. Compara con estas proyecciones:
- **Ageing Report 2024, España, largo plazo.** El anexo, hojas ESa y ESb, se comprueba con su SHA-256. Se contrastan el gasto, la jubilación, la pensión frente al salario, la dependencia, la inflación, el PIB, el empleo, el interés, los pensionistas y los cotizantes, en 2026, 2030, 2040, 2050, 2060 y 2070.
- **El mismo escenario con los cotizantes del Ageing Report.**
- **Sus sensibilidades**, hechas con las palancas del simulador.
- **AIReF.** La regla de gasto de 2023 con la misma ventana y la misma lectura, frente a su Estudio 1/2026. Es nueva respecto al script de lab2.
- **FMI (mayo de 2026) y Funcas (octubre de 2026), corto plazo.** Sus datos se copian de pensiones_lab_2 (`data/external-forecasts-*-20261017.json`).

**Lo que dice, con las reglas de hoy.**
- **AIReF.** El simulador coincide casi exacto: gasto bruto medio 2022–2050 del 14,59 % frente al 14,60 %, y neto del 12,99 % frente al 13,00 %.
- **Ageing Report: gasto.** El gasto en pensiones queda entre 0,5 y 1,3 puntos de PIB por debajo, del 16,0 % frente al 17,3 % en 2050. Con los cotizantes del Ageing Report (−12 % en 2070) sigue por debajo hasta 2060 y lo supera en 2070 (17,3 % frente a 16,7 %).
- **Ageing Report: pensionistas.** El simulador hace crecer más los jubilados (índice 189 frente a 149 en 2070), aunque cuenta solo jubilación y el Ageing Report todas las pensiones. Es una diferencia que conviene revisar.
- **FMI y Funcas.** La deuda a corto plazo está a menos de un punto en 2026–2028. Hacia 2031 se separa del FMI: 96,5 % frente a 90,7 %.

**Comprobación.** `tests/external-contrast.test.mjs` exige que el archivo sea de la metodología actual y que sus cifras del escenario sean las del motor de hoy. Si el motor cambia, hay que volver a ejecutar el script; la página también avisa.

## 23/11/2026 · Por qué los jubilados crecen más que en el Ageing Report

**Pregunta.** En el contraste, los jubilados del simulador crecen hasta un índice 189 en 2070 (2026 = 100) y los pensionistas del Ageing Report hasta 149. Aun así, el gasto del simulador queda por debajo.

**Respuesta.** No es un error.

De 2026 a 2070 la diferencia se descompone exacta en tres factores (`scripts/contrast-external.mjs`, apartado 1b):
- **Demografía, ×1,118.** EUROPOP2025, la del simulador, da 17,4 millones de mayores de 65 en 2070. La proyección del Ageing Report, de la edición anterior, da 15,8.
- **Definición, ×1,099.** El Ageing Report cuenta todas las pensiones, también viudedad e incapacidad de menores de 65, que crecen menos.
- **Edad, ×1,034.** El Ageing Report sube la edad de salida del empleo de 65,0 a 66,4. El simulador la deja en 65.

El gasto empieza más bajo por dos motivos (apartado 1c):
- **Alcance, ya en 2022.** El año base del Ageing Report da 13,09 % y la medida de la AIReF y el Ministerio, 12,64 %. Abarcan cosas distintas.
- **Senda 2022–2025.** El Ageing Report preveía una subida de 0,63 puntos y la observada fue de 0,33, porque el PIB creció más que su crecimiento potencial (1,2–1,5 %).

El simulador arranca del dato observado. Desde 2026, las sendas suben parecido: +2,5 puntos en el simulador y +2,9 en el Ageing Report. Por eso coincide con la AIReF, que usa la misma medida.

**En la página.** La metodología lo explica bajo la tabla del Ageing Report, con las cifras que escribe el script. Se recalculan cuando cambia el motor.

## 23/11/2026 · El motor sin navegador: npm run sim

**Por qué.** Era la tercera mejora propuesta. Sirve a quien trabaja en R o Python, o necesita lanzar muchos escenarios seguidos, y permite reproducir un resultado fuera de la página.

**Qué hay.** `npm run sim -- [opciones] [escenario.json …]` (`scripts/sim.mjs`).
- **Entrada.** Lee cada archivo como lo lee «Importar»: el .json o el .xlsx de la consola, o el .csv de series con su enlace. Sin archivos, usa las reglas de hoy.
- **Salida.** Escribe las series anuales en el mismo CSV que «CSV». Cada escenario lleva su nombre de archivo en la columna «sistema». Arriba va el sello del primero, con su enlace sin dirección: la consola lo abre desde su «#escenario=…».
- **Opciones.**
  - `--sistemas`: añade cada sistema con los ajustes del primer escenario, como «CSV sistemas».
  - `--diccionario`: escribe el diccionario de variables.
  - `--salida`: escribe en un archivo.
  - `--ayuda`: muestra la ayuda, en español.
- **Veredicto.** Sale por el canal de errores, una línea por ejecución, para que el CSV quede limpio.

Prueba nueva `tests/sim-cli.test.mjs`. Ejecuta el comando con un escenario exportado y comprueba que sus cifras son las del motor y que rechaza una opción desconocida.

## 23/11/2026 · Riesgo de mercado: bandas de incertidumbre

**Por qué.** Era la cuarta mejora propuesta: un solo camino de rentabilidad oculta lo que puede pasar con un fondo.

**Qué hay.** `riesgo.html`, que se abre desde la barra de la consola, con «Riesgo».
- **Las trayectorias.** Cada una suma una desviación al azar a la rentabilidad real de los fondos, cada año desde 2027. El motor calcula el escenario entero con ella, como opción de la ejecución que no se guarda.
- **Las desviaciones.** Son independientes, de media cero y con la volatilidad que se elija (10 % por defecto). Pueden ser normales o de colas gruesas (t de Student con 5 grados de libertad) y tener memoria (−0,3, 0 o 0,3). La semilla las hace reproducibles. No tienen relación con el crecimiento ni con los tipos: es un supuesto (S) y se dice en la página.
- **De dónde viene.** El módulo es el de pensiones_lab_2 (`src/domain/market-risk.js`), sin su archivo precalculado.
- **Qué se compara.** Tu escenario o los sistemas con fondo (Mixto progresivo, Capitalización de golpe, Mixto de golpe).
- **Qué enseña:**
  - la proporción de trayectorias que se rompen antes de 2071, con su año mediano y su rango;
  - los percentiles de 2070 del fondo, la deuda y la primera pensión;
  - dos abanicos, fondo y deuda, con la mediana y el camino sin choques.
- **Exportar.** Los dos abanicos en un SVG, con sello y cita, y las bandas en CSV.
- **Cálculo.** Se hace al pulsar «Calcular», en los workers: 61 ejecuciones en unos 34 s.

**Lo que se ve con el Mixto progresivo de partida** (volatilidad del 10 %):
- El fondo de 2070 va del 71 % al 180 % del PIB (p5–p95).
- La deuda apenas se mueve: del 318 % al 324 %.
- Se rompe en 2040 en todas las trayectorias, porque lo que lo rompe es la deuda.

La rentabilidad del fondo común no pasa a las cuentas del Estado. Es coherente con un fondo que no hereda nadie y que no paga deuda, pero merece leerse: el riesgo de mercado lo corren las pensiones, no el Estado.

Prueba nueva `tests/market-risk.test.mjs`:
- la misma semilla da las mismas trayectorias;
- la volatilidad es la pedida, con y sin memoria;
- una trayectoria de ceros no cambia nada;
- un mercado mejor da más fondo;
- el abanico es un SVG autónomo.

## 23/11/2026 · Escenarios guardados en los gráficos

**Por qué.** Era la última mejora propuesta: comparar en un gráfico los escenarios propios, no solo los sistemas.

**Qué cambia en `graficos.html`.**
- **Los guardados.** Los escenarios guardados en este navegador aparecen como «Guardado: nombre», después de tu escenario y los sistemas. Cada uno se calcula con su propia configuración.
- **Por defecto.** Un gráfico muestra tu escenario y los sistemas; los guardados se añaden marcándolos, para que una biblioteca larga no llene los gráficos.
- **Guardar o borrar en la consola.** Si la consola está abierta en otra pestaña, la página vuelve a leer los guardados sin recalcular lo demás. Un guardado que se borra sale de los gráficos que lo mostraban.
- **Colores.** La paleta pasa de 8 a 14: primero Okabe–Ito y después seis más para los guardados. Pasado el 14, los colores se repiten.

Comprobado en el navegador con dos escenarios de prueba, borrados después: se calculan, se añaden al marcarlos, salen en la leyenda y desaparecen al borrarlos.

## 23/11/2026 · Por qué la deuda se separa de la del FMI

**Pregunta.** En 2031 el simulador da una deuda del 96,5 % del PIB y el FMI del 90,7 %.

**Respuesta.** No es un error. La deuda cumple la identidad `d_t = d_{t−1}·Y_{t−1}/Y_t + intereses_t − saldo primario_t`, y se cambian en el simulador sus bloques por los del FMI, de uno en uno (`scripts/contrast-external.mjs`, apartado 4b).

| Cambio en el simulador | Deuda 2031 | Efecto |
|---|---:|---:|
| Ninguno | 96,5 | |
| Saldo primario del FMI | 93,4 | −3,1 |
| PIB nominal del FMI | 93,6 | −2,9 |
| Intereses del FMI | 96,9 | +0,4 |
| Los tres | 91,0 | −5,5 |
| Y su deuda de partida | 91,6 | |

- **Saldo primario.** El simulador sigue las reglas de hoy: su gasto primario pasa del 43,0 % al 44,1 % del PIB, con más pensiones y más sanidad. En el FMI pasa del 43,6 % al 43,4 %. Su escenario central no es la meta de consolidación del Gobierno: según la fuente guardada, incorpora medidas ya identificadas, la progresividad en frío, subidas graduales de cotizaciones y el calendario de los fondos europeos.
- **Crecimiento.** El simulador frena hacia el 1,2 % real en 2031 por la demografía. El FMI mantiene el 1,7 %, y el Ageing Report da un 0,8 % en 2030: el simulador queda entre los dos.
- **Lo que queda.** Unos 0,9 puntos son el ajuste entre déficit y deuda del propio FMI: su deuda publicada no sale entera de sus cifras.

**En la página.** La metodología lo explica bajo las tablas del FMI y Funcas, con las cifras del script.

Corregido antes de publicarlo: una primera versión decía que el FMI suponía el ajuste comprometido con Bruselas, y su fuente dice lo contrario.

## 24/11/2026 · Senda de edad efectiva del Ageing Report, como opción

**Por qué.** El simulador congela hasta 2070 el perfil de edades de jubilación de 2026, con una media de 65,4 años. En cambio, el Ageing Report sube la edad de salida del empleo de 65,0 a 66,4 por la ley y las conductas. Esa diferencia explicaba parte del contraste de los pensionistas.

**Qué hay.** Un ajuste nuevo, `retirementAgeExitPath`: «La edad efectiva sigue la senda del Ageing Report». Está en el capítulo 2 y apagado por defecto.

Encendido, hace tres cosas (`src/current-cohorts-v10.js`):
- **Cada generación se jubila más tarde.** Recibe la subida de la senda en el año en que cumple 65. Se mueve su perfil de edades, sin redondear: la generación de 1980 sube 1,37 años, igual que la senda.
- **El empleo sigue siendo el del Ageing Report.** La referencia de empleo se construye con la misma senda, así que lo que cambia es que hay menos jubilados.
- **No es un retraso forzoso.** Nadie se queda sin empleo esperando por la senda.

**Efecto con las reglas de hoy:**
- se rompe en 2044, no en 2042;
- la deuda de 2070 es del 255 %, no del 277 %;
- hay un 12 % menos de jubilados en 2070;
- los cotizantes son los mismos;
- la pensión frente al salario de 2050 sube del 61,5 % al 63,4 %, por carreras más largas.

**Por qué es opción y no el defecto** (decisión del autor). Con la senda, el gasto medio en pensiones de 2022–2050 se aleja de la AIReF: 14,18 % frente a 14,60 %, cuando sin ella coincide (14,59 %). También queda más por debajo del Ageing Report. Antes de hacerla el defecto hay que entender por qué el simulador gasta menos que ellos con su misma edad.

**Comprobación.** Con el ajuste apagado, los resultados son bit a bit los de antes. Los hashes de identidad se reproducen quitando la clave y se regeneraron con ella. La metodología sigue en la 1.65.0 y el estado guardado no cambia.

**Otros cambios:**
- La sensibilidad incluye la senda.
- El supuesto «Edad de jubilación» ya no dice «Todos a los 65 años». Dice lo que hace el motor: el perfil observado de 2026, congelado.

Prueba nueva: `tests/retirement-exit-path.test.mjs`.

## 24/11/2026 · Por qué el simulador gasta menos que el Ageing Report con su misma edad

**Pregunta.** Con la senda de edad del Ageing Report encendida, el gasto en pensiones de 2050 es del 15,6 % del PIB y el del Ageing Report del 17,3 %. Además, el gasto medio de 2022–2050 se aleja del de la AIReF.

**Respuesta para el Ageing Report.** De 2026 a 2050, el gasto en jubilación crece ×1,30 en el simulador y ×1,37 en el Ageing Report. Las demás pensiones (viudedad e incapacidad) evolucionan igual en los dos. Se descompone en jubilados por cotizante × pensión frente al salario:
- **Jubilados.** Crecen igual en los dos: índice 163 en 2050.
- **Cotizantes.** En el simulador suben un 6 % y en el Ageing Report bajan un 7 %, una diferencia del 13 %. Tiene dos causas:
  - **Población.** EUROPOP2025, la del simulador, tiene un 11 % más de personas de 20 a 64 años en 2050 que la proyección del Ageing Report (EUROPOP2023): 28,8 frente a 25,9 millones.
  - **Tasa de empleo.** Las tasas por edad del Ageing Report, aplicadas a esa población más joven, dan una proporción de ocupados que sube más (×1,11 frente a ×1,06).
- **Pensión frente al salario.** Baja algo menos en el simulador (×0,84 frente a ×0,82) y compensa una parte en sentido contrario.

Más cotizantes significan más PIB por jubilado y menos gasto en % del PIB. No es un error: son ediciones distintas de la proyección de población. El Ageing Report de 2027, hecho ya con EUROPOP2025, lo dirá.

**AIReF: abierto.** Su Estudio 1/2026 cita EUROPOP2025, pero el proyecto no guarda su proyección demográfica ni su senda de edad. No se puede saber si su 14,6 % ya cuenta con esa población mayor. Sin la senda, el simulador coincide con la AIReF (14,59 %). Esa coincidencia podría deberse a que la edad congelada compensa los cotizantes de más, pero no está comprobado.

## 24/11/2026 · La AIReF: su población y su edad de jubilación

Cierra el punto que quedó abierto arriba. Fuentes guardadas en `data/sources/airef-2026/` (fuera de git por tamaño):
- `estudio-1-2026.pdf`: AIReF, Estudio 1/2026, 29/05/2026. SHA-256 a41ffe17…27787.
- `opinion-sostenibilidad-2025.pdf`: AIReF, Opinión sobre la sostenibilidad de las AA. PP. a largo plazo, 31/03/2025. SHA-256 2af1f49f…0ea1.

**Qué es cada cifra de la AIReF** (O, Estudio 1/2026, págs. 13–14):
- **14,6 %** es el gasto bruto medio de 2022–2050 con que la AIReF evalúa la regla. No es un cálculo propio. Es la senda del Ageing Report 2024 que le pasa la Seguridad Social: el gasto observado hasta 2025 y, desde 2026, los crecimientos del Ageing Report, hechos con EUROPOP2023. En 2050 da un 16,3 %.
- **14,5 %** es la media con los modelos propios de la AIReF y su propia proyección de población. En 2050 da un 16,4 %.
- **Con EUROPOP2025** en esos modelos, la media sigue en 14,5 % y 2050 queda en 16,3 %.

**Su edad de jubilación** (O, Opinión 2025, pág. 101; el Estudio 2026 mantiene «el retraso efectivo de la edad de jubilación» sin cifra nueva). La edad efectiva pasa de 65,2 años (2024) a 66,2 en 2050, un año más. Supone que un 30 % de las altas demoran la jubilación 3 años o hasta los 68. La senda del Ageing Report sube algo más: +1,37 años.

**Frente al simulador** (gasto bruto en pensiones, % del PIB):

| | Media 2022–2050 | 2050 |
|---|---|---|
| AIReF, sus modelos, con EUROPOP2025 y +1 año de edad | 14,5 | 16,3 |
| AIReF, para la regla (Ageing Report actualizado) | 14,6 | 16,3 |
| Simulador, edad congelada | 14,59 | 16,00 |
| Simulador, senda del Ageing Report (+1,37) | 14,18 | 15,59 |

**Lectura:**
- La AIReF, con la misma población que el simulador y una edad que sube un año, gasta más que el simulador con la edad congelada. Encender la senda agranda la diferencia: en 2050 pasa de 0,3 a 0,7 puntos.
- Así que la población mayor de EUROPOP2025 no explica toda la distancia con la AIReF. Su gasto en 2050 casi no cambia al pasar a EUROPOP2025 (16,4 → 16,3).
- La coincidencia de la media sin senda (14,59 frente a 14,6) se da con la cifra del Ageing Report actualizado, no con la propia de la AIReF. Es una compensación: la edad congelada sube el gasto y los cotizantes de más de EUROPOP2025 lo bajan.
- Una posible causa de lo que falta (S, sin medir): con la demora, la AIReF paga pensiones más altas, porque cada año de demora tiene premio. La senda del simulador retrasa la salida, pero no sube la pensión.

**Decisión que sostiene.** La senda sigue apagada por defecto. Con el material de la AIReF, encenderla aleja al simulador de las dos referencias.

## 24/11/2026 · Lo que pesa el premio por retrasar la jubilación

**Pregunta.** Con la senda de edad, ¿explica el premio por demora la distancia con la AIReF?

**Cómo lo hace hoy el motor.** Cada año trabajado suma 1/43 de la pensión de una carrera completa, un 2,3 %. Los años que añade la senda cuentan igual. La ley da un 4 % por cada año de demora pasada la edad legal (LGSS art. 210.2), y la AIReF lo modela.

**Experimento** (copia del motor fuera del proyecto; nada cambia en `src/`). Los años que añade la senda suman un 4 % en vez de 1/43. Es una cota alta, porque también premia a quien sale antes de la edad legal y la ley permite cobrar el premio de una vez.

Gasto bruto en pensiones, % del PIB:

| | Media 2022–2050 | 2050 | 2070 | Pensión/salario 2050 | Deuda 2070 |
|---|---|---|---|---|---|
| Edad congelada | 14,59 | 16,00 | 15,56 | 61,5 % | 277 % |
| Senda, 1/43 por año (motor actual) | 14,18 | 15,59 | 15,27 | 63,3 % | 255 % |
| Senda, 4 % por año (premio de la ley) | 14,26 | 15,82 | 15,57 | 64,5 % | 264 % |
| AIReF, sus modelos con EUROPOP2025 | 14,5 | 16,3 | | | |

Con la edad congelada, el resultado del experimento es idéntico al del motor (control).

**Lectura:**
- **El premio pesa.** Con la senda, devuelve más de la mitad del gasto que la senda quitaba en 2050 (0,23 de 0,41 puntos), y todo el de 2070. La deuda de 2070 sube 9 puntos.
- **No cierra la distancia con la AIReF.** Con la senda y el premio, el simulador sigue 0,5 puntos por debajo en 2050. Con la edad congelada ya estaba 0,3 por debajo. Esa parte no viene de la edad ni del premio, y queda por buscar.
- **Lo más fiel a la ley** sería la senda con premio. Si un día se enciende la senda, debería ir con él.

**Decisión pendiente del autor:** si se añade el premio al motor como parte de la senda. Con la senda apagada no cambiaría nada.

## 24/11/2026 · La senda de edad lleva el premio por demora

**Decisión del autor:** añadir al motor el premio por demora, como parte de la senda.

**Regla.** Con `retirementAgeExitPath` = 1, un año que añade la senda y que cae en la edad legal o después suma el 4 % de una pensión de carrera completa (LGSS art. 210.2), en vez del 1/43 de un año corriente (`paygAccrualYears` en `src/current-cohorts-v10.js`).
- **Más fiel a la ley que el experimento.** Solo cuentan los años desde la edad legal: la de una célula de perfil 65, movida por los ajustes de edad. Un año que la senda añade antes de la edad legal es corriente.
- **Simplificaciones (S).** El 4 % se aplica a la pensión de carrera completa y no a la propia. Se ignora el cobro del premio de una vez.

**Resultado con la senda** (antes → ahora):

| Medida | Antes | Ahora |
|---|---|---|
| Gasto medio 2022–2050 | 14,18 % | 14,24 % |
| Gasto en 2050 | 15,59 % | 15,76 % |
| Gasto en 2070 | 15,27 % | 15,50 % |
| Pensión frente al salario en 2050 | 63,3 % | 64,2 % |
| Deuda en 2070 | 255 % | 261 % |

Sigue rompiéndose en 2044.

**Comprobación.** Con la senda apagada, el resultado es el mismo bit a bit: los hashes de identidad no cambian. La metodología sigue en la 1.65.0 y el estado guardado no cambia. Solo cambia lo que da un escenario con la senda encendida.

**Corrección.** Arriba y en `docs/modelo/01` se decía que con la senda hay «un 12 % menos de jubilados en 2070». Medido, es un 6 % (13,0 frente a 13,9 millones). El premio no cambia ese número.

**Referencias del modelo.** Al moverse las líneas se corrigieron las de `docs/modelo/01` y `03`. Algunas (`initialCohorts`, `entrantCohorts`, la nota de natalidad) ya estaban desplazadas desde la entrada de la senda.

## 24/11/2026 · La diferencia con la AIReF es la productividad

**Pregunta.** Con la edad congelada, el simulador gasta en 2050 un 16,00 % del PIB y la AIReF un 16,3 %. ¿De dónde sale la diferencia? ¿Podrían estar mal las cifras de la AIReF?

**Respuesta.** De la productividad. El simulador usa la del Ageing Report 2024: 1,34 % al año por hora de 2026 a 2050, y el salario real crece un 1,38 % al año. La AIReF supone menos:
- **Opinión 2025** (pág. 59–60): 1,1 puntos de productividad por hora de media en 2025–2050, y el salario real sigue a esa productividad (O).
- **Estudio 1/2026** (gráfico 15): la productividad aporta 1,0 punto al crecimiento potencial del 1,5 % de 2022–2050 (O).

Con salarios que crecen menos y pensiones revalorizadas con el IPC, la pensión pesa más frente al salario y frente al PIB. Que coincidieran las medias con la edad congelada era una compensación de dos diferencias de signo contrario:
- la edad congelada sube el gasto, porque la AIReF retrasa la edad un año;
- la productividad del Ageing Report lo baja.

**Medición** (gasto bruto en pensiones, % del PIB; productividad y salario real movidos juntos, como en la consola):

| Escenario | Media 2022–2050 | 2050 | Salario real, %/año | Pensión/salario 2026→2050 |
|---|---|---|---|---|
| Edad congelada, productividad del AR | 14,59 | 16,00 | 1,38 | 75,0 → 61,5 (×0,82) |
| Edad congelada, −0,2 puntos | 14,75 | 16,30 | 1,18 | 75,0 → 62,9 |
| Senda con premio, productividad del AR | 14,24 | 15,76 | 1,38 | 75,0 → 64,2 |
| Senda con premio, −0,3 puntos | 14,46 | 16,19 | 1,08 | 75,0 → 66,4 (×0,885) |
| Senda con premio, −0,35 puntos | 14,50 | 16,26 | 1,03 | 75,0 → 66,8 |
| **AIReF**, sus modelos con EUROPOP2025 | **14,5** | **16,3** | ≈ 1,0–1,1 | 68,4 → 60,2 (×0,880) |

Con la edad y la productividad de la AIReF, el simulador da su media y su cifra de 2050 a la vez. También da la misma caída de la pensión frente al salario (×0,885 frente a ×0,880). El nivel de esa ratio no es comparable: la AIReF cuenta todas las pensiones contributivas, viudedad incluida, y el simulador solo las de jubilación. Si la senda subiera la edad lo mismo que la AIReF (+1 año, no +1,37), bastaría con unos −0,3 puntos.

**¿Está mal la AIReF?** No se ha encontrado nada. Sus cifras cuadran entre sí:
- **Pensiones:** suben ×1,50 (de 11,6 a 17,4 millones, gráfico 6).
- **Pensión frente al salario:** baja ×0,880 (gráfico 7).
- **Gasto:** pasa del 13,0 % al 16,4 % del PIB (×1,262).

Para que esas tres cifras encajen, el PIB por salario medio tiene que crecer un 4,6 %, es decir, unos ocupados un 4,6 % más. Es coherente con su población y su empleo. En el simulador suben un 6,0 % con EUROPOP2025.

**Lectura.** El simulador no está mal ni la AIReF tampoco: difieren en un supuesto, la productividad. Es de los que más pesan, y la AIReF lo llama «exigente» para España. La consola ya lo deja mover («Productividad»). Lo que cambia es la lectura del contraste: coincidir con la AIReF con la edad congelada no validaba la edad congelada.

## 24/11/2026 · Perfiles «Supuestos de otros»: la AIReF sí, el Ageing Report todavía no

**Qué es.** En la consola, el desplegable «Guardados» tiene un grupo nuevo, «Supuestos de otros». Abrir un perfil pone la configuración de partida con las palancas de esa institución. Se puede deshacer, y no se puede borrar. Al abrirlo, la consola dice qué cambia y que es una aproximación: reproduce su gasto en pensiones, no su deuda ni sus ingresos, ni es su previsión (`src/domain/reference-profiles.js`).

**Supuestos de la AIReF (Estudio 1/2026):**
- **Palancas:** senda de edad del Ageing Report con premio por demora, y productividad y salarios a −0,35 puntos al año.
- **Resultado:** gasto medio 2022–2050 del 14,50 % y 16,26 % en 2050, frente al 14,5 % y el 16,3 % publicados.
- **Prueba:** `tests/reference-profiles.test.mjs` exige que siga a 0,1 puntos o menos de los dos.
- **Cambio en la palanca:** «Productividad y salarios» va ahora de 0,05 en 0,05 puntos (antes, de 0,25 en 0,25), para que el perfil se vea tal cual.

**Supuestos del Ageing Report: no se añade.** Su población es EUROPOP2023 y la del simulador EUROPOP2025, sin palanca para cambiarla. El intento fue aproximarla bajando las nuevas incorporaciones al empleo, con la senda encendida, y no reproduce su senda. Comparado con el Ageing Report actualizado (sus crecimientos sobre el gasto observado de 2025: 2040 15,3; 2050 16,3; 2070 15,8):

| Calibrado a | Incorporaciones | Media 2022–2050 | 2040 | 2050 | 2070 |
|---|---|---|---|---|---|
| Sus cotizantes de 2070 (−12 %) | −0,63 %/año | 14,41 | 14,75 | 16,34 | 17,24 |
| Sus cotizantes de 2050 (−7 %) | −1,89 %/año | 14,74 | 15,11 | 17,51 | 21,24 |

La palanca solo toca a quienes entran a trabajar desde 2027, así que su efecto crece con los años. No puede dar la estructura por edades de otra proyección. Para tener este perfil haría falta poder elegir la población: EUROPOP2023 o EUROPOP2025.

## 24/11/2026 · La población del Ageing Report, como opción

**Qué es.** Nuevo ajuste `europop2023` («Población del Ageing Report (EUROPOP2023)», pestaña «El mundo»), apagado por defecto.
- **Encendido:** toda la demografía es EUROPOP2023 (población, migración y mortalidad), y las filas del Ageing Report se usan tal cual, sin rebase.
- **Modelo aparte:** el motor construye uno para esta población, una sola vez.
- **Límite:** no hay horizonte largo, porque EUROPOP2023 acaba en 2071.
- **Dónde aparece también:** en la sensibilidad (cambiar de población) y en el supuesto «Población y empleo».

**Comprobación.**
- **Apagado, nada cambia:** sin la clave, los hashes de identidad se reproducen exactos; el archivo de hashes se regeneró con ella.
- **Metodología y estado:** la metodología sigue en la 1.65.0 y el estado guardado no cambia.
- **Encendido, el empleo es el del Ageing Report:** los ocupados de 2050 quedan en el 98,0 % de 2026, y el crecimiento del PIB coincide año a año.
- **Prueba nueva:** `tests/population-edition.test.mjs`.

**Gasto bruto en pensiones**, % del PIB, frente al Ageing Report actualizado (sus crecimientos sobre el gasto observado de 2025, como la regla):

| Escenario | Media 2022–2050 | 2030 | 2040 | 2050 | 2060 | 2070 |
|---|---|---|---|---|---|---|
| Ageing Report actualizado | 14,62 | 13,55 | 15,33 | 16,34 | 15,94 | 15,80 |
| EUROPOP2023, edad congelada | 15,14 | 14,08 | 15,97 | 17,17 | 16,60 | 16,20 |
| EUROPOP2023 + senda con premio (motor actual) | 14,72 | 13,83 | 15,20 | 16,87 | 16,64 | 16,18 |
| EUROPOP2023 + senda, años añadidos al 1/43 | 14,66 | 13,82 | 15,11 | 16,68 | 16,41 | 15,95 |
| EUROPOP2023 + senda, años añadidos sin pensión extra | 14,53 | 13,79 | 14,94 | 16,34 | 16,00 | 15,52 |

Las dos últimas filas salen de una copia del motor fuera del proyecto.

**Hallazgo: doble cuenta de la senda frente al Ageing Report.** Con su población, su empleo y su PIB, el motor solo da el gasto del Ageing Report en 2050 y 2060 si los años que añade la senda no suben la pensión. La razón es que la tasa de sustitución de las altas del Ageing Report (de 77 % a 64,6 % en 2050), que el motor usa para la primera pensión, ya es la de su propia edad de salida. Sumarle los años de más, y el premio, cuenta dos veces el efecto de jubilarse más tarde.
- **Pensión frente al salario en 2050:** 64,7 % con premio y 62,2 % sin pensión extra.
- **En el Ageing Report:** su ratio de prestación baja ×0,815 de 2026 a 2050.

**Lo contrario con la edad congelada (sin medir):** el motor da la tasa del Ageing Report a quien se jubila antes que en el Ageing Report, con carreras más cortas, y así sobrestima algo la pensión. Ese es el defecto de siempre; cambiarlo movería todos los resultados y pediría nueva metodología.

**Pendiente de decisión del autor:** cómo cuentan los años que añade la senda (premio, 1/43 o nada). De eso depende el perfil «Supuestos del Ageing Report», que aún no se añade. También el de la AIReF, calibrado con premio, si cambia la regla.

## 24/11/2026 · Cómo cuentan los años de la senda, a elegir; perfil del Ageing Report

**Decisión del autor:** que se pueda elegir en cada perfil.

**Ajuste nuevo.** `exitPathNoExtraPension`, «Con la senda, los años de más no suben la pensión» (pestaña «Las pensiones»), apagado por defecto.
- **Apagado (como antes):** los años que añade la senda llevan el premio por demora desde la edad legal. Es la ley, como la modela la AIReF.
- **Encendido:** no suman pensión. Es la lectura del Ageing Report, cuya pensión de entrada ya cuenta con su edad.
- **Sin la senda:** no hace nada.
- **Comprobación:** sin la clave, los hashes de identidad se reproducen exactos; el archivo de hashes se regeneró con ella.

**Perfil «Supuestos del Ageing Report 2024»** (en «Guardados» → «Supuestos de otros»): población EUROPOP2023, senda de edad y años de más sin pensión extra. Productividad y empleo son los del Ageing Report, que ya son los de partida.

| Gasto bruto, % del PIB | Media 2022–2050 | 2030 | 2040 | 2050 | 2060 | 2070 |
|---|---|---|---|---|---|---|
| Perfil | 14,53 | 13,79 | 14,94 | 16,34 | 16,00 | 15,52 |
| Ageing Report actualizado | 14,62 | 13,55 | 15,33 | 16,34 | 15,94 | 15,80 |

- **Lo que coincide:** 2050 y 2060.
- **Lo que no:** el perfil va 0,2 puntos por encima en 2030 y 0,4 por debajo en 2040.
- **Por qué:** el perfil parte de 2026 con el gasto y los pensionistas observados, y el Ageing Report de su base de 2022.
- **Prueba:** `tests/reference-profiles.test.mjs` lo mantiene a 0,1 puntos o menos de 14,6 y 16,3, las cifras que publica la AIReF para la regla.

El perfil de la AIReF no cambia: sigue con premio.

## 24/11/2026 · «Subida anual de las pensiones»: puntos frente al IPC de verdad

**Fallo.** El ajuste dice «puntos frente a los precios», pero escribía una subida nominal fija: 2 % más el valor (modo 'manual'). Con la inflación de partida (2 %) daba igual. Con otra inflación, no: con un 3 % y −1, las pensiones perdían 2 puntos al año, no 1.

**Corrección.** Nuevo modo `'cpi-points'`: la subida es el IPC del año anterior (con su suelo de 0) más los puntos del ajuste, sea cual sea la inflación (`src/current-policy-v2.js`). Es lo que escribe la consola desde ahora.
- **Escenarios antiguos:** el modo 'manual' sigue existiendo, así que un escenario guardado con él da lo mismo que antes. La consola lo muestra frente a la inflación de ese escenario, y al tocar la casilla pasa a puntos.
- **Etiqueta del escenario:** también mide frente a la inflación del escenario, no frente al 2 %.

**Comprobación.**
- **Por defecto no cambia nada:** el modo por defecto sigue siendo 'cpi' y los hashes de identidad no cambian.
- **Prueba nueva:** en `tests/current-policy-choice-v2.test.js`, con −1 punto, la pensión pierde exactamente un punto al año frente a los precios con inflación del 2 %, 3 % o 5 %.
- **Consola:** −1 se guarda como 'cpi-points' −0,01.

## 24/11/2026 · Cuánto sobrestima la edad congelada

**Pregunta.** La primera pensión es la tasa de sustitución de las altas del Ageing Report, que ya cuenta con su edad de salida, cada vez más alta. Con la edad congelada (el defecto), el motor da esa tasa a quien se jubila hasta 1,37 años antes, con una carrera más corta. ¿Cuánto pesa?

**Medición** (copia del motor fuera del proyecto; nada cambia en `src/`). Para las generaciones que alcanza la senda, la pensión baja por los años que no trabajan frente al Ageing Report, de dos formas. Es una cota baja: solo toca lo que se devenga desde 2027, no el derecho anterior.

| Edad congelada | Media 2022–2050 | 2040 | 2050 | 2070 | Pensión/salario 2050 | Deuda 2070 | Se rompe |
|---|---|---|---|---|---|---|---|
| Como hoy | 14,59 | 15,23 | 16,00 | 15,56 | 61,5 % | 277 % | 2042 |
| −1/43 por año no trabajado | 14,57 | 15,20 | 15,90 | 15,30 | 61,0 % | 273 % | 2042 |
| −4 % por año (el premio, al revés) | 14,55 | 15,17 | 15,83 | 15,09 | 60,7 % | 269 % | 2042 |

**Lectura.** El efecto es pequeño hasta 2050 (0,1–0,2 puntos) y crece después (0,3–0,5 puntos en 2070). La deuda de 2070 baja de 4 a 8 puntos y el año en que se rompe no cambia.

**Propuesta.** No cambiar la metodología ahora por esto solo. Merece entrar en la próxima versión de la metodología, junto con lo que se acumule. Hasta entonces, queda como sesgo declarado: con la edad congelada, el gasto de 2070 puede estar sobrestimado en torno a 0,3–0,5 puntos.

## 24/11/2026 · Los perfiles en el contraste y en los gráficos

- **Contraste** (`scripts/contrast-external.mjs`, apartado 2; página de metodología, «El mismo escenario con los supuestos del Ageing Report»): ya no ajusta las nuevas incorporaciones al empleo para imitar sus cotizantes. Usa el perfil «Supuestos del Ageing Report 2024» y lo pone junto al Ageing Report publicado y al actualizado como la regla. El resto del contraste no cambia.
  - **Resultado:** 16,3 % en 2050, como el actualizado, con los ocupados de 2070 en el mismo 92,4 (2026 = 100).
- **Gráficos:** los dos perfiles aparecen junto a los escenarios guardados y se añaden a un gráfico marcándolos. Se calculan una vez por visita, porque no dependen del escenario abierto.

## 24/11/2026 · La sensibilidad «edad constante» del Ageing Report, con la senda

**Cambio.** En el contraste (apartado 3, página de metodología), la fila del Ageing Report «Constant retirement age» (ESb:38) ya no se compara subiendo `retirementAge` uno o dos años, que es otra pregunta y con el signo contrario. Ahora se compara con el mismo interruptor: senda de edad apagada frente a encendida, con los años de más sin pensión extra, como en el Ageing Report. Se mide de dos formas: con la población del simulador y con el perfil del Ageing Report.

Cambio del gasto en pensiones, puntos de PIB:

| | 2040 | 2050 | 2070 |
|---|---|---|---|
| Ageing Report: edad constante frente a su línea base | 2,89 | 2,57 | 2,13 |
| Simulador: senda apagada frente a encendida (EUROPOP2025) | 0,90 | 0,74 | 0,71 |
| Lo mismo con el perfil del Ageing Report (EUROPOP2023) | 1,03 | 0,83 | 0,68 |

**Lectura: el simulador recoge un tercio del efecto del Ageing Report.**
- **El canal que falta, casi seguro:** en el simulador, el empleo es el del Ageing Report sea cual sea la edad. Apagar la senda deja los mismos ocupados y el mismo PIB, y solo cambia cuántos cobran. En el escenario del Ageing Report, jubilarse antes también quita ocupados mayores, y con ellos PIB, lo que sube la ratio de gasto.
- **Sin medir:** cuánto del resto se explica así.
- **Consecuencia:** con la senda apagada (el defecto), el simulador puede quedarse corto en lo que cuesta no retrasar la jubilación.

**Comprobación.** El resto del contraste no cambia; las demás sensibilidades se miden frente al escenario base, como antes.

## 24/11/2026 · Por qué el simulador recoge solo parte de la «edad constante»: el empleo, y una incoherencia del defecto

**Dos correcciones de la comparación** (anexo del Ageing Report, hoja ESa, fila 55, y hoja ESb, filas 34 y 38, O):
- **El año de referencia.** El escenario «Constant retirement age» del Ageing Report fija la edad de salida en la de 2022 (64,0), y su línea base la sube 2,4 años hasta 2040 (66,4). La senda del simulador solo añade los 1,37 posteriores a 2026: lo de 2022–2026 ya está en el perfil observado. Se corrige la etiqueta del contraste, que decía «1,4 años».
- **El canal del empleo.** El propio Ageing Report lo publica aparte: 10 puntos más de empleo de los trabajadores mayores bajan el gasto 1,45 puntos de PIB en 2050 (ESb:34).

**Medición** (copia del motor fuera del proyecto). En el motor, con la senda apagada, las entradas de jóvenes se ajustan para que el empleo total siga siendo el del Ageing Report, aunque la gente se jubile antes. El «empleo coherente» usa las entradas de la senda, de modo que jubilarse antes quita ocupados mayores. Gasto en pensiones, % del PIB, y diferencia con la senda encendida (sin pensión extra):

| | 2030 | 2040 | 2050 | 2070 | Ocupados 2040 | Deuda 2070 | Se rompe |
|---|---|---|---|---|---|---|---|
| EUROPOP2025, senda encendida | 13,59 | 14,32 | 15,27 | 14,85 | 24,2 M | 244 % | 2045 |
| EUROPOP2025, senda apagada, empleo fijo (**el defecto**) | 13,87 (+0,28) | 15,23 (+0,90) | 16,00 (+0,74) | 15,56 (+0,71) | 24,2 M | 277 % | 2042 |
| EUROPOP2025, senda apagada, empleo coherente | 13,96 (+0,37) | 15,60 (+1,27) | 16,37 (+1,11) | 15,30 (+0,45) | 23,5 M | 290 % | 2040 |
| Perfil del Ageing Report (EUROPOP2023), senda encendida | 13,79 | 14,94 | 16,34 | 15,52 | 23,0 M | 293 % | 2042 |
| Lo mismo, senda apagada, empleo fijo | 14,08 (+0,29) | 15,97 (+1,03) | 17,17 (+0,83) | 16,20 (+0,68) | 23,0 M | 327 % | 2040 |
| Lo mismo, senda apagada, empleo coherente | 14,19 (+0,40) | 16,48 (+1,54) | 17,70 (+1,36) | 15,96 (+0,43) | 22,2 M | 339 % | 2039 |

**Lectura:**
- **Con empleo coherente, el efecto crece a la mitad más.** Escalado a los 2,4 años del Ageing Report (×1,75), el perfil da 2,7 puntos en 2040 y 2,4 en 2050, frente a sus 2,89 y 2,57. La diferencia que quedaba era el empleo y el año de referencia. En 2070 el simulador sigue por debajo (0,8 frente a 2,1), sin explicar.
- **El defecto mezcla dos supuestos.** Las jubilaciones siguen las edades de 2026, congeladas. Los ocupados son los del Ageing Report, que cuenta con jubilaciones cada vez más tardías: el motor rellena con más entradas de jóvenes. Si la gente sigue jubilándose a las edades de 2026, habría un 3 % menos de ocupados en 2040, el gasto de 2050 sería 0,37 puntos mayor, la deuda de 2070 13 puntos mayor y se rompería en 2040, no en 2042.
- **Sesgo opuesto, más pequeño:** la sobrestimación de la pensión con la edad congelada (entrada anterior, 0,1–0,2 puntos en 2050). En neto, el defecto se queda corto.

**Decisión pendiente del autor**, porque mueve los resultados por defecto y pide nueva metodología:
- **(a) Edad congelada coherente:** quien se jubila antes deja de trabajar, sin relleno.
- **(b) Senda encendida por defecto:** la edad del Ageing Report y la AIReF, coherente con su empleo y su pensión de entrada.
- **(c) Dejarlo como está**, declarado como sesgo.

## 24/11/2026 · Metodología 1.66.0: edad congelada con empleo coherente

**Decisión del autor:** «Edad congelada coherente». Se mantiene que, por defecto, la gente se sigue jubilando a las edades de 2026, pero se quita el relleno de empleo.

**Regla nueva** (`src/current-cohorts-v10.js`, `buildReferenceEntrants`, `frozenEntrants`, `entrantCohorts`). Las entradas al empleo se fijan una sola vez, con la senda del Ageing Report: son las personas, por edad y sexo, que dan su empleo si la gente se jubila tan tarde como él prevé.
- **Con la senda encendida:** se usan tal cual. Los resultados son los mismos bit a bit que en la 1.65, comprobado con la senda y con los dos perfiles.
- **Con la senda apagada (el defecto):** entran las mismas personas, repartidas con las edades de jubilación de 2026. Quien se jubila antes deja de trabajar y nadie lo sustituye.
- **Antes:** había unas entradas propias de la edad congelada, con más jóvenes para llegar al empleo del Ageing Report.

**Con las reglas de hoy** (1.65 → 1.66):

| | 1.65 | 1.66 |
|---|---|---|
| Ocupados 2040 | 24,2 M | 23,5 M |
| Gasto medio 2022–2050 | 14,59 % | 14,84 % |
| Gasto 2050 | 16,00 % | 16,42 % |
| Gasto 2070 | 15,56 % | 15,89 % |
| Deuda 2070 | 277 % | 299 % |
| Se rompe | 2042 | 2040 |
| Pensión frente al salario 2050 | 61,5 % | 61,5 % |

- **El freno de 2023:** la media bruta pasa a 14,84 % y la neta a 13,24 %, aún bajo el tope de 13,3 %, así que no hay recargo por defecto.
- **Frente a la AIReF:** el simulador gasta ahora algo más (14,84 frente a 14,6 de media). Su edad sube un año y la del simulador no.

**Versiones y archivos cambiados:**
- **Versiones:** metodología `common-fund-1.66.0` y aplicación 1.66.0. El estado guardado no cambia, porque no hay claves nuevas.
- **Referencias de las pruebas:** `tests/fixtures/engine-reference-1.66.0.json` sustituye a la de la 1.65.0 (las cifras de pensiones_lab_2 1.64.0, que siguen en git), y los hashes de identidad se regeneraron.
- **Pruebas con años del defecto:** round-13 (riesgo alto sostenido desde 2040, rescate 2041, quita 2044; cuentas nocionales, 2042) y el recargo del caso de presión (≈ 0,0057).
- **Textos:** el contraste externo se regeneró. Se actualizaron los supuestos «Edad de jubilación», «Población y empleo» e «Impuestos sin modelo propio» (299 → 245 %; 301 → 234 %; 3,9 % del PIB en 2070), y el modelo 1.10.

## 24/11/2026 · La deuda frente a la AIReF: es el saldo primario

**Pregunta.** La AIReF da una deuda del 123 % del PIB en 2050 (Estudio 1/2026, gráfico 2 y págs. 70–71; escenario a políticas constantes, sin reglas fiscales). El simulador 1.66, con las reglas de hoy, da un 152,6 %. ¿De dónde salen esos 30 puntos?

**Cifras de la AIReF** (O, Estudio 1/2026):
- **Deuda:** 101 % (2025) → 95 (2030) → 94 (2035) → 99 (2040) → 123 (2050).
- **Saldo primario:** 0,0 % (2025) → −2,1 % (2050); saldo total, −2,4 → −6,5.
- **Intereses:** 2,4 → 4,4 % del PIB; tipo implícito, 2,7 → 3,8 %.
- **Recursos:** 42,1 → 43,3 (2030) → 45,0 % (2050). El IRPF aporta +1,3 puntos, Sociedades +0,3 y las cotizaciones +0,4; la imposición indirecta, −0,1.
- **Empleos:** 44,5 → 45,7 (2030) → 51,6 % (2050). Hasta 2030 siguen la senda del Plan Fiscal y Estructural (PFEMP).

**Simulador 1.66**, reglas de hoy (% del PIB):

| | 2026 | 2030 | 2040 | 2050 |
|---|---|---|---|---|
| Deuda | 97,8 | 96,9 | 114,4 | 152,6 |
| Ingresos | 42,9 | 43,2 | 43,6 | 43,7 |
| Gastos | 45,3 | 46,8 | 50,3 | 53,5 |
| Intereses | 2,4 | 2,8 | 3,9 | 5,7 |
| Saldo primario | 0,0 | −0,8 | −2,8 | −4,1 |
| Pensiones | 13,0 | 14,0 | 15,6 | 16,4 |

**Identidad de la deuda** (crecimiento nominal e intereses del simulador; se cambia solo el saldo primario):

| Saldo primario | 2030 | 2040 | 2050 |
|---|---|---|---|
| El del simulador | 97 | 114 | 153 |
| El de la AIReF, lineal de 0 a −2,1 | 96 | 104 | **123** |
| El de la AIReF con superávit hacia 2030 | 94 | 95 | 111 |

Con el saldo primario de la AIReF, las cuentas del simulador dan su 123 %. El crecimiento y los intereses del simulador son compatibles con los suyos: la diferencia es toda del saldo primario, unos 2 puntos de PIB en 2050.

**De dónde sale el saldo primario:**
- **Pensiones:** iguales (16,4 % en 2050 los dos).
- **Ingresos, unos −1,2 puntos en 2050.** El IRPF sube igual que en la AIReF (+1,3 puntos de 2030 a 2050, por la progresividad), así que no es eso.
  - Los impuestos sin modelo propio, fijos en euros de 2026, pierden 0,8 puntos (de 5,2 a 4,4 %).
  - Sociedades se queda en el 3,1 % (la AIReF, +0,3).
  - Las cotizaciones apenas suben (la AIReF, +0,4).
- **Gasto primario sin pensiones, ≈ +0,6 a +0,9 puntos.** Sobre todo desde el principio: en 2030 el simulador gasta 0,9 puntos más (44,0 frente a unos 43,1). La AIReF aplica hasta 2030 la senda de gasto del plan fiscal acordado con Bruselas; el simulador mantiene las políticas de hoy.

**Lectura.** No hay error en ninguno de los dos. El simulador es más pesimista por tres supuestos:
- impuestos sin modelo propio fijos en euros (ya se puede elegir que sigan al PIB: la deuda de 2070 pasa del 299 % al 245 %);
- ni Sociedades ni cotizaciones suben su peso;
- no se aplica el ajuste de gasto del plan fiscal hasta 2030.

Ninguno se cambia sin decisión del autor.

**Añadido al contraste** (24/11/2026). La comparación de deuda con la AIReF está ahora en `scripts/contrast-external.mjs` (apartado 5b, `airefDebt` en `data/external-contrast.json`) y en la página de metodología, en «AIReF: la deuda a largo plazo». Muestra sus cifras publicadas junto a las del simulador y la identidad con su saldo primario: 123,9 % en 2050, frente a su 123 %.

## 24/11/2026 · Los coeficientes de la regla de reparto, en Supuestos

Los coeficientes 0,14 / 0,11 / 0,08 / 0,06 / 0,52 (`src/shared/budget-share-rule.js`) ya estaban declarados como supuesto en el código y aquí (22/11), pero no en la lista de Supuestos de la página de metodología. Se añade la entrada «Parte de una medida fiscal que va a pensiones» (grupo Presupuesto, tipo S, sin fuente conocida), enlazada a los ajustes de los recargos y a «Parte de los demás ingresos que va a pensiones».

**Comprobado:** solo mueven el reparto de la cuenta, no la deuda ni el veredicto. Subir 3 puntos la parte de pensiones deja la deuda de 2070 en el mismo 298,5 % y baja lo que falta para pensiones en 2050 del 3,6 % al 2,6 % del PIB.

## 24/11/2026 · Las cotizaciones frente a la AIReF: las bases máximas aportan la mitad

**Pregunta.** La AIReF da +0,4 puntos de PIB de cotizaciones entre 2030 y 2050, «influidas por las medidas adoptadas» (Estudio 1/2026, pág. 62). En el simulador, con las reglas de hoy, suben +0,06. ¿Por qué?

**Primero, una pista falsa.** Con 0,35 puntos menos de productividad y la edad congelada, las cotizaciones suben +0,36, como en la AIReF. No es por las medidas, sino por el freno de 2023: con ese gasto se pasa del tope y entra el recargo del MEI (0,87 puntos en 2050). Sin el freno, son +0,11.

**Lo que modela el motor:**
- **MEI:** fijo desde 2029, así que no explica nada después de 2030.
- **Bases máximas:** +1,2 puntos sobre la revalorización hasta 2050 (`data/pension-policy-2026.js`).
- **Cuota de solidaridad:** sube hasta 2045.
- **Cómo:** las dos últimas actúan sobre la distribución de salarios por centiles de 2024 (`salaryBaseMasses`, `src/current-policy-v5.js`).

**Medición** (copia del motor fuera del proyecto; freno apagado; cada medida apagada de una en una). Cotizaciones, % del PIB:

| | 2030 | 2040 | 2050 | Media 2026–2050 | Aporte medio |
|---|---|---|---|---|---|
| Con las dos medidas | 9,21 | 9,28 | 9,27 | 9,27 | |
| Sin la subida de las bases máximas | 9,16 | 9,13 | 8,98 | 9,14 | **0,135** (AIReF: 0,3) |
| Sin la subida de la cuota de solidaridad | 9,18 | 9,17 | 9,10 | 9,18 | **0,09** (AIReF: 0,1) |

Con la productividad de la AIReF los aportes casi no cambian (0,12 y 0,08). La AIReF da medias de 2022–2050 (cuadro 1), que pesan años tempranos con poco efecto, así que su cifra comparable desde 2026 sería algo mayor.

**Lectura.**
- **La solidaridad cuadra.**
- **Las bases máximas aportan en el simulador la mitad que en la AIReF.**
  - **Causa probable, sin comprobar:** el motor usa la media de cada centil de salarios y no la dispersión dentro de cada uno. En el centil más alto, donde está casi todo lo que supera la base máxima, eso puede quedarse corto.
  - **Peso:** de las 0,4 décimas de la AIReF, unas 0,15–0,2 serían de aquí. Es una parte de los 1,2 puntos de ingresos que separan la deuda de 2050 (`docs/DECISIONES.md`, «La deuda frente a la AIReF»).

**Propuesta, sin hacer:** revisar la cola alta de la distribución de salarios (centil 100 de la AEAT o MCVL) antes de tocar nada. Cambiarla movería todos los resultados y pediría nueva metodología.

## 24/11/2026 · Revisión de la cola alta de salarios: la hipótesis no se sostiene

**Lo que se revisó.** La distribución de salarios del motor es el módulo de salarios de la AEAT de 2024: 100 centiles, 14,19 millones de asalariados, salario anualizado a 360 días. La fuente y su SHA-256 están en `pensiones_lab_2/data/contribution-bases-v5-research.json`.
- **Base máxima de 2026:** 61.214 € al año. La superan 8 centiles, con un 7,2 % de la masa salarial.
- **Lo que vale usar medias:** para los centiles que quedan enteros por encima o por debajo de la base máxima, la media da la cuenta exacta, porque lo que se cotiza crece en línea recta con el salario. Solo hay error en el centil que la base atraviesa, y es pequeño.
- **Conclusión:** la dispersión dentro del centil más alto no cambia nada, porque está entero por encima. La causa propuesta en la nota anterior no es.

**La comparación era la que fallaba.** La AIReF dice que la subida de las bases máximas «ha incrementado la recaudación hasta el momento en dos décimas de PIB» y que en promedio de 2022–2050 serán tres (Estudio 1/2026, pág. 19). Esas dos décimas ya están en las cotizaciones observadas de 2026, el punto de partida del simulador. La medición del simulador solo apaga lo que viene después de 2026. Comparado igual con igual, su aporte (0,29 puntos en 2050 sobre lo de 2026) es coherente con el de la AIReF. La solidaridad también: su perfil crece hasta algo más de una décima en 2045.

**Lo que sí falta: la reforma de los autónomos (RETA).**
- **En la AIReF:** cotizar por rendimientos reales aporta tres décimas de PIB de media en 2022–2050, con el efecto pleno desde 2032 (págs. 20–21). Además, la base máxima pasa a afectarles a ellos también.
- **En el simulador:** las bases del RETA siguen a los salarios (`selfEmployedBaseMode` = 'payroll-proxy', `src/current-policy-v6.js`), sin el despliegue de la reforma.
- **Peso:** probablemente una parte de las 0,4 décimas que las cotizaciones ganan en la AIReF de 2030 a 2050.
- **Lo que no se sabe:** qué parte ya está en 2026.

**Propuesta, sin hacer:** buscar cuánto de la reforma del RETA queda por desplegar desde 2026 (regularizaciones de 2023 y 2024, calendario de tramos hasta 2032) antes de modelarla. Corrige la nota anterior: la cola alta de salarios no es la causa.

## 24/11/2026 · La reforma de los autónomos (RETA): lo que queda por desplegar

**Lo que dice la AIReF** (O, Estudio 1/2026, págs. 20–21). Los ingresos de cotizar por rendimientos reales llegan en tres momentos:
1. **2024:** unos 300 M€ más que con la estructura de bases de 2022, permanentes.
2. **2026:** los autónomos societarios y familiares cotizan por la base mínima del régimen general (1.424 €) en vez de la transitoria de 1.000 €. Casi una décima de PIB, permanente.
3. **2032:** cotizar por los rendimientos, con base mínima y máxima. Cinco décimas de PIB desde 2032, *incluidas las dos anteriores*; tres décimas de media en 2022–2050.

**Lo que no está decidido** (prensa de oct. 2025–oct. 2026, sin norma en el BOE para 2027–2031):
- La ley solo fija que desde 2032 se cotiza por rendimientos reales. El periodo transitorio de 2027 a 2031 está por concretar, como dice la propia AIReF.
- La propuesta del Ministerio de octubre de 2025 subía las cuotas en 2026–2028 y después de forma lineal hasta 2031; el Gobierno la retiró en parte.
- Un análisis de BBVA (octubre de 2026) ve probable que las bases de 2027 se queden como las de 2026.

**En el simulador.** Las cotizaciones observadas de 2026 ya recogen los pasos 1 y 2: las bases del RETA del punto de partida son las de ese año (`data/current-spain-v8.js`, TGSS enero–agosto de 2026). Desde ahí, siguen a los salarios (`selfEmployedBaseMode` = 'payroll-proxy'). Falta el paso 3: unas **0,38 décimas de PIB** (0,5 menos lo ya recogido), si se despliega como estima la AIReF.

**Peso estimado** (identidad de la deuda del simulador; reglas de hoy, rampa lineal de 2027 a 2032 y 0,38 puntos desde entonces). Es una cota baja, porque no cuenta los intereses más bajos de una deuda menor:

| Deuda, % del PIB | 2032 | 2040 | 2050 | 2070 |
|---|---|---|---|---|
| Sin la reforma pendiente | 99,3 | 114,4 | 152,6 | 298,5 |
| Con ella | 98,0 | 110,1 | 144,4 | 279,3 |

**Decisión pendiente del autor:**
- **(a) Como opción, apagada por defecto.** El perfil de la AIReF la enciende, porque ella la cuenta. Sin nueva metodología.
- **(b) Encendida por defecto,** porque es la ley vigente desde 2032, aunque sin tablas. Pide la metodología 1.67.

## 24/11/2026 · La reforma pendiente del RETA, como opción

**Decisión del autor:** «Opción, perfil AIReF».

**Ajuste nuevo.** `retaReform2032`, «Los autónomos cotizan por sus ingresos reales desde 2032» (pestaña «Los ingresos»), apagado por defecto.
- **Qué hace:** suma al tipo protegido lo que falta de la reforma, unas 0,38 décimas de PIB, en línea recta de 2027 a 2032. Lo hace como un tipo sobre la masa salarial, así que mantiene ese peso mientras la masa salarial mantenga el suyo.
- **Qué no hace:** es solo recaudación, como la cuenta la AIReF, y no crea derechos.
- **Código:** `src/current-policy-v7.js` (`RETA_REFORM`, `retaReformShare`).

**Con las reglas de hoy:**

| | Apagado | Encendido |
|---|---|---|
| Cotizaciones 2032, % del PIB | 9,29 | 9,67 |
| Deuda 2050 | 152,6 % | 145,0 % |
| Deuda 2070 | 298,5 % | 277,2 % |
| Se rompe | 2040 | 2042 |
| Gasto en pensiones 2050 | 16,42 % | 16,42 % |

**Comprobación.**
- **Apagado, nada cambia:** sin la clave, los hashes de identidad se reproducen exactos; se regeneraron con ella. Metodología 1.66.0, sin cambios.
- **Prueba nueva:** `tests/reta-reform.test.mjs`.
- **El perfil «Supuestos de la AIReF»** la enciende. Su gasto en pensiones no cambia, así que su prueba sigue igual.
- **Consola:** con el ajuste encendido sale «Se rompe en 2042» y una deuda del 145,0 % en 2050.
- **Supuestos:** entrada «Cotizaciones de los autónomos (RETA)».
- **Modelo:** `docs/modelo/02`, apartado 2.2.

## 24/11/2026 · La «edad constante» del Ageing Report: el hueco de 2070 era el freno de 2023

**Pregunta.** En la sensibilidad «Constant retirement age» (ESb:38), el simulador quedaba cerca del Ageing Report en 2040 y 2050, escalado a sus 2,4 años, pero lejos en 2070: 0,8 puntos frente a 2,1. ¿Por qué solo en 2070?

**Medición** (copia del motor fuera del proyecto, con una clave de prueba que baja el perfil de edades congelado 1,03 años a quienes cumplen 65 desde 2027; así se jubilan a las edades de 2022, como en el escenario del Ageing Report). Perfil del Ageing Report (EUROPOP2023); diferencia de gasto en pensiones frente a la senda encendida sin pensión extra, puntos de PIB:

| | 2030 | 2040 | 2045 | 2050 | 2055 | 2060 | 2070 |
|---|---|---|---|---|---|---|---|
| Ageing Report, edad constante (ESb:38) | 1,26 | 2,89 | 2,97 | 2,57 | 2,25 | 2,10 | 2,13 |
| Simulador, edades de 2022, reglas de hoy | 0,90 | 2,82 | 2,77 | 2,25 | 1,53 | 1,40 | 1,45 |
| Simulador, edades de 2022, sin el freno de 2023 | 0,87 | 2,43 | 2,37 | 1,85 | 1,60 | 1,49 | 1,56 |

**Qué pasaba:**
- **El freno de 2023 inflaba el efecto hasta 2050.** Con el perfil del Ageing Report y la edad congelada, el gasto neto pasa del tope y sube el MEI. Con la respuesta de Laffer completa (encendida por defecto), ese MEI más alto quita horas: −1 % con las edades de 2026 y −2,4 % con las de 2022. Menos horas son menos PIB, y la ratio de gasto sube. El MEI acaba en 2050: en 2051 vuelven las horas y el efecto cae de golpe. El Ageing Report no tiene esa reacción automática.
  - Se vio en los ocupados: por edades, la diferencia entre las dos corridas baja suave (−737, −714 y −695 miles en 2049, 2050 y 2051), pero los ocupados equivalentes, con horas, saltan de −925 a −695 miles en 2051.
  - Con la población del simulador (EUROPOP2025) el freno no salta, y esa fila del contraste no cambia.
- **El escalado por 1,75 no sustituye al experimento.** Con las edades de 2022 y sin el freno, el simulador recoge entre el 70 y el 84 % del efecto del Ageing Report, de forma pareja: no hay un hueco propio de 2070.
- **2030 queda más corto** porque la clave de prueba solo mueve a quienes cumplen 65 desde 2027; el Ageing Report ya retrasa a los de 2022–2026.

**Sin explicar: unos 0,6 puntos.** Sospecha, sin medir: la pensión. Jubilarse 1,03 años antes baja la pensión media de jubilación del simulador un 3,6 % en 2070 (unos 0,45 puntos), porque se cotiza menos. No se sabe si el Ageing Report la baja igual en su escenario.

**Cambio.** En el contraste (apartado 3), las dos variantes de la fila ESb:38 se miden con el freno apagado (`closingClause` 'off') en las dos corridas. Con el perfil del Ageing Report: 1,40 / 1,24 / 1,06 (antes 1,55 / 1,39 / 1,01). Con EUROPOP2025: 1,29 / 1,15 / 1,04, igual que antes. Ni el motor ni la metodología cambian.

**No se hizo:** llevar la variante con las edades de 2022 al contraste, que pide una clave nueva en el motor. Si se hace, la caché de perfiles de edad por generación (`exitProfiles`, `src/current-cohorts-v10.js`) debe guardarse por generación y subida: en la copia, guardarla solo por generación reutilizaba la senda.

## 24/11/2026 · La «edad constante» del Ageing Report: la pensión explica poco; se cierra como diferencia declarada

**Pregunta.** Sin el freno de 2023, el simulador recoge entre el 70 y el 84 % del efecto «Constant retirement age» (ESb:38). ¿Lo explica la pensión? Hoy cada año cotizado vale 1/43 de la pensión (`src/current-simulation-core-v10.js`, `paygAnnual`), así que jubilarse 1,03 años antes la rebaja un 2,4 %.

**Medición** (copia del motor fuera del proyecto, freno apagado, perfil del Ageing Report). Las generaciones que se jubilan a las edades de 2022 cobran la pensión entera aunque coticen menos años, el caso más favorable. Diferencia de gasto frente a la senda encendida, puntos de PIB:

| | 2040 | 2050 | 2060 | 2070 |
|---|---|---|---|---|
| Ageing Report (ESb:38) | 2,89 | 2,57 | 2,10 | 2,13 |
| Edades de 2022 | 2,43 | 1,85 | 1,49 | 1,56 |
| Edades de 2022, con la pensión entera | 2,47 | 1,95 | 1,64 | 1,79 |

Con la población del simulador (EUROPOP2025), lo mismo: 1,54 → 1,76 en 2070.

**Lectura:**
- **La pensión explica poco:** como mucho 0,04 puntos en 2040, 0,10 en 2050 y 0,23 en 2070.
- **Ese máximo seguramente sobra.** Con la ley, jubilarse antes de la edad ordinaria lleva coeficientes reductores (LGSS art. 208). No es probable que el Ageing Report mantenga la pensión entera en su escenario.
- **Quedan entre 0,3 y 0,6 puntos sin explicar.** El candidato más probable es su modelo de empleo, que reparte la salida entre los 55 y los 74 años. No se puede comprobar: para este escenario, su anexo solo publica el gasto, sin cotizantes ni pensionistas.

**Decisión del autor: se cierra como diferencia declarada.** El simulador recoge entre el 70 y el 85 % del efecto del Ageing Report. La parte de la pensión está medida y es pequeña; el resto no se puede comprobar con lo que publica. Sin cambios en el motor ni en el contraste.

## 24/11/2026 · Metodología 1.67.0: los impuestos sin modelo propio crecen con el PIB, y el devengo con la edad congelada

**Decisión del autor:** «Con el PIB (1.67)».

**Por qué.** Son unos 57.000 M€ en 2026, el 3,2 % del PIB: patrimonio, transmisiones, tasas y otros. El motor no tiene una base propia para ellos. Hasta la 1.66 se quedaban fijos en euros de 2026, así que su peso caía con el PIB real: al 2,2 % en 2050 y al 1,8 % en 2070. Era un recorte de impuestos implícito que nadie había decidido.
- **Fuente (O):** AIReF, *Opinión sobre la sostenibilidad de las AA. PP. a largo plazo* (31/03/2025), cuadro 8, págs. 92–93. Elasticidad al PIB nominal, sin medidas, media 2030–2070: «Resto», 1,00 (17 % de los recursos); impuestos especiales, 1,00; IVA, 0,98; IRPF, 1,14; Sociedades, 1,12; cotizaciones, 1,02.
- La AIReF añade que los gobiernos actualizan los impuestos que se quedan obsoletos, como los especiales.
- Era una de las causas de que la deuda del simulador se separase de la suya (entrada «La deuda frente a la AIReF»: −0,8 puntos de ingresos en 2050).

**Cambio.** `unmodeledTaxesFollowGDP` pasa de 0 a 1 por defecto (`src/config-current-v10.js`). El ajuste sigue en el capítulo 6: apagado, vuelven a quedarse fijos en euros.

**Segundo cambio, en la misma versión: el devengo con la edad congelada** (decisión del autor, «Sí, en la 1.67»). Es el sesgo medido en «Cuánto sobrestima la edad congelada». La primera pensión usa la tasa de altas del Ageing Report, que cuenta con su edad de salida, más alta. Con la edad congelada, el motor la daba entera a quien se jubila antes y trabaja menos años.
- **Regla nueva** (`paygAccrualYears`, `src/current-cohorts-v10.js`): sin la senda, cada año trabajado vale 1/(43 + R), con R lo que la senda retrasaría a esa generación (0 para quien cumple 65 hasta 2026; 1,37 desde 2040). Es el valor de un año corriente (S); no supone jubilación anticipada ni sus coeficientes. Solo toca lo devengado desde 2027, así que es una cota baja.
- **Con la senda encendida, nada cambia.**

**Con las reglas de hoy:**

| | 1.66 | 1.67, solo impuestos | 1.67 |
|---|---|---|---|
| Se rompe | 2040 | 2042 | 2042 |
| Deuda 2050 | 152,6 % | 139,5 % | 138,9 % |
| Deuda 2070 | 298,5 % | 245,1 % | 240,8 % |
| Gasto en pensiones 2050 | 16,42 % | 16,42 % | 16,32 % |
| Gasto en pensiones 2070 | 15,89 % | 15,89 % | 15,62 % |
| Pensión frente al salario 2050 | 61,5 % | 61,5 % | 61,1 % |
| Gasto medio 2022–2050 (freno de 2023) | 14,84 % | 14,84 % | 14,81 % |

- **El freno de 2023:** media neta 13,21 %, bajo el tope de 13,3 %. Sin recargo por defecto.
- **Con la senda de edad encendida:** se rompe en 2047 y la deuda de 2070 es del 207 %.
- **Con productividad +1 % y salarios planos:** deuda de 2070 del 231 % (298 % con los impuestos fijos).
- **Frente a la AIReF:** la deuda de 2050 baja de 152,6 a 138,9 %, frente a su 123 %.
- **Las entradas siguientes de este día** («Sociedades y cotizaciones», «La deuda frente a la AIReF: la diferencia se abre antes de 2030») se midieron con la 1.67 sin el devengo (deuda de 2050, 139,5 %). Sus conclusiones no cambian: el gasto en pensiones de 2030 baja solo 0,01 puntos.
- **La fila «edad constante» del contraste** baja con el devengo, porque jubilarse antes ya cuesta pensión: 1,37 / 1,13 / 0,78 puntos con el perfil del Ageing Report (antes 1,40 / 1,24 / 1,06), frente a sus 2,89 / 2,57 / 2,13. Coherente con lo medido en «la pensión explica poco»: el Ageing Report seguramente también rebaja la pensión de quien se jubila antes.

**Estado guardado 33.** Todo escenario guardado antes pasa a 1 (`moveUnmodeledTaxesWithGDP`, `src/risk-state-migration.js`), como en la 1.54, la 1.56 y la 1.59. La clave llegó el 22/11 con 0 por defecto y sin estado nuevo, así que un 0 guardado antes no se distingue de un defecto. Desde el estado 33, un 0 es una elección y se conserva.

**Versiones y archivos cambiados:**
- **Versiones:** metodología `common-fund-1.67.0`, aplicación 1.67.0, estado 33.
- **Referencias de las pruebas:** `tests/fixtures/engine-reference-1.67.0.json` sustituye a la de la 1.66.0, y los hashes de identidad se regeneraron.
- **Pruebas con años del defecto:** round-13 (riesgo alto sostenido desde 2042, rescate 2043, quita 2046; sin rescate, impago 2044; cuentas nocionales, primer problema 2047), `tests/unmodeled-taxes-choice.test.mjs` (defecto 1 y migración del estado) y `tests/retirement-exit-path.test.mjs` (el devengo sin la senda).
- **Textos:** supuestos «Impuestos sin modelo propio» y «Edad de jubilación», ayuda del ajuste, lectura de la deuda frente a la AIReF en la página de metodología y modelo (01, 1.10, con las referencias de línea movidas; 02, `R0`). El contraste externo se regeneró.

## 24/11/2026 · Sociedades y cotizaciones frente a la AIReF: los ingresos ya cuadran

**Pregunta.** La entrada «La deuda frente a la AIReF» señalaba que ni Sociedades ni las cotizaciones ganan peso en el simulador. ¿Cuánto pesa eso con la 1.67?

**Ingresos y gasto primario, % del PIB** (simulador 1.67 con las reglas de hoy; AIReF, Estudio 1/2026, págs. 60–62 y gráfico 19, interpolada entre 2025, 2030 y 2050; su gasto primario es el total menos los intereses):

| | 2030 | 2040 | 2050 |
|---|---|---|---|
| Ingresos, simulador | 43,4 | 44,2 | 44,7 |
| Ingresos, AIReF | 43,3 | 44,2 | 45,0 |
| Gasto primario, simulador | 44,0 | 46,4 | 47,8 |
| Gasto primario, AIReF | 43,1 | 45,2 | 47,2 |

**Identidad de la deuda** (crecimiento nominal e intereses del simulador; deuda de 2050): 139,5 % la del simulador; 140,2 % con los ingresos de la AIReF; 122,5 % con su gasto primario; 123,1 % con los dos. Su publicada: 123 %.

**Por partidas** (cambio de 2025–2026 a 2050):
- **Sociedades:** el simulador lo deja en el 3,1 % del PIB, porque su base es el excedente bruto y su peso no cambia. La AIReF lo lleva del 3,1 al 3,7 % (gráfico 18; elasticidad 1,12 al PIB nominal, Opinión 2025, cuadro 8). Con esa elasticidad desde 2026, el simulador llegaría al 3,41 % en 2050 y la deuda de 2050 bajaría unos 3 puntos.
- **Cotizaciones:** el simulador sube 0,22 puntos (0,60 con la reforma del RETA); la AIReF, 0,7. Lo explica la opción `retaReform2032`, ya encendida en el perfil de la AIReF.
- **El reparto es distinto, el total no.** El simulador recauda menos por Sociedades, IRPF y cotizaciones y más por el resto. Las dos fuentes no agrupan igual, así que la comparación partida a partida es poco fiable.

**Decisión del autor: sin cambios.** Subir Sociedades sin tocar lo demás pondría los ingresos totales por encima de los de la AIReF y contaría dos veces. La diferencia de deuda que queda es del gasto primario: +0,9 puntos en 2030, +1,2 en 2040 y +0,6 en 2050.

## 24/11/2026 · La deuda frente a la AIReF: la diferencia se abre antes de 2030 y se declara

**Pregunta.** Con la 1.67, la deuda de 2050 es del 139,5 %, frente al 123 % de la AIReF. ¿En qué años y en qué partidas se forma la diferencia?

**Gasto de la AIReF** (Estudio 1/2026, cuadro 12, pág. 65; % del PIB, 2025 / 2030 / 2050): pensiones 13,0 / 13,5 / 16,4; sanidad 6,5 / 6,6 / 7,9; cuidados de larga duración 0,8 / 0,9 / 1,6; educación 4,0 / 4,0 / 3,3; desempleo 1,4 / 1,2 / 1,3; no modelizado 16,4 / 16,7 / 16,7; intereses 2,4 / 2,8 / 4,4. Total, 44,5 / 45,7 / 51,6.

**Saldo primario, % del PIB:**

| | 2030 | 2050 | Cambio 2030–2050 |
|---|---|---|---|
| Simulador 1.67 | −0,60 | −3,10 | −2,50 |
| AIReF | +0,40 | −2,20 | −2,60 |

**Lectura:**
- **Desde 2030 van en paralelo.** Pensiones (+2,45 el simulador, +2,9 la AIReF), resto del gasto (+1,36 y +1,4) e ingresos (+1,3 y +1,7) cambian casi lo mismo. La distancia de 1 punto de saldo primario ya está en 2030 y se mantiene: es la que da los 16 puntos de deuda.
- **Entre 2026 y 2030:**
  - **Pensiones, +0,4:** 14,0 % del PIB en 2030 en el simulador; 13,55 % el Ageing Report actualizado como la regla, como la AIReF. Es la edad congelada, elección del autor (24/11): el Ageing Report y la AIReF suben la edad de salida 0,6 años hasta 2030.
  - **Ingresos, −0,5:** el simulador sube 0,5 puntos desde 2026; la AIReF, en torno a 1 desde 2025, sobre todo por el IRPF sin deflactar. La AIReF solo publica 2025, 2030 y 2050, así que no se puede comprobar año a año.
  - **Resto del gasto:** cambia casi igual.
- **Los niveles engañan.** El simulador arranca unos 0,6 puntos por encima de la AIReF en ingresos y en gasto (su 2026 observado frente a la AIReF de 2025, interpolada). Por eso, en niveles, los ingresos de 2050 parecen cuadrar y la diferencia parece toda del gasto (entrada anterior).
- **El FMI** (contraste, apartado 4) cuadra en ingresos, pero su gasto casi no sube hasta 2030 (+0,1 puntos, frente a +1,5 en el simulador). La AIReF y el FMI coinciden en que hasta 2030 hay contención; el simulador mantiene las políticas de hoy.

**Decisión del autor: se declara.** Es una diferencia de corto plazo. La mitad sale de la edad congelada, que es una elección del autor, y a largo plazo los dos van en paralelo. Sin cambios en el motor. La lectura de la deuda frente a la AIReF, en la página de metodología, lo dice. Queda como posible opción la senda de gasto del plan fiscal hasta 2030 (PFEMP).

## 24/11/2026 · El paquete de Sites con un solo comando

**Por qué.** El sitio publicado está en la 1.65. El script del paquete (`scripts/prepare-sites-package.mjs`) era de la primera entrega del 22/11: solo admitía `index.html`, así que fallaba con las cinco páginas de ahora. Además pedía compilar a mano y comprimir aparte.

**Cambio.** `npm run sites` hace todo en local:
- comprueba que no hay cambios sin commit, porque el inventario nombra el commit;
- compila aparte en `output/sites/pensioneslabs3-<versión>-<fecha>/dist`;
- exige las cinco páginas, el worker y el módulo de cálculo, y no admite archivos que no sean páginas, JS o CSS;
- comprueba cada referencia local: en las páginas, `src` y `href`; en los módulos, los módulos y estilos hermanos y las páginas que enlazan. Las rutas de fuentes que la metodología cita como texto («../../data/…js») no son recursos y no se comprueban;
- escribe `inventory.json` (commit, versión, metodología, estado guardado, calibración, huellas de fuentes y de archivos), `README-SITES.md` y `.openai/hosting.json` con la identidad del Site;
- hace el ZIP con el `tar` de Windows y su SHA-256.

No sube, no registra versión y no publica. Eso lo hace el autor con el flujo de Sites.

**Primer paquete:** `output/sites/pensioneslabs3-1.67.0-2026-11-24.zip`, 788.848 bytes, 21 archivos publicables (2.215.605 bytes), 65 referencias comprobadas, del commit `357a919`. SHA-256 `4DB0E0655DE03FAAFD96E936D6C436996F2A73A8F9F5E06A23F234A38E3A9138`. Servido en local, las cinco páginas abren sin errores y la consola calcula: «Se rompe en 2042», deuda de 2070 del 241 %.

**Segundo paquete, con la caché de sensibilidad y riesgo** (mismo día): `output/sites/pensioneslabs3-1.67.0-2026-11-24-cache.zip`, 790.621 bytes, 22 archivos publicables (2.218.924 bytes), 71 referencias comprobadas, del commit `47aa0bb`. SHA-256 `E7BF91470EA6A4172B26DB7EE92D0688E09128D74D90268AAE0CA965C13C3E04`. Servido en local, las cinco páginas abren, la consola calcula lo mismo y la segunda visita a sensibilidad sale en 2,6 s con la misma tabla. **Es el que hay que subir**; el primero queda sustituido.

## 24/11/2026 · Los resultados de sensibilidad y riesgo se guardan entre visitas

**Por qué.** Medido con el servidor de desarrollo y 8 workers en una máquina de 32 núcleos: una corrida del motor tarda 3–4,5 s. «Sensibilidad» lanza unas 40 corridas y tardaba 23,5 s en cada visita. «Riesgo» lanza 201 y tardaba unos 105 s por «Calcular». Solo había una caché en memoria dentro de cada página: al volver se calculaba todo otra vez. Con menos núcleos, que es lo normal, tarda bastante más.

**Cambio** (`src/shared/result-cache.js`):
- **Qué se guarda:** solo el resumen que muestra cada página, unos kilobytes en IndexedDB del navegador. En sensibilidad, las cuatro medidas de cada variante; en riesgo, los percentiles, las bandas y la corrida sin choques. Como mucho, los 40 últimos.
- **Cuándo se reutiliza:** solo si coinciden la página, la versión de la aplicación, la metodología, la calibración, el escenario canónico (`src/shared/sim-key.js`) y los parámetros de la página: en sensibilidad, los pasos de cada variante; en riesgo, el sistema, la volatilidad, las trayectorias, la semilla, las colas y la memoria. Una versión nueva o un escenario distinto no reutilizan nada.
- **En la página:** el estado dice «Resultado guardado el …, no se ha vuelto a calcular», y aparece «Recalcular».
- **Lo que no toca:** el motor, los resultados y el estado guardado de los escenarios. Es una caché: si se pierde (ventana privada, datos borrados), se calcula de nuevo.

**Comprobación.**
- `tests/result-cache.test.mjs`: la clave cambia con la página, el escenario, el sistema y los parámetros; coincide en escenarios equivalentes; sin IndexedDB, las lecturas fallan sin romper nada.
- **En el navegador:**
  - en sensibilidad, la segunda visita sale en menos de 3 s, con la misma tabla y el mismo gráfico; «Recalcular» calcula de nuevo y da lo mismo;
  - en riesgo, con 20 trayectorias, la segunda vez sale al instante con el mismo resumen y el mismo abanico, y otra semilla vuelve a calcular.

## 24/11/2026 · La AIReF hasta 2030 no supone contención: corrección, IRPF y plan fiscal

**Fuente nueva (O):** AIReF, *Informe de seguimiento 2026 del Plan Fiscal y Estructural de Medio Plazo 2025-2028* (Informe 24/26, 14/05/2026): cuadro 3 (gasto primario neto), cuadros 17, 19 y 20 (recursos y empleos sin PRTR, 2025–2030), págs. 6–7, 16, 22, 67–72. Leído, no guardado en `data/sources`.

**Corrección.** La entrada «La diferencia se abre antes de 2030» decía que la AIReF y el FMI coinciden en que hasta 2030 hay contención. Para la AIReF es falso. Su escenario a largo plazo, el de la deuda del 123 % en 2050, parte de su senda de medio plazo **a políticas constantes**: el gasto primario neto crece un 5 % al año en 2025–2028 (5,8 / 5,2 / 4,2 % en 2026–2028), frente al 3,4 % que compromete el plan (3,5 / 3,2 / 3,0 %). Cumplir el plan pediría un ajuste medio de 0,7 puntos de PIB al año entre 2026 y 2031 (pág. 22). La conclusión de aquella entrada (la diferencia es de corto plazo y se declara) se mantiene; su explicación cambia.

**2026–2030 frente a la AIReF**, % del PIB, sin PRTR (simulador 1.67, reglas de hoy):

| | 2026 | 2027 | 2028 | 2029 | 2030 |
|---|---|---|---|---|---|
| Ingresos, simulador | 42,9 | 43,1 | 43,2 | 43,3 | 43,4 |
| Ingresos, AIReF | 42,5 | 43,0 | 42,9 | 43,2 | 43,3 |
| Gasto, simulador | 45,3 | 45,7 | 46,0 | 46,4 | 46,8 |
| Gasto, AIReF | 45,0 | 45,2 | 45,2 | 45,5 | 45,7 |
| Saldo, simulador | −2,4 | −2,6 | −2,8 | −3,0 | −3,4 |
| Saldo, AIReF | −2,6 | −2,2 | −2,3 | −2,3 | −2,4 |

**Lectura:**
- **Ingresos:** el simulador sube 0,5 puntos y la AIReF 0,8. Hay más diferencia por partidas, pero se compensa:
  - el IRPF de la AIReF pasa del 9,9 al 10,8 % (+0,9), por salarios y progresividad en frío; el del simulador, del 9,55 al 9,82 % (+0,27);
  - la AIReF baja los impuestos especiales, los otros impuestos sobre la producción y el resto de recursos (unos −0,6 entre los tres); el simulador los mantiene.
  - De 2030 a 2050 los dos suben el IRPF lo mismo (+1,3). **Sin cambios:** subir solo el IRPF a corto plazo pondría los ingresos por encima de los de la AIReF.
- **Gasto:** el simulador sube 1,5 puntos y la AIReF 0,7. Los intereses suben igual (0,4 y 0,3). La diferencia es casi toda de pensiones: el simulador pasa del 13,03 al 13,96 % (+0,93); la AIReF, de unos 13,1 al 13,5 % (+0,4). Con la senda de edad encendida, el simulador sube 0,59. La edad congelada explica unos 0,35 puntos; el resto, unos 0,2, es gasto no explicado en pensiones y en otras partidas.
- **Plan fiscal (PFEMP):** no es lo que hace la AIReF, así que no explica la diferencia. Una opción «cumplir el plan» sería una política de consolidación, no una calibración. Se puede ensayar ya con los recortes de gasto por año de la consola. **No se añade al motor.**

## 24/11/2026 · El back-test, aplazado; su semilla ya existe

**Por qué no ahora.** El motor arranca en 2026 con lo observado (población, empleo, stock de pensiones, cuentas y deuda). Arrancarlo en un año pasado, por ejemplo 2015, pediría una calibración entera de ese año. El modelo retrospectivo de 1985 (`src/retrospective-model-1985.js`) es un contrafactual de sistemas, no una comprobación de previsiones.

**Lo que ya sirve de semilla.** Cada metodología guarda su proyección de 2026–2070 con la configuración de partida: `tests/fixtures/engine-reference-<versión>.json`, en git desde la 1.65. Trae la deuda, el gasto en pensiones, los intereses, la pensión media y la tasa de sustitución, con diez cifras significativas. Cuando se cierren las cuentas de 2026 (INE, IGAE y Seguridad Social, en 2027), se comparan con lo observado: es un back-test sin calibrar nada hacia atrás.

**Cambio.** La cita de 2027 en «Próximas citas» (`UPCOMING_DATES`, `src/domain/assumptions-catalog.js`) lo dice.

## 24/11/2026 · La AIReF a medio plazo en el contraste: en euros el gasto crece igual, el PIB no

**Fuente guardada (O):** `data/sources/airef-2026/informe-seguimiento-pfemp-2026.pdf`, SHA-256 `7104e1a01f5b4d40322888fc00bec29b7b0b38c25e239fa6c7fce9e28da3420c`. Pesa 1,7 MB, así que queda fuera de git, como los otros PDF de la AIReF. Sus cifras, con cuadro y página, están en `data/external-forecasts-airef-pfemp-20260514.json`: cuadros 3 (pág. 16), 16 (pág. 46), 17 (pág. 67), 19 (pág. 68) y 20 (pág. 72).

**Cambio.**
- **Contraste** (`scripts/contrast-external.mjs`, apartado 5c; `airefMediumTerm` en `data/external-contrast.json`): ingresos, gastos, saldo, intereses, IRPF, cotizaciones y pensiones frente a prestaciones en efectivo, 2026–2030. Además, el crecimiento del gasto primario (simulador, plan y AIReF) y el del PIB nominal y el empleo. El script comprueba la huella del PDF.
- **Página de metodología:** apartado «AIReF: medio plazo, 2026–2030». La lectura de la deuda frente a la AIReF remite a él.
- **Prueba** (`tests/airef-medium-term.test.mjs`): los componentes suman los totales, el saldo es ingresos menos gastos y el acumulado del plan sale de sus tasas, todo dentro del redondeo. El acumulado de la AIReF del cuadro 3 no sale de componer sus tasas (15,7 frente a 15,4 en 2026); se guarda como se publica.

**Nueva lectura, que corrige la de la entrada anterior** («La AIReF hasta 2030 no supone contención»). Aquella atribuía la diferencia de 2026–2030 casi toda a las pensiones. En euros no es así:
- **Gasto primario:** +17,8 % el simulador y +18,4 % la AIReF.
- **Pensiones:** +23,2 % y +21,1 %. La edad congelada pesa poco, unos 0,3 puntos de PIB.
- **PIB nominal:** +15,0 % el simulador y +17,5 % la AIReF. Su empleo crece entre el 1,5 y el 1,9 % al año hasta 2030, por la inmigración; el del simulador, el del Ageing Report, entre el 0,3 y el 0,6 % desde 2028.
- **Con el PIB de la AIReF**, el gasto del simulador en 2030 sería el 45,7 % del PIB, el mismo que el suyo. Los ingresos siguen a la economía en los dos, y la diferencia de saldo sale del PIB.

**Consecuencia.** La diferencia de deuda con la AIReF es, sobre todo, de crecimiento a corto plazo: cuánta gente trabaja de aquí a 2030. Sigue declarada, sin cambios en el motor. El empleo de referencia del simulador es el del Ageing Report de 2024 (`docs/modelo/01`). Una opción de empleo a corto plazo como el de la AIReF sería otra mejora, que el autor tendría que decidir.

## 24/11/2026 · Opción: empleo hasta 2030 como prevé la AIReF

**Decisión del autor:** «Sí, como opción», apagada por defecto.

**Por qué.** Hasta 2030, la diferencia con la AIReF es de crecimiento, no de gasto en euros (entrada anterior). Su empleo equivalente crece 1,9 / 1,8 / 1,6 / 1,5 % en 2027–2030, por la inmigración, con la productividad casi plana. El del simulador, el del Ageing Report, crece 1,7 / 0,6 / 0,4 / 0,3 %.

**Ajuste nuevo.** `airefShortRunEmployment`, «Empleo hasta 2030 como prevé la AIReF», en el capítulo «El mundo», apagado por defecto (`src/shared/short-run-employment.js`).
- **Más entradas al empleo** en 2027–2030: las del año por 1 + 0,0798 / 0,3767 / 0,4236 / 0,4779. Se quedan, cotizan y se jubilan como los demás.
- **Algo menos de producto por ocupado y de salario:** −0,61 / −0,68 / −0,59 / −0,61 % cada año, para que el PIB real crezca como el de la AIReF. El nivel queda más bajo y desde ahí siguen las tasas de referencia. El PIB de referencia del gasto público sigue a ese producto por ocupado.
- **Calibrado con los ajustes de partida** (S): el empleo crece 1,90 / 1,80 / 1,60 / 1,50 % y el PIB real 2,00 / 1,90 / 1,80 / 1,70 %. Con otros ajustes, los multiplicadores son los mismos.
- **Límite:** los recién llegados no se suman a la población. No suben el gasto que el motor liga a ella.

**Con las reglas de hoy:**

| | Apagado | Encendido |
|---|---|---|
| Se rompe | 2042 | 2042 (al filo: 2044 con una diezmilésima más de productividad) |
| Deuda 2050 | 138,9 % | 132,8 % |
| Deuda 2070 | 240,8 % | 227,2 % |
| Gasto en pensiones 2050 | 16,32 % | 15,92 % |
| Saldo 2030 (AIReF: −2,4) | −3,4 | −3,2 |

- **Con la senda de edad:** se rompe en 2050, no en 2047; la deuda de 2050 baja de 121 a 116 %.
- **Perfil de la AIReF:** no se enciende. Su productividad está ajustada para reproducir su gasto en pensiones; con esta opción habría que recalibrarla.
- **Medido antes en una copia del motor:** con solo el empleo de la AIReF y la productividad del simulador, la deuda de 2050 sería del 124,7 %, pero el PIB nominal crecería más que el suyo (+19,4 % en 2026–2030, frente al 17,5 %).

**Comprobación.**
- **Apagado, nada cambia:** las series año a año dan la misma huella antes y después. Los hashes de identidad se regeneraron porque la configuración que devuelve el motor tiene una clave más. Metodología 1.67.0, sin cambios; estado guardado, sin cambios.
- **Prueba nueva:** `tests/short-run-employment.test.mjs`.
- **Sensibilidad:** el supuesto entra en «El mundo».
- **Contraste:** el apartado «AIReF: medio plazo» muestra el saldo con la opción.
- **Consola:** al encenderla, la deuda de 2070 pasa del 241 al 227 %.
- **Textos:** supuesto «Población y empleo», ayuda del ajuste y modelo (01, empleo; también se corrige que el empleo por defecto ya no coincide con el del Ageing Report desde la 1.66: 23,46 M en 2040).

## 24/11/2026 · El perfil de la AIReF toma sus supuestos tal cual, con su empleo hasta 2030

**Decisión del autor:** «a) Sus supuestos».

**El dilema.** Con la opción «Empleo hasta 2030 como prevé la AIReF», el perfil no puede reproducir a la vez su productividad y su gasto en pensiones:

| Perfil de la AIReF | Productividad | Media 2022–2050 | Gasto 2050 | Deuda 2050 | Deuda 2070 | Se rompe |
|---|---|---|---|---|---|---|
| Hasta hoy (sin la opción) | −0,35 | 14,50 | 16,26 | 130,6 | 239,9 | 2047 |
| **Con la opción, sus supuestos tal cual (elegido)** | −0,35 | 14,30 | 15,88 | 125,0 | 225,6 | 2047 |
| Con la opción, recalibrado a su gasto | −0,65 | 14,52 | 16,32 | 140,4 | 278,3 | 2043 |
| AIReF (Estudio 1/2026) | ≈ −0,3 | 14,5 | 16,3 | 123 | — | — |

**Cambio** (`src/domain/reference-profiles.js`):
- **El perfil** suma `airefShortRunEmployment: 1` a sus supuestos (senda de edad con premio, productividad y salarios −0,35, reforma del RETA).
- **Deja de ajustarse a su gasto en pensiones:** con más empleo, el PIB es mayor y el gasto pesa menos. Su texto lo dice.
- **Su prueba** (`tests/reference-profiles.test.mjs`) toma el margen de cada perfil (`tolerance`). Para la AIReF, 0,5 puntos de gasto en pensiones y 3 de deuda en 2050, frente a su 123 %. El del Ageing Report sigue en 0,1 puntos.

**Lectura.** Con sus propios supuestos, el simulador da casi su deuda (125 % frente a 123 %). El gasto en pensiones queda 0,4 puntos por debajo en 2050. Recalibrar la productividad para igualar ese gasto pediría casi el doble de recorte del que ella supone, y alejaría la deuda. Queda sin explicar por qué su gasto en pensiones es mayor con un PIB parecido. Una posibilidad: que sus recién llegados también cobren o pesen en otras prestaciones; el simulador no los suma a la población.

**Comprobación.** En la consola, el perfil abre con «Se rompe en 2047» y una deuda de 2070 del 226 %, con el texto nuevo. El escenario guardado del navegador se restauró después.

## 24/11/2026 · Los recién llegados de la opción de empleo no dejan gasto sin contar

**Pregunta.** Con «Empleo hasta 2030 como prevé la AIReF», los recién llegados no se suman a la población. Las dos entradas anteriores lo daban como límite («no suben el gasto que el motor liga a ella») y como posible causa de que el perfil de la AIReF gaste 0,4 puntos menos en pensiones. ¿Pesa?

**Lo que hace el motor desde 2026.** Ningún gasto depende de la población:
- **Sanidad y dependencia:** la presión del Ageing Report, en puntos de PIB, por el PIB de referencia del gasto (`src/ageing-care.js`; `src/model-current-v10.js:170`).
- **Otras pensiones (viudedad, incapacidad):** su peso de 2026, movido con la senda del Ageing Report, por ese mismo PIB (`otherPensionSpendingShare`, `src/model-current-v10.js:186`; `src/current-simulation-core-v10.js:538`).
- **El resto del gasto:** un porcentaje fijo de ese PIB.
- **Ese PIB** son los ocupados por el producto por ocupado de referencia (`src/current-simulation-core-v10.js:288`), así que crece con los recién llegados.
- **Sus pensiones** salen de sus propias cohortes.
- La población solo se lee para construir el punto de partida y las entradas al empleo.

**Corrección.** No es un límite ni una causa del gasto menor. Si acaso, va al revés: las sendas de sanidad, dependencia y otras pensiones son las del Ageing Report, con su demografía, más envejecida. Con más jóvenes podrían pesar algo menos, así que el simulador queda del lado prudente. Por qué la AIReF gasta 0,4 puntos más en pensiones con una deuda parecida sigue sin explicar.

**Cambio.** Solo textos: comentario de `src/shared/short-run-employment.js` y modelo (01, empleo). Sin cambios en el motor.

## 24/11/2026 · La opción de la AIReF hasta 2030 incluye su inflación

**Decisión del autor:** «Sí, añádela».

**Cambio.** La opción pasa a llamarse «Empleo e inflación hasta 2030 como prevé la AIReF» (misma clave, `airefShortRunEmployment`). Con ella, los precios suben en 2027–2030 como el deflactor del PIB de la AIReF: 2,6 / 2,3 / 2,1 / 2,0 % (Informe de seguimiento 2026 del plan fiscal, cuadro 16). Desde 2031, la inflación del escenario.
- **El tipo de interés nominal** del escenario se mantiene: baja el real (`annualConfig`, `src/model-current-v10.js`).
- **El salario oficial de 2027** se deflacta con esa inflación (`src/wage-path-v6.js:18`): su subida nominal sigue siendo la publicada.
- **El motor tiene un solo índice de precios**, así que las pensiones se revalorizan con él. El IPC de la AIReF es 2,3 / 1,9 / 2,1 / 2,0 %.

**Medido antes en una copia del motor:** el PIB nominal de 2026–2030 crece un 17,6 %, frente a su 17,5 %. Con el salario de 2027 aún deflactado al 2 %, el saldo de 2030 pasaba de −3,19 a −3,02. Con la corrección del salario, el efecto es algo menor.

**Con las reglas de hoy:**

| | Apagada | Solo empleo (antes) | Empleo e inflación |
|---|---|---|---|
| Se rompe | 2042 | 2042 | 2045 (al filo) |
| Deuda 2050 | 138,9 % | 132,8 % | 130,6 % |
| Deuda 2070 | 240,8 % | 227,2 % | 222,5 % |
| Saldo 2030 (AIReF: −2,4) | −3,4 | −3,2 | −3,1 |
| Gasto en pensiones 2050 | 16,32 % | 15,92 % | 15,84 % |

**Perfil de la AIReF** (con la opción): deuda de 2050 del 122,8 %, frente a su 123 %, y se rompe en 2047. Su gasto en pensiones de 2050 queda en el 15,80 %, frente al 16,3 %. El margen de su prueba pasa de 0,5 a 0,6 puntos y su texto se actualiza.

**Lectura.** La inflación erosiona algo más la deuda ya emitida y cierra unas tres décimas del saldo. El PIB nominal ya crece como el de la AIReF. Queda una parte de la diferencia de saldo sin explicar (−3,1 frente a −2,4 en 2030).

**Comprobación.** Apagada, las series no cambian, con la misma huella. `tests/short-run-employment.test.mjs` comprueba ahora también los precios. Se regeneró el contraste. Se actualizaron los textos: ayuda y nombre del ajuste, supuesto «Población y empleo», sensibilidad, metodología y modelo 01.

## 24/11/2026 · Metodología 1.68.0: la edad efectiva sigue la senda del Ageing Report por defecto

**Decisión del autor:** «Pues ajustémonos a lo de Ageing Report y la AIReF».

**Por qué.** Hasta la 1.67, el defecto congelaba el perfil de edades de jubilación de 2026 (media de 65,4 años). El Ageing Report y la AIReF cuentan con que la gente se jubile cada vez más tarde, por las reformas y por carreras más largas. La senda del Ageing Report retrasa 1,37 años a quien cumple 65 desde 2040. La AIReF lleva la edad efectiva de 65,2 a 66,2 años en 2050. La edad congelada explicaba buena parte de lo que separaba al simulador de los dos.

**Cambio.**
- **Nuevo defecto:** `retirementAgeExitPath` pasa de 0 a 1, con el premio por demora (`exitPathNoExtraPension` = 0, la ley y la lectura de la AIReF). La edad congelada queda como opción, con el devengo de la 1.67.
- **Estado guardado 34:** todo escenario guardado antes pasa a la senda (`moveToRetirementExitPath`, `src/risk-state-migration.js`), como en la 1.54, la 1.56, la 1.59 y la 1.67. La clave llegó el 24/11 con 0 por defecto y sin estado nuevo, así que un 0 guardado antes no se distingue de un defecto. Desde el 34, un 0 es una elección y se conserva.
- **Opción «Empleo e inflación hasta 2030 como prevé la AIReF»:** recalibrada con el nuevo defecto, porque con la senda hay más ocupados de partida. Las entradas pasan a 0,0289 / 0,2826 / 0,3316 / 0,3976; la productividad queda en −0,61 / −0,68 / −0,59 / −0,61 %. Con los ajustes de partida, el empleo crece 1,900 / 1,800 / 1,600 / 1,501 % y el PIB real 1,997 / 1,897 / 1,797 / 1,695 %.
- **Contraste:** la fila «edad constante» pone explícita la senda apagada (antes contaba con el defecto). La etiqueta de «Reglas de hoy» dice «senda de edad del Ageing Report».

**Con las reglas de hoy** (1.67 → 1.68):

| | 1.67 | 1.68 |
|---|---|---|
| Se rompe | 2042 | 2047 |
| Deuda 2050 | 138,9 % | 121,3 % |
| Deuda 2070 | 240,8 % | 207,4 % |
| Gasto en pensiones 2050 | 16,32 % | 15,76 % |
| Gasto medio 2022–2050 (freno de 2023) | 14,81 % | 14,24 % |
| Ocupados 2040 | 23,5 M | 24,2 M |
| Jubilados 2070 | 13,7 M | 13,0 M |
| Saldo 2030 (AIReF: −2,4) | −3,4 | −3,0 |

- **Con la opción de empleo e inflación:** se rompe en 2050 y la deuda de 2050 es del 117,4 %; el saldo de 2030, −2,9.
- **Perfiles:** el de la AIReF da una deuda de 2050 del 126,4 %, frente a su 123 %, y un gasto en pensiones del 15,9 % en 2050, frente al 16,3 %. El margen de deuda de su prueba pasa a 4 puntos. El del Ageing Report no cambia: ya llevaba la senda.

**Versiones y archivos cambiados:**
- **Versiones:** metodología `common-fund-1.68.0`, aplicación 1.68.0, estado 34.
- **Referencias de las pruebas:** `tests/fixtures/engine-reference-1.68.0.json` sustituye a la de la 1.67.0, y los hashes de identidad se regeneraron.
- **Pruebas:**
  - round-13: riesgo alto sostenido desde 2047, rescate 2048, quita 2051, impago sin rescate 2049. En cuentas nocionales, la pensión baja del suelo en 2066 y el primer problema es la deuda en 2057.
  - Freno de 2023: el caso de presión fija la edad congelada, para seguir pasando del tope.
  - Senda de edad: ahora encendida por defecto.
  - Opción de empleo: umbrales ajustados (un 2,7 % más de ocupados en 2050).
- **Textos:** supuestos «Edad de jubilación», «Impuestos sin modelo propio» y «Población y empleo»; ayuda del ajuste; lectura de la AIReF a medio plazo; perfil de la AIReF; modelo 01 (empleo, 1.10, jubilados y opción). El contraste se regeneró.

## 24/11/2026 · Metodología 1.69.0: empleo e inflación de la AIReF hasta 2030 por defecto

**Decisión del autor:** «Que se parezca a corto plazo lo más posible a la AIReF, para que no haya dudas de su buen funcionamiento».

**Cambio.**
- **Nuevo defecto:** `airefShortRunEmployment` pasa de 0 a 1. De 2027 a 2030, el empleo, el PIB real y los precios siguen el cuadro macro de la AIReF (Informe de seguimiento 2026 del plan fiscal, cuadro 16). Desde 2031, el empleo crece como el de referencia del Ageing Report, desde un nivel más alto, y los precios con la inflación del escenario.
- **Estado guardado 35:** todo escenario anterior pasa al nuevo defecto (`moveToAirefShortRun`, `src/risk-state-migration.js`), como en la 1.67 y la 1.68.
- **El perfil del Ageing Report** apaga el ajuste de forma explícita: su empleo es el del Ageing Report.
- **Contraste:**
  - La fila «edad constante» usa el empleo del Ageing Report en las dos corridas, como su escenario.
  - El apartado «AIReF a medio plazo» muestra ahora qué pasaría sin el ajuste.
  - La lectura de la deuda frente a la AIReF se actualiza.

**Antes de decidir se avisó:**
- la AIReF y el Ageing Report no coinciden en el empleo de aquí a 2030;
- la previsión a cinco años deja huella en el nivel de empleo para siempre;
- los multiplicadores son una calibración del proyecto (S);
- el cambio va en la dirección optimista;
- el Ageing Report de 2027 traerá nuevas proyecciones de empleo.

**Con las reglas de hoy** (1.68 → 1.69):

| | 1.68 | 1.69 |
|---|---|---|
| Se rompe | 2047 | 2050 |
| Deuda 2050 | 121,3 % | 117,4 % |
| Deuda 2070 | 207,4 % | 197,8 % |
| Gasto en pensiones 2050 | 15,76 % | 15,41 % |
| Gasto medio 2022–2050 (freno de 2023) | 14,24 % | 14,06 % |
| Saldo 2030 (AIReF: −2,4) | −3,0 | −2,9 |
| PIB nominal 2026–2030 (AIReF: +17,5 %) | +16,0 % | +17,6 % |
| Ocupados 2040 | 24,2 M | 24,9 M |
| Jubilados 2070 | 13,0 M | 13,1 M |

- **Perfiles:** el de la AIReF no cambia (ya lo llevaba): deuda de 2050 del 126,4 %. El del Ageing Report tampoco (lo apaga): 138,9 %.
- **Cuentas nocionales:** lo primero que falla pasa a ser la pensión, que baja del suelo de la OIT en 2066. Hasta la 1.68 era la deuda, en 2057.

**Versiones y archivos cambiados:**
- **Versiones:** metodología `common-fund-1.69.0`, aplicación 1.69.0, estado 35.
- **Referencias de las pruebas:** `tests/fixtures/engine-reference-1.69.0.json` y hashes de identidad, regenerados.
- **Pruebas:**
  - round-13: riesgo alto sostenido desde 2050, rescate 2051, quita 2054, impago sin rescate 2052; en cuentas nocionales, el primer problema es la pensión (2066).
  - Población EUROPOP2023: usa el empleo del Ageing Report de forma explícita.
  - Opción de empleo: encendida por defecto.
- **Textos:** supuestos «Población y empleo», «Edad de jubilación» e «Impuestos sin modelo propio», ayuda del ajuste, lecturas de la AIReF en metodología y modelo 01. El contraste se regeneró.

## 24/11/2026 · Metodología 1.70.0: lote 1 de la revisión adversarial

**Origen.** `docs/REVISION-ADVERSARIAL-2026-11-24.md`: revisión con agentes, 60 hallazgos confirmados por tres escépticos cada uno, más uno del crítico final. **Decisión del autor:** corregir primero el lote 1, los errores que cambian resultados o pierden escenarios.

**Correcciones** (el número es el del informe):
- **«Mis escenarios» usa la cadena única de migraciones (14).** `src/shared/scenario-library.js` tenía su propia copia, parada en el estado 32. Una entrada guardada antes de la 1.67–1.69 volvía con impuestos fijos, edad congelada y sin el empleo de la AIReF, y quedaba sellada como estado 35 sin vuelta atrás. Ahora pasa por `configForStateVersion`, como el estado del navegador, las copias JSON y Excel. Una entrada sin sello cuenta como del estado 23, porque el sello empezó en el 24.
- **La clave de caché ya no junta escenarios distintos (13, 30).** En reparto y nocionales, `canonicalConfig` borraba el modo de transición y el estilo de cartera. Pero el modo decide si se aplica el freno de 2023, y el estilo cuenta si hay aportación extra. La consola, que calcula con la clave canónica, y `npm run sim` podían dar cifras distintas. Ahora solo se borran el reparto de la cuota y, sin transición, sus parámetros.
- **El contrafactual de 1985 ya no aplica a medias la opción de la AIReF (6, 18).** Tomaba solo su salario más bajo, sin empleo ni precios: la deuda de 2050 subía del 45,45 al 54,3 %. Ahora corre sin la opción (`src/retrospective-model-1985.js`) y vuelve al 45,45 %.
- **La base máxima de cotización sigue la inflación de cada año (7).** Usaba la del escenario (2 %) también en 2027–2030, cuando los precios suben como la AIReF. Ahora toma la del año anterior: la observada, la de la AIReF con la opción encendida, o la del escenario (`src/current-policy-v5.js`).
- **Con la opción de la AIReF, las desviaciones de productividad, salario y entradas empiezan en 2031 (9).** Hasta 2030, el cuadro de la AIReF ya incluye su productividad: restarla también, como hacía su perfil, contaba dos veces. Lo hace `shortRunDeviationYears` (`src/shared/short-run-employment.js`), que usan `deviationFactor` y el salario de `src/wage-path-v6.js`. Por defecto las desviaciones son 0 y nada cambia por esto.
- **Excel acepta exactamente los estilos de cartera del motor (2).** Rechazaba `collective-cdc` y aceptaba `global-equities-index`, que no existe. Ahora la lista sale de `CAPITALIZATION_STYLES`.

**Con las reglas de hoy** (1.69 → 1.70; solo la base máxima mueve el defecto):

| | 1.69 | 1.70 |
|---|---|---|
| Se rompe | 2050 | 2050 |
| Deuda 2050 | 117,4 % | 117,2 % |
| Deuda 2070 | 197,8 % | 197,4 % |
| Gasto en pensiones 2050 | 15,41 % | 15,41 % |

**El perfil de la AIReF** reproduce ahora su PIB real de 2027–2030 (2,00 / 1,90 / 1,80 / 1,69 %, antes 1,6 / 1,5 / 1,4 / 1,3). Su deuda de 2050 pasa del 126,4 al 121,6 %, frente a su 123 %. Su texto se actualiza.

**Comprobación.**
- `tests/adversarial-review-batch1.test.mjs`: una prueba por corrección. La biblioteca migra como la cadena única en cada estado; claves distintas para lo que cambia el resultado y la misma clave con los mismos años para lo que no; el contrafactual de 1985 da lo mismo con la opción y sin ella; la base máxima crece con la inflación del año anterior más los puntos legales; el perfil de la AIReF reproduce su PIB real; Excel acepta los estilos del motor.
- `tests/spending-gdp-follows-productivity.test.mjs` usa la nueva regla de inicio.
- La expresión de round-13 acepta la 1.70 y siguientes.
- **Versiones:** metodología `common-fund-1.70.0` y aplicación 1.70.0; estado guardado sin cambios (35). Referencia `engine-reference-1.70.0.json`, hashes regenerados y contraste regenerado.

## 24/11/2026 · Lote 2 de la revisión adversarial: textos, contraste y páginas

**Decisión del autor:** «Sí, lote 2». Sin cambios en el motor ni en los resultados (metodología 1.70.0).

**Contraste** (`scripts/contrast-external.mjs`):
- **PRTR (46).** La apertura trae los fondos de recuperación en ingresos y gastos (cifras con PRTR de 2025), y el motor mantiene esa parte del PIB a los dos lados, sin efecto en el saldo. Ahora se compara con la AIReF sin PRTR, restando al simulador los 0,8 puntos de la apertura (cuadros 17 y 18 del informe de seguimiento; `prtrOpening`).
  - **Lectura nueva:** hasta 2030, los ingresos del simulador quedan unos 0,9 puntos por debajo de los de la AIReF, sobre todo por el IRPF. Sus gastos quedan 0,4 por debajo. Saldo: −0,5.
  - Llevar el PRTR al calendario real en el motor sería otra mejora.
- **Identidad frente al FMI (47).** El saldo primario del FMI es ahora su saldo total más los intereses pagados, como el del simulador y como piden las reglas del propio fichero, y ya no su saldo primario sin ingresos por intereses. El residuo cambia de signo: su ajuste entre déficit y deuda sube la deuda en 1 punto. La lectura lo dice según el signo.
- **Fuentes con huella (51, 52):**
  - Las tres copias de Funcas pasan de pensiones_lab_2 a `data/sources/external-forecasts/` (huella comprobada).
  - Las cifras del Estudio 1/2026 de la AIReF pasan a `data/external-forecasts-airef-estudio-20260529.json`, con la huella del PDF, la cita completa (también el gráfico 20 y el cuadro 12) y el interés de 2030 (2,8).
  - El script comprueba las tres huellas.
- **Etiquetas (50, 54):** la tabla de largo plazo avisa de que en 2030 el simulador lleva el empleo y la inflación de la AIReF. La inflación del corto plazo dice qué es en cada fuente: deflactor, IAPC o IPC.

**Lecturas de la página de metodología:** ahora salen de las cifras, sin frases fijas.
- **Deuda frente a la AIReF (38, 48):** con su saldo primario, la deuda de 2050 pasa del 117,2 al 118,1 %, frente a su 123 %. El saldo primario explica 0,9 puntos; los otros 4,9, el crecimiento nominal y los intereses. Se quitan «el gasto en pensiones es el mismo» y «toda del saldo primario».
- **Jubilados frente a pensionistas (39, 49):** el simulador sigue la senda de edad desde la 1.68; el factor que queda es de cobertura. De 2026 a 2050, el gasto del simulador sube 2,37 puntos y el del Ageing Report 3,47 (antes decía «parecido»).

**Textos con defectos o cifras viejas:**
- **Inflación (11, 20):** actúa desde 2031; de 2027 a 2030 manda la de la AIReF. Corregidos la ayuda, el control del Laboratorio, el supuesto y las fórmulas del modelo.
- **RETA (21, 22):** «0,38 décimas» pasa a «casi cuatro décimas (0,38 puntos)»; las cifras se actualizan a la 1.70 (deuda de 2050 del 117,2 al 110,1 %, se rompe en 2052). La ayuda ya no da a entender que el defecto aplica la ley: el defecto la omite. Encenderla por defecto queda para el lote 3.
- **Comentarios y respaldos (12, 29, 37, 60):** `?? 0` pasa a `?? 1` en los impuestos sin modelo propio.
- **EUROPOP2023 (23):** su empleo del Ageing Report pide apagar también el de la AIReF.
- **Perfil de la AIReF (53):** su deuda objetivo es la de su escenario base, con su demografía.
- **Versión (43):** `package.json` lleva la versión de la aplicación, y una prueba lo comprueba.

**Modelo:**
- Salario de 2027 y 2070 (19): 31 107 € y 56 534 €, con la inflación y la productividad de la AIReF.
- Efecto de la productividad (24): cifras de la 1.70.
- Límites (25): el empleo de la AIReF a corto plazo.
- Contraste propio en el modelo 05 (28).
- Referencias de línea (26, 27): las del catálogo de ajustes apuntaban a otro ajuste. La prueba nueva comprueba que cada referencia con una sola clave apunte a su línea.

**Páginas:**
- **Números (40):** el signo menos de verdad (−) y la coma en metodología, sensibilidad, riesgo y los SVG de gráficos, abanicos y tornado, con `src/shared/number-format.js`.
- **Tornado (41):** colorea por el valor, no por la posición, así que una sola variante por debajo ya no sale como «arriba».
- **Riesgo (44):** el sello exportado cita el escenario que se calculó.
- **Importar (45):** el tamaño máximo sale con coma y desde su constante.

**Comprobación.** `tests/adversarial-review-batch2.test.mjs`:
- versión de `package.json`;
- referencias del modelo al catálogo de ajustes;
- saldo primario del FMI;
- comparación sin PRTR;
- huellas de las tres fuentes;
- sin `toLocaleString` en las páginas y vistas.

En el navegador, la página de metodología no tiene ningún guion delante de un número.

## 24/11/2026 · Metodología 1.71.0: lote 3 de la revisión adversarial (decisiones de método)

**Decisiones del autor:**
- **Veredicto:** declarar el margen y lo que queda fuera del índice.
- **RETA:** encenderla por defecto.
- **Salario de la AIReF:** declararlo.
- **Deuda cautiva:** declararla y que en una quita su exposición sea total.

**1 · El año en que se rompe, al filo (55, 56).**
- `describeRiskPath` guarda el «casi» más cercano (`nearMiss`): antes del primer año de riesgo alto, la variable que sola lo habría disparado, a la menor distancia de su umbral (`src/shared/sovereign-risk.js`).
- El veredicto lo dice cuando queda a menos de 0,5 unidades (`EDGE_GAP`, `src/domain/verdict.js`; lo pasa `src/shared/crisis-narrative.js`). Con las reglas de hoy: «Está al filo: en 2051, el indicador "Necesidades brutas de financiación" quedó a 0,30 puntos del PIB de su umbral…».
- En la consola, el titular del semáforo dice «Se rompe en 2052 (al filo)», y el texto al pasar el ratón lo explica (`src/domain/sustainability-light.js`).
- El modelo 04 declara que el índice deja fuera el saldo ajustado por el ciclo y la deuda neta, y lo que pesaría: con la deuda neta, el riesgo alto sostenido empezaría en 2027. La regla no cambia.

**2 · La reforma pendiente del RETA, por defecto (57).**
- `retaReform2032` pasa a 1: es ley y la AIReF la cuenta. Las cuotas de 2027–2031 no están aprobadas: su reparto es supuesto.
- **Estado 36:** los escenarios anteriores pasan a 1 (`moveToRetaReform`), como en la 1.67–1.69.
- **Con las reglas de hoy** (1.70 → 1.71): se rompe en 2052 (antes 2050); deuda de 2050 del 110,1 % (antes 117,2 %) y de 2070 del 179,7 % (antes 197,4 %). El gasto en pensiones no cambia.

**3 · El salario más bajo del ajuste de la AIReF (58).** Se declara en el modelo 01 (límites) y en `src/shared/short-run-employment.js`. Baja el salario de todos los ocupados, no solo el de los recién llegados, y con él las pensiones nuevas: unos 0,27 puntos de PIB menos de gasto en 2050. Explica parte de lo que el simulador gasta menos que la AIReF. Sin cambios en el motor.

**4 · Deuda pública cautiva (1, C1).**
- Su texto dice ahora que es un escenario estilizado: su bajo rendimiento es un supuesto, y el Estado no paga menos intereses por ello.
- En una quita, su exposición a la deuda pública es total (`src/current-simulation-core-v10.js`), sea cual sea la de la fila. Ejemplo: sistema mixto, transición lineal y quita del 30 % en 2045. El fondo cautivo pierde 226 000 millones; uno equilibrado, 37 000. Solo afecta a ese estilo, que no es el defecto.

**Comprobación.**
- `tests/adversarial-review-batch3.test.mjs`: el veredicto marca «al filo» cuando el «casi» queda por debajo de `EDGE_GAP`; el RETA está por defecto y migran los estados anteriores; la quita del estilo cautivo no depende de la parte de la fila.
- Se actualizaron las pruebas de la reforma del RETA y de round-13: rescate en 2053, quita en 2056, impago sin rescate en 2054, y la estación del primer año de riesgo alto en lugar de un año fijo.
- **Versiones:** metodología `common-fund-1.71.0`, aplicación 1.71.0, estado 36. Referencia `engine-reference-1.71.0.json`, hashes y contraste regenerados.
- **Textos:** supuestos (RETA, edad, impuestos sin modelo, población), ayuda del RETA y modelos 02 y 04.
- **Referencias de línea:** el script del diff ahora mueve todos los números de cada lista, no solo el primero. Las listas citadas antes de este lote pueden conservar algún número desplazado.

## 25/11/2026 · Lote 4 de la revisión adversarial: las pruebas que faltaban

**Decisión del autor:** «Sí, lote 4». Sin cambios en el motor ni en los resultados (metodología 1.71.0, estado 36).

**Pruebas nuevas** (`tests/adversarial-review-batch4.test.mjs`):
- **Los libros del motor hacia delante (34).** Cada año cuadran el fondo, el presupuesto, la deuda y sus añadas, la caja y el destino único de cada cotización. Se prueba en los sistemas de la comparación y en dos escenarios con medidas: recortes, rescate fiscal y quita. El bucle está en `tests/helpers/ledger.mjs`, y el contrafactual de 1985 usa el mismo.
- **La cadena de migraciones (35).** Una tabla de los estados 32 a 36 dice qué defectos recibe cada estado anterior: impuestos con el PIB, senda de edad, corto plazo de la AIReF y RETA.
- **El enlace compartido (15, 35).** Ida y vuelta sin perder lo apagado; un enlace del estado 33 migra; otra base, una versión desconocida o un ajuste desconocido se rechazan con una frase.
- **Misma clave, mismo resultado (30).** Para cada ajuste que la clave deja fuera (la mezcla en reparto, la transición sin transición, el estilo sin parte capitalizada, la mezcla en capitalización de golpe), las dos ejecuciones dan las mismas cifras. Se probó con presión: edad de 64 y edad congelada. Un campo que una ejecución omite y la otra escribe como 0 cuenta igual.
- **El tamaño del estado guardado (17).** Un estado con tres comparaciones y todos los calendarios llenos se escribe y se vuelve a leer.

**Arreglos que pedían las pruebas:**
- **Enlaces que no se abrían (15).** La consola ya no copia un enlace demasiado largo: dice «Este escenario es demasiado grande para un enlace: guárdalo en JSON y comparte el archivo.» (`linkTooLong`, `src/shared/share-link.js`). Al abrirlo, un código demasiado largo o con ajustes que esta versión no conoce da una frase (`rejected`) en lugar de abrir sin aviso el escenario del lector. La importación del CSV de series muestra la misma frase. Además, el aviso del enlace ya no desaparece: antes, «Calculando…» lo tapaba y luego se borraba, tanto el rechazo como «Abierto el escenario del enlace». Ahora queda en pantalla tras el primer cálculo (`src/pages/consola.js`; comprobado en la consola con los dos tipos de enlace).
- **Estados que no se volvían a leer (17).** Leer y escribir usan el mismo límite, `MAX_STATE_CHARS` (200 000 caracteres; antes solo leía hasta 50 000). Un estado completo ronda los 70 000. Si alguno lo pasara, `save()` no lo escribe y lo marca como fallo de guardado: la barra de cabecera avisa de que el cambio solo dura mientras la página está abierta.

**Pruebas que se aflojan o se refuerzan:**
- **Cuentas nocionales (32).** Ya no fijan que la pensión falle antes que la deuda: en 2066, la deuda queda a 0,014 puntos del umbral. Se comprueba la relación: el primer problema es el que llega antes, y el veredicto lo nombra (`tests/round-13.test.mjs`).
- **Perfil de la AIReF (36).** Su texto da la deuda (122 %) y el gasto de 2050 (15,9 %). La prueba comprueba que son las cifras del motor (`tests/reference-profiles.test.mjs`).

**Quedan fuera:**
- Un residuo de asignación medido de verdad (3): necesita acumular por cohortes la parte de reparto, que es un cambio del motor.
- Una huella del motor en la caché (16): hoy la protegen la metodología y los hashes de identidad.

## 25/11/2026 · Lote 5 de la revisión adversarial: inventario de Sites y alcance del empleo de la AIReF

**Decisión del autor:** «continúa», tras proponer un lote corto sin cambios en el motor. Metodología 1.71.0, estado 36: sin cambios en los resultados.

**1 · El inventario del paquete Sites nombra todo lo que se empaqueta (42).**
- `scripts/prepare-sites-package.mjs` añade a las huellas de las fuentes `data/external-contrast.json` y los capítulos de `docs/modelo/`. La página Metodología los muestra, así que forman parte de lo publicado.
- El README del paquete ya no dice que no va documentación interna. Dice que los capítulos del modelo van a propósito y que el resto de `docs/` no se publica.
- `tests/sites-inventory.test.mjs` busca cada archivo o carpeta fuera de `src/` que importan las páginas y comprueba que está en el inventario. Sin el arreglo, la prueba falla.

**2 · El empleo de la AIReF con otros ajustes (10): se declara, no se recalibra.**
- Los multiplicadores dan su empleo y su PIB con los ajustes de partida. Con otros ajustes son los mismos multiplicadores, y las palancas mueven el empleo. Medido en la 1.71, crecimiento del empleo en 2027–2030:
  - con la edad congelada: 1,74 / 1,50 / 1,35 / 1,31 %;
  - con 3 puntos más de cotización: 1,75 / 1,65 / 1,45 / 1,35 %;
  - con la jubilación a los 67: 2,74 / 3,25 / 2,04 / 1,33 %;
  - con EUROPOP2023: 1,29 / 1,06 / 0,93 / 0,90 %, porque su población de base no es la de la AIReF.
- La productividad no lo cambia, porque su desviación cuenta desde 2031.
- **Por qué no se recalibra:** que tus palancas muevan el empleo es lo que se espera de ellas. Recalibrar el impulso para cada escenario borraría su efecto.
- **Textos:** la ayuda de la opción lo dice en dos frases, y lo detallan el modelo 01 y el comentario de `src/shared/short-run-employment.js`.

## 25/11/2026 · Metodología 1.72.0: los arreglos del motor que quedaban de la revisión adversarial

**Decisión del autor:** «Sí, la 1.72». Juntos, con una sola regeneración de las referencias.

**1 · La revalorización con el desfase de la ley (8).**
- **Antes:** las pensiones en pago subían con la inflación del mismo año. Desde 2028, la lista de inflaciones del año anterior estaba vacía.
- **Ahora:** suben con la inflación del año anterior de la senda (`src/current-policy-v2.js`). Con la opción de la AIReF, en 2028–2031 es su deflactor de 2027–2030 (2,6 / 2,3 / 2,1 / 2,0 %); después, la del escenario.
- Con una inflación constante da lo mismo que antes. El contrafactual de 1985 no cambia.
- Así se cumple lo que ya decían la ayuda («índice rezagado») y los supuestos («Prior-year inflation proxy»).

**2 · El freno de las cuentas nocionales mira lo que se debe (4).** Con un recorte de pagos, compara las cotizaciones con la pensión prevista (`scheduledNdcBenefits`), no con la pagada. La reserva nocional se sigue cargando entera (`src/shared/ndc-options.js`). Antes, un recorte del 5 % aflojaba el freno un 1,7 %.

**3 · La quita alcanza al capital preservado (5).** El capital que guarda la lectura «conservar el capital» pierde la misma parte que el fondo (`src/creditor-fund-loss.js`). En el ejemplo, con estilo cautivo y una quita del 30 % en 2045, ese capital quedaba un 7,6 % por encima del fondo; ahora queda un 1,9 %, como el año anterior. Ninguna página lo muestra.

**4 · El residuo de asignación mide (3).** Las cohortes suman también la parte de reparto de su cotización (`paygContributions`). El residuo compara las tres partes (fondo, nocional y reparto) con la cotización de jubilación de la masa salarial. El peso de reparto se mide como los otros dos. Hoy da un error relativo de 3·10⁻¹⁴ en los seis sistemas: no hay fuga, y ahora se vería.

**5 · La pensión pagable pierde la inflación de cada año congelado.** Usa la de la AIReF en 2027–2030 y la del escenario después (`src/shared/payable-pension.js`). Solo cuenta si el rescate llega antes de 2031.

**Efecto con las reglas de hoy (1.71 → 1.72).** Solo lo mueve el desfase: en 2028–2030 las pensiones suben con la inflación del año anterior, que era más alta.

| Sistema | Deuda 2050, % PIB | Deuda 2070, % PIB | Se rompe |
|---|---|---|---|
| Reparto de hoy | 110,1 → 110,7 | 179,7 → 180,5 | 2052, al filo (a 0,23 puntos en 2051) |
| Cuentas nocionales | 97,8 → 98,3 | 113,4 → 114,1 | 2066 |
| Mixto progresivo | 129,0 → 129,6 | 217,4 → 218,3 | 2047 → 2046 |

- Con el RETA apagado, la deuda de 2050 pasa al 117,8 % (antes 117,2 %).
- El gasto en pensiones de 2050 sube 0,01 puntos.

**Comprobación.**
- `tests/methodology-172.test.mjs`: una prueba por arreglo.
- **Versiones:** metodología `common-fund-1.72.0`, aplicación 1.72.0, estado guardado sin cambios (36). Referencia `engine-reference-1.72.0.json`, hashes y contraste regenerados.
- **Textos:** supuestos (RETA) y modelos 03 y 04.

## 25/11/2026 · Metodología 1.73.0: el PRTR con su calendario

**Decisión del autor:** «El PRTR en el motor», la mejora que quedó abierta en el lote 2 de la revisión adversarial (46).

**Antes.** La apertura de 2026 son las cuentas de 2025 ×1,055, y trae el Plan de Recuperación de 2025: 0,8 puntos de PIB en ingresos y en gastos. El motor los mantenía para siempre en los otros ingresos y en los otros gastos. No movía el saldo, pero inflaba los dos lados, la base que se reparte a pensiones y la base de un recorte de otros gastos.

**Ahora** (`data/prtr-calendar-2026.js`, `src/fiscal-composition-v3.js`):
- **Calendario.** Es la diferencia entre los cuadros con y sin PRTR de la AIReF (informe de seguimiento del PFEMP, cuadros 17, 18 y 19): 1,25 % del PIB en 2026, 0,3 % en 2027, 0,2 % en 2028, 0,1 % en 2029 y 0 desde 2030. En 2026 la AIReF da 1,2 en ingresos y 1,3 en gastos con el mismo saldo; se toma la media de las dos cifras redondeadas.
- **Mismo importe a los dos lados.** Entra en ingresos y en gastos sobre el PIB del año, también cuando el gasto sigue su propio PIB de referencia (`src/fiscal-composition-v10.js`). No mueve el saldo, y el nivel de los demás ingresos no lo escala.
- **Fuera del reparto a pensiones.** Los fondos van a sus proyectos, así que no entran en la base de la que sale la parte de pensiones (`earmarkedRevenue`, `src/current-fiscal-v13.js`). La parte de 2026 se midió con una base que traía el PRTR de 2025. Para dar la misma transferencia sobre la base sin él, el motor la multiplica por 1,02537 (`pensionShareScale`). El ajuste guardado no cambia, así que no hace falta un estado nuevo. El desglose del presupuesto hace la misma cuenta (`src/budget-partitioner.js`).
- **Fuera de un recorte.** Un recorte de otros gastos no lo toca: ya lo protegía la regla de los programas casados. La cuenta que lee esa base de una ejecución sin recorte (`otherSpendingEligibleOf`, el coste de una receta en «Quién paga») ahora también lo quita.

**Efecto con las reglas de hoy (1.72 → 1.73).**
- La deuda, el gasto en pensiones, la pensión media y los intereses salen iguales a diez cifras en los cuatro sistemas de la referencia.
- Lo que falta a las pensiones cambia como mucho 0,005 puntos.
- Ingresos y gastos bajan 0,8 puntos de PIB desde 2030. En 2026 suben 0,45, porque el PRTR de 2026 es mayor que el de 2025.
- **Un recorte de otros gastos ahorra menos:** su base ya no lleva fondos europeos que se han acabado. Con un recorte del 5 % desde 2030, la deuda de 2050 pasa del 93,6 al 94,4 %, y el año en que se rompe, del 2062 al 2061.

**Contraste.** Contra las tablas sin PRTR de la AIReF, el simulador resta cada año su propio PRTR, no los 0,8 fijos. El crecimiento del gasto primario también va sin PRTR, como el gasto neto de la AIReF, y da las mismas cifras que en la 1.72. `prtrOpening` pasa a ser `prtr` en `data/external-contrast.json`.

**Comprobación.**
- `tests/methodology-173.test.mjs`: el calendario y el mismo importe a los dos lados; la base de pensiones sin el PRTR; un recorte no lo toca.
- `tests/adversarial-review-batch2.test.mjs` comprueba el calendario en el contraste. `tests/budget-share-sources.test.mjs` usa la base sin el PRTR y la escala; las cifras del modelo 02 §2.9 (0,295, 0,209 y 0,165) no cambian.
- **Versiones:** metodología `common-fund-1.73.0`, aplicación 1.73.0, estado guardado sin cambios (36). Referencia `engine-reference-1.73.0.json`, hashes y contraste regenerados.
- **Textos:** modelo 02 (§2.3, §2.9 y §2.10) y metodología.

## 25/11/2026 · Metodología 1.74.0: los intereses del fondo cautivo y la huella del motor

**Decisión del autor:** «hazlo», sobre lo que quedaba de la revisión adversarial: el hallazgo 1 (el estilo cautivo) y el 16 (la caché).

**1 · El fondo cautivo cobra lo que paga el Estado (1).**
- **Antes:** el estilo «Deuda Pública Cautiva» rendía un número fijo (como mucho un 1,4 % real, menos la represión). El Estado pagaba el tipo de mercado por toda su deuda. La diferencia no le llegaba a nadie: en 2070, cerca de 1,5 puntos de PIB al año.
- **Ahora** (`src/progressive-transition.js`, `src/current-fiscal-v13.js`):
  - El fondo cobra el cupón medio de la deuda que entra en el año (el tipo efectivo del año anterior), menos la represión, en términos reales.
  - La represión no cambia: actúa desde el 135 % del PIB de deuda y llega como mucho a 0,7 puntos.
  - El Estado se ahorra esa represión sobre los bonos del fondo: los activos del fondo al empezar el año, como mucho la deuda, y después de una quita si la hay (`captiveInterestSaving`). Así, lo que paga por esos bonos es lo que cobra el fondo antes de comisiones.
  - La comisión sigue siendo de al menos un 0,6 %. La guía, que no tiene el tipo del Estado, sigue mostrando la aproximación antigua.
- **Efecto.** La configuración de partida no cambia: las cifras de referencia son las mismas a diez cifras. Solo cambia el estilo cautivo, que no es el de por defecto. En el sistema mixto con ese estilo:
  - en 2070 el Estado se ahorra 0,35 puntos de PIB de intereses;
  - la deuda de 2070 pasa del 238,3 al 233,4 %;
  - el fondo pasa del 57,8 al 64,8 % del PIB y la pensión media de 23 423 a 23 907 €;
  - se sigue rompiendo en 2039.
  - Su rendimiento neto va de −0,75 % en 2027 a 1,33 % en 2070. Sigue por debajo de una cartera equilibrada: en el mixto progresivo, el fondo de 2070 es del 74,4 % del PIB, frente al 88,5 %.
- La etiqueta del estilo pasa a «~−0,7 %–1,3 % neto». Su texto y el modelo 03 lo explican.

**2 · La huella del motor en la caché (16).**
- `scripts/engine-fingerprint.mjs` calcula un SHA-256 de los ficheros .js y .json de `src/` y `data/`. `vite.config.js` lo pasa como `__ENGINE_FINGERPRINT__` al arrancar el servidor y al compilar.
- La clave de la caché de Sensibilidad y Riesgo lo lleva (`src/shared/result-cache.js`): un cambio del motor o de sus datos ya no reutiliza resultados viejos, aunque no se suba la versión. Fuera de Vite vale 'node'. En el servidor de desarrollo se calcula al arrancar: un cambio hecho después no la mueve hasta reiniciarlo. La compilación, de la que sale el paquete de Sites, la calcula siempre con los ficheros del momento.
- El inventario del paquete de Sites incluye el script.

**Comprobación.**
- `tests/methodology-174.test.mjs`: el rendimiento del fondo cautivo es el cupón del Estado menos la represión, y el Estado se ahorra la represión sobre los bonos del fondo, y nada con otro estilo.
- `tests/result-cache.test.mjs`: la clave lleva la huella, y la huella cambia con un fichero de datos.
- **Versiones:** metodología `common-fund-1.74.0`, aplicación 1.74.0, estado guardado sin cambios (36). Referencia `engine-reference-1.74.0.json` con las mismas cifras. Los hashes cambian porque las filas llevan dos campos nuevos. Contraste regenerado.

## 25/11/2026 · Metodología 1.75.0: lo que encontró la revisión de la 1.72–1.74

**Origen.** «Sigue con las mejoras», sin nada abierto. Una revisión independiente de los tres últimos cambios del motor encontró cuatro fallos, que se comprobaron en el código. **Decisión del autor:** «Sí, la 1.75».

**1 · El fondo cautivo pagaba dos veces los cupones de una quita (lo introdujo la 1.74).**
- **Antes:** la quita rebajaba el fondo por el valor presente del canje, que ya incluye los cupones más bajos y el plazo más largo. Después, el fondo cobraba esos mismos cupones bajos cada año. El año de la quita, en cambio, aún cobraba el cupón antiguo.
- **Ahora:** con el estilo cautivo, la quita le quita solo el nominal (`faceValueOnly`, `src/creditor-fund-loss.js`), y desde ese mismo año cobra el cupón de la deuda canjeada (`src/current-simulation-core-v10.js`). Las demás carteras siguen valorando el canje a precios de mercado.
- **Ejemplo:** sistema mixto, quita del 30 % en 2045 a 20 años, cupón del 0,5 % y descuento del 4 %. La pérdida del fondo pasa del 63,6 al 30,2 % (30 % del nominal; los bonos viejos valían algo menos que el nominal). El fondo de 2070 pasa de 1 523 000 a 1 642 000 millones, y la deuda de 2070 del 124,3 al 123,4 %. Con un cupón del 3 %, la pérdida pasa del 39,3 al 30,2 %.

**2 · El contrafactual de 1985 deflactaba el rendimiento del fondo cautivo con la inflación del escenario.** Antes de 2026, sus precios son los históricos (2 %). Ahora el modelo da su propia subida de precios (`inflationAt`, `src/retrospective-model-1985.js`). Antes, con una inflación del escenario del 3 %, el fondo llegaba a 2026 con el 75,5 % del PIB en vez del 85,3 %; ahora, con el 85,3 % en los dos casos.

**3 · Partidas del Estado mandaban a pensiones algo más de lo que ahorraban (se pasó en la 1.73).** La base para repartir el ahorro de un recorte por partidas aún llevaba el PRTR y no tenía la escala de la parte de pensiones. Desde 2030 mandaba un 1,7 % de más. Ahora hace la misma cuenta que el motor (`src/domain/consola-measures.js`).

**4 · La pensión pagable de la tabla de la consola lee la configuración de la ejecución** (`src/pages/consola.js`), no la de la pantalla. Solo cambiaba algo en el contrafactual de 1985, que corre sin el corto plazo de la AIReF, con un rescate antes de 2031.

**Efecto con las reglas de hoy:** ninguno; las cifras de referencia son las mismas.

**Comprobación.**
- `tests/methodology-175.test.mjs`: la quita del fondo cautivo es solo nominal y desde ese año cobra el cupón nuevo; en 1985 el fondo no depende de la inflación del escenario; un recorte por partidas manda a pensiones lo que ahorra (±1 %).
- **Versiones:** metodología `common-fund-1.75.0`, aplicación 1.75.0, estado guardado sin cambios (36). Referencia `engine-reference-1.75.0.json` con las mismas cifras; hashes (llevan la versión) y contraste regenerados. Modelo 03.

## 25/11/2026 · Aplicación 1.76.0: créditos, licencias y aviso legal

**Origen.** `docs/PUBLICACION-CUESTIONES-LEGALES-2026-11-25.md`. **Decisión del autor:** «Usa CC BY y AGPL y también el desarrollador Pep Logar AI Solutions».

- **Licencias.** El código, con GNU AGPL-3.0 o posterior, más un término de la sección 7 b: la interfaz de toda versión debe conservar el crédito «Pensiones Lab · Demarquía Planetaria · Cabeza Propia · desarrollo Pep Logar AI Solutions». Textos, gráficos y resultados, con CC BY 4.0. Los datos y documentos de terceros quedan fuera. Lo explica `LICENSE.md`; `package.json` declara `AGPL-3.0-or-later` y su autor.
- **Titular del copyright:** Todo en Tinta Pep Logar S.L. (Pep Logar AI Solutions), la empresa que el aviso legal de pensiones_lab_2 ya nombraba como responsable.
- **Pie común a las cinco páginas:** proyecto, desarrollador con enlace y correo, las dos licencias, «No es asesoramiento financiero» y un enlace al aviso. Es HTML estático, así que se ve aunque falle el JavaScript. `src/shared/credits.js` guarda los datos.
- **Cita de las exportaciones** (`src/shared/citation.js`): ahora nombra la iniciativa, el desarrollador y la licencia CC BY 4.0, que es la atribución que pide. El aviso añade «ni asesoramiento financiero».
- **Aviso legal y privacidad:** sección nueva al final de Metodología (`#aviso`), adaptada del borrador de pensiones_lab_2. Explica quién responde, qué es y qué no es, qué se guarda en el navegador y cómo borrarlo, por qué no hay aviso de cookies, el correo y su tratamiento, el alojamiento, y las licencias con la forma de citar.
  - Siguen marcados «Pendiente»: la inscripción en el Registro Mercantil, el plazo de conservación del correo, el proveedor y país del alojamiento, y el enlace público al código fuente.
  - La página va al ancla del enlace después de dibujar las secciones.
- **Fuentes de datos:** una frase dice que las cifras son elaboración propia y que las instituciones citadas no las avalan.
- **«Supuestos de otros»:** los dos perfiles empiezan por «Aproximación del simulador a los supuestos de…» y terminan con «No es una previsión ni un resultado de … ni está revisado por ella». Antes, el de la AIReF decía «tal cual».

**Sin cambios en el motor:** la metodología sigue en la 1.75.0 y la aplicación pasa a la 1.76.0.

**Comprobación.**
- `tests/credits.test.mjs`: el mismo pie en las cinco páginas, la cita con desarrollador y licencia, las licencias del repositorio y los perfiles.
- `tests/index-page.test.mjs`: ya no toma por páginas propias los enlaces externos a las licencias.
- Navegador: el pie cabe en la consola sin desplazar nada, y `metodologia.html#aviso` abre el aviso.

**Falta:** el texto completo de la AGPL en `LICENSE`. Tiene que ser la copia oficial (gnu.org), no reescrita.

**Completado el mismo día** (decisión del autor):
- **Licencia:** `LICENSE` es el texto oficial de la AGPL-3.0, descargado de gnu.org (34 523 bytes; SHA-256 0d96a4ff…abcb0).
- **Registro Mercantil:** la línea se quita.
- **Correo:** se guarda lo que haga falta para atender el mensaje y mejorar la aplicación; después se borra. El aviso da ese criterio en lugar de un plazo fijo.
- **Alojamiento:** Hostinger, con el centro de datos en Alemania (UE), según el autor (`CREDITS.hosting`).
- **Código fuente:** el aviso y `LICENSE.md` enlazan https://github.com/PepLogar/pensioneslabs3. El repositorio sigue privado hasta que el autor lo abra; antes habrá que decidir qué hacer con las copias de `data/sources`.
- El aviso ya no tiene nada «Pendiente». `tests/credits.test.mjs` lo comprueba.

## 25/11/2026 · Aplicación 1.77.0: «Beta» con la versión, y fallos y mejoras por correo

**Decisión del autor:** «Que aparezca claro, en la cabecera, la versión y que es una beta. También sería bueno incluir algo para que puedan enviar fácilmente comentarios sobre fallos y mejoras».

- **Etiqueta de versión.** La cabecera de las cinco páginas lleva, junto al nombre, la etiqueta «Beta · versión 1.77.0», en naranja. Al pasar el ratón: «Versión de pruebas: puede tener fallos y cambiar», con la metodología. «Beta» está en el HTML; el script (`src/shared/site-header.js`) añade la versión, que lee de `APP_VERSION`.
- **«✉ Fallos y mejoras»**, al lado. Abre el programa de correo del lector, dirigido a info@aisolutions.peplogar.com, con:
  - el asunto «Pensiones Lab 1.77.0 (beta): fallo o mejora»;
  - un hueco para el comentario;
  - debajo, los datos para reproducirlo: versión y metodología, página, enlace del escenario abierto y navegador.

  La página no envía nada. El lector ve el texto y puede cambiarlo o borrarlo antes de mandarlo. Si el escenario no cabe en un enlace, o el correo pasaría de 1 900 caracteres, se omite con una nota (adjuntar el JSON o pegar el enlace). Sin JavaScript, el enlace abre el correo con el asunto.
- El aviso legal ya cubre ese correo: quién lo recibe, para qué, cuánto tiempo se guarda y los derechos del lector.

**Comprobación.** `tests/site-header.test.mjs`: las cinco cabeceras, el contenido del correo y su límite de longitud. En el navegador, el correo de la consola sale con 609 caracteres, y Metodología carga sin errores.

## 25/11/2026 · Aplicación 1.78.0: portada, iconos e imagen para compartir

**Decisión del autor.** Una página de entrada con buen diseño, que sí se pueda navegar en el móvil. Debe:
- decir que la consola está pensada para ordenador: tiene demasiados ajustes para usarse en un teléfono, y por eso no hay versión para móvil;
- describir qué es Pensiones Lab y sus características;
- tener un único botón evidente para ir a la consola;
- decir que no es un simple simulador: hace falta conocer cómo funciona una economía, y «tú vas a ser el Consejo de Ministros», que decide impuestos, recortes en sanidad, deuda, reestructuraciones y rescates para encontrar la mejor solución.

**Hecho.**
- **La portada es `index.html`; la consola pasa a `consola.html`.**
  - Un enlace antiguo (`index.html#escenario=…`) sigue llevando a la consola con su escenario: la portada lo detecta en la cabecera, antes de dibujarse, y redirige.
  - Las exportaciones, el correo de comentarios y «Volver a la consola» apuntan ya a `consola.html`.
  - La importación del CSV de series acepta las dos direcciones en su cabecera.
- **Contenido de la portada, en bloques cortos:**
  1. «Tú eres el Consejo de Ministros», con el botón «Abrir la consola» y la nota de que es para ordenador.
  2. «No es un simple simulador»: las decisiones se mueven unas a otras, y hace falta entender la economía. La consola no da la respuesta: la busca el lector.
  3. «Lo que puedes decidir», en seis tarjetas: impuestos, gasto público (por partidas, sanidad incluida, con su tope), pensiones, el sistema, deuda y crisis (plazo, interés, rescate y quita) y el mundo.
  4. «Cómo está hecho», en ocho rasgos: por generaciones de 2026 a 2070, datos oficiales con fuente, contraste, veredicto, herramientas, escenarios que se guardan y comparten, privado y abierto.
  5. «¿Y en el móvil?»: el porqué de no tener versión para teléfono.
  6. «Qué no es».
  7. «Es una versión beta», con el enlace de comentarios.
  8. El pie común de créditos y licencias.

  Todo lo que se promete existe en la consola. Se comprobaron las siete partidas con sus topes (sanidad hasta el 13 %), los capítulos y los ajustes (105) y hasta 1 000 trayectorias en Riesgo.
- **Diseño.**
  - Sin nada de fuera: tipografía del sistema, ilustración e iconos en SVG propios.
  - Modo claro y oscuro, foco visible y sin movimiento si el lector lo pide.
  - A 375 px de ancho no hay desplazamiento lateral y el botón ocupa todo el ancho.
  - Su script (`src/pages/inicio.js`) solo pone la versión y el correo: unos 2 kB, sin motor ni datos.
- **Iconos e imagen para compartir** (`public/`, que ahora se copia tal cual al compilar):
  - `favicon.svg` en las seis páginas;
  - `apple-touch-icon.png` (180 px);
  - `og-image.png` (1 200 × 630), para la tarjeta que aparece al compartir el enlace.

  Las dos imágenes se generaron con Edge sin ventana a partir de HTML propio.
- **Límite:** `og:image` es una ruta relativa. Algunas redes piden la dirección completa: cuando haya dominio, conviene ponerla.

**Comprobación.** `tests/landing.test.mjs`: un solo botón a la consola, el aviso del móvil, la redirección de los enlaces antiguos, los iconos y que la portada no carga el motor. `credits` y `site-header` cuentan ya seis páginas. En el navegador se comprobaron escritorio, móvil (375 px), modo oscuro y la redirección.

**Dirección pública** (decisión del autor, el mismo día): https://demarquia.org/pensioneslab/, una carpeta del dominio, no su raíz.
- **Los enlaces que se escriben mantienen la carpeta.** El enlace del escenario que va en las exportaciones, el que se copia en la consola y el del correo de comentarios se construían con el dominio solo (`location.origin`), y habrían apuntado a demarquia.org/consola.html. Ahora usan la carpeta de la página (`appFolder`, `src/shared/credits.js`).
- **Portada.** `og:image` lleva la dirección completa (con su tamaño, 1 200 × 630), con `og:url` y un enlace canónico a https://demarquia.org/pensioneslab/.
- **Comprobado.** Se compiló y se sirvió `dist/` desde una carpeta `/pensioneslab/` en un servidor local:
  - la portada carga icono y versión;
  - la consola calcula (con el worker) y da «Se rompe en 2052 (al filo)»;
  - un enlace antiguo `index.html#escenario=…` llega a `consola.html` con su escenario.

  `tests/landing.test.mjs` comprueba los enlaces con la carpeta.

## 25/11/2026 · Aplicación 1.79.0: página de ayuda

**Decisión del autor.** Una ayuda en página aparte, que explique las partes básicas de la aplicación y cómo empezar. Lo importante:
- cómo volver a la configuración de hoy y resetear todos los ajustes, para empezar una partida nueva sin añadidos no deseados;
- cómo cambiar de sistema de pensiones;
- para qué sirven los preset y cómo usarlos.

**Hecho:** `ayuda.html`, con el aspecto de la portada y legible en el móvil. Su script es el de la portada (`src/shared/light-header.js`), sin motor ni datos.
- **1 · Empezar una partida nueva**, en primer lugar y destacada:
  - qué hace «Reglas de hoy»: devuelve todos los ajustes a España en 2026, también los de Ricos y empresas, Partidas y Calendario;
  - qué no toca: los escenarios guardados y tus límites;
  - que el botón apagado indica que ya estás ahí, y que Deshacer vuelve atrás;
  - el consejo de guardar antes de empezar y de cambiar una sola cosa cada vez.
- **2 · Las partes de la consola**, con un esquema propio en SVG de las cinco zonas numeradas: barra, ajustes, veredicto, gráficos y tabla.
- **3 · Cambiar de sistema**:
  - el desplegable «Sistema», con una línea para cada uno de los cinco;
  - que cambiar de sistema conserva el resto de los ajustes (para compararlos en limpio, primero «Reglas de hoy»);
  - la vista «Todos los sistemas», con su botón «Usar».
- **4 · Guardados y «Supuestos de otros»**: cómo guardar, abrir, borrar y llevar los escenarios a otro equipo. Los preset son los dos perfiles preparados, AIReF y Ageing Report: para qué sirven y cómo se abren. Abrir uno sustituye todos los ajustes, y Deshacer vuelve atrás.
- **5 · Primeros pasos:** cinco pruebas para aprender a mirar, sin respuesta correcta.
- **6 a 9:** cómo leer el veredicto (con las etiquetas exactas del motor), las otras herramientas, un glosario breve y «Si algo no va».
- **Enlaces:** «? Ayuda» en la cabecera de las cinco páginas de trabajo, y en la portada como texto bajo el botón, que sigue siendo el único.

**Comprobación.** `tests/help-page.test.mjs` compara los nombres de la ayuda con los de la consola, así que si se renombra algo, la prueba falla:
- los botones, incluido «Usar»;
- los cinco sistemas del desplegable;
- los siete capítulos y las cuatro pestañas;
- los dos grupos de «Guardados».

También comprueba que «Reglas de hoy» sustituye la configuración entera. En el navegador se comprobaron escritorio y móvil (375 px, sin desplazamiento lateral).

## 25/11/2026 · Paquete para Hostinger

**Decisión del autor:** «prepara el paquete para subirlo» a https://demarquia.org/pensioneslab/.

- **`npm run hostinger`** (`scripts/prepare-hostinger-package.mjs`). Hace una compilación aislada y la comprueba:
  - solo las siete páginas, los tres archivos de `public/` y `assets/`;
  - todas las referencias locales resuelven;
  - ninguna ruta empieza en la raíz del dominio, porque no funcionaría dentro de la carpeta.
- **El ZIP** lleva solo los archivos de la web, en su raíz, para descomprimirlo dentro de `public_html/pensioneslab`. Al lado, fuera del ZIP para no publicarlos, van el README con los pasos en hPanel, `inventory.json` (commit, versiones y huella de cada archivo) y la SHA-256 del ZIP.
- **Corrección en los dos empaquetadores:** una página nombrada dentro de un módulo (`'consola.html'`) se resuelve desde la raíz del documento, como hace el navegador, no desde `assets/`.
- **Generado:** `output/hostinger/pensioneslab-1.79.0-2026-11-25.zip`, desde el commit 6190f56.
  - 33 archivos y 129 referencias comprobadas.
  - SHA-256 F928E177…4C3D.
  - Descomprimido y servido desde `/pensioneslab/`, responden las siete páginas, el icono y la imagen, y la consola da «Se rompe en 2052 (al filo)».
  - No se ha subido nada.

**Publicado el 25/11/2026.** El autor subió la 1.79.0 a https://demarquia.org/pensioneslab/. Hubo dos tropiezos:
- primero, el ZIP se subió sin extraer, y la carpeta daba 403;
- después, se extrajo en una subcarpeta y en el administrador de archivos de otra web de la cuenta.

Desde fuera, saltando la caché del CDN, responden las siete páginas, los iconos y la imagen, y el ZIP ya no está. En el navegador, la consola calcula sin errores: «Se rompe en 2052 (al filo)», con la deuda en el 111 % en 2050 y el 180 % en 2070. El README del paquete avisa ahora de esos dos tropiezos.

## 25/11/2026 · Aplicación 1.80.0: los sistemas y sus supuestos

**Decisión del autor.** Una parte que diga de qué supuestos parte cada sistema, «bien detallado, porque es lo primero que se debe mirar: los supuestos desde los que se parte y cómo los maneja cada sistema».

**Hecho.**
- **Metodología › «Los sistemas y sus supuestos»**, la segunda sección, justo después de la Ficha (`src/domain/system-assumptions.js`).
  - **Lo que comparten todos**, en nueve puntos:
    - la misma España de 2026;
    - lo ganado hasta 2026 se respeta;
    - se cotiza lo mismo, el 22,15 %, y solo cambia a dónde va la parte de jubilación;
    - cada aportación va a un solo destino;
    - no hay fondo puente;
    - la edad sube como en el Ageing Report y la AIReF;
    - el mismo mundo y los mismos mercados (3 % real, 0,5 % de comisión);
    - el freno de 2023 solo actúa por defecto en Reparto.
  - **Una ficha por cada uno de los siete sistemas** de la comparación, incluidos Capitalización de golpe y Mixto de golpe, marcados como fuera de la lista «Sistema». Cada ficha dice:
    - qué es y cómo se calcula la pensión;
    - quién entra y cuándo, y a dónde va la cotización;
    - dónde se invierte el fondo, con la rentabilidad neta del motor (4,1 % con el fondo común y la cartera de dividendos; 2,5 % con la equilibrada);
    - qué pasa con las pensiones de hoy y si actúa el freno de 2023;
    - los ajustes que fija al elegirlo, con los nombres y las opciones de la consola;
    - la parte de la cotización que va a reparto, nocionales y fondo en 2027, 2030, 2035, 2040, 2050, 2060 y 2070, según la mide el motor;
    - en las transiciones, la parte que va al fondo según la edad en 2026, con la función del propio motor;
    - la deuda de 2050 y 2070, la pensión frente al salario y el fondo.
  - Las cifras medidas se guardan en `data/external-contrast.json` (sección 6 de `scripts/contrast-external.mjs`), así que la página no calcula nada al abrirse.
- **Corrección de lo dicho antes en la conversación:** en el Mixto progresivo los mayores de 48 también entran, con menos. Hasta 40 años en 2026 llevan el 50 %; con 44, el 37 %; con 48, el 24 %; con 60, el 14 %. En 2027 todavía no va nada al fondo: es el 21 % en 2040 y el 50 % en 2070, a medida que fallecen los pensionistas de hoy.
- **Ayuda › «De qué supuestos parte cada sistema»**, después de «Cambiar de sistema»: lo común y cómo los maneja cada uno, en lenguaje llano, con enlace a las fichas.
- **Consola:** al elegir un sistema (en el desplegable o con «Usar»), la barra de estado dice en una frase de qué parte y dónde están sus supuestos. Como el aviso de un enlace, se mantiene después del primer «Calculando…».

**Comprobación.** `tests/system-assumptions.test.mjs`:
- cada sistema tiene ficha, cifras y aviso;
- las partes guardadas son las del motor;
- los textos coinciden con las constantes de cada sistema;
- el reparto por edad es el que dicen las fichas;
- el freno solo actúa en Reparto;
- la sección va justo después de la Ficha, y la ayuda la enlaza.

En el navegador, al elegir Mixto progresivo sale el aviso y «Se rompe en 2046 (al filo)», y Deshacer vuelve a Reparto.

**Publicada la 1.80.0 el 25/11/2026** en https://demarquia.org/pensioneslab/, desde el paquete `pensioneslab-1.80.0-2026-11-25.zip` (commit 1fc69bc, SHA-256 82B615AE…66D5).

Comprobado desde fuera, saltando la caché del CDN:
- las siete páginas, los iconos y la imagen responden;
- el ZIP ya no está;
- la portada carga el script del paquete nuevo.

En el navegador:
- la cabecera dice «Beta · versión 1.80.0»;
- Metodología abre con «Los sistemas y sus supuestos» y sus ocho apartados;
- la consola da «Se rompe en 2052 (al filo)», sin errores.

## 1.81.0 · La consola apaga lo que no actúa con el sistema elegido (25/11/2026)

**Qué se vio.** Con «Reparto (hoy)», el capítulo «El sistema» mostraba en negro, como si actuaran:
- los ajustes del cambio a un fondo (edad de corte, años, parte que acaba en el fondo, cómo se hace, parte pública, doble relevo);
- dónde se invierte el fondo;
- la mezcla, con sus claves internas en inglés: «payg 34 % · ndc 33 % · funded 33 %».

Los de nocionales, en cambio, sí salían en gris.

**Medido con el motor.** Moviendo cada ajuste en cada sistema:
- en Reparto y en Nocionales ninguno cambia nada: no hay fondo;
- la cotización adicional a una cuenta propia sí actúa en todos;
- la mezcla actúa en el Mixto de golpe y en el Mixto con ahorro propio;
- dónde se invierte y el doble relevo actúan en los cuatro sistemas con fondo.

**Cambio.** Esos ajustes pasan a la lista de sistemas en que actúan (`SETTING_SYSTEMS`):
- los del cambio a un fondo y dónde se invierte: en los cuatro sistemas con fondo;
- la mezcla: en los tres mixtos.

Con Reparto o Nocionales salen en gris, como los de nocionales; se conservan y vuelven a negro al elegir un sistema con fondo. La mezcla se lee «Reparto 34 % · Nocionales 33 % · Fondo 33 %». El motor no cambia: los resultados son los mismos.

**Pendiente, sin tocar.** Dentro de un sistema con fondo, algunos ajustes solo actúan con ciertas formas de hacer el cambio. Por ejemplo, «años que dura» no cambia nada en el Mixto progresivo, que pasa al fondo según fallecen los pensionistas. Siguen en negro.

**Comprobación.** `tests/setting-systems.test.mjs`:
- en Reparto y Nocionales, moverlos todos a la vez deja el resultado igual, y salen en gris;
- la mezcla se lee en castellano.

En el navegador, con Reparto todos salen en gris salvo la cotización adicional, y con el Mixto progresivo vuelven a negro.

**Paquete 1.81.0 para Hostinger (25/11/2026).** `output/hostinger/pensioneslab-1.81.0-2026-11-25.zip`, del commit 4841310:
- 33 ficheros y 1,1 MB comprimido;
- SHA-256 3639B27A…D5133;
- las páginas en la raíz del ZIP;
- lleva la mezcla en castellano y las listas nuevas de sistemas.

**Publicada la 1.81.0 el 25/11/2026** en https://demarquia.org/pensioneslab/.

Comprobado desde fuera, saltando la caché:
- las siete páginas y los iconos responden;
- el ZIP y la carpeta anidada no están;
- la consola carga el script del paquete.

En el navegador:
- la cabecera dice «Beta · versión 1.81.0»;
- con Reparto, los ajustes de fondo y la mezcla salen en gris;
- la mezcla dice «Reparto 34 % · Nocionales 33 % · Fondo 33 %»;
- «Se rompe en 2052 (al filo)», sin errores.

## 1.82.0 · Consola y textos de la revisión adversarial (26/11/2026)

Arregla los puntos 9 a 22 de `docs/REVISION-ADVERSARIAL-2026-11-25.md`. El motor no cambia: los resultados son los mismos y no hace falta recalcular.

**Ajustes en gris.** Corrige dos errores de la 1.81.0 y uno anterior, medidos con el motor:
- **Cotización adicional:** con una cotización adicional a una cuenta propia, «Dónde se invierte el fondo» y la comisión actúan también en Reparto y en Nocionales, porque hay un fondo.
- **«Cómo se hace» en Reparto:** actúa mientras el freno de 2023 pueda aplicarse, porque cualquier modo distinto de «Ninguno» deja la ley de hoy y apaga el freno. En Nocionales no actúa. Los demás ajustes de transición no actúan en Reparto ni en Nocionales con ningún modo.
- **Comisión del Mixto progresivo:** actúa, porque su fondo común la limita al 0,15 % pero por debajo sí cuenta. Su ayuda lo dice.

**Pensión pagable.** La congelación y el recorte se aplican solo a la parte pública: pagable = (jubilación pública × Φ + renta de los fondos) / jubilados. Afecta a la columna «Pagable €/mes» y a la serie `pension_pagable_mensual`. Con Capitalización devuelve unos 200 €/mes en 2070 que antes se recortaban. Está explicado en `docs/modelo/03` §3.12.

**Casillas de la consola:**
- **Valores fuera de la lista.** Un valor que no está en la lista, por ejemplo de un enlace, un fichero o un escenario guardado, se muestra como «Otro valor (…)» en vez de pasar por la primera opción. Pasa también en el selector de sistema.
- **Límites.** La consola aplica el mínimo y el máximo de cada casilla. Fuera de ellos, dice «Entre X e Y» y no cambia nada.
- **Recorte de otros gastos.** Con un plan del Calendario, la casilla dice «Un plan propio», y el plan se cambia en esa pestaña. Antes mostraba «−1 % recorte», y escribir en ella borraba el plan.
- **«Reglas de hoy».** Se apaga cuando la configuración ya es la de hoy: compara valores, no el orden de las claves.
- **«Ricos y empresas».** Sin puntos de cotización extra, deja el tipo de hoy exacto, y «Cotización» ya no sale como cambiada.

**Textos:**
- **El semáforo** dice los años seguidos de `riskSustainYears`, no siempre «dos».
- **«Al filo»** dice «menos de 0,01» en vez de «0,00 puntos».
- **«Y con él llega a 2070»** solo aparece si la medida del lector llegó con el riesgo ya alto y el rescate deja años por delante.
- **El Excel** rotula las filas anteriores a 2026 del contrafactual «Contrafactual simulado 1985-2025», no «Histórico».
- **`docs/modelo/03`** ya no contradice al código:
  - explica `paygAccrualYears`;
  - da la revalorización real de 2028-2030 con la opción de la AIReF.

**Comprobación.** `tests/review-console-182.test.mjs` y `tests/setting-systems.test.mjs`, que miden con el motor los casos de los ajustes en gris.

**Pendiente.** Los ocho fallos del motor de la revisión (1-8), que piden versión de metodología y recálculo.

## 1.83.0 · Metodología 1.76.0: los fallos del motor de la revisión adversarial (26/11/2026)

Arregla los puntos 1 a 8 de `docs/REVISION-ADVERSARIAL-2026-11-25.md`. Cambian los resultados, así que se regeneran:
- la referencia del motor (`tests/fixtures/engine-reference-1.76.0.json`);
- las huellas;
- `data/external-contrast.json`.

El estado guardado no cambia (STATE_VERSION 36), porque no hay ajustes nuevos.

**1. Mortalidad de las cohortes.**
- **Qué pasaba:** una cohorte se construye con la población de mitad de año, así que la mitad nació un año antes que su etiqueta. EUROPOP2025 aplica m_x según la edad que se cumple en el año, y el motor la aplicaba medio año más joven.
- **Cambio:** supervivencia y divisores de renta a la edad + 0,5, con `COHORT_AGE_SHIFT` (`src/current-cohorts-v10.js`). También en el contrafactual de 1985.
- **Lo que no cambia:** la esperanza de vida a los 65 del vínculo legal y los años de cobro a los 65 siguen en la edad exacta.
- **Efecto en Reparto, medido solo:** un 1,8 % menos de jubilados en 2050. La deuda de 2050 baja unos 2,5 puntos, y la de 2070, unos 7,5.

**2. Bulto de jubilaciones de 2027.**
- **Cambio:** los ocupados de 65 años o más en 2026 siguen a los de 64: el mismo tamaño por unidad de peso, con su edad de jubilación aún por delante. Lo que el 65–74 del Ageing Report pide de más va a los grupos jóvenes, así que el total de ocupados de 2026 no cambia (22,44 millones).
- **Efecto:** las altas de 2027 pasan de 540.000 a 368.000 (observadas, unas 371.000), y las de 2028, de 433.000 a 382.000.

**Recalibración del corto plazo de la AIReF.** Sin el bulto, salen menos jubilados en 2027 y el empleo crece distinto en 2027-2030. Se recalibran `boost` y `productivity` (`src/shared/short-run-employment.js`) con los ajustes de partida, para que el empleo equivalente y el PIB real vuelvan a crecer como los de la AIReF: 1,9, 1,8, 1,6 y 1,5 %, y 2,0, 1,9, 1,8 y 1,7 %. Los impulsos de entrada pasan a 3,3 %, 33,3 %, 35,2 % y 40,9 % (antes 2,9 %, 28,3 %, 33,2 % y 39,8 %).

**3. Fondo cautivo.** Los jubilados cobran lo que el Estado paga por los bonos, menos la comisión. Se quita la media represión que nadie pagaba.

**4. Quita al fondo cautivo.** Con «solo nominal», el fondo pierde exactamente la quita sobre su valor, porque tiene los bonos a su nominal. Ya no depende del tipo de descuento.

**5. Rentas del fondo.** Cada cohorte guarda el tipo de su renta al jubilarse (`annuityHalfRate`) y la ajusta por lo que rinde por encima de ese tipo. Lo que se deje de pagar porque una reserva se agota sale en `fundedAnnuityShortfall`.

**6. «Sin rescate» con una medida propia.** El motor usa la misma regla que el texto (`hasActiveRescue`, `src/shared/stress-premium.js`): si el lector tiene una medida fechada, hay rescate y la prima de crisis se retira en él.

**7. Objetivo del 0 % al fondo.** Un sistema mixto con un 0 % no manda nada al fondo, de forma continua con objetivos pequeños. Antes saltaba al mixto de golpe, con un 33 %.

**8. Letras en los vencimientos de 2027.**
- **Cambio:** se quitan de la banda de 2027 los 58.000 M€ de letras, el 3,70 % del total, leído en la escala del gráfico del Tesoro. El resto se normaliza como antes (`es-treasury-2026-09-debt-policy-v3`).
- **Efecto:** las necesidades brutas de 2027 bajan unos 3,6 puntos de PIB, y el Mixto de golpe ya no tiene un año de riesgo alto falso en 2027.

**Resultados con los ajustes de partida, de la 1.82 a la 1.83:**

| Sistema | Se rompe | Deuda 2050 | Deuda 2070 | Gasto en pensiones 2050 |
|---|---|---|---|---|
| Reparto | 2052 → 2054 (al filo) | 110,7 → 104,4 | 180,5 → 169,5 | 15,42 → 15,21 |
| Nocionales | 2066 → 2066 (pensión) | 98,3 → 92,2 | 114,1 → 105,7 | 13,62 → 13,44 |
| Mixto progresivo | 2046 → 2047 | 129,6 → 124,1 | 218,3 → 208,0 | 13,74 → 13,55 |
| Mixto con ahorro propio | 2046 → 2047 | 129,9 → 123,6 | 215,1 → 203,3 | 14,22 → 14,02 |
| Mixto de golpe | 2039 → 2040 | 151,9 → 145,0 | 234,8 → 221,4 | 13,71 → 13,52 |
| Capitalización de golpe | 2027 → 2027 | 259,1 → 251,2 | 500,3 → 476,8 | 12,05 → 11,84 |
| Fondo desde 1985 | aguanta | 80,4 → 69,8 | 34,0 → 22,0 | 6,40 → 6,37 |

El orden de los sistemas no cambia.

**La palanca de la edad pesa más.** Con Reparto y la edad de jubilación en 66, se rompe en 2062, al filo, con una deuda del 142 % en 2070. Con 67, aguanta hasta 2070, con un 121 %. Hasta la 1.75, con 67 se rompía, y la prueba de `npm run sim` lo daba por hecho. Ahora acepta los dos veredictos.

**Reparto sigue al filo.** En 2053, las necesidades brutas quedan a 0,08 puntos del umbral, y con +10 puntos básicos de tipo real la ruptura vuelve a 2053. La narrativa:
- rescate en 2055 y quita en 2058;
- con «sin rescate», impago en 2056.

**Los perfiles de otros se alejan de lo publicado.** Sus ajustes siguen tal como los publican las instituciones (decisión del 24/11); solo cambian los márgenes de las pruebas y los textos:
- **Ageing Report:** gasto medio de 2022–2050 del 14,25 % (publicado, 14,6 %) y del 16,1 % en 2050 (16,3 %). Hasta la 1.75 quedaba a menos de 0,1 puntos, en parte porque las cohortes morían medio año más jóvenes. Margen: 0,4 puntos.
- **AIReF:** 15,7 % en 2050 (16,3 %) y deuda de 2050 del 115 % (123 %). Márgenes: 0,7 puntos y 9 de deuda.

**Textos actualizados con las cifras nuevas:**
- **Impuestos sin modelo propio:** fijos, deuda de 2070 del 220 % y ruptura en 2047, no en 2054.
- **RETA:** sin la reforma, deuda de 2050 del 111,4 % y ruptura en 2051.
- **`docs/modelo/04`, «Al filo»:** 0,08 puntos en 2053.

**Comprobación.** `tests/methodology-176.test.mjs` tiene una prueba por punto. Se actualizan:
- los años de la narrativa (`tests/round-13.test.mjs`);
- el exceso del caso de presión del freno de 2023 (unos 0,0008).

## Por qué los perfiles del Ageing Report y de la AIReF se alejan de lo publicado (26/11/2026, 1.83.0)

Medido con el motor, sin cambiar nada.

**1. Antes coincidían, en parte, por dos errores.** Gasto en pensiones del perfil del Ageing Report:

| | Media 2022–2050 | 2050 |
|---|---|---|
| 1.82 | 14,53 % | 16,34 % |
| 1.83 sin la mortalidad nueva | 14,37 % | 16,34 % |
| 1.83 | 14,25 % | 16,12 % |
| Publicado, actualizado como la regla | 14,6 % | 16,3 % |

- **El bulto de altas de 2027** sumaba 0,16 puntos a la media, porque inflaba los primeros años.
- **La mortalidad medio año más joven** sumaba 0,12 a la media y 0,22 a 2050.
- **En el perfil de la AIReF** pasa lo mismo: 14,28 → 14,01 de media y 15,88 → 15,67 en 2050.
- **La recalibración del corto plazo** apenas cuenta: 0,02 puntos.

**2. La mortalidad nueva es la buena también para el Ageing Report.** La convención se comprobó en las dos ediciones: P(x+1, t+1) − migración = P(x, t) · (1 − q(m_t(x+1))).
- **EUROPOP2023:** error medio de 0,00001 con m_t(x+1), frente a 0,0049 con m_t(x).
- **EUROPOP2025:** 0,00002 frente a 0,0049.

**3. Dónde queda la distancia.** Se compara con el Ageing Report actualizado (× 0,9457), con su población:
- **No está en 2050:** −0,22 puntos.
- **Está a mitad de camino:** 14,58 % frente a 15,33 % en 2040 (−0,75).
- **Viene de la jubilación:** 11,25 % frente a 12,31 % en 2040 (−1,06). Las otras pensiones, que siguen la ratio del Ageing Report, salen 0,31 por encima.

**4. Ni las altas ni la pensión media lo explican.**
- **Altas:** en 2030–2040 crecen más en el simulador (+52 %) que las implícitas del Ageing Report (+43 %, gasto en altas entre tasa de sustitución inicial). Las de 2027 coinciden con las observadas (368.000 frente a unas 371.000).
- **Pensión media frente al salario:** cae casi igual (−6,9 % frente a −7,4 %).
- **Lo que difiere es el número de jubilados acumulado.** El Ageing Report implica unos +25 % de pensionistas de jubilación en la década (su gasto de jubilación, +18,1 %, ajustado por su pensión media y sus cotizantes). El simulador hace +21 %.
- **Cobertura (jubilados entre población de 65 años o más, EUROPOP2023):** en el simulador baja de 0,69 en 2026 a 0,64 en 2035–2040 y sube a 0,71 en 2050. Los pensionistas de 65 años o más del Ageing Report entre esa población van de 0,81 a 0,79 y a 0,86, pero incluyen viudedad e incapacidad, así que no son comparables del todo.
- **Mortalidad de los jubilados:** en el simulador mueren un 3,9 % al año en 2030, frente al 3,3 % de toda la población de 65 años o más. Encaja con que entre los jubilados haya más hombres, y con las bajas observadas de jubilación, alrededor del 4 % del stock.

**5. Lo que no se puede cerrar con el anexo.** El anexo no da el número de pensionistas de jubilación ni su mortalidad, solo el total, los de 65 años o más y el gasto por clases. Para saber si el Ageing Report supone más entradas, menos muertes o más cobertura de las mujeres (su «efecto cohorte»), haría falta la ficha de España del Ageing Report, que no está en el proyecto.

**Deuda de la AIReF, 115 % frente a 123 %.** Sigue la explicación del 24/11 (saldo primario), con unos 7 puntos menos por el menor gasto en pensiones de la 1.76.

**Sin cambios.** Los perfiles siguen tomando los supuestos como los publican.

### Ficha de España del Ageing Report 2024: la incapacidad que pasa a jubilación a los 65 (26/11/2026)

**Fuente.** Comisión Europea, *2024 Ageing Report – Country fiche for Spain* (18/04/2024), descargada de economy-finance.ec.europa.eu el 26/11/2026. Está en `data/sources/ar2024-fiche-es/2024-ageing-report-country-fiche-Spain.pdf`, fuera de git: 1.305.914 bytes, SHA-256 073dca6b182b575cb78abe236e77db5014e78319cd0a0563e7ddaa161a307e3d.

**Lo que dice la ficha:**
- **Cuadro 13:** la cobertura de la jubilación contributiva, como parte de todos los pensionistas, es del 67 % en 2022, el 69 % en 2030, el 73 % en 2040, el 77 % en 2050 y el 78 % en 2060 y 2070. Con su total de pensionistas, salen 7,68 millones de jubilados en 2030, 9,85 en 2040 y 12,02 en 2050.
- **Cuadro 17:** altas de jubilación, 427.000 en 2030, 550.000 en 2040 y 527.000 en 2050. Las del simulador, con el perfil, son 429.000, 585.000 y 535.000: las entradas coinciden.
- **Págs. 11 y 60 de la ficha (10 y 59 del PDF):** las pensiones de incapacidad se registran como de jubilación a los 65 años, y el modelo no tiene altas de incapacidad después de los 64. Esas personas entran en el stock de jubilación sin contar como altas.

**Lo que falta en el simulador:**
- **Dónde se pierden:** sus «otras pensiones» siguen la ratio del Ageing Report (gasto total − jubilación contributiva), que ya saca la incapacidad a los 65 (`otherPensionSpendingShare`, `src/model-current-v10.js:186`). Sus jubilados solo salen de quienes trabajan. Así, quienes pasan de incapacidad a jubilación después de 2026 no están en ningún sitio.
- **Cuánto son:** la Seguridad Social, a 1/9/2026, cuenta 330.614 pensiones de incapacidad de 60–64 años (62 % hombres, 1.344 €/mes), 119.171 de 65–69 y casi ninguna desde los 70. Son unas 66.000 personas al año.
- **Estimación (supuestos):** las entradas siguen la población de 65 años y la tasa de incapacidad de 60–64 del cuadro A2; mortalidad de EUROPOP y pensión constante en euros reales. Gasto que falta, en % del PIB:

| | 2030 | 2035 | 2040 | 2045 | 2050 | 2060 | 2070 |
|---|---|---|---|---|---|---|---|
| Perfil del Ageing Report (EUROPOP2023) | 0,26 | 0,54 | 0,77 | 0,94 | 1,01 | 0,95 | 0,84 |
| Reglas de hoy (EUROPOP2025) | 0,25 | 0,53 | 0,74 | 0,89 | 0,97 | 0,93 | 0,86 |

**Lo que explica:**
- **Hasta 2040, casi toda la distancia en jubilación** con el Ageing Report: −0,41, −0,91 y −1,06 en 2030, 2035 y 2040.
- **Después la sobrepasa.** En 2050 faltan 0,55 y la estimación da 1,01. En los años 2040 el simulador da más altas que el Ageing Report (585.000 frente a 550.000 en 2040). Aún no está medido por qué.
- **En 2050, la coincidencia de antes era otra vez casual:** dos diferencias de signo contrario.

**Pendiente, decisión del autor.** Arreglarlo es un cambio del motor que afecta a todos los sistemas: añadir esas entradas a la jubilación pública a los 65, con la pensión media de incapacidad y la mortalidad de las cohortes. Sumaría alrededor de 0,75 puntos de gasto en 2040 y 1 punto en 2050, y adelantaría las rupturas.

## 1.84.0 · Metodología 1.77.0: la incapacidad pasa a jubilación a los 65 (26/11/2026)

Decisión del autor («Sí, añádela»), tras la ficha de España del Ageing Report (entrada anterior).

**Cambio.**
- **Quién entra:** cada año, desde 2027, entran en la jubilación pública a los 65 los pensionistas de incapacidad que cumplen esa edad. Son un quinto del stock de 60–64 de 2026, según la población de 65 años y la tasa de incapacidad del cuadro A2 (`data/disability-retirement-2026.js`).
- **Con qué pensión:** la media de incapacidad de 60–64, que sigue a los salarios hasta la entrada.
- **Cómo entran:** como jubilados con pensión protegida, sin fondo, sin cuenta nocional y sin reparto nuevo, por el enganche `retirementEntries` del núcleo. Se cuentan en `reclassifiedRetirementEntries`, no en las altas.
- **Lo que no cambia:** las otras pensiones siguen la ratio del Ageing Report, que ya las sacaba a los 65.
- **El contrafactual de 1985** no lo lleva: es un experimento sintético con su propia apertura.

**Efecto.** Unas 66.000 entradas al año, 1,3 millones de jubilados más en 2050 y alrededor de 1 punto de PIB de gasto. Afecta a todos los sistemas, porque esas pensiones son públicas en todos.

| Sistema | Se rompe (1.76 → 1.77) | Deuda 2050 | Deuda 2070 | Gasto en pensiones 2050 |
|---|---|---|---|---|
| Reparto | 2054 → 2049 (al filo) | 104,4 → 117,1 | 169,5 → 209,1 | 15,21 → 16,32 |
| Nocionales | 2066 → 2057 (al filo) | 92,2 → 104,9 | 105,7 → 141,8 | 13,44 → 14,55 |
| Mixto progresivo | 2047 → 2043 (al filo) | 124,1 → 137,1 | 208,0 → 251,0 | 13,55 → 14,66 |
| Mixto con ahorro propio | 2047 → 2043 (al filo) | 123,6 → 136,6 | 203,3 → 246,1 | 14,02 → 15,13 |
| Mixto de golpe | 2040 → 2037 (al filo) | 145,0 → 158,6 | 221,4 → 267,0 | 13,52 → 14,62 |
| Capitalización de golpe | 2027 → 2027 | 251,2 → 266,0 | 476,8 → 544,8 | 11,84 → 12,94 |

El orden de los sistemas no cambia.

**Reparto.**
- **Al filo:** las necesidades brutas de 2048 quedan a 0,18 puntos del umbral, y con +10 puntos básicos de tipo real la ruptura pasa a 2047.
- **Narrativa:** rescate en 2050 y quita en 2053; con «sin rescate», impago en 2051.
- **La edad:** con 66 se rompe en 2053, y con 67, en 2058 (en la 1.76 aguantaba).

**El Ageing Report, ahora.** Con sus supuestos, el simulador sigue su gasto actualizado hasta 2040: 13,68, 14,58 y 15,42 % en 2030, 2035 y 2040, frente a 13,55, 14,61 y 15,33 %. Después lo supera: +0,58 en 2045, +0,97 en 2050 y +1,19 en 2060.
- **Por qué:** en los años 2040 el simulador da más altas de jubilación (unas 600.000 al año, frente a unas 540.000 del Ageing Report, cuadro 17).
- **Hasta la 1.76** esa diferencia tapaba la de la incapacidad.
- **Es lo siguiente que hay que mirar.**

**Perfiles.**
- **Ageing Report:** 14,85 % de media y 17,3 % en 2050 (margen de 1,1 puntos).
- **AIReF:** 16,8 % en 2050 y deuda del 129 % (márgenes sin cambio).
- **Los textos de los perfiles** lo dicen con las cifras del motor.

**Textos actualizados:**
- **Impuestos sin modelo propio:** fijos, deuda de 2070 del 263 % y ruptura en 2045.
- **RETA:** sin la reforma, deuda de 2050 del 124,3 % y ruptura en 2047.
- **`docs/modelo/01`, `03` y `04`.**

**Comprobación.** `tests/methodology-177.test.mjs`:
- las entradas y su tamaño;
- que se pagan como pensión protegida;
- que las otras pensiones no cambian;
- que el gasto sigue el del Ageing Report hasta 2040.

Se regeneran la referencia del motor (`engine-reference-1.77.0.json`), las huellas y el contraste.

### Por qué el simulador da más altas de jubilación en los años 2040 (26/11/2026, 1.84.0)

Medido con el motor y el perfil del Ageing Report, sin cambiar nada.

**Dónde está el exceso.** Altas por década, frente al cuadro 17 de la ficha (interpolado entre sus años):
- **2030–2040:** 4,91 millones en los dos.
- **2040–2050:** 5,97 millones frente a unos 5,4–5,6. El exceso es de unas 400.000–500.000 altas, con un pico de 633.000 en 2044.
- **2050–2060:** 4,89 frente a 4,93.

**Altas entre población de 66 años:**

| | 2030 | 2035 | 2040 | 2044 | 2050 | 2060 |
|---|---|---|---|---|---|---|
| Simulador | 0,63 | 0,64 | 0,76 | 0,82 | 0,85 | 0,83 |
| Ageing Report | 0,62 | — | 0,72 | — | 0,84 | 0,80 |

El simulador salta entre 2035 y 2040, y el Ageing Report sube poco a poco.

**Causa: el escalón de la apertura.**
- **Quién se jubila:** en el simulador, solo los que estaban ocupados en 2026, más las entradas posteriores.
- **Cómo se reparten esos ocupados por edad** (`initialCohorts`, `src/current-cohorts-v10.js`): con una tasa plana dentro de cada grupo del Ageing Report. Con EUROPOP2025 es el 80 % de la población a todas las edades de 25 a 54, y el 67 % desde los 55 (con EUROPOP2023, 83 % y 68 %).
- **Qué produce:** las generaciones nacidas hasta 1971 llegan a la jubilación con una cobertura del 67 %, y las nacidas desde 1972, que se jubilan hacia 2038, con la del 80 %.
- **Lo que pasa en la realidad:** el empleo baja poco a poco desde los 45.
- **Lo que hace el Ageing Report:** su modelo de empleo por edad simple lo suaviza.

**Lo que haría falta.** Repartir los ocupados de 2026 por edad simple con una tasa que baje dentro de cada grupo, por ejemplo con las tasas de empleo por grupos de 5 años de la EPA del INE, manteniendo el total de cada grupo. Bajaría el pico de altas de los años 2040 y el exceso sobre el Ageing Report desde 2045. Pide un dato que no está en el proyecto y un cambio del motor.

### Las altas de los años 2040: el escalón no basta, la causa es de estructura (26/11/2026, 1.84.0)

**Dato descargado.** INE, EPA, tabla 65109 «Ocupados por sexo y grupo de edad», media de 2025 T4 a 2026 T3 (`data/sources/epa-2026/ine-65109-ocupados-sexo-edad.json`, SHA-256 6fff72fa674247c4e50cce8e89ada4db03eee4db5cfe7a2cc129d3bf3b443e70). Se resume en `data/epa-employment-2026.js`, que el motor todavía no usa.

**Prueba (deshecha).** Se repartieron los ocupados de 2026 dentro de cada grupo del Ageing Report con la tasa de la EPA por grupos de 5 años y sexo.
- **El reparto queda escalonado:** 84 % a los 40–44, 82 % a los 45–49, 80 % a los 50–54, 73 % a los 55–59 y 60 % a los 60.
- **Las altas no mejoran:**

| | 2030 | 2040 | Década 2040–2050 | 2050 |
|---|---|---|---|---|
| 1.84 | 429.000 | 585.000 | 5,97 M | 535.000 |
| Con la EPA | 394.000 | 576.000 | 6,06 M | 560.000 |
| Ageing Report | 427.000 | 550.000 | ≈5,5 M | 527.000 |

**Lo que revela.**
- **Quién se jubila:** en el simulador, solo quienes estaban ocupados en 2026, más los que entran después. La cobertura de cada generación es su tasa de empleo de 2026.
  - **Generaciones de 1962–1971:** del 60 al 73 %. Se quedan cortas: en la realidad, y en el Ageing Report, también se jubila quien estaba en paro o inactivo con una carrera cotizada.
  - **Generaciones de 1972–1986:** del 80 al 84 %, más las entradas, todas se jubilan. Se pasan.
- **Por qué casaba 2030:** el reparto plano de 55–64 inflaba el empleo de los 60–64 y compensaba lo primero por casualidad.
- **Altas entre población de 66 años** con la EPA: 0,58 en 2030 y 0,89 en 2050. El Ageing Report da 0,62 y 0,84.

**Arreglo de fondo, pendiente de decisión del autor.** Dar a cada generación la cobertura de jubilación de toda su carrera, no la de su empleo en 2026:
- jubilar también a los no ocupados con carrera;
- no jubilar a todos los ocupados.

Por ejemplo, calibrar por generación la parte de la población que llega a una pensión contributiva con las altas del cuadro 17 y la población de su edad (R), y usar la EPA para el reparto por edad y sexo. Es un cambio del motor mayor que los anteriores.

### Cobertura de jubilación por generación: diseño y código, apagado (26/11/2026)

Decisión del autor: adelantar el diseño y el código esta noche; calibrar y encender otro día. Apagado, el motor da exactamente los mismos resultados (pasan `tests/engine-reference` y `tests/engine-identity`), así que no hay que recalcular nada.

**Interruptor.** `data/career-coverage-2026.js` (`enabled: false`). El modelo acepta otra tabla con la opción `careerCoverageTable` de `createCurrentModelV10`; así lo prueban los tests y así se calibrará.

**Qué hace encendido** (`src/current-cohorts-v10.js`, `initialCohorts`; `src/current-simulation-core-v10.js`, al jubilarse):
1. **Reparto de los ocupados de 2026** por edad y sexo, dentro de cada grupo del Ageing Report, con las tasas de la EPA por grupos de 5 años (`data/epa-employment-2026.js`). Los totales de cada grupo no cambian. Los de 65 años o más siguen continuando a los de 64.
2. **No ocupados con carrera (`extra`).** Una parte de la población de cada generación y sexo, sin empleo en 2026, se añade a las cohortes.
   - No trabaja ni cotiza, y no cuenta como ocupada (`inactive`).
   - Lleva su derecho anterior por `inactiveCareerShare` (0,7) de una carrera completa.
   - Se jubila a su edad, como jubilada y como alta.
3. **Carrera incompleta (`noClaim`).** Una parte de los ocupados de 2026 de cada generación trabaja y cotiza, pero al jubilarse no llega a la pensión contributiva pública.
   - Pierde el derecho anterior y el de reparto nuevo, y su saldo nocional se anota como extinguido.
   - Cobra su fondo privado si lo tiene.
   - No cuenta como jubilada (S).

**Comprobación.** `tests/career-coverage.test.mjs`, con una tabla de ejemplo:
- apagado no hace nada;
- los ocupados de 2026 suman lo mismo;
- los no ocupados con carrera no trabajan y suman jubilados;
- los de carrera incompleta cotizan, no suman jubilados, y las cuentas nocionales cuadran.

**Falta, para encenderlo:**
- calibrar `extra` y `noClaim` por generación y sexo (R), con las altas del cuadro 17 de la ficha del Ageing Report entre la población de su edad, de modo que 2030 y los años 2040 cuadren a la vez;
- recalibrar el corto plazo de la AIReF;
- metodología 1.78, con las referencias, el contraste y los textos rehechos.

## 1.85.0 · Metodología 1.78.0: cobertura de jubilación por generación, calibrada y encendida (26/11/2026)

Continúa la entrada anterior («Cobertura de jubilación por generación: diseño y código, apagado»). La tabla, `data/career-coverage-2026.js`, ya está calibrada y encendida.

**Calibración (R).**
- **Forma de la curva:** un cambio neto de cobertura por año de nacimiento, lineal entre nodos y plano fuera de ellos.
- **Nodos:** las generaciones que se jubilan en los años publicados del cuadro 17 de la ficha del Ageing Report: 1964 → 2030, 1974 → 2040, 1984 → 2050 y 1994 → 2060.
- **Ajuste:** con los supuestos del Ageing Report (`ref:ageing-report-2024`), sus altas igualan las de esos años: 427.000, 550.000, 527.000 y 458.000.
- **Resultado:**
  - nacidos hasta 1964, +6,1 % de su población como no ocupados con carrera, que baja a cero hacia 1969;
  - nacidos desde 1974, entre el 5,2 % y el 6,2 % de los ocupados de 2026 sin pensión contributiva.
- **Lo que se descartó:**
  - una calibración año a año contra el cuadro interpolado, porque la interpolación lineal borra el pico de los años 2040 que el Ageing Report sí tiene: salían proporciones con ruido de hasta el 17 %;
  - el nodo de 2070, porque pedía añadir no ocupados de 22 años, que ya entran después como nuevas entradas. 2070 queda por debajo: 460.000 frente a 502.000.
- **Ritmo de altas** con los supuestos del Ageing Report: 380.000 en 2028, 495.000 en 2035, 604.000 en 2044 (el pico), 527.000 en 2050 y 499.000 en 2052.

**Corto plazo de la AIReF recalibrado.** Impulsos de entrada de 3,4 %, 35,3 %, 37,3 % y 43,4 % en 2027–2030 (1.77: 3,3 %, 33,3 %, 35,2 % y 40,9 %). El empleo y el PIB vuelven a crecer como los suyos.

**El Ageing Report, ahora.** Gasto frente a su senda actualizada:

| | 2030 | 2035 | 2040 | 2045 | 2050 | 2060 |
|---|---|---|---|---|---|---|
| 1.77 | +0,13 | −0,03 | +0,09 | +0,58 | +0,97 | +1,19 |
| 1.78 | +0,05 | −0,03 | +0,07 | +0,34 | +0,64 | +0,77 |

Lo que queda en 2050 está a medias entre la jubilación (+0,31) y las otras pensiones (+0,33). Las otras pensiones ya arrancan en 2026 con 0,23 puntos más, por diferencias de definición.

**Resultados con los ajustes de partida, de la 1.84 a la 1.85:**

| Sistema | Se rompe | Deuda 2050 | Deuda 2070 | Gasto en pensiones 2050 |
|---|---|---|---|---|
| Reparto | 2049 → 2050 (al filo) | 117,1 → 115,9 | 209,1 → 199,1 | 16,32 → 16,07 |
| Nocionales | 2057 → 2060 (al filo) | 104,9 → 104,0 | 141,8 → 135,2 | 14,55 → 14,36 |
| Mixto progresivo | 2043 → 2043 (al filo) | 137,1 → 136,0 | 251,0 → 243,6 | 14,66 → 14,47 |
| Mixto con ahorro propio | 2043 → 2043 (al filo) | 136,6 → 135,5 | 246,1 → 237,8 | 15,13 → 14,92 |
| Mixto de golpe | 2037 → 2037 | 158,6 → 157,5 | 267,0 → 258,9 | 14,62 → 14,43 |
| Capitalización de golpe | 2027 → 2027 | 266,0 → 265,0 | 544,8 → 536,8 | 12,94 → 12,80 |

**Reparto.**
- **Al filo:** las necesidades brutas de 2049 quedan a 0,22 puntos del umbral, y con +10 puntos básicos de tipo real la ruptura pasa a 2049.
- **Narrativa:** rescate en 2051 y quita en 2054; con «sin rescate», impago en 2052.
- **La edad:** con 66 se rompe en 2054, y con 67, en 2060.

**Perfiles.**
- **Ageing Report:** 14,76 % de media y 17,0 % en 2050 (margen de 0,75).
- **AIReF:** 16,6 % en 2050 y deuda del 128 %.

**Textos actualizados:**
- **Impuestos sin modelo propio:** fijos, deuda de 2070 del 253 % y ruptura en 2046.
- **RETA:** sin la reforma, deuda de 2050 del 123,0 % y ruptura en 2047.
- **`docs/modelo/01` y `04`.**

**Comprobación.** `tests/career-coverage.test.mjs`:
- encendida, cumple su definición;
- con la tabla calibrada, las altas del Ageing Report de 2030 a 2060 quedan a menos del 1 %.

Se regeneran la referencia (`engine-reference-1.78.0.json`), las huellas y el contraste.

## 1.86.0 · Metodología 1.79.0: arreglos de la auditoría de la 1.85 (26/11/2026)

Arregla los puntos 1 a 23 y 25 a 27 de `docs/AUDITORIA-1.85-2026-11-26.md` (decisión del autor: «Sí, todos»). Los hicieron tres agentes en ficheros separados, cada uno revisado por otro, y yo los ajustes que tocaban ficheros comunes. El punto 24 es del autor: abrir el repositorio de GitHub al publicar.

**Motor.**
1. **Pensión media, tasa de sustitución, pensión preservada y pensión pagable.** Dejan fuera la renta del fondo de quien no llega a pensión contributiva, que tampoco cuenta como jubilado. Esa renta se sigue pagando: está en `fundedBenefits` y en el fondo, y aparte en `fundedBenefitsNoClaim` y `preservedFundedBenefitsNoClaim`, que solo aparecen cuando no son cero.
   - **Reparto y Nocionales:** idénticos.
   - **Tasa de sustitución en 2070:** Capitalización de golpe, del 45,3 % al 44,2 %; Mixto de golpe, del 45,8 % al 45,4 %; Mixto progresivo, del 44,3 % al 43,9 %; Mixto con ahorro propio, del 45,7 % al 45,4 %.
2. **Remuneración por encima de la renta del PIB.** Se rechaza, igual que por debajo de la nómina pública, con un mensaje claro. Antes se tapaba con un suelo y salía una deuda del 0 % con ingresos del 124–181 % del PIB.
   - **Cuándo pasa:** desde unos +1,7 puntos al año de salario sobre la productividad.
   - **Consecuencia:** la casilla «Salarios, por separado de la productividad» llega ahora como mucho a +1,5, igual que el laboratorio y el Excel.
   - **Comprobado:** las recetas de «Ricos y empresas» siguen funcionando.
3. **Ingresos fiscales** (`taxRevenueGDP`): el mínimo es el 5 %, como en la casilla, también en el Excel. Con 0, el veredicto fallaba.
4. **Mensaje de error:** el de la remuneración por debajo de la nómina pública nombra ahora sus dos causas: la productividad muy por encima de los salarios, o la automatización sin recolocación.
22. **Edad ligada a la esperanza de vida.** Con 1/3 o 2/3, cada cálculo vuelve a tardar unos 7 s, frente a 27 s, con resultados idénticos.

**Textos y fuentes.**
- **Supuestos con cifras al día:**
  - congelar la senda adelanta la ruptura de 2050 a 2043;
  - sin el corto plazo de la AIReF, la deuda de 2050 pasa del 115,9 % al 119,7 % (una prueba lo compara con el contraste);
  - los impuestos sin modelo propio bajan al 1,7 % del PIB;
  - las partidas del presupuesto citan COFOG 2024.
- **Ayudas** de «Rentabilidad real» y de «Edad de jubilación» corregidas.
- **`docs/modelo` 01, 02, 03, 04 y 05 al día**, con la cita de la ficha corregida (págs. 11 y 60 de la ficha; 10 y 59 del PDF).
- **«Fuentes de datos»** lee todos los módulos de datos, también los de la 1.77 y la 1.78: INE (EPA 65109), Imserso, Seguridad Social y la ficha del Ageing Report. Los punteros a ficheros que solo están en pensiones_lab_2 lo dicen así.
- **Contraste:** guarda los resultados sin redondear, así que Metodología y la consola dan el mismo porcentaje.

**Consola.**
- **Importar desde Excel:** las filas de impuestos nuevas mantienen el IVA reducido al 10 % y el superreducido al 4 %, y el umbral del IRPF en 30.000 €.
- **«Ricos y empresas»:** muestra las medidas del escenario abierto. Si el escenario sube impuestos por otro lado, lo dice y explica qué se sustituiría.
- **Recorte de otros gastos:** cada recorte nombra su base. La casilla mide sobre el gasto recortable, sin sueldos públicos ni programas cofinanciados, y Partidas sobre el resto del gasto.
- **Mixto progresivo:** elegirlo ya no marca su forma estándar como cambios.
- **Enlace:** la ayuda y el botón dicen que lleva los ajustes, sin los límites ni el año.
- **Pruebas:** `tests/setting-systems.test.mjs` compara campos reales.
- **Simulaciones que fallan:** el error llega directo, sin repetir el cálculo en el hilo principal.

**Robustez y publicación.**
- **Sensibilidad:** las variantes no salen del rango del validador. Si alguna falla, la página enseña las demás y el error en castellano.
- **Nombre:** «Pensiones Lab» en todas las páginas.
- **Empaquetador para Sites:** admite los iconos.
- **Sellos:** dicen «España».

**Pendiente.**
- **El punto 24:** abrir `github.com/PepLogar/pensioneslabs3` al publicar, o cambiar el texto «Código fuente».
- **Citas `ruta:línea`:** algunas de `docs/modelo/01` a `src/current-cohorts-v10.js` apuntan a líneas desplazadas. Existen, pero no siempre son la línea exacta.

**Comprobación.**
- Pruebas nuevas en `tests/audit-185-engine.test.mjs`, `tests/audit-185-console.test.mjs` y `tests/audit-185-texts.test.mjs`.
- Se regeneran la referencia del motor (`engine-reference-1.79.0.json`), las huellas y el contraste.

## 1.87.0 · La consola pliega los ajustes que no cambian nada (26/11/2026)

**Decisión del autor:** «Sí, pliégalos». Sustituye al gris de la 1.81 y la 1.82: la consola ponía en gris los ajustes que no actúan con el escenario. Con «Reparto (hoy)», casi todo el capítulo «El sistema» salía en gris y había que leer veinte filas para dar con las tres que hacen algo.

**Qué hace ahora.** En cada capítulo se ven primero los ajustes que actúan. Debajo, en dos líneas plegadas:
- **«Ajustes de otros sistemas (N)»:** los que `settingActsOn` da por inactivos con el sistema elegido (`src/shared/setting-systems.js`).
- **«Sin efecto con tu escenario (N)»:** los que esperan una decisión que el escenario no ha tomado (`settingWaits`, `src/shared/setting-needs.js`).

**Reglas.**
- **Nada se pierde.** Los tres grupos suman el capítulo, en el orden del catálogo (`splitRows`, `src/shared/console-rows.js`). Los valores plegados se conservan.
- **Los cambios no se esconden.** Si un pliegue oculta ajustes cambiados, lo dice («· 1 cambiado») y lleva la marca de cambio. La cuenta de la pestaña sigue incluyéndolos.
- **El buscador** encuentra también los ajustes plegados y abre su pliegue.
- **Un ajuste con error** abre su pliegue, que sigue abierto al corregirlo.
- **Cada pliegue** recuerda si está abierto, por capítulo, mientras dura la visita. Al abrirlo o cerrarlo, el foco vuelve a su botón.
- **El freno de 2023** decide si los ajustes de la respuesta a los impuestos esperan, y eso se sabe con el resultado. Mientras se calcula el nuevo se usa el anterior. Sin ningún resultado, esas filas saldrían del pliegue y volverían a entrar al llegar el nuevo: la tabla saltaría dos veces en cada cambio.
- **La nota de «otros sistemas»** avisa de que, en Reparto y Nocionales, la comisión y dónde se invierte el fondo vuelven también con una cotización adicional.
- **Metodología** sigue enseñando todas las filas: es una referencia.

**Sin cambios en el motor:** la metodología sigue en la 1.79.0 y el contraste solo cambia la versión.

**Revisión:** tres revisores (lógica, reglas y uso) y dos escépticos por hallazgo. Sobrevivieron tres problemas, arreglados: el salto de filas mientras se calcula, el pliegue que un error abría sin poder cerrarse, y la nota que no mencionaba la cotización adicional. Se rebatieron tres.

**Pruebas:** `tests/console-folds.test.mjs`.

## 1.87.1 · Mientras calcula, la consola dice de qué sistema son las cifras (26/11/2026)

**Problema (prueba del autor, gravedad media).** Al pasar de «Reparto (hoy)» a «Mixto con ahorro propio», el selector y el aviso ya nombraban el mixto. Pero durante el cálculo, de 1,5 a 3,5 s, el veredicto, los gráficos, la leyenda y la tabla seguían mostrando Reparto, solo atenuados al 50 %. En 2050 se veían 2.201 €/mes y ningún fondo. Al terminar salían 2.049 €/mes y un fondo del 26,4 % del PIB. Era fácil atribuir las cifras al sistema equivocado.

**Qué hace ahora.** Mientras calcula:
- **El veredicto** se sustituye, sin atenuar, por «Calculando «Mixto con ahorro propio»…» y «Hasta que termine, los gráficos y la tabla son aún de «Reparto»». Si el sistema es el mismo, dice «del escenario anterior».
- **La leyenda** dice que la línea continua es la del escenario anterior. Ya no muestra la raya roja de ruptura del anterior.
- **Los gráficos y las tablas** se atenúan más, al 35 %.
- **Para los lectores de pantalla,** el resultado lleva `aria-busy` y solo se anuncia el veredicto final.

El texto sale de `calculatingText` (`src/shared/console-rows.js`) y lo prueba `tests/console-folds.test.mjs`.

**Revisión:** dos revisores, uno del flujo y otro de lo que se lee, y dos escépticos por hallazgo. Sobrevivieron dos problemas, ya arreglados: la leyenda que seguía diciendo «este escenario» y el doble anuncio a los lectores de pantalla. Se rebatieron cuatro.

## 1.87.2 · Repositorio público aparte (26/11/2026)

**Decisión del autor:** abrir el código en un repositorio nuevo y limpio, `github.com/PepLogar/pensioneslab`, y dejar `PepLogar/pensioneslabs3` privado, con todo su historial. Es el punto 24 de la auditoría de la 1.85.

**Por qué un repositorio nuevo.** El historial del privado guarda copias de documentos ajenos en `data/sources`: PDF, hojas de cálculo y páginas guardadas de la AIReF, la AEAT, el Tesoro, el Banco de España y otros. Además, sus commits llevan el correo personal del autor. Reescribir ese historial habría cambiado todos los identificadores de commit sin vuelta atrás.

**Qué lleva el público.** El código y los documentos de este repositorio, en un solo commit, con autor «Pep Logar AI Solutions <info@aisolutions.peplogar.com>». No lleva:
- `data/sources/*`, salvo su `README.md`, que da el origen y la huella SHA-256 de cada copia;
- `.openai/`, la identidad privada del Site de prueba.

Una auditoría previa, con tres revisores y dos escépticos por hallazgo, encontró restos que se quitaron también aquí, en el commit d544823:
- los identificadores y la dirección del Site de prueba en los documentos;
- los textos que decían que las copias estaban en el proyecto;
- las menciones visibles a `pensiones_lab_2`;
- dos pruebas que leían las copias.

**Enlace.** «Código fuente», en Metodología y en `LICENSE.md`, apunta ya al repositorio público. Una prueba comprueba que la página no nombra el privado.

**Cómo se actualiza el público.** Se exporta el último commit del privado sin esas carpetas y se sube como un commit nuevo en el público.

## 1.88.0 · La consola enseña solo los ajustes que actúan, medido con el motor (27/11/2026)

**Origen.** El autor vio que la pestaña «Límites y mezcla» decía «Mezcla del Mixto «de golpe». Solo actúa en ese sistema», y dedujo que solo el Mixto de golpe, que no se puede elegir, deja repartir la cotización. Era falso, y pidió corregirlo y buscar más errores del mismo tipo.

**Cómo se buscó.**
1. **Medición de la regla de plegado.** Se movió cada uno de los 100 ajustes de la consola en los cinco sistemas que se pueden elegir. En Reparto y Cuentas nocionales se añadieron variantes con cotización adicional, con subida de impuestos y con IA. Fueron 909 cálculos.
2. **Condiciones exactas.** Cinco agentes buscaron en el código cuándo actúa cada ajuste sospechoso, y lo comprobaron con cálculos dirigidos.
3. **Textos.** Se reunieron 325 frases que dicen dónde o cuándo actúa un ajuste. Tres agentes marcaron 78 como falsas o engañosas, otros tres las corrigieron y otros tres revisaron la corrección.

**Resultado de la medición.**
- **Ningún ajuste que actúa estaba plegado.**
- **Muchos ajustes a la vista no hacían nada.** Ejemplos:
  - la mezcla en el Mixto progresivo;
  - la edad de corte en el Mixto con ahorro propio, que va por rampa anual;
  - los años del cambio en el Mixto progresivo, cuyo ritmo lo marca la muerte de los pensionistas;
  - la parte nocional en el Mixto con ahorro propio;
  - la tasa de sustitución en Cuentas nocionales;
  - la rentabilidad sin fondo;
  - los ajustes que dependen de un interruptor apagado: la entrada por generaciones, los años ya cotizados, los puntos y la edad por tramos;
  - en el experimento de 1985, la senda de edad, la edad ligada, EUROPOP2023, el corto plazo de la AIReF, la prima por crisis y la pérdida de capital público por recortes.

**Qué cambia.**
- **Reglas** (`SETTING_SYSTEMS`, `SETTING_NEEDS`, `setting-systems.js`, `setting-needs.js`):
  - el experimento de 1985 se mide como un sistema más;
  - hay esperas nuevas por forma del cambio, tipo de parte pública e interruptor propio;
  - la automatización espera a lo que de verdad la mueve.
- **Medición tras el cambio:** los mismos 909 casos. Sigue sin haber ningún ajuste que actúa plegado. Los que se ven y no mueven nada dependen del resultado (crisis, freno, prima de riesgo), son de presentación, o llevan su condición en la ayuda: la IA con recolocación completa y la comisión por encima del tope del fondo común.
- **«Límites y mezcla».** La nota dice, según el sistema, qué casillas cuentan y dónde se elige lo demás. Las casillas que no cuentan salen en gris.
  - **Mixto con ahorro propio:** la mezcla reparte la parte pública entre reparto y nocionales. Cuánto va a la cuenta propia se elige en «parte de la cuota que acaba en el fondo».
  - **Mixto progresivo:** se usan «parte de la cuota que acaba en el fondo» y «parte pública nocional o de reparto».
- **Pliegue «Sin efecto con tu escenario».** Cada fila dice debajo a qué decisión responde.
- **Textos corregidos** en la consola, el catálogo, la ayuda, Supuestos, los sistemas, Metodología y `docs/modelo/03`. Por ejemplo:
  - el freno de 2023 está encendido en Reparto, pero con los supuestos de partida no salta;
  - el tope de la comisión depende de dónde se invierte el fondo;
  - el experimento de 1985 empieza en 1985 y no sigue la senda de edad.

**Pruebas:** `tests/settings-act-measured.test.mjs` comprueba, en 15 casos, que el motor y la consola coinciden. Hay uno por cada tipo de arreglo.

**Sin cambios en el motor:** la metodología sigue en la 1.79.0.

## 1.89.0 · Informe del escenario, para imprimir o guardar en PDF (27/11/2026)

**Origen.** El autor echaba de menos los informes del primer laboratorio, como `informe-cuatro-sistemas-2027-revisado.pdf`: 11 páginas que comparaban los sistemas. Al pasar a esta consola no se trajeron, porque `AGENTS.md` pide no traer herramientas del sitio anterior. Esta es una herramienta nueva, por decisión del autor.

**Solo el escenario abierto.** El autor: «que permita exportar solo el escenario que estás trabajando». Si los ajustes están afinados para un sistema, los demás sistemas con esos mismos ajustes no están optimizados: solo meterían ruido y resultarían tramposos. Por eso el informe no calcula ni muestra otros sistemas, y una prueba lo comprueba.

**Cómo es.** Un enlace «Informe» en la barra de la consola abre `informe.html` en otra pestaña. La página sigue al escenario: si cambia en la consola, se dibuja de nuevo. El botón «Imprimir o guardar en PDF» abre el diálogo del navegador. No hay biblioteca de PDF: las cifras, los gráficos (`src/views/chart-svg.js`, los de «Gráficos») y los textos son los de la consola.

**Contenido** (`src/domain/scenario-report.js`, sin DOM):
1. **Cabecera:** el nombre con que está guardado, o el del sistema; el año consultado; versión, metodología, datos y fecha.
2. **Veredicto y cinco cifras clave.**
3. **Cifras por años:** cada diez años, más el año consultado y el de ruptura. Son las columnas de la tabla de la consola.
4. **Gráficos de 2026 a 2070:** deuda, pensión frente al salario, pensión media y pagable, lo que falta, gasto en pensiones y, si hay fondo, el fondo.
5. **Qué cambia frente a las reglas de hoy:** los ajustes movidos, con su valor de partida (el del sistema elegido en su forma estándar), las medidas con fecha, tus límites y el enlace para reabrirlo.
6. **El sistema y los supuestos comunes.**
7. **Cómo citarlo y el aviso.**

**Impresión.** A4, sin la barra, con los gráficos a una columna para que se lean. El escenario de partida ocupa tres páginas, comprobado con Chrome sin ventana.

**Pruebas:** `tests/scenario-report.test.mjs`.

**Sin cambios en el motor.**

## 1.90.0 · El informe, rehecho tras su auditoría (27/11/2026)

La auditoría de la 1.89 (`docs/AUDITORIA-INFORME-1.89-2026-11-27.md`) la hicieron tres revisores: cifras, impresión y contenido. Encontró 9 errores y propuso contenidos y mejoras. El autor pidió aplicarlo todo: «Sí, todo eso». Un cuarto revisor comprobó el resultado y encontró 8 problemas más, también arreglados.

**Errores arreglados.**
- **Cambios que faltaban:** la mezcla de «Límites y mezcla» ya sale entre los cambios.
- **«Nada cambiado» solo cuando es cierto:** el informe lo dice únicamente si no hay ajustes, mezcla, medidas con fecha ni límites propios.
- **La pensión pagable:** ya no dice «si el sistema se rompe», porque solo baja desde el rescate. El rescate y la quita salen con sus años, en el texto y en las tablas.
- **El enlace:** es «enlace del escenario», y su dirección no se imprime. Antes, un enlace de hasta 1.650 caracteres encogía todo el informe.
- **Valores como en la consola:**
  - los límites conservan sus decimales;
  - los recortes de gasto salen en palabras («Un plan propio»);
  - un valor sin opción sale como «Otro valor (1,5)»;
  - el calendario guarda dos decimales.
- **Ajustes sin efecto:** un ajuste cambiado que no hace nada en este escenario lo dice.
- **Supuestos de este escenario:**
  - salen con sus propios valores (cotización, inflación, rentabilidad, comisión, freno de 2023, edad, población) y no con los de partida;
  - no comparan con otros sistemas;
  - las reglas del veredicto usan los años de riesgo, el suelo de pensión, la congelación y el recorte de este escenario.
- **Corrección del revisor: la cotización que va al fondo no es parte de lo que falta.** Lo que falta es neto de impuestos, y la cotización al fondo es bruta. Por eso sale como columna aparte, fuera de la suma.
- **Corrección del revisor: dos hitos decían otra cosa.** El primer año con deuda nueva es cualquier déficit, no un préstamo «para pagar las pensiones». La bola de nieve es el interés medio por encima del crecimiento, no «los intereses».
- **Ruptura por la pensión:** cuando se rompe porque la pensión baja del suelo, el informe lo dice así, sin listar indicadores fiscales.

**Contenidos nuevos** (los datos ya estaban en el motor):
1. **Por qué se rompe, o qué vigilar:** los indicadores del índice de riesgo que pasan de su umbral, el que quedó más cerca, la regla aplicada y lo que el simulador supone después.
2. **Cuándo hace falta ayuda:** los hitos con fecha, ordenados:
   - la primera falta;
   - la primera deuda nueva;
   - el interés por encima del crecimiento;
   - la prima de riesgo;
   - el riesgo;
   - la ruptura;
   - el rescate, la quita o el impago;
   - el freno de 2023;
   - el suelo de la pensión;
   - la salida de los límites y cuál.
3. **Cómo se pagan las pensiones públicas:** el coste, las cotizaciones y mutuas, los impuestos asignados, lo que falta y la cotización que va al fondo. Y qué pensiones se pagan:
   - las ganadas hasta 2026;
   - el reparto ganado desde 2027;
   - las nocionales;
   - las otras pensiones públicas;
   - las rentas del fondo, que son privadas.
4. **Cuentas del Estado:** ingresos, gasto, saldo primario, intereses, saldo, necesidades de financiación, deuda y la parte que añade la prima de riesgo.
5. **Supuestos del veredicto, con su tipo:** observación, reconstrucción o supuesto.
6. **Cómo leerlo, fuentes principales, y reproducir y citar.**

**Orden y forma.**
- **Orden:**
  1. Veredicto.
  2. Lo que has cambiado.
  3. Por qué.
  4. Cuándo.
  5. Quién paga.
  6. Cifras.
  7. Evolución.
  8. Supuestos.
  9. Lectura.
  10. Fuentes.
  11. Cita.
- **Gráficos:**
  - llevan marcado el año de ruptura;
  - el segundo de pensión se cambia por «lo que falta y cotización que va al fondo»;
  - leyenda solo cuando hay dos líneas.
  - Las opciones nuevas de `src/views/chart-svg.js` no cambian la página Gráficos: sin ellas, el SVG sale idéntico.
- **Impresión:**
  - pie con versión, aviso y número de página en cada hoja;
  - † en los años rotos, para que se vea sin color;
  - calendarios en tabla;
  - tipos de letra en puntos;
  - si se imprime mientras calcula, sale un aviso en vez de cifras viejas.
- **Accesibilidad:** cada gráfico lleva `role="img"` con una descripción corta, hay un `tbody` por capítulo, se avisa con «Informe listo.» y los errores con `role="alert"`.

**Comprobado:** se imprimieron a PDF Reparto, el Mixto progresivo y un Mixto con ahorro propio con mezcla, medidas y límites, que ocupa 6 páginas A4. Las sumas cuadran: cotizaciones + impuestos + falta = coste, y ingresos − gasto = saldo. Pruebas: `tests/scenario-report.test.mjs`.

**Sin cambios en el motor.**

## 1.91.0 · El informe dibuja la ruptura donde ocurre (27/11/2026)

**Motivo:** el autor, al ver los gráficos del informe de Reparto: «Lo que es curioso es que se rompa todo en 2050». La raya roja salía en los cuatro gráficos, pero ninguna de esas curvas cambia en 2050. La ruptura la decide el índice de riesgo S0, que va a saltos: cuenta cuántos indicadores pasan de su umbral. En Reparto, el saldo primario y la deuda pasan de su umbral desde antes de 2040, y el índice sigue bajo (0,26). Las necesidades brutas de financiación, sin letras, se quedan entre 15,5 y 15,7 % del PIB de 2047 a 2049, y en 2050 llegan a 16,5, por encima del umbral de 15,95. Ese año el índice salta a 0,53 (riesgo alto) y sigue alto en 2051. No es casualidad del año consultado: cada sistema se rompe en un año distinto (nocionales 2060, Mixto progresivo 2043, capitalización de golpe 2027).

**Qué cambia:**
- **Un gráfico nuevo** con el indicador que decide la ruptura, con su umbral de la Comisión como línea discontinua. Va justo después de la deuda. Decide un indicador que pasa de su umbral el año de la ruptura y estaba en el lado seguro el año anterior, o sin valor (2026 no tiene deuda que vence). En los cuatro sistemas probados es siempre el de las necesidades de financiación. Las cifras son las del veredicto (`verdict.journey`), no una serie aparte.
- **La raya roja solo en la deuda y en ese gráfico.** Si se rompe por la pensión, la raya va solo en «Pensión media frente al salario medio», con su mínimo del 40 % como línea discontinua.
- **Una frase sobre los gráficos** dice qué marca la raya y por qué solo está ahí.

**Pendiente de decidir:** la consola dibuja la raya en todos sus gráficos. No se ha tocado (hecho en la 1.92.0).

**Sin cambios en el motor.** Prueba: `tests/scenario-report.test.mjs` (el indicador cruza su umbral el año de la ruptura; la raya no sale en los gráficos de pensiones; nada marcado si aguanta).

## 1.92.0 · La consola también dibuja la ruptura donde ocurre (27/11/2026)

**Motivo:** el autor pidió llevar a la consola lo de la 1.91.0.

**Qué cambia en la consola:**
- **Un quinto gráfico** cuando se rompe por la deuda: el indicador que decide el año, con su umbral como línea roja de puntos. Va después de la deuda y es corto, «Necesidades de financiación, % PIB»; el nombre completo y el umbral salen al pasar el ratón. La línea discontinua es el mismo indicador con las reglas de hoy, como en los demás gráficos.
- **La raya roja solo en la deuda y en ese gráfico.** Si se rompe por la pensión, la raya y el mínimo del 40 % van en «Pensión media, % salario medio».
- **La leyenda dice qué la causa:** «Raya roja: se rompe en 2050, cuando «Necesidades brutas de financiación» cruza su umbral (línea roja de puntos).»
- Los gráficos se reparten en tantas columnas como haya (`--cx-n`).

**Código:** `decidingIndicators` y `riskVariable` pasan a `src/views/risk-strip.js`, junto a los umbrales, y los usan el informe y la consola.

**Comprobado** en el navegador con Reparto a 1600 px: cinco gráficos del mismo ancho, umbral 15,95 y raya en 2050. **Sin cambios en el motor.**
