## 2 · Ingresos y gasto público

Esta sección describe cómo el motor obtiene cada año los ingresos públicos distintos de las prestaciones y el gasto primario no destinado a pensiones. Las pensiones, la deuda y su financiación se tratan en sus propias secciones. Las rutas son relativas a `pensioneslabs3`. Marcas: (O) observación, (R) reconstrucción, (S) supuesto del simulador.

Convenciones. `t` es el año. `P_t` es el índice de precios (`(1 + inflationRate)^(t−2026)`, por defecto `inflationRate` = 0,02; `src/model-current-v10.js:129`). Los ingresos fiscales se calculan en euros **nominales** dentro de `src/revenue-bases-v10.js` y se devuelven en euros reales de 2026 al dividir por `P_t` (`src/fiscal-composition-v10.js:131`). El subíndice 0 indica el valor de apertura en 2026.

### 2.1 Orden dentro del bucle anual

Para cada año `t ≥ 2027`, `src/current-simulation-core-v10.js` hace lo siguiente:

1. Calcula el salario de referencia, que ya incluye el factor de capital público (§2.11) (`:254`, `src/model-current-v10.js:80`).
2. Con la respuesta completa de Laffer, calcula la cuña del año a partir de las bases del año anterior y, con ella, las horas `h_t` (§2.8) (`:266-269`).
3. Fija los trabajadores equivalentes `N_t = personas · h_t`, la masa salarial `W_t = N_t · w_t` y el PIB antes de recortes (`:283-293`).
4. Fija los tipos de cotización del año: ordinario, MEI, solidaridad y recargo de la cláusula de cierre (§2.2) (`:297-302`).
5. Procesa las cohortes y las prestaciones. Aplica los recortes de pago de pensiones (`:537-552`). No se describen aquí.
6. Llama a `publicAccounts`, que a su vez llama a `parts()` (`src/model-current-v10.js:146-179`). Dentro de `parts()`, el orden es: composición fiscal e ingresos por bases (§2.3–2.7), puente de mutuas (§2.13), recorte de otro gasto (§2.10), cuidados por envejecimiento y apoyo a desplazados. Después, `budget()` reparte los ingresos (§2.9) (`src/current-fiscal-v13.js:50-71`).
7. Calcula la brecha de demanda del recorte. Si es distinta de cero, recalcula las cuentas una vez con el PIB más bajo (§2.10) (`:590-594`).
8. Con horas perdidas, recalcula las cuentas una vez más con la línea de compensación `lafferGdpRevenueOffset` (§2.8) (`:602-628`).

El año base, 2026, usa siempre los tipos de `DEFAULT_CONFIG` (`:140`). Los recargos fiscales actúan solo si `t > 2026` (`src/fiscal-composition-v10.js:126-128`).

### 2.2 Cotizaciones: tipo ordinario, bases, MEI y solidaridad

Qué calcula. El motor obtiene tipos efectivos sobre la masa salarial del modelo, `W_t`. Se dividen en un tipo de jubilación, `ρ^R_t`, que se reparte entre los sistemas, y un tipo protegido, `ρ^P_t`, que siempre es público. Los dos se corrigen por el efecto de la base máxima.

```
ρ^R_t = c · s_R · A^ord_t
ρ^P_t = c · (1 − s_R) · A^ord_t + μ_t + σ_t (+ q_t)
A^ord_t = 1 + ω^RG_ord · (K_t/ŵ_t − 1) + ω^RETA_ord · Δ^RETA_t
μ_t = (MEI0 / W0) · m(t)/m(2026) · [1 + s^RG_MEI · (K_t/ŵ_t − 1) + s^RETA_MEI · Δ^RETA_t]
σ_t = (SOL0 / W0) · [s^RG_sol · Ŝ_t / ŵ_t + (1 − s^RG_sol) · min_j(r_{j,t}/r_{j,2026})]
K_t = Σ_i n_i · min(y_{i,t}, B_t) / Σ_i n_i · min(y_{i,0}, B_0)
y_{i,t} = ȳ_i^{2024} · β · ŵ_t
B_t = B_{t−1} · (1 + π^leg_t + 0,012 · 1[t ≤ 2050]),   B_0 = 12 · 5.101,2 €
Ŝ_t = Σ_j r_{j,t} · X_{j,t} / Σ_j r_{j,2026} · X_{j,0}
X_1 = Σ n_i·min(max(y−B,0), 0,1B),  X_2 = Σ n_i·min(max(y−1,1B,0), 0,4B),  X_3 = Σ n_i·max(y−1,5B, 0)
```

Símbolos:
- `c`: `contributionRate`, «Cotización para pensiones». Por defecto vale 0,22152 = `ordinaryPensionPool / (workers · wage)` (`src/model-current-v10.js:105`). Es un tipo efectivo sobre la masa del modelo, no el tipo legal (R).
- `s_R`: `base.retirementContributionShare` = 0,7349. Es la parte de la cotización ordinaria que se atribuye a jubilación (R).
- `ω`: pesos TGSS del ordinario Régimen General y RETA, 0,8557 y 0,0750 (`data/mutuas-v7.js`) (O/R).
- `ŵ_t`: índice del salario nominal (`src/model-current-v10.js:127`).
- `β` = 1,05669: puente 2024→2026 (`data/wage-bridge-v5.js`) (R).
- `n_i, ȳ_i`: los 100 centiles salariales de la AEAT de 2024 (`data/contribution-bases-v5.js`) (O). Su forma se mantiene fija (S).
- `π^leg_t`: revalorización legal aproximada por la inflación del año previo. Un recorte manual de pensiones no la modifica (`src/current-policy-v5.js:42-49`).
- `m(t)`: calendario del MEI: 0,9 % en 2026, 1,0 % en 2027, 1,1 % en 2028 y 1,2 % en 2029–2050 (`data/pension-policy-2026.js`) (O). `MEI0` = 5.381 M€.
- `s^RG_MEI` = 0,9144, `s^RETA_MEI` = 0,0821.
- `r_{j,t}`: tipos legales de solidaridad en los tres tramos de exceso sobre la base máxima. Pasan de 1,15/1,25/1,46 % en 2026 a 5,5/6/7 % en 2045 y se congelan desde entonces (`src/current-policy-v2.js:33-38`) (O).
- `SOL0` = 731 M€; `s^RG_sol` = 0,9920.
- `Δ^RETA_t`: desviación de la base de autónomos respecto al salario. Vale 0 con el modo por defecto `selfEmployedBaseMode = 'payroll-proxy'` (`src/current-policy-v6.js:14-24`).
- `q_t`: recargo MEI de la cláusula de cierre de 2023. Se suma a `ρ^P` y a `μ` (`src/current-simulation-core-v10.js:302-303`). Su regla pertenece a la sección de pensiones.

Cotizaciones del año: `C_t = W_t · (ρ^R_t + ρ^P_t)` (`:300-302`). Las cotizaciones públicas son `C^pub_t = ρ^P_t·W_t + ρ^R_t·W_t − F_t`, donde `F_t` es lo desviado a cuentas capitalizadas (`:559-560`). Una cotización que va al fondo no entra en `C^pub`: no financia el reparto.

Implementación: `src/current-policy-v2.js:136-144` (MEI base), `src/current-policy-v5.js:10-24,37-72` (base máxima y solidaridad), `src/current-policy-v6.js:14-33` (RETA) y `src/current-policy-v7.js:19-34` (pesos TGSS). La solidaridad y el MEI no generan derechos individuales. Solo el MEI entra en la memoria del fondo de reserva (`accumulateReserve`, `src/current-policy-v2.js:69`). `solidarityRateUpper` es un diagnóstico con el máximo de las razones de tipos, no un intervalo.

**Reforma pendiente del RETA (el defecto desde la 1.71; opción antes).** Con `retaReform2032` = 1, «Los autónomos cotizan por sus ingresos reales desde 2032», el tipo protegido suma `τ^RETA_t = 0,0038 · Y_2026 / (L_2026 · w_2026) · min(1, (t − 2026)/6)`: lo que falta de las cinco décimas de PIB que la AIReF estima para 2032, una vez descontado lo de 2024 y 2026, que ya está en las cotizaciones observadas de 2026 (O/R, AIReF, Estudio 1/2026, págs. 20–21). Entra en línea recta de 2027 a 2032 (S: las tablas de 2027–2031 no están fijadas). Solo es recaudación: no crea derechos (`src/current-policy-v7.js:5-12, 18, 30-33`). Con las reglas de hoy, las cotizaciones de 2032 suben 0,38 puntos de PIB, la deuda de 2050 pasa del 117,2 % al 110,1 % y se rompe en 2052, no en 2050 (medido en la 1.70, con ella apagada; desde la 1.71 es el defecto). El perfil «Supuestos de la AIReF» la enciende.

En `budget()`, el MEI se resta de las cotizaciones que financian pensiones y se suma al «resto del presupuesto» (`src/current-fiscal-v13.js:63-66`). En las cuentas consolidadas no cambia el saldo primario.

### 2.3 Apertura fiscal y otras cotizaciones sociales

Qué calcula. Descompone los «otros ingresos» de 2026 (`otherRevenue = totalRevenue − pensionContributions`) en impuestos, otras cotizaciones y otros ingresos no tributarios. Después hace evolucionar cada componente.

```
T0 = 418.258 M€ · 1,055 = 441.262 M€                       (impuestos SEC 2025, IGAE)
OC0 = 223.230 · 1,055 − pensionContributions = 74.243 M€   (otras cotizaciones)
PRTR0 = 0,008 · Y0 = 14.264 M€                             (PRTR de 2025 en la apertura)
NT0 = otherRevenue − OC0 − T0 − PRTR0 = 74.532 M€          (otros ingresos)
IMP0 = 191.485 · (6.842/181.502) = 7.218 M€                (cotizaciones imputadas D612)
NPS0 = socialContributions2026 − pensionContributions = 28.909 M€
     = MUT0 (20.526) + TGSS0 (8.382)
REM0 = OC0 − IMP0 − NPS0 = 38.116 M€
κ = taxRevenueGDP / (otherRevenue0/GDP0)
MUT_t = MUT0 · (W_t/W0) · A^mut_t
TGSS_t = TGSS0 · A^ord_t · (W_t/W0) · κ
REM_t = REM0 · (W_t/W0) · κ
IMP_t = SAL_t · 6.842/181.502                               (emparejado con la nómina pública)
NT_t = NT0 · (Y_t/Y0) · κ + PRTR_t
PRTR_t = p_t · Y_t
```

- `κ`: `taxRevenueGDP`, «Nivel de los demás ingresos públicos». Por defecto vale 0,33893, así que `κ` = 1. Escala impuestos, `TGSS`, `REM` y `NT`, pero no las mutuas.
- `A^mut_t = 1 + 0,2947·(K_t/ŵ_t − 1) + 0,0427·Δ^RETA_t` (`src/current-policy-v7.js:24`).
- `Y_t`: PIB real del año.
- `SAL_t`: remuneración de asalariados públicos (§2.10).
- El factor 1,055 es el puente nominal 2025→2026 (`data/fiscal-composition-2026.js`) (R).
- `p_t`: el Plan de Recuperación (PRTR), desde la 1.73. Es la diferencia entre los cuadros con y sin PRTR de la AIReF (O): 1,25 % del PIB en 2026, 0,3 % en 2027, 0,2 % en 2028, 0,1 % en 2029 y 0 desde 2030 (`data/prtr-calendar-2026.js`). La apertura trae el de 2025 (0,8 %): se quita de los otros ingresos y de los otros gastos. Cada año entra lo mismo en ingresos y en gastos (§2.10), así que no mueve el saldo. `κ` no lo escala. Un recorte de otros gastos no lo toca. Antes de la 1.73, los 0,8 puntos seguían en los dos lados para siempre.

Código: `src/fiscal-composition-v3.js:26-33,43-59` y `src/fiscal-composition-v10.js:16-30,102-117`. Las imputadas (D612) son ingreso no monetario. Se excluyen de la base que se reparte a pensiones (`nonCashRevenue`, `src/model-current-v10.js:206`).

### 2.4 IRPF

Qué calcula. Obtiene el IRPF nominal a partir de tres rentas indexadas: salarios, pensiones pagadas y resto. Añade un incremento de progresividad que calcula con la tarifa estatal sobre el perfil agrupado de la AEAT.

```
IRPF_t = max(0, P0·[(m_s/m)·L_t + (m_p/m)·Π_t + (m_r/m)·S_t] + Prog_t) · κ · (1 + s_irpf) + E^resc_t
L_t = (W^n_t + U^n_t) / W^n_0            Π_t = Pen^n_t / Pen^n_0
Prog_t = E0 · [(m_s/m)·L_t·(d(ŵ^L_t) − 1) + (m_p/m)·Π_t·(d(π̄_t) − 1)]
d(x) = G(β·x) / G(β) / x
G(x) = Σ_g max(0, n_g · T(x · b_g/n_g) − mín_g)
E0 = 63.298 M€ · G(β)/G(1)
```

Símbolos:
- `P0` = 170.280 M€: impuestos sobre la renta de 2025 en proporción a `T0`.
- `m_s : m_p : m_r` = 94.628 : 21.272 : 30.834: mezcla salario/pensiones/resto de la AEAT de 2025 (O, usada como reparto R).
- `S_t`: índice del excedente (§2.6).
- `U^n`: apoyo a desplazados. Es renta gravable, pero no cotiza.
- `Pen^n`: pensiones pagadas por todos los sistemas, incluidas las privadas (`src/current-simulation-core-v10.js:589`).
- `ŵ^L_t`: renta laboral gravable por trabajador o perceptor de apoyo. `π̄_t` es la pensión media.
- `T`: tarifa estatal general (9,5 % a 24,5 %, seis tramos).
- `b_g, n_g, mín_g`: base, declarantes y mínimo de cada uno de los 10 grupos de `profile2024`.
- `s_irpf`: `irpfSurcharge`, «Recargo del IRPF». Va de 0 a 1 y por defecto vale 0. Es un recargo relativo sobre lo recaudado, no puntos de tipo.

Código: `src/revenue-bases-v10.js:6-14,36-38,77-88,108-109`. La progresividad es solo un incremento estatal bruto. No hay tarifa autonómica ni microsimulación (S).

Rescate fiscal (`fiscalRescues`, nivel experto, «Rescates»). Cada fila fechada sustituye a la anterior; las filas no se suman. Suma puntos marginales por encima de un umbral real:

```
E^resc_t = Σ_g n_g · max(0, (b_g/n_g)·β·I_t − θ·P_t) · D_t · p · κ
I_t = [W^n + U^n + Pen^n + K0·S_t + O0·P_t] / [W^n_0 + Pen^n_0 + K0 + O0] / D_t
D_t = (N_t + U_t + R_t) / (N_0 + R_0)
```

- `p`: `irpfExtraPoints`, de 0 a 0,30.
- `θ`: `irpfThreshold`, en € reales de 2026.
- `K0, O0`: rentas de capital/empresa y otras rentas. Se completan con proporciones de la AEAT sobre la masa salarial (`src/revenue-bases-v10.js:30-31`) (R).

Código: `src/tax-policy-impact.js:22-39` y `src/revenue-bases-v10.js:102-107`.

### 2.5 IVA, otros impuestos sobre productos y resto de impuestos

```
Yd_t = W^n + U^n + Pen^n + K0·S_t + O0·P_t − HC_t − IRPF_t
C_t = max(0, Yd_t) / Yd_0
IVA_t = V0 · [ω_h·C_t + ω_g·G_t + ω_v·P_t] / Σω · κ · (1 + Δ^resc) · (1 + s_iva)
OTR_t = [Q0·C_t·κ + R0·P_t·κ] · (1 + s_otr)
HC_t = (C^tot_t + OC^ef_t) · h,     h = 54.938 / (54.938 + 161.450) = 0,2539
G_t = Y^gasto_t · P_t / Y0
Δ^resc = Σ_k X_k (τ_k − τ0_k) / Σ_k X_k τ0_k,   k ∈ {21 %, 10 %, 4 %}
```

Símbolos:
- `V0` = 120.720 M€: IVA y similares.
- `ω`: base por tipo efectivo para hogares (570.286 M€ · 15,56 %), compras públicas (89.359 · 14,15 %) y vivienda (35.792 · 9,73 %) (AEAT 2025, O).
- `Q0` = 38.350 M€: otros impuestos sobre productos, que siguen el consumo.
- `R0` = 56.920 M€: impuestos sin modelo propio. Por defecto (`unmodeledTaxesFollowGDP` = 1, «Los impuestos sin modelo propio crecen con el PIB», desde la 1.67) siguen al PIB nominal: el término es `R0·(Y^n_t/Y_0)·κ` (`src/revenue-bases-v10.js:94-96`). Es lo que supone la AIReF para el «resto» de recursos: elasticidad 1,00 al PIB nominal (Opinión sobre la sostenibilidad 2025, cuadro 8). Con el ajuste a 0 se mantienen constantes en términos reales, `R0·P_t·κ`, como hasta la 1.66. Las dos opciones son supuestos (S).
- `HC`: parte de los hogares en todas las cotizaciones efectivas, incluidas las desviadas a cuentas capitalizadas y la aportación extra (`src/current-simulation-core-v10.js:589`).
- `Y^gasto`: PIB de referencia del gasto (§2.10).
- `s_iva`: `vatSurcharge`, «Recargo del IVA».
- `s_otr`: `otherTaxSurcharge`, «Recargo de los demás impuestos». Los dos van de 0 a 1 y por defecto valen 0.
- `X_k`: gasto final por tipo (`data/tax-policy-assumptions.js`).

El consumo depende del IRPF ya recargado, así que un recargo del IRPF también baja el IVA. `fiscalMeasures` mide cada medida frente a un contrafactual que mantiene las bases del año (`src/revenue-bases-v10.js:124-157`). `fiscalRescue` es un diagnóstico aparte: no se suma a `fiscalMeasures` (`:130-146`). Código: `src/revenue-bases-v10.js:42-44,89-123`.

### 2.6 Impuesto de sociedades y remuneración de asalariados

```
Comp_t = Comp0 · (W^n_t/W^n_0) + (CA_t − CA_0·W^n_t/W^n_0) · (1 − h)
S_t = max(0, Y^n_t · (1 − 169.037/1.690.012) − Comp_t) / Exc0
SOC_t = Corp0 · S_t · κ
```

- `Comp0` = 862.210 M€ y `Exc0`: remuneración y excedente bruto/renta mixta de la CNE de 2025 escalados al PIB de 2026 (INE, O/R).
- `CA`: todas las cotizaciones efectivas. Solo el cambio de política, en su parte de empleador, se suma a la remuneración.
- `Corp0` = 54.990 M€.

El modelo rechaza el escenario si `Comp_t` queda por debajo de la nómina pública (`src/revenue-bases-v10.js:67-69`). Desde la 1.86 también lo rechaza si queda por encima de la renta de factores, que antes se tapaba con el suelo de `S_t`. Pasa cuando los salarios crecen unos 1,7 puntos al año más que la productividad, y por eso la casilla de salarios llega como mucho a +1,5 (auditoría de la 1.85, 2). Ningún recargo actúa sobre `SOC_t`. Código: `src/revenue-bases-v10.js:40-41,57-72,93`.

Mecanismo alternativo `revenueMechanism = 'gdp-v3'`: todos los impuestos siguen `Y_t/Y0 · κ`. No es el valor por defecto y no admite recargos (`src/fiscal-composition-v10.js:132-137`, `src/model-current-v10.js:219-222`).

Ingresos generales del año:

```
GTR_t = T_t + OC_t + NT_t + Laffer_t + Off_t + ΔParadigma_t
```

(`src/fiscal-composition-v10.js:173`, `src/model-current-v10.js:172`).

### 2.7 Cuña del trabajo

La composición expone dos razones: la cuña por punto de cotización, `0,01·W0/Comp0` = 0,008123, y la cuña por recargo unitario del IRPF, `P0·(m_s/m)/Comp0` = 0,12736. La cuña del consumo es `τc = 0,15557 + Q0^{2025}/(570.286·10⁶)` = 0,21931 (`src/fiscal-composition-v10.js:40-47`, exportado como `LABOUR_WEDGE`).

Cuña del año (`lafferWedgeAhead`, `:65-76`). Se calcula con las bases del año anterior, antes de las cohortes:

```
dτ_t = [(c − c0 − e + q_t)·N_{t−1}·w_{t−1} + s_irpf·IRPF^sin_{t−1}·(m_s/m)] / Comp_{t−1} + dτ^IVA_t
```

- `c0`: tipo de apertura.
- `e`: `lafferExemptContribution`, «Cotización que queda fuera de esa respuesta». Por defecto vale 0. Excluye los puntos que vienen de formalizar empleo sumergido.
- `IRPF^sin`: IRPF antes de medidas.

IVA en la cuña (`lafferVatWedge`, `src/shared/laffer-response.js:162-169`). Actúa solo si `lafferVatResponse` = 1 (por defecto), `lafferFullResponse` = 1 y `t > 2026`:

```
Δτc = s'_iva · 0,15557 + s_otr · (τc − 0,15557)
s'_iva = (1 + s_iva)·(1 + Δ^resc) − 1
dτ^IVA = (1 − τn) · Δτc / (1 + τc + Δτc),   τn = 0,36 + dτ_laboral
```

### 2.8 Respuesta de Laffer: recaudación y horas

Calibración: Trabandt y Uhlig (2009, tabla 6, España). `τ0` = 0,36 es fijo y no es un ajuste. `f`: `lafferSelfFinancing`, «Lo que se pierde al subir impuestos al trabajo», por defecto 0,46 (O).

```
B(τ) = B0 · ((1 − τ)/(1 − τ0))^ε,   ε = f·(1 − τ0)/τ0 = 0,8178,   pico τ* = 1/(1+ε) = 0,550
ret(dτ) = [τ1·((1−τ1)/(1−τ0))^ε − τ0] / dτ,   τ1 = min(0,99, max(0, τ0 + dτ));  ret(0) = 1 − f
φ_t = min(1, (t − 2027 + 1) / A),   A = lafferAdjustYears = 10
Laffer_t = −(1 − ret(dτ_t)) · X_t · φ_t
X_t = (c − c0 − e + q_t)·W_t + ΔIRPF_t·(m_s/m) + dτ^IVA·Comp_t
h_t = max(0,05, 1 + [B(τ1)/B0 − 1] · φ_t · τ1/η_{t−1})
```

Símbolos:
- `X_t`: recaudación estática de las medidas sobre el trabajo, con las bases del año.
- `η`: ingreso público que se pierde por euro de remuneración cuando bajan las horas. Se mide cada año y se usa al siguiente. En 2026 se mide con un 1 % menos de horas (`src/current-simulation-core-v10.js:216-224,239`).

El recargo del IVA entra en la cuña y en `X_t`, pero su propia recaudación no se recorta (`src/fiscal-composition-v10.js:50-60`, `src/shared/laffer-response.js:133-146`). La fase de ajuste es un supuesto (S), porque la fuente da un estado estacionario.

Respuesta completa (`lafferFullResponse`, «Las horas perdidas bajan también cotizaciones, derechos y PIB», por defecto 1). `h_t` multiplica el empleo equivalente: así bajan la masa salarial, las cotizaciones, los derechos nuevos, las aportaciones al fondo y el PIB. Para no contar la pérdida dos veces, el año se recalcula con las bases sin respuesta (escala `1/h_t`). Después se añade `Off_t = Ingresos(sin respuesta) − Ingresos(con respuesta)`, de modo que el año pierde una sola vez la cantidad de la fuente (`src/current-simulation-core-v10.js:607-633`). Con `lafferFullResponse` = 0 solo existe la línea `Laffer_t`.

Funciones: `src/shared/laffer-response.js:34-95,121-131`. `lafferOutputResponse` está obsoleta y el motor la ignora.

### 2.9 Parte de los demás ingresos que va a pensiones

```
TT_t = (GTR_t − IMP_t − MUT_t − PRTR_t) · min(1, a·r)
Resto_t = GTR_t − TT_t + MEI_t − MT_t
Brecha_t = Pen^pub_t − (C^pub_t − MEI_t) − TT_t − MT_t
SaldoPrim_t = −Brecha_t + (Resto_t − G^otro_t)
```

- `a`: `pensionBudgetShare`, «Parte de los demás ingresos que va a pensiones», de 0 a 100 %. Por defecto vale 0,11459 = recursos del Estado asignados en 2026 / (otros ingresos − imputadas − mutuas) = 66.069/576.556 (`src/model-current-v10.js:107`) (O/R).
- `r` = 576.556 / (576.556 − 14.264) = 1,02537. Los fondos del PRTR van a sus proyectos, así que no entran en la base que se reparte. `a` se midió con una base que traía el PRTR de 2025; `a·r` es la misma transferencia sobre la base sin él (`pensionShareScale`, `src/fiscal-composition-v10.js`). Desde la 1.73.
- `MT`: transferencia de mutuas (§2.13).

Código: `src/current-fiscal-v13.js:59-70`. Esta regla reparte ingresos, pero no crea dinero. El saldo primario consolidado no depende de `a`.

Regla de las medidas (`src/shared/budget-share-rule.js:7-56`). La aplica la interfaz cuando cambia un recargo y no se toca `pensionBudgetShare` (`src/shared/scenario-measures.js:26-29`). No la aplica el motor:

```
a' = min(1, a0 + 0,14·s_irpf + 0,11·s_iva + 0,08·s_otr + 0,06·p_2027 + 0,52·k)
```

- `p_2027`: puntos de IRPF del rescate de 2027.
- `k`: recorte de otro gasto.

Los cinco coeficientes son supuestos (S) sin fuente conocida (`src/shared/budget-share-rule.js:7-28`). Vienen de antes de las bases de ingresos v10. No son «la mitad del ingreso extra va a pensiones». Con la apertura, un recargo unitario añade 0,295 (IRPF), 0,209 (IVA) y 0,165 (otros) de la base repartible. La mitad sería 0,148, 0,105 y 0,083. Con la respuesta del motor en 2027 sería 0,128, 0,103 y 0,081. Un punto unitario de IRPF a rentas altas añade 0,256: la mitad sería 0,128, no 0,06. El 0,52 del recorte tampoco es el ahorro del motor, que es 0,563 de la base repartible en 2027. `tests/budget-share-sources.test.mjs` comprueba esas cifras. Desde el desglose por partidas, `src/domain/consola-measures.js:78-91` suma a `a` el ahorro exacto como proporción de la base repartible.

### 2.10 Gasto primario no destinado a pensiones y su recorte

```
SAL_t = SAL0 · 1,045/P_t (2027);  SAL0 · 1,045·1,02/P_t (2028);  SAL0·1,045·1,02 · Y^gasto_t/Y^{n,gasto}_2028 (t > 2028)
OTRO_t = 327.683 M€ · Y^gasto_t / Y0 + PRTR_t
Y^gasto_t = Σ_c exp_c / fert_c · y^ref_t
G^otro_t = SAL_t + OTRO_t − Rec_t + U_t + ΔParadigma^gasto_t + Cuidados_t
```

- `SAL0` = 191.485 M€: remuneración pública (S para el convenio 2027–2028).
- `Y^gasto`: PIB de referencia del gasto. Usa la productividad sin automatización ni capital público, y las personas no ajustadas por los choques de fecundidad (`src/current-simulation-core-v10.js:281,287`; `src/model-current-v10.js:86`) (S). Los nuevos choques no recortan solos los servicios.

Código: `src/fiscal-composition-v3.js:52-59`, `src/fiscal-composition-v10.js:94-101` y `src/model-current-v10.js:175`.

Recorte (`paymentAdjustments[].otherSpendingCut`, «Recortar otros gastos públicos», de 0 a 1, por defecto sin filas). Cada nivel fechado sustituye al anterior (`src/config-current-v9.js:50-52`):

```
Eleg_t = max(0, SAL_t + OTRO_t − SAL_t − Emparejado_t − max(0, MUT_t − MT_t))
Rec_t = Eleg_t · k_t
```

Quedan fuera la nómina pública, los programas emparejados y las mutuas no transferidas. El apoyo a desplazados y los cuidados se suman después del recorte: el recorte no los alcanza (`src/payment-spending-adjustment.js:5-23`).

Multiplicador del recorte (`src/shared/cut-multiplier.js:26-52`). Fuente: Banco de España, DT 1309 (O):

```
sh_t = Rec_t / Y^antes_t,   imp_t = sh_t − sh_{t−1}
gap_t = clamp(1·M_t·imp_t + 0,5·M_{t−1}·imp_{t−1}, −0,2, 0,2)
Y_t = Y^antes_t · (1 − gap_t)
```

- `M_t`: `cutMultiplierCalm`, «Lo que frena un recorte, en calma», por defecto 0,6. Pasa a `cutMultiplierStress`, «… con riesgo alto», por defecto 1,4, si el índice fiscal S0 del año anterior es alto (`riskLevel` = 'high').
- El desvanecimiento `[1; 0,5]` es fijo (S).

Solo responde el PIB: el empleo, los salarios y las cotizaciones no cambian.

Desglose por partidas (`src/budget-partitioner.js`). Es descriptivo y no forma parte del bucle. Divide el gasto antes del recorte en 7 grupos COFOG de 2024 con sus pesos. El tope de cada grupo es el mayor recorte observado en 2010–2014 (O). El punto de fricción, la mitad de ese tope, es un supuesto (S). El tope agregado es `Σ peso·tope` ≈ 18,9 % (`:89-106`). En la consola, el recorte ponderado `Σ peso·k_i` se convierte en `k = Σ peso·k_i · antes/elegible` (`src/domain/consola-measures.js:78-82`). Los umbrales de los avisos (38 %, 11 % y 65 %) son supuestos (`:223-263`).

El diagnóstico del desglose usa como transferencia de referencia `(GTR_t − IMP_t − MUT_t) · a0`, con `a0` = `pensionBudgetShare` de partida, 0,11459 (`src/budget-partitioner.js:175-183`). En 2026 da los 66.069 M€ asignados. El gasto elegible es el del motor, también en un año sin recorte (`otherSpendingEligibleOf`, `src/payment-spending-adjustment.js:31-35`; `src/budget-partitioner.js:158-159`). Hasta el lote 2 de pensioneslabs3 se usaban 0,095895 y 0,57 del gasto, sin fuente; eran anteriores al historial de git (pensiones_lab_2 1.20) y no coinciden con ningún calibrado v1–v8. Con los datos de hoy, el elegible es 0,609 del gasto antes del recorte.

### 2.11 Inversión pública y capital público

```
x_2027 = 1
x_t = [(1 − δ)·x_{t−1} + (δ + g)·(1 − min(1, k_{t−1}·λ))] / (1 + g)
Φ_t = x_t^θ
w_t ← w_t·Φ_t,   y_t ← y_t·Φ_t
```

- `δ` = 0,04 y `g` = 0,015 (S).
- `λ`: `cutInvestmentShare`, «Parte del recorte que cae sobre la inversión», de 0 a 3, por defecto 1 (S).
- `θ`: `publicCapitalElasticity`, «Lo que cuesta a largo plazo recortar inversión pública», de 0 a 0,2, por defecto 0,122 (Bom y Ligthart 2014, O).
- `k_{t−1}`: nivel del calendario de recortes del año anterior. Es la inversión de un año convertida en capital al año siguiente.

Ejemplo: un recorte del 5 % desde 2027 da `x_2040` = 0,974, `Φ_2040` = 0,9968 y `x_2070` = 0,955. `Φ` se aplica al salario de referencia y a la producción por trabajador, pero no al PIB de referencia del gasto (`src/model-current-v10.js:76-86`). Código: `src/shared/public-capital.js:28-31,44-70`. Se supone que el efecto es simétrico (S). La sanidad y la educación no tienen coste en el PIB a largo plazo.

### 2.12 Módulo de rentas altas, empresas y «fraude cero»

`src/shared/wealth-corporate-squeeze.js` no forma parte del bucle anual. Convierte parámetros de la consola (`DEFAULT_SQUEEZE_PARAMS`, `:331-341`) en un parche de configuración (`buildSqueezeConfigPatch`, `:652-716`). Por defecto las palancas valen 0 y el modo es `'realistic'`. El umbral del IRPF (`irpfThreshold`, 150.000 €) y el tipo de Sociedades que maximiza la recaudación (`corporatePeakRate`) tienen su propio valor (`:332`, `:336`).

```
p_eff = p · (1 − 0,29)                                          → fiscalRescues[2027].irpfExtraPoints (≤ 0,30)
s_irpf = min(0,40, φ_E · 0,017·GDP26 / (161.400·1,055) · γ)
s_iva = min(0,40, φ_E · 8.000 / 114.428 · γ),     γ = 1 − 0,52 (realista) o 1
s_otr = min(0,60, 0,58·s_soc·ret_soc(s_soc) + 0,58·0,119·φ_E·γ + 0,025·m_pat·(1 − 0,20))
c = min(0,35, c0 + e_SS + F_form),   F_form = 0,067·CompPriv·ρ_tot·1,055·φ_U / W0 · (1 − 0,42)
ret_soc(s) = [(t1/t0)·((1−t1)/(1−t0))^e − 1] / s,   t0 = 0,25,  t1 = t0(1+s),  e = 1/t* − 1,  t* = 0,61
```

Símbolos:
- `φ_E`: `godModeTaxEnforcement`. `φ_U`: `godModeUndergroundLabor`.
- `m_pat`: multiplicador del impuesto sobre el patrimonio.
- `s_soc`: recargo de Sociedades. El factor 0,58 es Corp0/(Q0+R0), y pasa el recargo a la base de «otros impuestos».

Fuentes:
- 0,29 y 0,20: Agrawal y Foremny; Agrawal, Foremny y Martínez-Toledano (O, cota superior regional).
- 8.000 M€, 11,9 %, 1,7 % y 6,7 %: brechas de cumplimiento (O).
- 0,52 y 0,42: supuestos sin fuente (S, `:303-306`).

El parche fija `lafferExemptContribution = min(0,1, F_form)`, porque la formalización es base nueva y no una cuña más alta (`:711`). También fija `realWageGrowth`, `entrantGrowth` y `productivityGrowth` con las penalizaciones del análisis, acotadas a sus rangos (`:712-714`). En modo `'static'` también fija `lafferSelfFinancing` = 0. Además ajusta `pensionBudgetShare` con la regla de §2.9. La parte de Sociedades del recargo no tiene curva de Laffer en el motor: el módulo la descuenta antes con `ret_soc`. `computeSqueezeAnalysis` (`:511-630`) y la escalera de confiscación (`:469-504`) son análisis de pantalla con importes de 2026 escritos en el código (p. ej. patrimonio 2.250 M€). No los usa el motor.

### 2.13 Puente de mutuas

```
MT_t = (CC0 + RE0) · W_t / W0 ≤ MUT_t
```

- `CC0` = 1.539 M€: transferencias por coste de capital.
- `RE0` = 1.828 M€: reaseguro (Seguridad Social, ejecución de 2025 y 2026, O/R).

Código: `src/mutua-pension-bridge-v8.js:5-23`. Las cotizaciones de mutuas son ingreso público restringido. Se excluyen de la base de `TT` y de la escala `κ`. Nunca financian cuentas nocionales ni capitalizadas. Solo `MT` financia pensiones públicas (`src/current-fiscal-v13.js:62-66`). El resto queda protegido frente al recorte (§2.10). El puente es un supuesto de financiación, no una valoración actuarial.

### Límites y simplificaciones

- No hay microsimulación fiscal. El IRPF usa 10 grupos de la AEAT de 2024, con forma fija, y solo la tarifa estatal para la progresividad. No hay tarifa autonómica, foral ni deducciones dinámicas.
- La propensión al consumo, la mezcla gravable y la distribución salarial (100 centiles) quedan fijas. No hay respuesta de precios al IVA ni elusión, salvo la curva de Laffer del trabajo.
- Los impuestos sin modelo (`R0`, unos 57.000 M€) se mantienen constantes en términos reales, y la vivienda sigue los precios: es un supuesto explícito, no una previsión.
- La curva de Laffer solo cubre impuestos sobre el trabajo, con `τ0` = 0,36 fijo. Sociedades y patrimonio solo se descuentan fuera del motor (§2.12). El IVA cambia las horas, pero no su propia recaudación. La velocidad del ajuste es un supuesto.
- El multiplicador del recorte afecta solo al PIB, dura dos años y está acotado a ±20 %. El índice S0 se usa como aproximación de «tiempos turbulentos» y puede exagerarlos.
- El capital público solo responde a los recortes de «otro gasto», proporcionalmente o según `λ`. No existe una decisión independiente de inversión.
- La nómina pública sigue el convenio hasta 2028 y después su peso de 2028 en el PIB de referencia. No hay plantilla, empleo público ni IVA de las compras públicas recortadas.
- El MEI sigue el calendario de `data/pension-policy-2026.js` hasta 2050. Desde 2051, `meiRate(t)` devuelve 0, porque ninguna fila cubre ese año (`src/current-policy-v2.js:27-30`; comprobado: `meiRate(2051)` = 0). Las capas v5 y v6 lo multiplican por factores de base, así que el tipo MEI vale 0 desde 2051. Es la ley: el MEI se aplica hasta 2050 (O). Solo queda el recargo de la cláusula de cierre, si actúa.
- La solidaridad se congela con los tipos de 2045. Su masa en el Régimen General procede de los centiles fijos. El resto de regímenes usa la razón mínima de tipos.
- Los coeficientes de `PENSION_SHARE_PER_UNIT` (0,14 / 0,11 / 0,08 / 0,06 / 0,52) son supuestos sin fuente conocida: no son «la mitad del ingreso extra» (§2.9). El `basePensionShare` del desglose por partidas y su gasto elegible ya salen de los datos y del motor (§2.10); la consola usa también el gasto elegible del motor al recortar por partidas.
- Los módulos de rentas altas y «fraude cero» trabajan con importes fijos de 2025–2026 escalados por el PIB. Los porcentajes de cierre y de derechos nuevos (0,52, 0,42 y la rampa 0,12–0,88) son supuestos sin fuente.
