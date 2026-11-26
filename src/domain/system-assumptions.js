// «Los sistemas y sus supuestos» (decision of the author, 25/11/2026: «es lo primero que se debe mirar, los supuestos
// desde los que se parte y cómo los maneja cada sistema»). What every system shares, and for each one how it pays,
// who enters and when, where the contribution goes, where the fund invests, what happens to today's pensions and
// which settings it fixes. Values come from the starting configuration and the systems' own constants; the names of
// settings and options are the console's. The yearly shares, the shares by age and the fund's return are measured by
// the engine and stored in data/external-contrast.json (scripts/contrast-external.mjs, section 6).
import { DEFAULT_CONFIG } from '../shared/default-config.js';
import { FLAGSHIP_PROGRESSIVE, FLAGSHIP_RETRO_1985, MIXED_GRADUAL } from '../shared/scenario-labels.js';
import { CATALOG, EXTRA_CONTROLS } from '../shared/console-rows.js';
import { num } from '../shared/number-format.js';

const D = DEFAULT_CONFIG;
const pct = (v, d = 0) => `${num(100 * v, d)} %`;
const optionLabel = (key, value) => EXTRA_CONTROLS[key]?.options?.find(([v]) => v === value)?.[1] ?? String(value);
const settingName = key => CATALOG.get(key)?.name ?? key;

/** What every system shares: the same Spain of 2026 and the same world; only where the retirement contribution goes changes. */
export const COMMON_ASSUMPTIONS = Object.freeze([
  { title: 'El punto de partida', text: 'España en 2026: población, empleo, salarios, pensiones, impuestos y deuda de los datos oficiales. Todos los sistemas parten de esa misma foto.' },
  { title: 'Lo ganado se respeta', text: 'Las pensiones de hoy y los derechos ganados hasta 2026 se pagan en todos los sistemas, con las reglas de hoy. Un sistema nuevo solo cambia lo que se cotiza desde 2027.' },
  { title: 'Se cotiza lo mismo', text: `En todos se cotiza lo mismo para pensiones: el ${pct(D.contributionRate, 2)} de los salarios («${settingName('contributionRate')}»). Lo que cambia es a dónde va la parte de jubilación: a reparto, a cuentas nocionales o a un fondo. El MEI y la cuota de solidaridad siempre van a lo público.` },
  { title: 'Una aportación, un solo destino', text: 'Cada euro cotizado va a un solo sitio: no puede pagar a la vez las pensiones de hoy y llenar un fondo.' },
  { title: 'Sin fondo puente', text: 'Si una parte de la cotización deja de pagar las pensiones de hoy, lo que falta lo pagan los impuestos y la deuda. No hay reserva ni aportación extra que lo cubra.' },
  { title: 'La edad', text: 'La gente se jubila cada vez más tarde, como prevén el Ageing Report y la AIReF, con premio por cada año de demora. Igual en todos los sistemas.' },
  { title: 'El mundo', text: `Población de EUROPOP2025; empleo e inflación de la AIReF hasta 2030; productividad del Ageing Report; inflación del ${pct(D.inflationRate)} desde 2031; los autónomos cotizan por sus ingresos reales desde 2032.` },
  { title: 'Los mercados', text: `Si hay fondo: rentabilidad real del ${pct(D.realReturn, 1)} al año y comisión del ${pct(D.feeRate, 1)}, salvo lo que cambie la cartera de cada sistema. Sin caída del mercado.` },
  { title: 'El freno de 2023', text: 'La ley sube el MEI si el gasto neto en pensiones pasa del 13,3 % del PIB. Por defecto solo actúa en Reparto, que es la ley de hoy; en los demás sistemas se puede encender en el capítulo «Los ingresos».' }
]);

/** The settings a system fixes, by the console's name, with its value as the console shows it. */
function fixedSettings(patch) {
  const rows = [];
  const add = (key, value) => rows.push({ key, name: settingName(key), value });
  if (patch.transitionMode) add('transitionMode', optionLabel('transitionMode', patch.transitionMode));
  if (patch.transitionCutoffAge != null && patch.transitionMode !== 'linear-ramp') add('transitionCutoffAge', `${patch.transitionCutoffAge} años`);
  if (patch.transitionYears != null && patch.transitionMode !== 'pension-runoff') add('transitionYears', `${patch.transitionYears} años`);
  if (patch.transitionTargetFunded != null) add('transitionTargetFunded', pct(patch.transitionTargetFunded));
  if (patch.transitionPublicPillar) add('transitionPublicPillar', optionLabel('transitionPublicPillar', patch.transitionPublicPillar));
  if (patch.transitionPublicPillar === 'custom-split' && patch.transitionNdcShare != null) add('transitionNdcShare', pct(patch.transitionNdcShare));
  if (patch.capitalizationStyle) add('capitalizationStyle', optionLabel('capitalizationStyle', patch.capitalizationStyle));
  return rows;
}

const MIX = D.mix;
/** Each system: as the «Sistema» list names it, whether it can be chosen there, and how it handles the assumptions. */
export const SYSTEM_ASSUMPTIONS = Object.freeze([
  { key: 'payg', short: 'Toda la cotización paga las pensiones del año; el freno de 2023 actúa.', name: 'Reparto (hoy)', selectable: true,
    what: 'El sistema actual. Las cotizaciones de cada año pagan las pensiones de ese año.',
    pension: 'Cada año trabajado da derecho a una parte de la primera pensión, según la tasa de sustitución de las altas del Ageing Report (del 77 % del último salario en 2026 al 65 % en 2050, para una carrera completa). Después sube cada año con el IPC del año anterior.',
    entry: 'Todos, siempre.',
    contribution: 'Toda la parte de jubilación paga las pensiones del año.',
    fund: null,
    today: 'Las pensiones de hoy siguen igual.',
    brake: 'Actúa: es la ley de hoy.',
    fixed: [] },
  { key: 'ndc', short: 'Toda la cotización va a cuentas virtuales que crecen con la masa salarial; el dinero sigue pagando las pensiones de hoy.', name: 'Cuentas nocionales', selectable: true,
    what: 'Reparto con una cuenta virtual por persona. El dinero sigue pagando las pensiones del momento; la cuenta solo sirve para calcular la pensión de cada uno.',
    pension: `Lo cotizado se anota en la cuenta y crece cada año como la masa salarial (trabajadores × salario). Al jubilarse, la pensión es el saldo dividido entre los años que se espera cobrar, según la esperanza de vida de su generación. Después sube con el mismo índice. «${settingName('ndcBalancing')}» está apagado; se puede encender.`,
    entry: `Todos los que trabajan, desde 2027. También se puede hacer por generaciones («${settingName('ndcPhaseIn')}»).`,
    contribution: 'Toda la parte de jubilación se anota en las cuentas y paga las pensiones del año.',
    fund: null,
    today: `Las pensiones de hoy y lo ganado hasta 2026 siguen como en reparto. Se puede pasar lo ganado a la cuenta («${settingName('ndcPastRights')}»).`,
    brake: 'No actúa por defecto.',
    fixed: [] },
  { key: 'progressive', short: 'La mitad de la cotización acaba en un fondo común, a medida que fallecen los pensionistas de hoy; del resto, el 85 % a nocionales. Lo que falta, impuestos y deuda.', name: 'Mixto progresivo', selectable: true,
    what: `Una parte de la cotización pasa, poco a poco, a un fondo común invertido; el resto sigue siendo público, sobre todo en cuentas nocionales. Es el sistema de referencia del laboratorio.`,
    pension: 'Dos partes: la pública (nocional y de reparto, calculada como en esos sistemas) y una renta vitalicia que se compra con lo ahorrado en el fondo.',
    entry: `El fondo crece a medida que fallecen los pensionistas de hoy: cuantos menos quedan, más cotización va al fondo. Por edad: quien tenía hasta ${FLAGSHIP_PROGRESSIVE.transitionCutoffAge - 8} años en 2026 lleva la parte completa; de ahí a ${FLAGSHIP_PROGRESSIVE.transitionCutoffAge}, cada vez menos; los mayores, una parte pequeña.`,
    contribution: `Al final del cambio, el ${pct(FLAGSHIP_PROGRESSIVE.transitionTargetFunded)} de la parte de jubilación va al fondo. Del resto, el ${pct(FLAGSHIP_PROGRESSIVE.transitionNdcShare)} a cuentas nocionales y el ${pct(1 - FLAGSHIP_PROGRESSIVE.transitionNdcShare)} a reparto.`,
    fund: 'Fondo común con cartera global de dividendos (como el fondo noruego). Lo de quien muere antes de jubilarse se queda en el fondo, para todos.',
    today: 'Las pensiones de hoy se pagan enteras. Mientras parte de la cotización va al fondo, lo que falta lo ponen los impuestos y la deuda.',
    brake: 'No actúa por defecto.',
    fixed: fixedSettings(FLAGSHIP_PROGRESSIVE) },
  { key: 'mixedGradual', short: 'Un tercio de la cotización acaba en una cuenta propia invertida, subiendo en 24 años igual a todas las edades. Lo que falta, impuestos y deuda.', name: 'Mixto con ahorro propio', selectable: true,
    what: 'La cotización se reparte, poco a poco, entre reparto, cuentas nocionales y una cuenta de ahorro propia invertida.',
    pension: 'Tres partes: reparto, nocional y una renta vitalicia comprada con la cuenta propia.',
    entry: `Igual a todas las edades. El fondo empieza en 2027 con una parte pequeña y sube cada año hasta llegar a su parte en ${MIXED_GRADUAL.transitionYears} años.`,
    contribution: `Al final, el ${pct(MIXED_GRADUAL.transitionTargetFunded)} va a la cuenta propia; el resto se reparte entre reparto y nocionales en la proporción ${Math.round(100 * MIX.payg)}:${Math.round(100 * MIX.ndc)}.`,
    fund: 'Cartera equilibrada, en una cuenta individual. Lo de quien muere antes de jubilarse va a sus herederos.',
    today: 'Las pensiones de hoy se pagan enteras; lo que falta lo ponen los impuestos y la deuda.',
    brake: 'No actúa por defecto.',
    fixed: fixedSettings(MIXED_GRADUAL) },
  { key: 'retro1985', short: 'Contrafactual: el 65 % al fondo desde 1985. Llega a 2026 por otro camino.', name: 'Experimento: Mixto progresivo desde 1985', selectable: true,
    what: 'Un contrafactual: qué habría pasado si un mixto progresivo hubiera empezado en 1985. Llega a 2026 por otro camino, con supuestos históricos, así que no parte de la misma foto que los demás.',
    pension: 'Como en el Mixto progresivo: parte pública y renta del fondo.',
    entry: `Desde 1985, en dos tramos que suman ${FLAGSHIP_RETRO_1985.transitionYears} años. Quien tenía hasta ${FLAGSHIP_RETRO_1985.transitionCutoffAge - 8} años en 1985 lleva la parte completa; los mayores, menos. En 2026 el cambio ya ha terminado.`,
    contribution: `El ${pct(FLAGSHIP_RETRO_1985.transitionTargetFunded)} va al fondo. Del resto, el ${pct(FLAGSHIP_RETRO_1985.transitionNdcShare)} a cuentas nocionales y el ${pct(1 - FLAGSHIP_RETRO_1985.transitionNdcShare)} a reparto.`,
    fund: 'Fondo soberano de dividendos; lo de quien muere antes de jubilarse va a sus herederos.',
    today: 'Sus pensionistas y su deuda de 2026 son los de ese otro camino, no los de la España real.',
    brake: 'No actúa por defecto.',
    fixed: fixedSettings(FLAGSHIP_RETRO_1985) },
  { key: 'funded', short: 'Toda la cotización a cuentas individuales de golpe: las pensiones de hoy, a impuestos y deuda.', name: 'Capitalización de golpe', selectable: false,
    what: 'Toda la cotización de jubilación va a cuentas individuales desde 2027, para todos a la vez.',
    pension: 'Renta vitalicia comprada con lo ahorrado.',
    entry: 'Todos, en 2027.',
    contribution: 'Toda la parte de jubilación va al fondo.',
    fund: 'Cartera equilibrada, en cuentas individuales.',
    today: 'Las pensiones de hoy y los derechos ganados se quedan sin cotizaciones que las paguen: todo sale de impuestos y deuda. Por eso se rompe enseguida y no está en la lista «Sistema»; se ve en «Todos los sistemas».',
    brake: 'No actúa.',
    fixed: [] },
  { key: 'mixed', short: 'Un tercio de la cotización al fondo de golpe, para todos.', name: 'Mixto de golpe', selectable: false,
    what: `La cotización se reparte desde 2027, para todos a la vez: ${Math.round(100 * MIX.payg)} % reparto, ${Math.round(100 * MIX.ndc)} % nocionales y ${Math.round(100 * MIX.funded)} % fondo («${settingName('mix')}»).`,
    pension: 'Tres partes, como en el Mixto con ahorro propio.',
    entry: 'Todos, en 2027.',
    contribution: `El ${Math.round(100 * MIX.funded)} % va al fondo desde el primer año.`,
    fund: 'Cartera equilibrada, en cuentas individuales.',
    today: 'Un tercio de la cotización deja de pagar las pensiones de hoy de golpe; lo cubren impuestos y deuda. Se ve en «Todos los sistemas», pero no está en la lista «Sistema».',
    brake: 'No actúa.',
    fixed: [] }
]);

/** The sentence the console says when a system is chosen (src/pages/consola.js). */
export function systemNotice(key) {
  const s = SYSTEM_ASSUMPTIONS.find(x => x.key === key);
  return s ? `${s.name}. ${s.short} Sus supuestos: Metodología › Los sistemas y sus supuestos.` : null;
}

/** The portfolio of a style, as the console names it. */
export const portfolioName = style => optionLabel('capitalizationStyle', style);
