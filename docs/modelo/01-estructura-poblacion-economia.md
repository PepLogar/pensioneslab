## 1 · Estructura del cálculo, población y economía

Esta sección describe el armazón del motor (versión de metodología `common-fund-1.69.0`, calibración `es-current-2026-10-18-v8`): el bucle anual, las cohortes, el empleo, los salarios, el PIB, la edad de jubilación, la automatización y el gasto en sanidad y dependencia por envejecimiento. Los impuestos, las pensiones (conversión en renta, revalorización, cuentas nocionales, capitalización) y la deuda solo se sitúan en el bucle; los describen otras secciones.

Marcas: (O) observación, (R) reconstrucción, (S) supuesto del simulador. Las rutas son relativas a `pensioneslabs3`.

### 1.1 Cadena de llamadas y horizonte

- `simulate(config, runtime)` despacha al modelo actual o al contrafactual de 1985 (`src/simulation.js:8-16`). Esta sección trata solo el modelo actual.
- `createCurrentModelV10()` construye una vez las cohortes, la senda salarial, la política, el motor fiscal y el simulador (`src/model-current-v10.js:31-293`). El simulador anual es `createSimulator(context)` (`src/current-simulation-core-v10.js:26-695`).
- Año base `BASE_YEAR = 2026`, último año `END_YEAR = 2070` (`src/model-current-v10.js:28`; `data/current-spain.js:41`).
- Horizonte largo opcional hasta 2100: opción de ejecución `runtime.horizonYear`, no se guarda en la configuración; crea otro modelo con el mismo código (`src/model-current-v10.js:299-316`). Tras 2070 todas las razones del Ageing Report se congelan en su valor de 2070 (S) (`src/reference-horizon.js:12-13, 79, 112`).
- Con la cláusula de cierre de 2023 activa (la ley actual de reparto), el año completo se ejecuta dos veces: una sonda sin recargo hasta 2050 y la ejecución definitiva con el recargo MEI que resulte (`src/current-simulation-core-v10.js:199-212`). La cláusula se describe en otra sección.

### 1.2 Año base 2026: una foto a ritmo anual

El año 2026 no se simula: es una foto a ritmo anual de la información disponible el 17–18 de octubre de 2026 (`data/current-spain.js:1-4`). El primer año simulado es 2027.

```
L_2026 = 22 437 553
w_2026 = 29 540,26 · (28 410,78 / 27 558,68) · 1,025 = 31 214,97 €
Y_2026 = PIB_2025 · 1,055 = 1 782 963 M€
N_2026 = 6 760 137 + 572 439 = 7 332 576
B_2026 = (pago mensual SS jubilación + Clases Pasivas jubilación) · 14 = 171 700 M€
```

- `L_2026`: afiliación media de septiembre de 2026, participantes equivalentes (O) (`data/current-spain.js:31`).
- `w_2026`: salario EAES 2024 llevado a 2026 con el crecimiento EACL 2025/2024 y la nómina AEAT enero–agosto 2026 (R) (`data/wage-bridge-v5.js`, `data/current-spain-v5.js:8`).
- `Y_2026`: PIB INE 2025 por la previsión nominal del Banco de España (R) (`data/current-spain.js:11, 26`).
- `N_2026`: pensiones de jubilación de la Seguridad Social y de Clases Pasivas en septiembre de 2026; son prestaciones, no personas únicas (O).
- `B_2026`: ritmo anual hipotético de 14 pagas, no gasto anual observado (R) (`data/current-spain.js:18-19`).

La fila 2026 (`initialYear`, `src/current-simulation-core-v10.js:136-174`) usa esas magnitudes y la política de referencia, sea cual sea el escenario: cotizaciones `L·w·τ` con los tipos de 2026, pensiones antiguas `N·w·ρ_0` con `ρ_0 = B_2026 / (N_2026 · w_2026)` (`src/current-cohorts-v10.js:52`), sin capitalización ni cuentas nocionales. La deuda inicial está fijada y no puede cambiarse (`src/model-current-v10.js:223`).

### 1.3 Unidades: euros constantes de 2026 e inflación

- Todo el estado de las cohortes (salarios, derechos, saldos, pensiones) está en euros reales de 2026. Ninguna magnitud de cohorte se infla.
- El índice de precios solo sirve a las cuentas que tienen una parte nominal:

```
P_t = Π_{s=2027..t} (1 + π_s),  π_s = π^AIReF_s en 2027–2030 con el ajuste de la AIReF (el defecto), π en el resto
```

- `π`: `inflationRate`, 0,02 por defecto, rango 0–0,10, ajuste «Inflación» (S) (`src/model-current-v10.js:115, 128`; `src/config-core.js:7`; `src/shared/settings-catalog.js:215`).
- La inflación entra en: (a) el nivel del salario real de 2027, porque el dato AMECO de 2027 es nominal y se deflacta una vez (1.6); (b) la revalorización de las pensiones en curso con el IPC y el tipo real de la deuda (otras secciones); (c) los anclajes nominales de las cuentas fiscales, en particular el PIB nominal de 2028 que fijan los tramos (`src/model-current-v10.js:153-154`).
- `realInterestRate` por defecto `(1 + i_nuevo)/1,02 − 1 = 0,01404` (`src/model-current-v10.js:114`); la deuda se describe en otra sección.
- Con una senda macro externa (contexto de investigación, no el uso normal), `P_t` es el IPC de la fuente y `π_t`, `r_t` se recalculan cada año (`src/model-current-v10.js:129-145`).

### 1.4 Estado y flujo

Estado que pasa de un año al siguiente:

- La lista de cohortes. Cada cohorte es `{birthYear, sex, size, retired, hasWorked, legacyAnnual, paygAnnual, ndcBalance, fundedAssets, ndcAnnual, fundedAnnual}` (`src/cohort-core.js:2-6`), más `targetRetirementAge`, `youngEntryShare`, `fertilityScale`, `preservedFundedAssets` y `retirementYear` cuando aplican. Los valores son por persona; `size` es el número de personas.
- Cuatro libros separados por persona: `legacyAnnual`, derechos y pensiones anteriores a la reforma (prestación definida); `paygAnnual`, derechos de reparto ganados desde 2027; `ndcBalance`, derechos nocionales (no son activos); `fundedAssets`, activos invertidos. La financiación pública no vive en las cohortes: está en las cuentas fiscales de la fila del año.
- La fila del año anterior (`previous`), de la que leen las cuentas fiscales (deuda, escalera de vencimientos, reserva, anclaje nominal de 2028), el freno nocional, el sistema de puntos y la prima de estrés.

Flujos: todo lo que se acumula dentro del año y se escribe en la fila (`output`, `src/current-simulation-core-v10.js:50-132`): cotizaciones, pagos, rendimientos, muertes, herencias, PIB, cuentas públicas.

### 1.5 Orden de los pasos dentro de cada año t ≥ 2027

`run()`, `src/current-simulation-core-v10.js:226-669`:

1. Se quitan las cohortes vacías; con la transición `pension-runoff` se mide la parte que queda de los pensionistas de 2026 (243-244).
2. Reestructuración de deuda del año, si la hay: pérdida de valor sobre los saldos invertidos existentes, antes de todo lo demás (247-248).
3. Entran las cohortes nuevas del año (249; 1.8). Con senda externa, `prepareYearCohorts` ajusta la participación (252-253).
4. Salario `w_t` (254; 1.6), factor de capital público (256), escenario de automatización (257), recargo de la cláusula de cierre (259).
5. Respuesta de Laffer completa: horas `h_t` a partir de la cuña fiscal del año, leída antes de que trabajen las cohortes (266-269). Se describe en la sección de impuestos.
6. Exposición al empleo de cada cohorte, una pasada: `E^elig_t`, `E^gasto_t`, retrasados sin empleo (273-279; 1.9 y 1.11).
7. Personas que trabajan, equivalentes a tiempo completo, desplazados, PIB de referencia del gasto, subsidios, masa salarial, índices de salario y de masa salarial, PIB antes de recortes (282-294; 1.9, 1.7).
8. Saldos iniciales, tipos de cotización del año, cotizaciones agregadas, rendimientos netos de medio año, índice nocional y su freno (295-317).
9. Solo en 2027 y si el experimento está activo: conversión de derechos pasados en capital nocional (337-357).
10. Revalorización de derechos: pensiones en curso (`legacyAnnual`, `paygAnnual`) con el índice de la política; derechos de activos con el índice de salarios (362-375). Con el sistema de puntos, `paygAnnual` de activos y jubilados sigue el salario por el factor de sostenibilidad (370, 373).
11. Dos semestres. En cada uno, para cada cohorte: supervivencia del semestre; si alcanza su edad objetivo, jubilación y conversión en renta; si trabaja, cotización repartida entre reparto, nocional y capitalización, rendimiento, revalorización nocional, devengo de reparto y muertes; si está jubilada, pagos, rendimiento y créditos de mortalidad; al final `size ← size · s` (376-533).
12. Otras pensiones públicas (incapacidad, viudedad y resto) y recortes de pagos fechados (535-552).
13. Agregados del año: cotización desviada a capitalización, cotización pública, pesos efectivos, pagos públicos y privados (557-575).
14. Cuentas públicas: impuestos, gasto, saldo y deuda (585). Luego, si hay recorte de otro gasto, el multiplicador baja el PIB y las cuentas se recalculan una vez (590-594); con Laffer completo, segunda pasada de medida (602-628).
15. Se escribe la fila (629-663).

Las cohortes, los salarios y las cotizaciones no responden a los pasos 14: el PIB tras recortes solo llega a las cuentas públicas.

### 1.6 Salario real

Senda por defecto (`wageMechanism = 'official-2027'`):

```
w_2026 = w_0
w_t    = w_0 · F_2027 / (1 + π_2027) · W^AR_t / W^AR_2027 · ℓ_t · (1 + g_w)^(n_t) · φ^IA_t · K_t      (t ≥ 2027)
W^AR_t = W^AR_{t−1} · [Wn(t) / Wn(t−1)] / (1 + π^AR_t),   W^AR_2026 = 1
Wn(t)  = Wn_a · (Wn_b / Wn_a)^((t − a)/(b − a))        entre anclas a ≤ t ≤ b
```

- `w_0`: salario de 2026 (1.2).
- `ℓ_t`: nivel de productividad y salario a corto plazo del ajuste de la AIReF (1 si está apagado; −0,61 / −0,68 / −0,59 / −0,61 % cada año de 2027 a 2030, y se mantiene). `n_t`: años de desviación, `t − 2026`, o `max(0, t − 2030)` con ese ajuste (`src/shared/short-run-employment.js`).
- `F_2027 = 1,028739`: crecimiento nominal 2027 del salario bruto por asalariado residente, AMECO primavera 2026, `UWSH/NWTN` (O/R) (`data/wage-forecast-v6.js`). Solo 2027 está identificado en la fuente.
- `W^AR_t`: índice de salario real del Ageing Report 2024. `Wn` son los salarios nominales de la ficha de España en 2022, 2030, 2040, 2050, 2060 y 2070 (27 200 → 135 200 €) (O), interpolados geométricamente (R); `π^AR_t` es la inflación IPCA anual del AR (O) (`src/current-cohorts-v10.js:116-133`). Tras 2070, sigue el crecimiento de la última década (S) (122-124).
- `g_w`: `realWageGrowth`, 0 por defecto, rango −0,02…0,04, ajuste «Salarios, por separado de la productividad» (S) (`src/config-core.js:5`; `src/shared/settings-catalog.js:213`).
- `φ^IA_t`: factor salarial de la automatización (1.12). `K_t`: factor de capital público (1.7).
- Código: `src/wage-path-v6.js:6-17`; composición en `src/model-current-v10.js:80`.

Comprobación por defecto (1.70): `w_2027 = 31 214,97 · 1,028739 / 1,026 · 0,9939 = 31 107 €`, con la inflación de 2027 de la AIReF (2,6 %) y el nivel de productividad a corto plazo de su ajuste (−0,61 %); `w_2070 = 56 534 €`.

Consecuencia: el nivel real de todos los salarios desde 2027 depende de la inflación supuesta para 2027. Por defecto es la de la AIReF (2,6 %), no la del ajuste «Inflación», que solo actúa desde 2031. El mecanismo alternativo `ar-v5` usa solo `w_0 · W^AR_t · (1 + g_w)^(t−2026)`; no se usa por defecto.

Dentro del año, `wageIndex_t = w_t / w_{t−1}` revaloriza los derechos de activos y `payrollIndex_t = L_t·w_t / (L_{t−1}·w_{t−1})` alimenta el índice nocional (`src/current-simulation-core-v10.js:295-296, 315`).

### 1.7 Productividad y PIB

```
y_t        = (Y_0 / L_0) · Π_{s=2027..t} (1 + g^AR_s) · (1 + g_y)^(t − 2026) · φ^prod_t · M^IA_t · K_t
Y^bruto_t  = L_t · y_t
Y_t        = Y^bruto_t · (1 − gap_t)
```

- `y_t`: producción por trabajador equivalente a tiempo completo (`src/current-cohorts-v10.js:150-153`; `src/model-current-v10.js:81-85`).
- `g^AR_s`: crecimiento del PIB potencial por ocupado del Ageing Report 2024, `potentialGDPPerWorkerGrowthPct` (O) (`src/current-cohorts-v10.js:131-132`).
- `g_y`: `productivityGrowth`, 0 por defecto, rango −0,02…0,04, ajuste «Productividad y salarios» (S) (`src/config-current-v10.js:24, 115`; `src/shared/settings-catalog.js:206`). En el motor no mueve el salario: de las dos desviaciones, solo `g_w` lo mueve. El control de la consola con ese nombre escribe las dos claves con el mismo valor (`src/shared/settings-panel.js:79-80`). Desde ese control, productividad y salario se mueven juntos.
- `φ^prod_t`, `M^IA_t`: productividad de la automatización y multiplicador de los regímenes alternativos de IA (1.12).
- `gap_t`: brecha de demanda por recorte de otro gasto (sección de gasto). `L_t`: equivalentes a tiempo completo (1.9).
- Código: `src/current-simulation-core-v10.js:297-298, 596-597`.

No hay función de producción con capital privado. El PIB es empleo por productividad exógena.

Factor de capital público (1.60), solo si hay recortes de otro gasto:

```
x_2027 = 1
x_t = [(1 − δ) · x_{t−1} + (δ + g_K) · (1 − c_{t−1} · θ)] / (1 + g_K)
K_t = x_t^ε
```

- `δ = 0,04`, `g_K = 0,015` (S) (`src/shared/public-capital.js:30-31`).
- `c_{t−1}`: recorte de otro gasto del año anterior; `θ`: `cutInvestmentShare`, 1, ajuste «Parte del recorte que cae sobre la inversión» (S).
- `ε`: `publicCapitalElasticity`, 0,122, ajuste «Lo que cuesta a largo plazo recortar inversión pública» (O: Bom y Ligthart 2014) (`src/shared/public-capital.js:21-28`).
- Código: `src/shared/public-capital.js:44-71`. Sin recortes, `K_t = 1`.

PIB de referencia del gasto. El resto del gasto público y las otras pensiones se escalan con un PIB que no recoge la natalidad, la automatización ni el capital público:

```
Y^gasto_t = E^gasto_t · (Y_0 / L_0) · Π (1 + g^AR_s) · (1 + g_y)^(t − 2026)
E^gasto_t = Σ_c E_{c,t} / fertilityScale_c
```

- Código: `src/current-simulation-core-v10.js:281, 291`; `src/model-current-v10.js:86`.
- Decisión del autor (lote 2 de la 1.64.0): `Y^gasto` usa la desviación de productividad `productivityGrowth` (`g_y`), la misma que el PIB. Sanidad, educación y el resto del gasto medido en % del PIB siguen al PIB, no al salario. Antes usaba `realWageGrowth`.
- Con el control «Productividad y salarios» de la consola las dos claves cambian juntas (`src/shared/settings-panel.js:79-80`), y nada cambia. Solo se nota si se edita `realWageGrowth` aparte, con el ajuste «Salarios, por separado de la productividad» (`src/shared/settings-catalog.js:213`). Entonces el salario ya no mueve `Y^gasto`.
- Natalidad, automatización y capital público siguen fuera de `Y^gasto`, a propósito. Son choques: no deben subir ni bajar por sí solos los presupuestos de los servicios cuando el PIB se mueve (`src/fiscal-composition-v10.js:84`; `src/model-current-v10.js:77-78`). La desviación de productividad, en cambio, es la tendencia del PIB.
- Efecto con `productivityGrowth = 0,01` y `realWageGrowth = 0` (reglas de hoy, 1.70; con el empleo de la AIReF, la desviación cuenta desde 2031): en 2050 el gasto público total pasa del 50,8 % al 48,5 % del PIB y la deuda del 117,2 % al 114,1 %. En 2070, el gasto del 55,1 % al 51,3 % y la deuda del 197,4 % al 203,9 %. El gasto crece con el PIB y los ingresos sobre salarios no, así que a la larga la deuda sube aunque el PIB crezca más. (Las cifras de la 1.64, con otro defecto, eran muy distintas.)
- La desviación de incorporaciones `entrantGrowth` sí entra en `Y^gasto`.

### 1.8 Población y cohortes

Fuentes demográficas:

- EUROPOP2025, escenario base, España: población a 1 de enero y migración neta por edad (20–100) y sexo, 2025–2100 (O) (`data/official-population-europop2025.js`); tasas centrales de mortalidad `m_x` (O) (`data/official-mortality-europop2025.js`); fecundidad total por año (R: suma de tasas por edad, coincide con el total publicado a 0,0001) (`data/official-fertility-europop2025.js`). Población y migración de 2100 se mantienen en 2101 (S).
- **Mortalidad de las cohortes (desde la 1.76).** Una cohorte se construye con la población de mitad de año: la media de dos 1 de enero a la misma edad. Por eso la mitad nació un año antes que su etiqueta (año − edad). EUROPOP2025 aplica m_x según la edad que se cumple en el año, t − año de nacimiento real. Así, la mortalidad de la cohorte es la de la edad + 0,5: la media de sus dos mitades, por la interpolación lineal de m_x (R).
  - Se usa en la supervivencia de las cohortes y en los divisores de sus rentas, nocionales y de fondo. Así, el precio de una renta es la mortalidad con la que mueren sus titulares.
  - La esperanza de vida a los 65 del vínculo legal y los años de cobro a los 65 son medidas de una sola edad: siguen en la edad exacta.
  - Código: `COHORT_AGE_SHIFT` (`src/current-cohorts-v10.js`).
  - Hasta la 1.75, la mortalidad iba medio año más joven. Por eso había un 2 % más de jubilados en 2050, y la deuda de 2070 subía unos 8 puntos (revisión adversarial del 25/11, punto 1).
- **Ocupados de 65 años o más en 2026 (desde la 1.76).** Siguen a los de 64: cada edad y cada edad de jubilación objetivo conserva el tamaño por unidad de peso del grupo de 55–64. Solo quedan los que aún no han llegado a su edad de jubilación, como los dejaría el propio motor un año después.
  - Lo que el 65–74 del Ageing Report pide de más se reparte en proporción entre los grupos más jóvenes, así que el total de ocupados de 2026 es el calibrado (S).
  - Hasta la 1.75, ese grupo se normalizaba solo. Ponía a trabajar al 53 % de los de 65 años, más que a los 64, y todos se jubilaban en 2027: 540.000 altas, frente a unas 371.000 observadas. La 1.76 las bajó a 368.000 (punto 2). Desde la 1.78, con la cobertura por generación, son unas 355.000.
- **Cobertura de jubilación por generación (desde la 1.78).** Sin ella, solo se jubilaba quien estaba ocupado en 2026, más las entradas posteriores. Cada generación llegaba a la jubilación con su tasa de empleo de 2026: corta para los nacidos en 1962–1971 y larga para los nacidos desde 1972. Ahora (`data/career-coverage-2026.js`; `initialCohorts`, `src/current-cohorts-v10.js`):
  - **Ocupados de 2026, por edad y sexo:** dentro de cada grupo del Ageing Report siguen la tasa de empleo de la EPA por grupos de 5 años (`data/epa-employment-2026.js`, O). El total de ocupados de 2026 no cambia: 22.437.553. Los de 65 a 74 años continúan a los de 64, que la EPA pone algo por debajo, y son unos 26.000 menos (240.000 frente a 267.000, −10 %). Esa diferencia pasa en proporción a los grupos más jóvenes, que suben un 0,12 %.
  - **No ocupados con carrera (`extra`):** una parte de la población de cada generación, sin empleo en 2026, no trabaja ni cotiza, conserva su derecho anterior por 0,7 de una carrera completa (S) y se jubila a su edad.
  - **Carrera incompleta (`noClaim`):** una parte de los ocupados de 2026 cotiza, pero no llega a la pensión contributiva pública. Pierde el derecho anterior y el de reparto nuevo, y su saldo nocional se extingue; si tiene fondo privado, lo cobra (S).
  - **Calibración (R):** las dos partes salen de una curva lineal por año de nacimiento, con nodos en 1964, 1974, 1984 y 1994 y plana fuera. Con los supuestos del Ageing Report, sus altas igualan las del cuadro 17 de su ficha de España en 2030, 2040, 2050 y 2060. Resultado: +6,1 % de la población para los nacidos hasta 1964, cero hacia 1969, y entre el 5,2 % y el 6,2 % de los ocupados sin pensión para los nacidos desde 1974.
- Ageing Report 2024 (calculado con EUROPOP2023): tasas de empleo por grupos de edad, productividad, inflación, tasa de sustitución de las altas, gasto (O). Sus niveles de personas se rebasan a EUROPOP2025 (R):

```
Nivel25_t = Nivel_AR(t) · Σ_g ω_g · P25_g(t) / P23_g(t) / Σ_g ω_g
```

- `ω_g`: peso del grupo de edad g en ese nivel en el año AR (para el empleo, `employmentShare..Pct` de 20–24, 25–54, 55–64, 65–74). `P25`, `P23`: personas a mitad de año (media de dos 1 de enero) de EUROPOP2025 y EUROPOP2023. Código: `src/reference-horizon.js:36-58, 76-107`. Mezcla de dos ediciones hasta el AR2027, declarada (S).

**Población del Ageing Report (opción, apagada por defecto).** Con `europop2023` = 1, «Población del Ageing Report (EUROPOP2023)», toda la demografía es EUROPOP2023: población, migración y mortalidad (`data/official-population.js`, `data/official-mortality.js`). Las filas del Ageing Report se usan tal cual, sin rebase, porque se calcularon con esa población (`src/reference-horizon.js:116-139`; `src/current-cohorts-v10.js:24-26`). El motor construye un modelo aparte, una vez (`src/model-current-v10.js:301-316`).
- Así se reproducen el empleo y el PIB del Ageing Report, si además se apaga el empleo de la AIReF hasta 2030 (`airefShortRunEmployment` = 0, como hace su perfil): los ocupados de 2050 quedan en el 98,0 % de los de 2026, como su `employment20To74Persons`. Con ese ajuste encendido, el defecto desde la 1.69, quedan en el 100,4 %.
- EUROPOP2023 acaba en 2071, así que con esta población no hay horizonte largo.
- La fecundidad de referencia del ajuste «Hijos por mujer» sigue siendo la de EUROPOP2025 (S).

Cohortes iniciales (`initialCohorts`, `src/current-cohorts-v10.js:334-387`):

```
size_{a,s,A} = L_0 · σ_G / Σσ · P_{a,s} · π_A / Σ_{a',s',A' > a'} P_{a',s'} · π_{A'}
legacy_{a}   = w_0 · 0,77 · min(43, a − 22 + 1) / 43
```

- Activos de 22 a 70 años, por grupos `G` con las cuotas de empleo del AR en 2026 `σ_G` (O). Dentro de cada grupo, peso por población EUROPOP2025 `P_{a,s}` (O) y por el perfil de edades de jubilación observado `π_A` restringido a `A > a` (O: altas por edad, 54–71 años; 65 años = 34,9 %, 66 = 25,1 %, 63 = 13,1 %) (`data/current-pension-stock.js`; `src/model-current-v10.js:63-65`).
- `legacy_a`: derecho anterior a la reforma por carrera real plana, entrada a 22, 43 años de carrera, tasa devengada 0,77 (S: aproximación de pasivo, no historial individual) (`src/current-cohorts-v10.js:357-358, 374`).
- Jubilados: el stock INSS de pensiones de jubilación a 1-9-2026 por tramos de edad y sexo (O) (`data/current-pension-stock.js`), repartido dentro de cada tramo por población EUROPOP2025, escalado al total `N_2026`; la cuantía relativa sigue la media mensual observada del tramo y el total se fija con `B_2026` (R) (`src/current-cohorts-v10.js:363-386`).

Entradas al empleo (`buildReferenceEntrants`, `src/current-cohorts-v10.js:400-436`; `frozenEntrants`, 436-456; `entrantCohorts`, 457-470). Se fijan antes de cualquier escenario, una sola vez, con la edad de 65, sin ganancia de longevidad y con las edades de jubilación de la senda del Ageing Report, que es la que su empleo da por hecha (1.66):

```
Necesario_t = max(0, Ê_t − Σ_{c continúan} E_{c,t})
Ê_t         = L_0 · Emp20–74_t / Emp20–74_2026
peso_{a,s}  = P_{22,s,t} · [a = 22] + max(0, M_{a,s,t}),   22 ≤ a ≤ 70
size^ref    = peso · π_A · Necesario_t / Σ E(candidatos)
size_t      = size^ref · (1 + g_e)^(t − 2026) · f_c
f_c         = 1 + y_c · (F*/F^ref(c) − 1)
```

- `Ê_t`: empleo de referencia del AR rebasado (personas de 20–74) (R) (`src/current-cohorts-v10.js:141-144`).
- `M_{a,s,t}`: migración neta positiva EUROPOP2025 (O); solo cuenta la positiva. Las entradas no son contrataciones observadas ni traen derechos españoles (S).
- `g_e`: `entrantGrowth`, 0, rango −0,02…0,02, ajuste «Inmigración y nuevas incorporaciones al empleo» (S). La desviación se acumula y no se cierra de nuevo al empleo de referencia.
- `f_c`: escala de natalidad; `y_c = youngEntryShare`, la parte joven (22 años, residente) del peso; `F*` = `targetFertility`; `F^ref(c)` la fecundidad EUROPOP2025 del año de nacimiento `c` (`src/fertility-scenario.js:52-57`).
- Con la senda de edad y sin el empleo de la AIReF hasta 2030, el empleo simulado coincide con `Ê_t` (comprobado: 22,44 M en 2026, 24,22 M en 2040, 22,60 M en 2070). Por defecto (1.69), hasta 2030 crece como en la AIReF y después como `Ê_t` desde un nivel más alto: 24,88 M en 2040 y 23,07 M en 2070. Con la edad congelada (el defecto de la 1.66 y la 1.67) queda por debajo: sin el empleo de la AIReF, 23,37 M en 2040 y 21,88 M en 2070; con él, 24,11 M y 22,30 M (medido en la 1.78).
- **Empleo e inflación hasta 2030 como la AIReF (el defecto desde la 1.69; opción en la 1.67 y la 1.68).** Con `airefShortRunEmployment` = 1, «Empleo e inflación hasta 2030 como prevé la AIReF», las entradas de 2027–2030 se multiplican por `1 + b_t`, con `b` = 0,034 / 0,3526 / 0,3734 / 0,4341 (recalibrados en la 1.78, con la senda de edad y la cobertura por generación), y el producto por ocupado y el salario bajan un 0,61 / 0,68 / 0,59 / 0,60 % cada año. También baja el PIB de referencia del gasto (`src/shared/short-run-employment.js`; `src/current-cohorts-v10.js:145-154`, 459-460; `src/wage-path-v6.js:19`; `src/current-simulation-core-v10.js:291`). Con los ajustes de partida, el empleo equivalente crece 1,9 / 1,8 / 1,6 / 1,5 % y el PIB real 2,0 / 1,9 / 1,8 / 1,7 %, como en la AIReF (Informe de seguimiento 2026 del plan fiscal, cuadro 16) (O la meta, S los multiplicadores). Con otros ajustes, los multiplicadores son los mismos y el empleo se mueve con ellos (medido en la 1.71, crecimiento del empleo en 2027–2030): con la edad congelada, 1,74 / 1,50 / 1,35 / 1,31 %; con 3 puntos más de cotización, 1,75 / 1,65 / 1,45 / 1,35 %; con la jubilación a los 67, 2,74 / 3,25 / 2,04 / 1,33 %. Con EUROPOP2023 la población de base es otra y el empleo crece 1,29 / 1,06 / 0,93 / 0,90 %: no es la combinación de la AIReF, que parte de EUROPOP2025. La productividad no lo cambia, porque su desviación cuenta desde 2031 (docs/REVISION-ADVERSARIAL-2026-11-24.md, 10). Los precios suben como su deflactor, 2,6 / 2,3 / 2,1 / 2,0 %, con el mismo tipo de interés nominal (`src/model-current-v10.js`, `priceIndex` y `annualConfig`; el salario de 2027 se deflacta con esa inflación, `src/wage-path-v6.js:18`). Los recién llegados se quedan, cotizan y se jubilan. No se suman a la población, y no hace falta: desde 2026 ningún gasto del motor depende de ella. La sanidad, la dependencia, las otras pensiones y el resto del gasto son porcentajes del PIB de referencia del gasto, que crece con los ocupados.

Natalidad:

- `targetFertility`: 0 = referencia; si no, 0,8–2,1 hijos por mujer, ajuste «Hijos por mujer» (S) (`src/fertility-scenario.js:23-29`; `src/shared/settings-catalog.js:200`). Referencia: 1,114 en 2026, 1,301 en 2070, 1,428 en 2100.
- Afecta solo a los nacidos desde 2027, que entran a trabajar a los 22 años: el primer efecto es en 2049 (`src/fertility-scenario.js:14-16`). Se aplica una vez al tamaño, no se compone cada año; la migración no se escala (S).
- No hay proyección de nacimientos ni segunda generación de madres (`src/current-cohorts-v10.js:486`).

Mortalidad (`src/mortality-core.js:57-92`):

```
a* = a − λ · (t − 2026)
m  = m_x(min(t, 2100), ⌊a*⌋) + [m_x(⌊a*⌋+1) − m_x(⌊a*⌋)] · (a* − ⌊a*⌋)
q  = m / (1 + m/2)
s_{t,a} = √(1 − q)        supervivencia de medio año
```

- `λ`: `longevityGain`, años de edad biológica ganados por año, 0, rango 0–0,80, ajuste «Vidas más largas (nuevos tratamientos)» (S) (`src/config-core.js:6`; `src/shared/settings-catalog.js:204`).
- Edades 20–100; 100 es grupo abierto (O); aplicar su `m_x` a edades mayores y la tabla de 2100 a años posteriores son supuestos (S).
- La supervivencia se aplica en cada semestre a todas las cohortes (`src/current-simulation-core-v10.js:415, 534`). Los factores de renta (`annuityFactor`, `src/mortality-core.js:102-133` y `src/current-cohorts-v10.js:66-98`) usan la misma tabla; se describen en la sección de pensiones.

Esperanza de vida de periodo a los 65 (para la edad ligada y para sanidad):

```
e65_t = ½ Σ_{sexo} Σ_{k ≥ 0} ½ · S_k · (1 + s_k)/2,   S_{k+1} = S_k · s_k
```

- Pasos de medio año desde 65 hasta 125 o `S < 10⁻⁷`; media simple de hombres y mujeres (`src/current-cohorts-v10.js:165-183`).

### 1.9 Empleo y cotizantes: personas frente a horas

Exposición de una cohorte activa en el año (`src/current-cohorts-v10.js:288-293`):

```
E_{c,t} = size_c · ½ · [d_0 + 1(a < A_c) · s_{t,a} · d_1]
```

- `A_c`: edad objetivo de jubilación de la cohorte (1.10). `d_h`: parte que trabaja en el semestre h con el retraso (1.11), 1 sin él.
- Quien llega a su edad trabaja el primer semestre y se jubila a mitad de año (`shouldRetire`, `src/current-cohorts-v10.js:276-278`).

Agregados (`src/current-simulation-core-v10.js:277-298`):

```
E^elig_t   = Σ_c E_{c,t}
Personas_t = E^elig_t · p^IA_t
L_t        = Personas_t · h_t
Desplaz_t  = E^elig_t · u^IA_t + Retrasados_t
Masa_t     = L_t · w_t
```

- `Personas_t` (`workingPersons`): personas que trabajan; base de toda cifra «por cotizante» (`src/shared/working-persons.js:1-13`; `src/current-simulation-core-v10.js:71-74`).
- `L_t` (`workers`): equivalentes a tiempo completo; llevan masa salarial, cotizaciones, derechos nuevos y PIB.
- `h_t`: horas por persona; 1 salvo que la respuesta de Laffer completa (`lafferFullResponse` = 1 por defecto, ajuste «Las horas perdidas bajan también cotizaciones, derechos y PIB») reduzca horas por una subida de la cuña fiscal (sección de impuestos). Por defecto `h_t = 1` y `Personas_t = L_t`.
- `p^IA_t`, `u^IA_t`: parte de horas pagadas y parte no recolocada (1.12).
- La cotización de cada cohorte en un semestre es `½ · w_t · τ^ret_t · d_h · p^IA_t · h_t` por persona viva al inicio del semestre, con `τ^ret_t` el tipo de jubilación (`src/current-simulation-core-v10.js:446-457`; `src/model-current-v10.js:87`). La parte protegida, con el MEI y la solidaridad, solo se suma en agregado (`src/current-simulation-core-v10.js:305`). La división entre reparto, nocional y capitalización se describe en otras secciones.
- `referenceWorkers = Ê_t` y `employmentResidual = Personas_t − Ê_t` se publican como diagnóstico (`src/current-simulation-core-v10.js:94-96`).
- `retirees` cuenta jubilados contributivos (`hasWorked`) con peso ½ por semestre (`src/current-simulation-core-v10.js:502`): 7,33 M en 2026 y 13,12 M en 2070 por defecto (1.69; 12,98 M sin el empleo de la AIReF y 13,94 M con la edad congelada).

### 1.10 Edad de jubilación

Edad objetivo de cada cohorte (`src/current-cohorts-v10.js:271-275`):

```
A_c = A^perfil_c + Δ_c + O_c
Δ_c = R − 65                                     (de golpe, k = 0)
Δ_c = min(R − 65, max(0, ⌊(c + 65 − 2027)/k⌋ + 1))  (por tramos, k > 0 y R − 65 > 1)
O_c = 0                                          si c + 65 ≤ 2027
O_c = max(0, round(ℓ · η · [e65_{c+65} − e65_2027]))
O_c ← min(O_c, max(0, Cap − R))                  si Cap > 0
η   = healthyLifeShare si retirementAgeLinkHealthy = 1; si no, 1
```

- `A^perfil_c`: edad de la cohorte en el perfil observado (1.8). `R = 65` deja las edades de 2026; `R` es un desplazamiento sobre ese perfil, no una edad legal única.
- `R`: `retirementAge`, 65, ajuste «Edad de jubilación» (S) (`src/config-core.js:4`; `src/shared/settings-catalog.js:158`). El motor admite de 50 a 100. El control de la consola va de 60 a 72 (`src/shared/settings-panel.js:28`).
- `k`: `retirementAgeStepYears`, 0, rango 0–6 entero, ajuste «La edad sube: de golpe o por tramos». Con k = 4 y R = 68: 66 para quien cumple 65 en 2027–2030, 67 en 2031–2034, 68 desde 2035 (`src/shared/retirement-age-steps.js:28-32`). Con k = 0 la subida llega a todas las cohortes no jubiladas desde 2027.
- `ℓ`: `retirementAgeLink`, 0, rango 0–1, ajuste «Edad ligada a la esperanza de vida»; `η` con `retirementAgeLinkHealthy` (0) y `healthyLifeShare` (0,5); `Cap`: `retirementAgeCap`, 0 = sin tope (`src/current-cohorts-v10.js:229-249`; `src/config-current-v10.js:34-48`). Referencia de la esperanza de vida: 2027 (`src/current-cohorts-v10.js:18`).
- Año esperado de jubilación para el devengo: `max(t, c + ⌈A_c⌉)` (`src/current-cohorts-v10.js:302-304`). El devengo de reparto usa la tasa de sustitución de altas del AR de ese año escalada por `replacementRate / 0,77` (`src/current-cohorts-v10.js:154-158`; `src/current-simulation-core-v10.js:473-480`); el detalle está en la sección de pensiones.
- Quien entra ya por encima de su edad objetivo sin haber trabajado se jubila en el primer semestre sin carrera inventada (`src/current-simulation-core-v10.js:416-418`).
- Diagnósticos por fila: `retirementAgeLinkOffset` y `yearsCollectingGeneration65`, años esperados de cobro de quien cumple 65 (`src/current-cohorts-v10.js:252-268`; `src/current-simulation-core-v10.js:659-661`).

**Senda de edad efectiva del Ageing Report (el defecto desde la 1.68).** Con `retirementAgeExitPath` = 1, «La edad efectiva sigue la senda del Ageing Report», cada generación se jubila más tarde según cómo sube la edad de salida del empleo del Ageing Report 2024 en el año en que cumple 65, sobre la de 2026. Se mueve su perfil de edades, no se redondea: con una subida d = k + f, cada edad del perfil da 1 − f de su peso a la edad + k y f a la edad + k + 1 (`src/current-cohorts-v10.js:190-221`).

```
d_c = edadSalida^AR_{c+65} − edadSalida^AR_2026     (65,02 en 2026; 66,39 desde 2040: d = 1,37)
```

- La referencia de empleo se construye con la senda (`src/current-cohorts-v10.js:393-471`). Con la senda encendida, las entradas se usan tal cual: el empleo es el del Ageing Report y hay menos jubilados. Con la senda apagada (el defecto en la 1.66 y la 1.67), entran las mismas personas por edad y sexo, pero se jubilan a las edades de 2026; nadie rellena los ocupados mayores que se van antes (S, desde la 1.66). Por eso, con las reglas de hoy, hay un 3 % menos de ocupados en 2040 que en el Ageing Report. Antes de la 1.66, unas entradas propias de la edad congelada mantenían el empleo del Ageing Report, una mezcla incoherente de supuestos (`docs/DECISIONES.md`, 24/11/2026).
- La subida de la senda no es un retraso forzoso. El retraso de 1.11 se mide desde la edad de referencia ya movida, así que con la senda y 65 nadie queda sin empleo esperando ni cobra el subsidio.
- **Premio por demora.** Un año que añade la senda, si cae en la edad legal o después, suma a la pensión de reparto el 4 % de una pensión de carrera completa (LGSS art. 210.2, O; aplicarlo a la de carrera completa es S), en vez del 1/43 de un año corriente (`paygAccrualYears`, `src/current-cohorts-v10.js:305-326`; `src/current-simulation-core-v10.js:478-480`). La edad legal es la de una célula de perfil 65, movida por los ajustes de edad. Un año que la senda añade antes de la edad legal es un año corriente.
- **Sin la senda (opción; el defecto en la 1.67).** La tasa de altas del Ageing Report cuenta con su edad de salida, más alta. Por eso cada año trabajado vale 1/(43 + R_c), con R_c lo que la senda retrasaría a la generación c (0 para quien cumple 65 hasta 2026, 1,37 desde 2040) (`paygAccrualYears`, `src/current-cohorts-v10.js:305-326`). Quien se jubila a las edades de 2026 cobra por los años que trabajó (S). Solo toca lo devengado desde 2027.
- **Sin pensión extra (opción).** Con `exitPathNoExtraPension` = 1, «Con la senda, los años de más no suben la pensión», los años que añade la senda no suman nada, ni premio ni 1/43. Es la lectura del Ageing Report: su tasa de sustitución de las altas, la que el motor usa para la primera pensión, ya es la de su propia edad de salida. Sumarle los años de más contaría dos veces jubilarse más tarde. Con su población (`europop2023`), el motor da así su gasto de 2050 (16,34 %, `docs/DECISIONES.md`, 24/11/2026).
- Con las reglas de hoy y la senda encendida, se rompe en 2050 (no en 2043), la deuda de 2070 es del 199 % (no del 232 %), hay un 5 % menos de jubilados en 2070 y un 3 % más de ocupados en 2040 (1.78).
- Está encendida por defecto desde la 1.68, como en el Ageing Report y la AIReF (decisión del autor, 24/11/2026); hasta la 1.67, apagada. Gasto medio en pensiones de 2022–2050: 14,81 % apagada y 14,24 % encendida, frente al 14,5 % de la AIReF con su propia edad, que sube un año. En 2050: 16,32 % y 15,76 %, frente a su 16,3 % (1.67) (`docs/DECISIONES.md`, 24/11/2026).

### 1.11 Retraso de la jubilación: quién sigue trabajando

```
d_h(a) = θ_R   si  A^perfil_c + 0,5 ≤ a + h/2 ≤ A_c
d_h(a) = 1     en otro caso, o si A_c ≤ A^perfil_c, o si θ_R ≥ 1
Retrasados_{c,t} = size_c · ½ · [(1 − d_0) + 1(a < A_c) · s_{t,a} · (1 − d_1)]
Subsidio_t = Retrasados_t · w_t · 0,4
```

- `θ_R`: `retirementDelayEmployment`, 0,7 por defecto, rango 0,4–1, ajuste «Quién sigue trabajando al retrasar la jubilación» (S; techo 0,84 de Jiménez-Martín, Fedea 2026, R) (`src/shared/retirement-delay.js:1-16`).
- El retraso va del segundo semestre del año en que se alcanza la edad anterior hasta el primero del año de la edad nueva (`src/shared/retirement-delay.js:33-37`; `src/current-cohorts-v10.js:280-284`).
- Los que no siguen no trabajan, no generan derechos ni cotizan y no cobran pensión hasta `A_c`; cobran un subsidio del 40 % del salario (S) (`src/shared/retirement-delay.js:16`; `src/current-simulation-core-v10.js:290-293`).
- El subsidio entra una vez en el gasto y en la renta gravable, junto con la ayuda a los desplazados por la IA (`src/model-current-v10.js:152, 164`).
- Con `R = 67`, en 2035 hay unas 301 000 personas en esa situación (comprobado).

### 1.12 Automatización e IA

Función pura `automationAt(t, config)` (`src/automation-scenario.js:39-81`), aplicada a todas las opciones de sistema por igual:

```
π_t    = clamp((t − 2026) / (T − 2026), 0, 1)
α_t    = (α_IA + α_R) · π_t
ρ_t    = α_t · r
u_t    = α_t − ρ_t
p_t    = 1 − α_t + ρ_t = 1 − u_t
φ^prod_t = 1 + γ · π_t
φ^0_t  = 1 + γ · β · π_t
φ^IA_t = φ^0_t · [1 − α_t + ρ_t · (1 − ℓ_w)] / p_t
Ayuda_t = u_t · E^elig_t · w^sin IA_t · φ^0_t · σ · (1 − off_t)
```

- `α_IA`: `aiAutomationShare`, 0, rango 0–0,70, ajuste «Trabajo que hace la IA»; `α_R`: `robotAutomationShare`, 0, rango 0–0,45, «Trabajo que hacen los robots». Son partes de horas equivalentes, disjuntas; su suma no puede pasar de 1 (`src/config-current-v10.js:140-141, 260, 232-238`).
- `T`: `automationTargetYear`, 2030, «IA: año en que se alcanza esa automatización». Adopción lineal y meseta (S).
- `r`: `automationRedeployment`, 1, «IA: trabajo desplazado que se recoloca». `γ`: `automationProductivityGain`, 0, «IA: productividad que gana la automatización». `β`: `automationWagePassThrough`, 1, «IA: parte de la ganancia que llega al salario». `ℓ_w`: `reemploymentWageLoss`, 0, «IA: pérdida de salario al recolocarse». `σ`: `displacementSupportRate`, 0,4, «IA: ayuda pública a quien no se recoloca».
- `p_t` multiplica la exposición (`Personas_t`) y la cotización de cada cohorte (`src/model-current-v10.js:87`); `φ^IA_t` multiplica el salario; `φ^prod_t` la producción por trabajador; `u_t` da los desplazados.
- La ayuda usa el salario sin automatización ni capital público (`src/model-current-v10.js:94-101`). No da derechos de pensión.
- La automatización no crea rendimiento de inversión ni cotización de robots por sí misma (`src/automation-scenario.js:31-38`).
- Regímenes alternativos (`automationRegime` ≠ `status-quo-payroll`, ajuste «IA: reglas para financiar la automatización») y la automatización de la administración (`publicAdminAutomationShare`) añaden `M^IA_t`, deltas fiscales y rendimientos propios (`src/progressive-transition.js:334-…`; `src/model-current-v10.js:84, 161, 164`). Por defecto están inactivos (`M^IA = 1`). No se detallan aquí.
- Ejemplo comprobado: `α_IA = 0,2`, `r = 0,5` reduce los equivalentes de 2060 de 23,22 M a 20,90 M y deja 2,32 M de desplazados.

### 1.13 Sanidad y dependencia por envejecimiento

Gasto adicional sobre la cuota de 2026, en puntos de PIB (`src/ageing-care.js:22-35`):

```
pts_t = s · { [H_t + LTC_t] − [H_2026 + LTC_2026]
              + 0,1379 · X_t
              + (0,5 − η) / 0,5 · 0,105 · (G_t + X_t) }
G_t = e65_t(λ=0) − e65_2026(λ=0)
X_t = e65_t(λ) − e65_t(λ=0)
Gasto^cuidados_t = pts_t / 100 · Y^gasto_t
```

- `H_t`, `LTC_t`: gasto público en sanidad y en cuidados de larga duración, % del PIB, escenario base del Ageing Report 2024 para España (O) (`data/care-and-health-2024.js`); fuera de 2022–2070 se mantiene el extremo (S).
- `0,1379`: puntos por año extra de esperanza de vida a los 65; `0,105`: puntos por año ganado y por media parte vivida con salud (R: forma reducida de las sensibilidades del AR).
- `s`: `ageingCareSpending`, 1 por defecto, rango 0–1, ajuste «Sanidad y dependencia crecen con el envejecimiento». `η`: `healthyLifeShare`, 0,5, ajuste «Parte de los años ganados que se viven con salud».
- Se calcula en `parts()` de cada año y se suma al resto del gasto primario (`src/model-current-v10.js:169-175`). Por defecto: 0,07 puntos en 2027, 0,96 en 2040, 2,03 en 2070.

### 1.14 Dónde entran impuestos, pensiones y deuda

- Pensiones de cohorte: revalorización (paso 10), jubilación y conversión en renta, cotizaciones repartidas, devengo, pagos y mortalidad (paso 11). Los cuatro libros (antiguo, reparto nuevo, nocional, invertido) se llevan por separado.
- Incapacidad que pasa a jubilación a los 65 (desde la 1.77): entra en los jubilados, como en el Ageing Report (`docs/modelo/03`).
- Otras pensiones públicas: `Y^gasto_t · (Otras_0/Y_0) · o_t / o_2026`, con `o_t` el gasto en pensiones públicas no de jubilación contributiva del AR (`src/model-current-v10.js:180-181, 175`; `src/current-simulation-core-v10.js:541`).
- Impuestos, gasto, saldo y deuda: `parts()` y `publicAccounts()` al final del año (paso 14) (`src/model-current-v10.js:146-215`). Reciben `L_t`, `Masa_t`, `Y_t`, `Y^gasto_t`, desplazados, subsidios, pensiones pagadas y cotizaciones.
- Recortes de otro gasto: multiplicador sobre `Y_t` (paso 14) y, al año siguiente, capital público `K_t` sobre salario y productividad (1.7).

### Límites y simplificaciones

- No hay equilibrio general: salario, productividad y empleo son sendas exógenas más desviaciones constantes. Los impuestos, las pensiones y la deuda no cambian el empleo ni el salario, salvo las horas de Laffer y el capital público.
- El empleo de referencia es el del Ageing Report 2024 rebasado a EUROPOP2025: mezcla de dos ediciones hasta el AR2027. De 2027 a 2030, por defecto (1.69), el empleo, el PIB real y los precios siguen el cuadro macro de la AIReF con multiplicadores propios (S). El nivel de empleo queda por encima de la referencia para siempre (24,9 M en 2040, frente a 24,2 M), y es la elección optimista de las dos fuentes; el Ageing Report de 2027 puede cambiarlo. El recorte de productividad de ese ajuste baja el salario de todos los ocupados, no solo el de los recién llegados, y con él las pensiones nuevas de quienes ya trabajaban: unos 0,27 puntos de PIB menos de gasto en pensiones en 2050 (S, declarado; explica parte de lo que el simulador gasta menos que la AIReF; `docs/REVISION-ADVERSARIAL-2026-11-24.md`, 58). Con la edad congelada (opción), el empleo queda por debajo, porque quien se jubila antes no se sustituye (1.66).
- Las entradas al empleo cierran el empleo de referencia con jóvenes de 22 años y migración neta positiva; no son flujos brutos, no hay emigración de cotizantes ni salidas antes de la jubilación, y nadie entra con derechos españoles.
- Las cohortes son representativas por año de nacimiento, sexo y edad objetivo; no hay carreras individuales, lagunas ni heterogeneidad salarial: todos los activos cobran el mismo salario `w_t`.
- Los derechos anteriores a la reforma de los activos de 2026 vienen de una carrera plana de 43 años, no del historial de cotización.
- Los pensionistas iniciales se cuentan como prestaciones, no como personas; los de edad desconocida solo se recuperan por escala.
- El calendario es semestral: jubilaciones a mitad de año, sin meses.
- La natalidad solo cambia el tamaño de los jóvenes que entran a los 22 años desde 2049; no hay nacimientos proyectados ni efecto sobre la migración.
- La longevidad extra desplaza la edad biológica de forma lineal; la mortalidad de 2100 y la de 100 años se extienden sin cambio.
- Tras 2070, las razones del Ageing Report se congelan (S).
- El nivel real del salario desde 2027 depende de la inflación supuesta para 2027, porque el dato AMECO de ese año es nominal.
- El PIB de referencia del gasto sigue la desviación de productividad, como el PIB, y no la del salario (decisión del autor, lote 2 de la 1.64.0). Ignora natalidad, automatización y capital público, a propósito (1.7).
- La automatización es una forma reducida: rampa lineal, meseta, sin probabilidad ni mercado de trabajo explícito.
- El gasto en sanidad y dependencia es una forma reducida sobre el escenario base del Ageing Report; no hay modelo propio de coste por edad.
- La senda macro externa (`macroRows`, 2026 y de 1 a 5 años más) es solo un contexto de investigación. En ese contexto fija la demografía y la economía: rechaza cambios de edad, salarios, natalidad, longevidad e IA (`src/model-current-v10.js:224-227`; la deuda inicial, 212).
