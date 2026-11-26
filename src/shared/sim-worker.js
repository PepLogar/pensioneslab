// Runs the actuarial engine off the main thread so the page never freezes.
import { simulate } from '../simulation.js';

self.addEventListener('message', event => {
  const { id, config, runtime = null } = event.data;
  try {
    const result = simulate(config, runtime);
    self.postMessage({ id, result });
  } catch (error) {
    // An engine error: the client gives it to the caller as it is, without running the config again.
    self.postMessage({ id, error: error?.message || String(error), errorName: error?.name ?? 'Error' });
  }
});
