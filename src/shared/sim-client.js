// Simulation client of the console:
//  1. an in-memory cache keyed by the canonical config;
//  2. a pool of Web Workers so the comparison of systems runs in parallel across cores.
// Pensiones Lab 3 has no precomputed results: everything is computed in the worker (docs/DECISIONES.md).
import { simulationKey, canonicalConfig } from './sim-key.js';

const cache = new Map();
const pending = new Map();
const pool = [];
// Leave one core for the page; at most 8 workers (each run holds ~64,000 cohorts).
const POOL_SIZE = typeof navigator !== 'undefined'
  ? Math.min(8, Math.max(2, (navigator.hardwareConcurrency || 4) - 1))
  : 4;
let workerBroken = false;
let nextId = 1;
const callbacks = new Map();

// An error the engine raised inside the worker, rebuilt with its type and marked so it is not run again.
function engineError(message, name) {
  const Type = { RangeError, TypeError, SyntaxError }[name] ?? Error;
  const error = new Type(message);
  error.fromEngine = true;
  return error;
}

function spawnSlot() {
  try {
    const worker = new Worker(new URL('./sim-worker.js', import.meta.url), { type: 'module' });
    const slot = { worker, busy: 0 };
    worker.addEventListener('message', event => {
      slot.busy = Math.max(0, slot.busy - 1);
      const callback = callbacks.get(event.data.id);
      if (!callback) return;
      callbacks.delete(event.data.id);
      if (event.data.error) callback.reject(engineError(event.data.error, event.data.errorName));
      else callback.resolve(event.data.result);
    });
    // The worker itself died: stop every worker of the pool; the pending runs go to the main thread.
    worker.addEventListener('error', () => {
      workerBroken = true;
      for (const callback of callbacks.values()) callback.reject(new Error('worker'));
      callbacks.clear();
      for (const s of pool) { try { s.worker.terminate(); } catch { /* already gone */ } }
      pool.length = 0;
    });
    pool.push(slot);
    return slot;
  } catch {
    workerBroken = true;
    return null;
  }
}

function acquireWorkerSlot() {
  if (workerBroken) return null;
  const idle = pool.find(s => s.busy === 0);
  if (idle) return idle;
  if (pool.length < POOL_SIZE) return spawnSlot();
  return pool.reduce((best, s) => (s.busy < best.busy ? s : best), pool[0]);
}

async function simulateOnMainThread(config, runtime = null) {
  const { simulate } = await import('../simulation.js');
  return simulate(config, runtime);
}

function runInWorker(config, runtime = null) {
  const slot = acquireWorkerSlot();
  if (!slot) return simulateOnMainThread(config, runtime);
  const id = nextId++;
  slot.busy++;
  return new Promise((resolve, reject) => {
    callbacks.set(id, { resolve, reject });
    slot.worker.postMessage({ id, config, runtime });
  }).catch(error => {
    // The engine refused the config: the same run on the main thread would only refuse it again, slower.
    if (error?.fromEngine) throw error;
    return simulateOnMainThread(config, runtime);
  });
}

/** Runs with run-only options (e.g. a market path). Never cached: each path is new. */
export function simulateWithRuntime(config, runtime) {
  return runInWorker(canonicalConfig(config), runtime);
}

/** Returns a cached result synchronously, or null. */
export function peekSimulation(config) {
  return cache.get(simulationKey(config)) ?? null;
}

/** Resolves with the simulation result for `config`. */
export async function simulateAsync(config) {
  const key = simulationKey(config);
  if (cache.has(key)) return cache.get(key);
  if (pending.has(key)) return pending.get(key);
  const canonical = canonicalConfig(config);
  const promise = runInWorker(canonical).then(result => {
    pending.delete(key);
    if (cache.size >= 64) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return result;
  }, error => { pending.delete(key); throw error; });
  pending.set(key, promise);
  return promise;
}

