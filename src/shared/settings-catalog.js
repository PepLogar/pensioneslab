// The one catalogue of settings (docs/PROPUESTA-ORDEN-AJUSTES-2026-11-10.md): every key of the
// scenario (DEFAULT_CONFIG) in one chapter, with one name. The order follows the account the
// simulator keeps: a system pays pensions with income; what is missing is debt; it all happens
// in a world nobody decides; and there is a yardstick to say whether it holds.
// «Ajustes de tu escenario» (src/shared/settings-panel.js) draws it. Pure data: a test keeps
// every key of DEFAULT_CONFIG here, so a new setting cannot be left without a place.

export const SETTINGS_PARTS = Object.freeze({
  decisions: 'Decisiones',
  assumptions: 'Lo que nadie decide',
  yardstick: 'Cómo se juzga'
});

export const SETTINGS_CHAPTERS = Object.freeze([
  { id: 'system', title: 'El sistema', part: 'decisions', question: '¿Qué sistema de pensiones, y cómo se llega a él?' },
  { id: 'pensions', title: 'Las pensiones', part: 'decisions', question: '¿Quién cobra, desde cuándo y cuánto?' },
  { id: 'income', title: 'Los ingresos', part: 'decisions', question: '¿Quién paga?' },
  { id: 'debt', title: 'La deuda y las crisis', part: 'decisions', question: '¿Qué pasa con lo que falta? Se pide prestado, y a un precio.' },
  { id: 'world', title: 'El mundo', part: 'assumptions', question: 'Lo que puede pasar: población, economía e IA. Mueve todos los sistemas a la vez.' },
  { id: 'model', title: 'Cómo responde la economía', part: 'assumptions', question: 'Lo que el simulador supone cuando se sube un impuesto, se recorta o se retrasa la edad.' },
  { id: 'yardstick', title: 'La vara de medir', part: 'yardstick', question: '¿Cuándo decimos «se rompe»?' }
].map((chapter, index) => Object.freeze({ ...chapter, number: index + 1 })));

const B = 'basic', E = 'expert';
// Generic controls: `range` is [min, max, step] as the reader sees it; the stored value is that
// divided by `scale`. `flag`: a switch stored as 1 or 0. `custom`: the panel has its own rule.
// `at`: moved in another page. `fixed`: starting data, without a control (`note` says why, when it is not data).
const pct = (min, max, step, unit = '%') => ({ range: [min, max, step], scale: 100, unit });
const num = (min, max, step, unit = '') => ({ range: [min, max, step], scale: 1, unit });
const flag = { flag: true };
const custom = { custom: true };

// What each setting moves, in one plain sentence or two (U7, #26): the tooltip of its name in the expert page,
// in Ajustar of «Simular año a año» and in ⚙ Ajustes. One place for the three; a test keeps one for every control.
const SETTING_HELP = Object.freeze({
  // 1 · El sistema
  system: 'Cómo se pagan las pensiones desde 2027. Lo ganado hasta 2026 se respeta.',
  feeRate: 'Lo que cobra cada año quien gestiona el fondo. Se descuenta de lo que rinde. El fondo común del Mixto progresivo cobra como mucho 0,15 %.',
  fundedExtraContribution: 'Puntos de salario que se pagan además de la cotización de hoy y van a una cuenta invertida a tu nombre. No pagan el reparto.',
  ndcPhaseIn: 'Encendido, las cuentas nocionales entran poco a poco, por año de nacimiento. Apagado, valen para todos desde 2027.',
  ndcPhaseInFirstCohort: 'Año de nacimiento de la primera generación con parte nocional. La propuesta del Instituto de Actuarios empieza en 1971.',
  ndcPhaseInYears: 'Cuántas generaciones tarda la cuenta nocional en ser completa. Con 20, cada generación tiene un 5 % más.',
  ndcAnnuityNorm: 'Con 0, la pensión empieza más baja y sube más cada año; con más, empieza más alta y sube menos.',
  ndcInheritanceGains: 'Encendido, el saldo de quien muere antes de jubilarse pasa a los demás de su generación, como en Suecia.',
  ndcBalancing: 'Encendido, si un año se pagan más pensiones nocionales de lo que entra, las cuentas crecen menos. No actúa antes de 2070, salvo si conviertes los años ya cotizados.',
  ndcPastRights: 'Encendido, lo que cada trabajador lleva ganado hasta 2026 pasa en 2027 a su cuenta nocional. Las pensiones que ya se cobran no cambian.',
  ndcPastRightsValue: 'Con 0, la cuenta se abre con lo cotizado; con 1, con lo necesario para la pensión ya ganada.',
  ndcPastRightsAgeFull: 'Quien tiene esta edad o menos en 2027 pasa toda su carrera a la cuenta nocional.',
  ndcPastRightsAgeNone: 'Desde esta edad en 2027 no se convierte nada. Entre las dos edades se convierte una parte que baja.',
  pointsSystem: 'Encendido, la pensión de reparto se gana en puntos, uno por cada año con el salario medio. Lo ganado antes de 2027 no cambia.',
  pointsSustainabilityFactor: 'Cuánto frena el valor del punto cuando hay más pensionistas por cotizante. Con 0, nada; la ley alemana usa 0,25.',
  // 2 · Las pensiones
  retirementAge: 'Edad de jubilación desde 2027. Con 65, la gente parte de las edades de jubilación de 2026, que la senda del Ageing Report retrasa por defecto.',
  retirementAgeStepYears: 'Con 0, la edad nueva vale para todos desde 2027. Con 4, sube un año cada cuatro.',
  retirementAgeLink: 'La edad sube con la esperanza de vida a los 65: un tercio, dos tercios o lo mismo que ella.',
  replacementRate: 'Primera pensión de reparto frente al último sueldo, para los derechos nuevos. Lo ya ganado no cambia.',
  pensionRevaluationRate: 'Cuánto suben cada año las pensiones que ya se cobran, frente a los precios (el IPC).',
  retirementAgeLinkHealthy: 'Encendido, la edad sube solo con los años de vida que se viven con salud, no con todos.',
  exitPathNoExtraPension: 'Solo con la senda del Ageing Report. Apagado, cada año que la senda añade desde la edad legal suma el premio por demora (4 %), como en la ley y en la AIReF. Encendido, no suma nada, como en el Ageing Report: su pensión de entrada ya cuenta con esa edad.',
  retirementAgeExitPath: 'Encendido, el defecto desde la 1.68, la gente se jubila cada vez más tarde, como prevén el Ageing Report de 2024 y la AIReF. Quien cumple 65 desde 2040 se jubila de media 1,4 años más tarde que en 2026. Apagado, todos se jubilan a las edades de 2026. Esta subida no es un retraso forzoso: nadie se queda sin empleo por ella.',
  // 3 · Los ingresos
  contributionRate: 'Sube la cotización que va a pensiones, en puntos del salario.',
  retaReform2032: 'La ley hace cotizar a los autónomos por lo que ganan de verdad desde 2032, pero las cuotas de 2027 a 2031 aún no están fijadas. Encendido, el defecto desde la 1.71, entra lo que falta según la AIReF: casi cuatro décimas de PIB más (0,38 puntos), poco a poco de 2027 a 2032. Apagado, sus bases siguen a los salarios desde 2026.',
  irpfSurcharge: 'Recauda más IRPF: con +10 %, 10 € más por cada 100 € que se pagan hoy.',
  vatSurcharge: 'Recauda más IVA: con +10 %, 10 € más por cada 100 € que se pagan hoy.',
  otherTaxSurcharge: 'Recauda más con los demás impuestos, sin contar IVA, IRPF ni Sociedades.',
  paymentAdjustments: 'Recorta el resto del gasto público desde 2027. Lo ahorrado baja lo que hay que pedir prestado.',
  closingClause: 'Ley desde 2023: si el gasto neto en pensiones pasa del 13,3 % del PIB, sube el MEI, una cotización.',
  pensionBudgetShare: 'De los demás ingresos públicos, la parte que va a pensiones. No crea dinero nuevo.',
  taxRevenueGDP: 'Escala los demás ingresos públicos desde su nivel de 2026. No fija qué parte del PIB recaudan después.',
  // 4 · La deuda y las crisis
  newDebtTermYears: 'Años hasta que vence cada préstamo nuevo del Estado. El interés cambia con el plazo.',
  realInterestRate: 'Lo que paga el Estado por pedir prestado, descontada la inflación.',
  riskDebtThreshold: 'Por encima de esta deuda, cada préstamo nuevo sale más caro. Es un supuesto, no un umbral oficial.',
  riskPremiumAt10pp: 'Cuánto sube el interés por cada 10 puntos de deuda sobre esa referencia. Con 0, la deuda no encarece el interés.',
  riskPremiumCap: 'Lo más que puede sumar esa subida del interés. No asegura que alguien preste.',
  stressPremium: 'Encendida, la deuda nueva paga un recargo extra tras un año de riesgo alto. Se retira con el rescate.',
  stressPremiumRate: 'Puntos de interés de más que paga la deuda nueva en la crisis. España pagó unos 3,4 en 2011–2013.',
  narrativeMilestones: 'Apagado, solo se ven el riesgo y si la pensión es suficiente.',
  narrativeBailoutYears: 'Años seguidos de riesgo alto, con la deuda sin estabilizarse, hasta pedir un rescate. Es un supuesto.',
  narrativeRestructuringYears: 'Años más de riesgo alto tras el rescate hasta una quita de la deuda. Es un supuesto.',
  narrativeNoRescue: 'Encendido, nadie rescata al Estado y al año siguiente deja de poder pagar.',
  payablePensionFreezeYears: 'Años que se congela la pensión pagable desde el rescate. Solo se enseña: no cambia las cuentas.',
  payablePensionCut: 'Lo que se recorta la pensión pagable desde la quita. Solo se enseña: no cambia las cuentas.',
  // 5 · El mundo
  targetFertility: 'Hijos por mujer desde 2027. La referencia oficial (EUROPOP2025) pasa de 1,11 en 2026 a 1,30 en 2070.',
  airefShortRunEmployment: 'Encendido, el defecto desde la 1.69, de 2027 a 2030 la economía va como prevé la AIReF. El empleo crece entre el 1,9 y el 1,5 % al año, por la inmigración; esa gente se queda, cotiza y se jubila después. Produce algo menos, así que el PIB real crece como el suyo. Los precios suben como los suyos, entre el 2,6 y el 2,0 %. Esas cifras salen con los demás ajustes de partida; tus palancas las mueven. Con la edad congelada, el empleo crece unos 0,2 puntos menos al año. Con la población EUROPOP2023, crece solo entre el 0,9 y el 1,3 %. Apagado, el empleo del Ageing Report y la inflación del escenario.',
  europop2023: 'Apagado, la población de Eurostat de 2025 (EUROPOP2025), la más reciente. Encendido, la de 2023 (EUROPOP2023), con la que se hizo el Ageing Report de 2024: en 2050 tiene un 10 % menos de personas de 20 a 64 años. No llega más allá de 2070.',
  entrantGrowth: 'Cambia cada año las nuevas incorporaciones al empleo, jóvenes y llegados de fuera, frente a la referencia.',
  longevityGain: 'Vidas más largas que en la referencia, por nuevos tratamientos. Con 0, la mortalidad prevista.',
  ageingCareSpending: 'Encendido, la sanidad y la dependencia cuestan más a medida que la población envejece (Ageing Report 2024).',
  productivityGrowth: 'Cuánto más, o menos, crece cada año lo que produce una hora de trabajo, frente a la referencia.',
  realReturn: 'Lo que rinden al año los fondos, descontada la inflación y antes de comisiones.',
  aiAutomationShare: 'Parte de las horas de trabajo que hace la IA. No es la parte de empleos perdidos.',
  realWageGrowth: 'Cuánto más, o menos, crece cada año el salario real, aparte de la productividad. Con 0, la senda de partida.',
  healthyLifeShare: 'De los años de vida ganados, la parte que se vive con salud. Mueve el gasto en sanidad y dependencia. Con la edad ligada a la salud, mueve también la edad de jubilación.',
  inflationRate: 'Subida anual de los precios desde 2031 (de 2027 a 2030, la que prevé la AIReF, si está encendido «Empleo e inflación hasta 2030 como prevé la AIReF»; si no, desde 2027). Mueve la subida de las pensiones con el IPC.',
  marketShock: 'Una caída de lo que rinden los fondos en 2035, una sola vez. No cambia el PIB.',
  robotAutomationShare: 'Parte de las horas de trabajo que hacen los robots, además de la IA.',
  automationTargetYear: 'Año en que la IA y los robots llegan a esa parte del trabajo. Desde 2027 avanzan poco a poco.',
  automationWagePassThrough: 'De lo que gana la producción con la IA, la parte que llega al salario. Con 0 %, nada.',
  reemploymentWageLoss: 'Lo que pierde de salario quien se recoloca tras perder su trabajo por la IA.',
  displacementSupportRate: 'Ayuda pública, en % del salario perdido, a quien la IA deja sin trabajo y no se recoloca. No da derechos de pensión.',
  paradigmRevenueScale: 'Recaudación nueva sobre lo que producen la IA y los robots. Con 1, lo que prevé el régimen elegido; con 0, nada.',
  paradigmSupportScale: 'Parte del subsidio a quien pierde el trabajo que no paga el Estado. Con 1, lo que prevé el régimen elegido; con 0, nada.',
  paradigmReturnScale: 'Rentabilidad extra de los fondos gracias a la IA. Con 1, lo que prevé el régimen elegido; con 0, nada.',
  paradigmOutputScale: 'Producción extra, o perdida, frente a una economía de nóminas. Con 1, lo que prevé el régimen elegido; con 0, nada.',
  paradigmAdminScale: 'Ahorro por automatizar la Administración. Con 1, lo que prevé el régimen elegido; con 0, nada.',
  paradigmDividendScale: 'Dividendo ciudadano que cuenta como renta de los jubilados. Con 1, lo que prevé el régimen elegido; con 0, nada.',
  // 6 · Cómo responde la economía
  lafferSelfFinancing: 'De cada 100 € que debería dar una subida de impuestos al trabajo, los que no llegan porque se trabaja y se declara menos.',
  lafferFullResponse: 'Encendido, las horas que se dejan de trabajar por los impuestos bajan también cotizaciones, derechos y PIB. Apagado, solo se pierde recaudación.',
  lafferVatResponse: 'Encendido, un IVA más alto también hace trabajar menos horas, como un impuesto al trabajo.',
  unmodeledTaxesFollowGDP: 'Los impuestos sin modelo propio (patrimonio, transmisiones y otros, unos 57.000 M€ en 2026). Encendido, el defecto, crecen con el PIB, como supone la AIReF. Apagado, se quedan fijos en euros de 2026 y pierden peso en el PIB.',
  lafferAdjustYears: 'Años que tarda la respuesta a los impuestos en ser completa. Crece en línea recta desde 2027.',
  retirementDelayEmployment: 'De quienes se habrían jubilado, la parte que sigue con empleo. El resto cobra un subsidio hasta la edad nueva.',
  cutMultiplierCalm: 'PIB que se pierde el año del recorte por cada euro recortado, en tiempos tranquilos. El Banco de España da 0,6.',
  cutMultiplierStress: 'Lo mismo tras un año de riesgo alto. El Banco de España da 1,4 en tiempos turbulentos.',
  publicCapitalElasticity: 'Cuánto baja la economía a largo plazo al recortar inversión pública. Con 0, nada; 0,122 según Bom y Ligthart (2014).',
  cutInvestmentShare: 'De un recorte de otro gasto, cuánto cae sobre la inversión pública. Con 100 %, la misma parte; con 0 %, nada.',
  // 7 · La vara de medir
  riskHighIndex: 'Desde este valor del índice de aviso europeo (S0), de 0 a 1, el riesgo es alto. La Comisión usa 0,36.',
  riskModerateIndex: 'Desde este valor del índice, de 0 a 1, el riesgo es moderado. 0,29 es el 80 % del umbral alto.',
  riskSustainYears: 'Años seguidos de riesgo alto que hacen falta para decir «se rompe». Es un supuesto.',
  riskStabilisationYears: 'Años seguidos en que la deuda sube sin que las cuentas la frenen, para decir que no se estabiliza.',
  pensionAdequacyFloor: 'Pensión media mínima, en % del salario medio, para llamarla suficiente. La OIT pide un 40 %.',
  crisisFundBackingWeight: 'Parte del fondo que se resta de la deuda al medir el riesgo. No cambia la deuda.'
});

export const SETTINGS_CATALOG = Object.freeze([
  // 1 · El sistema
  { key: 'system', chapter: 'system', level: B, name: 'Sistema de pensiones', ...custom },
  { key: 'transitionCutoffAge', chapter: 'system', level: B, name: 'Cambio a un fondo: edad de corte', at: 'mixto', unit: 'años' },
  { key: 'transitionYears', chapter: 'system', level: B, name: 'Cambio a un fondo: años que dura', at: 'mixto', unit: 'años' },
  { key: 'transitionTargetFunded', chapter: 'system', level: B, name: 'Cambio a un fondo: parte de la cuota que acaba en el fondo', at: 'mixto', scale: 100, unit: '%' },
  { key: 'capitalizationStyle', chapter: 'system', level: B, name: 'Dónde se invierte el fondo', at: 'mixto' },
  { key: 'mix', chapter: 'system', level: E, name: 'Reparto de la cuota entre reparto, nocionales y fondo', at: 'lab' },
  { key: 'transitionMode', chapter: 'system', level: E, name: 'Cambio a un fondo: cómo se hace', at: 'mixto' },
  { key: 'transitionNdcShare', chapter: 'system', level: E, name: 'Cambio a un fondo: parte pública nocional o de reparto', at: 'mixto', scale: 100, unit: '%' },
  { key: 'transitionRelaySchedule', chapter: 'system', level: E, name: 'Cambio a un fondo: calendario del doble relevo', at: 'mixto' },
  { key: 'transitionPublicPillar', chapter: 'system', level: E, name: 'Cambio a un fondo: parte pública durante la transición', fixed: true },
  { key: 'feeRate', chapter: 'system', level: E, name: 'Comisión de gestión del fondo', ...pct(0, 2, 0.1, '% al año') },
  { key: 'fundedExtraContribution', chapter: 'system', level: E, name: 'Cotización adicional a una cuenta propia', ...pct(0, 10, 0.5, 'puntos de salario') },
  { key: 'ndcPhaseIn', chapter: 'system', level: E, name: 'Cuentas nocionales: entrada por generaciones', ...flag },
  { key: 'ndcPhaseInFirstCohort', chapter: 'system', level: E, name: 'Cuentas nocionales: primera generación (año de nacimiento)', ...num(1940, 2010, 1) },
  { key: 'ndcPhaseInYears', chapter: 'system', level: E, name: 'Cuentas nocionales: generaciones hasta la cuenta completa', ...num(1, 40, 1, 'generaciones') },
  { key: 'ndcAnnuityNorm', chapter: 'system', level: E, name: 'Cuentas nocionales: interés de la renta', ...pct(0, 3, 0.1, '% al año') },
  { key: 'ndcInheritanceGains', chapter: 'system', level: E, name: 'Cuentas nocionales: herencia entre supervivientes', ...flag },
  { key: 'ndcBalancing', chapter: 'system', level: E, name: 'Cuentas nocionales: freno automático (como Suecia)', ...flag },
  { key: 'ndcPastRights', chapter: 'system', level: E, name: 'Cuentas nocionales también para los años ya cotizados', ...flag },
  { key: 'ndcPastRightsValue', chapter: 'system', level: E, name: 'Cuentas nocionales: valor del saldo inicial (0, lo cotizado; 1, lo ganado)', ...num(0, 1, 0.05) },
  { key: 'ndcPastRightsAgeFull', chapter: 'system', level: E, name: 'Cuentas nocionales: edad hasta la que se convierte todo', ...num(18, 75, 1, 'años') },
  { key: 'ndcPastRightsAgeNone', chapter: 'system', level: E, name: 'Cuentas nocionales: edad desde la que no se convierte nada', ...num(18, 75, 1, 'años') },
  { key: 'pointsSystem', chapter: 'system', level: E, name: 'Sistema de puntos (como Alemania)', ...flag },
  { key: 'pointsSustainabilityFactor', chapter: 'system', level: E, name: 'Sistema de puntos: factor de sostenibilidad', ...num(0, 1, 0.05) },

  // 2 · Las pensiones
  { key: 'retirementAge', chapter: 'pensions', level: B, name: 'Edad de jubilación', ...custom },
  { key: 'retirementAgeStepYears', chapter: 'pensions', level: B, name: 'La edad sube: de golpe o por tramos', ...custom },
  { key: 'retirementAgeLink', chapter: 'pensions', level: B, name: 'Edad ligada a la esperanza de vida', ...custom },
  { key: 'replacementRate', chapter: 'pensions', level: B, name: 'Primera pensión frente al último sueldo', ...custom },
  { key: 'pensionRevaluationRate', also: ['pensionRevaluationMode'], chapter: 'pensions', level: B, name: 'Subida anual de las pensiones', ...custom },
  { key: 'retirementAgeLinkHealthy', chapter: 'pensions', level: E, name: 'Edad ligada solo a los años con salud', ...flag },
  { key: 'retirementAgeExitPath', chapter: 'pensions', level: E, name: 'La edad efectiva sigue la senda del Ageing Report', ...flag },
  { key: 'exitPathNoExtraPension', chapter: 'pensions', level: E, name: 'Con la senda, los años de más no suben la pensión', ...flag },
  { key: 'retirementAgeCap', chapter: 'pensions', level: E, name: 'Tope de la edad ligada a la esperanza de vida', at: 'experimentos', unit: 'años' },

  // 3 · Los ingresos
  { key: 'contributionRate', chapter: 'income', level: B, name: 'Cotización para pensiones', ...custom },
  { key: 'retaReform2032', chapter: 'income', level: E, name: 'Los autónomos cotizan por sus ingresos reales desde 2032', ...flag },
  { key: 'irpfSurcharge', chapter: 'income', level: B, name: 'Recargo del IRPF', ...custom },
  { key: 'vatSurcharge', chapter: 'income', level: B, name: 'Recargo del IVA', ...custom },
  { key: 'otherTaxSurcharge', chapter: 'income', level: B, name: 'Recargo de los demás impuestos', ...custom },
  { key: 'paymentAdjustments', chapter: 'income', level: B, name: 'Recortar otros gastos públicos', ...custom },
  { key: 'closingClause', also: ['closingClauseAnySystem'], chapter: 'income', level: B, name: 'Freno de 2023 (sube el MEI)', ...custom },
  { key: 'pensionBudgetShare', chapter: 'income', level: E, name: 'Parte de los demás ingresos que va a pensiones', ...pct(0, 100, 1) },
  // From 5 %: with no other income at all the simulator cannot describe the budget (same review, C).
  { key: 'taxRevenueGDP', chapter: 'income', level: E, name: 'Nivel de los demás ingresos públicos', ...pct(5, 60, 0.5, '% del PIB de partida') },

  // 4 · La deuda y las crisis
  { key: 'initialDebtGDP', chapter: 'debt', level: E, name: 'Deuda pública de partida', fixed: true, scale: 100, unit: '% del PIB' },
  { key: 'newDebtTermYears', chapter: 'debt', level: E, name: 'Plazo de la deuda nueva', ...num(2, 30, 1, 'años') },
  { key: 'realInterestRate', chapter: 'debt', level: E, name: 'Interés real de la deuda', ...pct(-2, 6, 0.1, '% al año') },
  { key: 'riskModel', chapter: 'debt', level: E, name: 'Cómo sube el interés con la deuda', at: 'lab' },
  { key: 'riskDebtThreshold', chapter: 'debt', level: E, name: 'Deuda desde la que sube el interés', ...pct(60, 200, 1, '% del PIB') },
  { key: 'riskPremiumAt10pp', chapter: 'debt', level: E, name: 'Cuánto sube el interés por cada 10 puntos de deuda', ...pct(0, 1, 0.01, 'puntos') },
  { key: 'riskPremiumCap', chapter: 'debt', level: E, name: 'Techo de esa subida del interés', ...pct(0, 30, 0.5, 'puntos') },
  { key: 'stressPremium', chapter: 'debt', level: E, name: 'Prima de riesgo por crisis, tras un año de riesgo alto', ...flag },
  { key: 'stressPremiumRate', chapter: 'debt', level: E, name: 'Tamaño de la prima de riesgo por crisis', ...pct(0, 10, 0.25, 'puntos') },
  { key: 'fiscalRescues', chapter: 'debt', level: E, name: 'Rescates', at: 'lab' },
  { key: 'debtRestructurings', chapter: 'debt', level: E, name: 'Quitas de deuda', at: 'lab' },
  { key: 'narrativeMilestones', chapter: 'debt', level: E, name: 'Enseñar rescate, quita e impago', ...flag },
  { key: 'narrativeBailoutYears', chapter: 'debt', level: E, name: 'Rescate tras estos años seguidos de riesgo alto', ...num(1, 10, 1, 'años') },
  { key: 'narrativeRestructuringYears', chapter: 'debt', level: E, name: 'Quita tras estos años más de riesgo alto', ...num(1, 15, 1, 'años') },
  { key: 'narrativeNoRescue', chapter: 'debt', level: E, name: 'Camino sin rescate', ...flag },
  { key: 'payablePensionFreezeYears', chapter: 'debt', level: E, name: 'Pensión pagable: años de congelación desde el rescate', ...num(0, 10, 1, 'años') },
  { key: 'payablePensionCut', chapter: 'debt', level: E, name: 'Pensión pagable: recorte desde la quita', ...pct(0, 50, 1) },

  // 5 · El mundo
  { key: 'targetFertility', chapter: 'world', level: B, name: 'Hijos por mujer', ...custom },
  { key: 'europop2023', chapter: 'world', level: E, name: 'Población del Ageing Report (EUROPOP2023)', ...flag },
  { key: 'entrantGrowth', chapter: 'world', level: B, name: 'Inmigración y nuevas incorporaciones al empleo', ...custom },
  { key: 'airefShortRunEmployment', chapter: 'world', level: E, name: 'Empleo e inflación hasta 2030 como prevé la AIReF', ...flag },
  { key: 'longevityGain', chapter: 'world', level: B, name: 'Vidas más largas (nuevos tratamientos)', ...custom },
  { key: 'ageingCareSpending', chapter: 'world', level: B, name: 'Sanidad y dependencia crecen con el envejecimiento', ...custom },
  { key: 'productivityGrowth', chapter: 'world', level: B, name: 'Productividad y salarios', ...custom },
  { key: 'realReturn', chapter: 'world', level: B, name: 'Rentabilidad real de los fondos', ...custom },
  { key: 'aiAutomationShare', chapter: 'world', level: B, name: 'Trabajo que hace la IA', ...custom },
  { key: 'automationRegime', chapter: 'world', level: B, name: 'IA: reglas para financiar la automatización', at: 'ia' },
  { key: 'automationRedeployment', chapter: 'world', level: B, name: 'IA: trabajo desplazado que se recoloca', at: 'ia', scale: 100, unit: '%' },
  { key: 'automationProductivityGain', chapter: 'world', level: B, name: 'IA: productividad que gana la automatización', at: 'ia', scale: 100, unit: '%' },
  // Up to +1,5: from about +1,7 points a year above productivity the pay passes the income of GDP (audit 1.85, 2).
  { key: 'realWageGrowth', chapter: 'world', level: E, name: 'Salarios, por separado de la productividad', ...pct(-2, 1.5, 0.1, 'puntos al año') },
  { key: 'healthyLifeShare', chapter: 'world', level: E, name: 'Parte de los años ganados que se viven con salud', ...pct(0, 100, 5) },
  { key: 'inflationRate', chapter: 'world', level: E, name: 'Inflación', ...pct(0, 10, 0.1, '% al año') },
  { key: 'marketShock', chapter: 'world', level: E, name: 'Caída del mercado en 2035', ...pct(-50, 0, 1, 'puntos') },
  { key: 'robotAutomationShare', chapter: 'world', level: E, name: 'Trabajo que hacen los robots', ...pct(0, 45, 5, '% de las horas') },
  { key: 'publicAdminAutomationShare', chapter: 'world', level: E, name: 'IA: Administración pública automatizada', at: 'ia', scale: 100, unit: '%' },
  { key: 'automationTargetYear', chapter: 'world', level: E, name: 'IA: año en que se alcanza esa automatización', ...num(2027, 2070, 1) },
  { key: 'automationWagePassThrough', chapter: 'world', level: E, name: 'IA: parte de la ganancia que llega al salario', ...pct(0, 100, 5) },
  { key: 'reemploymentWageLoss', chapter: 'world', level: E, name: 'IA: pérdida de salario al recolocarse', ...pct(0, 30, 1) },
  { key: 'displacementSupportRate', chapter: 'world', level: E, name: 'IA: ayuda pública a quien no se recoloca', ...pct(0, 100, 5) },
  { key: 'paradigmRevenueScale', chapter: 'world', level: E, name: 'Régimen de IA: recaudación nueva sobre lo automatizado', ...num(0, 1.5, 0.05) },
  { key: 'paradigmSupportScale', chapter: 'world', level: E, name: 'Régimen de IA: subsidio que no paga el Estado', ...num(0, 1.5, 0.05) },
  { key: 'paradigmReturnScale', chapter: 'world', level: E, name: 'Régimen de IA: rentabilidad extra del capital', ...num(0, 1.5, 0.05) },
  { key: 'paradigmOutputScale', chapter: 'world', level: E, name: 'Régimen de IA: producción extra', ...num(0, 1.5, 0.05) },
  { key: 'paradigmAdminScale', chapter: 'world', level: E, name: 'Régimen de IA: ahorro en la Administración', ...num(0, 1.5, 0.05) },
  { key: 'paradigmDividendScale', chapter: 'world', level: E, name: 'Régimen de IA: dividendo ciudadano', ...num(0, 1.5, 0.05) },

  // 6 · Cómo responde la economía
  { key: 'lafferSelfFinancing', chapter: 'model', level: E, name: 'Lo que se pierde al subir impuestos al trabajo', ...pct(0, 90, 1) },
  { key: 'lafferFullResponse', chapter: 'model', level: E, name: 'Las horas perdidas bajan también cotizaciones, derechos y PIB', ...flag },
  { key: 'lafferVatResponse', chapter: 'model', level: E, name: 'El IVA también baja las horas', ...flag },
  { key: 'unmodeledTaxesFollowGDP', chapter: 'model', level: E, name: 'Los impuestos sin modelo propio crecen con el PIB', ...flag },
  { key: 'lafferAdjustYears', chapter: 'model', level: E, name: 'Años hasta la respuesta completa a los impuestos', ...num(1, 40, 1, 'años') },
  // The engine stopped reading it when the hours took over the whole response: a switch here moved nothing.
  { key: 'lafferOutputResponse', chapter: 'model', level: E, name: 'La respuesta a los impuestos baja también la producción', fixed: true, note: 'Sin efecto: el simulador ya no lo usa.' },
  // Not a free bar: moved alone it took away points nobody had raised, and the debt fell for nothing.
  { key: 'lafferExemptContribution', chapter: 'model', level: E, name: 'Cotización que queda fuera de esa respuesta', at: 'fraude', scale: 100, unit: 'puntos' },
  { key: 'retirementDelayEmployment', chapter: 'model', level: E, name: 'Quién sigue trabajando al retrasar la jubilación', ...pct(40, 100, 5) },
  { key: 'cutMultiplierCalm', chapter: 'model', level: E, name: 'Lo que frena un recorte, en calma (€ de PIB por € recortado)', ...num(0, 3, 0.05) },
  { key: 'cutMultiplierStress', chapter: 'model', level: E, name: 'Lo que frena un recorte, con riesgo alto', ...num(0, 3, 0.05) },
  { key: 'publicCapitalElasticity', chapter: 'model', level: E, name: 'Lo que cuesta a largo plazo recortar inversión pública', ...num(0, 0.2, 0.001) },
  { key: 'cutInvestmentShare', chapter: 'model', level: E, name: 'Parte del recorte que cae sobre la inversión', ...pct(0, 300, 5) },

  // 7 · La vara de medir
  { key: 'riskHighIndex', chapter: 'yardstick', level: E, name: 'Riesgo alto: índice del S0 desde', ...num(0.05, 1, 0.01) },
  { key: 'riskModerateIndex', chapter: 'yardstick', level: E, name: 'Riesgo moderado: índice desde', ...num(0.05, 1, 0.01) },
  { key: 'riskSustainYears', chapter: 'yardstick', level: E, name: 'Años seguidos de riesgo alto para decir «se rompe»', ...num(1, 10, 1, 'años') },
  { key: 'riskStabilisationYears', chapter: 'yardstick', level: E, name: 'Años seguidos para decir que la deuda no se estabiliza', ...num(1, 15, 1, 'años') },
  { key: 'pensionAdequacyFloor', chapter: 'yardstick', level: E, name: 'Pensión mínima suficiente', ...pct(20, 70, 1, '% del salario medio') },
  { key: 'crisisFundBackingWeight', chapter: 'yardstick', level: E, name: 'Cuánto cuenta el fondo como respaldo de la deuda', ...pct(0, 72, 1, '% del fondo') }
].map(entry => Object.freeze(SETTING_HELP[entry.key] ? { ...entry, help: SETTING_HELP[entry.key] } : entry)));

// What an expert setting waits for (same review, A): it answers to a decision, and changes nothing until the
// decision is taken. The words and the test of each one are in src/shared/setting-needs.js; a slow test moves
// every waiting setting with the engine (tests/setting-needs-engine.test.mjs).
export const SETTING_NEEDS = Object.freeze({
  retirementAgeLinkHealthy: 'ageLink',
  stressPremiumRate: 'stressPremium',
  marketShock: 'fund',
  automationTargetYear: 'ai', automationWagePassThrough: 'ai', reemploymentWageLoss: 'ai', displacementSupportRate: 'ai',
  paradigmRevenueScale: 'regime', paradigmSupportScale: 'regime', paradigmReturnScale: 'regimeFund', paradigmOutputScale: 'regime', paradigmAdminScale: 'regime', paradigmDividendScale: 'regime',
  lafferSelfFinancing: 'labourTax', lafferFullResponse: 'labourTax', lafferAdjustYears: 'labourTax',
  lafferVatResponse: 'productTax',
  retirementDelayEmployment: 'laterAge',
  cutMultiplierCalm: 'cut', cutMultiplierStress: 'cut', publicCapitalElasticity: 'cut', cutInvestmentShare: 'cut'
});

/** The entry that places a key: its own, or the one that moves it with another. */
export const settingEntry = key => SETTINGS_CATALOG.find(entry => entry.key === key || entry.also?.includes(key)) ?? null;

/** The one name of a setting, by its key. */
export const settingName = key => settingEntry(key)?.name ?? null;

/** What a setting moves, in one plain sentence (the tooltip of its name), or null. */
export const settingHelp = key => settingEntry(key)?.help ?? null;

/** The chapter of a key («2 · Las pensiones»), or null. */
export const settingChapter = key => SETTINGS_CHAPTERS.find(chapter => chapter.id === settingEntry(key)?.chapter) ?? null;

/**
 * A stored value as the reader sees it, for the settings the catalogue knows how to write: a switch
 * («sí», «no») or a number with its unit. null for codes, lists and the settings with a rule of their own.
 */
export function settingValueText(key, raw) {
  const entry = SETTINGS_CATALOG.find(e => e.key === key);
  if (!entry) return null;
  if (entry.flag) return Number(raw) > 0 ? 'sí' : 'no';
  if (typeof raw !== 'number' || !(entry.range || entry.unit)) return null;
  const digits = entry.range ? (String(entry.range[2]).split('.')[1] ?? '').length : 1;
  const shown = (raw * (entry.scale ?? 1)).toLocaleString('es-ES', { maximumFractionDigits: Math.max(digits, 1) });
  return entry.unit ? `${shown}\u00a0${entry.unit}` : shown;
}

/** Every key of the scenario the catalogue places: an entry's own key and the ones it moves with it. */
export const catalogKeys = () => SETTINGS_CATALOG.flatMap(entry => [entry.key, ...(entry.also ?? [])]);

const plain = text => String(text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * The words a reader may search with that no name says (U6, #105), in the singular and without accents, and
 * what each finds: a setting by its key, a tool by its name. A query word of three letters or more finds them when it starts the word.
 */
export const SEARCH_SYNONYMS = Object.freeze({
  natalidad: ['targetFertility'],
  nacimiento: ['targetFertility'],
  rico: ['Rentas altas, empresas y fraude fiscal'],
  interes: ['realInterestRate'],
  inmigrante: ['entrantGrowth'],
  ipc: ['pensionRevaluationRate'],
  revalorizacion: ['pensionRevaluationRate'],
  mixto: ['system'],
  reparto: ['system'],
  nocional: ['system']
});

// A word of the query and its singular: «cotizaciones» also as «cotizacion», «impuestos» as «impuesto».
const forms = word => [...new Set([word, word.replace(/es$/, ''), word.replace(/s$/, '')])].filter(form => form.length >= 3 || form === word);

/**
 * The settings whose name or chapter has every word of the query, as a word start
 * («edad» is not «sociedades»), in the singular or the plural, or that a word names through
 * SEARCH_SYNONYMS. The synonyms' settings first, then names, then chapters.
 */
export function searchCatalog(query, limit = 12) {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const named = (item, word) => forms(word).some(form => form.length >= 3 && Object.entries(SEARCH_SYNONYMS).some(([synonym, targets]) => synonym.startsWith(form) && targets.includes(item.key ?? item.name)));
  const has = (text, item) => { const hay = plain(text).split(/[^\p{L}\p{N}]+/u); return words.every(w => named(item, w) || forms(w).some(form => hay.some(h => h.startsWith(form)))); };
  const chapterOf = id => SETTINGS_CHAPTERS.find(c => c.id === id);
  const items = SETTINGS_CATALOG.map(entry => ({ kind: 'setting', key: entry.key, name: entry.name, level: entry.level, chapter: chapterOf(entry.chapter) }));
  const bySynonym = items.filter(item => words.every(w => named(item, w)));
  const byName = items.filter(item => !bySynonym.includes(item) && has(item.name, item));
  const found = [...bySynonym, ...byName];
  return [...found, ...items.filter(item => !found.includes(item) && has(`${item.name} ${item.chapter.title}`, item))].slice(0, limit);
}

// Which systems an expert setting of «El sistema» acts on (docs/REVISION-AJUSTAR-LABORATORIO-2026-11-11.md, A): the
// others are shown folded, since moving them changes nothing. Measured with the engine in pensiones_lab_2; here
// tests/setting-systems.test.mjs checks that the fund settings change nothing in Reparto and Cuentas nocionales. A setting
// with no list acts everywhere, and a system that is not measured (the 1985 experiment) shows them all. The brake
// stays with the notional accounts although it seldom fires: it is theirs. Read it through settingActsOn
// (src/shared/setting-systems.js), which also knows what depends on the configuration (an extra contribution, the brake).
const NOTIONAL_SYSTEMS = Object.freeze(['ndc', 'progressive', 'mixedGradual', 'mixed']);
const POINTS_SYSTEMS = Object.freeze(['payg', 'progressive', 'mixedGradual', 'mixed']);
const PAST_RIGHTS_SYSTEMS = Object.freeze(['ndc']);
// The move to a fund and where it invests: nothing in pay-as-you-go or notional accounts, which have no fund (1.81).
// The mix of the three parts acts where part goes to a fund and part stays public, not in all-funded.
const FUND_SYSTEMS = Object.freeze(['progressive', 'mixedGradual', 'funded', 'mixed']);
const MIX_SYSTEMS = Object.freeze(['progressive', 'mixedGradual', 'mixed']);
export const MEASURED_SYSTEMS = Object.freeze(['payg', 'ndc', 'progressive', 'mixedGradual', 'funded', 'mixed']);
export const SETTING_SYSTEMS = Object.freeze({
  transitionCutoffAge: FUND_SYSTEMS, transitionYears: FUND_SYSTEMS, transitionTargetFunded: FUND_SYSTEMS,
  capitalizationStyle: FUND_SYSTEMS, mix: MIX_SYSTEMS, transitionMode: FUND_SYSTEMS, transitionNdcShare: FUND_SYSTEMS,
  transitionRelaySchedule: FUND_SYSTEMS, transitionPublicPillar: FUND_SYSTEMS,
  feeRate: Object.freeze(['progressive', 'mixedGradual', 'funded', 'mixed']),
  ndcPhaseIn: NOTIONAL_SYSTEMS, ndcPhaseInFirstCohort: NOTIONAL_SYSTEMS, ndcPhaseInYears: NOTIONAL_SYSTEMS,
  ndcAnnuityNorm: NOTIONAL_SYSTEMS, ndcInheritanceGains: NOTIONAL_SYSTEMS, ndcBalancing: NOTIONAL_SYSTEMS,
  ndcPastRights: PAST_RIGHTS_SYSTEMS, ndcPastRightsValue: PAST_RIGHTS_SYSTEMS, ndcPastRightsAgeFull: PAST_RIGHTS_SYSTEMS, ndcPastRightsAgeNone: PAST_RIGHTS_SYSTEMS,
  pointsSystem: POINTS_SYSTEMS, pointsSustainabilityFactor: POINTS_SYSTEMS
});
