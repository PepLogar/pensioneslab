/**
 * Same-session yields on Spanish Treasury debt, not a zero-coupon curve.
 * Source: Banco de Espana, Sintesis de indicadores, table 1.2, page 1.
 * The 16 October observations were read from the release dated 20 October.
 * Only the pricing information set is extended; opening public accounts stay fixed.
 */
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const TREASURY_TERM_CURVE_2026 = freeze({
  id: 'es-treasury-secondary-bde-20261016-v1',
  observationDate: '2026-10-16',
  publicationDate: '2026-10-20',
  capturedDate: '2026-10-20',
  publisher: 'Banco de Espana',
  issuer: 'Tesoro Publico de Espana',
  definition: 'Rentabilidades de deuda publica, precios de operaciones cruzadas; misma columna diaria del 16-Oct-26. Rendimientos nominales anuales, no cupones ni curva oficial de tipos cero.',
  nodes: [
    { years: 1, yieldRate: .0305, instrument: 'Letras a 12 meses' },
    { years: 3, yieldRate: .0338, instrument: 'Bonos a 3 anos' },
    { years: 5, yieldRate: .0351, instrument: 'Bonos a 5 anos' },
    { years: 10, yieldRate: .0401, instrument: 'Obligaciones a 10 anos' },
    { years: 15, yieldRate: .0428, instrument: 'Obligaciones a 15 anos' },
    { years: 30, yieldRate: .0455, instrument: 'Obligaciones a 30 anos' }
  ],
  assumptions: {
    interpolation: 'Interpolacion lineal entre rendimientos de plazos publicados; es una aproximacion del simulador, no una curva cero cupon del Banco de Espana.',
    beyondLastNode: 'Entre 30 y 50 anos se mantiene el rendimiento de 30 anos. No se presenta como una observacion oficial a 50 anos.',
    scenarioAnchor: 'Se aplica la diferencia de rendimiento frente al plazo de referencia de 7,85 anos al tipo base del escenario. Conserva el nivel guardado de tipos; los rendimientos observados y el tipo resultante del escenario se muestran por separado.',
    creditRisk: 'Los rendimientos espanoles observados ya incluyen el riesgo de mercado de Espana en esa sesion. La prima sintetica deuda/PIB del escenario representa deterioro adicional; no se agrega de nuevo un diferencial observado frente al Bund.',
    instrumentBridge: 'Se aproxima una emision a la par con cupon fijo igual al rendimiento. No se reconstruyen las primas o descuentos de cada titulo cotizado.',
    datedAuctions: 'Las ultimas subastas de 5, 10 y 30 anos pertenecen a fechas distintas y se conservan solo como contraste. No se mezclan para construir una falsa curva simultanea.'
  },
  auctionCrossChecks: [
    { originalLabelYears: 5, auctionDate: '2026-10-15', settlementDate: '2026-10-20', maturityDate: '2031-05-31', meanYieldRate: .03482, marginalYieldRate: .03490, couponRate: .026, sourceId: 'treasury-latest-bonos-20261020' },
    { originalLabelYears: 10, auctionDate: '2026-10-01', settlementDate: '2026-10-06', maturityDate: '2036-10-31', meanYieldRate: .04176, marginalYieldRate: .04181, couponRate: .034, sourceId: 'treasury-latest-obligaciones-20261020' },
    { originalLabelYears: 30, auctionDate: '2026-07-16', settlementDate: '2026-07-21', maturityDate: '2056-10-31', meanYieldRate: .04286, marginalYieldRate: .04290, couponRate: .0395, sourceId: 'treasury-latest-obligaciones-20261020' }
  ],
  sources: [
    {
      id: 'bde-daily-indicators-20261020',
      title: 'Banco de Espana, Sintesis de indicadores, 1.2 Espana. Indicadores financieros. Series diarias',
      url: 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/pdf/si_1_2.pdf',
      file: 'data/sources/debt-term-2026/bde-si-1-2.pdf',
      sha256: 'fa0dae052c8288537792cd7d877b9f814718d375ea6d2af2413da0b9f41a4069',
      page: 1,
      location: 'Datos diarios: columna 16-Oct-26, seis filas de rentabilidades de deuda; se excluye la fila intermedia de volatilidad y las columnas semanales.',
      verificationImage: 'data/sources/debt-term-2026/bde-si-1-2-p1.png'
    },
    {
      id: 'treasury-latest-bonos-20261020',
      title: 'Tesoro Publico, resultado de ultimas subastas de Bonos del Estado',
      url: 'https://www.tesoro.es/deuda-publica/subastas/resultado-ultimas-subastas/bonos-del-estado',
      file: 'data/sources/debt-term-2026/tesoro-bonos-latest-20261020.html',
      sha256: '458d78e8a3f1513a67bbb4de4ed09e0cdd4c05dc03b313d75439485a5edd7a7f'
    },
    {
      id: 'treasury-latest-obligaciones-20261020',
      title: 'Tesoro Publico, resultado de ultimas subastas de Obligaciones del Estado',
      url: 'https://www.tesoro.es/deuda-publica/subastas/resultado-ultimas-subastas/obligaciones-del-estado',
      file: 'data/sources/debt-term-2026/tesoro-obligaciones-latest-20261020.html',
      sha256: '30127784c90745a8581ba3e2145e849884de61f82b14931c787a7bb8d97472e1'
    }
  ]
});
