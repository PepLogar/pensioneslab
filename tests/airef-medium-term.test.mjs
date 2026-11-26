// The AIReF's medium-term path typed from its PFEMP follow-up report (data/external-forecasts-airef-pfemp-20260514.json):
// the figures hold together as published (components add up to totals within rounding, the balance is resources minus
// uses, the cumulative growth is the yearly one), and the contrast shows them. A typo in the transcription fails here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const mt = read('data/external-forecasts-airef-pfemp-20260514.json');
const contrast = read('data/external-contrast.json');
const ROUND = 0.15; // each published figure is rounded to one decimal
const near = (a, b, label, tol = ROUND) => assert.ok(Math.abs(a - b) <= tol + 1e-9, `${label}: ${a} vs ${b}`);
const sum = (...series) => i => series.reduce((s, x) => s + x[i], 0);

test('the AIReF path adds up as published', () => {
  const r = mt.resources, u = mt.uses;
  mt.years.forEach((year, i) => {
    near(sum(r.taxes, r.contributions, r.otherResources)(i), r.total[i], `${year} resources`);
    near(sum(r.production, r.income, r.capital)(i), r.taxes[i], `${year} taxes`);
    near(sum(r.vat, r.productTaxes, r.otherProduction)(i), r.production[i], `${year} production taxes`);
    near(sum(r.irpf, r.corporate, r.otherCurrent)(i), r.income[i], `${year} income taxes`);
    near(sum(u.compensation, u.intermediate, u.inKind, u.cashBenefits, u.interest, u.investment, u.subsidies, u.capitalTransfers, u.other)(i), u.total[i], `${year} uses`, 0.2);
    near(r.total[i] - u.total[i], mt.balance.values[i], `${year} balance`);
  });
});

test('the cumulative spending growth is the yearly one', () => {
  // Cuadro 3 counts from 2023: the 2025 cumulative already holds 2024's growth, and the 2024 column shows 0,0.
  // Only the plan's row compounds exactly; the AIReF's published cumulative (15,7 in 2026) does not come from
  // compounding its own yearly rates (15,4), so it is kept as published and not checked.
  const g = mt.netSpendingGrowth;
  for (const [yearly, cumulative] of [[g.plan, g.planCumulative]]) {
    let level = 1 + yearly[0] / 100;
    g.years.forEach((year, i) => { if (i === 0) return; level *= 1 + yearly[i] / 100; near(100 * (level - 1), cumulative[i], `${year}`, 0.3); });
  }
});

test('the contrast shows the AIReF medium term, from the stored report', () => {
  const am = contrast.airefMediumTerm;
  assert.ok(am, 'run node scripts/contrast-external.mjs');
  assert.equal(contrast.sources.airefMediumTerm, 'data/external-forecasts-airef-pfemp-20260514.json');
  assert.deepEqual(am.years, [2026, 2027, 2028, 2029, 2030]);
  for (const row of am.rows) assert.ok(row.sim.every(Number.isFinite) && row.ref.every(Number.isFinite), row.label);
  assert.deepEqual(am.rows[0].ref, mt.resources.total.slice(1));
  assert.ok(Number.isFinite(am.macro.spending2030WithAirefGdp));
});
