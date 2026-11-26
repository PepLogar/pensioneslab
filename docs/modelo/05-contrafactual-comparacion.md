## 5 · El contrafactual de 1985 y la comparación de sistemas

Esta sección describe tres piezas: el experimento retrospectivo que arranca en 1984, la forma en que la consola compara los sistemas con los mismos ajustes, y la foto de partida de 2026 de la que salen todas las demás vías. Todas las afirmaciones salen del código del simulador. Las cifras de ejemplo se han leído con `node` sobre la configuración por defecto (22/11/2026). Son salidas del simulador (S), no previsiones.

### 5.1 Qué es el contrafactual de 1985

Responde a una pregunta: cómo estaría hoy el sistema si una transición a un mixto con fondo hubiera empezado en 1985. No reconstruye la España observada. Es un experimento sintético con supuestos declarados (`src/retrospective-model-1985.js:1-6`, `:40`).

- Una sola corrida de cohortes y cuentas públicas va de una apertura explícita en 1984 hasta 2070. Ningún saldo se reinicia en 2026 (`:74`).
- No entra como dato ningún objetivo futuro de pensión, fondo, déficit o deuda. Ningún resultado de una corrida de 2026 se reescala hacia atrás (`:4-5`). La prueba `tests/retrospective-accounting.test.mjs:52-60` lo comprueba: si cambia la rentabilidad, cambian el fondo y la pensión de 2026.
- Todos los importes reales están en euros de 2026 (`:41`). El índice de precios vale 1 en 2026 (`tests/retrospective-accounting.test.mjs:39`).
- Versión del modelo: `modelVersion = 'retrospective-1985-ledger-v1'` (`:39`, `:280`).

### 5.2 Cómo se activa

El despachador único elige el motor según la configuración (`src/simulation.js:8-16`).

```
retro(config) ⇔ system = 'mixed' ∧ transitionMode ≠ 'none' ∧ transitionYears = 41 ∧ transitionCutoffAge = 41
```

- Implementado en `isRetro1985Active` (`src/shared/scenario-labels.js:53-61`). Ninguna otra vía usa a la vez 41 años de duración y 41 de edad de corte.
- La receta que lo activa es `FLAGSHIP_RETRO_1985` (`src/shared/scenario-labels.js:41-51`):

| Clave | Valor | Nombre visible (catálogo) |
|---|---|---|
| `system` | `'mixed'` | Sistema de pensiones |
| `transitionMode` | `'two-stage-relay'` | Cambio a un fondo: cómo se hace |
| `transitionCutoffAge` | 41 | Cambio a un fondo: edad de corte |
| `transitionYears` | 41 | Cambio a un fondo: años que dura |
| `transitionTargetFunded` | 0,65 | Cambio a un fondo: parte de la cuota que acaba en el fondo |
| `transitionPublicPillar` | `'custom-split'` | Cambio a un fondo: parte pública durante la transición |
| `transitionNdcShare` | 0,90 | Cambio a un fondo: parte pública nocional o de reparto |
| `transitionRelaySchedule` | `'announced'` | Cambio a un fondo: calendario del doble relevo |
| `capitalizationStyle` | `'dividend-endowment'` | Dónde se invierte el fondo |

- En el selector del sistema la opción se llama «Experimento: Mixto progresivo desde 1985» (`src/shared/settings-panel.js:26`).
- Al elegirlo, `selectSystemPatch('retro1985')` escribe solo esa receta y conserva el resto de ajustes del lector, incluida la rentabilidad (`src/shared/scenario-labels.js:116-117`).
- La transición usa como año base el de la apertura de cohortes, 1984: `cohortTransitionWeights(..., BASE_YEAR)` con `BASE_YEAR = COHORT_BASE.baseYear` (`src/current-simulation-core-v10.js:31`, `:446`; `src/progressive-transition.js:134-162`). La edad de corte se mide en 1984 y la rampa de 41 años termina en 2025.
- El estilo `'dividend-endowment'` suma primas de cartera a `realReturn`. En activo son +1,25 puntos. En la renta son +1,0 puntos. La comisión queda limitada a 0,15 %. Son supuestos de cartera, no rendimientos realizados (`src/progressive-transition.js:594-612`; `src/retrospective-model-1985.js:61`).
- No admite trayectorias de riesgo de mercado. Si llega una opción `runtime` con el contrafactual activo, `simulate` lanza un `RangeError` (`src/simulation.js:11`).

### 5.3 Apertura de 1984: supuestos declarados

Todos los supuestos están en `RETROSPECTIVE_1985_ASSUMPTIONS` (`src/retrospective-model-1985.js:38-76`). Ninguno está estimado ni ajustado a resultados (`:60`).

| Supuesto | Clave interna | Valor | Tipo |
|---|---|---|---|
| Año de apertura | `openingYear` | 1984 | S |
| Primer año de reforma | `firstReformYear` | 1985 | S |
| Fondo invertido, saldo nocional y caja iniciales | `openingFundedAssets`, `openingNotionalBalance`, `openingTreasuryCash` | 0 | S |
| Deuda inicial | `openingDebtGDP` | 40 % del PIB sintético de 1984 | S |
| Cotizantes por jubilado | `openingWorkersPerRetiree` | 3,4 | S |
| Crecimiento del empleo antes de 2026 | `historicalEmploymentGrowth` | 1,2 % anual | S |
| Crecimiento del salario real antes de 2026 | `historicalRealWageGrowth` | 1 % anual | S |
| Crecimiento de la productividad antes de 2026 | `historicalProductivityGrowth` | 1 % anual | S |
| Inflación hasta 2026 | `historicalInflation` | 2 % | S |
| Tipo nominal de la deuda hasta 2026 | `historicalNominalDebtRate` | 4 % | S |
| Vida de la deuda inicial | `historicalInitialDebtMaturityYears` | 8 años, vencimientos uniformes de 1985 a 1992 | S |

Las magnitudes de apertura se obtienen hacia atrás desde las anclas de 2026 (R sintética, `:91-101`). Con n = 2026 − 1984 = 42:

```
L_1984 = L_2026 / (1 + g_L)^n
w_1984 = w_2026 / (1 + g_w)^n
π_1984 = (Y_2026 / L_2026) / (1 + g_π)^n
Y_1984 = L_1984 · π_1984
R_1984 = L_1984 / ρ
p_1984 = (B_2026 / R_2026) · w_1984 / w_2026
B_1984 = R_1984 · p_1984
D_1984 = d_0 · Y_1984
I_1984 = D_1984 · i_h
```

- L: cotizantes. w: salario real medio. π: producto por ocupado. Y: PIB real. R: jubilados. p: pensión media de jubilación. B: gasto anual en pensiones de jubilación. D: deuda. I: intereses.
- g_L = 0,012; g_w = g_π = 0,01; ρ = 3,4; d_0 = 0,40; i_h = 0,04.
- Las anclas de 2026 son `base.workers`, `base.wage`, `base.gdp`, `base.retirees` y `base.retirementAnnualBenefits` de `data/current-spain-v8.js` (ver 5.9).
- Con los valores por defecto resultan unos 13,6 millones de cotizantes, un salario de 20.553 €, un PIB de 711.000 millones, 4,0 millones de jubilados y una pensión de 15.418 € al año. La tasa de sustitución heredada es `legacyReplacementRate` = p_1984 / w_1984 = 0,750 (`:101`).
- Los otros gastos primarios de 1984 son la misma proporción del PIB que en 2026 (`:192-194`).

### 5.4 Demografía y mortalidad retrospectivas

**Cohortes iniciales (R proxy).** El perfil de edad y sexo de 2026 se traslada 42 años atrás y se reescala (`:129-134`).

```
c_1984 = c_2026 − n
N_1984(c, s) = N_2026(c, s) · (R_1984 / R_2026)   si la cohorte está jubilada
N_1984(c, s) = N_2026(c, s) · (L_1984 / L_2026)   si está en activo
ℓ_1984 = ℓ_2026 · w_1984 / w_2026
```

- N: tamaño de la cohorte. c: año de nacimiento. s: sexo. ℓ: pensión anterior a la reforma (`legacyAnnual`).
- El código no afirma reproducir el baby boom ni el empleo histórico (`:57`).

**Mortalidad (R proxy).** Antes de 2026 se congela la tabla de 2026. Desde 2026 se usa la trayectoria proyectada (`:103-106`).

```
m_x(t, a, s) = m_x^{EUROPOP2025}(max(2026, t), a, s)
S_½(t, a, s; λ) = S_½^{tabla}(t, a − λ · max(0, t − 2026), s)
```

- m_x: tasa central de mortalidad. S_½: supervivencia semestral. λ: `longevityGain` (ajuste «Ganancia de longevidad», por defecto 0). La ganancia solo actúa desde 2026.
- El factor de renta suma supervivencias semestrales descontadas al tipo semestral h. La cola se cierra con una serie geométrica cuando la tabla se agota (`:110-128`):

```
F(t, a, s) = Σ_k ½ · Π_{j<k} S_½ / (1 + h)
```

**Entradas al empleo (R sintética).** Cada año se añaden entrantes para que el empleo siga una senda de referencia (`:142-163`).

```
L^ref_t = L_2026 · (1 + g_L)^(t − 2026)        si t < 2026
L^ref_t = referenceEmployment_t (contexto 2026)  si t ≥ 2026
E_t = max(0, L^ref_t − Σ_{continúan} exposición_t)
```

- Hasta 2026 incluido los candidatos entran a los 22 años. Se reparten por sexo al 50 % y por edad objetivo de jubilación según `RETIREMENT_AGE_WEIGHTS` (`data/current-pension-stock.js`). Desde 2027 se usan los entrantes del contexto actual (`:150-152`).
- La fertilidad (`targetFertility`) escala a los entrantes jóvenes. Solo los afecta con años de nacimiento a los que llega el escenario (`:164-170`).
- La jubilación ocurre a la edad objetivo de la cohorte más (`retirementAge` − 65), en el segundo semestre (`:135-136`).
- La tasa de la primera pensión es 0,77 antes de 2026 y la del contexto actual después (`:249`). El motor común la multiplica por `replacementRate` / 0,77 (`src/current-simulation-core-v10.js:476-477`).

### 5.5 Macro y política fiscal antes y después de 2026

El año 2026 separa dos fuentes de datos macro y fiscales. El libro de cuentas sigue siendo uno solo (`:74`).

```
w_t = w_2026 · (1 + g_w)^(t − 2026) · φ^w_t                       si t < 2026
π_t = (Y_2026 / L_2026) · (1 + g_π)^(t − 2026) · φ^π_t · μ_t       si t < 2026
P_t = (1 + 0,02)^(t − 2026)                                     si t ≤ 2026
P_t = (1 + inflationRate)^(t − 2026)                            si t > 2026
```

- φ^w, φ^π: factores de automatización de salario y productividad. μ: multiplicador del paradigma. Antes de 2027 valen 1, porque la automatización arranca en 2027 (`src/automation-scenario.js:60-61`: el avance es max(0, …), cero hasta el año base).
- Desde 2026, salario y productividad salen de `createWagePathV6` y del contexto de cohortes actual (`:171-176`).
- Hasta 2026 incluido, `annualConfig` fija la inflación al 2 % y el tipo real a (1,04 / 1,02) − 1 ≈ 1,96 % (`:200-202`).

**Cuentas públicas antes de 2026** (`:203-208`, `:255-258`):

```
T_t   = Y_t · τ                         (τ = taxRevenueGDP)
G_t   = Y_t · G_2026 / Y_2026           (otros gastos primarios)
c^ret_t = κ · s_ret,   c^prot_t = κ · (1 − s_ret),   c^MEI_t = 0
```

- τ: `taxRevenueGDP`, «Nivel de los demás ingresos públicos», por defecto 33,89 % (R, ver 5.9).
- κ: `contributionRate`, «Cotización para pensiones», por defecto 22,15 %.
- s_ret: `retirementContributionShare` = 0,7349, la parte de la nómina de jubilación dentro de la nómina de la Seguridad Social (O, septiembre de 2026).
- Antes de 2026 no hay MEI ni cuota de solidaridad. Tampoco hay ingresos no monetarios, cuotas de mutuas ni presión del envejecimiento sobre la sanidad.
- Las pensiones en curso se mantienen en términos reales: índice 1 hasta 2026 (`:259`).
- Las otras pensiones públicas son una proporción fija del PIB hasta 2026, porque `otherShare` lee la fila de `max(2026, t)` del Ageing Report (`:237-240`, `:260`).

**Desde 2026** se usan las mismas piezas que el modelo actual: `createFiscalCompositionV10`, el puente de mutuas v8, `paymentSpendingAdjustment`, la presión de cuidados (`ageingCarePoints`) y los efectos del paradigma (`:204`, `:209-229`). Las cotizaciones siguen la política v7, con el MEI de 0,9 %, también desde 2026 (`:255-258`). El ancla fiscal de 2028 también se fija en 2028.

**Controles por fecha** (`:73`).
- Desde 1985: rentabilidad (`realReturn`), comisión (`feeRate`), cartera, transición, cotización (`contributionRate`) y edad de jubilación (`retirementAge`).
- Desde 2027: fertilidad, IA, desviaciones macro, revalorización manual y medidas fiscales fechadas.

### 5.6 El libro de cuentas propio

El contrafactual lleva el mismo motor de cohortes (`createSimulator`) y el mismo motor fiscal (`createCurrentFiscalEngineV13`). Tiene su propia apertura de deuda (`:195-199`):

- Deuda de 1984 al 40 %, con vencimientos uniformes en 8 años y política `'retrospective-synthetic-opening-debt-v1'`.
- Las nuevas emisiones siguen la escalera de plazos de 2026 (`issuanceMaturityWeights`, `ISSUANCE_LADDER_ID`). Es un proxy explícito para todo el periodo (`:62`).
- El libro de añadas (`debtVintageLedger`) se pasa a euros nominales de 1984 multiplicando por P_1984 (`:264-266`).

Los cuatro bloques se llevan separados (`:64-71`):
- **Activos invertidos.** El fondo empieza en cero. Solo recibe cuotas desviadas una vez desde la nómina y el rendimiento supuesto. Paga prestaciones y legados.
- **Derechos nocionales.** Son créditos virtuales, distintos de los activos. Sus cuotas entran en la caja pública.
- **Prestaciones anteriores a la reforma.** Se aproximan con una carrera plana. Quedan protegidas en el pilar público y no se convierten en activos del fondo.
- **Financiación pública.** Cuotas públicas más otros ingresos explícitos. El reparto de impuestos hacia pensiones es interno y no crea ingresos.
- No se importa la hucha de 2026. No se añade ninguna reserva, aportación institucional ni dividendo sin financiador (`:70`).

Identidades que comprueba `tests/retrospective-accounting.test.mjs:17-41` (con `tests/helpers/ledger.mjs`, el mismo bucle que comprueba el motor hacia delante) en cada año t de 1985 a 2070:

```
A^start_t = A_{t-1}
C_t = C^pub_t + C^fund_t
A_t = A^start_t + C^fund_t + r_t − P^fund_t − H_t − X_t
SB_t = T^tot_t − P^pub_t − G_t − I_t
D^open_t · P_t = D_{t-1} · P_{t-1}
D_t = D^open_t + ΔD^+_t − ΔD^−_t − W_t
K_t = K^open_t + ΔK^+_t − ΔK^−_t
Σ_v principal_{v,t} = D_t · P_t
```

- A: activos del fondo. C: cotizaciones (pública y al fondo). r: rendimiento. P^fund: prestaciones del fondo. H: legados. X: pérdidas por reestructuración. SB: saldo del Estado. T^tot: ingresos públicos totales. P^pub: prestaciones públicas. G: otros gastos primarios. I: intereses. D: deuda real. W: quitas. K: caja. P_t: índice de precios.
- En 1984 el fondo, el saldo nocional y la caja valen 0, y D/Y = 0,40.
- En todos los años `fundedExternalContributions = fundedReserveTransfers = 0`.
- Sin parte al fondo (`transitionTargetFunded = 0`, mezcla sin fondo) no hay activos, rendimientos, prestaciones ni capital por alta en ningún año (`:50-57`).
- El déficit y sus intereses consumen caja o crean deuda. El superávit amortiza deuda o acumula caja. Ningún flujo se ajusta para cubrir (`:69`).

### 5.7 Salida y diferencias con el modelo actual

Cada punto lleva `retro1985 = true`. El resultado expone cuatro vistas (`:274-286`):
- `years`: de 2026 a 2070, la ventana de la interfaz.
- `historicalYears`: de 1984 a 2026.
- `historical1985`: las estaciones 1985, 1995, 2000, 2008, 2012, 2020 y 2026 (`:36`).
- `summary`: primer año con hueco de financiación, hueco máximo en % del PIB y deuda final, con y sin prima.

Su 2026 es un flujo calculado, no la foto de apertura. `describeNominalMoneyFlow` no lo trata como año base: `isBase = year = 2026 ∧ ¬retro1985` (`src/fiscal-display-v9.js:23`).

| Aspecto | Modelo actual (`src/model-current-v10.js`) | Contrafactual 1985 |
|---|---|---|
| Apertura | Foto calibrada de 2026, `initialDebtGDP` = 97,8 % fijo (`:113`, `:209`) | 1984 sintético, deuda al 40 % (`:276`) |
| 2026 | Apertura observada o reconstruida | Resultado de 42 años simulados |
| Política de cotización | v7 (bases topadas) o v3, según `contributionMechanism` (`:123`) | Siempre v7 (`:190`) |
| Mortalidad antes de 2026 | No hay | Tabla de 2026 congelada |
| Jubilación | Edad ligada a la esperanza de vida, escalones (`retirementAgeStepYears`), retraso | Solo `retirementAge` − 65 sobre la edad objetivo (`:135`) |
| Capital público, Laffer completo, prima de estrés | Activos si se configuran (`:77-82`, `:175`, `:191-193`) | No se pasan al motor común. `lafferWedgeAhead`, `publicCapitalFactor` y `stressPremiumNow` faltan, así que no actúan (`src/current-simulation-core-v10.js:229`, `:256`) |
| Memoria del Fondo de Reserva (`reserveMemo`) y línea de diagnóstico de la solidaridad (`solidarityContributions`) | Sí (`:183`, `:186`) | No se calculan. La solidaridad sí se cobra desde 2026, dentro del tipo protegido de v7 (`:255-258`; `src/current-policy-v7.js:30`) |
| Trayectoria macro externa y horizonte largo | Admitidos (`macroRows`, `horizonYear`) | No |
| Riesgo de mercado en ejecución | Admitido | Rechazado (`src/simulation.js:11`) |

Ejemplo con la receta y los demás ajustes por defecto (S, salida del simulador, metodología 1.78):
- En 2026 el PIB coincide con el ancla, porque empleo y productividad se extrapolaron desde ella: 1,783 billones.
- En cambio, hay 5,77 millones de jubilados, frente a los 7,33 millones observados.
- La deuda es del 98,5 % del PIB y el fondo del 120 % del PIB.
- Por eso, como dice el propio código (`:75`), sus jubilados, pasivos y resultados no se igualan a la foto de 2026 y no prueban un ahorro frente a la España observada.

### 5.8 La comparación «Todos los sistemas» de la consola

**Qué calcula.** Corre el escenario abierto en cada sistema y los pone en una tabla, con el veredicto de sostenibilidad de cada uno (`src/pages/consola.js:289-324`). Solo se calcula con la vista abierta y se guarda por la clave `[config, limits]` (`:296-311`).

**Cómo se construye la lista.** `loadComparison(config, limits, { includeMixedGradual: true })` llama a `comparisonConfigs(config, { includeRetro1985: true, includeMixedGradual: true })` (`src/shared/comparison-systems.js:23-37`). Cada entrada es la configuración del lector con un parche encima (`src/shared/scenario-labels.js:133-173`):

| Clave | Parche sobre la configuración del lector | Ponderación de la cuota |
|---|---|---|
| `payg` | `system='payg'`, `transitionMode='none'`, `capitalizationStyle='balanced-standard'` | reparto = 1 |
| `ndc` | igual, con `system='ndc'` | nocional = 1 |
| `funded` | igual, con `system='funded'` | fondo = 1 |
| `mixed` | igual, con `system='mixed'` | `mix` del lector (por defecto 0,34 / 0,33 / 0,33) |
| `progressive` | `FLAGSHIP_PROGRESSIVE`, o solo `system='mixed'` si el lector ya tiene su propia transición progresiva | transición por cohortes |
| `mixedGradual` | `MIXED_GRADUAL`, o la configuración del lector si ya es su sistema | rampa lineal |
| `retro1985` | `FLAGSHIP_RETRO_1985` | ver 5.2 |

- La ponderación de los sistemas estáticos sale de `weightsFor` (`src/config-core.js:56-62`).
- **`FLAGSHIP_PROGRESSIVE`** (`src/shared/scenario-labels.js:29-39`): `transitionMode='pension-runoff'`, `transitionCutoffAge=48`, `transitionTargetFunded=0,50`, `transitionPublicPillar='custom-split'`, `transitionNdcShare=0,85` y `capitalizationStyle='common-fund'`. En este modo el ritmo sigue a las pensiones actuales que se extinguen, y `transitionYears` (24) no actúa. Según el comentario de `:26-28`, es una decisión del autor.
- **Regla de la receta progresiva** (`progressiveUsesFlagship`, `:83-88`). Se usa la receta si el lector no tiene transición, si está en el contrafactual de 1985 o si tiene el Mixto con ahorro propio. En otro caso se respeta su propia transición sobre `system='mixed'` (`:91-93`).
- **`MIXED_GRADUAL`** (`:71-75`): `mix` 0,34 / 0,33 / 0,33, `transitionMode='linear-ramp'`, `transitionYears=24`, `transitionTargetFunded=0,33`, `transitionPublicPillar='system-default'` y `capitalizationStyle='balanced-standard'`.

**Qué se comparte.** Todas las claves que el parche no toca son las del lector en todas las filas:
- cotización (`contributionRate`), demás ingresos (`taxRevenueGDP`, `pensionBudgetShare`);
- edad y sus reglas (`retirementAge`, `retirementAgeLink`, `retirementAgeStepYears`), `replacementRate`, revalorización y la clave de la cláusula de cierre. La cláusula solo actúa en la fila `payg`, la única con la ley actual, salvo con `closingClauseAnySystem` = 1 (`src/shared/closing-clause.js:53-59`);
- medidas fiscales, recortes de pagos, rescates y reestructuraciones;
- macro y demografía (`targetFertility`, `entrantGrowth`, `productivityGrowth`, `longevityGain`, automatización);
- deuda (`realInterestRate`, `newDebtTermYears`, `riskModel` y primas);
- fondo (`realReturn`, `feeRate`, `marketShock`) y los límites del veredicto.

**Qué fija cada sistema.** Solo el parche: `system`, `transitionMode`, `capitalizationStyle` y, en las vías con transición, sus claves `transition*` (y `mix` en Mixto con ahorro propio).
- Los sistemas estáticos conservan las claves `transition*` del lector. Con `transitionMode='none'` el motor no las lee, porque `cohortTransitionWeights` devuelve las ponderaciones base (`src/progressive-transition.js:136-137`).
- Fila `retro1985`: los ajustes compartidos entran con las fechas de 5.5. Algunos solo actúan desde 2027, y los que no lee el motor retrospectivo no actúan (5.7).

**Veredicto y acciones.**
- Cada fila se evalúa con `computeVerdict(entry.result, { config: entry.config, limits })` y `sustainabilityLight` (`src/pages/consola.js:314-315`; `src/domain/verdict.js:87`).
- La tabla muestra:
  - la deuda del año elegido y de 2070;
  - la pensión mensual;
  - la tasa de sustitución;
  - el hueco en % del PIB;
  - el fondo en % del PIB.
- El botón «Usar» aplica `selectSystemPatch` solo a los sistemas del selector: payg, ndc, progressive, mixedGradual y retro1985 (`:291`, `:320`). Para `funded` y `mixed` («de golpe») muestra «—».
- La exportación «todas las series» y el Excel usan la misma lista (`src/pages/consola.js:498-500`).

### 5.9 Calibración del año base 2026

**Cadena de versiones.** Cada versión importa la anterior y cambia solo lo que declara:

| Versión | `id` | Cambio |
|---|---|---|
| v1 | `es-current-2026-10-17-v1` | Foto de apertura (`data/current-spain.js:1-73`) |
| v2 | `es-current-2026-10-17-v2` | Vida media de la deuda 7,85 años (Tesoro, septiembre de 2026); indexación, Fondo de Reserva y composición fiscal IGAE 2025 como mecanismos futuros (`data/current-spain-v2.js:7-20`) |
| v3 | `es-current-2026-10-17-v3` | Separa MEI y solidaridad de la partida 120 de la TGSS. Las dos son derechos reconocidos netos de enero a agosto × 12/8 (`data/current-spain-v3.js:7-41`) |
| v4 | `es-current-2026-10-17-v4` | Ingresos por bases: IRPF por rentas, IVA por gasto, sociedades por excedente. Misma apertura (`data/current-spain-v4.js`) |
| v5 | `es-current-2026-10-18-v5` | Nuevo salario equivalente (`wage-bridge-v5`); bases topadas del Régimen General (`data/current-spain-v5.js`) |
| v6 | `es-current-2026-10-18-v6` | Crecimiento salarial de 2027 desde AMECO; regímenes. Misma apertura (`data/current-spain-v6.js`) |
| v7 | `es-current-2026-10-18-v7` | Separa cuotas de mutuas, TGSS ordinaria y resto dentro del mismo total (`data/current-spain-v7.js:4-19`) |
| v8 | `es-current-2026-10-18-v8` | Puente de mutuas a pensiones: costes de capital y reaseguro reconocidos, sin ingreso nuevo (`data/current-spain-v8.js:5-11`) |

- La calibración vigente es v8. `src/shared/default-config.js:27` aborta si `CALIBRATION_ID` (`src/shared/storage-ids.js`) no coincide con `CURRENT_SPAIN.id`. Así el estado guardado se versiona con la base.

**Cifras de partida.** O = observación con fecha. R = reconstrucción o estimación anual a partir de observaciones. S = supuesto.

| Magnitud (`base.*`) | Valor | Cómo se obtiene | Tipo | Código |
|---|---|---|---|---|
| `gdp` | 1.782.963 M€ | PIB 2025 (INE/IGAE) × 1,055 (previsión nominal del BdE) | R | `data/current-spain.js:6,10,26` |
| `totalRevenue`, `totalSpending`, `interest` | 765.566 / 808.442 / 42.656 M€ | Cuentas consolidadas provisionales de 2025 × 1,055 | R | `:27-29` |
| `debt` | 1.743.967 M€ (97,8 % del PIB) | Deuda AAPP al 31/07/2026, no a fin de año | O | `:30` |
| `workers` | 22.437.553 | Afiliación media de septiembre de 2026 | O | `:31` |
| `retirees` | 7.332.576 | 6.760.137 de la Seguridad Social + 572.439 de Clases Pasivas, septiembre de 2026 | O | `:51` |
| `retirementAnnualBenefits` | 171.700 M€ (9,63 % del PIB) | Nómina de jubilación de septiembre × 14 | R | `:18-19` |
| `publicPensionBenefits` | 232.355 M€ (13,03 % del PIB) | Nóminas SS + CP + PNC de septiembre × 14 | R | `:16-20` |
| `wage` | 31.215 € | EAES 2024 × (EACL 2025/2024) × 1,025 (AEAT, enero a agosto de 2026) | R | `data/current-spain-v5.js:8`; `data/wage-bridge-v5.js:4-11` |
| `socialContributions2026` | 190.173 M€ | Cotizaciones de 2025 × (enero-agosto 2026 / enero-agosto 2025) | R | `data/current-spain.js:21` |
| `meiAnnualPace`, `solidarityAnnualPace` | 5.381 / 731 M€ | Derechos reconocidos de enero a agosto de 2026 × 12/8 | R | `data/current-spain-v3.js:22-23` |
| `mutuaContributions` | 20.526 M€ | Parte de las mutuas en enero-agosto de 2026 aplicada al total anual | R | `data/current-spain-v7.js:5` |
| `ordinaryPensionPool` | 155.153 M€ | Cuotas ordinarias TGSS × parte de las pensiones en el gasto contributivo de 2025, sin mutuas | R | `data/current-spain-v7.js:6-11` |
| `pensionContributions` | 161.265 M€ | Bolsa ordinaria + MEI + solidaridad | R | `data/current-spain-v7.js:13` |
| `assignedStateResources` | 66.069 M€ | Transferencias del Estado a la SS en 2025 × parte de pensiones × 1,055, más Clases Pasivas | R | `data/current-spain.js:35-37` |
| `mutuaPensionTransfer` | 3.367 M€ | Partidas 422 y 423 de la TGSS, enero-agosto de 2026, escaladas a las cuotas de mutuas | R | `data/current-spain-v8.js:5-11` |
| `retirementContributionShare` | 0,7349 | Nómina de jubilación de la SS / nómina total de la SS, septiembre | O (cociente) | `data/current-spain.js:56` |
| `averageDebtMaturity` | 7,85 años | Tesoro, septiembre de 2026, aplicado a toda la deuda AAPP como puente | O + puente | `data/debt-policy-2026.js:38` |
| `cash` | 0 | Caja adicional del experimento; no es la caja del Tesoro | S | `data/current-spain.js:57,62` |

**Valores por defecto derivados de la foto** (`src/shared/default-config.js:38-55`; iguales en `src/model-current-v10.js:104-119`):

```
κ_0 = ordinaryPensionPool / (L_2026 · w_2026)                                        = 0,2215
τ_0 = (totalRevenue − pensionContributions) / Y_2026                                 = 0,3389
β_0 = assignedStateResources / (otherRevenue − imputedContributions − mutuaContributions) = 0,1146
d_0 = debt / gdp                                                                     = 0,9781
r_0 = (1 + 0,03432) / 1,02 − 1                                                       = 0,01404
```

- κ_0: `contributionRate`, «Cotización para pensiones» (R). Es un tipo implícito de asignación, no un tipo legal (`data/mutuas-v7.js:35`).
- τ_0: `taxRevenueGDP`, «Nivel de los demás ingresos públicos» (R).
- β_0: `pensionBudgetShare`, «Parte de los demás ingresos que va a pensiones» (R).
- d_0: `initialDebtGDP`. Está fija: cualquier otro valor se rechaza (`src/shared/default-config.js:68-70`).
- r_0: `realInterestRate`, «Interés real de la deuda». Usa el tipo de emisión del último mes del Tesoro, 3,432 % (O, `data/debt-policy-2026.js:33`), y el 2 % de inflación (S).
- `replacementRate` 0,77 es observación (O, Ageing Report 2024). Supuestos (S): `retirementAge` 65, `realReturn` 3 %, `feeRate` 0,5 % e `inflationRate` 2 %.

**Contraste de la apertura en el código.**
- Identidades: `otherRevenue = totalRevenue − pensionContributions` y `otherPrimarySpending = totalSpending − interest − publicPensionBenefits` se recalculan en cada fábrica. Si `otherRevenue < assignedStateResources` o `otherPrimarySpending < 0`, la apertura se rechaza (`src/model-current-v10.js:49-51`).
- v7 y v8 conservan el total consolidado de ingresos y gastos. Reclasifican partidas, no crean ingresos (`data/current-spain-v7.js:26`; `data/current-spain-v8.js:16`).
- Contraste con previsiones externas: `createCurrentModelV10({ macroRows, opening, ... })` acepta de 2 a 6 filas macro desde 2026 (`src/external-macro-path-v2.js:7-25`). En ese modo fija la macro y la demografía, apaga la cláusula de cierre y nunca usa como objetivo un saldo, una deuda ni un gasto futuro (`src/model-current-v10.js:112`, `:211-215`, `:279`).
- En este proyecto no hay llamadas a ese modo en `src/` ni en `tests/`. El contraste externo de este proyecto es `scripts/contrast-external.mjs` → `data/external-contrast.json`: compara `simulate` y los perfiles de referencia con el Ageing Report, la AIReF, el FMI y Funcas, sin usar ese modo. Su antecedente está en pensiones_lab_2 (`scripts/contrast-external-1.64.mjs`, documentado en `docs/CONTRASTE-PREVISIONES-2026-11-08.md`).

### Límites y simplificaciones

- El contrafactual no usa series históricas observadas. Empleo, salarios, productividad, inflación, tipos, deuda de 1984 y ratio de cotizantes por jubilado son supuestos constantes. El perfil demográfico es el de 2026 trasladado, sin baby boom ni migración histórica.
- La mortalidad anterior a 2026 es la de 2026 congelada. Infravalora la mortalidad real de 1985–2025.
- Antes de 2026 no hay MEI, solidaridad, mutuas, cuotas imputadas ni presión sanitaria. Otros ingresos y gastos son proporciones fijas del PIB de 2026.
- La curva y la escalera de plazos de 2026 se usan para emitir deuda desde 1985.
- En el contrafactual no actúan: la edad ligada a la esperanza de vida, los escalones de edad, el retraso de la jubilación, el capital público, la respuesta Laffer completa, la prima de estrés, el riesgo de mercado en ejecución, las trayectorias macro externas y el horizonte largo.
- La comparación de la consola cambia solo el sistema. No reoptimiza otros ajustes por sistema. Los sistemas «de golpe» se calculan, pero no se pueden adoptar desde la tabla.
- La foto de 2026 mezcla periodos distintos: deuda de julio, nóminas y afiliación de septiembre, cuotas de enero a agosto, cuentas de 2025 escaladas. No hay simulación parcial de octubre a diciembre de 2026 (`data/current-spain.js:63`).
- Textos corregidos el 22/11/2026: la mortalidad que cita el contrafactual (`data/official-mortality-europop2025.js`) y «seis vías» en `comparability`. El 0,77 es la tasa de sustitución bruta de las altas de jubilación del Ageing Report 2024 para España (O, redondeada; ficha de España, tabla 17).
