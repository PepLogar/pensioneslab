# Escenarios e intercambio en Sites · 22/11/2026

## Resultado

Se comprobó la **versión 3 realmente publicada en Sites**, con dos agentes que prepararon tres escenarios sintéticos y contrastaron sus resultados contra las descargas y las tablas de la web. La configuración económica y las series coinciden. La conservación completa del escenario tiene **dos defectos reproducidos: año de consulta y límites importados**.

Los ajustes personales de Chrome permanecen intactos: las nueve entradas `pensiones-lab:*` del almacenamiento del origen son idénticas antes y después, byte por byte. No se modificaron código, motor, calibración, publicación ni permisos. El Site sigue privado, solo para su propietario, con revisión de acceso 1.

Sitio comprobado: <[dirección privada del Site de prueba] Motor y formatos: 1.64.0; estado 32; calibración `es-current-2026-10-18-v8`. Véase también [la publicación](SITES-PUBLICACION-2026-11-22.md).

## Protección del trabajo personal

- La pestaña original de Chrome contenía un escenario personalizado de 1985 y mostraba el año 2027. No se aplicó allí ningún escenario de prueba ni se recargó esa pestaña.
- Se capturaron las entradas del almacenamiento de la aplicación mediante lectura del navegador. Tras las pruebas se volvieron a leer desde una pestaña nueva del mismo perfil y origen. Esa pestaña de verificación se cerró.
- SHA-256 inicial y final: `bba0bf4cc86daa58c1dc25c5959bdfafdbb4ac5975f9bafcaa3563cd95f2fdb7`.
- La biblioteca de Chrome tenía **cero entradas** y el campo histórico `saved` también estaba vacío. La interfaz decía «Ninguno guardado». Esto permite acreditar que no se alteró la biblioteca presente; **no permite asegurar la conservación de escenarios anteriores a la actualización** que no están en este perfil y origen.
- Las importaciones, guardados y recargas se hicieron en el navegador integrado, cuyo almacenamiento de este Site empezó con reglas de hoy y sin escenarios guardados. Se inició sesión mediante el flujo normal del propietario. No se copiaron cookies, no se usaron tokens de acceso alternativo y no se ampliaron permisos.

Los escenarios se guardan en el navegador y origen concretos. Sites, localhost y otro navegador no comparten automáticamente esa biblioteca. El despliegue no constituye una copia de seguridad de sus datos locales.

## Escenarios preparados y contraste

Un agente preparó Reparto base y Reparto con jubilación a 67; otro, Mixto progresivo. Cada caso se calculó una vez localmente y se reutilizó para todos sus contrastes. El progresivo se obtuvo con `settingsPatch('system', 'progressive', DEFAULT_CONFIG)`, la misma receta que usa el selector: fondo común, transición según fallecimiento de pensionistas, objetivo de capitalización del 50 % y reparto nocional del 85 % en el pilar público.

Son casos de control, **no los ajustes personales del usuario**, ni una recomendación de política de pensiones.

| Escenario de prueba, año 2050 | Deuda / PIB | Pensión mensual | Pensión / salario | Falta para pensiones / PIB | Intereses / PIB | Fondo / PIB |
|---|---:|---:|---:|---:|---:|---:|
| Reparto base | 144,2 % | 2.224 € | 61,5 % | 3,20 % | 5,27 % | 0 % |
| Reparto, jubilación a 67 | 115,4 % | 2.319 € | 64,2 % | 2,22 % | 4,06 % | 0 % |
| Mixto progresivo de referencia | 163,8 % | 1.971 € | 54,5 % | 4,10 % | 6,14 % | 34,6 % |

La web, los archivos descargados y los cálculos locales coinciden en los tres casos. Se contrastaron todos los años 2026–2070, no solo esta tabla:

- **9.585 filas CSV de datos**: 3 casos × 45 años × 71 variables. Igualdad exacta con el CSV esperado. Frente al motor sin redondear, las diferencias quedan dentro de medio millonésimo de la unidad exportada, coherente con los seis decimales del formato.
- **1.080 celdas de la tabla web**: 3 casos × 45 filas × 8 columnas, incluidos los años. Coinciden con el formato visible esperado.
- **1.395 celdas de Excel**, en las 45 filas de `4_Serie_Escenario_Activo`, coinciden con el libro esperado del progresivo. No se presenta esto como una auditoría de todas las hojas del libro.
- Las **101 claves de configuración económica** se conservan al exportar y reimportar JSON, CSV y Excel en los recorridos probados.

Las identidades contables focales de las tres simulaciones no muestran desajustes relevantes. En reparto el residuo fue cero; en el progresivo, el máximo fue 0,00003052 € en asignación de cuotas y 0,04026031 € en el saldo agregado del fondo. Las participaciones que quedan en el fondo tras fallecimientos son una reasignación interna; no se suman de nuevo como financiación externa ni como ingresos públicos.

## Recorridos efectivamente probados en la publicación

| Operación | Resultado observado |
|---|---|
| Importar los tres JSON sintéticos y calcular | Configuraciones y series correctas. |
| Guardar los tres escenarios y recargar la página | Los nombres y configuraciones siguen disponibles. |
| Abrir un escenario guardado después de trabajar con otro | Recupera su configuración; se comprobó Reparto después del progresivo. |
| Guardar un límite de deuda 172, abrir un escenario con 150 y volver al de 172 | Recupera 172; el JSON posterior a recargar también contiene 172. |
| Exportar JSON de Reparto y reimportarlo | Conserva configuración completa. |
| Exportar CSV de Reparto a 67 y reimportarlo desde el progresivo | Recupera las 101 claves y los 45 años esperados. |
| Exportar Excel del progresivo e importarlo desde Reparto | Recupera configuración y tabla completa del progresivo. |
| Importar un JSON deliberadamente incompleto | Aviso «no es un JSON válido»; configuración, límites, año, biblioteca y resultados sin cambios. |
| Seleccionar 2035, guardar y exportar JSON | **Falla la conservación del año:** la interfaz muestra 2035, el archivo contiene 2050. |
| Importar JSON con límites 172 / 7 / 45 en una sesión con 150 / 5 / 40 | **Falla la recuperación de límites:** la interfaz y el nuevo JSON siguen con 150 / 5 / 40. |

Una observación inmediatamente posterior a importar CSV aún contenía la tabla del cálculo anterior. Se excluyó del contraste; se esperó a que apareciera el resultado nuevo y entonces coincidieron sus 45 filas. No se interpreta un estado intermedio del Worker como una discrepancia numérica.

## Defectos confirmados

### 1. El año visible está separado del año guardado

Reproducción: seleccionar la fila 2035 en el progresivo, guardar y exportar JSON. La interfaz indica 2035, pero `selectedYear` vale 2050 en el archivo. Abrir otro escenario o importar el Excel no sincroniza el año visible; una recarga vuelve a mostrar 2050.

Causa: `src/pages/consola.js` inicializa `year = 2050` (línea 98). Los manejadores del año y de la tabla (510–518) actualizan esa variable, mientras guardar/exportar usan `state.selectedYear`. `replaceWhole` y abrir un guardado cambian el almacén, pero la barra sigue mostrando la variable independiente.

Impacto: puede recuperarse la configuración correcta y mostrarse otro año de consulta. No cambia las series económicas 2026–2070, pero impide considerar el archivo o el guardado una reproducción completa de la vista.

Corrección propuesta, no aplicada: unificar el año con el estado persistido y comprobar un recorrido único de selección → guardar → abrir → exportar → importar → recargar con un año distinto de 2050.

### 2. Importar no recupera los límites del archivo

Reproducción: JSON válido con deuda máxima 172 %, brecha máxima 7 % y pensión mínima 45 %. La configuración económica se importa, pero los límites quedan en los valores receptores 150 / 5 / 40. Tanto los controles como el JSON reexportado lo confirman.

Causa: `scenarioFile` incluye `limits`, pero `parseImportedModelFile` no los devuelve. La consola aplica `replaceWhole(imported.config, imported.selectedYear)` sin límites. El esquema Excel tampoco transporta esos límites. El CSV de series no transporta límites ni año consultado; recupera la configuración económica del enlace de cabecera.

Impacto: las cuentas económicas siguen siendo las mismas, pero puede cambiar el año rotulado como «Fuera de los límites». Estos límites personales no son el veredicto económico automático. No debe describirse el intercambio como una copia completa de todos los criterios del usuario.

Corrección propuesta, no aplicada: restaurar límites validados cuando el formato los incluya; para formatos que no los incluyan, explicar que se conservan los del destino o ampliar explícitamente el esquema. Mantener la compatibilidad con archivos anteriores.

## Evidencias, alcance y seguimiento

Evidencia local: `output/sites/qa-io-2026-11-22/`.

- `reparto/`: dos fixtures, resultados completos, comparadores, `live-contrast.json` y README del agente.
- `progresivo/`: fixture y variante de límites, resultados, `live-comparison.json`, `live-excel-comparison.json`, `live-persistence-comparison.json` y README del agente.
- `live/`: archivos realmente descargados, observaciones de la interfaz, captura `sites-escenarios-qa.jpg` y `preservation.json`.
- La captura inicial del almacenamiento personal se mantiene solo en la carpeta local ignorada por Git; no se añade a la documentación pública ni al paquete de Sites.

Se ejecutaron tres simulaciones locales de referencia y comprobaciones de igualdad sobre archivos ya obtenidos. La web calculó lo necesario al importar y al preparar Excel. No se lanzó `npm test`, no se recompiló y no se repitieron las baterías económicas. AgentCollab respondió `backend_unavailable / not_sent`; la colaboración se realizó con dos agentes internos, sin atribuir trabajo a Gemini.

Al terminar se intentó retirar los seis registros sintéticos del navegador integrado. El diálogo de confirmación de borrado bloqueó la herramienta; no se pudo acreditar su eliminación ni el cierre de esa pestaña. **La limpieza de esa sesión de pruebas queda pendiente**; los registros se identifican como QA, salvo uno con el nombre automático «Mixto progresivo», también creado en esta ronda. No pertenecen a Chrome ni alteran el almacenamiento personal, cuya igualdad final sí se comprobó. No se atribuye ese bloqueo de la herramienta a un defecto de la aplicación.

Esta revisión acredita cálculo y configuración económica de tres recorridos de intercambio, persistencia de nuevos guardados y dos defectos concretos. No acredita migración histórica de bibliotecas ausentes, sincronización entre navegadores, todas las variantes posibles de Excel/CSV ni validez predictiva del modelo. Los defectos quedan documentados y **sin corregir ni desplegar cambios** en esta ronda de comprobación.
