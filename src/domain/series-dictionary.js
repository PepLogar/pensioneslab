// Every yearly series of a run, in long format, with a dictionary of variables
// (docs/REVISION-EXPERTO-2026-11-08.md, proposal 3): year, system, variable, value and unit,
// for R, Python or a spreadsheet. The engine gives amounts in euros of 2026 (real); the price
// index turns them into euros of each year. Shares of GDP divide two amounts of the same year.
// Pure functions over the engine's result (result.years, 2026–2070).

import { riskVariablesFromEngine } from '../shared/sovereign-risk.js';
import { computeVerdict } from './verdict.js';
import { payablePensionAnnual } from '../shared/payable-pension.js';

const M = 1e6;
const fiscal = (p, key) => p.fiscalComposition?.[key];
const measure = (p, key) => p.fiscalMeasures?.[key];
// What the engine leaves empty (`null`, the opening year) stays empty: `null / M` would be 0
// (docs/PROPUESTA-EXPORTAR-NECESIDADES-2026-11-09.md).
const known = (value, scale) => (Number.isFinite(value) ? value * scale : null);

// Units: a short code in every row, its meaning in the dictionary.
export const SERIES_UNITS = Object.freeze({
  personas: { code: 'personas', text: 'personas' },
  eur2026: { code: 'EUR_2026', text: 'euros de 2026 (reales)' },
  meur2026: { code: 'MEUR_2026', text: 'millones de euros de 2026 (reales)' },
  meurCorrientes: { code: 'MEUR_corrientes', text: 'millones de euros de cada año (nominales)' },
  pctPib: { code: 'pct_PIB', text: '% del PIB del mismo año' },
  pct: { code: 'pct', text: '%' },
  indice: { code: 'indice_2026', text: 'índice, 2026 = 1' },
  anios: { code: 'anios', text: 'años' },
  ratio: { code: 'cociente', text: 'cociente entre dos cifras' }
});

const v = (id, group, name, unit, get, definition) => Object.freeze({ id, group, name, unit, get, definition });

/** The variables, in the order of the CSV. `get` reads one year of the engine's result. */
export const SERIES_VARIABLES = Object.freeze([
  // Economía y población
  v('pib', 'Economía', 'PIB', 'meur2026', p => p.gdp / M, 'Producto interior bruto a precios de 2026.'),
  v('pib_nominal', 'Economía', 'PIB nominal', 'meurCorrientes', p => p.gdp * p.priceIndex / M, 'PIB en euros de cada año: el real por el índice de precios.'),
  v('indice_precios', 'Economía', 'Índice de precios', 'indice', p => p.priceIndex, 'Precios de cada año frente a 2026. Divide un importe nominal por él para pasarlo a euros de 2026.'),
  v('cotizantes', 'Economía', 'Personas que cotizan', 'personas', p => p.workingPersons ?? p.workers, 'Personas ocupadas que cotizan, no equivalentes a tiempo completo.'),
  v('ocupados_equivalentes', 'Economía', 'Ocupados equivalentes', 'personas', p => p.workers, 'Empleo en equivalentes a tiempo completo, el que usa el motor para la producción.'),
  v('salario_medio', 'Economía', 'Salario medio anual', 'eur2026', p => p.wage, 'Salario medio por ocupado.'),
  v('pib_por_ocupado', 'Economía', 'PIB por ocupado', 'eur2026', p => p.labourProductivity, 'Producción por ocupado equivalente.'),
  v('masa_salarial_pct_pib', 'Economía', 'Masa salarial', 'pctPib', p => p.payrollGDP * 100, 'Salarios de todos los ocupados.'),
  v('desplazados_sin_recolocar', 'Economía', 'Desplazados por la automatización sin recolocar', 'personas', p => p.displacedWorkers, 'Solo con los escenarios de IA y robots; 0 en los demás.'),
  // Pensiones
  v('jubilados', 'Pensiones', 'Personas jubiladas', 'personas', p => p.retirees, 'Pensionistas de jubilación de todos los sistemas.'),
  v('cotizantes_por_jubilado', 'Pensiones', 'Cotizantes por jubilado', 'ratio', p => (p.workingPersons ?? p.workers) / p.retirees, 'Personas que cotizan por cada persona jubilada.'),
  v('altas_jubilacion', 'Pensiones', 'Nuevas jubilaciones', 'personas', p => p.newRetirementAwards, 'Pensiones de jubilación que empiezan ese año.'),
  v('jubilados_fallecidos', 'Pensiones', 'Jubilados que fallecen', 'personas', p => p.retiredDeaths, 'Pensiones de jubilación que terminan por fallecimiento ese año.'),
  v('anios_cobro_a_los_65', 'Pensiones', 'Años de cobro de quien cumple 65', 'anios', p => p.yearsCollectingGeneration65, 'Esperanza de vida a los 65 de esa generación menos el retraso de la jubilación.'),
  v('pension_media_anual', 'Pensiones', 'Pensión media de jubilación', 'eur2026', p => p.averagePensionAnnual, 'Pública y privada, por jubilado y año. Deja fuera la renta del fondo de quien no llega a pensión pública, porque no cuenta como jubilado. No es una pensión individual garantizada.'),
  v('pension_media_mensual', 'Pensiones', 'Pensión media de jubilación al mes', 'eur2026', p => p.averagePensionAnnual / 12, 'La anterior en 12 pagas.'),
  v('pension_pagable_mensual', 'Pensiones', 'Pensión pagable al mes, si el sistema se rompe', 'eur2026', (p, run) => payablePensionAnnual(p, run.verdict, run.config) / 12,
    'La pensión media que se podría pagar tras un rescate o una quita: la parte pública, congelada en euros desde el rescate y recortada desde la quita (ajustes «Pensión pagable»); la renta de los fondos privados no se toca. Igual que la media mientras no hay rescate. Supuesto del simulador, no cambia las cuentas.'),
  v('pension_sobre_salario', 'Pensiones', 'Pensión media sobre el salario medio', 'pct', p => p.replacementRate * 100, 'Pensión media de jubilación dividida por el salario medio del mismo año.'),
  v('pension_publica_de_las_altas', 'Pensiones', 'Pensión pública inicial de las nuevas jubilaciones', 'eur2026', p => p.newAwardPublicAnnual, 'Media anual de la parte pública de las altas del año.'),
  v('revalorizacion_nominal', 'Pensiones', 'Revalorización de las pensiones en pago', 'pct', p => p.pensionNominalRevaluation * 100, 'Subida nominal de las pensiones de reparto ya en pago.'),
  v('gasto_pensiones_publicas_pct_pib', 'Pensiones', 'Gasto público en pensiones', 'pctPib', p => p.publicPensionSpendingGDP, 'Todas las pensiones públicas: jubilación, viudedad, incapacidad y no contributivas. La cifra que compara el Ageing Report.'),
  v('pensiones_publicas', 'Pensiones', 'Gasto en pensiones públicas', 'meur2026', p => p.publicBenefits / M, 'Jubilación pública y otras pensiones públicas.'),
  v('jubilacion_publica', 'Pensiones', 'Pensiones públicas de jubilación', 'meur2026', p => p.publicRetirementBenefits / M, 'Derechos anteriores a la reforma, reparto nuevo y cuentas nocionales.'),
  v('jubilacion_derechos_anteriores', 'Pensiones', 'Jubilación de derechos anteriores a la reforma', 'meur2026', p => p.legacyBenefits / M, 'Lo ya ganado con la fórmula de hoy, que toda transición respeta.'),
  v('jubilacion_reparto_nuevo', 'Pensiones', 'Jubilación de reparto de derechos nuevos', 'meur2026', p => p.paygBenefits / M, 'Derechos de reparto ganados desde la reforma.'),
  v('jubilacion_nocional', 'Pensiones', 'Jubilación de cuentas nocionales', 'meur2026', p => p.ndcBenefits / M, 'Rentas de las cuentas nocionales. Son derechos, no activos invertidos.'),
  v('jubilacion_capitalizada', 'Pensiones', 'Rentas de capitalización', 'meur2026', p => p.fundedBenefits / M, 'Rentas pagadas por los fondos, privados o común. No es gasto público.'),
  v('otras_pensiones_publicas', 'Pensiones', 'Otras pensiones públicas', 'meur2026', p => p.otherPensionBenefits / M, 'Viudedad, incapacidad, orfandad y no contributivas.'),
  // Cotizaciones
  v('cotizaciones', 'Cotizaciones', 'Cotizaciones', 'meur2026', p => p.totalContributions / M, 'Todas las cotizaciones del modelo: a pensiones públicas y a fondos.'),
  v('cotizaciones_pensiones_publicas', 'Cotizaciones', 'Cotizaciones a pensiones públicas', 'meur2026', p => p.publicPensionContributions / M, 'Las que pagan pensiones públicas ese año.'),
  v('cotizaciones_jubilacion', 'Cotizaciones', 'Cotizaciones de jubilación', 'meur2026', p => p.retirementContributions / M, 'La parte de jubilación, antes de repartirla entre reparto, cuentas y fondo.'),
  v('cotizaciones_a_fondos', 'Cotizaciones', 'Cotizaciones a fondos', 'meur2026', p => p.fundedContributions / M, 'La parte que se invierte. No paga pensiones de hoy: una aportación no financia a la vez reparto y capitalización.'),
  v('cotizacion_adicional_a_fondos', 'Cotizaciones', 'Cotización adicional a fondos', 'meur2026', p => p.fundedExtraContributions / M, 'Puntos pagados encima de la cotización de hoy, solo para la cuenta invertida.'),
  v('mei', 'Cotizaciones', 'Mecanismo de Equidad Intergeneracional', 'meur2026', p => p.meiContributions / M, 'Cotización del MEI, con destino público protegido.'),
  v('cuota_solidaridad', 'Cotizaciones', 'Cuota de solidaridad', 'meur2026', p => p.solidarityContributions / M, 'Sobre los salarios por encima de la base máxima, sin derechos adicionales.'),
  v('mutuas_a_pensiones', 'Cotizaciones', 'Transferencia de mutuas a pensiones', 'meur2026', p => p.mutuaPensionTransfer / M, 'Ya forma parte de los ingresos consolidados; se muestra una vez.'),
  v('clausula_cierre', 'Cotizaciones', 'Subida del MEI por el freno de 2023', 'meur2026', p => (p.closingClauseContributions ?? 0) / M, 'Más MEI cuando salta el freno de 2023; 0 cuando no se aplica.'),
  // Cuentas y fondos
  v('saldo_nocional', 'Cuentas y fondos', 'Saldo de las cuentas nocionales', 'meur2026', p => p.notionalBalance / M, 'Derechos anotados, no activos invertidos.'),
  v('abonos_nocionales', 'Cuentas y fondos', 'Abonos en cuentas nocionales', 'meur2026', p => p.notionalCredits / M, 'Lo que se anota en las cuentas nocionales ese año.'),
  v('fondos', 'Cuentas y fondos', 'Fondos de capitalización', 'meur2026', p => p.fundedAssets / M, 'Activos invertidos de las cuentas y del fondo común. No son caja del Estado ni cancelan su deuda.'),
  v('fondos_pct_pib', 'Cuentas y fondos', 'Fondos de capitalización', 'pctPib', p => p.fundedAssetsGDP, 'Los mismos activos en % del PIB.'),
  v('rendimiento_fondos', 'Cuentas y fondos', 'Rendimiento de los fondos', 'meur2026', p => p.fundedInvestmentReturn / M, 'Rentabilidad neta de comisiones del año.'),
  v('herencias_fondos', 'Cuentas y fondos', 'Herencias de los fondos', 'meur2026', p => p.fundedBequests / M, 'Saldos de quienes fallecen que pasan a sus herederos.'),
  // Estado
  v('ingresos_publicos', 'Estado', 'Ingresos públicos', 'meur2026', p => p.totalPublicRevenue / M, 'Ingresos consolidados de todas las administraciones.'),
  v('irpf', 'Estado', 'IRPF', 'meur2026', p => fiscal(p, 'personalIncomeTax') / M, 'Impuesto sobre la renta, con su recargo si lo hay.'),
  v('iva_y_productos', 'Estado', 'IVA e impuestos sobre productos', 'meur2026', p => fiscal(p, 'vatLikeTaxes') / M, 'IVA e impuestos que recaen sobre el consumo.'),
  v('sociedades', 'Estado', 'Impuesto de Sociedades', 'meur2026', p => fiscal(p, 'corporateIncomeTax') / M, 'Impuesto sobre los beneficios.'),
  v('otros_impuestos', 'Estado', 'Otros impuestos', 'meur2026', p => fiscal(p, 'remainingTaxes') / M, 'El resto de tributos modelados.'),
  v('recargo_irpf', 'Estado', 'Recaudación del recargo de IRPF', 'meur2026', p => measure(p, 'irpfExtra') / M, 'Lo que recauda el esfuerzo adicional en IRPF, ya con la respuesta de la base.'),
  v('recargo_iva', 'Estado', 'Recaudación del recargo de IVA', 'meur2026', p => measure(p, 'vatExtra') / M, 'Lo que recauda el esfuerzo adicional en IVA.'),
  v('recargo_otros', 'Estado', 'Recaudación del recargo de otros tributos', 'meur2026', p => measure(p, 'otherExtra') / M, 'Lo que recauda el esfuerzo adicional en otros tributos.'),
  v('impuestos_a_pensiones', 'Estado', 'Impuestos asignados a pensiones', 'meur2026', p => p.pensionTaxTransfer / M, 'Parte de los otros ingresos que paga pensiones. No es dinero nuevo.'),
  v('gasto_publico', 'Estado', 'Gasto público total', 'meur2026', p => p.totalPublicSpending / M, 'Pensiones, el resto del gasto e intereses.'),
  v('otro_gasto_primario', 'Estado', 'Otro gasto primario', 'meur2026', p => p.otherPrimarySpending / M, 'Gasto que no es pensiones ni intereses.'),
  v('gasto_cuidados_envejecimiento', 'Estado', 'Sanidad y dependencia por el envejecimiento', 'meur2026', p => p.careAgeingSpending / M, 'Aumento del gasto en sanidad y dependencia que trae el envejecimiento.'),
  v('saldo_primario', 'Estado', 'Saldo primario', 'meur2026', p => p.primaryBalance / M, 'Ingresos menos gasto sin intereses.'),
  v('intereses', 'Estado', 'Intereses de la deuda', 'meur2026', p => p.interest / M, 'Intereses pagados ese año por toda la deuda pública.'),
  v('saldo_publico', 'Estado', 'Saldo público', 'meur2026', p => p.stateBalance / M, 'Ingresos menos gasto, intereses incluidos. Negativo es déficit.'),
  v('saldo_publico_pct_pib', 'Estado', 'Saldo público', 'pctPib', p => p.stateBalanceGDP, 'El mismo saldo en % del PIB.'),
  v('falta_pensiones', 'Estado', 'Lo que falta para pensiones', 'meur2026', p => p.pensionGap / M, 'Lo que no cubren cotizaciones, mutuas e impuestos asignados. No es todo el déficit.'),
  v('falta_pensiones_pct_pib', 'Estado', 'Lo que falta para pensiones', 'pctPib', p => p.pensionGapGDP, 'La misma falta en % del PIB.'),
  v('coste_transicion_pct_pib', 'Estado', 'Coste de la transición', 'pctPib', p => p.transitionContributionsGDP, 'Cotizaciones que van a fondos y dejan de pagar pensiones de hoy.'),
  v('necesidad_financiacion', 'Estado', 'Necesidad de financiación', 'meur2026', p => known(p.financingNeed, 1 / M), 'Lo que el Estado pide prestado de más ese año. Vacía en el año de partida.'),
  v('emision_bruta_deuda', 'Estado', 'Emisión bruta de deuda', 'meur2026', p => known(p.grossDebtIssuance, 1 / M), 'Deuda nueva más la que se refinancia, en bonos y obligaciones: el simulador no emite letras. Vacía en el año de partida.'),
  v('vencimientos_deuda', 'Estado', 'Deuda que vence', 'meur2026', p => known(p.debtMaturities, 1 / M), 'Bonos y obligaciones que vencen ese año; el simulador no emite letras. Vacía en el año de partida, que arranca con la deuda ya dada.'),
  v('necesidades_brutas_financiacion_pct_pib', 'Estado', 'Necesidades brutas de financiación, sin letras', 'pctPib', p => riskVariablesFromEngine(p, null).grossFinancingNeeds, 'Déficit más deuda que vence: la señal del índice de riesgo, que avisa por encima del 15,95 %. La Comisión cuenta también las letras, unos 5 puntos más. Vacía cuando falta la deuda que vence, en el año de partida.'),
  v('deuda', 'Estado', 'Deuda pública', 'meur2026', p => p.debt / M, 'Deuda consolidada de las administraciones públicas.'),
  v('deuda_pct_pib', 'Estado', 'Deuda pública', 'pctPib', p => p.debtGDP, 'La misma deuda en % del PIB.'),
  v('deuda_a_tipo_base_pct_pib', 'Estado', 'Deuda sin la prima de riesgo', 'pctPib', p => p.baseRateDebtGDP, 'La deuda que habría sin la prima de riesgo por deuda/PIB.'),
  v('bola_de_nieve_de_la_prima_pct_pib', 'Estado', 'Deuda que añade la prima de riesgo', 'pctPib', p => p.riskPremiumDebtSnowballGDP, 'Diferencia entre la deuda y la deuda sin prima.'),
  v('tipo_medio_deuda', 'Estado', 'Tipo medio de la deuda', 'pct', p => p.effectiveNominalRate * 100, 'Intereses sobre la deuda, nominal.'),
  v('tipo_deuda_nueva', 'Estado', 'Tipo de la deuda nueva', 'pct', p => known(p.targetNominalInterestRate, 100), 'Coste nominal de lo que se emite ese año, con la prima. Vacío en el año de partida.')
]);

const clean = value => (Number.isFinite(value) ? String(Number(value.toFixed(6))) : '');

/** The dictionary as CSV rows: variable, group, name, unit code, its meaning, definition. `;` separated. */
export function dictionaryCSV() {
  const quote = text => (/[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
  return [['variable', 'grupo', 'nombre', 'unidad', 'unidad_significa', 'definicion'],
    ...SERIES_VARIABLES.map(item => [item.id, item.group, item.name, SERIES_UNITS[item.unit].code, SERIES_UNITS[item.unit].text, item.definition])]
    .map(row => row.map(quote).join(';')).join('\n');
}

/**
 * Every year of every run, one value per row: anio;sistema;variable;valor;unidad.
 * @param {{ key: string, result: object }[]} runs  `key` names the system in the file
 */
/** What a variable needs from the whole run: the verdict's rescue and haircut years, and the run's settings. */
export const seriesContext = result => ({ config: result?.config ?? {}, get verdict() { return (this._v ??= computeVerdict(result)); } });

export function longSeriesCSV(runs) {
  const rows = ['anio;sistema;variable;valor;unidad'];
  for (const run of runs) {
    const whole = seriesContext(run.result);
    for (const point of run.result?.years ?? []) {
      for (const item of SERIES_VARIABLES) {
        let value;
        try { value = item.get(point, whole); } catch { value = NaN; }
        rows.push(`${point.year};${run.key};${item.id};${clean(value)};${SERIES_UNITS[item.unit].code}`);
      }
    }
  }
  return rows.join('\n');
}
