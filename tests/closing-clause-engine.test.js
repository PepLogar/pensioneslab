import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/model-current-v10.js';
import { AIREF_2026_IMPACT, CLOSING_CLAUSE_RULE, SPENDING_BEFORE_BASE, windowAverage } from '../src/shared/closing-clause.js';

const runs = new Map();
// The clause's accounting with the 1.53 Laffer response (a revenue line only). With the full
// response of 1.54 the surcharge also lowers the hours, and payroll no longer stays the same.
const run = (patch = {}) => {
  const key = JSON.stringify(patch);
  if (!runs.has(key)) runs.set(key, simulate({ ...DEFAULT_CONFIG, lafferFullResponse: 0, ...patch }));
  return runs.get(key);
};
const close = (a, b, tolerance) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
const byYear = result => new Map(result.years.map(row => [row.year, row]));

const withoutConfig = ({ config, ...rest }) => rest;
// Since 1.55 (EUROPOP2025) «seguir igual» stays under the limit: 2022–2050 gross spending averages
// 14.6 % of GDP, 13.0 % net of the measures, as in the AIReF's 2026 evaluation. The clause's
// accounting is checked on a run that does exceed it: everyone retiring at 64 (S, a test case).
// With the frozen 2026 ages (the default up to 1.67): with the Ageing Report path, the default since 1.68, this case no longer crosses the limit.
const PRESSURE = { retirementAge: 64, retirementAgeExitPath: 0 };

test("on by default in today’s PAYG law; other systems carry it only when activated by hand", () => {
  const defaults = validateConfig(DEFAULT_CONFIG);
  assert.equal(defaults.closingClause, 'airef');
  assert.equal(defaults.closingClauseAnySystem, 0);
  assert.equal(validateConfig({ ...DEFAULT_CONFIG, closingClause: 'strict' }).closingClause, 'strict');
  assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, closingClause: 'literal' }), RangeError);
  assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, closingClauseAnySystem: 2 }), RangeError);
  assert.ok(Object.hasOwn(run(), 'closingClause'));
  const off = run({ closingClause: 'off' });
  assert.equal(Object.hasOwn(off, 'closingClause'), false);
  assert.ok(off.years.every(row => !Object.hasOwn(row, 'closingClauseRate')));
  // Another system replaces today's law: by default it runs exactly as with the clause off.
  const ndc = run({ system: 'ndc' });
  assert.equal(Object.hasOwn(ndc, 'closingClause'), false);
  assert.deepEqual(withoutConfig(ndc), withoutConfig(run({ system: 'ndc', closingClause: 'off' })));
  assert.ok(Object.hasOwn(run({ system: 'ndc', closingClauseAnySystem: 1 }), 'closingClause'));
});

test('the evaluations look at the run without the surcharge, from the observed years on', () => {
  const off = byYear(run({ ...PRESSURE, closingClause: 'off' })), on = run(PRESSURE);
  const evaluations = on.closingClause.evaluations;
  assert.deepEqual(evaluations.filter(row => row.published).map(row => row.year), [2025, 2026]);
  const first = evaluations.find(row => !row.published);
  assert.equal(first.year, 2028);
  const gross = windowAverage(year => off.get(year)?.publicPensionSpendingGDP / 100 || SPENDING_BEFORE_BASE[year]);
  close(first.grossAverage, gross, 1e-12);
  close(first.impactAverage, AIREF_2026_IMPACT.total, 1e-12);
  // In the pressure case the engine's own projection exceeds the limit (S, not a forecast).
  // 1.66: about 0.0057 (0.001–0.004 up to 1.65), since the frozen ages now take older workers away.
  // 1.76: about 0.0008, since cohorts die at the age of EUROPOP (age + 0,5) and 2027 has no bulge of new pensions.
  assert.ok(first.exceeds && first.excess > 0.0003 && first.excess < 0.008, `excess ${first.excess}`);
  // In the reference scenario it does not (1.55): no surcharge at all.
  assert.equal(run().closingClause.ramps.length, 0);
  assert.ok(run().closingClause.evaluations.filter(row => !row.published).every(row => !row.exceeds));
  assert.equal(on.closingClause.ramps[0].start, 2029);
  close(on.years.find(row => row.year === 2029).closingClauseRate, 0.2 * first.excess / off.get(2029).payrollGDP, 1e-15);
});

test('the surcharge enters once, as MEI, rate × payroll; nothing else moves before 2029 or on the spending side', () => {
  const off = byYear(run({ ...PRESSURE, closingClause: 'off' })), on = run(PRESSURE);
  let previousRate = 0;
  for (const row of on.years) {
    const base = off.get(row.year);
    if (row.year === on.years[0].year) continue;
    const payroll = row.workers * row.wage;
    assert.equal(payroll, base.workers * base.wage, `${row.year} payroll`);
    assert.equal(row.closingClauseContributions, payroll * row.closingClauseRate);
    const extra = row.closingClauseContributions, tolerance = 1e-9 * row.totalContributions;
    close(row.protectedContributions - base.protectedContributions, extra, tolerance);
    close(row.publicContributions - base.publicContributions, extra, tolerance);
    close(row.totalContributions - base.totalContributions, extra, tolerance);
    close(row.meiContributions - base.meiContributions, extra, tolerance);
    assert.equal(row.retirementContributions, base.retirementContributions);
    assert.equal(row.fundedContributions, base.fundedContributions);
    assert.equal(row.publicBenefits, base.publicBenefits, `${row.year} benefits`);
    if (row.year <= 2028) {
      const { closingClauseRate, closingClauseContributions, ...rest } = row;
      assert.equal(closingClauseRate, 0);
      assert.deepEqual(rest, base, `${row.year} before the first rise`);
    }
    // The rate never falls while the MEI lasts and ends with it in 2050.
    if (row.year <= CLOSING_CLAUSE_RULE.meiLastYear) assert.ok(row.closingClauseRate >= previousRate - 1e-15, `${row.year}`);
    else assert.equal(row.closingClauseRate, 0);
    previousRate = row.closingClauseRate;
  }
  assert.ok(on.years.find(row => row.year === 2050).closingClauseRate > 0);
});

test('the strict reading asks for more, and a higher contribution rate counts as a revenue measure', () => {
  const rateIn = (result, year) => result.years.find(row => row.year === year).closingClauseRate;
  const airef = run(PRESSURE), strict = run({ ...PRESSURE, closingClause: 'strict' });
  assert.ok(rateIn(strict, 2050) > rateIn(airef, 2050));
  const higher = run({ contributionRate: DEFAULT_CONFIG.contributionRate + 0.02 });
  const first = higher.closingClause.evaluations.find(row => !row.published);
  assert.ok(first.impactAverage > AIREF_2026_IMPACT.total + 0.005, `impact ${first.impactAverage}`);
  // Exactly the extra contributions of the run without the surcharge, as a share of its GDP:
  // nothing in 2026, whose opening row runs the reference rates, and the window is 2022–2050.
  const higherOff = byYear(run({ contributionRate: DEFAULT_CONFIG.contributionRate + 0.02, closingClause: 'off' }));
  const baseOff = byYear(run({ closingClause: 'off' }));
  assert.equal(higherOff.get(2026).totalContributions, baseOff.get(2026).totalContributions);
  const extra = windowAverage(year => higherOff.has(year)
    ? (higherOff.get(year).totalContributions - baseOff.get(year).totalContributions) / higherOff.get(year).gdp : 0);
  close(first.impactAverage, AIREF_2026_IMPACT.total + extra, 1e-12);
  assert.equal(higher.closingClause.ramps.length, 0);
  // The base-year row is the opening snapshot and carries no clause fields.
  assert.ok(higher.years.every(row => (row.closingClauseRate ?? 0) === 0));
});
