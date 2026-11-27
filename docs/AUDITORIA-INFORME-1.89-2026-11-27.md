# Auditoría del informe del escenario (1.89.0, 27/11/2026)

## Cómo se hizo

Tres revisores independientes, sin tocar el código:

1. **Cifras y lógica.** Comparó el informe con la consola y con el motor, en unos seis escenarios.
2. **Impresión, maquetación y accesibilidad.** Imprimió cinco escenarios a PDF con Chrome sin ventana: reglas de hoy, Reparto que se rompe, Capitalización de golpe con 14 ajustes y tres calendarios, Mixto con ahorro propio y el experimento de 1985. También revisó la pantalla, con tema oscuro incluido.
3. **Contenido y textos.** Leyó el informe frente al código, las reglas del proyecto y el informe antiguo de cuatro sistemas.

La regla de mostrar solo el escenario abierto se cumple: la página hace un único cálculo y una prueba lo vigila.

## A · Errores: el informe dice algo falso o lo pierde

1. **Los cambios de la mezcla no salen nunca.** Si en el Mixto con ahorro propio mueves «Límites y mezcla», el informe dice «Ningún ajuste movido». La fila de la mezcla no tiene casilla, así que no cuenta como cambio. Dos revisores lo reprodujeron por separado.
2. **«Ningún ajuste movido» sale junto a cambios reales.** Esa frase solo mira la tabla de ajustes. Por eso aparece también cuando hay medidas con fecha, límites propios o mezcla.
3. **La nota de «Pagable» es falsa.** Dice que es la pensión pagable «si el sistema se rompe». En realidad solo baja desde el año del rescate, que no es el de ruptura. Además, ni el rescate ni la quita salen en el informe. Comprobado con el escenario de partida: se rompe en 2050, la pensión pagable es igual a la media en 2050 y baja en 2060 (rescate en 2051, quita en 2054). Lo dice `src/shared/payable-pension.js:33`.
4. **El enlace en bruto estropea la impresión.** La cita lleva el enlace completo, de 175 a 1.650 caracteres sin cortes.
   - **En pantalla:** la página se desborda en horizontal (hasta 12.000 píxeles de ancho).
   - **En papel:** Chrome encoge todo el informe para que quepa, con texto ilegible, y aun así el enlace se corta.
   - **Debajo, en «Qué cambia»:** el enlace sale recortado a 87 caracteres, y en papel no sirve.
   - **Con las reglas de hoy:** el enlace no lleva escenario, así que abre el que tenga guardado quien lo use.
5. **Los límites pierden decimales.** Un límite de 2,5 sale como «3 % PIB». Y uno de 4,5 sale como cambiado con los dos valores iguales: «5 | 5».
6. **«Recortar otros gastos públicos» puede salir como «−1 %».** Pasa con varios recortes fechados, cuando la consola lo dice en palabras. También redondea 8,5 a 9, mientras el calendario dice 8,5.
7. **Se listan como cambios ajustes que no hacen nada con este sistema.** Por ejemplo, la comisión en Reparto. La consola los pliega, y el informe no lo avisa.
8. **Los textos de supuestos usan los valores de partida.** «Supuestos comunes» y la ficha del sistema dan las cifras de partida y comparan sistemas («en todos…»). Si el lector las cambió, contradicen la tabla de cambios.
9. **Detalles menores:**
   - un valor de lista sin opción sale con punto: «1.5»;
   - el calendario redondea una quita de 12,5 % a 13 %;
   - un error de dibujo se presentaría como «no se ha podido calcular»;
   - mientras se recalcula, Ctrl+P imprime el informe anterior o una página en blanco.

## B · Lo que le falta a quien decide (los datos ya están en el motor)

1. **Por qué se rompe, o qué avisa si aguanta.**
   - **Indicadores que saltan el año de ruptura.** En el escenario de partida, en 2050:
     - saldo primario −2,5 %;
     - deuda 115,9 % frente al umbral del 68,4 %;
     - necesidades brutas 16,5 % frente al 15,95 %.
   - **El detalle de «al filo»:** qué indicador, en qué año y por cuánto faltó.
   - **La regla que se aplica:** índice S0 durante dos años seguidos, o el suelo de la OIT.
2. **Cuándo hace falta ayuda.** Una lista con fecha: primera falta, primer préstamo para pensiones, bola de nieve, prima de riesgo, riesgo moderado, ruptura, rescate, quita o impago, freno de 2023, pensión bajo el suelo y fuera de tus límites.
3. **Cómo se pagan las pensiones públicas**, por años: coste, cotizaciones y mutuas, impuestos asignados y lo que falta. Dentro de lo que falta, **cuánto es el coste de la transición**. En el Mixto progresivo, en 2050 falta un 3,84 % del PIB, del que 2,59 es la transición. También separa las pensiones anteriores a la reforma, el reparto nuevo, las nocionales y las rentas del fondo, como pide `AGENTS.md`.
4. **Cuentas del Estado:** ingresos, gasto, saldo, saldo primario, necesidades de financiación y la deuda que añade la prima. Hoy solo salen los intereses.
5. **Observación, reconstrucción o supuesto:**
   - 2026 es dato de partida; desde 2027, simulación;
   - los supuestos del veredicto, con su tipo.
6. **Frases de separación:** los fondos no son caja del Estado; los saldos nocionales son derechos, no activos.
7. **Fuentes principales y cómo reproducirlo**, con la misma versión, metodología y datos.

## C · Orden, títulos e impresión

- **Orden:**
  1. Cabecera con el veredicto.
  2. Lo que has cambiado.
  3. Por qué se rompe y cuándo hace falta ayuda.
  4. Cómo se pagan las pensiones y cuentas del Estado.
  5. Cifras por años.
  6. Evolución.
  7. Supuestos.
  8. Cómo leerlo.
  9. Fuentes.
  10. Reproducir y citar.
- **Títulos:**
  - «Qué cambia frente a las reglas de hoy» → «Lo que has cambiado», porque la referencia es el sistema elegido en su forma de partida;
  - «De 2026 a 2070» → «Evolución de 2026 a 2070».
- **Gráficos:**
  - marcar el año de ruptura;
  - cambiar uno de los dos de pensión por «Lo que falta y coste de la transición», más en línea con lo primero: si el sistema aguanta;
  - la línea «pagable» solo cuando difiere;
  - quitar la leyenda de una sola línea.
- **Impresión:**
  - un pie en cada página con versión, aviso y número de página («1 / 3»);
  - las filas rotas marcadas sin depender del color;
  - no separar una etiqueta de su texto;
  - los calendarios en tabla y no en párrafo;
  - tipos de letra en puntos.
- **Accesibilidad:**
  - cada gráfico con `role="img"` y una descripción corta en vez de la cita entera;
  - un `tbody` por capítulo;
  - avisar con «Informe listo».

## Lo que está bien

- **Mismas cifras que la consola:** el veredicto, la tabla (también «Pagable»), los intereses, el fondo y el primer año fuera de los límites.
- **Sin roturas de página:** los gráficos y las filas no se parten, y ningún título queda solo al pie.
- **Tabla de años:** cabe en A4.
- **Contraste y tema oscuro:** correctos.
- **Encabezados:** en orden.
- **Escenarios raros:** el experimento de 1985 y los sistemas con fondo salen completos.
