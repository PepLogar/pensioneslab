## 3 · Pensiones y sistemas

Todos los importes están en euros reales de 2026. El año t corre de 2027 a 2070 (`END_YEAR`); 2026 es la foto inicial. Cada año tiene dos semestres h ∈ {0, 1}. Cada célula (cohorte) está definida por su año de nacimiento c y su sexo s, y tiene tamaño N y un estado con seis variables por persona (`src/cohort-core.js:2-6`):

```
L    legacyAnnual    derecho o pensión anual con las reglas anteriores a la reforma (devengado hasta 2026)
P    paygAnnual      derecho o pensión anual de reparto devengado desde 2027
B    ndcBalance      saldo nocional (derecho público, no activo invertido)
Y    ndcAnnual       pensión nocional en curso
F    fundedAssets    activo invertido por persona
A    fundedAnnual    renta vitalicia de capitalización en curso
```

El motor lleva estas variables por separado de principio a fin. L, P, B e Y son obligaciones públicas. F y A son activos y rentas privadas. La financiación pública (impuestos, deuda) no entra en ninguna célula: llega a `publicAccounts` como saldo agregado (`src/current-simulation-core-v10.js:590`).

### 3.1 Orden dentro del año

El bucle anual está en `src/current-simulation-core-v10.js:242-669`. El orden es este:

1. Se eliminan las células vacías y se mide qué parte de los pensionistas de 2026 sigue viva, solo con el modo `pension-runoff` (`:243-244`).
2. Entran los nuevos trabajadores (`:249`), se calculan el salario w_t, las horas, el empleo y la masa salarial (`:254-293`).
3. Se calculan los tipos de cotización, con el recargo del freno de 2023 si se aplica (`:297-302`), y las rentabilidades y el índice nocional del año (`:305-315`).
4. Solo en 2027 y como experimento: se convierten en saldo nocional los derechos anteriores a 2027 (`:337-357`).
5. Se revalorizan L y P (`:362-375`).
6. Dos semestres. En cada uno, para cada célula: jubilación si corresponde, después cotización y devengo (activos) o pago (jubilados), y por último la mortalidad (`:376-533`).
7. Se calculan las otras pensiones públicas, los recortes de pago y los agregados, y se pasa a las cuentas públicas (`:535-585`).

### 3.2 Stock de pensiones de 2026 y su baja por mortalidad

La foto de 2026 reparte el stock observado de pensiones de jubilación por edad y sexo. El primer año (`initialYear`) no se simula: es un ritmo anual.

```
N_{a,s}   = R · (n_{g,s} / n) · Pop_{2026,a,s} / Σ_{a∈g} Pop_{2026,a,s}
L_{a,s}   = (Gasto_ret / R) · m_{g,s} / m̄
Gasto_0   = R · w_0 · ρ_0,      ρ_0 = Gasto_ret / (R · w_0)
```

- R = `base.retirees` = 6 760 137 (Seguridad Social) + 572 439 (Clases Pasivas) = 7 332 576 pensiones de septiembre de 2026, no personas distintas (O; `data/current-spain.js:51`).
- Gasto_ret = `base.retirementAnnualBenefits` = nómina de septiembre × 14 = 171 700 M€ (R: el ritmo de 14 pagas es un supuesto, `data/current-spain.js:18-19`).
- w_0 = `base.wage` = 31 215 € (R: salario EAES 2024 × (EACL 2025/2024) × 1,025 de la nómina AEAT de enero a agosto de 2026, `data/current-spain-v5.js:8`, `data/wage-bridge-v5.js:9`).
- ρ_0 = `legacyReplacementRate` = 0,750 (`src/current-cohorts-v10.js:52`).
- g es el tramo de edad del stock INSS (`es-inss-retirement-stock-age-sex-20260901-v1`, O). n_{g,s} y m_{g,s} son el número de pensiones y su importe medio mensual. n y m̄ son el total y la media. Pop es la población EUROPOP2025 (R). Las edades de dentro del tramo siguen la población (`src/current-cohorts-v10.js:363-386`). Los importes solo dan la forma; el total lo fija Gasto_ret.

Mortalidad: cada semestre la célula se multiplica por la supervivencia semestral.

```
q_{t,a,s} = m_{t,a*,s} / (1 + m_{t,a*,s}/2),   a* = a + 0,5 − λ·(t − 2026)
S_{t,a,s} = sqrt(1 − q_{t,a,s})
N ← N · S                                     (en cada semestre)
```

- m: tasa central EUROPOP2025, interpolada linealmente en la edad; a partir del último año de la tabla se usa ese año (`src/mortality-core.js:61-70, 79-92`) (R).
- λ = `longevityGain`, 0 por defecto, «Vidas más largas (nuevos tratamientos)» (S).
- El + 0,5 es `COHORT_AGE_SHIFT` (`src/current-cohorts-v10.js`, desde la 1.76; ver el apartado 1.8): una célula muere con la mortalidad de su edad + 0,5, y sus rentas se calculan con la misma. Las medidas de una sola edad, como la esperanza de vida a los 65, siguen en la edad exacta (R).

Los jubilados de 2026 se pagan y mueren con las mismas tablas que el resto de la población. Lo que dejan de cobrar los fallecidos desaparece del gasto: no hay pensiones de viudedad derivadas dentro de las células (`src/current-simulation-core-v10.js:501-536`). Las pensiones que no son de jubilación (viudedad, incapacidad, no contributivas, clases pasivas no de jubilación) van fuera de las células:

```
Otras_t = Y^gasto_t · (Otras_0 / PIB_0) · (G^pub_t − G^ret_t) / (G^pub_2026 − G^ret_2026)
```

- Otras_0 = `base.otherPensionBenefits` = 60 656 M€ (R). G^pub y G^ret son el gasto público en pensiones y el gasto contributivo de jubilación en % del PIB del Ageing Report 2024 (R) (`src/model-current-v10.js:180-186`). Y^gasto es el PIB de referencia para el gasto (`src/current-simulation-core-v10.js:541`). Estas pensiones son públicas en todos los sistemas.

**Incapacidad que pasa a jubilación a los 65 (desde la 1.77).** En España, una pensión de incapacidad permanente se registra como de jubilación cuando su titular cumple 65 años. En el modelo del Ageing Report no hay altas de incapacidad después de los 64 (ficha de España del Ageing Report 2024, págs. 11 y 60; en el PDF, 10 y 59). Por eso G^pub − G^ret ya las saca a esa edad. Para que no se pierdan, cada año entran en la jubilación pública a los 65:

```
N_{s,t} = (I^{60–64}_{s,2026} / 5) · P_{s,65}(t) / P_{s,65}(2026) · τ_t / τ_2026
L = m_s · 14 · w_t / w_2026
```

- I^{60–64}: pensiones de incapacidad de 60–64 años a 1/9/2026 (Seguridad Social): 205.543 hombres y 125.071 mujeres (O).
- P_{s,65}: población de 65 años a mitad de año (O).
- τ_t: tasa de incapacidad de 60–64 del cuadro A2 de la ficha (O).
- m_s: pensión media de incapacidad de 60–64, 1.424 € al mes para los hombres y 1.212 € para las mujeres (O).
- La pensión sigue a los salarios hasta la entrada y después a los precios, como toda pensión en pago (S).
- Entran jubiladas, solo con pensión protegida: sin fondo, sin cuenta nocional y sin reparto nuevo. Se cuentan en `reclassifiedRetirementEntries`, no en las altas (`data/disability-retirement-2026.js`; `disabilityEntries`, `src/model-current-v10.js`).
- Su mortalidad es la de las cohortes. La ficha suma a los pensionistas de incapacidad una mortalidad extra antes de los 65 (S).
- Con las reglas de hoy son unas 66.000 al año: 1,3 millones de jubilados más en 2050, y alrededor de 1 punto de PIB de gasto.

Los trabajadores de 2026 reciben un derecho anterior a la reforma con una carrera plana (R/S): `L = w_0 · 0,77 · min(43, a − 22 + 1) / 43` (`src/current-cohorts-v10.js:358-359`). No es una historia laboral observada.

### 3.3 Jubilación y altas nuevas: cuantía (tasa de sustitución)

Un trabajador se jubila en el semestre 1 del año en que su edad alcanza su edad objetivo (`src/current-cohorts-v10.js:271-278`). La edad objetivo es la edad de referencia de la célula, tomada del perfil observado de edades de jubilación de 54 a 71 años (O, `RETIREMENT_AGE_WEIGHTS`), más `retirementAge − 65` y el desfase por esperanza de vida si está activo. La edad se trata en otra sección.

Reparto: el derecho se devenga cada semestre trabajado. Al jubilarse no se recalcula nada: la pensión es L + P.

```
P ← P + 0,5 · w_t · TS(T_c) · (TS_cfg / 0,77) / 43 · ω^payg_{c,t} · e · hrs
```

- TS(T) = `newAwardRate(T)`: tasa bruta de sustitución de las altas de jubilación contributiva (pensión de alta / salario anterior) del Ageing Report 2024, hoja ESb fila 24 (R). Va de 0,766 en 2026 a 0,646 en 2050 y 0,640 en 2070. Se lee para el año esperado de jubilación T_c (`src/current-cohorts-v10.js:154-158`, `src/current-simulation-core-v10.js:473-477`).
- TS_cfg = `replacementRate`, 0,77, «Primera pensión frente al último sueldo». Con el valor por defecto el factor vale 1. El 0,77 es la tasa de sustitución bruta de las altas de jubilación de España en el Ageing Report 2024 («Gross replacement rate at retirement, earnings-related public pensions»; ficha de España, tabla 17), redondeada (O). Es el punto neutro de la escala: no es la promesa legal de una carrera de 43 años.
- 43 = `CAREER_YEARS`. Es el divisor de un año corriente. Hay dos casos en que el motor usa otro, `paygAccrualYears` (`src/current-cohorts-v10.js:305-326`):
  - con la senda de salida, el premio por demora, o ningún devengo en los años que añade la senda si `exitPathNoExtraPension` = 1;
  - sin ella, 43 + R_c.

  El contrafactual de 1985 no usa `paygAccrualYears`: divide siempre entre 43.

  Los dos se explican en `docs/modelo/01`.
- ω^payg: peso de reparto de la célula (3.6–3.8). e: parte trabajada del semestre (`employmentShare`). hrs: horas relativas con la respuesta Laffer completa.
- Implementación: `src/current-simulation-core-v10.js:478-480`. El escalado solo afecta al devengo nuevo; L devengado no se recorta (`:466-467`).

Mientras se trabaja, L y P siguen al salario real: `L ← L · w_t/w_{t−1}` (`:371-374`). Las salidas `newAwardPublicAnnual`, `newAwardAnnuityAnnual` y `newAwardFundedCapitalPerRetiree` miden la cuantía media de las altas del año (`:423-438, 567-574`). La tasa de sustitución que se publica es la del stock: `replacementRate = (L+P+Y pagados + A pagada) / R_t / w_t` (`:52, 108`). Desde la 1.86, A pagada deja fuera la renta del fondo de quien no llega a pensión contributiva (carrera incompleta, `noClaim`): esas personas no cuentan en R_t. Esa renta se sigue pagando y está en `fundedBenefits` y en el fondo; aparte, en `fundedBenefitsNoClaim` (auditoría de la 1.85, 1). Con la respuesta Laffer completa el denominador es w_t·hrs (`:84`).

### 3.4 Revalorización de las pensiones en curso

Al empezar el año, antes de los semestres (`src/current-simulation-core-v10.js:368-379`):

```
jubilados:   L ← L · I_t ;   P ← P · I_t          (P ← P · w_t/w_{t−1} · FS_t con puntos)
I_t = (1 + r^nom_t) / (1 + π_t)
r^nom_t = max(0, π_{t−1})       modo 'cpi'
r^nom_t = max(0, π_{t−1}) + d    modo 'cpi-points' (d: puntos frente al IPC; lo que escribe la consola)
r^nom_t = r_manual              modo 'manual' (tasa nominal fija; escenarios anteriores al 24/11/2026)
```

- π_t = `inflationRate`, 0,02 (S). π_{t−1} para 2027 = 0,039: es la previsión del IPCA medio de 2026 del Banco de España, no el dato legal de diciembre a noviembre (R). Con la opción por defecto de la AIReF para el corto plazo (`airefShortRunEmployment` = 1), π_t es 2,6 % en 2027, 2,3 % en 2028, 2,1 % en 2029 y 2,0 % en 2030 (`src/shared/short-run-employment.js`). El contrafactual de 1985 apaga esa opción (`src/retrospective-model-1985.js:280-285`). Por eso:
  - I_2027 = 1,039/1,026;
  - I_t es 1,0029 en 2028, 1,0020 en 2029 y 1,0010 en 2030;
  - desde 2031, π_{t−1} = π_t, así que I_t = 1 (`src/current-policy-v2.js:116-134`). La regla legal (media de 12 tasas interanuales del IPC, con suelo cero, art. 58 LGSS) está implementada (`:49-54`) pero el motor por defecto usa su aproximación anual (S).
- `pensionRevaluationMode` = 'cpi' y `pensionRevaluationRate` = 0. El ajuste es «Subida anual de las pensiones». El rango va de −10 % a +10 %: nominal en 'manual', puntos sobre el IPC en 'cpi-points' (`src/config-current-v2.js:5-19`). La consola escribe 'cpi-points' desde el 24/11/2026, para que «puntos frente a los precios» sea cierto con cualquier inflación. Antes escribía 'manual' con un 2 % fijo.
- Afecta solo a L y P en curso. La pensión nocional Y sigue el índice nocional (3.6). La renta privada A es real y fija salvo por el ajuste de rentabilidad (3.8).

### 3.5 Sistemas y mezcla de la cuota

`system` ∈ {`payg`, `ndc`, `funded`, `mixed`}, por defecto 'payg', «Sistema de pensiones» (`src/config-core.js:10`, `src/shared/default-config.js:39`). Los pesos base de la cuota de jubilación son:

```
payg:   (1, 0, 0)    ndc: (0, 1, 0)    funded: (0, 0, 1)
mixed:  (μ_payg, μ_ndc, μ_funded) = mix,   Σμ = 1 (tolerancia 1e−9)
```

`mix` = {payg 0,34, ndc 0,33, funded 0,33}, «Reparto de la cuota entre reparto, nocionales y fondo» (`src/config-core.js:45-62`, `src/shared/default-config.js:40`). Los pesos se aplican solo a la cotización de jubilación. La cotización total se divide así:

```
τ^ret_t  = τ_cfg · σ_ret · ajuste_ord_t                         (parte repartible)
τ^prot_t = τ_cfg · (1 − σ_ret) · ajuste_ord_t + τ^MEI_t + τ^sol_t (+ recargo del freno)
```

- τ_cfg = `contributionRate`, 0,2215 (= pool ordinario de pensiones / masa salarial, R), «Cotización para pensiones». σ_ret = `retirementContributionShare` = 0,7349 (nómina de jubilación SS / nómina de todas las pensiones SS, R). ajuste_ord es la respuesta de las bases topadas y del RETA (`src/current-policy-v7.js:28-34`, `src/current-policy-v5.js:41-63`).
- τ^MEI_t sigue el calendario legal: 0,9 % en 2026, 1,0 % en 2027, 1,1 % en 2028 y 1,2 % de 2029 a 2050; después, 0 (O) (`src/current-policy-v2.js:27-30, 138`). τ^sol es la cuota de solidaridad (`src/current-policy-v5.js:61, 67`, a través de `src/current-policy-v7.js:30`). La capa v3 solo se usa con `contributionMechanism` distinto de 'capped-bases' (`src/model-current-v10.js:125`). Ambas son siempre públicas: no generan derechos individuales ni van al fondo.

Variantes "de golpe" (`transitionMode` = 'none'): los pesos se aplican a todas las células activas desde 2027. `funded` y `mixed` sin transición se presentan como «Capitalización de golpe» y «Mixto de golpe» (`src/shared/scenario-labels.js:9`).

### 3.6 Cuentas nocionales

Índice nocional semestral, igual para activos y jubilados (`src/current-simulation-core-v10.js:295, 314-315`):

```
J_t = sqrt( (W_t / W_{t−1}) · Fr_t )            W = trabajadores ETC × w (masa salarial real)
Fr_t = min(1, C^nd_{t−1} / Y^nd_{t−1})^{1/3}    con ndcBalancing = 1; si no, 1
```

Activo, en cada semestre: `B ← B·J_t + 0,5·w_t·τ^ret_t·e·hrs·ω^ndc` (`:446-465`). La revalorización va antes que la aportación del semestre. Muerte de un activo: con `ndcInheritanceGains` = 0, el saldo se extingue (`notionalRightsExtinguished`); con 1, se reparte entre los supervivientes de la célula: B ← B/S (`:489-495`).

Jubilación en el semestre h, con edad a:

```
Y = B / ä(t, a, s, h; λ, ν_h)
ä = Σ_k 0,5 · Π_{j<k} S_j / (1+ν_h)^k ,    ν_h = sqrt(1 + ν) − 1
```

- ν = `ndcAnnuityNorm`, 0, «Cuentas nocionales: interés de la renta» (rango 0–3 %). Con ν = 0, ä es la esperanza de vida de pagos semestrales sin descuento (`src/current-cohorts-v10.js:66-98`, `src/mortality-core.js:102-133`).

Jubilado, en cada semestre (`src/current-simulation-core-v10.js:505, 510, 520-523, 529-532`):

```
pago = min(B, 0,5·Y);   B ← (B − pago)·J_t;   Y ← Y · J_t/(1+ν_h);   B ← B/S
```

El saldo de los jubilados que fallecen queda en la célula: es una reserva colectiva y un crédito de mortalidad de memoria (`notionalMortalityCredits`), no un ingreso del Tesoro. Las aportaciones nocionales C^nd (`notionalCredits`) se quedan en caja pública y pagan las pensiones de hoy. B no es un activo invertido (`fundingAssumptions.notionalBalances`, `:676`).

Opciones de `src/shared/ndc-options.js`, todas apagadas por defecto (S, diseño de Devesa et al. 2025a y de Suecia):

```
Entrada por generaciones (ndcPhaseIn = 1):
  φ_c = clamp((c − c_0 + 1) / G, 0, 1)
  ω' = (ω^payg + ω^ndc·(1−φ_c), ω^ndc·φ_c, ω^funded)
```

- c_0 = `ndcPhaseInFirstCohort` 1971 y G = `ndcPhaseInYears` 20 (`src/shared/ndc-options.js:40-53`). El freno: `ndcBalancing` usa C^nd y Y^nd del año anterior (`:56-62`). Desde la 1.72, Y^nd es lo debido, antes de un recorte de pagos: la reserva se sigue cargando entera (`paymentAdjustment.scheduledNdcBenefits`). Es una regla de caja, no el balance actuarial sueco: no hay fondo colchón ni activo de cotizaciones.
- `fundedExtraContribution` (0; 0–10 puntos), «Cotización adicional a una cuenta propia». Se paga encima de la cotización de hoy y va solo a F (`src/current-simulation-core-v10.js:457, 465`). Nunca entra en las cotizaciones públicas. Entra en las bases fiscales (`:584`).

Derechos pasados en cuenta nocional (`src/shared/ndc-past-rights.js`, experimento 1.52). Actúa con `ndcPastRights` = 1 y solo si `system` = 'ndc' (`:36`). En 2027, para cada célula activa con L > 0 (`src/current-simulation-core-v10.js:341-361`):

```
share = min( π(a_2027), φ_c )
π(a) = 1 si a ≤ A_full;  0 si a ≥ A_none;  (A_none − a)/(A_none − A_full) si no
K = L·τ_2026·43/0,77 + v·( L·ä(T_c, a_T, s, 1; λ, ν_h) − L·τ_2026·43/0,77 )
B ← B + share·K ;   L ← L·(1 − share)
```

- τ_2026 es el tipo de jubilación de la ley de 2026, no el del escenario. v = `ndcPastRightsValue`: 0 es lo cotizado, sin interés (Suecia, Letonia); 1 es el capital que compra la pensión ya ganada (≈ Polonia). A_full = 45 y A_none = 65 (`src/shared/ndc-past-rights.js:49-55, 66-71`). La conversión ocurre antes de la revalorización de L de 2027. No es una aportación y no financia nada.

### 3.7 Sistema de puntos (estilo alemán)

Con `pointsSystem` = 1, «Sistema de puntos (como Alemania)», los derechos de reparto P devengados desde 2027 siguen el valor del punto, tanto los de activos como los de jubilados. L sigue con las reglas de hoy (`src/current-simulation-core-v10.js:366-378`).

```
P ← P · (w_t/w_{t−1}) · FS_t
FS_t = 1 + α·(1 − PQ_{t−1}/PQ_{t−2}),   PQ = jubilados contributivos / trabajadores ETC
```

- α = `pointsSustainabilityFactor`, 0,25 (O: SGB VI § 68). Ajuste: «Sistema de puntos: factor de sostenibilidad» (`src/shared/points-system.js:23-30`).
- El devengo semestral es el mismo de 3.3: un año al salario medio da el mismo derecho que en reparto. Lo que cambia es la indexación (S).

### 3.8 Capitalización individual

Activo, en cada semestre (`src/current-simulation-core-v10.js:460-492`):

```
F ← F·(1 + r^a_h) + 0,5·w_t·(τ^ret_t·ω^funded + τ^extra)·e·hrs
```

La rentabilidad se aplica antes de la aportación. Muerte de un activo: F·N·(1−S) sale como herencia privada (`fundedBequests`). Con fondo común se queda en la célula: F ← F/S (`fundedPooledBalances`).

Jubilación: `A = F / ä(t, a, s, h; λ, r^ann_h)` (`:419-421`). Jubilado, en cada semestre (`:501, 508-516, 525-528`):

```
pago = min(F, 0,5·A);  F ← (F − pago)·(1 + r^j_h);  A ← A·(1+r^j_h)/(1+r^ann_h,alta);  F ← F/S
```

- `r^ann_h,alta` es el tipo de la renta del año de jubilación: el del contrato, guardado en cada cohorte (`annuityHalfRate`, desde la 1.76). Con una cartera cuyo tipo de renta se mueve, como el fondo cautivo, la renta ya no acumula reservas que nadie cobra, ni las agota.
- Lo que se deja de pagar porque la reserva se acaba sale en `fundedAnnuityShortfall`; no existe mientras no pase (punto 5).

Las rentabilidades semestrales son `r_h = sqrt(1 + r) − 1`. En la cartera base ('balanced-standard'):

```
r^a = r^j = ρ − f + choque_t + δ_t ;   r^ann = ρ − f
```

- ρ = `realReturn`, 0,03, «Rentabilidad real de los fondos» (S). f = `feeRate`, 0,005, «Comisión de gestión del fondo» (S). choque = `marketShock`, 0, «Caída del mercado en 2035». El año del choque es 2035 por el contexto v10 (`src/model-current-v10.js:216`); el núcleo usaría 2039 en su lugar. δ_t son choques de ejecución (`runtime.returnShocks`) que no se guardan en la configuración (`:191-197`).
- Por la regla de ajuste de A, un choque en el año de pago rebaja para siempre las rentas en curso.
- Las herencias y el crédito de mortalidad de los jubilados (`fundedMortalityCredits`) son transferencias dentro de la célula, no ingresos públicos.
- Variante de memoria «conservar capital»: se cobra solo la rentabilidad positiva de F, y F queda como herencia (`preservedFundedBenefits` y `averagePensionPreserveCapitalAnnual`, `:502-506, 78-85`). No entra en las cuentas públicas.

Estilos de cartera (`capitalizationStyle`, «Dónde se invierte el fondo»; `src/progressive-transition.js:538-647`). Se activan si el estilo no es el base, si hay régimen de automatización o si hay automatización de la administración (`src/current-simulation-core-v10.js:395-407`). Todas las primas son supuestos (S); "1+r" tiene un suelo de 0,05.

```
lifecycle-ap7:   r^a = ρ + 0,021·e(a) − min(f,0,0012) + choque·(0,85 | 0,25 desde 55)
                 e(a) = 1 hasta 54; lineal hasta 0,35 a los 65 ; r^ann = ρ + 0,006 − f' ; r^j = r^ann + 0,20·choque
collective-cdc:  r^a = ρ + 0,016 − min(f,0,0015) + choque ; r^ann = ρ + 0,013 − f' ; r^j = r^ann + choque
dividend-endowment / common-fund:
                 r^a = ρ + 0,0125 − min(f,0,0015) + 0,5·choque ; r^ann = ρ + 0,010 − f' ; r^j = r^ann + 0,25·choque
sovereign-captive: r^c = (1 + i_{t−1} − rep)/(1 + π_t) − 1
                 r^a = r^c − max(f,0,006) + 0,4·choque ; r^ann = r^c − max(f,0,006) ; r^j = r^ann + 0,3·choque
                 rep = min(0,007, (D/PIB_{t−1} − 135)·0,00006) si D/PIB > 135 %
```

- `i_{t−1}`: tipo efectivo de la deuda que entra en el año (`effectiveNominalRate` del año anterior), el cupón medio de los bonos que tiene el fondo. `π_t`: inflación del año. Desde la 1.74; antes, `min(ρ, 0,014)`, un rendimiento fijo que el Estado no pagaba.
- El Estado se ahorra la represión sobre los bonos del fondo: `rep · min(F_{t−1}, D_t)` a precios del año, después de una quita si la hay (`captiveInterestSaving`, `src/current-fiscal-v13.js`). Así, lo que el Estado paga por esos bonos es lo que cobra el fondo antes de comisiones: el valor ya no desaparece (revisión adversarial, 1).
- Desde la 1.76, los jubilados cobran lo mismo que el Estado paga, menos la comisión. Hasta la 1.75 recuperaban la mitad de la represión, que el Estado también se ahorraba entera: nadie la pagaba (punto 3).
- En una quita, el fondo cautivo pierde solo el nominal de sus bonos. Desde la 1.76 es exactamente la quita sobre su valor, porque el fondo los tiene a su nominal: ya no depende del tipo de descuento (punto 4), y desde ese mismo año cobra el cupón de la deuda canjeada (`faceValueOnly`, `src/creditor-fund-loss.js`). Con un valor presente, los cupones más bajos se contarían dos veces. Desde la 1.75.
- `π_t` es la subida de precios del propio modelo: en el contrafactual de 1985, la histórica antes de 2026 (`inflationAt`). Desde la 1.75.
- La guía, sin el tipo del Estado, sigue mostrando la aproximación antigua.

La prima de IA (`aiCapitalReturnBoost`) es cero sin régimen de automatización. 'common-fund' invierte como 'dividend-endowment'. La diferencia está en lo que pasa con el saldo de quien muere antes de jubilarse: se queda en el fondo (`isCommonFund`, `src/shared/scenario-labels.js:24`). Es el estilo del Mixto progresivo de referencia.

### 3.9 Transiciones (mixto progresivo)

Con `transitionMode` ≠ 'none' y t > 2026, los pesos de cada célula activa se sustituyen por `cohortTransitionWeights` y después pasan por la entrada por generaciones de 3.6 (`src/current-simulation-core-v10.js:451`; `src/progressive-transition.js:134-245`). Las células ya jubiladas no cambian. La meta de capitalización es:

```
M = 1 si system = funded ;  M = transitionTargetFunded si system = mixed ;  M = ω^funded_base (= 0) si payg/ndc
```

Con M = 0 la transición no cambia nada. `transitionTargetFunded` = 0,65 («Cambio a un fondo: parte de la cuota que acaba en el fondo»). En 'mixed' sustituye a `mix.funded`.

Factor generacional. a_0 = 2026 − c (es negativo para los nacidos después), k = `transitionCutoffAge` 48 (rango 25–65), a_y = max(22, k − 8):

```
semilla = 0 si entrants-only o sovereign-captive; si no clamp(0,48·(1 − (a_0 − k)/max(8, 68 − k)), 0,28, 0,48)
g_c = 1 si a_0 ≤ a_y ;  semilla si a_0 ≥ k ;  semilla + (1−semilla)·(k − a_0)/(k − a_y) entre ambos
```

Progreso p, con e = t − 2026 y T = `transitionYears` 20 (rango 1–44):

```
cohort-ramp:        g_c · clamp(0,45 + 0,55·e/T, 0,45, 1)
two-stage-relay:    g_c · { clamp(0,30 + 0,28·e/E1, 0,30, 0,58) si e ≤ E1 ; clamp(0,58 + 0,42·(e−E1)/E2, 0,58, 1) }
                    'announced': E1 = clamp(round(2T/3), 1, min(16, T−1)), E2 = T − E1 ; 'legacy-extended': E1 = 16, E2 = max(1, T−8)
pension-runoff:     g_c · (1 − vivos_t / vivos_2026)       (pensionistas de 2026 que siguen vivos)
salary-cap-shield:  g_c · clamp(0,60 + 0,40·e/max(1, 0,75T), 0,60, 1)
baby-boom-shield:   g_c · { clamp(0,18 + 0,37·e/16, ·) si e ≤ 16 ; clamp(0,55 + 0,45·(e−16)/max(1, T−8), 0,55, 1) }
entrants-only:      g_c
linear-ramp:        clamp(e/T, 0,12, 1)                    (sin factor generacional)
```

El resultado es ω^funded = clamp(M·p, 0, 1) y la parte pública es 1 − ω^funded. Esa parte se divide según `transitionPublicPillar` (por defecto 'ndc-bridge'). Se cambia en la consola con «Cambio a un fondo: parte pública durante la transición»; 'ndc-bridge' y 'custom-split' hacen la misma cuenta:

```
ndc-bridge, custom-split:  ω^ndc = (1−ω^funded)·s,   s = transitionNdcShare (0,85); en two-stage-relay s = max(s, 0,85)
payg-bridge:               ω^ndc = 0
system-default:            proporción payg/ndc de los pesos base (todo reparto si son cero)
```

- `transitionRelaySchedule` = 'announced' («calendario del doble relevo») (`src/progressive-transition.js:95-102`). `pension-runoff` marca a los jubilados de 2026 con `markBasePensioners` y cuenta los que siguen vivos cada año (`:105-120`; `src/current-simulation-core-v10.js:234-245`). Con ese modo, T y el calendario no se usan.
- El Mixto progresivo de referencia (S, decisión del autor): `system` 'mixed', `pension-runoff`, k = 48, M = 0,50, 'custom-split', s = 0,85, 'common-fund' (`src/shared/scenario-labels.js:29-39`).
- Durante la transición no hay aportación institucional, fondo puente ni reserva propia (`describeProgressiveTransitionFiscalShield`, `src/progressive-transition.js:317-325`). Lo que falta lo pagan los impuestos y la deuda.

### 3.10 Separación de cuentas y regla de no doble uso

```
C^fund_t = Σ_cel 0,5·w·τ^ret·e·hrs·ω^funded·N        (fundedContributions)
C^nd_t   = Σ_cel 0,5·w·τ^ret·e·hrs·ω^ndc·N           (notionalCredits)
C^pub_t  = τ^prot·W_t + (τ^ret·W_t − C^fund_t)          (publicContributions)
G^pub_t  = L + P + Y pagados + Otras_t                  (publicBenefits)
G^priv_t = A pagada                                     (fundedBenefits)
```

`src/current-simulation-core-v10.js:562-571`. Lo que va al fondo se resta de la caja pública, así que un euro de cotización no paga a la vez reparto y capitalización. A las cuentas públicas solo llegan C^pub y G^pub (`:585`). Los saldos nocionales no se cuentan como activo. F solo crece con aportaciones desviadas, la aportación adicional y la rentabilidad de lo ya invertido: `fundedExternalContributions` = 0 y `fundedReserveTransfers` = 0 (`:112-115`).

Identidades que se comprueban en la salida (`:116-118`):

```
C^tot − C^pub − C^fund = 0
F_t − F_{t−1} − C^fund − C^extra − Rend + G^priv + Herencias + Pérdida_reestructuración = 0
```

La brecha de la transición se separa de la estructural: `structuralPensionGap = pensionGap − C^fund` (`:86`). Los recortes de pago (`paymentAdjustments`) reducen L, P, Y y Otras pagados, pero no reescriben derechos ni saldos nocionales, y no tocan la capitalización (`:537-552`). La sección de deuda trata estos recortes.

### 3.11 Freno de 2023 (cláusula de cierre) y MEI

Base legal (O): disposición adicional 2.ª del RDL 2/2023, RD 100/2025 y RD 561/2025 (`src/shared/closing-clause.js:1-23`). Se aplica si `closingClause` ≠ 'off' y el escenario es la ley actual: `system` = 'payg' y `transitionMode` = 'none'. También se aplica si `closingClauseAnySystem` = 1 (`:53-59`). Por defecto 'airef', «Freno de 2023 (sube el MEI)».

Procedimiento (`src/current-simulation-core-v10.js:199-212`): (1) se hace una ejecución de sondeo hasta 2050 sin recargo; (2) se calcula el recargo con ella; (3) se hace la ejecución completa con el recargo, que se suma a τ^prot y a τ^MEI (`:298-299`).

```
Ḡ = media_{2022..2050} G^pub_t/PIB_t      (2022–2025 de SPENDING_BEFORE_BASE)
Ī = media_{2022..2050} [0,016 + Δτ_t·W_t/PIB_t] + media(recargo ya legislado)   (− 0,003 en lectura 'strict')
exceso_e = max(0, Ḡ − Ī − 0,133)                        en cada evaluación e
recargo_t (PIB) = Σ_rampas min(1, 0,2·(t − e)) · exceso_e ,   0 después de 2050
puntos_e = exceso_e / (W/PIB)_{e+1} ;   τ^freno_t = Σ min(1, 0,2·(t − e)) · puntos_e
```

- Evaluaciones: 2025 y 2026 se toman como publicadas (O: neto 13,2 % y 13,0 %) y nunca abren rampa. Después hay una cada tres años: 2028, 2031, …, 2049 (`src/shared/closing-clause.js:83-94, 158-163, 181-209`).
- Δτ son los puntos de cotización del escenario por encima del tipo de referencia (`src/current-simulation-core-v10.js:205-209`). 0,016 es el impacto medio de las medidas de ingreso según AIReF 2026 (O). Supuestos (S): no llega ninguna ley correctora; cada rampa compensa todo el exceso; el recargo no baja nunca y termina con el MEI en 2050 (`src/shared/closing-clause.js:12-19, 232-247`).
- El MEI y su recargo son públicos, finalistas y no generan derechos. Entran en la memoria del Fondo de Reserva (`src/current-policy-v2.js:69-95`). La respuesta Laffer lee el recargo (`src/current-simulation-core-v10.js:270, 584`).

### 3.12 Pensión pagable tras rescate o quita

Es la pensión que se podría pagar si el sistema se rompe. Se muestra junto a la prometida y no cambia la senda del motor (S) (`src/shared/payable-pension.js:30-43`).

```
Φ_t = 1                                         si t < t_r o no hay rescate
Φ_t = (1+π)^{−min(F, t − t_r + 1)} · (1 − κ·[t ≥ t_q])
```

- t_r = año de rescate o, si no lo hay, de impago. t_q = año de quita o de impago (`describeNarrative`, `src/shared/crisis-narrative.js:48-75`). F = `payablePensionFreezeYears`, 4 (referencia: Portugal 2011–2015). κ = `payablePensionCut`, 0,10 (referencia: Grecia). π = `inflationRate`, 0,02 si falta.
- Φ se aplica solo a la parte pública: pagable = (jubilación pública × Φ + renta de los fondos) / jubilados (`payablePensionAnnual`, 1.82). La congelación y el recorte son del Estado sobre sus pensiones. Las rentas que pagan los fondos privados no se tocan aquí; sus pérdidas, si las hay, llegan por el motor (`fundedRestructuringLoss`).
- La pensión pagable no cambia las cuentas: es una lectura de la pensión media. La consola la enseña en la columna «Pagable €/mes» de la tabla año a año (`src/pages/consola.js`) y el CSV en la serie `pension_pagable_mensual` (`src/domain/series-dictionary.js`). Usa los años de rescate y quita del veredicto de cada ejecución.

### Límites y simplificaciones

- Las pensiones son importes agregados por edad y sexo. No hay carreras individuales, mínimos, máximos, complementos ni bases reguladoras. El derecho de los activos de 2026 es una carrera plana.
- El reparto no calcula la pensión de alta con una fórmula legal. Escala el devengo con la tasa de sustitución de altas del Ageing Report y una carrera fija de 43 años.
- La revalorización usa la inflación anual supuesta, no la media legal de 12 tasas interanuales. Desde la 1.72 lleva el desfase de la ley: la del año anterior de la senda (la de la AIReF en 2027–2030 con esa opción; `src/current-policy-v2.js`). Con una inflación constante da lo mismo que antes. 2027 usa una previsión.
- Los pensionistas tienen la misma mortalidad que la población (EUROPOP2025). No hay mortalidad diferencial por renta ni pensiones derivadas dentro de las células. Las otras pensiones siguen una proporción del PIB.
- El freno nocional es una regla de caja, no un balance actuarial. El sistema de puntos solo cambia la indexación de P.
- Las rentabilidades y las primas de los estilos de cartera son supuestos deterministas: hay un único choque configurable y choques de ejecución, sin volatilidad estocástica.
- En `payg` o `ndc` con `transitionMode` ≠ 'none', la transición no cambia los pesos (M = 0), pero el freno de 2023 deja de aplicarse por defecto.
- El freno de 2023 evalúa sobre una sola proyección, la del propio escenario, y fija los puntos con la masa salarial del sondeo. No modela la ley correctora alternativa.
- La pensión pagable es solo de presentación y no se retroalimenta en el gasto ni en la deuda.
