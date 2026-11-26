// What an expert setting waits for (docs/REVISION-AJUSTAR-CAPITULOS-2026-11-11.md, A). A setting of «Cómo
// responde la economía» says how the economy answers a decision: until the decision is taken, moving it changes
// nothing. The catalogue says which need each setting has (SETTING_NEEDS); here, the words of each need and
// when a scenario meets it. As with the systems (src/shared/setting-systems.js), the rule only ever says
// «waits» when that is known: every test errs on the side of leaving the setting in sight.
import { SETTING_NEEDS, SETTINGS_CATALOG } from './settings-catalog.js';
import { DEFAULT_CONFIG } from './default-config.js';
import { activeSystemKey } from './scenario-labels.js';
import { closingClauseApplies } from './closing-clause.js';

const same = (a, b) => typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-12 : JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const atStart = (config, ...keys) => keys.every(key => same(config?.[key], DEFAULT_CONFIG[key]));
const none = list => !Array.isArray(list) || list.length === 0;
// A rescue raises taxes and cuts; a plan of the crisis does both too.
const noCrisisPlan = config => none(config?.fiscalRescues) && none(config?.debtRestructurings);
const NO_FUND_SYSTEMS = ['payg', 'ndc'];
// The brake of the 2023 reform raises the MEI by itself when pension spending passes its ceiling: a rise of
// contributions nobody chose, and the response to taxes wakes up with it. Whether it fires is in the result
// (closingClauseRate). Without a result at hand, it is taken as possible unless the scenario is today's except
// for settings that cannot move spending: how it is judged, what is told when it breaks, and the waiting ones.
const clauseRaises = result => (result?.years ?? []).some(year => Number(year.closingClauseRate) > 0);
const CANNOT_MOVE_SPENDING = new Set([...SETTINGS_CATALOG.filter(entry => entry.chapter === 'yardstick').map(entry => entry.key), ...Object.keys(SETTING_NEEDS),
  'narrativeMilestones', 'narrativeBailoutYears', 'narrativeRestructuringYears', 'narrativeNoRescue', 'payablePensionFreezeYears', 'payablePensionCut', 'lafferOutputResponse']);
const todayButForTheNeutral = config => Object.keys(DEFAULT_CONFIG).every(key => CANNOT_MOVE_SPENDING.has(key) || same(config?.[key], DEFAULT_CONFIG[key]));
const clauseMayRaise = (config, result) => closingClauseApplies(config) && (result ? clauseRaises(result) : !todayButForTheNeutral(config));

/**
 * Each need: `answers`, what the setting responds to (on its card); `missing`, why it waits (on the fold);
 * `met`, whether the scenario has taken that decision (with the scenario's run, when there is one at hand).
 */
export const NEEDS = Object.freeze({
  labourTax: { answers: 'subir el IRPF, la cotización o el IVA', missing: 'no has subido impuestos',
    // The wedge on work: contribution points, the IRPF, the taxes on products that join it and the MEI of the
    // closing clause when it is not today's.
    met: (config, result) => !atStart(config, 'contributionRate', 'irpfSurcharge', 'vatSurcharge', 'otherTaxSurcharge', 'lafferExemptContribution', 'fundedExtraContribution')
      || !noCrisisPlan(config) || clauseMayRaise(config, result) },
  productTax: { answers: 'subir el IVA u otros tributos', missing: 'no has subido el IVA ni otros tributos',
    met: config => !atStart(config, 'vatSurcharge', 'otherTaxSurcharge') || !noCrisisPlan(config) },
  laterAge: { answers: 'cambiar la edad de jubilación', missing: 'no has movido la edad de jubilación',
    met: config => !atStart(config, 'retirementAge', 'retirementAgeLink') },
  cut: { answers: 'recortar otros gastos', missing: 'no has recortado otros gastos',
    met: config => !none(config?.paymentAdjustments) || !noCrisisPlan(config) },
  stressPremium: { answers: 'la prima de riesgo por crisis, encendida', missing: 'la prima de riesgo por crisis está apagada',
    met: config => Number(config?.stressPremium) > 0 },
  fund: { answers: 'un sistema con fondo', missing: 'tu sistema no tiene fondo',
    met: config => !NO_FUND_SYSTEMS.includes(activeSystemKey(config)) || Number(config?.fundedExtraContribution) > 0 },
  ai: { answers: 'que la IA o los robots hagan parte del trabajo', missing: 'ni la IA ni los robots hacen trabajo',
    met: config => ['aiAutomationShare', 'robotAutomationShare', 'publicAdminAutomationShare'].some(key => Number(config?.[key]) > 0) },
  regime: { answers: 'un régimen de IA distinto del de hoy', missing: 'el régimen de IA es el de hoy',
    met: config => !atStart(config, 'automationRegime') },
  ageLink: { answers: 'la edad ligada a la esperanza de vida', missing: 'la edad no está ligada a la esperanza de vida',
    met: config => Number(config?.retirementAgeLink) > 0 },
  // The extra return on capital needs both: a regime that gives it and a fund for it to act on
  // (docs/REVISION-CABOS-AJUSTAR-2026-11-11.md, D).
  regimeFund: { answers: 'un régimen de IA distinto del de hoy, con un sistema con fondo', missing: 'no hay un régimen de IA con un fondo sobre el que actuar',
    met: config => !atStart(config, 'automationRegime') && (!NO_FUND_SYSTEMS.includes(activeSystemKey(config)) || Number(config?.fundedExtraContribution) > 0) }
});

/** The need of a setting, or null: `{ id, answers, missing, met }`. */
export const settingNeed = key => (SETTING_NEEDS[key] ? { id: SETTING_NEEDS[key], ...NEEDS[SETTING_NEEDS[key]] } : null);

/**
 * True only when the setting is known to change nothing until the scenario takes the decision it answers to.
 * @param {object} [result]  the scenario's own run, when the page has it: it says whether the brake of 2023 fires
 */
export function settingWaits(key, config, result = null) {
  const need = settingNeed(key);
  return Boolean(need) && !need.met(config ?? DEFAULT_CONFIG, result);
}

/** «Responde a: …», the line on the card of a setting with a need. */
export const settingAnswersLine = key => { const need = settingNeed(key); return need ? `Responde a: ${need.answers}.` : ''; };

const cap = text => text.charAt(0).toUpperCase() + text.slice(1);
/** The fold of the settings that wait, the same in the Laboratorio and in the panel of Ajustes. */
export const waitingTitle = count => `Sin efecto con tu escenario (${count})`;
export function waitingNote(keys, config, result = null) {
  const reasons = [...new Set(keys.map(key => settingNeed(key)).filter(need => need && !need.met(config ?? DEFAULT_CONFIG, result)).map(need => need.missing))];
  const why = reasons.length > 1 ? `${reasons.slice(0, -1).join(', ')} y ${reasons.at(-1)}` : reasons[0] ?? '';
  return `${why ? `${cap(why)}. ` : ''}Se conservan, y vuelven a la vista cuando tomas la decisión a la que responden.`;
}
