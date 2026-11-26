# Publicación: cuestiones legales y de presentación · 25/11/2026

Revisión de lo que hace falta para publicar Pensiones Lab 3 (versión 1.75.0) en Sites. Es una lista de comprobación, no asesoramiento jurídico. Lo que dependa de la ley (puntos 1, 3 y 6) conviene confirmarlo con quien asesore al proyecto.

**Estado de partida.**
- El Site (`[dirección privada del Site de prueba]`) es privado, solo para el propietario.
- La aplicación está en alfa: no se abre al público hasta la beta.
- El último paquete generado es el de la 1.72; hay que generar otro antes de subir.

## Lo que ya está bien

- **Sin terceros en el navegador.** Las páginas no cargan nada de fuera: ni tipos de letra, ni CDN, ni analítica, ni publicidad. La única llamada de red es la precarga de módulos de Vite, en el mismo sitio.
- **Nada sale del navegador.** Los escenarios se guardan en el propio navegador (`localStorage`) y los resúmenes de Sensibilidad y Riesgo en IndexedDB. El enlace compartido lleva el escenario detrás de `#`, y esa parte no se envía al servidor.
- **Sin datos personales en el paquete.** No hay correos, rutas locales ni nombres de usuario en `dist/`, ni mapas de código fuente. Solo `README-SITES.md` cita la URL del Site, y no se publica.
- **Las copias de documentos de terceros no se publican.** Los PDF, Excel y HTML de `data/sources` (AIReF, AEAT, BOE, FMI…) no van en el paquete; el inventario solo guarda sus huellas.
- **Cada página avisa** de que es una simulación con supuestos, no una previsión oficial. La consola añade que tampoco es un derecho legal, y Metodología dice qué no es («no calcula derechos legales individuales y no ordena los sistemas en un ranking validado»).
- **Las fuentes se citan.** Metodología lista 57 fuentes con enlace y huella, y el contraste nombra el Ageing Report, la AIReF, el FMI y Funcas.

## Lo que falta

### 1. Quién publica y cómo contactar

Ninguna página dice quién está detrás ni cómo escribir. pensiones_lab_2 mostraba «Demarquía Planetaria · Cabeza Propia», el desarrollador y un correo para comentarios; lab3 no.

- **Mínimo recomendable:** titular (persona o proyecto), correo de contacto y fecha de la versión, en un pie común a las cinco páginas.
- **LSSI (Ley 34/2002, art. 10):** si la web forma parte de una actividad económica, el titular debe mostrar nombre, NIF, dirección y correo. Un enlace al desarrollador como empresa puede hacer que cuente como tal. **A confirmar.**

### 2. Licencia

No hay licencia (`package.json` es `private` y no hay `LICENSE`). Sin ella, el código y los textos quedan con todos los derechos reservados: nadie puede reutilizarlos legalmente. Eso choca con la idea de un proyecto abierto, en el que cada propuesta es una herramienta más.

**Decisión del autor:**
- **Código:** MIT (la más simple), EUPL-1.2 (europea, con copyleft) o AGPL-3.0 (copyleft también si se sirve por red).
- **Textos, gráficos y resultados:** CC BY 4.0 (con atribución) es lo habitual.

### 3. Atribución y condiciones de los datos

- **Datos públicos españoles** (INE, AEAT, BOE, IGAE, Seguridad Social, Banco de España, AIReF), bajo la Ley 37/2007 de reutilización. Lo habitual es:
  - citar la fuente y la fecha;
  - no desnaturalizar el dato;
  - no dar a entender que la institución avala el uso.

  Las citas ya están. Falta la frase general: «Elaboración propia con datos de …; las instituciones citadas no avalan estos resultados».
- **Comisión Europea y Eurostat** (Ageing Report, EUROPOP2023 y 2025): se reutilizan con reconocimiento de la fuente (Decisión 2011/833/UE; Eurostat publica con CC BY 4.0). Conviene indicar que se han transformado («elaboración propia»).
- **FMI y Funcas.** Solo se usan cifras como contraste, citadas. Las del FMI tienen condiciones propias de uso; las de Funcas son de una entidad privada. Unas pocas cifras con su fuente para comparar no deberían plantear problema, pero conviene revisar sus condiciones antes de abrir la web. **A confirmar.**

### 4. «Supuestos de otros»: que no parezca un aval

El perfil de la AIReF dice «Supuestos de la AIReF, tal cual». Pero es una aproximación del simulador, calibrada con tolerancias: su deuda de 2050 sale en el 122 %, frente al 123 % de la AIReF.

**Propuesta:** «Aproximación del simulador a los supuestos de la AIReF (Estudio 1/2026). No es un resultado de la AIReF ni está revisado por ella.» Lo mismo para el perfil del Ageing Report.

### 5. No es asesoramiento financiero

La consola compara carteras con nombre: «Ciclo de Vida Global (Suecia AP7)», «Fondo común (cartera noruega)» y otras, con rentabilidades. El aviso dice que no es una previsión oficial, pero no que no sea asesoramiento financiero.

**Propuesta:** añadir al pie «No es asesoramiento financiero ni de inversión».

### 6. Privacidad

No se tratan datos personales en la web: todo queda en el navegador. Aun así, conviene una nota corta:
- qué se guarda (escenarios, estado, resúmenes de cálculos);
- dónde (en el navegador) y cómo borrarlo;
- que no hay cookies de terceros ni analítica;
- que el alojamiento (Sites de OpenAI) puede registrar datos técnicos de acceso según sus propias condiciones.

Ese almacenamiento es el que pide el propio usuario para guardar su trabajo, así que no debería hacer falta un banner de consentimiento (art. 22.2 de la LSSI). **A confirmar.**

### 7. El alojamiento y la audiencia

- El Site está en `chatgpt.site`, con las condiciones de ese servicio.
- Abrirlo al público cambia la audiencia. Ese paso es del autor, y está previsto para la beta.
- Antes de abrirlo, revisar las condiciones de Sites para sitios públicos (uso permitido, contenidos y responsabilidad).

### 8. El repositorio

`PepLogar/pensioneslabs3` es privado y guarda copias de documentos de terceros en `data/sources` (PDF de la AIReF y del FMI, ficheros de la AEAT, BOE…). Mientras sea privado no hay problema. Si se hace público:
- o se sacan esas copias y se dejan solo los enlaces y las huellas;
- o se comprueba, una a una, que se pueden redistribuir.

### 9. Accesibilidad (buena práctica)

La norma de accesibilidad (RD 1112/2018) obliga al sector público, no a un proyecto privado. Para una herramienta que quiere servir a todos, conviene una pasada básica:
- contraste;
- navegación con teclado;
- texto alternativo de los gráficos SVG.

## Propuesta de orden

1. **Decisiones del autor:** titular y contacto (1), licencia (2).
2. **Un pie común a las cinco páginas** con:
   - titular, contacto y versión;
   - licencia;
   - «Elaboración propia con datos de …; las instituciones no avalan estos resultados»;
   - «No es una previsión oficial, ni un derecho legal, ni asesoramiento financiero»;
   - enlace a una sección «Aviso legal y privacidad» en Metodología.
3. **Reescribir los dos perfiles de «Supuestos de otros»** (4).
4. **Antes de abrir el Site:**
   - confirmar los puntos 1, 3 y 6 con quien asesore al proyecto;
   - revisar las condiciones de Sites (7);
   - decidir qué hacer con `data/sources` si el repositorio se abre (8).
5. **Generar el paquete de la versión** que se suba.
