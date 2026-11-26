import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { simulate } from '../src/simulation.js';
import { SIMULATION_METHODOLOGY } from '../src/simulation-methodology.js';
import { DEFAULT_CONFIG } from '../src/shared/default-config.js';
import { FLAGSHIP_PROGRESSIVE } from '../src/shared/scenario-labels.js';

// Performance work on the engine must not change a single digit: these hashes
// were taken before the 25/10/2026 optimization (single-pass totals, cached
// survival). A deliberate change of results needs a new methodology version.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/engine-identity-hashes.json', import.meta.url), 'utf8'));
const configs = {
  payg: { ...DEFAULT_CONFIG },
  progressive: { ...DEFAULT_CONFIG, ...FLAGSHIP_PROGRESSIVE },
  measures: { ...DEFAULT_CONFIG,
    paymentAdjustments: [{ year: 2030, publicPensionCut: 0.05, otherSpendingCut: 0.03 }],
    fiscalRescues: [{ year: 2035, vatGeneralRate: 0.25, vatReducedRate: 0.1, vatSuperReducedRate: 0.04, irpfExtraPoints: 0.03, irpfThreshold: 30000 }],
    debtRestructurings: [{ year: 2045, haircut: 0.2, termYears: 20, nominalRate: 0.03, fundedSovereignShare: 0.15, creditorDiscountRate: 0.03 }] }
};

test('the optimized engine reproduces the previous results bit for bit', () => {
  assert.equal(fixture.methodologyVersion, SIMULATION_METHODOLOGY, 'methodology changed: regenerate the identity fixture deliberately');
  for (const [name, config] of Object.entries(configs)) {
    const hash = createHash('sha256').update(JSON.stringify(simulate(config))).digest('hex');
    assert.equal(hash, fixture.hashes[name], name);
  }
});
