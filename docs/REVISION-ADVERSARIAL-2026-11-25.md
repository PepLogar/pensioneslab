# Revisión adversarial del motor y la consola (25/11/2026, versión 1.81.0)

## Cómo se hizo

**Método.** Ocho revisores independientes, cada uno con un frente:
1. identidades contables;
2. cálculo de pensiones;
3. fondos;
4. demografía y macro;
5. deuda y veredicto;
6. simulación hacia atrás desde 1985;
7. consola;
8. estrés.

Cada uno midió con el motor; ninguno tocó el código.

Cada hallazgo pasó por **dos escépticos** que intentaron rebatirlo reproduciéndolo con sus propios guiones. Un **crítico final** buscó lo que había quedado sin mirar, y su hallazgo pasó por otros dos escépticos.

**Resultado.**
- Hubo 28 hallazgos. Los escépticos confirmaron 24 y rebatieron 4.
- No hay ningún fallo crítico.
- Los guiones de prueba están en la carpeta temporal de la sesión: no forman parte del repositorio.

## Lo que está bien, medido

### Identidades contables

Se comprobaron año a año en los siete sistemas y en 22 variantes de estrés. Entre las variantes había:
- quitas del 30 % y del 100 %;
- fondo cautivo;
- los siete modos de transición;
- herencia nocional y conversión de derechos pasados;
- recortes y rescates;
- prima de crisis.

Todo cierra con residuos inferiores a 1e-9 del PIB:
- la deuda, año a año, incluso en los años de quita;
- el reparto del presupuesto;
- la transferencia a pensiones, con un coeficiente de 0,1175 constante (0,114592 × 1,02537);
- el PRTR, con ingreso igual a gasto;
- el fondo, año a año;
- las cuentas nocionales, año a año.

**Separación de flujos.** Una cotización va a un solo destino. El fondo no aparece en ninguna línea de deuda. No hay NaN.

### Pensiones

- **Stock de 2026:** 7.332.576 jubilaciones y una media de 1.672,57 €/mes × 14, igual a la nómina de septiembre.
- **Revalorización por IPC:** idéntica en todas las celdas.
- **Primera pensión de 2027:** 1.718 €/mes, frente a 1.710 € observados.
- **Devengo semestral:** exacto en reparto, nocionales y fondo.
- **Divisor de la renta:** exacto en nocionales y en fondo (422.000 comprobaciones).

### Resultados de partida

Se reproducen los conocidos:
- Reparto: 110,7 % del PIB en 2050 y 180,5 % en 2070, «se rompe» en 2052;
- Mixto progresivo: se rompe en 2046.

### Apertura de 2026

- pensiones públicas del 13,03 % del PIB;
- saldo del −2,40 %;
- 22,44 millones de afiliados;
- intereses del 2,39 % del PIB.

Todo coincide con la calibración documentada.

### Consola

- Cada control vuelve al mismo valor al escribirlo y leerlo.
- El enlace conserva el escenario.
- «Reglas de hoy» devuelve exactamente los valores de hoy.
- La clave de caché incluye la huella del motor.
- Los números de la consola son los del motor.

### Estrés

- El motor es determinista.
- El orden de las claves de la configuración no cambia el resultado.
- No hay NaN en los extremos de ningún control.
- Dentro de los rangos de la consola, todo va en la dirección esperada.

## Simulación hacia atrás

### El contrafactual de 1985

El contrafactual de 1985 se puede correr como reparto puro, aunque la interfaz no lo ofrece. Su apertura de 1984 coincide con la documentación:
- 13,6 millones de cotizantes;
- 4,0 millones de jubilados;
- deuda del 40 % del PIB.

### Comparado con la historia

**No reproduce la historia de España**, ni lo pretende: es un experimento sintético. Pero las distancias son grandes, y conviene que el lector las vea:

| | Simulado | Observado |
|---|---|---|
| Deuda 2007 | 58 % | 36 % |
| Deuda 2012 | 64 % | 86 % |
| Deuda 2019 | 64 % | 98 % |
| Deuda 2020 | 64 % | 120 % |
| Jubilados | máximo de 7,0 M en 2010, bajan a 6,3 M en 2026 | suben hasta 7,3 M |
| Cotizantes 2013 | 19,2 M | 16,2 M |
| Fondo de Reserva | no existe en el modelo | 66.815 M€ en 2011 |

En 2013 la crisis no aparece en los cotizantes. La ausencia del Fondo de Reserva está declarada.

**Conclusión.** La comparación «fondo desde 1985» se mide contra un reparto sintético que no se parece al real. Sirve como experimento, no como prueba de lo que habría pasado.

**Nota sobre la etiqueta del Excel.** Rotula esas filas «Histórico 1985-2025». Es un fallo menor, que está en la lista.

### El motor principal

El motor principal no puede arrancar antes de 2026. Probarlo sobre un año pasado observado, o contra el presupuesto de 2027, queda pendiente.

## Fallos confirmados

### Del motor: piden versión nueva y recálculo

Por importancia:

1. **Mortalidad medio año más joven** (`src/current-cohorts-v10.js:103`, `src/current-simulation-core-v10.js:424`).
   - **Qué pasa:** las cohortes se construyen con la población de mitad de año, pero se les aplica la mortalidad de EUROPOP como si todas hubieran nacido el año más reciente.
   - **Efecto:** sobreviven de más: un 3 % más de mayores en 2040 y un 7-8 % más en 2050. El gasto en pensiones sube 0,2-0,25 puntos del PIB desde 2040, y la deuda de 2070, unos 8 puntos.
   - **Puede mover:** el año de ruptura del Mixto progresivo y el «al filo» de Reparto.
2. **Bulto de jubilaciones en 2027** (`src/current-cohorts-v10.js:334`).
   - **Qué pasa:** el reparto inicial de ocupados de 65 a 74 años pone el 53 % de los de 65 años trabajando, más que a los 64.
   - **Efecto:** en 2027 hay 540.000 altas, frente a unas 430.000 los años siguientes y unas 371.000 observadas. Unos 124.000 pensionistas de más, de por vida, que suman unas 0,16 décimas del PIB.
3. **Fondo cautivo** (`src/progressive-transition.js:638`).
   - **Qué pasa:** los jubilados recuperan la mitad de la represión financiera, que el Estado también se ahorra entera. Nadie paga esa mitad.
   - **Efecto:** con el fondo cautivo, 0,08 puntos del PIB al año en 2050 y 0,22 en 2070.
4. **Quita al fondo cautivo** (`src/creditor-fund-loss.js:37`).
   - **Qué pasa:** con «solo nominal», la pérdida depende del tipo de descuento.
   - **Efecto:** ante una quita del 30 %, el fondo pierde entre el 27 % y el 41 %, cuando debería ser el 30 %.
5. **Rentas del fondo** (`src/current-simulation-core-v10.js:530`).
   - **Qué pasa:** no se recalculan cuando cambia el tipo de la renta de la cartera. Esto pasa con el fondo cautivo.
   - **Efecto:** las reservas se acumulan o se agotan. Cuando se agotan, hasta un 14 % de la renta debida se deja de pagar en un año, sin que ningún dato lo diga.
6. **«Sin rescate» con una medida fechada** (`src/shared/stress-premium.js:35`).
   - **Qué pasa:** el texto dice que hubo rescate y quita, pero la prima de crisis no se retira nunca.
   - **Efecto:** deuda del 263 % en 2070, frente al 185 % con el rescate que el texto anuncia.
7. **Mixto progresivo con un 0 % al fondo** (`src/progressive-transition.js:151`).
   - **Qué pasa:** se convierte en el mixto «de golpe», con un 33 % al fondo.
   - **Efecto:** con menos objetivo sale un fondo mucho mayor, y la ruptura salta de 2069 a 2039.
8. **Letras en los vencimientos de 2027** (`data/debt-policy-2026.js:15`).
   - **Qué pasa:** la franja de 2027 incluye unos 58.000 M€ de letras, aunque la serie dice «sin letras».
   - **Efecto:** las necesidades de 2027 suben 3,6 puntos del PIB. El Mixto de golpe tiene un año de riesgo alto en 2027 que no debería. Los años de ruptura no cambian.

### De la consola y los textos: sin recálculo

**Dos los introdujo la 1.81.0.**

9. **Dónde se invierte y la comisión, en gris con una cotización adicional.**
   - **Qué pasa:** en Reparto y en Nocionales salen en gris aunque haya cotización adicional a una cuenta propia. Con ella sí actúan: mueven el fondo de 2050 del 27 % al 35 % del PIB.
   - **Dónde:** `src/shared/setting-systems.js`.
10. **«Cómo se hace», en gris con Reparto.**
    - **Qué pasa:** sale en gris, pero cualquier modo distinto de «Ninguno» apaga el freno de 2023.
11. **La comisión del fondo común sale en gris en el Mixto progresivo.**
    - **Qué pasa:** valores por debajo de 0,15 % sí cambian el resultado.
12. **«Pagable €/mes» congela y recorta también la renta privada del fondo** (`src/pages/consola.js:289`, `src/domain/series-dictionary.js:53`).
    - **Qué pasa:** el recorte es del Estado y solo debería tocar la parte pública.
    - **Efecto:** con Capitalización, unos 200 €/mes en 2070.
13. **Un valor fuera de la lista aparece como la primera opción** (`src/pages/consola.js:58`).
    - **Qué pasa:** un escenario importado de «Capitalización de golpe» aparece como «Reparto (hoy)».
14. **«Reglas de hoy» sigue activo después de pulsarlo.**
    - **Qué pasa:** compara textos JSON con las claves en otro orden.
15. **«Ricos y empresas» marca «Cotización» como cambiada.**
    - **Qué pasa:** redondea el tipo de cotización.
16. **«Recorte de otros gastos» muestra «−1 % recorte» si hay un plan en el Calendario.**
    - **Qué pasa:** además, escribir en la casilla borra el plan.
17. **La consola no aplica el mínimo y el máximo de las casillas.**
    - **Qué pasa:** un valor tecleado fuera de rango llega al motor.
18. **El semáforo dice siempre «dos años seguidos».**
    - **Qué pasa:** lo dice aunque se cambie ese número.
19. **«Al filo» puede decir «a 0,00 puntos» de su umbral.**
20. **«Y con él llega a 2070» se añade sin motivo.**
    - **Qué pasa:** aparece aunque la medida sea muy anterior a la ruptura.
21. **El Excel rotula «Histórico 1985-2025» las filas simuladas del contrafactual.**
22. **Hay dos frases de `docs/modelo/03` que contradicen al código:**
    - `paygAccrualYears`;
    - la revalorización real de 2028-2030.

### Rebatidos por los escépticos

- **Una quita del usuario con «Aguanta… sin riesgo alto sostenido».** Es coherente con la regla.
- **La «bola de nieve» del semáforo.** No contradice los números.
- **Comparar el contrafactual de 1985 con Reparto.** Está declarado.
- **Deuda de apertura de 2,5 puntos por debajo del Banco de España.** Está declarado.

## Lo que quedó sin mirar

- Las masas por percentil de la AEAT y las bases de IVA, sociedades y vivienda.
- La construcción de cada variable del S0, aparte de las necesidades de financiación.
- Las otras pensiones (viudedad e incapacidad, un quinto del gasto). Siguen la ratio del Ageing Report y no responden a la población ni a la edad del modelo.
- El equilibrio financiero de las cuentas nocionales a largo plazo.
- La renormalización que reparte la franja de vencimientos de 2026 entre los años siguientes.
- Contrastar los primeros años proyectados con el presupuesto de 2027 o la senda fiscal de la AIReF.
