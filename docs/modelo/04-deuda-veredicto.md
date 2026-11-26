## 4 · Deuda, intereses y veredicto

Esta sección describe cómo pasa el motor del saldo público del año a la deuda, a los intereses y al veredicto «aguanta / se rompe». Los ingresos y las pensiones solo aparecen como entradas (el saldo primario y la tasa de sustitución). Todas las referencias `ruta:línea` son relativas a `pensioneslabs3`. Clave: O = observación, R = reconstrucción, S = supuesto del simulador.

Convenciones del motor. Los stocks y flujos se guardan en euros reales de 2026. Cada año se pasan a nominales con el índice de precios `P_t` para hacer las cuentas de deuda y se devuelven a reales al cerrar (`src/current-fiscal-v13.js:192-195`, `:255-259`). Los ratios sobre el PIB salen de cocientes reales (`src/current-simulation-core-v10.js:97-100`), que dan el mismo valor que los nominales.

### 4.1 Saldo, necesidad de financiación y caja

Qué calcula: la necesidad de financiación del año y su reparto entre la caja, la deuda nueva, las amortizaciones y la recompra.

```
SP_t = −G_t + B^o_t                                    (saldo primario)
S_t  = SP_t − I_t                                      (saldo público)
N_t  = −S_t + SFA_t = −SP_t + I_t + SFA_t              (necesidad de financiación)
```

- `G_t`: lo que falta para pensiones (`pensionGap` = prestaciones públicas − cotizaciones públicas sin MEI − transferencia de impuestos − transferencia de mutuas).
- `B^o_t`: saldo del resto del presupuesto (`otherBudgetBalance`).
- `I_t`: intereses del año (4.3).
- `SFA_t`: ajuste stock-flujo. Hoy se fija en 0 (`src/model-current-v10.js:207`) y el año base lo prohíbe (`src/current-fiscal-v13.js:148`).

`N_t` depende de los intereses, y los intereses dependen de lo que se emite. El motor resuelve esa ecuación lineal por tramos de forma cerrada (`financingSolution`, `src/current-fiscal-v13.js:104-117`). Con `b = −SP_t + SFA_t + I^{old}_t`, `k = r^{new}_t / 2`, `c = r^{surv}_t / 2`, `M_t` = vencimientos, `C_{t−1}` = caja inicial y `D^o_t` = deuda inicial:

```
N ≥ C            : N = (b + k·(M − C)) / (1 − k)    usa toda la caja, emite M + N − C
0 ≤ N ≤ C        : N = b + k·M                      usa caja, refinancia M
−M ≤ N ≤ 0       : N = (b + k·M) / (1 − k)          amortiza −N al vencimiento, refinancia M + N
−D^o ≤ N ≤ −M    : N = (b + c·M) / (1 − c)          amortiza M y recompra −N − M a la par
N ≤ −D^o         : N = b − c·(D^o − M)              cancela la deuda y acumula caja
```

El orden es: primero la caja y después la deuda nueva; con superávit, primero las amortizaciones y después la recompra (`:232-239`). La caja no rinde intereses: solo la deuda genera intereses (`:240-242`) (S). Una comprobación detiene el cálculo si `N_t ≠ −SP_t + I_t + SFA_t` (`:243-244`).

Momento: dentro de `publicAccounts`, después de calcular las cohortes, las cotizaciones, las prestaciones y el presupuesto del año (`src/current-simulation-core-v10.js:590`). Con el multiplicador de recortes o con la respuesta de Laffer, el mismo año se vuelve a calcular con otro PIB (`:586-627`). La deuda inicial es la misma en todos los pases.

### 4.2 Deuda inicial y perfil de vencimientos

```
D_{2026} = d_0 · Y_{2026}
L_{2026} = { (v, w_v · D_{2026}, ρ_0) : v = 2027…2071 }
ρ_0 = I_{2026} / D_{2026}
```

- `d_0`: `initialDebtGDP` = 0,9781 (97,8 % del PIB), «Deuda pública de partida». Es un valor fijo: la validación rechaza cualquier otro (`src/model-current-v10.js:223`). Deuda AAPP observada a 31/07/2026, 1.743.967 M€, con fuente en el Banco de España (O) (`data/current-spain.js:30`). El PIB es 1.782.963 M€.
- `I_{2026}` = 42.656 M€. Son los intereses de 2025 escalados por el crecimiento de 2026 (R) (`data/current-spain.js:29`). Por eso `ρ_0` = 2,446 %. Todas las emisiones iniciales llevan ese mismo cupón (S) (`src/current-fiscal-v13.js:153-157`).
- `w_v`: pesos de vencimiento del Estado en septiembre de 2026 (Tesoro, cuadro 14) (O). Las bandas del gráfico son del TOTAL, letras incluidas. Desde la 1.76, se quitan de la banda de 2027 las letras que vencen ese año: unos 58.000 M€ de unos 201.500 M€, el 3,70 % del total, leído en la escala del gráfico (R). Así las necesidades brutas se quedan sin letras, como dicen 4.4 y 4.7. Hasta la 1.75, las de 2027 sumaban 3,6 puntos de PIB de letras (punto 8). Se quita la banda de 2026 y el resto se normaliza. Las bandas de varios años se reparten a partes iguales (R) (`data/debt-policy-2026.js:15-30`). Aplicar a la deuda AAPP el perfil del Estado es un puente declarado (S) (`data/debt-policy-2026.js:1-3`, `:57`).
- El año base es una foto: sus flujos no se cargan a la deuda (`src/current-fiscal-v13.js:158`).

Cada emisión es una fila de la cartera `debtVintageLedger` (año de emisión, vencimiento, principal nominal, cupón fijo, origen). Todas son bonos a la par, a cupón fijo, con amortización única al vencimiento (S) (`data/debt-policy-2026.js:61`).

### 4.3 Intereses y calendario dentro del año

Todos los movimientos del año ocurren a mitad de año: vencimientos, emisión nueva y recompras (S) (`data/debt-policy-2026.js:60`).

```
I^{old}_t = Σ_{v>t} P_v·ρ_v + ½ · Σ_{v=t} P_v·ρ_v − ½ · R^{buy}_t · r^{surv}_t
I^{new}_t = ½ · E_t · r^{new}_t,        E_t = Ref_t + ΔD^+_t
I_t       = I^{old}_t + I^{new}_t
```

- `P_v`, `ρ_v`: principal y cupón de cada emisión viva.
- `R^{buy}_t`: recompras.
- `r^{surv}_t`: cupón medio de la deuda que sigue viva.
- `E_t`: emisión bruta (`grossDebtIssuance`) = refinanciación `Ref_t` (`debtRefinanced`) + deuda neta nueva `ΔD^+_t` (`debtAdded`).
- `r^{new}_t`: tipo de la emisión nueva (4.5).

Referencias: `src/current-fiscal-v13.js:222-242`. Los intereses de la emisión nueva incluyen los de la deuda que se pide para pagar esos mismos intereses. La cartera nueva conserva la deuda superviviente, reducida en proporción a las recompras, y añade un tramo por cada plazo de la escalera (`:245-251`). Una comprobación detiene el cálculo si `D_t ≠ D^o_t + ΔD^+_t − ΔD^−_t` (`:253-254`). Salidas: tipo efectivo de cierre `effectiveNominalRate = Σ P·ρ / D_t` (`:328`) y tipo implícito `nominalInterestRate = I_t / exposición media` (`:260`, `:322`).

### 4.4 Emisión nueva: escalera del Tesoro y plazo

Qué calcula: cómo se reparte entre plazos cada euro emitido o refinanciado.

```
w_n = Q_n / Σ Q             (escalera observada, n = 3…45 años)
T̄  = Σ n·w_n = 9,88 años
```

- `Q_n`: importes nominales adjudicados de bonos y obligaciones del Tesoro entre enero de 2025 y septiembre de 2026, por el plazo de su etiqueta (O) (`data/debt-issuance-ladder-2026.js:24-42`). Usar esa mezcla en el futuro es un supuesto (S) (`:50`).
- Las letras (189.393 M€) quedan fuera: el simulador no emite deuda a corto plazo (S, decisión del autor) (`data/debt-issuance-ladder-2026.js:44-47`).
- Las obligaciones a más de 30 años se toman a 45 años (`:49`).
- Pesos por defecto: 3 años 14,1 %; 5 años 14,1 %; 7 años 12,8 %; 10 años 33,6 %; 15 años 6,9 %; 30 años 4,7 %; el resto en otros plazos (calculado con `node`).

Ajuste: `newDebtTermYears`, «Plazo de la deuda nueva», 9,88 por defecto, de 2 a 30 años en el catálogo y de 1 a 50 en el motor (`src/shared/settings-catalog.js:182`). Con el valor por defecto se usa la escalera tal cual (`src/debt-issuance.js:48`). Con otro plazo, cada peldaño se multiplica por un factor común `s` y se limita a 1–50 años:

```
n'(s) = min(50, max(1, n·s));   Σ w_n · n'(s) = T   (s por bisección)
```

Cada `n'` no entero se reparte entre los dos años enteros contiguos, lo que conserva exactamente la media (`src/debt-issuance.js:22-58`). El motor recibe esta función por `maturityWeightsForTerm` (`src/model-current-v10.js:121`). El módulo antiguo `src/debt-term.js` (bonos de 7 y 8 años, 15 % / 85 %, media de 7,85) solo sirve hoy de mezcla de referencia para el anclaje de precios (`src/treasury-term-pricing.js:66`). También es la mezcla por defecto de motores sin escalera (`src/current-fiscal-v13.js:136-138`, `data/debt-policy-2026.js:43`).

### 4.5 Tipo de interés de la emisión nueva

Qué calcula: el cupón que fija cada tramo emitido en el año `t`. El cupón no cambia hasta el vencimiento.

```
r^{base}_t = (1 + r^{real}) · (1 + π_t) − 1                              (Fisher)
y(n)       = interpolación lineal de la curva del Tesoro; plana fuera de 1–30 años
y^{ref}    = 0,15·y(7) + 0,85·y(8) = 3,795 %
r_{t,n}    = r^{base}_t + [y(n) − y^{ref}] + p_t
r^{new}_t  = Σ_n w_n · r_{t,n}
```

Referencias: `src/sovereign-risk-premium.js:44`, `src/treasury-term-pricing.js:25-37`, `:60-103`.

- `r^{real}`: `realInterestRate`, «Interés real de la deuda». Por defecto `1,03432/1,02 − 1` = 1,404 % (`src/model-current-v10.js:114`). El ancla nominal de 3,432 % es el rendimiento efectivo de la emisión de septiembre de 2026, con la inflación estimada de los bonos indexados (O) (`data/debt-policy-2026.js:32`, `:50`). Mantenerla constante es S.
- `π_t`: `inflationRate`, «Inflación», 2 % (`src/shared/settings-catalog.js:215`).
- `y(n)`: rendimientos secundarios del 16/10/2026 a 1, 3, 5, 10, 15 y 30 años, de 3,05 % a 4,55 % (Banco de España) (O) (`data/treasury-term-curve-2026.js:23-30`). La interpolación y el tramo plano a partir de 30 años son S (`:32-33`).
- Solo se suma el diferencial por plazo respecto al plazo de referencia, nunca el nivel español otra vez (`src/treasury-term-pricing.js:54-59`). Con la escalera por defecto el diferencial medio es +7,2 pb y `r^{new}` = 3,504 % sin prima de riesgo. El tramo más caro (30–45 años) es el `maxNominalRate` = 4,187 % (`:89`).
- `p_t`: prima de riesgo total = prima por deuda + prima por crisis (4.6, 4.7).

Con una senda macro externa, la inflación y el tipo nominal del año salen de esa senda (`src/model-current-v10.js:137-145`).

La inflación afecta a la deuda de tres maneras: (i) el principal nominal y los cupones fijos de la cartera se erosionan en términos reales, `inflationDebtAdjustment = −(D_{t−1} − C_{t−1}) · π_t/(1+π_t)` (`src/current-fiscal-v13.js:318`); (ii) por Fisher, sube el tipo de la emisión nueva; (iii) cambia el crecimiento nominal `g_t` en los indicadores 4.8–4.9. La deuda indexada no se modela por separado (`data/debt-policy-2026.js:61`).

### 4.6 Prima de riesgo por deuda

```
x_t  = max(0, D^o_t / Y^{nom}_t − θ)
p^D_t = min(cap, a · x_t / 0,10)                  (european-linear)
p^D_t = min(cap, (√a · x_t / 0,10)²)              (legacy-quadratic)
```

Referencia: `src/sovereign-risk-premium.js:31-76`. `D^o_t` es la deuda nominal inicial del año, después de una quita si la hay, y `Y^{nom}_t` el PIB nominal del año (`src/current-fiscal-v13.js:219`). La prima solo encarece la emisión nueva: los cupones vivos no cambian.

| Clave | Por defecto | Nombre visible |
|---|---|---|
| `riskModel` | `european-linear` | «Cómo sube el interés con la deuda» |
| `riskDebtThreshold` (θ) | 1,014 | «Deuda desde la que sube el interés» |
| `riskPremiumAt10pp` (a) | 0,000906 (9,06 pb) | «Cuánto sube el interés por cada 10 puntos de deuda» |
| `riskPremiumCap` | 0,12 | «Techo de esa subida del interés» |

Calibración (R): regresión MCO transversal del diferencial a 10 años frente a Alemania (BCE, septiembre de 2026) sobre la deuda/PIB (Eurostat, 2026-T2) en nueve países del euro. Pendiente: 0,906 pb por punto de deuda; R² = 0,80; θ = la deuda de referencia de la muestra; rango observado 43,7–140,8 % (`data/risk-calibration-europe-2026.js:5-23`). Fuera de ese rango se marca `beyondCalibrationRange` (`src/sovereign-risk-premium.js:73-74`). No es una elasticidad causal (S). El techo de 12 puntos acota el experimento y no garantiza el acceso al mercado (`:1-3`). El diferencial de referencia de 45,4 pb solo sirve para descomponer: no se suma (`:65-71`). El modelo cuadrático (θ = 1, a = 25 pb) se conserva para estados guardados antiguos (`:8-13`).

Camino paralelo sin prima. En el mismo año el motor lleva una segunda cartera, con el mismo saldo primario y las mismas quitas, cuyas emisiones pagan `r^{new} − p_t`. La diferencia `riskPremiumDebtSnowball = D_t − D^{base}_t` aísla la bola de nieve debida a la prima (`src/current-fiscal-v13.js:262-305`; `src/current-simulation-core-v10.js:98-99`).

### 4.7 Prima de riesgo por crisis

```
p^S_t = s · 1[nivel(S0_{t−1}) = alto] · 1[no hay rescate narrativo en años ≤ t−1]
p_t   = p^D_t + p^S_t                       (p^S se suma después del techo)
```

Referencias: `src/shared/stress-premium.js:44-51`, `src/sovereign-risk-premium.js:57-59`.

- `stressPremium`: interruptor, 0 por defecto, «Prima de riesgo por crisis, tras un año de riesgo alto».
- `stressPremiumRate` (`s`): 0,03, «Tamaño de la prima de riesgo por crisis» (`src/shared/stress-premium.js:20-25`). Calibración: diferencial España–Alemania de 283, 435 y 299 pb en 2011–2013 (BCE) (O), redondeado a 3 puntos (S) (`:14-18`).
- El índice del año `t−1` se calcula con las variables de `t−1` y `t−2` (4.8). Se aplica a la emisión de `t` (`src/current-simulation-core-v10.js:582`; `src/model-current-v10.js:202-204`).
- La prima se retira desde el año del rescate de la narrativa (4.10), calculado con los años ya simulados (`rescueYearSoFar`, `src/shared/stress-premium.js:33-37`). Con «sin rescate» no hay año de rescate y la prima dura todo el horizonte (S). Hay una excepción, desde la 1.76: si el lector tiene una medida propia fechada después de 2026, la narrativa da rescate y quita, y la prima se retira en ese rescate, igual que lo cuenta el texto (`hasActiveRescue`; punto 6). Hasta la 1.75, el texto decía rescate y la prima seguía hasta 2070.
- Es la única realimentación del veredicto sobre el motor: el índice S0 y la narrativa no cambian ninguna otra cuenta.

### 4.8 Índice S0 de tensión fiscal

Qué calcula: la parte fiscal del indicador S0 de alerta temprana de la Comisión Europea, año a año, con las variables que produce el motor.

```
S0_t = Σ_{j∈A_t} ω_j · 1[x_{j,t} cruza τ_j] / Σ_{j∈A_t} ω_j
```

- `A_t`: variables disponibles en `t`.
- `ω_j`: poder de señal (1 − error tipo I − error tipo II).
- `τ_j`: umbral de cada variable. Umbrales y pesos: DSM 2022, Institutional Paper 199, recuadro 1.1, tabla 1, p. 40, transcritos a mano con hash del PDF (O) (`data/s0-thresholds-dsm2022.js:1-38`).
- Normalizar por las variables disponibles es la regla del propio S0 (EP 475, §3.4) (`src/shared/sovereign-risk.js:8-10`, `:92-102`).

Variables que calcula el motor (8 de 12; Σω = 0,97), en % del PIB salvo indicación (`src/shared/sovereign-risk.js:48-84`):

| Variable | Definición en el motor | Umbral | ω |
|---|---|---|---|
| Saldo público | `S_t / Y_t` | < −9,61 | 0,07 |
| Saldo primario | `SP_t / Y_t` | < 0,23 | 0,13 |
| Saldo primario que estabiliza la deuda | `d_{t−1}·(i_t − g_t)/(1+g_t)` | > 2,34 | 0,08 |
| Deuda bruta | `d_t − φ·F_t` | > 68,44 | 0,12 |
| Aumento de la deuda | `d_t − d_{t−1}` (pp) | > 8,06 | 0,12 |
| Necesidades brutas de financiación | `(max(0, N_t) + M_t) / Y_t` | > 15,95 | 0,26 |
| Diferencial interés-crecimiento | `(i_t − g_t)·100` (puntos) | > 4,80 | 0,08 |
| Aumento del gasto público | `Δ(gasto total / Y)` (pp) | > 1,90 | 0,11 |

- `i_t`: `effectiveNominalRate`, el cupón medio de la cartera al cierre de `t`.
- `g_t`: crecimiento del PIB nominal.
- `F_t`: fondo de capitalización (`fundedAssetsGDP`).
- `φ`: `crisisFundBackingWeight`, 0 por defecto, «Cuánto cuenta el fondo como respaldo de la deuda». Solo resta en esta variable y no cambia la deuda (S) (`src/shared/sovereign-risk.js:20-22`, `:55`).
- Las necesidades brutas no incluyen letras porque el motor no las emite (4.4).
- Fuera del motor quedan el saldo ajustado por el ciclo, la deuda a corto plazo, la deuda neta y el aumento del consumo público (`inEngine: false`).
- **Lo que eso pesa (declarado, 24/11/2026).** El motor no tiene ciclo: su PIB es el potencial, así que el saldo ajustado por el ciclo sería el propio saldo. Con las reglas de hoy (1.86), ese saldo ronda su umbral (−2,50) desde 2027 (−2,48 en 2027, −2,54 en 2030, −4,52 en 2040), y la deuda neta (deuda menos tesorería, umbral 59,51) está muy por encima (96 % en 2027). Con la deuda neta, el índice pasaría de 0,26 a 0,38 o más, y el riesgo alto sostenido empezaría en 2027, no en 2050; con el saldo ajustado, también a finales de los años veinte. Se mantienen fuera: los umbrales se estimaron con brechas de producción y balances reales que el motor no reproduce. El resultado depende de esta exclusión (`docs/REVISION-ADVERSARIAL-2026-11-24.md`, 56).
- **Al filo.** El índice avanza a saltos: basta que una variable cruce su umbral para pasar de riesgo bajo a alto. `describeRiskPath` guarda el «casi» más cercano (`nearMiss`): antes del primer año de riesgo alto, la variable que sola lo habría disparado, a la menor distancia de su umbral (`src/shared/sovereign-risk.js`). Si queda a menos de 0,5 unidades, el veredicto dice que el año está al filo (`EDGE_GAP`, `src/domain/verdict.js`). Con las reglas de hoy (1.78), las necesidades brutas de financiación de 2049 quedan a 0,22 puntos de su umbral: con +10 puntos básicos de tipo real, la ruptura pasa de 2050 a 2049. En la 1.77 eran 0,18 puntos en 2048, con ruptura en 2049; en la 1.76, 0,08 en 2053, con ruptura en 2054. En la 1.72–1.75, eran 0,23 puntos en 2051 (0,30 en la 1.71), y la ruptura, 2052. En la 1.70, sin la reforma del RETA, quedaban a 0,03 puntos en 2047, y +1 punto básico la llevaba de 2050 a 2047 (55).
- El año 2026 no se puntúa: sin año anterior faltan las variables de cambio (`src/shared/sovereign-risk.js:121-123`).

Niveles (`src/shared/sovereign-risk.js:104-107`): alto si `S0_t ≥ riskHighIndex` (0,36, el umbral fiscal publicado, «Riesgo alto: índice del S0 desde»); moderado si `S0_t ≥ riskModerateIndex` (0,29 = 80 % de 0,36, S, «Riesgo moderado: índice desde»). El índice general de la Comisión (0,46) no se usa: falta el bloque macrofinanciero.

Deuda que no se estabiliza (concepto SRDSF del FMI, adaptado) (`:126-130`):

```
U_t = 1[ SP_t/Y_t < d_{t−1}·(i_t−g_t)/(1+g_t)  y  Δd_t > 0 ]
```

Cuenta los años seguidos `unstableRun`. Hitos (`:133-146`):
- `firstModerateYear`: primer año moderado o alto.
- `firstHighYear`: primer año alto.
- `firstSustainedHighYear`: primer año de la primera racha de `riskSustainYears` = 2 años altos seguidos (S), «Años seguidos de riesgo alto para decir «se rompe»».
- `debtNotStabilisingFrom`: primer año de la primera racha de `riskStabilisationYears` = 5 años (S), «Años seguidos para decir que la deuda no se estabiliza».

### 4.9 Presión de financiación (lectura, sin efecto en el motor)

`src/funding-pressure.js:36-98` lee las cuentas calculadas y no limita ningún flujo. Contribución de la bola de nieve, en puntos de PIB (BCE, Boletín Económico 2/2019, ec. 1):

```
BN_t = 100 · (I_t − g_t · D^{ini}_t) / Y^{nom}_t
```

`D^{ini}_t` es la deuda inicial del año antes de una quita (`openingDebtReal`, `src/funding-pressure.js:66`; `src/current-fiscal-v13.js:259`), no la `D^o_t` de 4.6.

Cuenta los años seguidos con `BN_t > 0` y déficit primario (`:54-75`). Se calculan tres cargas: la de la Seguridad Social (prestaciones / recursos propios), la del Estado (salidas / entradas) y la de la deuda (deuda/PIB frente al límite del usuario). `src/financing-gate.js:21-71` marca los años con deuda neta nueva mayor de 1 € (`needsFundingDecision`). También da el contrafactual sin el préstamo nuevo: quita medio año de intereses sobre `ΔD^+` y mantiene la refinanciación. Es una capa de decisión sobre la proyección: no aprueba préstamos ni declara impagos (`:1-3`).

### 4.10 Rescate, quita e impago narrativos

Son supuestos del proyecto: ninguna regla publicada dice cuándo un rescate se convierte en quita o en impago (`src/shared/crisis-narrative.js:1-7`). Se aplican sobre los años puntuados (`describeNarrative`, `:48-76`):

```
rescate_t     ⇔ primer t con highRun_t ≥ B  y  unstableRun_t ≥ riskStabilisationYears
quita_t       ⇔ primer t > rescate con K años seguidos de (alto y unstableRun > 0)
impago_{t+1}  ⇔ narrativeNoRescue = 1, rescate en t y sin rescate activo del usuario
```

| Clave | Por defecto | Nombre visible |
|---|---|---|
| `narrativeMilestones` | 1 | «Enseñar rescate, quita e impago» |
| `narrativeBailoutYears` (B) | 2 | «Rescate tras estos años seguidos de riesgo alto» |
| `narrativeRestructuringYears` (K) | 3 | «Quita tras estos años más de riesgo alto» |
| `narrativeNoRescue` | 0 | «Camino sin rescate» |

Se considera «rescate activo del usuario» cualquier medida fechada después de 2026 en los calendarios `fiscalRescues` (impuestos), `paymentAdjustments` o `debtRestructurings` (`src/train-journey.js:10`, `:49-50`; `src/shared/crisis-narrative.js:111-113`). Los hitos narrativos no cambian las cuentas, salvo que retiran la prima por crisis (4.7). La «pensión pagable» (`payablePensionFreezeYears` = 4 años congelada en euros desde el rescate; `payablePensionCut` = 10 % desde la quita; referencias de Portugal y Grecia) se muestra junto a la pensión prometida y no cambia la senda (`src/shared/payable-pension.js:1-43`).

### 4.11 Quitas pactadas por el usuario y pérdidas de acreedores

`debtRestructurings` («Quitas de deuda»; pestaña «Acuerdos de deuda» de la Consola) es una lista vacía por defecto. Cada fila tiene año, `haircut`, `termYears`, `nominalRate`, `fundedSovereignShare` (0,15) y `creditorDiscountRate` (0,03) (`src/config-current-v9.js:11-18`, `:56-93`; `src/domain/consola-measures.js:105-108`). En el año `t` (`src/current-fiscal-v13.js:200-217`):

```
W_t   = h · D^{nom}_{t−1}                (quita del principal)
D^o_t = (1 − h) · D^{nom}_{t−1}  →  una sola emisión: vence en t + T, cupón r^q
```

Toda la cartera inicial se sustituye por esa emisión. El camino sin prima aplica la misma quita (`:266-273`). La deuda nueva posterior se sigue tarificando con 4.5–4.6 sobre la deuda tras la quita.

Pérdida del fondo de capitalización (activos invertidos, nunca derechos nocionales ni pensiones públicas) (`src/creditor-fund-loss.js:9-67`, `src/creditor-valuation.js:6-68`). Se aplica al principio del año, antes de entradas, aportaciones, rendimientos y conversiones en renta (`src/current-simulation-core-v10.js:246-249`):

```
VP^{old} = Σ_s Σ_v flujos de la cartera vieja / (1+δ)^{s−t+τ}
VP^{new} = flujos de (1−h)·D al cupón r^q hasta t+T, descontados igual
X        = min(σ · F_{t−1} · P_{t−1}, VP^{old});   ω = X / VP^{old}
ℓ        = ω · (VP^{old} − VP^{new}) / (F_{t−1} · P_{t−1})
F_c ← F_c · (1 − ℓ);   renta de jubilados del fondo ← · (1 − ℓ)
```

- τ = 1 para los cupones de fin de año; τ = ½ para el cupón final y el principal.
- `σ`: `fundedSovereignShare`.
- `δ`: `creditorDiscountRate`.

La pérdida se separa en quita (`fundedHaircutLoss`) y condiciones (`fundedTermsLoss`). No es gasto público. El resto de la quita lo absorben otros acreedores, en una cuenta de memoria. Las rentas colectivas privadas no tienen garantía: absorben la misma variación proporcional (`src/creditor-fund-loss.js:3-8`). Todo esto es S: el `model-current-v10.js:287` lo declara como un experimento sin restricciones de acceso, sin garantías y sin efectos macro.

### 4.12 Suficiencia de la pensión

```
q_t = pensión media_t / salario medio_t + (12·dividendo mensual_t + bono anual_t) / salario medio_t
insuficiente_t ⇔ q_t < f,   f = pensionAdequacyFloor = 0,40
```

Referencia: `src/shared/crisis-narrative.js:86-97`; «Pensión mínima suficiente». La medida `q_t` es `pensionToWage` (`src/sustainability.js:106-120`), la misma que usan los límites del usuario (4.14). El bono anual es `demarquiaPensionBonusAnnual` del escenario futuro (`src/sustainability.js:117-118`). Con los ajustes de partida el dividendo y el bono son 0, y `q_t` es `replacementRate`. La referencia es el 40 % del Convenio 102 de la OIT (O como referencia; la medida del motor es otra, pensión media sobre salario medio, S). `replacementRate` ya recoge los recortes en el pago (`src/current-simulation-core-v10.js:108`). 2026 se excluye. Es una dimensión aparte: nunca se mezcla con la deuda.

### 4.13 Veredicto y regla «se rompe»

```
año de ruptura = min(firstSustainedHighYear, pensionInsufficientYear)
fallo          = 'debt' si firstSustainedHighYear ≤ pensionInsufficientYear; si no, 'pension'
```

Referencia: `src/domain/verdict.js:34-80`; un solo veredicto para toda la aplicación, guardado en caché por resultado y límites (`:77-91`). Se lee sobre los años simulados, 2027–2070 (`END_YEAR` = 2070). La extensión demográfica hasta 2100 de `src/reference-horizon.js:12-14` no entra en el veredicto.

Una sola regla para el veredicto y el semáforo (lote 2, decisión del autor). «Se rompe» son `riskSustainYears` años seguidos de riesgo alto (dos por defecto), o la pensión insuficiente. El rescate, la quita y el impago narrativos vienen después de la ruptura; no la deciden. Tono del veredicto (`verdict.js:18-22` y `:48-51`), con su estado del semáforo:
- «Se rompe» (`fail`, `breaks`): hay año de ruptura.
- «Aguanta, con avisos» (`effort`, `weakens`): hay un año moderado o alto sin ruptura.
- «Aguanta» (`ok`, `holds`): el resto.

Hasta el lote 2, el tono decía «Aguanta con esfuerzo» con riesgo alto sostenido sin quita ni impago, y «No aguanta» solo con quita, impago o pensión insuficiente. El semáforo ya decía «Se rompe en A».

Semáforo (`src/domain/sustainability-light.js:63-94`): toma el estado del veredicto (`verdict.state`); no lo decide otra vez. Titular «Se rompe en A», con A el año de ruptura. Desde ese año todas las casillas son rojas, aunque el índice baje después.

`isSolventThrough2070` exige que no haya riesgo alto sostenido ni rescate (`src/shared/crisis-narrative.js:145`). La señal S0 es de riesgo a un año (`horizonYears: 1`), no una previsión de crisis.

### 4.14 Límites del usuario («Fuera de los límites»)

Son alarmas elegidas por el usuario, no límites legales ni un modelo de solvencia. No entran en el veredicto (`src/sustainability.js:1`).

| Clave | Por defecto | Nombre visible |
|---|---|---|
| `maxDebtGDP` | 150 | «Deuda pública máxima» (% PIB) |
| `maxPensionGapGDP` | 5 | «Lo que puede faltar para pensiones» (% PIB) |
| `minReplacementRate` | 40 | «Pensión media mínima» (% salario) |

Referencias: `src/sustainability.js:2-5`, `src/domain/consola-measures.js:139-143`.

```
fuera_t ⇔ d_t > maxDebtGDP  ∨  G_t/Y_t > maxPensionGapGDP  ∨  100·q_t < minReplacementRate
firstOutsideYear = primer t > 2026 con fuera_t
```

Referencia: `src/domain/consola-measures.js:147-151`. Aquí `q_t` es la misma medida que en 4.12, con el dividendo ciudadano y el bono: `pensionToWage` (`src/sustainability.js:106-120`), usada también en `describeSustainability` (`:63-64`). Los umbrales son estrictos: un valor igual al límite queda dentro (`src/sustainability.js:80-86`). Estado de cada año: base, «Dentro de tus límites», «Presión de financiación» (falta dinero para pensiones o hay déficit) o «Fuera de tus límites» (`:85-86`). Los activos de capitalización y los derechos nocionales nunca compensan la deuda, lo que falta para pensiones ni los umbrales (`:46-47`).

### Límites y simplificaciones

- La deuda es la de las AAPP consolidadas, pero el perfil de vencimientos y el coste de emisión son del Estado (puente S). No hay deuda interna de la Seguridad Social ni letras: las necesidades de financiación y el S0 excluyen el corto plazo.
- Todas las emisiones iniciales tienen el mismo cupón (2,446 %). No hay deuda indexada, primas o descuentos de emisión, revalorizaciones ni divisa. Todos los movimientos ocurren a mitad de año.
- La caja no rinde intereses. Los superávits amortizan primero y recompran a la par después.
- La curva por plazo está congelada al 16/10/2026: solo se usa su diferencial y no se mueve con la deuda ni con el tiempo. El nivel del tipo es el ancla del usuario más Fisher.
- La prima por deuda es una pendiente transversal descriptiva, no causal. La prima por crisis es un escalón fijo activado por el S0 del año anterior. No hay pérdida de acceso al mercado, racionamiento ni impago endógeno.
- El índice S0 usa 8 de las 12 variables fiscales y ninguna macrofinanciera. El nivel «moderado», las rachas de 2 y 5 años y toda la narrativa de rescate, quita e impago son supuestos editables.
- Los hitos narrativos no cambian las cuentas (salvo la prima por crisis) ni las pensiones. La pensión pagable es solo de lectura.
- Las quitas del usuario solo afectan a la deuda viva y a los activos invertidos del fondo, valorados a un rendimiento exigido único. No recortan derechos nocionales, pensiones públicas ni pensiones anteriores a la reforma. No hay efectos sobre el PIB ni sobre el tipo posterior más allá de la menor deuda/PIB.
- Los límites del usuario solo avisan: no cambian el veredicto ni frenan ningún flujo.
- Los intereses de 2026 son los de 2025 por `growth2026` = 1,055 (`data/current-spain.js:29`). Ese factor es la previsión del PIB nominal de 2026 del Banco de España del 9 de octubre, redondeada (`data/current-spain.js:10`). Es el mismo factor que lleva a 2026 el PIB, los ingresos y los gastos de 2025 (`data/current-spain.js:26-29`). Es una reconstrucción, no una observación de 2026.
