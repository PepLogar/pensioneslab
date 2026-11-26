# Pensiones Lab 3 publicada en Sites · 22/11/2026

## Resultado

**Pensiones Lab 3 sustituye la aplicación anterior en la versión 3 de Sites.** Publicación completada el 22/11/2026 a las 19:04 CET, conservando identidad, dirección y acceso privado.

Abrir: <[dirección privada del Site de prueba]

| Dato | Valor |
|---|---|
| Site | `[identificador privado]` |
| Versión Sites | 3 |
| Versión local de aplicación | `pensioneslabs3` 0.1.0 |
| Motor y sellos de exportación | 1.64.0; metodología `common-fund-1.64.0` |
| Commit publicado | `b72df9db3bcb7c940bd50860509b197b6297c000` |
| Versión registrada | `[identificador privado]~[identificador privado]` |
| Despliegue | `[identificador privado]` |
| Resultado nativo | `succeeded`, sin mensaje de fallo |

El [recibo resumido](SITES-PUBLICACION-2026-11-22.json) guarda los identificadores y las comprobaciones, sin credenciales ni datos de cuenta personales.

## Sustitución realizada

Se publicó exactamente el paquete aprobado [en la preparación](PAQUETE-SITES-2026-11-22.md), sin recompilar ni modificar el motor, la calibración o la consola. Una revisión independiente confirmó la huella del ZIP, los cinco recursos compilados y las 132 huellas de fuente: no había deriva desde la compilación.

Se abrió el repositorio del Site existente en un checkout aislado. Su manifiesto coincidía con el preparado: mismo `project_id` y raíz `dist`. Se conservó intacto. La distribución anterior se retiró del checkout y se guardó en `output/sites/deploy-2026-11-22/previous-dist-v2/`; en su lugar se copiaron y verificaron los cinco archivos de Pensiones Lab 3. No se mezclaron páginas o recursos antiguos con la consola nueva.

El flujo de Sites sincronizó el commit y generó el archivo de despliegue. Se guardó y publicó mediante la operación privada, una sola vez. El archivo almacenado por Sites contiene seis archivos —cinco recursos y el manifiesto—, 1.730.560 bytes y huella `sha256:fca48bfc6ce9c91c99377c9a28ec101070dfe24469b00e9c9560c59ca77d869a`.

La entrega local está en `output/sites/pensioneslabs3-sites-release-2026-11-22.tar.gz`; no debe confundirse con el ZIP de preparación. El historial de Sites mantiene la versión 2 y su commit `c44d45a79d8f41ff625397cbe164d4ea05a80169`, por si fuera necesario volver a la publicación anterior.

## Privacidad comprobada

- Antes y después: acceso `custom`, solo el propietario, sin editores, grupos ni visitantes externos.
- La revisión de la política de acceso sigue siendo **1**: no se cambiaron permisos.
- Una petición HTTP sin sesión obtuvo **401** y no recibió la consola.
- El navegador con la sesión del usuario abrió la aplicación publicada.

No se crearon invitaciones, credenciales persistentes ni tokens para saltar la autenticación. La credencial temporal del repositorio se mantuvo en memoria y se entregó al ayudante por entrada estándar oculta; no se guardó en archivos ni se incluyó en la entrega.

## Comprobaciones necesarias

1. Integridad del paquete y ausencia de cambios en sus fuentes, reutilizando las pruebas ya realizadas durante la preparación.
2. Identidad del Site y acceso privado antes y después de publicar.
3. Publicación correcta, con la versión 3 vinculada al commit exacto y al archivo enviado.
4. Apertura autenticada de la URL: título «Pensiones Lab 3 · Consola».
5. La consola alojada pasó de «Calculando…» a resultados de Reparto: «Se rompe en 2042», deuda en 2050 de 144 % del PIB y pensión de 2.224 €/mes. Son valores observados en esa comprobación, no conclusiones nuevas sobre políticas de pensiones. No se cambiaron ajustes ni escenarios guardados para probarla.
6. No se observaron errores de consola atribuibles a la aplicación. El error recuperado pertenecía a una extensión de Chrome.

No se repitieron la compilación, la batería económica ni las pruebas de importación/exportación ya realizadas con el mismo código. Esta comprobación acredita publicación, protección de acceso y arranque/cálculo alojado; no una auditoría exhaustiva de cada función ni la migración de todo estado histórico. Tampoco se distingue aquí si el cálculo usó el Worker o su alternativa.

La herramienta de captura agotó su tiempo y reinició su sesión. No hay una imagen de evidencia válida de esta ronda: la comprobación del resultado procede del estado accesible de la página y del recibo de Sites. La pestaña publicada se marcó para dejarla disponible al usuario antes del intento de captura.

## Incidencias resueltas

La primera conexión de Git falló porque su almacén OpenSSL no reconocía la cadena del certificado. Se utilizó `http.sslBackend=schannel` únicamente en los procesos del ayudante, aprovechando la confianza de Windows y manteniendo la verificación TLS. No se desactivó la comprobación de certificados ni se cambiaron opciones globales de Git.

La revisión automática rechazó la eliminación recursiva de la distribución antigua. Se resolvió conservándola mediante un traslado verificado dentro de la carpeta aislada de publicación; no se borró. Esta alternativa permitió completar la sustitución sin ampliar permisos.

AgentCollab volvió a responder `backend_unavailable / not_sent`; la revisión paralela de integridad se realizó con un agente interno. No se enviaron tareas a Gemini.
