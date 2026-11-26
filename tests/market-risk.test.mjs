// «Riesgo de mercado» (riesgo.html): the paths are reproducible from the seed and have the volatility asked
// for; a path of zeros gives the run without shocks; a better market gives a larger fund; the fan is a
// standalone SVG.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../src/simulation.js';
import { DEFAULT_CONFIG, validateConfig } from '../src/shared/default-config.js';
import { FLAGSHIP_PROGRESSIVE } from '../src/shared/scenario-labels.js';
import { returnPaths, percentile, summarizeMarketRun, aggregateMarketRuns } from '../src/domain/market-risk.js';
import { fanSvg } from '../src/views/fan-svg.js';

test('the paths: same seed, same draws; the volatility asked for; memory keeps it', () => {
  assert.deepEqual(returnPaths({ paths: 3, seed: 7 }), returnPaths({ paths: 3, seed: 7 }));
  assert.notDeepEqual(returnPaths({ paths: 3, seed: 7 }), returnPaths({ paths: 3, seed: 8 }));
  for (const memory of [0, 0.3]) {
    const all = returnPaths({ paths: 400, sigma: 0.1, seed: 1, memory }).flatMap(p => Object.values(p));
    const mean = all.reduce((a, b) => a + b, 0) / all.length;
    const sd = Math.sqrt(all.reduce((a, b) => a + (b - mean) ** 2, 0) / all.length);
    assert.ok(Math.abs(mean) < 0.005 && Math.abs(sd - 0.1) < 0.005, `memory ${memory}: mean ${mean}, sd ${sd}`);
  }
  assert.equal(percentile([1, 2, 3, 4, 5], 50), 3);
});

test('the engine: zeros change nothing, a better market a larger fund', () => {
  const config = validateConfig({ ...DEFAULT_CONFIG, ...FLAGSHIP_PROGRESSIVE });
  const base = simulate(config);
  const zero = Object.fromEntries(base.years.filter(y => y.year >= 2027).map(y => [y.year, 0]));
  assert.equal(simulate(config, { returnShocks: zero }).years.at(-1).fundedAssetsGDP, base.years.at(-1).fundedAssetsGDP);
  const better = Object.fromEntries(Object.keys(zero).map(y => [y, 0.02]));
  assert.ok(simulate(config, { returnShocks: better }).years.at(-1).fundedAssetsGDP > base.years.at(-1).fundedAssetsGDP);
  const agg = aggregateMarketRuns([summarizeMarketRun(base), summarizeMarketRun(simulate(config, { returnShocks: better }))], summarizeMarketRun(base));
  const svg = fanSvg(agg.fundFan, summarizeMarketRun(base).fundPath, { title: 'Fondo', axis: '% del PIB', stamp: ['sello'], desc: 'cita' });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.equal((svg.match(/<path /g) ?? []).length, 4);
  assert.match(svg, /<desc>cita<\/desc>/);
});
