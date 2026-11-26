// «Supuestos de otros» (src/domain/reference-profiles.js): each profile, run by the engine, stays near the figures
// of the institution it approximates. If the engine changes and a profile drifts, this says so.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { validateConfig } from '../src/shared/default-config.js';
import { SPENDING_BEFORE_BASE } from '../src/shared/closing-clause.js';
import { REFERENCE_PROFILES, profileConfig, isReferenceProfile, referenceProfile } from '../src/domain/reference-profiles.js';

for (const profile of REFERENCE_PROFILES) {
  // Each profile says how near it must stay (profile.tolerance); by default, 0.1 points of pension spending.
  const tol = { spending: 0.1, debt: 3, ...(profile.tolerance ?? {}) };
  test(`${profile.name}: it stays within ${tol.spending} points of the published pension spending${profile.targets.debt2050 ? ` and ${tol.debt} of the debt of 2050` : ''}`, () => {
    assert.ok(isReferenceProfile(profile.id));
    assert.equal(referenceProfile(profile.id), profile);
    const config = profileConfig(profile);
    validateConfig(config);
    const result = simulate(config);
    const gross = year => result.years.find(row => row.year === year)?.publicPensionSpendingGDP ?? 100 * SPENDING_BEFORE_BASE[year];
    let sum = 0;
    for (let year = 2022; year <= 2050; year++) sum += gross(year);
    const average = sum / 29;
    assert.ok(Math.abs(average - profile.targets.grossAverage2022to2050) <= tol.spending, `media ${average}`);
    assert.ok(Math.abs(gross(2050) - profile.targets.spending2050) <= tol.spending, `2050 ${gross(2050)}`);
    if (profile.targets.debt2050) assert.ok(Math.abs(result.years.find(row => row.year === 2050).debtGDP - profile.targets.debt2050) <= tol.debt, `deuda 2050`);
    // The figures the profile's text gives are the engine's, so a recalibration keeps the text true (review, 36).
    const debtSaid = /\((\d+) % frente al/.exec(profile.says)?.[1];
    if (debtSaid) assert.equal(Number(debtSaid), Math.round(result.years.find(row => row.year === 2050).debtGDP), 'deuda del texto');
    const spendingSaid = /(\d+,\d) % del PIB en 2050/.exec(profile.says)?.[1];
    if (spendingSaid) assert.equal(spendingSaid, gross(2050).toFixed(1).replace('.', ','), 'gasto del texto');
  });
}

test('a saved scenario id is never a reference profile', () => {
  assert.equal(isReferenceProfile('custom-123'), false);
  assert.equal(referenceProfile('custom-123'), null);
});
