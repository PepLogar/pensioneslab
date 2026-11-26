// How the texts name the fiscal risk indicator (docs/REVISION-S0-TEXTOS-2026-11-10.md, proposal A,
// approved by the author on 13/11/2026). The European Commission stopped applying the S0 in 2026 to
// review it (DSM 2025, IP 332, box 1.1); its thresholds are the last published ones (DSM 2022,
// repeated in 2024). So no text calls it the Commission's indicator in the present tense: they take
// one of these phrases. tests/risk-wording.test.mjs fails on the old wording anywhere else.

/** For labels, legends and notes; it fits inside parentheses. */
export const S0_SHORT = 'índice S0, el de la Comisión Europea hasta 2025';

/** For what is cited or shared (the PDF report, the images) and the Glossary. */
export const S0_LONG = 'el índice fiscal del S0, el indicador de alerta que la Comisión Europea usó hasta 2025, con sus umbrales de 2022 y las cifras del simulador';

/** The same phrase at the start of a sentence. */
export const upperFirst = text => text.charAt(0).toUpperCase() + text.slice(1);
