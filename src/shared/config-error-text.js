// What a person reads when a value or a scenario cannot be used. The engine's validators (src/config-current-v*.js,
// src/borrowing-permit.js, src/shared/default-config.js) keep their short technical messages in English: scripts
// and tests read them. Every page that shows such a message passes it through here first, so that it is said in
// Spanish, with the names the settings have on the page. A message already written for people (the engine's
// «Este escenario…», a storage notice) passes as it is. Pure.
import { SETTINGS_CATALOG } from './settings-catalog.js';

const NAME = new Map(SETTINGS_CATALOG.flatMap(entry => [entry.key, ...(entry.also ?? [])].map(key => [key, entry.name])));

/** A technical message of a validator: English words the engine writes, never the ones written for people. */
// Not «A …» or «The …»: a Spanish sentence may start with «A», and the engine's messages that start so have their rule.
const TECHNICAL = /^(Invalid|Unknown|Expected|Payment|Debt|Fiscal|Borrowing|Mixed)\b|\bmust [a-z]+\b|cannot be an accessor|is required/;

const RULES = [
  // A pair of settings that must keep their order.
  [/^Invalid riskModerateIndex: expected at most riskHighIndex$/,
    () => 'El riesgo moderado no puede empezar por encima del riesgo alto. Baja el índice del moderado o sube el del alto.'],
  // The calendars of a crisis plan («Simular año a año»).
  [/payment adjustment|publicPensionCut|otherSpendingCut/i, () => 'Los recortes de pagos del plan de crisis no son válidos: revisa sus años y porcentajes.'],
  [/restructuring|sovereign exposure|creditor discount/i, () => 'La reestructuración de la deuda del plan de crisis no es válida: revisa sus años, la quita y el plazo.'],
  [/fiscal rescue|rescue IRPF|vat(General|Reduced|SuperReduced)Rate/i, () => 'El rescate fiscal del plan de crisis no es válido: revisa sus años y sus impuestos.'],
  [/borrowing permit/i, () => 'La autorización para pedir prestado no es válida: revisa sus años y sus topes.'],
  [/^The starting debt is fixed/, () => 'La deuda de partida es un dato fijo: las reformas solo cambian el futuro.'],
  // One setting.
  [/^Invalid (\w+)(?:\.\w+)?: expected one of /, ([, key]) => (NAME.has(key) ? `«${NAME.get(key)}»: esa opción no existe en el simulador.` : 'Una opción del escenario no existe en el simulador.')],
  [/^Invalid (\w+)(?:\.\w+)?(?::|$)/, ([, key]) => (NAME.has(key) ? `«${NAME.get(key)}»: ese valor queda fuera de lo que admite el simulador.` : 'Un ajuste del escenario tiene un valor que el simulador no admite.')],
  [/^Unknown [\w. ]+ field: (.+)$/, ([, key]) => `El escenario trae un ajuste que el simulador no conoce («${key}»).`],
  [/must be a plain object|cannot be an accessor/, () => 'El escenario no tiene la forma que espera el simulador.']
];

/**
 * @param {unknown} error  an Error or a message
 * @param {string} [fallback]  said when there is no message, or when a technical one has no rule
 * @returns {string}
 */
export function configErrorText(error, fallback = 'Ese valor no se puede usar.') {
  const message = String((error && typeof error === 'object' ? error.message : error) ?? '').trim();
  if (!message) return fallback;
  for (const [pattern, say] of RULES) {
    const match = pattern.exec(message);
    if (match) return say(match);
  }
  return TECHNICAL.test(message) ? fallback : message;
}
