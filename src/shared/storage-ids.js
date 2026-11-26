// The names of the saved state: which starting data it belongs to, its version and its storage key.
// Apart from default-config.js so the header (expert-mode.js) does not bring the engine's starting
// data to the pages that do not simulate (docs/PROPUESTA-PESO-PAGINAS-2026-11-09.md). default-config.js
// checks on load that CALIBRATION_ID is still the id of data/current-spain-v8.js, and a test does too.
// Bump STATE_VERSION here when the saved state changes.
export const CALIBRATION_ID = 'es-current-2026-10-18-v8';
// 24 (1.51): the default average term of new debt moves from 7.85 to the Treasury ladder (9.88).
// 25 (1.53): the Laffer response no longer lowers GDP by default (lafferOutputResponse 1 → 0).
// 26 (1.54): the full Laffer response is on by default (lafferFullResponse → 1).
// 27 (1.56): the VAT surcharge enters the Laffer wedge by default (lafferVatResponse → 1).
// 28 (1.59): retirementDelayEmployment, who keeps working when the retirement age rises.
// 29 (1.60): publicCapitalElasticity, what a spending cut costs through public investment.
// 30 (1.62): the reference Mixto progresivo aims at 50 % to the fund, not 60 %.
// 31 (1.63): its pace follows today's pensions as they end, not a calendar.
// 32 (1.64): the reference Mixto progresivo invests through a common fund.
// 33 (1.67): the taxes without a model of their own follow nominal GDP by default (unmodeledTaxesFollowGDP → 1).
// 34 (1.68): the effective retirement age follows the Ageing Report path by default (retirementAgeExitPath → 1).
// 35 (1.69): employment and inflation until 2030 as the AIReF expects, by default (airefShortRunEmployment → 1).
// 36 (1.71): the pending RETA reform is on by default (retaReform2032 → 1).
export const STATE_VERSION = 36;
export const STORAGE_SUFFIX = ':scenarios-v10';
