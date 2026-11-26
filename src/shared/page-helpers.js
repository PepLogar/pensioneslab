// Small helpers shared by the page entry scripts.
import { getState, subscribe, resetToOrigin } from './scenario-store.js';
import { describeScenarioStatus } from './scenario-labels.js';
import { DEFAULT_CONFIG } from './default-config.js';

// A scenario the simulator cannot compute (docs/REVISION-CABOS-AJUSTAR-2026-11-11.md, A): the page says so,
// with two ways out, instead of staying on «Calculando…» with the error only in the console. One notice per
// page, under its introduction; the next scenario that computes takes it away.
const FAILED_TEXT = '<strong>No se ha podido calcular este escenario.</strong> Algún ajuste tiene un valor con el que el simulador no sabe hacer las cuentas.';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
// The notice cannot tell which setting is to blame (the engine fails with a technical message), but it can
// say where to look: what the reader changed, as the scenario bar names it. At most four, and the count of the rest.
export function changedSettingsLine(config, limit = 4) {
  let items = [];
  try { items = describeScenarioStatus(config, DEFAULT_CONFIG).customItems.map(item => item.label); } catch { /* an unreadable scenario names nothing */ }
  if (!items.length) return '';
  const more = items.length - limit;
  return `Mira entre lo que has cambiado: ${items.slice(0, limit).map(label => `<strong>${escapeHtml(label)}</strong>`).join(' · ')}${more > 0 ? ` y ${more} más` : ''}.`;
}
export const scenarioFailureNotice = Object.freeze({
  /** @param {{ canReset?: boolean }} [o]  false when the scenario on screen is not the reader's own (a shared link) */
  show({ canReset = true } = {}) {
    if (typeof document === 'undefined') return;
    // The box has its own attribute: the mark on <html> is `data-scenario-failed`, and a selector for one must
    // never find the other (it would redraw or remove the whole page).
    let box = document.querySelector('[data-scenario-failed-notice]');
    if (!box) {
      box = document.createElement('div');
      box.className = 'scenario-failed';
      box.dataset.scenarioFailedNotice = '';
      box.setAttribute('role', 'alert');
      const main = document.querySelector('main');
      const after = main?.querySelector(':scope > .page-intro') ?? null;
      if (after) after.after(box); else main?.prepend(box);
      box.addEventListener('click', event => { if (event.target.closest('[data-scenario-failed-reset]')) resetToOrigin(); });
    }
    // Only for the reader's own scenario: under a link, the one that fails is not the stored one.
    const changed = canReset ? changedSettingsLine(getState().config) : '';
    box.innerHTML = `<p>${FAILED_TEXT}</p>${changed ? `<p class="scenario-failed-changed">${changed}</p>` : ''}<p class="scenario-failed-ways">${canReset ? '<button type="button" data-scenario-failed-reset>Volver a las reglas de hoy</button>' : ''}</p>`;
    // The page's own «Calculando…» would stay for ever: hidden while the notice is up (src/site.css).
    document.documentElement.dataset.scenarioFailed = 'true';
  },
  clear() {
    if (typeof document === 'undefined') return;
    document.querySelector('[data-scenario-failed-notice]')?.remove();
    delete document.documentElement.dataset.scenarioFailed;
  }
});

/**
 * Calls `load(state)` (async) whenever the scenario config/limits change and
 * passes the result to `render(state, data)`. When only `selectedYear` changes,
 * reuses the loaded simulation data synchronously without flashing loading states.
 * A load or a render that fails shows the notice of `failure` (the render's promise is awaited, so a page
 * that draws asynchronously is covered too); the next one that works clears it.
 * @param {object} o
 * @param {() => boolean} [o.canReset]  whether the scenario drawn is the reader's own, to offer «Volver a las reglas de hoy»
 * @param {{ show: Function, clear: Function }} [o.failure]  the notice (the page's own, in tests a fake)
 */
export function bindScenario({ load, render, onLoading, canReset = () => true, failure = scenarioFailureNotice }) {
  let token = 0;
  let lastKey = null;
  let lastData = null;
  const failed = (mine, error) => {
    if (mine !== token) return;
    console.error('No se pudo calcular el escenario', error);
    failure.show({ canReset: canReset() });
  };
  async function run(state) {
    // Returning to a cached scenario also supersedes any pending calculation.
    const mine = ++token;
    const key = JSON.stringify([state.config, state.limits]);
    if (key === lastKey && lastData !== null) {
      try { await render(state, lastData); if (mine === token) failure.clear(); } catch (error) { failed(mine, error); }
      return;
    }
    onLoading?.(state);
    try {
      const data = await load(state);
      if (mine === token) {
        lastKey = key;
        lastData = data;
        await render(state, data);
        if (mine === token) failure.clear();
      }
    } catch (error) {
      // A scenario that failed is not kept as the last one: coming back to it tries again.
      if (mine === token) { lastKey = null; lastData = null; }
      failed(mine, error);
    }
  }
  run(getState());
  const unsubscribe = subscribe(run);
  return () => { ++token; unsubscribe(); };
}

// Kept here for the pages; it lives with the system labels so pure modules can use it.
export { selectSystemPatch } from './scenario-labels.js';
