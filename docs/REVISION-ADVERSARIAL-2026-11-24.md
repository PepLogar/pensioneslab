# Revisión adversarial · 24/11/2026

Revisión de pensioneslabs3 (metodología `common-fund-1.69.0`, commit `c29de68`) hecha por agentes:
- **Búsqueda:** ocho revisores, cada uno con una lente.
- **Verificación:** tres escépticos por hallazgo, que intentan refutarlo (reproducirlo, revisar el razonamiento y ver si merece la pena). Sobrevive si al menos dos de los tres no lo refutan.
- **Crítico final:** busca lo que se haya escapado.

**Resultado:** 68 hallazgos; sobreviven 60, y el crítico añade 1. Nada se ha cambiado en el proyecto: es una lista de mejoras para decidir.

Algunos hallazgos se repiten entre lentes; se indica con «ver también».

## Resumen por gravedad

| Gravedad | Hallazgos |
|---|---|
| alto | 9 |
| medio | 24 |
| bajo | 27 |

## Cuentas del motor

### 1. Estilo 'sovereign-captive': la represión financiera reduce el rendimiento del fondo sin rebajar los intereses del Estado (el valor desaparece)

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 2 de 3.
- **Dónde:** src/progressive-transition.js:616-633; src/current-fiscal-v13.js:225-242; src/current-simulation-core-v10.js:395-411
- **Evidencia:** El estilo dice «Obliga al fondo a comprar bonos del propio Estado», pero su rendimiento es un número fijo: captiveGross = Math.min(baseReal, 0.014); repressionDrag = previousDebtGDP > 135 ? Math.min(0.007, ...) : 0; activeAnnualNet = captiveGross - captiveFee - repressionDrag. El motor fiscal calcula los intereses solo con los cupones del registro de emisiones (oldInterest + .5*grossIssued*targetNominalInterestRate), con prima de riesgo incluida, y no sabe qué parte de la deuda tiene el fondo. Con FLAGSHIP_PROGRESSIVE, el año 2070 da: cautiva, deuda 239,79 % del PIB, intereses 10,58 % del PIB, tipo efectivo 4,554 %, activos del fondo 68,3 % del PIB y rendimiento del fondo 0,18 % del PIB; equilibrada, deuda 239,11 %, intereses 10,56 % y tipo 4,555 %. El Estado paga el tipo de mercado sobre unos bonos que en teoría tiene el fondo, y el fondo cobra un ~0,27 % neto. Fuera de las comisiones, esa diferencia (~1,5 % del PIB al año en 2070) no le llega a nadie. La represión empobrece al ahorrador sin el ahorro de intereses del Estado que la justifica.
- **Propuesta:** Hay dos arreglos posibles. (a) Hacer explícita la tenencia cautiva: que una parte de la emisión bruta la compre el fondo con lo que aporta. Esa parte se anota en el registro a un tipo cautivo (base menos represión), y los intereses que paga el Estado por ella son exactamente el rendimiento bruto del fondo. Las comisiones se apuntan aparte, como coste privado. (b) Si no, ligar el rendimiento cautivo al effectiveNominalRate del año anterior deflactado, y anotar la represión como menor interés público en publicAccounts. Hace falta una prueba que compruebe que el interés pagado por la parte cautiva sea igual al rendimiento bruto más la comisión del fondo.

### 2. La importación desde Excel rechaza el estilo 'collective-cdc' y acepta 'global-equities-index', que no existe: el escenario no se conserva

- **Gravedad:** medio; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/excel-models-io.js:434,439,1485-1488; src/progressive-transition.js:39-46; src/config-current-v10.js:242-243
- **Evidencia:** excel-models-io.js:439 tiene allowed: ['balanced-standard', 'lifecycle-ap7', 'global-equities-index', 'common-fund', 'dividend-endowment', 'sovereign-captive']. En cambio, CAPITALIZATION_STYLES (progressive-transition.js:39-46) es ['balanced-standard','lifecycle-ap7','collective-cdc','common-fund','dividend-endowment','sovereign-captive']. En la importación (línea 1487), if (spec.allowed.includes(strVal)) next[key] = strVal; else notes.push('... no es un valor permitido, se deja como estaba'). Un escenario con 'collective-cdc' exportado y vuelto a importar pierde su cartera en silencio. Y 'global-equities-index' pasa el filtro, pero luego resolveConfig lo rechaza con «Invalid capitalizationStyle» (config-current-v10.js:242).
- **Propuesta:** Generar allowed y range a partir de CAPITALIZATION_STYLES importado de progressive-transition.js, en lugar de una lista a mano. Añadir a tests/csv-roundtrip o scenario-saving una prueba de ida y vuelta para cada estilo de CAPITALIZATION_STYLES.

### 3. contributionAllocationResidual siempre vale cero: la prueba «una aportación, un destino» no puede fallar

- **Gravedad:** bajo; **tipo:** mejora; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/current-simulation-core-v10.js:116,561-565,450-477; tests/common-fund-164.test.mjs:40-42
- **Evidencia:** Línea 116: contributionAllocationResidual = totalContributions - publicContributions - fundedContributions. Pero publicContributions = protectedContributions + (retirementContributions - fundedContributions) (líneas 561-562) y totalContributions = retirement + protected, así que el residuo es 0 por construcción, sea cual sea el reparto entre cohortes. Lo mismo pasa con effectivePaygWeight = Math.max(0, 1 - F - N) (línea 565), que es el resto y no una medida. Aun así, common-fund-164.test.mjs:42 lo comprueba con el comentario «One contribution, one destination». Lo comprobé por otra vía: en 'funded' puro, effectiveFundedWeight vale 1 ± 7e-15 en 2027-2070, y en 'ndc' puro effectiveNdcWeight también vale 1. Hoy no hay fuga, pero el indicador no la vería.
- **Propuesta:** Acumular por cohortes la parte de reparto de la cotización (contribution * w.payg * openingSize, junto a fundedContributionsAcc y notionalCreditsAcc). Definir el residuo como retirementContributions - (fundedContributionsAcc + notionalCreditsAcc + paygContributionsAcc), con retirementContributions = payroll*rate calculado aparte. Cambiar la prueba para que use ese residuo en payg, ndc, funded y la transición progresiva.

### 4. El freno nocional compara las cotizaciones con lo que se paga tras el recorte, no con lo que se debe

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 2 de 3.
- **Dónde:** src/shared/ndc-options.js:56-61; src/current-simulation-core-v10.js:312,543-551
- **Evidencia:** ndcBrakeFactor lee benefits = previous?.ndcBenefits. Con un recorte de pagos, el núcleo hace ndcBenefits *= paidShare (línea 551), mientras que la reserva nocional se sigue cargando completa y el importe previsto queda en paymentAdjustment.scheduledNdcBenefits (línea 545). Con un recorte del 5 %, el cociente credits/benefits sube un 1/0,95 y el factor (^(1/3)) es un ~1,7 % más alto: el freno actúa menos justo cuando el sistema no puede pagar lo que debe.
- **Propuesta:** En ndcBrakeFactor, usar previous.paymentAdjustment?.scheduledNdcBenefits ?? previous.ndcBenefits, la obligación contractual que el propio motor sigue cargando a la reserva.

### 5. El capital «preservado» de los jubilados no sufre la quita de una reestructuración de deuda

- **Gravedad:** bajo; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/creditor-fund-loss.js:46-52; src/current-simulation-core-v10.js:504-508,62
- **Evidencia:** applyCreditorFundLoss solo cambia cohort.fundedAssets *= remainingShare y, en los jubilados, fundedAnnual. No toca preservedFundedAssets. En los activos se vuelve a igualar cada semestre (línea 466); en los jubilados no: preservedCap = item.preservedFundedAssets ?? item.fundedAssets sigue generando preservedFundedBenefits sobre un capital sin quita. Por eso, desde el año de la reestructuración, preservedFundedAssets, averagePensionPreserveCapitalAnnual y replacementRatePreserveCapital salen por encima de lo que el fondo realmente tiene. Hoy solo los lee el motor (ninguna página los usa).
- **Propuesta:** Aplicar también cohort.preservedFundedAssets *= remainingShare en creditor-fund-loss.js, o quitar estos campos de la salida si ya no se van a usar.

## Opciones nuevas (1.67–1.69)

### 6. El contrafactual de 1985 aplica a medias la opción AIReF (activa por defecto): recorta salarios sin añadir empleo ni inflación

- **Gravedad:** alto; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/retrospective-model-1985.js:150, src/retrospective-model-1985.js:171-176, src/retrospective-model-1985.js:187-189, src/wage-path-v6.js:18, src/current-cohorts-v10.js:145-148, src/shared/scenario-labels.js:18
- **Evidencia:** El modelo retro hereda DEFAULT_CONFIG (airefShortRunEmployment=1). rawWage = wages.productionWage(year, growth, config) usa current.referenceWage(year,0,config), que multiplica por shortRunProductivityLevel (-2,5 % acumulado en 2030), y deflacta el AMECO 2027 con el 2,6 % de la AIReF. Pero rawProductivity = current.outputPerWorker(year, growth) se llama sin config (sin ese nivel), priceIndex es (1+config.inflationRate)^n (2 % fijo) y las altas salen de current.entrantCohorts(year) sin config (sin boost). Medido con simulateRetrospective1985: con la opción en 0 / 1, el PIB y los ocupados son idénticos (2031: 1.933.651 M y 23.402.639), el salario 2031 baja de 32.569 a 31.580, nómina/PIB 0,3942 → 0,3822 y la deuda de 2050 sube de 45,45 % a 54,29 % del PIB. retro1985 está en DEFAULT_VISIBLE_SYSTEM_KEYS.
- **Propuesta:** En el modelo de 1985 neutralizar la opción (pasar { ...config, airefShortRunEmployment: 0 } a productionWage/referenceWage, o forzarla a 0 en validateConfig del retro) o aplicarla entera (boost de altas, nivel de productividad en rawProductivity y senda de precios en priceIndex/annualConfig). Añadir una prueba: el retro con la opción a 0 y a 1 debe dar la misma deuda, o un empleo mayor si se aplica.

### 7. La base máxima de cotización ignora la senda de inflación 2027-2030 y aplica hacia atrás la inflación del usuario

- **Gravedad:** medio; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/current-policy-v5.js:40-46, src/model-current-v10.js:155, src/model-current-v10.js:127
- **Evidencia:** parts() llama a policy.baseResponse(year, config) con la config cruda, no con annualConfig, y el bucle usa prior[y-1] ?? config.inflationRate para cada año desde 2027. Medido: maximumAnnualNominal es idéntico con la opción en 1 y en 0 (2028 66.395, 2031 72.975, 2033 77.720), aunque el índice de precios de 2030 pasa de 1,0824 a 1,0931. Las pensiones sí suben el 2,6/2,3/2,1/2,0 %. Con inflationRate=0,03, el tope de 2028-2030 crece al 3 %+1,2 (2028: 67.038 = 64.336×1,042) mientras los precios suben 2,3/2,1/2,0 %. Resultado: en el defecto el tope queda un 1 % más bajo en términos reales para todo el horizonte, y con 3 % un 3 % más alto.
- **Propuesta:** En baseResponse usar para cada año y la inflación de ese año: pensionRevaluationRates[y] ?? prior[y-1] ?? (shortRunInflationRate(y-1, config) ?? config.inflationRate), o recibir del modelo una función yearInflation(y, config) derivada de priceIndex. Añadir una prueba: con la opción, el tope de 2031 entre el índice de precios coincide con el de la opción apagada (salvo el +1,2).

### 9. El perfil «Supuestos de la AIReF» resta productividad dos veces en 2027-2030 y no reproduce el PIB real del cuadro 16 que cita

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 2 de 3.
- **Dónde:** src/domain/reference-profiles.js:12-13, src/current-cohorts-v10.js:145-152, src/shared/short-run-employment.js:9-16
- **Evidencia:** El patch combina productivityGrowth=-0,0035 y realWageGrowth=-0,0035 (deviationFactor desde 2026) con airefShortRunEmployment=1, cuyo nivel de productividad se calibró con productividad 0 para clavar el PIB de la AIReF. Medido con ese patch: ocupados 1,90/1,80/1,60/1,50 % (correcto), pero PIB real 1,64/1,54/1,44/1,34 % frente a los 2,0/1,9/1,8/1,7 % de SHORT_RUN_EMPLOYMENT.target. El cuadro 16 ya incluye la productividad de la AIReF a corto plazo. El texto says afirma que hasta 2030 el empleo y la inflación son los que ella prevé.
- **Propuesta:** Con la opción activa, aplicar la desviación de productividad y salario solo desde 2031 (exponente max(0, year-2030) en esos años), o recalibrar el nivel cuando productivityGrowth≠0. Añadir al test de perfiles que el PIB real 2027-2030 del perfil AIReF esté a ±0,1 puntos del objetivo.

### 8. La revalorización «con el IPC del año anterior» no tiene desfase cuando la inflación cambia de un año a otro

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/current-policy-v2.js:127-133, src/model-current-v10.js:120-128, src/shared/lab-controls.js:75
- **Evidencia:** priorRates solo contiene 2026 (3,9 %) y las filas externas. Desde 2028, priorInflation = priorRates[year-1] ?? currentInflation, así que la pensión sube con la inflación del año en curso y el índice real vale siempre 1. Medido con inflationRate=0,03: pensionNominalRevaluation 2031 = 0,0300, aunque la inflación de 2030 era el 2,0 %. La ayuda de lab-controls dice que «las pensiones heredadas y de reparto en pago usan un índice rezagado», y las assumptions dicen «Prior-year inflation proxy». Con la senda AIReF por defecto, la inflación ya varía cada año.
- **Propuesta:** Pasar a pensionInPaymentRealIndex la inflación del año anterior de la senda: shortRunInflationRate(year-1, config) para 2028-2031 y config.inflationRate después, usando la config del escenario, no la anual. O corregir los textos para decir que el motor revaloriza con la inflación del propio año.

### 10. Los multiplicadores calibrados no dan el empleo de la AIReF con otros ajustes, aunque el texto de la opción cita cifras fijas

- **Gravedad:** bajo; **tipo:** riesgo; **votos que lo sostienen:** 2 de 3.
- **Dónde:** src/shared/settings-catalog.js:87, src/domain/assumptions-catalog.js:44, src/shared/short-run-employment.js:24-25
- **Evidencia:** Crecimiento medido de los ocupados en 2027-2030 con la opción en 1: defecto 1,90/1,80/1,60/1,50; retirementAgeExitPath=0: 1,74/1,50/1,35/1,31 (PIB 1,84/1,60/1,55/1,50); europop2023=1: 1,29/1,06/0,93/0,90 (PIB 1,38/1,16/1,13/1,09); entrantGrowth=-0,01: 1,87/1,72/1,49/1,36. El texto visible dice «El empleo crece entre el 1,9 y el 1,5 % al año ... el PIB real crece como el suyo», sin condición. El boost suma unos +0,9 puntos al empleo de la opción apagada, no fija el nivel objetivo.
- **Propuesta:** O decir en el texto que las cifras valen con los demás ajustes de partida (con la edad congelada o EUROPOP2023 el empleo crece menos), o calibrar el boost por año contra el objetivo (factor = objetivo / crecimiento de referencia del escenario). Como mínimo, desactivar u ocultar la opción con europop2023=1, igual que hace el perfil del Ageing Report.

### 11. Con la opción AIReF, la inflación elegida por el usuario solo vale desde 2031, y el texto dice «desde 2027»; también cambia el tipo real 2027-2030

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/settings-catalog.js:97, src/shared/lab-controls.js:75, src/domain/assumptions-catalog.js:30, src/model-current-v10.js:130-140, src/shared/payable-pension.js:34
- **Evidencia:** Con inflationRate=0,03 el índice de precios de 2027-2030 es idéntico al del defecto (1,0260/1,0496/1,0716/1,0931). El texto dice «Subida anual de los precios desde 2027» y el catálogo «2 % al año desde 2027». annualConfig conserva el nominal (1+r)(1+π_usuario)-1. La conversión es algebraicamente correcta, pero con 3 % el tipo nominal de 2027-2030 es 1,0343×1,03/1,02-1 ≈ 4,44 % mientras los precios suben un 2,6 %: el tipo real de esos años sube ~1 punto sin que el usuario lo vea. Además, payablePensionFactor (payable-pension.js:34) congela con config.inflationRate y no con la senda si el rescate cae en 2027-2030.
- **Propuesta:** Ajustar los textos de inflationRate («desde 2031 si el empleo e inflación de la AIReF están activos; de 2027 a 2030, 2,6/2,3/2,1/2,0 %») y el catálogo de supuestos. En payablePensionFactor usar el priceIndex de cada fila (cociente entre años) en vez de config.inflationRate.

### 12. Comentarios y valores por defecto de respaldo contradicen los defectos actuales

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/short-run-employment.js:1, src/revenue-bases-v10.js:94-95, src/current-cohorts-v10.js:307-310, src/fiscal-composition-v10.js:130
- **Evidencia:** short-run-employment.js:1 dice «0 by default», pero config-current-v10.js:56 pone airefShortRunEmployment: 1. revenue-bases-v10.js:95 dice «held in real euros (0, the default)», pero el defecto es 1 desde la 1.67. current-cohorts-v10.js:307 dice «Without the path (the frozen ages, the default; 1.67)», pero el defecto es la senda desde la 1.68. fiscal-composition-v10.js:130 usa config.unmodeledTaxesFollowGDP ?? 0: una config que no pase por resolveConfig toma el comportamiento anterior a la 1.67, sin aviso.
- **Propuesta:** Actualizar los tres comentarios. Cambiar el respaldo a ?? 1, o quitarlo y exigir la clave resuelta.

## Estado guardado y escenarios

### 13. simulationKey/canonicalConfig borra capitalizationStyle en reparto y nocionales aunque cambie el resultado con fundedExtraContribution > 0

- **Gravedad:** alto; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/sim-key.js:15; src/shared/sim-client.js:70-90; src/current-simulation-core-v10.js:232,392; src/shared/console-rows.js:45; src/shared/excel-models-io.js:431
- **Evidencia:** canonicalConfig, para system 'payg' o 'ndc', fija c.capitalizationStyle = 'balanced-standard' y su comentario dice que esos parámetros «cannot affect a system's result». Pero el motor usa capitalizationStyle para los activos de la cotización adicional (fundedExtraContribution) en cualquier sistema: isCommonFund(config) en la línea 232 y useCustomCapReturn en la 392. Medido con simulate() directo: payg + fundedExtraContribution 0.03 da fondo 2050 7.2066e11 y deuda 2070 203.17 con 'balanced-standard', y 8.7068e11 y 200.57 con 'common-fund'. En ndc: 27.38 % del PIB y deuda 136.48 frente a 23.04 % y 136.17 con 'sovereign-captive'. En ambos casos simulationKey(a) === simulationKey(b) da true. Consecuencias: (1) sim-client.simulateAsync pasa canonicalConfig(config) al worker, así que la consola nunca aplica el estilo elegido; npm run sim (scripts/sim.mjs:367 llama a simulate(s.config) sin canonicalizar) sí lo aplica, de modo que el mismo escenario da cifras distintas en el navegador y por línea de órdenes; (2) la caché en memoria y result-cache (IndexedDB) comparten resultados de escenarios distintos. El caso es alcanzable: la fila capitalizationStyle de la consola y la hoja 1 de Excel se pueden cambiar con system payg/ndc.
- **Propuesta:** En canonicalConfig, resetear capitalizationStyle en payg/ndc solo cuando fundedExtraContribution === 0 (o el valor inactivo de la opción). Si es positiva, conservar el estilo en la clave. Corregir el comentario de la cabecera. Añadir una prueba de conservación: payg/ndc con fundedExtraContribution > 0 y dos estilos dan claves distintas, y simulateAsync coincide con simulate para el mismo config. Revisar si hace falta subir RESULT_CACHE_VERSION o la metodología, porque los resultados precalculados con esa combinación quedarían mal emparejados.

### 14. «Mis escenarios» no aplica las migraciones 33, 34 y 35: una entrada guardada en el estado 32-34 se carga con impuestos fijos, edad congelada y empleo del Ageing Report

- **Gravedad:** medio; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/scenario-library.js:10,42,50-61; src/risk-state-migration.js:129-174
- **Evidencia:** libraryEntry tiene su propia cadena de migraciones, que se queda en migrateFlagship (estado 32). No llama a moveUnmodeledTaxesWithGDP (<33), moveToRetirementExitPath (<34), moveToAirefShortRun (<35) ni includeAgeingCare (<22), y aun así sella la entrada con stateVersion: STATE_VERSION (35). Medido: libraryEntry({stateVersion:32|33|34, config:{...DEFAULT_CONFIG, unmodeledTaxesFollowGDP:0, retirementAgeExitPath:0, airefShortRunEmployment:0}}) devuelve 0/0/0 con sello 35. configForStateVersion devuelve 1/1/1 (v32), 0/1/1 (v33) y 0/0/1 (v34). mergeLibraryFile con un archivo stateVersion 32 da lo mismo (taxes 0, exitPath 0, airef 0), mientras que el mismo config importado como JSON da 1/1/1. Como validateConfig escribe todas las claves, cualquier entrada guardada en lab3 entre el 23/11 y la 1.69 trae esos 0 explícitos. La consola usa la biblioteca (consola.js:361,469,481), y cualquier escritura (writeLibrary al guardar o borrar otra entrada) deja el sello 35 de forma permanente, así que la migración ya no se puede recuperar.
- **Propuesta:** Sustituir la cadena duplicada por la única cadena: config: validateConfig(configForStateVersion(preserveLegacyRelayConfig(preserveLegacyRiskConfig(entry.config)), Number.isFinite(+entry.stateVersion) ? +entry.stateVersion : 23)). El sello empezó en 24, así que una entrada sin sello es ≤23. Así cada futura migración entra en un solo sitio. Añadir una prueba que recorra OLDER_STATE_VERSIONS y compare libraryEntry({stateVersion:v, config}) con validateConfig(configForStateVersion(config, v)).

### 15. La consola copia enlaces que luego no se abren: más de 6000 caracteres o claves desconocidas dan null sin aviso

- **Gravedad:** medio; **tipo:** riesgo; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/share-link.js:12,26-34,44,57-58; src/pages/consola.js:518-520,564-568; src/shared/citation.js:15-16
- **Evidencia:** encodeScenarioHash no comprueba la longitud. decodeScenarioHash devuelve null si el código pasa de MAX_LINK_CHARS = 6000. Medido: un escenario con paymentAdjustments en los 44 años (0.01/0.02) y fiscalRescues 2027-2050 da un hash de 7939 caracteres, y decodeScenarioHash(h) === null. copyLink dice «Enlace copiado.», pero al abrirlo `if (shared)` es falso y la consola carga el escenario propio del lector sin decir nada. Pasa lo mismo con claves desconocidas (línea 57-58: `if (unknown.length) return null`), por ejemplo un enlace con europop2023/retaReform2032, que llegaron sin subir el estado, abierto en una compilación anterior del mismo estado 35. El CSV de series también lleva ese enlace como única copia del escenario (excel-models-io.js:1712-1716): su importación falla con «No se encontraron claves».
- **Propuesta:** Hacer que encodeScenarioHash devuelva un error o marca cuando el código pase de MAX_LINK_CHARS, y que copyLink lo diga (por ejemplo: «El escenario es demasiado grande para un enlace: expórtalo en JSON»). O subir el límite de forma coherente en ambos lados. En decodeScenarioHash, devolver { rejected } con una frase en lugar de null para el exceso de longitud y para las claves desconocidas. Añadir una prueba: encode→decode de un escenario con calendarios completos de medidas.

### 16. La caché de resultados entre visitas puede devolver resultados viejos cuando cambia el motor sin subir versión

- **Gravedad:** bajo; **tipo:** riesgo; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/result-cache.js:12-20; src/simulation-methodology.js:30; src/shared/app-version.js
- **Evidencia:** resultCacheKey solo depende de RESULT_CACHE_VERSION, APP_VERSION, SIMULATION_METHODOLOGY, CALIBRATION_ID, el escenario y los parámetros, y todas son constantes manuales. El historial muestra cambios del motor sin cambiar esas constantes después de que existiera la caché (47aa0bb, 24/11 17:37): 3eb0e46 (19:21, opción empleo AIReF), 3b6e710 (20:12, «Los recién llegados… no dejan gasto sin contar») y 4351e7a (20:26, «incluye su inflación»). Ninguno toca simulation-methodology.js, app-version.js ni package.json. Un resultado de Sensibilidad o Riesgo calculado a las 19:30 con airefShortRunEmployment=1 se habría reutilizado a las 20:30 con cifras del motor anterior, con el mensaje «no se ha vuelto a calcular».
- **Propuesta:** Añadir a la clave una huella del motor generada en el build: un hash de src/**/*.js y data/ inyectado con define de Vite o escrito por un script. O, como mínimo, una prueba que falle si cambian ficheros del motor sin subir SIMULATION_METHODOLOGY o una constante ENGINE_REVISION.

### 17. save() escribe estados que load() rechaza por tamaño (más de 50000 caracteres), y el escenario se pierde en silencio al recargar

- **Gravedad:** bajo; **tipo:** riesgo; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/scenario-store.js:38,74-95
- **Evidencia:** parseStoredState lanza un error si raw.length > 50000. save() escribe JSON.stringify(state) sin límite. Medido: un config con paymentAdjustments y fiscalRescues en los 44 años mide 12246 caracteres, y el estado con él y 3 comparaciones (saved[]) mide 49459, justo por debajo. Con algunas reestructuraciones o más decimales pasa de 50000 (con las tres listas completas, 70223). Al recargar, load() cae en el catch, muestra el escenario de origen y deja invalidStoredState=true, así que ningún cambio posterior se guarda. No se avisa al lector: stateSaveFailed solo cubre fallos de escritura.
- **Propuesta:** Aplicar el mismo límite al escribir (rechazar o avisar con stateSaveFailed antes de setItem) o subir el límite de lectura a uno coherente con el tamaño máximo validable (4 configs con calendarios completos ≈ 70 kB). Exponer invalidStoredState para que la barra de cabecera diga que el estado guardado no se ha podido leer.

## Documentación frente a código

### 18. El contrafactual de 1985 aplica a medias el nuevo defecto de la AIReF: baja salarios sin tocar PIB, empleo ni precios

- **Gravedad:** alto; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/retrospective-model-1985.js:150,164-176,187-189; src/wage-path-v6.js:18-19; src/current-cohorts-v10.js:145-152; docs/modelo/05-contrafactual-comparacion.md:330-336
- **Evidencia:** rawWage llama a wages.productionWage(year, growth, config), que deflacta 2027 con el 2,6 % de la AIReF y multiplica por shortRunProductivityLevel (vía current.referenceWage(year,0,config)). En cambio rawProductivity llama a current.outputPerWorker(year, growth) sin config, priceIndex usa (1+config.inflationRate) y current.entrantCohorts(year) va sin config (no hay más entradas). Medido con selectSystemPatch('retro1985'): airefShortRunEmployment=1 da w2027 31 107,4, w2030 31 207,1, masa salarial/PIB 2030 0,3808 y deuda 2050 95,68 %; con 0 da 31 482,4, 32 184,6, 0,3928 y 87,60 %. El PIB de 2030 (1 911,42 mM€), los ocupados (23,326 M) y P2030 (1,08243) son idénticos. retro1985 está en DEFAULT_VISIBLE_SYSTEM_KEYS. En el doc 05, la lista de lo que no actúa en el contrafactual no menciona esta opción.
- **Propuesta:** Neutralizar la opción en el contrafactual pasando a productionWage/referenceWage una config con airefShortRunEmployment: 0. La otra vía es aplicarla entera: productividad, precios y entradas. Añadirla a la lista de «no actúan» del doc 05 y probar que, en retro1985, la masa salarial/PIB no cambia con la opción.

### 19. El salario por defecto de 2027 y de 2070 del modelo 01 es de antes de la 1.69

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** docs/modelo/01-estructura-poblacion-economia.md:86,99,101,364; src/wage-path-v6.js:18-19
- **Evidencia:** El doc dice «w_2027 = 31 214,97 · 1,028739 / 1,02 = 31 482 €; w_2070 = 58 304 €» y la fórmula w_t = w_0·F_2027/(1+π)·…. El motor 1.69 da wage 2027 = 31 107,37 y 2070 = 56 533,50. El código deflacta con shortRunInflationRate(2027) = 0,026 y multiplica por shortRunProductivityLevel (−0,61 % en 2027, −2,47 % acumulado en 2030): 31 214,97·1,028739/1,026·0,9939 = 31 107. El doc dice además (01:101 y 01:364) que el nivel real del salario depende de la inflación supuesta para 2027. Por defecto ya no es la del ajuste: con inflationRate 0,02 o 0,03, el salario de 2027 es el mismo, 31 107,37.
- **Propuesta:** Cambiar la comprobación a «w_2027 = 31 214,97 · 1,028739 / 1,026 · 0,9939 = 31 107 €; w_2070 = 56 533 €». Añadir a la fórmula π_2027 de la AIReF y el factor de productividad a corto plazo. En 01:101 y 01:364, decir que, con el defecto, la inflación de 2027 es la de la AIReF (2,6 %), no la del ajuste «Inflación».

### 20. Por defecto, el ajuste «Inflación» ya no actúa desde 2027 sino desde 2031; textos y docs dicen lo contrario

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/settings-catalog.js:97; src/domain/assumptions-catalog.js:30; docs/modelo/02-ingresos-gasto.md:5; docs/modelo/01-estructura-poblacion-economia.md:44-46; docs/modelo/04-deuda-veredicto.md:105-106,111; docs/modelo/05-contrafactual-comparacion.md:319; src/model-current-v10.js:130-141
- **Evidencia:** La ayuda dice «Subida anual de los precios desde 2027». El supuesto dice «2 % al año desde 2027… se come cada año un 2 %». El doc 02:5 define «P_t = (1 + inflationRate)^(t−2026)». El doc 04 da «r^real por defecto 1,404 %» y «π_t … 2 %». En el código, priceIndex usa shortRunInflationRate en 2027–2030 y annualConfig baja el tipo real: (1,01404·1,02/1,026 − 1 ≈ 0,81 % en 2027). Medido: P2030 = 1,09307 con inflationRate 0,02 y con 0,03 (con 2 % puro sería 1,0824). Solo P2031 cambia: 1,11493 frente a 1,12586.
- **Propuesta:** Ayuda: «Subida anual de los precios desde 2031 (de 2027 a 2030, la de la AIReF, salvo que se apague esa opción)». Supuesto «Inflación»: 2,6 / 2,3 / 2,1 / 2,0 % en 2027–2030 y 2 % después. Doc 02:5: definir P_t como producto con π_t de la AIReF en 2027–2030. Docs 01:44-46 y 04:105-111: decir que el tipo nominal se mantiene y el real baja esos años.

### 21. La reforma del RETA cita deuda y año de ruptura de una versión antigua

- **Gravedad:** medio; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/domain/assumptions-catalog.js:47; docs/modelo/02-ingresos-gasto.md:58
- **Evidencia:** Los textos dicen «Con las reglas de hoy, la deuda de 2050 pasa del 152,6 % al 145,0 %» y el doc añade «se rompe en 2042, no en 2040». En el motor 1.69, con retaReform2032 = 1, la deuda de 2050 pasa del 117,38 % al 110,30 % y la de 2070 del 197,82 % al 180,11 %. Se rompe en 2052, no en 2050. Las cotizaciones de 2032 sí suben 0,38 puntos (9,257 a 9,637 % del PIB).
- **Propuesta:** Sustituir por «la deuda de 2050 pasa del 117,4 % al 110,3 % y se rompe en 2052, no en 2050 (1.69)» en los dos sitios. Fechar la cifra con la versión para que la próxima vez se vea que hay que revisarla.

### 22. «0,38 décimas de PIB» es un error de unidad: son 0,38 puntos, casi cuatro décimas

- **Gravedad:** medio; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/settings-catalog.js:63; src/domain/assumptions-catalog.js:47; src/current-policy-v7.js:7
- **Evidencia:** La ayuda y el supuesto dicen «unas 0,38 décimas de PIB». El comentario del código dice «≈ 0.38 % of GDP». El doc 02:58 dice «0,38 puntos de PIB». Medido: las cotizaciones de 2032 suben 0,380 puntos. 0,38 décimas serían 0,038 puntos, diez veces menos.
- **Propuesta:** Escribir «unas cuatro décimas de PIB (0,38 puntos)» en settings-catalog:63 y assumptions-catalog:47.

### 23. Con la población EUROPOP2023 sola ya no se reproduce el empleo del Ageing Report, porque la opción de la AIReF sigue encendida

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** docs/modelo/01-estructura-poblacion-economia.md:163; src/domain/assumptions-catalog.js:44; src/domain/reference-profiles.js:24
- **Evidencia:** El doc dice que, con europop2023 = 1, «los ocupados de 2050 quedan en el 98,0 % de los de 2026». El supuesto dice «Opción: la población del propio Informe (EUROPOP2023), con su empleo tal cual». Con el defecto de la 1.69 y europop2023 = 1, workingPersons 2050/2026 = 22 532 791/22 437 553 = 100,4 %. Solo con airefShortRunEmployment = 0 sale el 98,05 % (21 999 625). El perfil del Ageing Report apaga la opción a mano por eso.
- **Propuesta:** En el doc 01:163 y en el supuesto, decir que el 98,0 % y el «empleo tal cual» piden apagar también «Empleo e inflación hasta 2030 como prevé la AIReF», como hace el perfil. Otra vía: avisar en la ayuda de europop2023 de que la opción de la AIReF está calibrada con EUROPOP2025.

### 24. El efecto de la productividad sobre el gasto y la deuda cita cifras irreproducibles hoy

- **Gravedad:** bajo; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** docs/modelo/01-estructura-poblacion-economia.md:146
- **Evidencia:** El doc dice: con productivityGrowth = 0,01, el gasto de 2070 pasa del 30,9 % al 55,8 % del PIB y la deuda del 7,8 % al 286,2 %; en 2050, del 39,6 % al 49,5 % y del 63,0 % al 142,6 %. El motor 1.69 con productivityGrowth 0,01 y realWageGrowth 0 da: 2070, gasto 50,71 % y deuda 203,27 %; 2050, gasto 47,82 % y deuda 113,15 %. El defecto ya da un gasto de 2070 del 55,10 %, mayor que el «después» citado. tests/spending-gdp-follows-productivity.test.mjs no comprueba estas cifras.
- **Propuesta:** Fechar la frase como medida de la 1.64 o recalcularla: «hoy (1.69), con +1 punto: gasto del 50,7 % y deuda del 203,3 % en 2070, frente al 55,1 % y el 197,8 % sin la desviación».

### 25. Los límites del modelo 01 no recogen el empleo de la AIReF a corto plazo, que ya es el defecto

- **Gravedad:** bajo; **tipo:** mejora; **votos que lo sostienen:** 2 de 3.
- **Dónde:** docs/modelo/01-estructura-poblacion-economia.md:356-357; docs/DECISIONES.md (24/11/2026, Metodología 1.69.0, «Antes de decidir se avisó»)
- **Evidencia:** 01:356 dice «El empleo de referencia es el del Ageing Report 2024 rebasado a EUROPOP2025» sin mencionar 2027–2030. DECISIONES 1.69 enumera avisos que no aparecen en los límites. La previsión a cinco años deja huella para siempre en el nivel de empleo: 24,88 M en 2040 frente a 24,22 M. Los multiplicadores b_t son S y el cambio va en la dirección optimista. Los recién llegados no se suman a la población.
- **Propuesta:** Añadir un límite: «De 2027 a 2030, el empleo, el PIB real y los precios siguen el cuadro macro de la AIReF con multiplicadores propios (S). El nivel de empleo queda un 2,7 % por encima de la referencia para siempre y la elección es optimista; el Ageing Report de 2027 puede cambiarlo».

### 26. Muchas referencias a settings-catalog.js del modelo apuntan a otro ajuste tras añadir claves nuevas

- **Gravedad:** bajo; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** docs/modelo/01-estructura-poblacion-economia.md:44,95,115,144,198,211,267; docs/modelo/04-deuda-veredicto.md:83,106; docs/modelo/05-contrafactual-comparacion.md:37; tests/methodology.test.mjs:37-52
- **Evidencia:** «Inflación» cita :206, que es productivityGrowth; la real es :214. realWageGrowth cita :204 (longevityGain); la real es :212. productivityGrowth cita :198, una línea en blanco; la real es :206. targetFertility cita :194 (narrativeRestructuringYears); la real es :200. longevityGain cita :196 (payablePensionFreezeYears); la real es :204. retirementAge cita :154 (pointsSystem); la real es :158. newDebtTermYears cita :176 (pensionBudgetShare); la real es :182. Los nombres de sistemas citan :128-137, que es el inicio de SETTINGS_CATALOG. La prueba solo mira que la línea exista, no que contenga lo citado.
- **Propuesta:** Corregir las líneas (214, 212, 206, 200, 204, 158 y 182). Reforzar la prueba: si la referencia va junto a una clave entre comillas inversas en el mismo párrafo (por ejemplo `inflationRate`), comprobar que esa clave aparece en las líneas citadas.

### 27. Otras referencias desplazadas: settings-panel, config-current, current-policy-v7 y núcleo

- **Gravedad:** bajo; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** docs/modelo/01-estructura-poblacion-economia.md:115,142,144,319,325; docs/modelo/03-pensiones-sistemas.md:116; docs/modelo/05-contrafactual-comparacion.md:210
- **Evidencia:** settings-panel.js:77-78 se cita como el control «Productividad y salarios», pero es entrantGrowth; el control que escribe las dos claves está en :79-80. config-current-v10.js:128-129 se cita para aiAutomationShare y robotAutomationShare, pero es STRESS_PREMIUM_DEFAULTS y POINTS_DEFAULTS; los rangos están en :139-140 y la validación de la suma en :259. current-policy-v7.js:33 se cita para la solidaridad dentro del tipo protegido, pero ahora es la suma del RETA; protectedRate con solidarityRate está en :30. current-simulation-core-v10.js:278, 287 se cita para Y^gasto, pero 287 es displacedWorkers; spendingGDP está en :288. model-current-v10.js:85 se cita para M^IA, pero es «},»; el multiplicador está en :84.
- **Propuesta:** Actualizar a settings-panel.js:79-80, config-current-v10.js:139-140, 259, current-policy-v7.js:30, current-simulation-core-v10.js:278, 288 y model-current-v10.js:84.

### 28. El modelo 05 dice que el script de contraste está en pensiones_lab_2, pero el proyecto tiene el suyo

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** docs/modelo/05-contrafactual-comparacion.md:325; scripts/contrast-external.mjs:1-18
- **Evidencia:** El doc dice «El script de contraste está en pensiones_lab_2 (scripts/contrast-external-1.64.mjs…)». pensioneslabs3 tiene scripts/contrast-external.mjs, que escribe data/external-contrast.json y se regenera en la 1.68 y la 1.69 según DECISIONES. No usa macroRows: importa simulate y DEFAULT_CONFIG.
- **Propuesta:** Decir que el modo macroRows no se usa, y que el contraste externo de este proyecto es scripts/contrast-external.mjs → data/external-contrast.json, que compara con simulate y los perfiles. Dejar la referencia a pensiones_lab_2 como antecedente.

### 29. El comentario de cabecera de short-run-employment.js dice «0 by default»

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/short-run-employment.js:1
- **Evidencia:** El comentario dice «// Employment until 2030 as the AIReF expects (config.airefShortRunEmployment, 0 by default; 24/11/2026)». Desde la 1.69, DEFAULT_CONFIG.airefShortRunEmployment = 1, comprobado en el motor. La ayuda (settings-catalog.js:87) ya dice «el defecto desde la 1.69».
- **Propuesta:** Cambiar a «1 by default since 1.69; 0 until 1.68».

## Pruebas

### 30. La clave canónica (caché y worker) junta configuraciones de reparto que el motor calcula distinto: transitionMode decide si se aplica la cláusula de cierre

- **Gravedad:** medio; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/shared/sim-key.js:13-17; src/shared/closing-clause.js:53; src/shared/sim-client.js:70,75-83; tests/result-cache.test.mjs:27-30
- **Evidencia:** canonicalConfig pone transitionMode='none' en payg/ndc, pero keepsCurrentLaw = config.system === 'payg' && (config.transitionMode ?? 'none') === 'none'. Medido con a={...DEFAULT_CONFIG, system:'payg', retirementAge:64, retirementAgeExitPath:0} y b={...a, transitionMode:'pension-runoff'}: simulationKey(a)===simulationKey(b) es true, pero la deuda/PIB es 154,224 frente a 157,287 en 2050 y 276,578 frente a 283,796 en 2070 (closingClauseRate 0,0131 frente a undefined). Con DEFAULT_CONFIG las cifras coinciden, pero las filas no: b no lleva los campos closingClauseRate/closingClauseContributions. sim-client ejecuta canonicalConfig(config) en el worker, mientras que scripts/sim.mjs y simulate ejecutan la configuración tal cual. Un archivo o enlace importado con payg y un transitionMode distinto de 'none' da un resultado en la consola y otro en npm run sim. El test de la caché solo comprueba que las claves sean iguales, no que lo sean los resultados.
- **Propuesta:** Añadir a tests/result-cache.test.mjs un test de propiedad: para cada clave que canonicalConfig reinicia (transitionMode, capitalizationStyle, mix y TRANSITION_KEYS en payg/ndc; TRANSITION_KEYS y mix en funded/mixed con 'none'), si simulationKey(a)===simulationKey(b), entonces assert.deepEqual(simulate(a).years, simulate(b).years). Basta con un caso de presión (retirementAge 64, retirementAgeExitPath 0) y un horizonte corto. Hay dos arreglos posibles para que pase: que validateConfig normalice transitionMode a 'none' cuando system es payg o ndc, o que keepsCurrentLaw no dependa de transitionMode cuando system es payg.

### 31. Con la opción de la AIReF activa (por defecto) y una inflación propia, la base máxima de cotización se revaloriza con la inflación del escenario y no con la de la AIReF en 2028–2030, sin test

- **Gravedad:** medio; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/current-policy-v5.js:43; src/model-current-v10.js:130-136,155; tests/short-run-employment.test.mjs:29-31
- **Evidencia:** baseResponse(year, config) recibe la configuración sin pasar por annualConfig, y el bucle usa prior[y-1] ?? config.inflationRate para 2028–2031. Los precios, en cambio, usan shortRunInflationRate. Base máxima real (maximumAnnualNominal/priceIndex) medida: con inflationRate 0,02 y la opción activa, 64.691,4 € en 2030 y 67.001,6 € en 2033; con 0,05 y la opción activa, 70.498,7 € en 2030 y 72.943,5 € en 2033 (+9 % real permanente); con 0,05 y la opción apagada, 63.397,6 €. Los precios suben 2,3/2,1/2,0 % en 2028–2030 en ambos casos. Con la opción activa, el tope real depende de un parámetro que en esos años ya no mueve los precios. Esto contamina la variante «±1 punto de inflación» de Sensibilidad (src/domain/sensitivity.js:22). El único test de esta ruta usa DEFAULT_CONFIG.inflationRate.
- **Propuesta:** Test nuevo en short-run-employment.test.mjs: con inflationRate 0,02 y 0,04 (la opción activa), comprobar (a) que priceIndex crece 2027–2030 como SHORT_RUN_EMPLOYMENT.inflation en los dos casos; (b) que contributionBaseDrivers.maximumAnnualNominal/priceIndex coincide hasta 2030 (1e-9 relativo) y, desde 2031, crece igual (fuera del primer año de rezago); (c) que el tipo nominal de las emisiones nuevas de 2028 es el del escenario. El arreglo es usar shortRunInflationRate(y-1, config) ?? config.inflationRate en current-policy-v5.js:43, o pasarle el índice de precios.

### 32. Fecha de ruptura de las cuentas nocionales en el filo: la «pensión primero en 2066» depende de 0,014 puntos de PIB de necesidades de financiación

- **Gravedad:** medio; **tipo:** riesgo; **votos que lo sostienen:** 2 de 3.
- **Dónde:** tests/round-13.test.mjs:54-61
- **Evidencia:** Sistema ndc por defecto: en 2065 hay riesgo alto (índice 0,526, margen de grossFinancingNeeds +0,102); en 2066 es bajo porque grossFinancingNeeds queda 0,014 puntos por debajo del umbral de 15,95; en 2067 vuelve a ser alto. firstSustainedHighYear=2067 y la tasa de sustitución de 2065 es 0,40186, frente al suelo de 0,40. Si las necesidades de 2066 suben 0,014 puntos del PIB, la deuda se rompe en 2065 y fallan v.firstProblemYear===2066 y v.failure==='pension'. El propio comentario (línea 58) dice que la deuda iba primero hasta 1.68.
- **Propuesta:** No fijar el año exacto. Afirmar la relación: v.firstProblemYear === Math.min(v.pensionInsufficientYear, v.sustainedHighRiskYear ?? Infinity) y v.failure coherente con cuál es menor. Mantener solo el año de la pensión (2066, margen de 0,0019 sobre 0,40 con una caída anual de unas 0,009). Si se quiere fijar el orden, usar un caso con margen claro, por ejemplo pensionAdequacyFloor 0,42.

### 34. Las identidades contables completas (deuda, caja, presupuesto, fondo, añadas) solo se prueban en el retrospectivo de 1985, no en el motor hacia delante

- **Gravedad:** medio; **tipo:** mejora; **votos que lo sostienen:** 3 de 3.
- **Dónde:** tests/retrospective-accounting.test.mjs:27-41; tests/common-fund-164.test.mjs:39-41
- **Evidencia:** El bucle de libros (debt = openingDebtReal + debtAdded − debtRepaid − debtWrittenOff; cash; stateBalance = totalPublicRevenue − publicBenefits − otherPrimarySpending − interest; continuidad nominal; debtVintageLedger = debt·priceIndex; fondo) solo corre con simulateRetrospective1985. Lo ejecuté sobre simulate() con el mismo criterio de tolerancia (max(0,02, 512·eps·|x|)) para mixed con paymentAdjustments, fiscalRescues y debtRestructurings (quita del 20 % en 2045), para el progresivo de referencia y para ndc: 0 fallos en las 8 identidades. Además, (debt−cash)−(openingDebt−openingCash)+stateBalance da −6,477e11 en 2045 con la quita, igual a writtenOffNominal/priceIndex (952.909.887.938/1,4711). Ningún test lo protege en el motor que usa la consola.
- **Propuesta:** Extraer el bucle de retrospective-accounting a una función ledgerChecks(years) y aplicarla en un test nuevo a los seis sistemas de comparisonConfigs y a la configuración 'measures' de engine-identity (quita, recortes y rescate fiscal). Son unos 30 s; para abaratarlo se puede reutilizar una sola ejecución por sistema compartida con engine-reference.

### 35. Sin test de las migraciones 33→34 y 34→35 encadenadas ni del enlace compartido (share-link)

- **Gravedad:** medio; **tipo:** mejora; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/risk-state-migration.js:140-150,172-173; src/shared/share-link.js:41-67; tests/unmodeled-taxes-choice.test.mjs:25-29
- **Evidencia:** Solo hay un test del paso 32→33 (unmodeledTaxesFollowGDP). No hay ninguno de moveToRetirementExitPath (<34) ni de moveToAirefShortRun (<35), y ningún test importa share-link.js (grep: 0 coincidencias con share-link, decodeScenarioHash u OLDER_STATE_VERSIONS). Comportamiento actual medido con configForStateVersion({unmodeledTaxesFollowGDP:0, retirementAgeExitPath:0, airefShortRunEmployment:0}, v) para v=32..35: unmodeled [1,0,0,0], exitPath [1,1,0,0], airefShortRun [1,1,1,0]. Decodificar un enlace forjado con _version 32..35 da lo mismo, y un ciclo encode→decode conserva los tres ceros.
- **Propuesta:** Añadir a un test de migraciones esa tabla 32–35 con assert.deepEqual. Añadir tests/share-link.test.mjs con: ida y vuelta encode→decode (validateConfig) que conserve retirementAgeExitPath 0 y airefShortRunEmployment 0; enlace con _version 33 → los dos pasan a 1; _calibration ajena → { rejected }; _version 999 → { rejected }; clave desconocida → null.

### 33. La expresión regular de la metodología en round-13 falla en cuanto se pase a 1.70

- **Gravedad:** bajo; **tipo:** riesgo; **votos que lo sostienen:** 3 de 3.
- **Dónde:** tests/round-13.test.mjs:14
- **Evidencia:** assert.match(SIMULATION_METHODOLOGY, /^(common-fund-1.6[456789]|...)/): 'common-fund-1.69.0' pasa y 'common-fund-1.70.0' no. El test se llama 'phase 2: new config keys...' y no trata de la versión; su comprobación real de la metodología ya está en engine-identity y engine-reference.
- **Propuesta:** Quitar la aserción o cambiarla por /^common-fund-1\.(6[4-9]|[7-9]\d)\./, o simplemente assert.equal(SIMULATION_METHODOLOGY, reference.methodology) como en engine-reference.

### 36. El texto del perfil de la AIReF da cifras del motor (126 %, 15,9 %) que ningún test comprueba, y la deuda está a 0,6 puntos de salirse de la tolerancia

- **Gravedad:** bajo; **tipo:** mejora; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/domain/reference-profiles.js:13,17-18; tests/reference-profiles.test.mjs:12-25
- **Evidencia:** Medido: deuda de 2050 126,41 frente al objetivo de 123 con tolerancia 4 (margen 0,59); gasto en 2050 15,899 frente a 16,3 con tolerancia 0,6 (margen 0,2); media 14,312 frente a 14,5. El campo says afirma «126 % frente a 123 %» y «15,9 % del PIB en 2050». Si cambia el motor, el test sigue pasando aunque el texto diga 126 y salga 129, por ejemplo.
- **Propuesta:** En reference-profiles.test.mjs, extraer del texto los números con /\((\d+) % frente a/ y /(\d+,\d) % del PIB en 2050/ y comprobar que coinciden con Math.round(debt2050) y con gross(2050) redondeado a una décima. Así el texto se mantiene verdadero al recalibrar.

### 37. La cabecera del test del empleo de la AIReF dice «Off by default», pero el test afirma que está activado por defecto

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** tests/short-run-employment.test.mjs:2,15-16
- **Evidencia:** Línea 2: «Off by default; on, with the starting settings…»; línea 16: assert.equal(DEFAULT_CONFIG.airefShortRunEmployment, 1) en un test titulado 'on by default since 1.69'.
- **Propuesta:** Cambiar la cabecera por «On by default since 1.69 (state 35); off, employment and prices follow the Ageing Report and the scenario's inflation from 2027».

## Páginas y herramientas

### 38. La lectura «por qué la deuda se separa» de la AIReF ya no cuadra con las cifras que muestra la propia página

- **Gravedad:** alto; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/pages/metodologia.js:96; D:/DATOS/Demarquia/pensioneslabs3/data/external-contrast.json (airefDebt); D:/DATOS/Demarquia/pensioneslabs3/src/domain/reference-profiles.js:17
- **Evidencia:** El texto fijo dice: «El gasto en pensiones es el mismo en 2050 (${n1(ad.pensions.at(-1))} % del PIB en el simulador, 16,4 % en la AIReF) … La diferencia es toda del saldo primario, y se abre antes de 2030; desde 2030 los dos bajan casi lo mismo». Datos actuales de external-contrast.json (methodology common-fund-1.69.0): airefDebt.pensions 2050 = 15,41, así que en pantalla se lee «es el mismo … 15,4 % … 16,4 %». identity 2050: con el saldo primario del simulador 117,4; con el de la AIReF 118,2; AIReF publicado 123. El saldo primario explica 0,8 de 5,6 puntos, no «toda». La deuda no «baja» en ninguna de las dos sendas: el simulador va 93,4 → 94,8 → 98,0 → 117,4 y la AIReF 95 → 94 → 99 → 123. Además, el perfil de la AIReF usa 16,3 % como cifra de 2050 (reference-profiles.js:17, targets.spending2050), no 16,4.
- **Propuesta:** Reescribir la lectura a partir de los datos: calcular la parte que explica el saldo primario, (identity[1] − identity[0]) frente a (identity[2] − identity[0]), y decirla con cifras. Quitar «es el mismo» y «bajan», o elegirlos solo cuando los datos los cumplan. Leer la cifra de la AIReF (16,3) de una sola fuente, por ejemplo REFERENCE_PROFILES[0].targets.spending2050 o un campo de external-contrast.json, en vez de escribir 16,4 a mano. Añadir a tests/external-contrast.test.mjs una prueba que falle si identity[1] no se acerca a identity[2] mientras el texto diga «toda».

### 39. La metodología dice que el simulador deja la edad de jubilación en 65, pero desde la 1.68 sigue por defecto la senda del Ageing Report

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/pages/metodologia.js:116; D:/DATOS/Demarquia/pensioneslabs3/src/config-current-v10.js:43
- **Evidencia:** metodologia.js:116: «El Ageing Report sube la edad de salida del empleo de ${…} a ${…} años. El simulador la deja en 65 si no se cambia.» Pero config-current-v10.js:43 fija retirementAgeExitPath: 1. assumptions-catalog.js:45 dice «Desde la 1.68, la edad efectiva sigue la senda del Ageing Report», y la fila del contraste se llama «Reglas de hoy (EUROPOP2025, senda de edad del Ageing Report, …)». En external-contrast.json, pensionersGap.factors.simulator.coverage = 1,0745, así que la cobertura del simulador ya sube. El factor que se muestra, split.coverage = ×0,979, contradice la frase «la deja en 65».
- **Propuesta:** Cambiar la viñeta para decir que, desde la 1.68, el simulador también retrasa la edad (de 65,0 a 65 + 1,37 desde 2040), y que el factor ×0,979 sale de cómo cuentan la cobertura uno y otro, no de una edad fija. Si sirve, sacar la frase de un campo que escriba scripts/contrast-external.mjs según config.retirementAgeExitPath.

### 40. En metodología, sensibilidad, riesgo y los SVG exportados, los números negativos salen con guion y no con el signo menos (−)

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/pages/metodologia.js:52; D:/DATOS/Demarquia/pensioneslabs3/src/pages/sensibilidad.js:16; D:/DATOS/Demarquia/pensioneslabs3/src/pages/riesgo.js:16,82; D:/DATOS/Demarquia/pensioneslabs3/src/views/chart-svg.js:11; D:/DATOS/Demarquia/pensioneslabs3/src/views/fan-svg.js:7; D:/DATOS/Demarquia/pensioneslabs3/src/views/tornado-svg.js:7
- **Evidencia:** src/shared/number-format.js:6 fija la regla «the real minus sign (−), never the hyphen». Estos helpers locales usan toLocaleString('es-ES'), y comprobado en Node, (-2.4).toLocaleString('es-ES') empieza por el código 45 (guion). Casos reales en la metodología: en la tabla del Ageing Report, «Crecimiento del empleo» 2050 sale como «-0,28» con debajo «-0,42 · +0,1», con guion en el valor y signo + en la diferencia; los saldos del FMI y de Funcas salen como «-2,4»; la frase de la línea 87 dice «diferencia de saldo de -0,5 puntos», mientras la etiqueta de identity dice «−2,1 %» con el menos verdadero. En riesgo, la opción del desplegable dice «−0,3 (vuelve a la media)», pero el sello del SVG exportado (línea 82, num(done.params.memory, 1)) escribe «memoria -0,3». Los ejes de los SVG de gráficos, abanicos y tornado también escriben los ticks negativos con guion.
- **Propuesta:** Usar num() y percent() de src/shared/number-format.js en lugar de los n1, num y fmt locales: num(v, d, { fixed: true }) da los mismos decimales fijos y el signo «−». En metodologia.js, n1 = (v, d = 1) => num(v, d, { fixed: true }). En las vistas SVG, fmt = (v, d) => num(v, d, { fixed: true }). Añadir a tests/number-format.test.mjs un caso por página que busque /-\d/ en el HTML generado.

### 42. El inventario del paquete Sites no incluye las huellas de external-contrast.json ni de docs/modelo/*.md, aunque los dos van compilados en metodologia

- **Gravedad:** medio; **tipo:** riesgo; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/scripts/prepare-sites-package.mjs:76-78,110; D:/DATOS/Demarquia/pensioneslabs3/src/pages/metodologia.js:14,40
- **Evidencia:** sourceFiles solo junta PAGES, package*.json, vite.config.js, src/** y data/**/*.js (línea 78: filter(full => full.endsWith('.js'))). Pero metodologia.js importa '../../data/external-contrast.json' (línea 14) y hace import.meta.glob('../../docs/modelo/*.md', { query: '?raw' }) (línea 40). Comprobado: dist/assets/metodologia-*.js contiene «Estructura del cálculo» y generatedAt. Así, si cambia el contraste o un capítulo del modelo sin tocar src/, el inventario no lo refleja. Además, el README del paquete (línea 110) dice «No hay … documentación interna … en dist/», y los capítulos de docs/modelo, con rutas ruta:línea, sí van dentro.
- **Propuesta:** Añadir a sourceFiles 'data/external-contrast.json' y walk(path.join(root, 'docs/modelo')).filter(f => f.endsWith('.md')). Mejor aún: sacar la lista del manifest de Vite (build.manifest: true) para incluir todo lo que se empaqueta. Matizar la frase del README: los capítulos del modelo sí se publican, a propósito, dentro de la Metodología.

### 41. Sensibilidad: cuando solo queda una variante, el tornado la colorea como «arriba» aunque sea un paso abajo

- **Gravedad:** bajo; **tipo:** error; **votos que lo sostienen:** 2 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/pages/sensibilidad.js:84; D:/DATOS/Demarquia/pensioneslabs3/src/domain/sensitivity.js:47-48
- **Evidencia:** sensibilidad.js:84: low: r.item.kind === 'flip' || i === 0 && r.effects.length > 1. variants() quita el valor igual al del escenario (sensitivity.js:48). Así, cuando el escenario está en el borde del rango o en un valor de un 'set', solo queda una variante y se marca HIGH (naranja, «arriba» en la leyenda de tornado-svg.js:41) aunque esté por debajo. Ejemplos: realReturn = 0,06 (máximo del rango [0, 0.06]) da solo 0,05; targetFertility = 1,6 da solo 1,0. Las dos salen en naranja «arriba».
- **Propuesta:** Decidir el color por el valor y no por la posición: low: r.item.kind === 'flip' || e.value < config[r.item.key]. Añadir una prueba en tests/sensitivity.test.mjs con un escenario en el borde del rango.

### 43. El comentario de app-version.js cita una prueba que no existe, y package.json lleva otra versión

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/shared/app-version.js:1-3; D:/DATOS/Demarquia/pensioneslabs3/package.json:3
- **Evidencia:** app-version.js:1: «The app's version, the one in package.json (tests/expert-exports-164.test.mjs keeps them equal)». APP_VERSION = '1.69.0', pero package.json dice "version": "0.1.0", y tests/ no contiene expert-exports-164.test.mjs: ningún archivo de tests/ menciona package.json. El inventario de Sites (prepare-sites-package.mjs:82) da appVersion 1.69.0, y el package.json que se copia en sourceHashes dice 0.1.0.
- **Propuesta:** Igualar package.json a APP_VERSION y añadir una prueba mínima que lea package.json y lo compare con APP_VERSION. Si no se quiere igualar, corregir el comentario para no citar una prueba que no existe.

### 44. Riesgo: el sello y el enlace exportados pueden citar un escenario distinto del que se calculó

- **Gravedad:** bajo; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/pages/riesgo.js:56,72,82,126
- **Evidencia:** run() guarda choice.config al empezar (línea 47) y lanza unas 200 simulaciones. Al terminar, guarda done = { …, config: getState().config } (línea 72; lo mismo en la línea 56). Si mientras tanto se cambia el escenario en la consola (otra pestaña, por subscribe), los SVG y el CSV exportados (exportStamp(done.config), líneas 82 y 126) llevan el enlace y la cita del escenario nuevo con las bandas del anterior. sensibilidad.js no tiene este fallo: guarda config al empezar (línea 35).
- **Propuesta:** Al empezar run(), guardar const config = getState().config y usarlo en done.config, en las líneas 56 y 72, en vez de volver a leer getState().

### 45. Al importar un archivo demasiado grande, el tamaño sale con punto decimal y el máximo está escrito a mano

- **Gravedad:** bajo; **tipo:** mejora; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/pages/consola.js:537; D:/DATOS/Demarquia/pensioneslabs3/src/shared/excel-models-io.js:155
- **Evidencia:** consola.js:537: throw new Error(`pesa ${(file.size / 1048576).toFixed(1)} MB y el máximo es 10 MB`). toFixed da «12.3 MB», con punto, contra la regla de coma decimal de number-format.js. El «10 MB» va escrito a mano en vez de salir de MAX_IMPORT_BYTES = 10 * 1024 * 1024.
- **Propuesta:** `pesa ${num(file.size / 1048576, 1)} MB y el máximo es ${num(MAX_IMPORT_BYTES / 1048576)} MB`, con num de src/shared/number-format.js, que la consola ya importa.

## Contraste y fuentes

### 46. Ingresos y gastos del simulador llevan el PRTR dentro y se comparan con la AIReF «sin PRTR»

- **Gravedad:** alto; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** data/current-spain.js:6,27-28; src/fiscal-composition-v3.js:28,52-60; scripts/contrast-external.mjs:257,291-292; src/pages/metodologia.js:75
- **Evidencia:** La apertura usa fiscal2025.revenue 725655 M y spending 766296 M sobre un PIB de 1690012 M, es decir 42,94 % y 45,34 %. Son las cifras CON PRTR de la AIReF (cuadro 18 del PFEMP, pág. 67: recursos 42,9 y empleos 45,3 en 2025), no las sin PRTR (cuadro 17: 42,1 y 44,5). En la ejecución base, temporaryMatchedRevenue vale 0 en 2026, 2027, 2028, 2030 y 2050, y otherNonTaxRevenue se queda en el 4,98 % del PIB todos los años. Así, unos 0,8 puntos de PRTR siguen a ambos lados para siempre. Aun así, la sección 5c compara «Ingresos» (sim. 42,94 en 2026) y «Gastos» (45,34) con las cifras sin PRTR de la AIReF (42,5 y 45,0). La 5b hace lo mismo en 2050 (sim. 44,35 frente a 45,0; 50,84 frente a 51,6). La página dice «sin PRTR» solo de la AIReF. «Resto de recursos» de la AIReF baja de 4,1 a 3,9; el del simulador se queda en 4,98, y la diferencia es más o menos el PRTR.
- **Propuesta:** Hay dos opciones. Una: dar a temporaryMatchedFlows el calendario del PRTR (≈0,8 % del PIB en 2025–2026 y 0 desde 2027, que es cuando se igualan los cuadros 17 y 18). Otra: en el contraste, restar a los ingresos y gastos del simulador la parte de PRTR que llevan, o compararlos con el cuadro 18 (con PRTR). Hay que decir en la tabla qué definición usa el simulador. El saldo no cambia, pero los niveles y el «Cambio 2026–2030» de ingresos y gastos sí.

### 47. La identidad de deuda frente al FMI mezcla el saldo primario sin ingresos por intereses con los intereses brutos

- **Gravedad:** alto; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** scripts/contrast-external.mjs:201,207,220-223; src/pages/metodologia.js:107; data/external-forecasts-international-20261017.json (comparisonRules)
- **Evidencia:** El script usa governmentPrimaryBalanceExcludingInterestIncomeGDPpct como pb y governmentInterestExpenseGDPpct como int. El simulador, en cambio, calcula primario = saldo + intereses pagados: −2,405 + 2,392 = −0,012 en 2026. Las propias reglas del fichero del FMI piden «derivar explícitamente saldo total + intereses pagados ... en vez de reutilizar el saldo primario WEO». Con las cifras guardadas, el primario derivado del FMI es 0,2/0,3/0,5/0,5/0,7/0,7 (2026–2031) y no −0,2/−0,1/0,1/0,1/0,2/0,3. Si lo rehago así, «Con el saldo primario del FMI» da 90,1 en 2031, no 92,1. «Y con la deuda de partida del FMI» da 89,7, no 91,6, frente a un 90,7 publicado. El residuo cambia de signo. El texto de la línea 107 lo explica con ventas de activos o uso de depósitos, que bajarían la deuda, cuando ahora el ajuste la sube en 1 punto.
- **Propuesta:** En short() y en blocks('ref') usar como primario del FMI el saldo más los intereses pagados (r.governmentNetLendingBorrowingGDPpct + r.governmentInterestExpenseGDPpct). Después, volver a ejecutar el script y reescribir la viñeta «Lo que queda» según el signo del residuo, o hacerla condicional a ese signo.

### 48. La lectura de la deuda de la AIReF afirma cosas que sus propias cifras contradicen

- **Gravedad:** alto; **tipo:** error; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/pages/metodologia.js:96
- **Evidencia:** El texto dice: «El gasto en pensiones es el mismo en 2050 (${ad.pensions} % ... 16,4 % en la AIReF)». ad.pensions da 15,4, así que se lee «15,4 % ... 16,4 %», un punto menos. También dice: «La diferencia es toda del saldo primario». Pero, con el saldo primario de la AIReF, la deuda de 2050 pasa de 117,4 a 118,2, frente a su 123: solo se cierran 0,8 de 5,6 puntos. Y dice que «desde 2030 los dos bajan casi lo mismo», cuando la deuda sube de 93,4 a 117,4 en el simulador y de 95 a 123 en la AIReF. El 16,4 es la cifra de la AIReF con su propia demografía (Estudio 1/2026, pág. 14 y cuadro 12, pág. 65), y está bien transcrita.
- **Propuesta:** Reescribir el párrafo a partir de los datos: la diferencia de gasto en pensiones de 2050 (ad.pensions frente a 16,4), lo que cierra el cambio de saldo primario (identity[1] − identity[0]) y lo que queda (identity[2] − identity[1]). Quitar «es el mismo», «toda del saldo primario» y «bajan». Un test podría comprobar que no se afirma igualdad cuando la diferencia pasa de 0,3 puntos.

### 49. La lectura de jubilados frente a pensionistas sigue con el defecto anterior a la 1.68

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/pages/metodologia.js:116,118; scripts/contrast-external.mjs:83,118-126
- **Evidencia:** La línea 116 dice «El simulador la deja en 65 si no se cambia». Desde la 1.68, retirementAgeExitPath vale 1 por defecto (src/config-current-v10.js:43), y la base del contraste es run({}). El factor de edad que muestra ahora es ×0,979: la cobertura del simulador (×1,075) crece menos que la del AR (×1,098), así que la edad ya no explica por qué los jubilados del simulador crecen más. La línea 118 cierra con «Desde 2026 las dos sendas suben parecido». Pero el simulador sube +2,37 puntos de 2026 a 2050 (13,03→15,41) y el AR +3,47 (13,81→17,28); el AR actualizado sube +3,28.
- **Propuesta:** Cambiar la viñeta: los dos suben la edad con la misma senda, y el factor que queda (×0,979) viene de otras diferencias de cobertura. Para la frase de la línea 118, calcularla con lvl/longRun o quitarla.

### 50. La tabla de largo plazo frente al Ageing Report usa en 2030 el empleo de la AIReF sin decirlo

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 2 de 3.
- **Dónde:** scripts/contrast-external.mjs:83,94-96,99,105
- **Evidencia:** La sección 1 («seguir igual» frente a la línea base del AR) usa base = run({}), que desde la 1.69 lleva airefShortRunEmployment = 1. En external-contrast.json, en 2030: empleo 1,50 en el simulador frente a 0,04 en el AR; PIB por ocupado 0,19 frente a 0,81; PIB real 1,69 frente a 0,84. Estas diferencias salen de la opción, no de la comparación con el AR. Ni las etiquetas de las filas ni el encabezado de la sección lo dicen. Las secciones 2 y 3 (variante de edad) sí fijan airefShortRunEmployment de forma explícita.
- **Propuesta:** Hacer la sección 1 con un parche explícito: { airefShortRunEmployment: 0 }, si debe ser lo mismo que el AR. O, si no, añadir en las filas de crecimiento y empleo, o en el encabezado, «2027–2030: empleo e inflación de la AIReF (defecto desde la 1.69)».

### 51. La instantánea de Funcas que cita el proyecto no existe en lab3

- **Gravedad:** medio; **tipo:** riesgo; **votos que lo sostienen:** 3 de 3.
- **Dónde:** data/external-forecasts-private-20261017.json:22,25,26
- **Evidencia:** snapshot apunta a «data/sources/external-forecasts/funcas-PIB2610-20261015.pdf», con su sha256 5e6ded64…, y hay tableImage y scenarioImage en la misma carpeta. Pero `ls data/sources/external-forecasts` da «No such file or directory» en pensioneslabs3. Los ficheros solo están en D:/DATOS/Demarquia/pensiones_lab_2/data/sources/external-forecasts. El script lee este JSON (línea 196) y no comprueba hash alguno, a diferencia del anexo del AR (línea 29) y del PFEMP (línea 285).
- **Propuesta:** Copiar a lab3 los tres ficheros, ya que son datos de fuente y no código, o marcar snapshot: null con una nota. Y añadir en el script la comprobación sha256 de priv.sources.funcas_report_20261015, igual que para el PFEMP.

### 52. El Estudio 1/2026 y la Opinión 2025 no tienen comprobación de huella, aunque de ellos salen AIREF_FISCAL y los objetivos de los perfiles

- **Gravedad:** bajo; **tipo:** mejora; **votos que lo sostienen:** 3 de 3.
- **Dónde:** scripts/contrast-external.mjs:255-257; src/domain/reference-profiles.js:17,28; docs/DECISIONES.md:419-420
- **Evidencia:** Las huellas solo están, abreviadas, en DECISIONES («a41ffe17…27787», «2af1f49f…0ea1»). El sha256 completo coincide: a41ffe179cb55e31fed1dba5ac28c83b521eb0f74fe0655d0ed3141c42727787 y 2af1f49f2d1554c42e0eae82f6855683224d31b89b974216c6d40f1a48680ea1. Comprobé con pdftotext las cifras de AIREF_FISCAL: deuda 101/95/94/99/123 (gráfico 29), primario 0,0/−2,1 (gráfico 3), intereses 2,4/4,4 (pág. 66), ingresos 43,3/45,0 (gráfico 19) y gastos 44,5/45,7/51,6. Todas son correctas. Pero los gastos salen del gráfico 20 y del cuadro 12 (pág. 65), que la cita «gráficos 2, 3, 19, 22 y 29» no nombra. Además, el cuadro 12 da intereses de 2,8 en 2030, que el script deja vacíos.
- **Propuesta:** Guardar las cifras de AIREF_FISCAL en un JSON de data/ con source.snapshot y el sha256 completo, como el del PFEMP, y comprobarlo en el script. Añadir «gráfico 20 y cuadro 12, pág. 65» a la cita, y el interés de 2030 (2,8).

### 53. El perfil de la AIReF compara su gasto con el escenario EUROPOP2025 y su deuda con el escenario de demografía propia

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** src/domain/reference-profiles.js:13-17,26-28
- **Evidencia:** El comentario dice «its own models with EUROPOP2025», y spending2050 = 16,3 con media 14,5 son de esa variante (Estudio, pág. 14). Pero debt2050 = 123 viene del escenario base con la demografía de la AIReF (págs. 7 y 70), cuyo gasto en pensiones de 2050 es el 16,4 %. Al ejecutar el perfil sale 15,90 % y 126,4 %, lo que confirma las cifras del texto, pero la comparación de deuda no es con el mismo escenario. También el perfil del AR cita «pág. 13: 14.6 %…; 16.3 % in 2050»: el 16,3 % del AR actualizado está en la pág. 14, porque la 13 solo tiene el 14,6.
- **Propuesta:** En el comentario y en says, decir que el 123 % es del escenario base de la AIReF, con su demografía y un 16,4 % en pensiones, y que el perfil usa EUROPOP2025. Corregir la página del perfil del AR a «págs. 13–14».

### 54. La inflación del simulador en 2027–2030 es el deflactor de la AIReF y se compara con IAPC o IPC

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** scripts/contrast-external.mjs:199,205,209; src/shared/short-run-employment.js:12-14
- **Evidencia:** Desde la 1.69, el índice de precios del simulador sigue el deflactor del PIB de la AIReF (2,6/2,3/2,1/2,0, bien transcrito del cuadro 16, pág. 46). short() lo da como «Inflación» frente a hicpAverageInflationPct del FMI (2,3 en 2027) y frente al IPC de Funcas (3,1 en 2027). Las reglas del fichero del FMI dicen «Mantener IAPC y deflactor del PIB separados». Además, la línea 1 de short-run-employment.js sigue diciendo «0 by default», cuando el defecto es 1 desde la 1.69.
- **Propuesta:** Llamar «Inflación (deflactor del PIB en el simulador)» a la fila de shortTable, o comparar con el deflactor del FMI si el fichero lo trae. Corregir «0 by default» a «1 by default since 1.69».

## Verosimilitud económica

### 55. El año en que «se rompe» depende de una sola variable binaria, que en 2047 queda a 0,01 puntos del umbral

- **Gravedad:** alto; **tipo:** riesgo; **votos que lo sostienen:** 2 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/shared/sovereign-risk.js:15-20, :93-102, :133-137; D:/DATOS/Demarquia/pensioneslabs3/data/s0-thresholds-dsm2022.js:34; D:/DATOS/Demarquia/pensioneslabs3/src/domain/verdict.js:36; D:/DATOS/Demarquia/pensioneslabs3/docs/DECISIONES.md:1249-1255
- **Evidencia:** Corrida por defecto (1.69): primaryBalance y grossDebt se activan todos los años. Su índice es 0,25/0,97 = 0,258. Basta con que se active grossFinancingNeeds (peso 0,26) para pasar a 0,526, que es riesgo alto. Necesidades brutas de financiación (NBF) frente al umbral de 15,95: 2047 = 15,94, 2048 = 15,58, 2049 = 15,79 y 2050 = 16,59. Por eso «se rompe» en 2050. Perturbaciones medidas (realInterestRate por defecto 0,014039): +1 pb hace de 2047 el primer año de riesgo alto (NBF de 2047 > 15,95); +10 pb, se rompe en 2049; +15 pb y +20 pb, en 2047. Con productivityGrowth +0,0005, el primer año de riesgo alto también pasa a 2047, aunque la deuda de 2050 baja (117,19 frente a 117,38). La tabla de la 1.69 en DECISIONES da «Se rompe 2050» sin la marca «al filo» que sí llevaban las versiones anteriores.
- **Propuesta:** Dar el año de ruptura con su margen. Por ejemplo, la distancia de las NBF al umbral en los años previos, o el año con ±10 pb de tipo real. Marcar «al filo» cuando el margen sea menor de 0,5 puntos. Otra opción: exigir que las NBF superen el umbral con un margen, o usar una media de dos años. Añadir a la tabla de la 1.69 que la ruptura de 2050 está al filo (2047 a 0,01 puntos).

### 56. El índice S0 deja fuera el saldo ajustado por el ciclo, que en un motor sin ciclo coincide con el saldo; incluirlo adelanta la ruptura a 2027

- **Gravedad:** alto; **tipo:** riesgo; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/data/s0-thresholds-dsm2022.js:28, :33; D:/DATOS/Demarquia/pensioneslabs3/src/shared/sovereign-risk.js:93-102; D:/DATOS/Demarquia/pensioneslabs3/docs/modelo/04-deuda-veredicto.md:182
- **Evidencia:** El motor proyecta el PIB con el producto potencial por ocupado del Ageing Report, sin brecha de producción. Así, el saldo ajustado por el ciclo (umbral −2,50, peso 0,23, el segundo mayor) es prácticamente el saldo. Ese saldo ya está por debajo de −2,5 desde el primer año: −2,61 en 2027, −2,91 en 2030, −4,58 en 2040. Índice recalculado con la corrida por defecto: con las 8 variables, 0,258 de 2027 a 2049. Sumando el saldo ajustado = saldo, 0,400 todos los años desde 2027, por encima de 0,36. Sumando además la deuda neta (deuda − tesorería: 96,1 % en 2027, umbral 59,51), 0,486. Con cualquiera de las dos variables, el riesgo alto sostenido empezaría en 2027 y no en 2050. El modelo 04 solo dice que estas variables quedan «fuera del motor», sin justificarlo.
- **Propuesta:** Declarar en el veredicto y en el modelo 04 que el resultado depende de excluir el saldo ajustado por el ciclo y la deuda neta, y cuánto cambia (de 2050 a 2027). Si se mantiene la exclusión, justificarla (por ejemplo, que el umbral se estimó con brechas de producción reales). Otra opción es añadir un ajuste que las incluya, con el saldo y la deuda menos la tesorería.

### 57. «Reglas de hoy» deja fuera la reforma del RETA que el propio texto da como ley; además, la cifra del catálogo está caducada y la unidad es errónea

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/config-current-v10.js:52; D:/DATOS/Demarquia/pensioneslabs3/src/shared/settings-catalog.js:63; D:/DATOS/Demarquia/pensioneslabs3/src/domain/assumptions-catalog.js:47; D:/DATOS/Demarquia/pensioneslabs3/src/current-policy-v7.js:9
- **Evidencia:** settings-catalog.js:63: «Los autónomos pasan a cotizar por lo que ganan de verdad, como manda la ley desde 2032». Aun así, retaReform2032 vale 0 por defecto, mientras la cláusula de cierre está encendida «como la ley en vigor». Medido: por defecto, se rompe en 2050, deuda de 2050 del 117,38 % y de 2070 del 197,82 %. Con retaReform2032 = 1, se rompe en 2052, deuda de 2050 del 110,30 % y de 2070 del 180,11 %. El catálogo (:47) dice «la deuda de 2050 pasa del 152,6 % al 145,0 %», cifras de una metodología anterior. Además, RETA_REFORM.pendingGDP = 0.0038, es decir, 0,38 % del PIB (3,8 décimas), pero los textos dicen «unas 0,38 décimas de PIB».
- **Propuesta:** Hay dos salidas. Una: encender la reforma en «reglas de hoy», con nueva metodología. Otra: quitar «como manda la ley» y declarar que el defecto omite una medida legislada que la AIReF cuenta, con un sesgo pesimista de unos 7 puntos de deuda en 2050. Actualizar la cifra del catálogo a 117,4 → 110,3 % y corregir «0,38 décimas» por «0,38 puntos (casi 4 décimas) de PIB» en assumptions-catalog.js:47 y settings-catalog.js:63.

### 58. El recorte de productividad de la opción AIReF se aplica al salario de todos, no solo al de los recién llegados, y explica parte del gasto en pensiones «sin explicar» frente a la AIReF

- **Gravedad:** medio; **tipo:** incoherencia; **votos que lo sostienen:** 2 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/shared/short-run-employment.js:8-11; D:/DATOS/Demarquia/pensioneslabs3/src/current-cohorts-v10.js:145-147; D:/DATOS/Demarquia/pensioneslabs3/docs/DECISIONES.md:1144, :1198
- **Evidencia:** El comentario justifica el recorte en que «the newcomers produce and earn somewhat less (S)». En cambio, referenceWage multiplica por shortRunProductivityLevel el salario de toda la población ocupada. El nivel queda un 2,4 % más bajo desde 2030, y con él todas las pensiones nuevas, que salen del salario de referencia, también las de quien ya trabajaba. En una copia del motor sin ese recorte del salario (el producto por ocupado sigue recortado), el gasto en pensiones de 2050 es del 15,68 % del PIB, frente al 15,41 % por defecto (0,27 puntos). DECISIONES:1144 y :1198 dejan «sin explicar» por qué la AIReF gasta 0,4–0,5 puntos más en pensiones en 2050.
- **Propuesta:** Declarar este efecto como posible explicación de la diferencia con la AIReF y como sesgo optimista en el gasto en pensiones. Si el supuesto es de composición, aplicar el salario menor solo a las entradas extra de 2027–2030, por ejemplo con un factor de salario en esas cohortes. Así las pensiones y bases de quien ya trabajaba no bajan.

### 59. En 2027–2030 la base máxima de cotización se actualiza con la inflación del escenario, no con la de la AIReF que usa el resto del motor

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/current-policy-v5.js:43; D:/DATOS/Demarquia/pensioneslabs3/src/model-current-v10.js:155, :127, :182-184
- **Evidencia:** baseResponse(year, config) recibe la configuración sin pasar por annualConfig. Su `prior[y - 1] ?? config.inflationRate` toma el 2 % en 2028–2031. Mientras, nominalWageIndex usa priceIndex con 2,6 / 2,3 / 2,1 / 2,0 %. Con la política v7 aislada y el salario real plano, la base máxima queda un 0,96 % más baja para siempre. El tipo total de cotización baja de 0,21352 a 0,21334 en 2030 y de 0,21922 a 0,21914 en 2050 (unos −0,007 puntos de PIB). Las pensiones en pago, en cambio, se revalorizan con la inflación del mismo año.
- **Propuesta:** Pasar a policy.baseResponse y contributionRates la tasa de inflación de cada año, por ejemplo con priorYearInflationRates desde SHORT_RUN_EMPLOYMENT.inflation cuando la opción está encendida, o llamándolas con annualConfig. Así la base máxima sigue los mismos precios que los salarios.

### 60. Los textos del motor siguen diciendo que los impuestos sin modelo propio se quedan fijos en euros reales, pero desde la 1.67 crecen con el PIB por defecto

- **Gravedad:** bajo; **tipo:** incoherencia; **votos que lo sostienen:** 3 de 3.
- **Dónde:** D:/DATOS/Demarquia/pensioneslabs3/src/revenue-bases-v10.js:95; D:/DATOS/Demarquia/pensioneslabs3/src/fiscal-composition-v10.js:80, :130
- **Evidencia:** revenue-bases-v10.js:95: «held in real euros (0, the default)». fiscal-composition-v10.js:80, dentro de las assumptions exportadas (CURRENT_ASSUMPTIONS): «unmodeled taxes hold real levels». fiscal-composition-v10.js:130 usa `config.unmodeledTaxesFollowGDP ?? 0`. Pero config-current-v10.js:105 fija unmodeledTaxesFollowGDP: 1. El supuesto pesa mucho: fijos, se rompe en 2045 y la deuda de 2070 sube al 251,3 %, frente al 197,8 %.
- **Propuesta:** Corregir el comentario (1 es el defecto) y el texto de assumptions.income («unmodeled taxes follow nominal GDP by default; held in real euros as an option»). Cambiar también el `?? 0` por `?? 1`, o quitarlo, para que coincida con el defecto.

## Hallazgo del crítico final

### C1. Con el estilo «Deuda Pública Cautiva», una quita de deuda solo alcanza al 15 % del fondo, como en una cartera global

- **Gravedad:** medio; **tipo:** incoherencia.
- **Dónde:** src/creditor-fund-loss.js:10,33-43; src/config-current-v9.js:14,80-81; src/progressive-transition.js:616-633,675-679; src/shared/excel-models-io.js:1619; docs/modelo/04-deuda-veredicto.md:232,252
- **Evidencia:** El texto del estilo dice que «Obliga al fondo a comprar bonos del propio Estado» (progressive-transition.js:678). Pero applyCreditorFundLoss toma la exposición a la deuda pública solo de policy.fundedSovereignShare. Ese valor vale DEFAULT_FUNDED_SOVEREIGN_SHARE = .15 (config-current-v9.js:14) y no depende de capitalizationStyle. Ningún archivo de src/ relaciona 'sovereign-captive' con la exposición soberana. Lo medí con DEFAULT_CONFIG más system 'mixed', transitionMode 'linear-ramp' y una quita en 2045 (haircut 0,3, 20 años, 3 %), sin fijar fundedSovereignShare. Con sovereign-captive: fondo al empezar 791,8 mil M, pérdida 39,8 mil M, es decir el 5,03 % del fondo, con effectiveShare 0,150. Con balanced-standard: fondo 869,2 mil M, pérdida 43,7 mil M, el mismo 5,03 %, effectiveShare 0,150. Deuda condonada: 951,0 frente a 950,4 mil M. Por tanto, un fondo obligado a tener bonos del Estado pierde en una reestructuración la misma parte que una cartera global. Las identidades contables (fondo, deuda, caja, añadas) sí cuadran en los dos casos.
- **Propuesta:** Con capitalizationStyle 'sovereign-captive', tomar por defecto fundedSovereignShare = 1, o un valor documentado cercano a 1, cuando la fila de quita no lo fije. La consola debería avisarlo. Añadir una prueba: con el estilo cautivo y la misma quita, la pérdida del fondo como parte de sus activos debe ser mayor que con balanced-standard. Explicarlo en docs/modelo/04-deuda-veredicto.md:252.

## Refutados en la verificación

- [Opciones nuevas (1.67–1.69)] Con la edad congelada, el devengo reducido 1/(43+subida) no tiene en cuenta que las palancas de edad ya retrasan la salida
- [Documentación frente a código] Las cifras de la edad congelada en el modelo 01 mezclan bases y siguen diciendo «con las reglas de hoy»
- [Pruebas] Fecha de ruptura del reparto (2050/2051/2054) apoyada en márgenes de 0,16 puntos de PIB
- [Pruebas] Mezclas: el residuo de asignación de la aportación y el del fondo solo se comprueban con pension-runoff + common-fund; los otros 6 modos de transición no tienen test
- [Pruebas] La comprobación de referencias del paquete Sites no tiene ningún test
- [Páginas y herramientas] «Reglas de hoy» promete volver a la configuración de partida, pero conserva los límites propios y se desactiva sin mirarlos
- [Verosimilitud económica] La opción AIReF a corto plazo rebaja el salario nominal de 2027 por debajo del publicado y baja para siempre el peso de los salarios en el PIB
- [Verosimilitud económica] El defecto suma el premio del 4 % a una tasa de sustitución que, según el propio proyecto, ya cuenta el retraso, y el catálogo no lo avisa
