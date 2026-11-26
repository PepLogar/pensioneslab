// Pure pieces of «Metodología» (metodologia.html): where the console changes an assumption, and the
// starting value and range of each setting, as the console shows them. No DOM.
import { SETTINGS_CHAPTERS, settingEntry } from '../shared/settings-catalog.js';
import { shown, fixedText, decimals } from '../shared/console-rows.js';
import { num } from '../shared/number-format.js';

// The console's own tabs (src/pages/consola.js, OWN_TABS).
export const CONSOLE_TABS = Object.freeze({ ricos: 'Ricos y empresas', partidas: 'Partidas del Estado', calendario: 'Calendario', limites: 'Límites y mezcla' });

/** «N · Capítulo › «Nombre»» for a setting of the catalogue; null when the key is not in it. */
export function settingPlace(key) {
  const entry = settingEntry(key);
  const chapter = entry && SETTINGS_CHAPTERS.find(c => c.id === entry.chapter);
  return chapter ? `${chapter.number} · ${chapter.title} › «${entry.name}»` : null;
}

/** Where the console changes an assumption: its settings, its tab, and why the rest is fixed. */
export function assumptionPlaces(assumption) {
  const places = (assumption.at ?? []).map(settingPlace);
  if (assumption.tab) {
    const [id, fields] = assumption.tab;
    const tab = `Pestaña «${CONSOLE_TABS[id]}»`;
    places.push(...(fields.length ? fields.map(f => `${tab} › «${f}»`) : [tab]));
  }
  return { places, fixed: assumption.fixed ?? null };
}

/** A row's starting value as the console shows it, with its unit. */
export function startingValue(row, config) {
  if (!row.control) return fixedText(row.entry, config);
  const text = shown(row, config);
  return row.unit && row.control.type === 'range' ? `${text} ${row.unit}` : text;
}

/** What a row's control allows: «min – max, paso step», the options, or «fijo». */
export function controlRange(row) {
  const c = row.control;
  if (!c) return 'fijo';
  if (c.type === 'toggle') return 'sí / no';
  if (c.type === 'choice') return c.options.map(([, label]) => label).join(' · ');
  if (c.type === 'range' && Number.isFinite(c.min) && Number.isFinite(c.max)) {
    const d = decimals(c.step);
    return `${num(c.min, d)} – ${num(c.max, d)}${c.step ? `, paso ${num(c.step, d)}` : ''}`;
  }
  return '—';
}
