# Paquete para sustituir Pensiones Lab en Sites · 22/11/2026

**Actualización posterior:** este paquete se ha publicado como versión 3 en el mismo Site, con acceso privado. Véase [publicación, recibo y comprobaciones](SITES-PUBLICACION-2026-11-22.md). El texto siguiente conserva el estado y las pruebas del momento de preparación.

## Entrega

- ZIP: `output/sites/pensioneslabs3-sustitucion-2026-11-22.zip`.
- Copia sin comprimir: `output/sites/pensioneslabs3-sustitucion-2026-11-22/`.
- Huella adjunta: `output/sites/pensioneslabs3-sustitucion-2026-11-22.zip.sha256`.
- Tamaño ZIP: **619.514 bytes**, unos 0,62 MB.
- SHA-256: `90A8062BC367A6D1802D7C5F749405151DCA6AF4E52DD7B5C631B966806D1E2B`.

Preparación local terminada. **No se ha subido, guardado una versión en Sites ni publicado.** La petición era preparar el paquete de sustitución.

## Destino confirmado

Sites respondió correctamente el 22/11/2026. Se consultó el inventario y el detalle del sitio existente:

- Nombre: Pensiones Lab · Copia de prueba.
- Identificador: `[identificador privado]`.
- URL: <[dirección privada del Site de prueba]
- Última versión registrada observada: **2**.
- Acceso observado: propietario únicamente; sin editores, grupos ni visitantes externos.

El paquete y `.openai/hosting.json` del proyecto conservan ese identificador y declaran `static.directory: dist`. No se creó otro sitio ni se cambió la audiencia. La configuración es la mínima estática; al sustituir el contenido en un checkout existente deben conservarse otros campos de alojamiento que todavía sean necesarios. El acceso se administra en Sites, no dentro de este ZIP.

## Contenido y cambio de aplicación

Solo se aloja `dist/`: cinco archivos, **1.715.596 bytes** sin comprimir:

1. `index.html`.
2. Hoja de estilos de la consola.
3. Módulo de interfaz y exportaciones.
4. Worker del motor.
5. Módulo de cálculo alternativo que utiliza el cliente si no puede usar Worker.

Se incluyen también `.openai/hosting.json`, `inventory.json` y `README-SITES.md`: ocho archivos en el ZIP. El inventario identifica el commit de origen, las huellas de los archivos de fuente y las de cada recurso compilado.

La aplicación es **pensioneslabs3 0.1.0**, procedente del commit `cd8055c`. Los sellos de exportación conservan **1.64.0** y la metodología `common-fund-1.64.0`, heredados del motor. Esa diferencia se documenta, sin cambiar versiones económicas al empaquetar.

Se respeta la decisión del proyecto: una consola de escritorio con el motor, sin recuperar las páginas del sitio anterior ni adaptar la interfaz a móvil. La distribución debe sustituirse completa, sin mezclar las antiguas páginas y assets. La entrada pasa a ser `index.html`; los antiguos enlaces a `laboratorio.html`, `comparar.html`, etc. dejan de estar cubiertos. No se añadieron redirecciones.

Los datos necesarios para calcular están compilados en los módulos. Las rutas de fuentes originales son metadatos de procedencia y la consola no las solicita en ejecución ni las presenta como descargas; las copias de `data/sources/` (unos 52 MB) no se publican: son documentos de otros, y `data/sources/README.md` dice de dónde vienen. No se incluyen Git, dependencias de desarrollo, fuentes brutas, documentación interna, credenciales, capturas ni escenarios personales.

## Escenarios conservados

Se mantienen las claves de almacenamiento, calibración `es-current-2026-10-18-v8`, versión de estado **32** y sufijo `:scenarios-v10`. El revisor contrastó por huella `storage-ids.js`, `scenario-library.js` y `risk-state-migration.js` con pensiones_lab_2.

Al conservar dominio/origen y navegador, la consola puede leer estados y bibliotecas compatibles. Esto no acredita una migración de cualquier versión antigua ni de estados corruptos. Los ajustes guardados en localhost no se trasladan al dominio alojado por publicar archivos; deben importarse con las herramientas de la consola. No se leyó ni exportó el almacenamiento personal durante esta preparación.

## Comprobaciones realizadas

- Una compilación aislada de Vite, correcta, sin sustituir el `dist/` de desarrollo ni cambiar motor, calibración o interfaz.
- Seis comprobaciones focales: las cuatro de `tests/index-page.test.mjs` y las dos de `tests/scenario-saving.test.mjs`, todas correctas. No se repitió la batería de 116 pruebas ni las comparaciones económicas.
- Cinco recursos requeridos presentes y cuatro referencias relativas de la compilación resueltas.
- Servidor de la copia en un puerto separado, `5193`: respuesta HTTP 200. La consola compilada pasó de «Calculando…» a mostrar «Se rompe en 2042» con Reparto y los gráficos de resultados en Chrome. Es una prueba de arranque y cálculo de referencia; no se afirma que cubra todos los controles ni que demuestre por separado el uso del Worker frente a su alternativa.
- No se observaron errores de consola atribuibles a la aplicación; el único error recuperado procedía de una extensión de Chrome. La captura de pantalla agotó dos veces el límite de cinco segundos de la herramienta: la comprobación del resultado se hizo mediante el estado accesible, sin acreditar revisión visual por imagen.
- ZIP abierto: ocho entradas esperadas, manifiesto presente y cinco recursos comprobados contra sus SHA-256. Se generó la huella del archivo completo.
- Servidor de comprobación detenido al terminar. No se tocó el servidor de la aplicación ni la publicación existente.

AgentCollab respondió `backend_unavailable / not_sent`; la revisión paralela se realizó con un agente interno. Esa revisión confirmó el contenido mínimo, los límites de almacenamiento y la distinción de versiones. No se atribuye a Gemini.

## Repetir la preparación

Con dependencias ya instaladas, elegir siempre una carpeta nueva dentro de `output/sites/`:

```powershell
node node_modules/vite/bin/vite.js build --outDir output/sites/NUEVA-COPIA/dist --emptyOutDir false --logLevel warn
node scripts/prepare-sites-package.mjs output/sites/NUEVA-COPIA
```

El preparador no sobrescribe una entrega que tenga inventario y valida archivos y referencias antes de copiar el manifiesto. La carpeta `output/` se ha añadido a `.gitignore`. Empaquetar el contenido de la copia incluyendo `.openai/hosting.json`, y verificar el ZIP antes de entregarlo.

## Aplicar la sustitución

Las instrucciones concretas están en `README-SITES.md`, dentro del ZIP. Hay que actualizar el Site existente, conservar su identidad y audiencia, sustituir la distribución completa y sincronizar exactamente ese contenido antes de guardar/publicar una versión por el flujo de Sites. El ZIP no es una versión remota ni un archivo ya vinculado a un commit del repositorio de Sites.

Quedan para la publicación la comprobación de acceso privado, cálculo e importación/exportación en la URL alojada y lectura de un escenario compatible del mismo origen. El paquete necesita HTTP/HTTPS; no debe abrirse por `file://`.
