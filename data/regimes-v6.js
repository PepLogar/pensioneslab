// Exposure weights only. These are not new revenues or statutory pension shares.
// Source: TGSS net recognised rights, January–August 2026, PDF pp.59–60.
// The denominator for ordinary contributions is the wider Social Security system.
// Applying its regime mix to the model's pension pool remains an explicit proxy.
export const REGIMES_V6 = Object.freeze({
  id: 'regime-exposures-2026-08-v6',
  cutoff: '2026-10-17',
  ordinaryRETAShare: 8124.70 / (126032.44 - 4074.65),
  meiRETAShare: 294.61 / 3587.34,
  amountsMillionEUR: Object.freeze({
    retaOrdinary: 8124.70,
    systemTotal: 126032.44,
    meiAndSolidarity: 4074.65,
    retaMei: 294.61,
    totalMei: 3587.34,
  }),
  source: Object.freeze({
    url: 'https://www.seg-social.es/descarga/es/L_Entidades_Agosto_2026.pdf',
    path: 'data/sources/fmi-income-tgss-202608.pdf',
    sha256: '998526f8dbb5fc6d890d5e2c326537bb8eae95f50c3c8d776516b9baf5327d4a',
    locator: 'PDF pp.59–60 / printed pp.58–59: concepts 122 and 1202; system total from consolidated opening.',
    measure: 'Net recognised rights, including amounts pending definitive application; not cash receipts.',
  }),
  sensitivity: Object.freeze({
    id: 'reta-constant-real-base',
    description: 'Explicit sensitivity only: constant real base per participant, common participant-count index, unchanged 2026 receipts. Apply the legal MEI rate path once.',
    statutoryProjection: false,
    centralProjectionChanged: false,
  }),
});
