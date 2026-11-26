# Auditoría completa de la 1.85.0, antes de publicar (26/11/2026)

## Cómo se hizo

**Ocho auditores independientes, uno por frente:**
1. los cambios del motor de la 1.76 a la 1.78;
2. las identidades contables;
3. las cifras de los textos frente al motor;
4. la lógica de la consola;
5. las siete páginas en el navegador, también en móvil;
6. la compilación, el paquete y lo legal;
7. la procedencia de los datos;
8. la robustez, la caché y el rendimiento.

Ninguno tocó el código. Cada hallazgo pasó por **dos escépticos** que intentaron rebatirlo reproduciéndolo, y un **crítico final** buscó huecos.

**Resultado:**
- 45 hallazgos, de los que se rebatieron 5 y sobrevivieron 40. Quitando duplicados, quedan 27 problemas distintos.
- Ningún fallo es crítico.
- Los guiones de prueba están en la carpeta temporal de la sesión.

## Lo que está bien, medido

### Resultados de partida

Se reproducen todos los de la 1.85.0, también calculados aparte, con un índice S0 propio sobre los datos de cada año.

| Sistema | Se rompe | Deuda 2050 | Deuda 2070 |
|---|---|---|---|
| Reparto | 2050 (al filo) | 115,9 % | 199,1 % |
| Nocionales | 2060 | | |
| Mixto progresivo | 2043 | | |
| Mixto con ahorro propio | 2043 | | |
| Mixto de golpe | 2037 | | |
| Capitalización de golpe | 2027 | | |

### Identidades contables

Se comprobaron en los seis sistemas y en todas las variantes probadas:
- europop2023;
- jubilación a los 67;
- puntos;
- derechos pasados;
- freno en cualquier sistema;
- cotización adicional.

Todas cierran con residuos inferiores a 4e-14:
- la deuda;
- el reparto de la cotización;
- el fondo;
- las cuentas nocionales, incluidas las extinciones de las carreras incompletas.

No hay NaN.

### Incapacidad que pasa a jubilación (1.77)

- **Entradas:** unas 65.000–72.000 al año.
- **Cómo cuentan:** como jubilados, y se pagan solo como pensión antigua. No tienen fondo, cuenta nocional ni reparto nuevo, con ninguna opción.
- **Sin doble cuenta** con las otras pensiones.
- **Horizonte largo:** funciona hasta 2100.

### Cobertura por generación (1.78)

- **No ocupados con carrera:** nunca trabajan ni cotizan, con ninguna opción probada (Laffer, automatización, jubilación a los 67, puntos).
- **Carreras incompletas:** cotizan, y al jubilarse pierden los derechos públicos.
- **Ocupados de 2026:** suman exactamente 22.437.553 con cobertura o sin ella, y en las dos poblaciones.
- **Tasas de la EPA:** se reproducen dentro de cada grupo de edad.

### Calibración y corto plazo

- **Altas con el perfil del Ageing Report:** 427.000, 550.000, 527.000 y 458.000 en 2030–2060, las mismas que su cuadro 17.
- **Corto plazo de la AIReF:**
  - empleo de 1,9, 1,8, 1,6 y 1,5 %;
  - PIB de 2,0, 1,9, 1,8 y 1,7 %.

### Mortalidad (1.76)

Se aplica igual a la supervivencia y a los divisores de renta: el precio de una renta y la mortalidad con la que mueren sus titulares coinciden. Las medidas de periodo siguen en la edad exacta.

### Gráficos, consola y CSV

Las series coinciden con el motor a 6e-14, y las cifras de la consola son las del motor.

### Páginas

- **Las siete cargan sin errores**, con:
  - «Beta · versión 1.85.0»;
  - el enlace de comentarios;
  - el acceso a la ayuda;
  - los créditos.
- **Portada y ayuda en móvil:** sin desbordamiento horizontal.
- **Consola:** el veredicto, el cambio de sistema, «Reglas de hoy», «Deshacer», los guardados y «Todos los sistemas» funcionan.

### Compilación

- Están las siete páginas y los iconos.
- Las rutas son relativas.
- No aparece ningún correo personal; solo info@aisolutions.peplogar.com.
- Las licencias AGPL y CC BY están en su sitio.

### Datos

Las cifras de incapacidad y de la EPA coinciden con sus ficheros fuente, la tabla de cobertura se reproduce desde sus nodos, y los SHA-256 coinciden. La tabla S0 coincide con el documento de la Comisión.

## Problemas confirmados

### A · Motor y cifras

1. **Pensión media y «del salario medio»** (`src/current-simulation-core-v10.js:53`, `:109`; `src/shared/payable-pension.js`).
   - **Qué pasa:** cuentan en el numerador las rentas del fondo privado de quienes no llegan a la pensión contributiva, pero no a esas personas en el denominador.
   - **Efecto:** 0 en Reparto y Nocionales. En Capitalización de golpe, +0,9 % en 2050 y +2,5 % en 2070, con una tasa del 45,3 % en vez del 44,2 %. En los mixtos, +0,5–0,9 %.
2. **«Salarios, por separado de la productividad» en el extremo de su casilla.**
   - **Qué pasa:** la masa salarial supera el PIB y los ingresos pasan del 100 % del PIB. El motor lo tapa con un suelo y lo enseña como resultado normal (`src/revenue-bases-v10.js:72`). El caso contrario sí se rechaza.
3. **Ingresos fiscales al 0 %.** Con `taxRevenueGDP` = 0, que el validador acepta vía JSON o enlace, el motor calcula pero el veredicto falla (`src/fiscal-display-v8.js:113`).
4. **Productividad al máximo del validador (0,04).** Da un mensaje sobre automatización que no tiene que ver (`src/revenue-bases-v10.js:68`).

### B · Textos con cifras viejas o equivocadas

5. **Supuestos, «Edad de jubilación»** (`src/domain/assumptions-catalog.js:45`). Dice que congelar la senda adelanta la ruptura «de 2052 a 2047». Ahora es de 2050 a 2043.
6. **Supuestos, «Población y empleo»** (`:44`). Dice que sin el corto plazo de la AIReF la deuda de 2050 pasaría «del 110 % al 114 %». Ahora es del 116 % al 120 %, y la misma página ya da 115,9 → 119,7.
7. **Supuestos, «Impuestos sin modelo propio»** (`:34`). Dice que fijos bajan al 1,8 % del PIB en 2070. Es el 1,7 %.
8. **Ayuda de «Rentabilidad real»** (`src/shared/lab-controls.js:33`). Atribuye al Mixto progresivo la cartera de ciclo vital (+2,1) y al de 1985 una prima de +1,9. Los dos usan +1,25 puntos.
9. **Ayuda de «Edad de jubilación»** (`src/shared/settings-catalog.js:53`). «Con 65, la gente se jubila a las edades de 2026» contradice la senda de salida, que está encendida por defecto.
10. **`docs/modelo`, que Metodología muestra:**
    - **01:** la cifra de altas de 2027 y «los totales de los grupos no cambian», cuando cambian un 0,12 %.
    - **03:** la fórmula de mortalidad de las cohortes sin la edad + 0,5, y la cita de páginas de la ficha («9 y 59»).
    - **05:** cifras anteriores a la 1.78 presentadas como actuales.
11. **Supuestos, partidas del Estado** (`:64`). Dice «Sin fuente hasta ahora» y «En revisión», pero el motor ya usa COFOG 2024 de Eurostat.
12. **Mixto con ahorro propio:** Metodología dice que la pensión es el 59 % del salario, y la consola, el 58 %. Es un doble redondeo (`scripts/contrast-external.mjs:357`).

### C · Fuentes

13. **«Fuentes de datos» en Metodología** (`src/domain/source-registry.js`). Omite 11 de los 36 módulos de datos:
    - el INE (también la EPA 65109 de la 1.78) y el Imserso;
    - la incapacidad de la Seguridad Social (1.77);
    - la ficha del Ageing Report y la cobertura (1.78).

    El aviso legal cita al INE.
14. **Punteros a fuentes que no están aquí.** Algunos módulos señalan ficheros que solo existen en pensiones_lab_2 (por ejemplo, `data/mutuas-v7.js`).

### D · Consola

15. **Importar desde Excel.** Una fila de impuestos nueva o editada sube sin aviso el IVA reducido al 12 % y el superreducido al 5 % (`src/shared/excel-models-io.js:1602`). En Reparto, el veredicto pasa de 2050 a 2052. También pone el umbral del IRPF en 22.000 €, y el Calendario usa 30.000.
16. **«Ricos y empresas»** (`src/pages/consola.js:102`).
    - **Qué pasa:** muestra las medidas guardadas en este navegador, no las del escenario abierto.
    - **Efecto:** con un enlace ajeno salen ceros, y tocar un campo reaplica valores viejos. La pestaña cuenta como cambio una subida de cotización hecha en otro capítulo.
17. **El mismo recorte de gasto se lee distinto.**
    - **Qué pasa:** «Partidas del Estado» dice 9,4 %, y la casilla «Recortar otros gastos públicos», 16 %, por encima de su máximo del 10 %. Usan bases distintas con el mismo nombre (`src/pages/consola.js:131`).
18. **Elegir el Mixto progresivo** marca como cambios del lector seis ajustes que son su forma estándar (`src/pages/consola.js:75`).
19. **El enlace** no lleva los límites ni el año, pero la ayuda dice que sirve para llevar los escenarios guardados (`ayuda.html:138`).
20. **`tests/setting-systems.test.mjs`** compara tres campos que no existen, y el catálogo cita una prueba que no está.

### E · Robustez y rendimiento

21. **Sensibilidad** (`src/domain/sensitivity.js:32`). Con escenarios que la consola admite, dos variantes salen del rango del validador. Entonces la página entera falla, con el mensaje en inglés.
22. **Edad ligada a 1/3 o 2/3 de la esperanza de vida.** Cada cálculo es 4–6 veces más lento, unos 30 s en la consola, porque se construye una clave de texto en cada paso (`src/current-cohorts-v10.js:252`).
23. **Simulaciones que fallan.** El trabajador en segundo plano las repite en el hilo principal, y la página se congela antes de dar el error (`src/shared/sim-client.js:65`).

### F · Publicación

24. **«Código fuente»** apunta a un repositorio que todavía es privado. Es una decisión del autor («ya lo abriremos»): hay que abrirlo al publicar, o cambiar el texto.
25. **El nombre:** las cinco herramientas dicen «Pensiones Lab 3», y la portada, la ayuda, los créditos y la atribución 7(b), «Pensiones Lab».
26. **El empaquetador para Sites** (`npm run sites`) falla con los iconos de `public/`. El de Hostinger está bien.
27. **Los sellos** de Gráficos y Sensibilidad escriben «españa» en minúscula.

## Rebatidos por los escépticos

- **Enlace AGPL a un repositorio privado.** Es una decisión ya tomada; queda en el punto 24.
- **El Gmail personal en los commits** si se abre el repositorio. No está en los ficheros.
- **Los resultados exportados** no tienen por qué decir «elaboración propia».
- **«Guardados» sin escenarios** no muestra mal la selección.
- **El tipo medio de la deuda** está bien definido.

## Lo que quedó sin mirar

- **La cifra del 13,3 % del PIB** con la que, según la ayuda, actúa la cláusula de 2023: no se contrastó con el RDL 2/2023.
- **El Excel en escenarios que se rompen por la pensión media:** puede decir «sin riesgo alto sostenido» mientras el veredicto dice «se rompe». No se construyó el caso.
- **El alojamiento real:**
  - el tipo MIME del trabajador en segundo plano;
  - la caché del HTML tras cambiar de versión;
  - Safari y Firefox;
  - la accesibilidad de las herramientas de escritorio.
