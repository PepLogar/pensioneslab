// Contrast of the simulator with the projections of others stored in the project: the 2024 Ageing Report
// for Spain (long run: baseline, the same run with its own assumptions, and its sensitivities through the
// simulator's levers), the AIReF's evaluation of pension spending (2026) and the IMF (Article IV, May 2026)
// and Funcas (October 2026) short-run figures. Read-only on the engine: it runs it and writes
// data/external-contrast.json, which «Metodología» shows. Nothing is calibrated to the sources.
// Comes from scripts/contrast-external-1.64.mjs of pensiones_lab_2, without its section 5 (the sources'
// macro paths through the engine, which needs files not migrated). Run it again when the methodology changes:
//   node scripts/contrast-external.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { PUBLISHED_EVALUATIONS, SPENDING_BEFORE_BASE } from '../src/shared/closing-clause.js';
import { simulate } from '../src/simulation.js';
import { OFFICIAL_POPULATION_EUROPOP2025 as POP } from '../data/official-population-europop2025.js';
import { OFFICIAL_FERTILITY_EUROPOP2025 as FERT } from '../data/official-fertility-europop2025.js';
import { AR2024_DEMOGRAPHY } from '../data/official-demography.js';
import { referenceProfile } from '../src/domain/reference-profiles.js';
import { APP_VERSION } from '../src/shared/app-version.js';
import { SIMULATION_METHODOLOGY } from '../src/simulation-methodology.js';
import { comparisonConfigs } from '../src/shared/scenario-labels.js';
import { cohortTransitionWeights, cohortCapitalizationReturns } from '../src/progressive-transition.js';
import { weightsFor } from '../src/config-core.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const json = path => JSON.parse(read(path).toString('utf8'));
const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '·');

// ---------- The Ageing Report annex, Spain (sheets ESa and ESb), checked against its stored fingerprint ----------
const annex = AR2024_DEMOGRAPHY.sources.statisticalAnnex;
const bytes = read(annex.snapshot);
if (createHash('sha256').update(bytes).digest('hex') !== annex.sha256) throw new Error('The Ageing Report annex is not the stored one');
function unzip(buf) {
  const files = new Map();
  let eocd = buf.length - 22; while (buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  let cd = buf.readUInt32LE(eocd + 16);
  for (let i = 0, n = buf.readUInt16LE(eocd + 10); i < n; i++) {
    const method = buf.readUInt16LE(cd + 10), size = buf.readUInt32LE(cd + 20), nl = buf.readUInt16LE(cd + 28), ex = buf.readUInt16LE(cd + 30), cm = buf.readUInt16LE(cd + 32), local = buf.readUInt32LE(cd + 42);
    const name = buf.subarray(cd + 46, cd + 46 + nl).toString('utf8'); cd += 46 + nl + ex + cm;
    if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size); files.set(name, (method === 8 ? inflateRawSync(raw) : raw).toString('utf8'));
  }
  return files;
}
const parts = unzip(bytes);
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const shared = [...parts.get('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')));
const rels = Object.fromEntries([...parts.get('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map(m => [/Id="([^"]+)"/.exec(m[0])[1], /Target="([^"]+)"/.exec(m[0])[1]]));
const sheetList = [...parts.get('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)].map(m => ({ name: /name="([^"]+)"/.exec(m[0])[1], rid: /r:id="([^"]+)"/.exec(m[0])[1] }));
const AR = {};
for (const sheet of ['ESa', 'ESb']) {
  const s = sheetList.find(x => x.name === sheet);
  const xml = parts.get(`xl/${rels[s.rid].replace(/^\/?xl\//, '')}`);
  const rows = new Map([...xml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map(m => [Number(m[1]), Object.fromEntries([...m[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)].map(c => {
    const col = /r="([A-Z]+)\d+"/.exec(c[1])?.[1], type = /t="([^"]+)"/.exec(c[1])?.[1], v = /<v>([\s\S]*?)<\/v>/.exec(c[2])?.[1];
    return [col, v === undefined ? null : type === 's' ? shared[Number(v)] : Number(v)];
  }))]));
  const yearCols = Object.entries(rows.get(6)).filter(([, v]) => Number.isInteger(v) && v >= 2022 && v <= 2070);
  for (const [r, cells] of rows) {
    const label = Object.values(cells).find(v => typeof v === 'string');
    const series = Object.fromEntries(yearCols.map(([col, year]) => [year, cells[col] ?? null]).filter(([, v]) => v !== null));
    if (label && Object.keys(series).length) AR[`${sheet}:${r}`] = { label: label.trim(), series };
  }
}
// The rows this contrast reads, with the label each must have (a moved row stops the run).
const AR_ROWS = { 'ESa:23': /^Potential GDP \(growth rate\)/, 'ESa:24': /^Employment \(15-74y; growth rate\)/, 'ESa:30': /^Potential GDP per worker/, 'ESa:31': /^HICP/,
  'ESa:32': /^Nominal interest rate/, 'ESa:55': /^Average labour market exit age/, 'ESa:70': /^Old-age dependency ratio/, 'ESb:7': /^Public pensions, gross$/, 'ESa:16': /^Population \(million\)/, 'ESa:19': /^share of elderly population \(\+65y\)/, 'ESb:21': /^Pensioners aged 65\+/,
  'ESb:8': /^Of which: Old-age and early pensions/, 'ESb:20': /^Pensioners \(public, 1000 persons\)/, 'ESb:23': /^Benefit ratio/, 'ESb:27': /^Contributors/,
  'ESb:30': /^High life expectancy/, 'ESb:33': /^Lower fertility/, 'ESb:35': /^Higher TFP growth/, 'ESb:36': /^Lower TFP growth/, 'ESb:37': /^Retirement age linked/, 'ESb:38': /^Constant retirement age/ };
for (const [key, pattern] of Object.entries(AR_ROWS)) if (!pattern.test(AR[key]?.label ?? '')) throw new Error(`${key}: expected ${pattern}, found «${AR[key]?.label}»`);
const ar = (key, year) => AR[key].series[year] ?? null;

// ---------- Helpers over runs ----------
const YEARS = [2026, 2030, 2040, 2050, 2060, 2070];
const at = (run, year) => run.years.find(p => p.year === year);
const workers = p => p.workingPersons ?? p.workers;
const arRow = year => AR2024_DEMOGRAPHY.annual.find(row => row.year === year);
const growth = (run, year, value) => { const a = at(run, year - 1), b = at(run, year); return a && b ? 100 * (value(b) / value(a) - 1) : null; };
const pop = (year, from, to) => {
  const i = POP.years.indexOf(year); let total = 0;
  for (const sex of POP.sexes) POP.ages.forEach((age, a) => { if (age >= from && age <= to) total += POP.population[sex][i][a] ?? 0; });
  return total;
};
const run = patch => simulate(validateConfig({ ...DEFAULT_CONFIG, ...patch }));
const base = run({});
const out = { app: APP_VERSION, methodology: SIMULATION_METHODOLOGY, generatedAt: new Date().toISOString(),
  sources: { ageingReport: { snapshot: annex.snapshot, sha256: annex.sha256 }, international: 'data/external-forecasts-international-20261017.json', private: 'data/external-forecasts-private-20261017.json', airefMediumTerm: 'data/external-forecasts-airef-pfemp-20260514.json' } };

// ---------- 1 · Long run: «seguir igual» against the Ageing Report baseline ----------
const LONG = [
  ['spending', 'Gasto público en pensiones, % del PIB', 'ESb:7', p => p.publicPensionSpendingGDP],
  ['oldAge', 'Pensiones de jubilación, % del PIB', 'ESb:8', p => 100 * p.publicRetirementBenefits / p.gdp],
  ['benefitRatio', 'Pensión media / salario medio, % (definiciones distintas)', 'ESb:23', p => 100 * p.replacementRate],
  ['dependency', 'Mayores de 65 / población de 20 a 64, %', 'ESa:70', p => 100 * pop(p.year, 65, 100) / pop(p.year, 20, 64)], // 20–64, as the AR row (its note 3); the grid starts at 20
  ['inflation', 'Inflación, %', 'ESa:31', (p, r) => growth(r, p.year, q => q.priceIndex)],
  ['realGrowth', 'Crecimiento del PIB real, %', 'ESa:23', (p, r) => growth(r, p.year, q => q.gdp)],
  ['perWorker', 'Crecimiento del PIB por ocupado, %', 'ESa:30', (p, r) => growth(r, p.year, q => q.gdp / q.workers)],
  ['employment', 'Crecimiento del empleo, %', 'ESa:24', (p, r) => growth(r, p.year, q => q.workers)],
  ['interest', 'Tipo de interés nominal medio de la deuda, %', 'ESa:32', p => 100 * p.effectiveNominalRate]
];
out.longRun = LONG.map(([id, label, key, value]) => ({ id, label, arRow: key, cells: YEARS.map(year => ({ year, sim: value(at(base, year), base), ar: ar(key, year) })) }));
for (const [id, label, key, value] of [['pensioners', 'Pensionistas, índice 2026 = 100 (simulador: jubilación; AR: todas)', 'ESb:20', p => p.retirees],
  ['contributors', 'Cotizantes, índice 2026 = 100', 'ESb:27', workers]]) {
  out.longRun.push({ id, label, arRow: key, index: true, cells: YEARS.map(year => ({ year, sim: 100 * value(at(base, year)) / value(at(base, 2026)), ar: 100 * ar(key, year) / ar(key, 2026) })) });
}
out.exitAge = YEARS.map(year => ({ year, ar: ar('ESa:55', year) }));
console.log('1 · Largo plazo, «seguir igual» | Ageing Report:', YEARS.join(' · '));
for (const row of out.longRun) console.log(`  ${row.label}`.padEnd(70), row.cells.map(c => `${f(c.sim)}|${f(c.ar)}`).join('  '));

// ---------- 1b · Why the simulator's retirees grow more than the Ageing Report's pensioners ----------
// Retirees (simulator) = population 65+ × retirees per person 65+; the Ageing Report's pensioners = its
// population 65+ × its pensioners 65+ per person 65+ × all pensioners / pensioners 65+. The growth from 2026
// to 2070 splits into those factors exactly; 2026 of the Ageing Report is interpolated between 2022 and 2030.
const arAt = (key, year) => { const s = AR[key].series; if (s[year] != null) return s[year];
  const ys = Object.keys(s).map(Number).sort((a, b) => a - b); const lo = ys.filter(x => x < year).at(-1), hi = ys.find(x => x > year);
  return s[lo] + (s[hi] - s[lo]) * (year - lo) / (hi - lo); };
const arPop65 = year => arAt('ESa:16', year) * 1e6 * arAt('ESa:19', year) / 100;
const g = (f, a = 2026, b = 2070) => f(b) / f(a);
const simRetirees = year => at(base, year).retirees;
const factors = {
  simulator: { total: g(simRetirees), population65: g(y => pop(y, 65, 200)), coverage: g(y => simRetirees(y) / pop(y, 65, 200)) },
  ageingReport: { total: g(y => arAt('ESb:20', y)), population65: g(arPop65), coverage: g(y => arAt('ESb:21', y) * 1e3 / arPop65(y)), allOver65: g(y => arAt('ESb:20', y) / arAt('ESb:21', y)) }
};
out.pensionersGap = { from: 2026, to: 2070, factors,
  split: { demography: factors.simulator.population65 / factors.ageingReport.population65, coverage: factors.simulator.coverage / factors.ageingReport.coverage,
    definition: 1 / factors.ageingReport.allOver65 },
  population65: { simulator: [2026, 2070].map(y => pop(y, 65, 200)), ageingReport: [2026, 2070].map(arPop65) },
  exitAge: [2026, 2070].map(y => arAt('ESa:55', y)) };
console.log('1b · Jubilados frente a pensionistas, 2026–2070:', JSON.stringify(out.pensionersGap.split));

// ---------- 1c · Why the spending starts lower: the Ageing Report's 2022 base and its 2022–2025 path ----------
// The rule's measure (AIReF, Ministry: SPENDING_BEFORE_BASE, observed 2022–2023, updated 2024–2025) against the
// Ageing Report's gross public pensions in the same years; the simulator's 2026 opening follows the observed one.
out.levelGap = { years: [2022, 2023, 2024, 2025, 2026],
  ageingReport: [2022, 2023, 2024, 2025, 2026].map(y => ar('ESb:7', y) ?? arAt('ESb:7', y)),
  observed: [2022, 2023, 2024, 2025].map(y => 100 * SPENDING_BEFORE_BASE[y]).concat([null]),
  simulator: [null, null, null, null, at(base, 2026).publicPensionSpendingGDP],
  arPotentialGrowth: [2023, 2024, 2025, 2026].map(y => ar('ESa:23', y) ?? arAt('ESa:23', y)) };
console.log('1c · Gasto 2022–2026, AR | observado:', out.levelGap.ageingReport.map((v, i) => f(v, 2) + '|' + f(out.levelGap.observed[i], 2)).join('  '));

// ---------- 2 · The same run with the Ageing Report's own assumptions: its profile ----------
// The profile «Supuestos del Ageing Report 2024» (src/domain/reference-profiles.js): its population (EUROPOP2023),
// its exit-age path and its new-pension rate with no extra pension for the later years. Against the AR as
// published and as the 2023 rule updates it (its growth rates on the spending observed in 2025).
const index2070 = r => 100 * workers(at(r, 2070)) / workers(at(r, 2026));
const contributorsTarget = 100 * ar('ESb:27', 2070) / ar('ESb:27', 2026);
const employmentTarget = 100 * arRow(2070).employment20To74Persons / arRow(2026).employment20To74Persons;
const arProfile = referenceProfile('ref:ageing-report-2024');
const updateScale = 100 * SPENDING_BEFORE_BASE[2025] / arRow(2025).publicPensionSpendingGDPpct;
out.withArAssumptions = { profile: arProfile.id, contributorsTarget2070: contributorsTarget, employmentTarget2070: employmentTarget, updateScale, rows: [] };
for (const [label, patch] of [['Reglas de hoy (EUROPOP2025, senda de edad del Ageing Report, empleo de la AIReF hasta 2030)', {}], [arProfile.name, arProfile.patch]]) {
  const r = run(patch);
  out.withArAssumptions.rows.push({ label, patch, spending: YEARS.map(year => at(r, year).publicPensionSpendingGDP), contributorsIndex2070: index2070(r), debt2070: at(r, 2070).debtGDP });
}
out.withArAssumptions.rows.push({ label: 'Ageing Report 2024, actualizado como la regla', spending: YEARS.map(year => arRow(year).publicPensionSpendingGDPpct * updateScale), contributorsIndex2070: employmentTarget });
out.withArAssumptions.rows.push({ label: 'Ageing Report 2024, publicado', spending: YEARS.map(year => ar('ESb:7', year)), contributorsIndex2070: employmentTarget });
let lo = 0, hi = 0;
console.log('2 · Con los supuestos del AR, gasto % PIB:');
for (const row of out.withArAssumptions.rows) console.log(`  ${row.label}`.padEnd(48), row.spending.map(v => f(v)).join(' · '));

// ---------- 3 · The Ageing Report's sensitivities through the simulator's levers ----------
const spending = r => YEARS.map(year => at(r, year).publicPensionSpendingGDP);
const baseSpending = spending(base);
const e65 = r => at(r, 2070).yearsCollectingGeneration65;
const targetE65 = e65(base) + 1.6;
lo = 0; hi = 0.2; let gain = 0;
for (let i = 0; i < 18; i++) { gain = (lo + hi) / 2; if (e65(run({ longevityGain: gain })) < targetE65) lo = gain; else hi = gain; }
const tfr2050 = FERT.totalFertility[FERT.years.indexOf(2050)];
const SENS = [
  ['longevity', 'Esperanza de vida +2 años al nacer en 2070', 'ESb:30', [[`longevityGain ${gain.toFixed(4)}: +1,6 años de cobro a los 65 en 2070 [S]`, { longevityGain: gain }]]],
  ['fertility', 'Fecundidad −20 %', 'ESb:33', [[`targetFertility ${(0.8 * tfr2050).toFixed(2)}: 0,8 × ${tfr2050.toFixed(2)}, la de 2050 en EUROPOP2025`, { targetFertility: Number((0.8 * tfr2050).toFixed(2)) }]]],
  ['tfpUp', 'Productividad total de los factores +0,2 puntos', 'ESb:35', [['productivityGrowth +0,2 puntos', { productivityGrowth: 0.002 }], ['productivityGrowth +0,3 puntos (0,2 / 0,65)', { productivityGrowth: 0.003 }]]],
  ['tfpDown', 'Productividad total de los factores −0,2 puntos', 'ESb:36', [['productivityGrowth −0,2 puntos', { productivityGrowth: -0.002 }], ['productivityGrowth −0,3 puntos', { productivityGrowth: -0.003 }]]],
  ['ageLink', 'Edad de jubilación ligada a la esperanza de vida', 'ESb:37', [['retirementAgeLink 2/3', { retirementAgeLink: 0.667 }], ['retirementAgeLink 1', { retirementAgeLink: 1 }]]],
  // The AR keeps the exit age at its 2022 level (64.0) against its baseline, which raises it 2.4 years by 2040; the
  // simulator's path only adds the 1.37 after 2026 (2022–2026 is in the observed profile). Here, the same switch,
  // the path off against the path on (with no extra pension, as in the AR), on the simulator's population and on the AR profile.
  // Both runs with the 2023 brake off (closingClause 'off'): the AR has no automatic reaction, and with the AR profile the
  // frozen run crosses the brake, so the MEI surcharge and its lost hours would inflate the effect until the MEI ends in 2050.
  ['age', 'Edad de jubilación constante (la de 2022), frente a su línea base que la sube 2,4 años hasta 2040', 'ESb:38', [
    ['Senda de edad apagada frente a encendida, sin el freno de 2023 (EUROPOP2025, empleo del Ageing Report)', { retirementAgeExitPath: 0, closingClause: 'off', airefShortRunEmployment: 0 }, { retirementAgeExitPath: 1, exitPathNoExtraPension: 1, closingClause: 'off', airefShortRunEmployment: 0 }],
    ['Lo mismo con el perfil del Ageing Report (EUROPOP2023)', { ...arProfile.patch, retirementAgeExitPath: 0, closingClause: 'off' }, { ...arProfile.patch, closingClause: 'off' }]]]
];
const SENS_YEARS = [2040, 2050, 2070];
out.sensitivities = SENS.map(([id, label, key, variants]) => ({ id, label, arRow: key,
  ar: SENS_YEARS.map(year => ar(key, year)),
  // A variant is measured against the base run, or against its own `from` run when it has one.
  sim: variants.map(([how, patch, from]) => { const a = spending(run(patch)), b = from ? spending(run(from)) : baseSpending;
    return { how, patch, ...(from ? { from } : {}), cells: SENS_YEARS.map(year => a[YEARS.indexOf(year)] - b[YEARS.indexOf(year)]) }; }) }));
console.log('3 · Sensibilidades, puntos de PIB (2040 · 2050 · 2070):');
for (const s of out.sensitivities) {
  console.log(`  ${s.label} · AR`.padEnd(80), s.ar.map(v => f(v, 2)).join(' · '));
  for (const v of s.sim) console.log(`    ${v.how}`.padEnd(80), v.cells.map(c => f(c, 2)).join(' · '));
}

// ---------- 4 · Short run: the IMF (May 2026) and Funcas (October 2026) ----------
const intl = json('data/external-forecasts-international-20261017.json');
const priv = json('data/external-forecasts-private-20261017.json');
// The Funcas report the figures were typed from, checked against its stored fingerprint.
{ const s = priv.sources.find?.(x => x.snapshot) ?? Object.values(priv.sources ?? {}).find(x => x?.snapshot);
  if (s && createHash('sha256').update(read(s.snapshot)).digest('hex') !== s.sha256) throw new Error('The Funcas report is not the stored one'); }
// Since 1.73 the engine carries the Recovery Plan (PRTR) with its calendar (data/prtr-calendar-2026.js), the same
// amount in revenue and spending. The AIReF's tables are without PRTR (PFEMP, cuadros 17 and 19): each year, the
// engine's own PRTR comes off its revenue and spending before comparing.
const prtr = p => 100 * p.fiscalComposition.temporaryMatchedRevenue / p.gdp;
const prtrSpending = p => 100 * p.fiscalComposition.temporaryMatchedSpending / p.gdp;
out.prtr = Object.fromEntries([2026, 2027, 2028, 2029, 2030, 2031].map(y => [y, prtr(at(base, y))]));
const short = year => {
  const p = at(base, year), q = at(base, year - 1);
  return { realGrowth: q ? 100 * (p.gdp / q.gdp - 1) : null, inflation: q ? 100 * (p.priceIndex / q.priceIndex - 1) : null,
    employmentGrowth: q ? 100 * (workers(p) / workers(q) - 1) : null, nominalGDPbn: p.gdp * p.priceIndex / 1e9,
    debtGDP: p.debtGDP, balanceGDP: p.stateBalanceGDP, primaryGDP: 100 * p.primaryBalance / p.gdp, interestGDP: 100 * p.interest / p.gdp,
    revenueGDP: 100 * p.totalPublicRevenue / p.gdp, spendingGDP: 100 * p.totalPublicSpending / p.gdp, taxesGDP: 100 * p.fiscalComposition.taxes / p.gdp };
};
const imf = intl.datasets.find(d => d.id === 'imf-articleiv-may2026');
out.imf = imf.annual.map(r => ({ year: r.year, sim: short(r.year), ref: { realGrowth: r.realGDPGrowthPct, inflation: r.hicpAverageInflationPct, employmentGrowth: r.employmentGrowthPct,
  nominalGDPbn: r.nominalGDPBillionEUR, debtGDP: r.governmentGrossDebtMaastrichtGDPpct, balanceGDP: r.governmentNetLendingBorrowingGDPpct,
  primaryGDP: r.governmentNetLendingBorrowingGDPpct + r.governmentInterestExpenseGDPpct, interestGDP: r.governmentInterestExpenseGDPpct, revenueGDP: r.governmentRevenueGDPpct,
  spendingGDP: r.governmentExpenditureGDPpct, taxesGDP: r.governmentTaxesGDPpct } }));
out.funcas = priv.centralForecast.years.map(r => ({ year: r.year, sim: short(r.year), ref: { realGrowth: r.realGDPGrowthPct, inflation: r.cpiAnnualAverageGrowthPct,
  employmentGrowth: r.employmentEPAGrowthPct, nominalGDPbn: r.nominalGDPBillionEUR, debtGDP: r.generalGovernmentDebtGDPpct, balanceGDP: r.generalGovernmentBalanceGDPpct } }));
console.log('4 · Corto plazo, deuda % PIB (simulador | fuente):');
console.log('  FMI   ', out.imf.map(r => `${r.year} ${f(r.sim.debtGDP)}|${f(r.ref.debtGDP)}`).join('  '));
console.log('  Funcas', out.funcas.map(r => `${r.year} ${f(r.sim.debtGDP)}|${f(r.ref.debtGDP)}`).join('  '));

// ---------- 4b · Why the debt parts from the IMF's: the debt identity, one block at a time ----------
// d_t = d_{t−1}·Y_{t−1}/Y_t + interest_t − primary_t (all % of GDP; Y nominal). The simulator's path is swapped,
// block by block, for the IMF's primary balance, nominal GDP, interest and opening debt. What is left between the
// IMF's figures through the identity and its published debt is its own stock-flow adjustment.
{
  const blocks = w => out.imf.map(r => ({ debt: r[w].debtGDP, Y: r[w].nominalGDPbn, int: r[w].interestGDP, pb: r[w].primaryGDP }));
  const sim = blocks('sim'), imf = blocks('ref');
  const identity = src => { let d = src[0].debt; return src.map((x, i) => (i ? (d = d * src[i - 1].Y / x.Y + x.int - x.pb) : d)); };
  const swap = keys => identity(sim.map((x, i) => ({ ...x, ...Object.fromEntries(keys.map(k => [k, imf[i][k]])) })));
  out.debtGap = { years: out.imf.map(r => r.year),
    paths: [
      ['Simulador', identity(sim)],
      ['Con el saldo primario del FMI', swap(['pb'])],
      ['Con el PIB nominal del FMI', swap(['Y'])],
      ['Con los intereses del FMI', swap(['int'])],
      ['Con los tres', swap(['pb', 'Y', 'int'])],
      ['Y con la deuda de partida del FMI', swap(['pb', 'Y', 'int', 'debt'])],
      ['FMI, publicado', imf.map(x => x.debt)]
    ].map(([label, values]) => ({ label, values })),
    primarySpending: { sim: out.imf.map(r => r.sim.spendingGDP - r.sim.interestGDP), imf: out.imf.map(r => r.ref.spendingGDP - r.ref.interestGDP) } };
  console.log('4b · Deuda frente al FMI, por la identidad:');
  for (const p of out.debtGap.paths) console.log('  ' + p.label.padEnd(36), p.values.map(v => f(v)).join(' '));
}

// ---------- 5 · The AIReF: the 2023 rule's average gross pension spending, 2022–2050 ----------
// The engine evaluates the rule as the AIReF does (src/shared/closing-clause.js); its first own evaluation (2028)
// gives its gross average, against the AIReF's 2026 study. Same window, same reading.
const published = PUBLISHED_EVALUATIONS.at(-1);
const own = base.closingClause?.evaluations?.find(e => !e.published);
out.airef = { source: published.source, year: own?.year ?? null,
  rows: [['Gasto bruto medio en pensiones 2022–2050, % del PIB', 100 * (own?.grossAverage ?? NaN), 100 * published.grossAverage],
    ['Impacto medio de las medidas de ingresos, % del PIB', 100 * (own?.impactAverage ?? NaN), 100 * published.impactAverage],
    ['Gasto neto medio, % del PIB (tope: 13,3 %)', 100 * (own?.net ?? NaN), 100 * published.net]].map(([label, sim, ref]) => ({ label, sim, ref })) };
console.log('5 · AIReF (' + published.source + '):');
for (const row of out.airef.rows) console.log('  ' + row.label.padEnd(56), f(row.sim, 2) + '|' + f(row.ref, 2));

// ---------- 5b · The AIReF's long-run debt (Estudio 1/2026, constant policies, no fiscal rules) ----------
// Its published points (O: gráficos 2, 3, 19, 22 and 29; págs. 61–71). Between points, nothing is filled in.
// The identity reruns the simulator's debt with its own nominal growth and interest and the AIReF primary
// balance, straight from 0 % (2025) to −2.1 % (2050): if it lands on 123 %, the gap is the primary balance.
const AIREF_FISCAL = (() => { const e = json('data/external-forecasts-airef-estudio-20260529.json');
  if (createHash('sha256').update(read(e.source.snapshot)).digest('hex') !== e.source.sha256) throw new Error('The AIReF Estudio 1/2026 is not the stored one');
  return { ...e, source: `AIReF, Estudio 1/2026 (29/05/2026), ${e.source.tables}` }; })();
{
  const fiscalYears = [2030, 2035, 2040, 2050];
  const sim = { debtGDP: y => at(base, y).debtGDP, primaryGDP: y => 100 * at(base, y).primaryBalance / at(base, y).gdp,
    interestGDP: y => 100 * at(base, y).interest / at(base, y).gdp, revenueGDP: y => 100 * at(base, y).totalPublicRevenue / at(base, y).gdp - prtr(at(base, y)),
    spendingGDP: y => 100 * at(base, y).totalPublicSpending / at(base, y).gdp - prtrSpending(at(base, y)), pensionsGDP: y => at(base, y).publicPensionSpendingGDP };
  const nominal = y => at(base, y).gdp * at(base, y).priceIndex;
  const rate = y => at(base, y).interest * at(base, y).priceIndex / (at(base, y - 1).debtGDP / 100 * nominal(y - 1));
  const identity = pb => { let d = at(base, 2026).debtGDP; const out2 = {}; for (let y = 2027; y <= 2050; y++) { d = d * (1 + rate(y)) * nominal(y - 1) / nominal(y) - pb(y); out2[y] = d; } return out2; };
  const airefPb = y => AIREF_FISCAL.primaryGDP[2025] + (AIREF_FISCAL.primaryGDP[2050] - AIREF_FISCAL.primaryGDP[2025]) * (y - 2025) / 25;
  const own = identity(sim.primaryGDP), swapped = identity(airefPb);
  out.airefDebt = { source: AIREF_FISCAL.source, years: fiscalYears,
    rows: [['debtGDP', 'Deuda, % del PIB'], ['revenueGDP', 'Ingresos, % del PIB (sin PRTR)'], ['spendingGDP', 'Gastos, % del PIB (intereses incluidos, sin PRTR)'],
      ['interestGDP', 'Intereses, % del PIB'], ['primaryGDP', 'Saldo primario, % del PIB']].map(([key, label]) => ({ key, label,
      sim: fiscalYears.map(sim[key]), ref: fiscalYears.map(y => AIREF_FISCAL[key][y] ?? null) })),
    pensions: fiscalYears.map(sim.pensionsGDP), pensions2050Airef: AIREF_FISCAL.pensions2050,
    identity: [{ label: 'Con el saldo primario del simulador', values: fiscalYears.map(y => own[y]) },
      { label: 'Con el saldo primario de la AIReF (de 0 % en 2025 a −2,1 % en 2050)', values: fiscalYears.map(y => swapped[y]) },
      { label: 'AIReF, publicado', values: fiscalYears.map(y => AIREF_FISCAL.debtGDP[y] ?? null) }] };
  console.log('5b · Deuda frente a la AIReF, por la identidad:');
  for (const p of out.airefDebt.identity) console.log('  ' + p.label.padEnd(70), p.values.map(v => f(v)).join(' '));
}

// ---------- 5c · The AIReF's medium term (2026–2030): its constant-policy path, rubric by rubric ----------
// Informe de seguimiento 2026 del PFEMP (O: cuadros 3, 17, 19 and 20; data/external-forecasts-airef-pfemp-20260514.json,
// its PDF checked against the stored fingerprint). Constant policies: it does not assume the fiscal plan is met.
{
  const mt = json('data/external-forecasts-airef-pfemp-20260514.json');
  if (createHash('sha256').update(read(mt.source.snapshot)).digest('hex') !== mt.source.sha256) throw new Error('The AIReF PFEMP report is not the stored one');
  const years = [2026, 2027, 2028, 2029, 2030];
  const ref = series => years.map(y => series[mt.years.indexOf(y)]);
  const g = (p, v) => 100 * v / p.gdp;
  const sim = fn => years.map(y => fn(at(base, y)));
  const rows = [
    ['Ingresos (sin PRTR)', sim(p => g(p, p.totalPublicRevenue) - prtr(p)), ref(mt.resources.total)],
    ['Gastos (intereses incluidos, sin PRTR)', sim(p => g(p, p.totalPublicSpending) - prtrSpending(p)), ref(mt.uses.total)],
    ['Saldo', sim(p => g(p, p.totalPublicRevenue - p.totalPublicSpending)), ref(mt.balance.values)],
    ['Intereses', sim(p => g(p, p.interest)), ref(mt.uses.interest)],
    ['IRPF', sim(p => g(p, p.fiscalComposition.personalIncomeTax)), ref(mt.resources.irpf)],
    ['Cotizaciones sociales', sim(p => g(p, p.totalContributions + p.fiscalComposition.otherSocialContributions)), ref(mt.resources.contributions)],
    ['Pensiones (simulador) · prestaciones en efectivo (AIReF)', sim(p => p.publicPensionSpendingGDP), ref(mt.uses.cashBenefits)]
  ].map(([label, s, r]) => ({ label, sim: s, ref: r }));
  // Growth of primary spending: the simulator's nominal growth (not net of revenue measures or one-offs) against the
  // plan's committed path and the AIReF's constant-policy net spending (cuadro 3). 2026 has no simulator growth: the run opens in 2026.
  // Net spending leaves out the programmes the EU pays: the simulator's PRTR comes off too (since 1.73).
  const gy = [2026, 2027, 2028, 2029, 2030, 2031];
  const prim = y => (at(base, y).totalPublicSpending - at(base, y).interest - at(base, y).fiscalComposition.temporaryMatchedSpending) * at(base, y).priceIndex;
  const ng = mt.netSpendingGrowth, pick = s => gy.map(y => s[ng.years.indexOf(y)]);
  out.airefMediumTerm = { source: `AIReF, ${mt.source.title} (${mt.source.publicationDate.split('-').reverse().join('/')})`,
    tables: 'cuadros 3, 17, 19 y 20, págs. 16, 67, 68 y 72', years, rows,
    growth: { years: gy, sim: gy.map(y => at(base, y - 1) ? 100 * (prim(y) / prim(y - 1) - 1) : null), plan: pick(ng.plan), airef: pick(ng.airefConstantPolicies) },
    adjustment: mt.adjustment,
    // Why the ratios part although the euros do not: nominal GDP and employment (cuadro 16, pág. 46) against the simulator's.
    macro: (() => {
      const mi = y => mt.macro.years.indexOf(y);
      const nomAiref = Object.fromEntries([2027, 2028, 2029, 2030].map(y => [y, mt.macro.nominalGDP[mi(y)]])), empAiref = Object.fromEntries([2027, 2028, 2029, 2030].map(y => [y, mt.macro.employmentFTE[mi(y)]]));
      const nominal = p => p.gdp * p.priceIndex, my = [2027, 2028, 2029, 2030];
      const cum = Object.values(nomAiref).reduce((x, v) => x * (1 + v / 100), 1);
      const a26 = at(base, 2026), a30 = at(base, 2030), euros = fn => 100 * (fn(a30) / fn(a26) - 1);
      return { years: my, simNominal: my.map(y => 100 * (nominal(at(base, y)) / nominal(at(base, y - 1)) - 1)), airefNominal: my.map(y => nomAiref[y]),
        simEmployment: my.map(y => 100 * (at(base, y).workers / at(base, y - 1).workers - 1)), airefEmployment: my.map(y => empAiref[y]),
        cumulative: { sim: euros(nominal), airef: 100 * (cum - 1) },
        primarySpendingEuros: { sim: euros(p => (p.totalPublicSpending - p.interest) * p.priceIndex), airef: 100 * ([2027, 2028, 2029, 2030].reduce((x, y) => x * (1 + ng.airefConstantPolicies[ng.years.indexOf(y)] / 100), 1) - 1) },
        // The AIReF's pensions: 13,0 % of GDP in 2025 and 13,5 % in 2030 (Estudio 1/2026, cuadro 12); 2026 interpolated, 13,1 %.
        pensionsEuros: { sim: euros(p => p.publicPensionSpendingGDP * nominal(p)), airef: 100 * (13.5 / 13.1 * cum - 1) },
        spending2030WithAirefGdp: 100 * a30.totalPublicSpending * a30.priceIndex / (nominal(a26) * cum) };
    })(),
    // The same rules without the option «Empleo e inflación hasta 2030 como prevé la AIReF», the default since 1.69:
    // the Ageing Report employment and the scenario's inflation.
    withoutOption: (() => {
      const r = run({ airefShortRunEmployment: 0 }), rp = y => at(r, y);
      return { balance: years.map(y => 100 * (rp(y).totalPublicRevenue - rp(y).totalPublicSpending) / rp(y).gdp),
        debt2050: rp(2050).debtGDP, debt2050Base: at(base, 2050).debtGDP, debt2070: rp(2070).debtGDP, debt2070Base: at(base, 2070).debtGDP };
    })() };
  console.log('5c · AIReF a medio plazo, simulador|AIReF:', years.join(' · '));
  for (const r of rows) console.log('  ' + r.label.padEnd(56), r.sim.map((v, i) => `${f(v)}|${f(r.ref[i])}`).join('  '));
  console.log('  Crecimiento del gasto primario (sim · plan · AIReF):', gy.map((y, i) => `${y} ${f(out.airefMediumTerm.growth.sim[i])}·${f(out.airefMediumTerm.growth.plan[i])}·${f(out.airefMediumTerm.growth.airef[i])}`).join('  '));
}

// ---------- 6 · The systems and their starting assumptions (Metodología, «Los sistemas y sus supuestos») ----------
// For each system of the comparison, with the starting settings: the settings it fixes (those that differ from the
// starting configuration), the share of the retirement contribution that goes to each pillar, year by year, as the
// engine measures it (effective weights since 1.72), and, in a transition, the share that goes to the fund by age in
// 2026 once the change has finished (cohortTransitionWeights, the engine's own function; nobody is left of today's
// pensioners). The 1985 counterfactual starts in 1985: its table by age would not read as the others', so it has none.
{
  const SYS_YEARS = [2027, 2030, 2035, 2040, 2050, 2060, 2070];
  const AGES = [25, 30, 35, 40, 44, 48, 52, 56, 60];
  const round = v => Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null;
  const exact = v => Number.isFinite(v) ? v : null;
  out.systems = comparisonConfigs(DEFAULT_CONFIG, { includeRetro1985: true, includeMixedGradual: true }).map(entry => {
    const config = validateConfig(entry.config);
    const result = simulate(config);
    const weights = SYS_YEARS.map(year => { const r = at(result, year);
      return { year, payg: round(r?.effectivePaygWeight), ndc: round(r?.effectiveNdcWeight), funded: round(r?.effectiveFundedWeight) }; });
    const transition = config.transitionMode !== 'none' && entry.key !== 'retro1985';
    const endYear = 2026 + Math.max(config.transitionYears ?? 20, 1);
    const byAge = transition ? AGES.map(age => {
      const w = cohortTransitionWeights({ birthYear: 2026 - age }, Math.max(endYear, 2027), config, weightsFor(config), 2026, 0);
      return { age, payg: round(w.payg), ndc: round(w.ndc), funded: round(w.funded) };
    }) : null;
    const last = at(result, 2070);
    // The fund's return, as the engine gives it to a worker of 40 in 2040 with no market fall: net of the fee while
    // saving, and the rate the annuity is computed with. Only where something goes to a fund.
    const fund = weights.some(w => w.funded > 0) ? (r => ({ style: config.capitalizationStyle, realReturn: config.realReturn, feeRate: config.feeRate,
      netActive: round(r.headlineNetReturn), annuityRate: round(r.retirementYieldNet) }))(cohortCapitalizationReturns({ age: 40, year: 2040, config, previousDebtGDP: 100 })) : null;
    return { key: entry.key, label: entry.label, weights, byAge, fund,
      // The outcome is stored unrounded: the page rounds once, as the console does (0.584999 is 58 %, not 0.585 → 59 %).
      outcome: { debt2050: exact(at(result, 2050)?.debtGDP), debt2070: exact(last?.debtGDP), fund2070: exact(last?.fundedAssetsGDP),
        replacement2050: exact(at(result, 2050)?.replacementRate) } };
  });
  console.log('6 · Sistemas: parte de la cotización al fondo en 2070:', out.systems.map(s => `${s.key} ${s.weights.at(-1).funded}`).join(' · '));
}

writeFileSync(new URL('../data/external-contrast.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
console.log('data/external-contrast.json');
