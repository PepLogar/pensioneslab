// «Supuestos de otros»: the same engine with another institution's assumptions, set with the console's own
// levers. A profile reproduces that institution's path of gross pension spending, not its whole model: its debt,
// revenue and population stay the simulator's. It is an approximation (S), never that institution's forecast.
// Each profile keeps the figures it was calibrated against, and tests/reference-profiles.test.mjs checks that
// the engine still lands near them (docs/DECISIONES.md, 24/11/2026).
import { DEFAULT_CONFIG } from '../shared/default-config.js';

export const REFERENCE_PROFILES = Object.freeze([
  Object.freeze({
    id: 'ref:airef-2026',
    name: 'Supuestos de la AIReF (Estudio 1/2026)',
    patch: Object.freeze({ retirementAgeExitPath: 1, productivityGrowth: -0.0035, realWageGrowth: -0.0035, retaReform2032: 1, airefShortRunEmployment: 1 }),
    says: 'Aproximación del simulador a los supuestos de la AIReF, tomados como los publica: la edad efectiva sube (senda del Ageing Report, con premio por demora), la productividad y los salarios crecen 0,35 puntos menos al año, los autónomos cotizan por sus ingresos reales desde 2032 y, hasta 2030, el empleo y la inflación son los que ella prevé (más empleo por la inmigración). Hasta 2030 reproduce su empleo y su PIB real; su productividad más baja actúa desde 2031. Su deuda de 2050 sale algo mayor (128 % frente al 123 % de su escenario base, con su propia demografía), y su gasto en pensiones también (16,6 % del PIB en 2050 frente a 16,3 %). No es una previsión ni un resultado de la AIReF, ni está revisado por ella.',
    // O: AIReF, Estudio 1/2026 (29/05/2026), págs. 13–14: its own models with EUROPOP2025 (14.5 % on average, 16.3 % in 2050).
    // The debt target, 123 % in 2050 (gráfico 2, págs. 7 and 70), is from its baseline with its own demography, whose
    // pension spending in 2050 is 16.4 %: not quite the same scenario (docs/REVISION-ADVERSARIAL-2026-11-24.md, 53).
    // Since 24/11/2026 the profile takes its assumptions as they are and is no longer tuned to its pension spending:
    // the tolerances say how near it stays (tests/reference-profiles.test.mjs; docs/DECISIONES.md).
    targets: Object.freeze({ grossAverage2022to2050: 14.5, spending2050: 16.3, debt2050: 123 }),
    // 1.78: 16.6 % and 128 % in 2050 (1.77: 16.8 % and 129 %; 1.76: 15.7 % and 115 %; 0.6 and 4 up to 1.75).
    tolerance: Object.freeze({ spending: 0.7, debt: 9 }),
    source: 'AIReF, Estudio 1/2026, págs. 13–14 (gasto), gráfico 2 (deuda) y gráfico 15; Opinión 2025, págs. 59–60 y 101 (productividad y edad); Estudio 1/2026, págs. 20–21 (RETA); Informe de seguimiento 2026 del plan fiscal, cuadro 16 (empleo hasta 2030)'
  }),
  Object.freeze({
    id: 'ref:ageing-report-2024',
    name: 'Supuestos del Ageing Report 2024',
    patch: Object.freeze({ europop2023: 1, retirementAgeExitPath: 1, exitPathNoExtraPension: 1, airefShortRunEmployment: 0 }),
    says: 'Aproximación del simulador a los supuestos del Ageing Report 2024: su población (EUROPOP2023), su empleo y su productividad, y su edad efectiva, que sube; los años de más no suben la pensión, porque su pensión de entrada ya cuenta con esa edad. Sigue su gasto en pensiones desde el gasto observado de 2025 hasta 2040 (15,4 % del PIB frente a 15,3 %) y queda algo por encima después (17,0 % en 2050 frente a 16,3 %), con sus mismas altas de jubilación; no sigue su deuda ni sus ingresos. No es una previsión ni un resultado de la Comisión Europea, ni está revisado por ella.',
    // O: the Ageing Report 2024 path updated with the spending observed up to 2025, as the 2023 rule reads it
    // (AIReF, Estudio 1/2026, págs. 13–14: 14.6 % on average in 2022–2050; 16.3 % in 2050).
    targets: Object.freeze({ grossAverage2022to2050: 14.6, spending2050: 16.3 }),
    // 1.78: with the coverage by generation its new retirements are the Ageing Report's (Table 17, fitted); it follows
    // the path to 2040 and stays above it later: 14.76 % on average and 17.0 % in 2050 (1.77: 14.85 % and 17.3 %;
    // 1.76: 14.25 % and 16.1 %; up to 1.75 within 0.1 points, by chance). Docs/DECISIONES.md, 26/11/2026.
    tolerance: Object.freeze({ spending: 0.75 }),
    source: 'Comisión Europea, Ageing Report 2024 (ficha de España); senda actualizada según AIReF, Estudio 1/2026, pág. 13'
  })
]);

export const isReferenceProfile = id => typeof id === 'string' && id.startsWith('ref:');
export const referenceProfile = id => REFERENCE_PROFILES.find(p => p.id === id) ?? null;

/** The whole configuration of a profile: the starting configuration with its levers. */
export const profileConfig = profile => ({ ...DEFAULT_CONFIG, ...profile.patch });
