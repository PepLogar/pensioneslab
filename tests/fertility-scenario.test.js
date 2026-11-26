import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIRST_FERTILITY_BIRTH_YEAR, FIRST_FERTILITY_WORK_YEAR,
  referenceFertility, fertilityFactor, fertilityEntryFactor, validateTargetFertility
} from '../src/fertility-scenario.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12,
  `${actual} differs from ${expected}`);

test('reference and pre-reform birth cohorts keep their size exactly', () => {
  for (const birthYear of [1926, 2004, 2022, 2026, 2027, 2048, 2070]) {
    assert.equal(fertilityFactor(birthYear, 0), 1);
  }
  for (const target of [.8, 1, 1.1, 2.1]) {
    for (const birthYear of [1926, 2004, 2022, 2026]) {
      assert.equal(fertilityFactor(birthYear, target), 1);
    }
  }
});

// Since 1.55 the reference is EUROPOP2025's own series by birth year (sum of the rates by age).
test('persistent fertility scales a birth cohort once against the identified reference', () => {
  assert.equal(referenceFertility(2025), 1.10738);
  assert.equal(referenceFertility(2030), 1.13097);
  assert.equal(referenceFertility(2050), 1.21568);
  assert.equal(referenceFertility(2070), 1.30055);
  assert.equal(referenceFertility(2100), 1.42783);
  assert.equal(referenceFertility(2027), 1.11831);
  assert.equal(referenceFertility(2035), 1.15201);
  close(fertilityFactor(2027, 1.1), 1.1 / 1.11831);
  close(fertilityFactor(2035, 1), 1 / 1.15201);
  close(fertilityFactor(2035, 1.1), 1.1 / 1.15201);
  close(fertilityFactor(2035, 1.1) / fertilityFactor(2035, 1), 1.1);
  assert.ok(fertilityFactor(2035, 2.1) > 1);
  assert.equal(validateTargetFertility(1.05), 1.05);
});

test('the 2027 birth cohort first affects age-22 entries in 2049, never earlier or twice', () => {
  assert.equal(FIRST_FERTILITY_BIRTH_YEAR, 2027);
  assert.equal(FIRST_FERTILITY_WORK_YEAR, 2049);
  const entry = { birthYear: 2027, targetFertility: 1.1, source: 'young' };
  assert.equal(fertilityEntryFactor({ ...entry, entryYear: 2048 }), 1);
  close(fertilityEntryFactor({ ...entry, entryYear: 2049 }), 1.1 / 1.11831);
  assert.equal(fertilityEntryFactor({ ...entry, entryYear: 2050 }), 1);
  assert.equal(fertilityEntryFactor({ ...entry, birthYear: 2026, entryYear: 2048 }), 1);
  close(fertilityEntryFactor({ ...entry, entryYear: 2052, entryAge: 25 }), 1.1 / 1.11831);
});

test('the separately allocated adult migration is unchanged, including migration at entry age', () => {
  const young = Object.freeze({ birthYear: 2027, entryYear: 2049, targetFertility: 1,
    source: 'young' });
  const migrationAt22 = Object.freeze({ ...young, source: 'migration' });
  const olderMigration = Object.freeze({ ...migrationAt22, entryYear: 2055 });
  const youngCount = 1_000, migrantCount = 200;
  assert.equal(fertilityEntryFactor(migrationAt22), 1);
  assert.equal(fertilityEntryFactor(olderMigration), 1);
  const entrants = youngCount * fertilityEntryFactor(young) +
    migrantCount * fertilityEntryFactor(migrationAt22);
  close(entrants, 1_000 / 1.11831 + 200);
  close((youngCount + migrantCount) - entrants, 1_000 * (1 - 1 / 1.11831));
  assert.equal(young.birthYear, 2027);
  assert.equal(migrationAt22.source, 'migration');
});

test('invalid targets or calendars fail instead of silently becoming a fertility scenario', () => {
  for (const target of [-1, .79, 2.11, NaN, Infinity, null, '1.1']) {
    assert.throws(() => fertilityFactor(2030, target), RangeError);
  }
  // The calendar reaches 2100 for long-horizon runs, with EUROPOP2025's own values after 2070.
  for (const year of [0, 2027.5, 2101, NaN, Infinity, '2027']) {
    assert.throws(() => fertilityFactor(year, 0), RangeError);
  }
  assert.equal(referenceFertility(2085), 1.3642);
  assert.throws(() => referenceFertility(2024), RangeError);
  assert.throws(() => fertilityEntryFactor({ birthYear: 2030, entryYear: 2029,
    source: 'young' }), RangeError);
  assert.throws(() => fertilityEntryFactor({ birthYear: 2030, entryYear: 2052,
    source: 'unknown' }), RangeError);
  assert.throws(() => fertilityEntryFactor({ birthYear: 2030, entryYear: 2052,
    source: 'young', entryAge: 22.5 }), RangeError);
});
