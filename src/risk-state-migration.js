import { RETIREMENT_DELAY_DEFAULTS } from './shared/retirement-delay.js';
import { PUBLIC_CAPITAL_DEFAULTS } from './shared/public-capital.js';
import { LEGACY_SOVEREIGN_RISK } from './sovereign-risk-premium.js';
import { DEFAULT_NEW_DEBT_TERM_YEARS as LEGACY_DEFAULT_DEBT_TERM_YEARS } from './debt-term.js';
import { DEFAULT_ISSUANCE_TERM_YEARS } from './debt-issuance.js';

/** Copy stored data fields only; getters, symbols and prototypes are rejected. */
function storedValues(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new TypeError('La configuración guardada debe ser un objeto de datos');
  }
  const values = {};
  for (const key of Reflect.ownKeys(input)) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (typeof key !== 'string' || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError('La configuración guardada no admite campos calculados');
    }
    Object.defineProperty(values, key, { value: descriptor.value, enumerable: true,
      configurable: true, writable: true });
  }
  return values;
}

/** A saved configuration without a model selector used the original quadratic
 * rule. Preserve that meaning; the current defaults apply only to new work. */
export function preserveLegacyRiskConfig(input) {
  const values = storedValues(input);
  return Object.hasOwn(values, 'riskModel') ? values
    : { ...LEGACY_SOVEREIGN_RISK, ...values, riskModel: 'legacy-quadratic' };
}

/** Before state 24 (1.51) new debt was issued at 7 and 8 years, with a default
 * average term of 7.85. A saved scenario with that default moves to the Treasury
 * ladder and its 9.88-year average; any other chosen term is kept, now issued with
 * the ladder's shape (decision of the author, 30/10/2026). */
export function moveDefaultDebtTermToLadder(input) {
  const values = storedValues(input);
  return values.newDebtTermYears === LEGACY_DEFAULT_DEBT_TERM_YEARS
    ? { ...values, newDebtTermYears: DEFAULT_ISSUANCE_TERM_YEARS } : values;
}

/** Before state 25 (1.53) the Laffer response also lowered GDP by default
 * (lafferOutputResponse 1, since 1.38). A saved scenario with that default moves to
 * the new one, 0: revenue only; any other chosen value is kept (decision of the
 * author, 1/11/2026). Configurations without the field predate 1.38 and already
 * meant revenue only. */
export function moveDefaultLafferOutputOff(input) {
  const values = storedValues(input);
  return values.lafferOutputResponse === 1 ? { ...values, lafferOutputResponse: 0 } : values;
}

/** Before state 26 (1.54) the Laffer response was a revenue line only. Every saved
 * scenario moves to the full response, the new default (decision of the author,
 * 1/11/2026). A 0 saved before 26 cannot be told from a default: 1.53.0 did not have
 * the key, and the builds between 1.53 and 1.54 wrote 0 as their default. So every
 * state before 26 moves to 1; from 26 on, a 0 is a choice and is kept. */
export function moveToFullLafferResponse(input) {
  return { ...storedValues(input), lafferFullResponse: 1 };
}

/** Before state 27 (1.56) the VAT surcharge did not enter the Laffer wedge by default.
 * Every saved scenario moves to the new default, 1 (decision of the author, 2/11/2026,
 * as in 1.54): the 1.55 builds wrote 0 as their default and the 1.55.0 published did not
 * offer the option outside the Laboratorio's experiment, so a 0 saved before 27 cannot be
 * told from a default. From 27 on, a 0 is a choice and is kept. */
export function moveToLafferVatResponse(input) {
  return { ...storedValues(input), lafferVatResponse: 1 };
}

/** Before state 28 (1.59) everyone stayed employed until a later retirement age. Every saved
 * scenario moves to the new default (decision of the author, 4/11/2026, as in 1.54 and 1.56). */
export function moveToRetirementDelayEmployment(input) {
  return { ...storedValues(input), ...RETIREMENT_DELAY_DEFAULTS };
}

/** Before state 29 (1.60) a spending cut cost nothing through public investment. Every saved
 * scenario moves to the new default (decision of the author, 5/11/2026, as in 1.54, 1.56 and 1.59). */
export function moveToPublicCapital(input) {
  return { ...storedValues(input), ...PUBLIC_CAPITAL_DEFAULTS };
}

const isCalendarFlagship = (values, target) => values.transitionMode === 'two-stage-relay' && values.transitionCutoffAge === 48 &&
  values.transitionYears === 24 && values.transitionTargetFunded === target &&
  values.transitionPublicPillar === 'custom-split' && values.transitionNdcShare === 0.85 &&
  values.transitionRelaySchedule === 'announced' && values.capitalizationStyle === 'lifecycle-ap7';

/** Before state 30 (1.62) the reference Mixto progresivo aimed at 60 % to the fund. A saved
 * scenario with exactly that recipe moves to 50 % (decision of the author, 6/11/2026); rules the
 * reader changed stay as they are. */
export function moveFlagshipToHalf(input) {
  const values = storedValues(input);
  return isCalendarFlagship(values, 0.6) ? { ...values, transitionTargetFunded: 0.5 } : values;
}

/** Before state 31 (1.63) the reference Mixto progresivo followed a fixed calendar. A saved
 * scenario with exactly that recipe moves to the pace of today's pensions ending (decision of
 * the author, 7/11/2026); rules the reader changed stay as they are. */
export function moveFlagshipToRunoff(input) {
  const values = storedValues(input);
  return isCalendarFlagship(values, 0.5) ? { ...values, transitionMode: 'pension-runoff' } : values;
}

/** Before state 32 (1.64) the reference Mixto progresivo kept personal accounts. A saved
 * scenario with exactly that recipe moves to the common fund (decision of the author,
 * 7/11/2026); rules the reader changed stay as they are. */
export function moveFlagshipToCommonFund(input) {
  const values = storedValues(input);
  const isRunoffFlagship = values.transitionMode === 'pension-runoff' &&
    isCalendarFlagship({ ...values, transitionMode: 'two-stage-relay' }, 0.5);
  return isRunoffFlagship ? { ...values, capitalizationStyle: 'common-fund' } : values;
}

/** Before state 23 (1.46) there was no closing clause. Saved scenarios keep it off,
 * with their 1.45 results; one click turns it on (decision of the author, 28/10/2026).
 * A configuration that already names it keeps its value. */
export function keepClosingClauseOff(input) {
  const values = storedValues(input);
  return Object.hasOwn(values, 'closingClause') ? values : { ...values, closingClause: 'off' };
}

/** Before state 22 (1.25) health and long-term care kept a constant share of GDP:
 * nobody could choose it, so saved scenarios move to the realistic default and
 * include the Ageing Report pressure of ageing. */
export function includeAgeingCare(input) {
  return { ...storedValues(input), ageingCareSpending: 1 };
}

/** Before state 33 (1.67) the taxes without a model of their own stayed in real euros. Every saved
 * scenario moves to the new default, 1 (decision of the author, 24/11/2026, as in 1.54, 1.56 and 1.59):
 * the key came in 22/11 with 0 as its default and no new state, so a 0 saved before 33 cannot be told
 * from a default. From 33 on, a 0 is a choice and is kept. */
export function moveUnmodeledTaxesWithGDP(input) {
  return { ...storedValues(input), unmodeledTaxesFollowGDP: 1 };
}

/** Before state 34 (1.68) the retirement ages stayed frozen by default. Every saved scenario moves to the new
 * default, the Ageing Report path (decision of the author, 24/11/2026, as in 1.54, 1.56, 1.59 and 1.67): the key
 * came in on 24/11 with 0 as its default and no new state, so a 0 saved before 34 cannot be told from a default.
 * From 34 on, a 0 is a choice and is kept. */
export function moveToRetirementExitPath(input) {
  return { ...storedValues(input), retirementAgeExitPath: 1 };
}

/** Before state 35 (1.69) employment until 2030 followed the Ageing Report by default. Every saved scenario moves
 * to the new default, the AIReF's employment and inflation until 2030 (decision of the author, 24/11/2026, as in
 * 1.67 and 1.68): the key came in on 24/11 with 0 as its default and no new state. From 35 on, a 0 is kept. */
export function moveToAirefShortRun(input) {
  return { ...storedValues(input), airefShortRunEmployment: 1 };
}

/** Before state 36 (1.71) the pending RETA reform was off by default. Every saved scenario moves to the new default
 * (decision of the author, 24/11/2026, as in 1.67–1.69): the key came in on 24/11 with 0 as its default and no new
 * state. From 36 on, a 0 is a choice and is kept. */
export function moveToRetaReform(input) {
  return { ...storedValues(input), retaReform2032: 1 };
}

/** The older saved-state versions still read (the current one is STATE_VERSION, 36). */
export const OLDER_STATE_VERSIONS = Object.freeze([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]);

/** A configuration saved with state `version`, brought to today's meaning. The one
 * chain for the browser's state, its JSON copies and the Excel full copy. */
export function configForStateVersion(config, version) {
  const risk = version < 20 ? preserveLegacyRiskConfig(config) : config;
  const relay = version < 21 ? preserveLegacyRelayConfig(risk) : risk;
  const care = version < 22 ? includeAgeingCare(relay) : relay;
  const closing = version < 23 ? keepClosingClauseOff(care) : care;
  const term = version < 24 ? moveDefaultDebtTermToLadder(closing) : closing;
  const output = version < 25 ? moveDefaultLafferOutputOff(term) : term;
  const full = version < 26 ? moveToFullLafferResponse(output) : output;
  const vat = version < 27 ? moveToLafferVatResponse(full) : full;
  const delay = version < 28 ? moveToRetirementDelayEmployment(vat) : vat;
  const capital = version < 29 ? moveToPublicCapital(delay) : delay;
  const half = version < 30 ? moveFlagshipToHalf(capital) : capital;
  const runoff = version < 31 ? moveFlagshipToRunoff(half) : half;
  const common = version < 32 ? moveFlagshipToCommonFund(runoff) : runoff;
  const taxes = version < 33 ? moveUnmodeledTaxesWithGDP(common) : common;
  const path = version < 34 ? moveToRetirementExitPath(taxes) : taxes;
  const airef = version < 35 ? moveToAirefShortRun(path) : path;
  return version < 36 ? moveToRetaReform(airef) : airef;
}

/** A configuration saved before 1.21 has no relay calendar: its two-stage relay
 * used the extended rule (16 + years - 8). Preserve that meaning where the relay
 * is in use; elsewhere the calendar has no effect and the current one is added,
 * so an untouched scenario is not reported as customized. */
export function preserveLegacyRelayConfig(input) {
  const values = storedValues(input);
  if (Object.hasOwn(values, 'transitionRelaySchedule')) return values;
  return { ...values, transitionRelaySchedule: values.transitionMode === 'two-stage-relay' ? 'legacy-extended' : 'announced' };
}
