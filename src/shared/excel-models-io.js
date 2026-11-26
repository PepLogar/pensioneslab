// Native Excel (.xlsx) and CSV/JSON Export & Import for Pensiones Lab models.
// Zero external dependencies: builds OpenXML .xlsx workbooks (ZIP + XML with styles)
// and reads back edited .xlsx files saved by Microsoft Excel / LibreOffice / Google Sheets
// (supporting both STORED method 0 and DEFLATE method 8 via DecompressionStream).

import { settingName } from './settings-catalog.js';
import { DEFAULT_CONFIG, BASE_YEAR, END_YEAR, CALIBRATION_ID, STATE_VERSION, validateConfig } from './default-config.js';
import {
  FLAGSHIP_PROGRESSIVE,
  FLAGSHIP_RETRO_1985,
  MIXED_GRADUAL,
  SYSTEM_INFO,
  activeSystemKey,
  scenarioSystemName
} from './scenario-labels.js';
import { computeVerdict } from '../domain/verdict.js';
import { CAPITALIZATION_STYLES } from '../progressive-transition.js';
import { OLDER_STATE_VERSIONS, configForStateVersion } from '../risk-state-migration.js';
import { workingPersonsOf } from './working-persons.js';
import { exportStamp } from './citation.js';
import { decodeScenarioHash } from './share-link.js';
import { DEFAULT_LIMITS, validateLimits } from '../sustainability.js';
import { SERIES_VARIABLES, SERIES_UNITS } from '../domain/series-dictionary.js';
import { TAX_POLICY_ASSUMPTIONS } from '../../data/tax-policy-assumptions.js';

// A tax row with no column for them keeps today's reduced and super-reduced VAT, and the threshold of an empty
// IRPF column is the Calendario's (src/domain/consola-measures.js, CALENDAR.fiscalRescues.blank; audit 1.85, 15).
export const RESCUE_ROW_DEFAULTS = Object.freeze({
  vatGeneralRate: TAX_POLICY_ASSUMPTIONS.baselineVatRates.general,
  vatReducedRate: TAX_POLICY_ASSUMPTIONS.baselineVatRates.reduced,
  vatSuperReducedRate: TAX_POLICY_ASSUMPTIONS.baselineVatRates.superReduced,
  irpfThreshold: 30000
});

const readableStateVersion = version => [...OLDER_STATE_VERSIONS, STATE_VERSION].includes(version);
// The reader's limits («Límites»), when the file carries them: checked as the saved scenarios are; null keeps the open ones.
const limitsOf = raw => raw && typeof raw === 'object' && !Array.isArray(raw) ? validateLimits({ ...DEFAULT_LIMITS, ...raw }) : null;

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8');

const xmlEscape = val => String(val ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

// --- CRC-32 for ZIP archive ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Packs an array of `{ name, data: Uint8Array | string }` into a valid ZIP archive (Uint8Array).
 */
export function buildZipArchive(files) {
  const entries = files.map(f => {
    const nameBytes = utf8Encoder.encode(f.name);
    const dataBytes = typeof f.data === 'string' ? utf8Encoder.encode(f.data) : f.data;
    const crc = crc32(dataBytes);
    return { nameBytes, dataBytes, crc, offset: 0 };
  });

  let offset = 0;
  for (const e of entries) {
    e.offset = offset;
    offset += 30 + e.nameBytes.length + e.dataBytes.length;
  }
  const cdStart = offset;
  let cdSize = 0;
  for (const e of entries) {
    cdSize += 46 + e.nameBytes.length;
  }
  const totalSize = cdStart + cdSize + 22;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  let pos = 0;
  for (const e of entries) {
    view.setUint32(pos, 0x04034b50, true); // Local file header signature
    view.setUint16(pos + 4, 20, true);     // Version needed to extract (2.0)
    view.setUint16(pos + 6, 0x0800, true); // UTF-8 flag
    view.setUint16(pos + 8, 0, true);      // Compression method: 0 (STORED)
    view.setUint16(pos + 10, 0, true);     // Mod time
    view.setUint16(pos + 12, 0x5421, true);// Mod date
    view.setUint32(pos + 14, e.crc, true);
    view.setUint32(pos + 18, e.dataBytes.length, true);
    view.setUint32(pos + 22, e.dataBytes.length, true);
    view.setUint16(pos + 26, e.nameBytes.length, true);
    view.setUint16(pos + 28, 0, true);
    pos += 30;
    out.set(e.nameBytes, pos);
    pos += e.nameBytes.length;
    out.set(e.dataBytes, pos);
    pos += e.dataBytes.length;
  }

  for (const e of entries) {
    view.setUint32(pos, 0x02014b50, true); // Central directory signature
    view.setUint16(pos + 4, 20, true);     // Version made by
    view.setUint16(pos + 6, 20, true);     // Version needed
    view.setUint16(pos + 8, 0x0800, true); // UTF-8 flag
    view.setUint16(pos + 10, 0, true);     // Compression method: 0 (STORED)
    view.setUint16(pos + 12, 0, true);
    view.setUint16(pos + 14, 0x5421, true);
    view.setUint32(pos + 16, e.crc, true);
    view.setUint32(pos + 20, e.dataBytes.length, true);
    view.setUint32(pos + 24, e.dataBytes.length, true);
    view.setUint16(pos + 28, e.nameBytes.length, true);
    view.setUint16(pos + 30, 0, true);
    view.setUint16(pos + 32, 0, true);
    view.setUint16(pos + 34, 0, true);
    view.setUint16(pos + 36, 0, true);
    view.setUint32(pos + 38, 0, true);
    view.setUint32(pos + 42, e.offset, true);
    pos += 46;
    out.set(e.nameBytes, pos);
    pos += e.nameBytes.length;
  }

  // End of central directory record (EOCD)
  view.setUint32(pos, 0x06054b50, true);
  view.setUint16(pos + 4, 0, true);
  view.setUint16(pos + 6, 0, true);
  view.setUint16(pos + 8, entries.length, true);
  view.setUint16(pos + 10, entries.length, true);
  view.setUint32(pos + 12, cdSize, true);
  view.setUint32(pos + 16, cdStart, true);
  view.setUint16(pos + 20, 0, true);

  return out;
}

async function inflateRawBytes(compressedBytes) {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(compressedBytes);
  writer.close();
  const res = new Response(ds.readable);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Extracts text files from a `.xlsx` ZIP Uint8Array (supports STORED=0 and DEFLATE=8).
 */
// An import is a small book: a larger file, or one that unzips to much more, is refused
// (AUDITORIA-2026-10-31-TECNICA.md, point 93).
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_UNZIPPED_BYTES = 64 * 1024 * 1024;

export async function extractZipTextEntries(zipBytes) {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  let eocdPos = -1;
  for (let i = zipBytes.length - 22; i >= Math.max(0, zipBytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos < 0) throw new Error('Archivo ZIP/.xlsx no válido (no se encontró directorio central).');

  const totalEntries = view.getUint16(eocdPos + 8, true);
  let cdPos = view.getUint32(eocdPos + 16, true);
  const files = new Map();
  let unzipped = 0;

  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(cdPos, true) !== 0x02014b50) break;
    const method = view.getUint16(cdPos + 10, true);
    const compSize = view.getUint32(cdPos + 20, true);
    const rawSize = view.getUint32(cdPos + 24, true);
    const nameLen = view.getUint16(cdPos + 28, true);
    const extraLen = view.getUint16(cdPos + 30, true);
    const commentLen = view.getUint16(cdPos + 32, true);
    const localOffset = view.getUint32(cdPos + 42, true);
    const name = utf8Decoder.decode(zipBytes.subarray(cdPos + 46, cdPos + 46 + nameLen));
    cdPos += 46 + nameLen + extraLen + commentLen;

    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const rawSlice = zipBytes.subarray(dataStart, dataStart + compSize);

    if (name.endsWith('.xml') || name.endsWith('.rels')) {
      unzipped += rawSize;
      if (unzipped > MAX_UNZIPPED_BYTES) throw new Error('El .xlsx descomprimido pasa de 64 MB: no se abre.');
      const uncompressed = method === 0
        ? rawSlice
        : method === 8
          ? await inflateRawBytes(rawSlice)
          : null;
      if (uncompressed) {
        files.set(name, utf8Decoder.decode(uncompressed));
      }
    }
  }
  return files;
}

/**
 * The files of the parameter and measure sheets, found by their names (a reader may reorder the
 * sheets in Excel); a book that does not name them is read by position (8/11/2026).
 */
export function sheetFilesByName(entries) {
  const out = {};
  const workbook = entries.get('xl/workbook.xml') ?? '';
  const rels = entries.get('xl/_rels/workbook.xml.rels') ?? '';
  const targets = new Map();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[0])?.[1], target = /\bTarget="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) targets.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`);
  }
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = /\bname="([^"]+)"/.exec(m[0])?.[1], rid = /\br:id="([^"]+)"/.exec(m[0])?.[1];
    const file = rid && targets.get(rid);
    if (!name || !file) continue;
    if (/^1_Parametros/.test(name)) out.params = file;
    if (/^2_Medidas/.test(name)) out.measures = file;
  }
  return out;
}

function colIndexToLetter(colIdx) {
  let n = colIdx + 1;
  let str = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    str = String.fromCharCode(65 + rem) + str;
    n = Math.floor((n - 1) / 26);
  }
  return str;
}

function colLettersToIndex(letters) {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function buildWorksheetXml(rows, { colWidths = [], freezeTopRows = 1 } = {}) {
  const colsXml = colWidths.length
    ? `<cols>${colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const sheetViewsXml = freezeTopRows > 0
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeTopRows}" topLeftCell="A${freezeTopRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';

  const rowsXml = rows.map((row, rIdx) => {
    const rowNum = rIdx + 1;
    const cells = Array.isArray(row) ? row : (row.cells ?? []);
    const rowStyle = row?.style ?? null;
    const heightAttr = row?.height ? ` ht="${row.height}" customHeight="1"` : '';
    const cellsXml = cells.map((cell, cIdx) => {
      const ref = `${colIndexToLetter(cIdx)}${rowNum}`;
      const isObj = cell !== null && typeof cell === 'object';
      const val = isObj ? cell.v : cell;
      const styleIdx = isObj && Number.isInteger(cell.s) ? cell.s : (rowStyle ?? 0);
      const sAttr = styleIdx > 0 ? ` s="${styleIdx}"` : '';
      if (val === null || val === undefined || val === '') {
        return `<c r="${ref}"${sAttr}/>`;
      }
      if (typeof val === 'number' && Number.isFinite(val)) {
        return `<c r="${ref}"${sAttr}><v>${Number(val.toFixed(6))}</v></c>`;
      }
      return `<c r="${ref}" t="inlineStr"${sAttr}><is><t xml:space="preserve">${xmlEscape(val)}</t></is></c>`;
    }).join('');
    return `<row r="${rowNum}"${heightAttr}>${cellsXml}</row>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${sheetViewsXml}
  ${colsXml}
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0"/>
    <numFmt numFmtId="165" formatCode="0.00"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="10.5"/><color rgb="FF102820"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="12"/><color rgb="FF0E5A46"/><name val="Calibri"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF102820"/><name val="Calibri"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF137866"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F6F1"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF8E6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD0E0D7"/></left>
      <right style="thin"><color rgb="FFD0E0D7"/></right>
      <top style="thin"><color rgb="FFD0E0D7"/></top>
      <bottom style="thin"><color rgb="FFD0E0D7"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;

// --- Parameter Schema for Round-Trip Excel Export & Import ---
export const EXCEL_PARAMETER_SCHEMA = Object.freeze([
  {
    key: 'preset_modelo',
    label: 'Modelo base (plantilla rápida)',
    unit: 'texto',
    range: 'reparto_actual | cuentas_nocionales | mixto_progresivo_2027 | mixto_gradual | reforma_1985 | capitalizacion_de_golpe | mixto_de_golpe | personalizado',
    desc: 'Cambia esta celda para cargar uno de los modelos completos, o edita los parámetros individuales de abajo.',
    // The same system the cards mark as the reader's (activeSystemKey).
    get: cfg => ({
      payg: 'reparto_actual',
      ndc: 'cuentas_nocionales',
      progressive: 'mixto_progresivo_2027',
      mixedGradual: 'mixto_gradual',
      retro1985: 'reforma_1985',
      funded: 'capitalizacion_de_golpe',
      mixed: 'mixto_de_golpe'
    })[activeSystemKey(cfg)] ?? 'reparto_actual',
    base: 'reparto_actual'
  },
  {
    key: 'system',
    label: 'Sistema base de pensiones',
    unit: 'código',
    range: 'payg | ndc | funded | mixed',
    desc: 'payg = Reparto; ndc = Cuentas nocionales; funded = Capitalización; mixed = Mixto',
    get: cfg => cfg.system,
    base: DEFAULT_CONFIG.system,
    type: 'enum',
    allowed: ['payg', 'ndc', 'funded', 'mixed']
  },
  {
    key: 'transitionMode',
    label: 'Modo de transición al ahorro propio',
    unit: 'código',
    range: 'none | pension-runoff | two-stage-relay | cohort-ramp | salary-cap-shield | baby-boom-shield | entrants-only | linear-ramp',
    desc: 'none = sin transición (de golpe); pension-runoff = según fallecen los pensionistas de hoy; two-stage-relay = Doble relevo progresivo (Reparto -> Nocional -> Capitalización)',
    get: cfg => cfg.transitionMode,
    base: DEFAULT_CONFIG.transitionMode,
    type: 'enum',
    allowed: ['none', 'pension-runoff', 'two-stage-relay', 'cohort-ramp', 'salary-cap-shield', 'baby-boom-shield', 'entrants-only', 'linear-ramp']
  },
  {
    key: 'transitionCutoffAge',
    label: 'Edad de corte de la transición',
    unit: 'años',
    range: '25 a 65 (entero)',
    desc: 'Los trabajadores de esta edad o más permanecen en el pilar público; los más jóvenes entran en el fondo.',
    get: cfg => cfg.transitionCutoffAge,
    base: DEFAULT_CONFIG.transitionCutoffAge,
    type: 'int',
    min: 25,
    max: 65
  },
  {
    key: 'transitionYears',
    label: 'Años de duración de la rampa de transición',
    unit: 'años',
    range: '1 a 44 (entero)',
    desc: 'Número de años durante los que se dosifica el paso gradual al fondo (41 activa el contrafactual 1985 si edad corte = 41).',
    get: cfg => cfg.transitionYears,
    base: DEFAULT_CONFIG.transitionYears,
    type: 'int',
    min: 1,
    max: 44
  },
  {
    key: 'transitionTargetFunded',
    label: 'Meta de cuota destinada al fondo privado (0 a 1)',
    unit: 'tanto por 1',
    range: '0.00 a 1.00 (ej. 0.60 = 60%)',
    desc: 'Proporción de la cotización de los jóvenes que se invierte en el fondo al culminar la transición.',
    get: cfg => Number(cfg.transitionTargetFunded.toFixed(4)),
    base: DEFAULT_CONFIG.transitionTargetFunded,
    type: 'float',
    min: 0,
    max: 1
  },
  {
    key: 'transitionNdcShare',
    label: 'Peso de Cuentas Nocionales en el pilar público puente (0 a 1)',
    unit: 'tanto por 1',
    range: '0.00 a 1.00 (ej. 0.85 = 85%)',
    desc: 'Parte del pilar público que funciona con fórmula actuarial nocional durante la transición.',
    get: cfg => Number((cfg.transitionNdcShare ?? 0.85).toFixed(4)),
    base: DEFAULT_CONFIG.transitionNdcShare ?? 0.85,
    type: 'float',
    min: 0,
    max: 1
  },
  {
    key: 'transitionRelaySchedule',
    label: 'Calendario del doble relevo',
    unit: 'código',
    range: 'announced | legacy-extended',
    desc: 'announced = la meta se alcanza en los años de rampa indicados (desde 1.21); legacy-extended = regla anterior, 16 años más la rampa menos 8, conservada para escenarios guardados antes de 1.21.',
    get: cfg => cfg.transitionRelaySchedule,
    base: DEFAULT_CONFIG.transitionRelaySchedule,
    type: 'enum',
    allowed: ['announced', 'legacy-extended']
  },
  {
    key: 'capitalizationStyle',
    label: 'Modalidad de cartera de inversión del fondo',
    unit: 'código',
    // The engine's own list (src/progressive-transition.js), so a style it has cannot be refused nor one it lacks
    // accepted (docs/REVISION-ADVERSARIAL-2026-11-24.md, 2).
    range: CAPITALIZATION_STYLES.join(' | '),
    desc: 'Estilo de inversión del fondo capitalizado (lifecycle-ap7 = estilo Suecia AP7; collective-cdc = colectivo de aportación definida; common-fund = fondo común sin herencia; dividend-endowment = rentas perpetuas; sovereign-captive = deuda pública cautiva).',
    get: cfg => cfg.capitalizationStyle,
    base: DEFAULT_CONFIG.capitalizationStyle,
    type: 'enum',
    allowed: [...CAPITALIZATION_STYLES]
  },
  {
    key: 'closingClause',
    label: 'Cláusula de cierre de 2023',
    unit: 'código',
    range: 'airef | strict | off',
    desc: 'Freno de la reforma de 2023: si el gasto neto en pensiones supera el 13,3 % del PIB, sube el MEI. airef = como la evalúa la AIReF; strict = sin las transferencias del Estado; off = apagada. Solo la lleva el reparto actual, salvo la fila siguiente.',
    get: cfg => cfg.closingClause,
    base: DEFAULT_CONFIG.closingClause,
    type: 'enum',
    allowed: ['airef', 'strict', 'off']
  },
  {
    key: 'closingClauseAnySystem',
    label: 'Cláusula de cierre también en otros sistemas',
    unit: '0 o 1',
    range: '0 o 1 (entero)',
    desc: '1 = se aplica también con cuentas nocionales, capitalización o mixto, que sustituyen la ley actual y por defecto no la llevan.',
    get: cfg => cfg.closingClauseAnySystem,
    base: DEFAULT_CONFIG.closingClauseAnySystem,
    type: 'int',
    min: 0,
    max: 1
  },
  {
    key: 'retirementAge',
    label: 'Edad de jubilación de referencia',
    unit: 'años',
    range: '50 a 100 (entero)',
    desc: '65 conserva la edad de retiro de partida (2026); subirla o bajarla desplaza las nuevas jubilaciones desde 2027.',
    get: cfg => cfg.retirementAge,
    base: DEFAULT_CONFIG.retirementAge,
    type: 'int',
    // The engine's and the Laboratory's range (src/config-core.js), so an edited row is not clamped.
    min: 50,
    max: 100
  },
  {
    key: 'retirementAgeStepYears',
    label: 'La edad sube: de golpe o por tramos',
    unit: 'años por cada año de subida',
    range: '0 a 6 (entero)',
    desc: '0 = la edad nueva vale para todos desde 2027, de golpe. Con 4, un año más cada cuatro: quien cumple 65 entre 2027 y 2030 se jubila un año más tarde; entre 2031 y 2034, dos; y así hasta la edad elegida. Solo actúa si la edad sube.',
    get: cfg => cfg.retirementAgeStepYears ?? DEFAULT_CONFIG.retirementAgeStepYears,
    base: DEFAULT_CONFIG.retirementAgeStepYears,
    type: 'int',
    min: 0,
    max: 6
  },
  {
    key: 'replacementRate',
    label: 'Tasa de reemplazo de referencia del reparto (0.20 a 1.00)',
    unit: 'tanto por 1',
    range: '0.20 a 1.00 (ej. 0.77 = 77%)',
    desc: '0.77 conserva la senda de referencia de nuevas altas de jubilación respecto al salario medio.',
    get: cfg => Number(cfg.replacementRate.toFixed(4)),
    base: DEFAULT_CONFIG.replacementRate,
    type: 'float',
    min: 0.2,
    max: 1
  },
  {
    key: 'contributionRate',
    label: 'Tipo efectivo de cotización a pensiones (0 a 0.50)',
    unit: 'tanto por 1',
    range: '0.00 a 0.50',
    desc: 'Proporción de la masa salarial destinada a financiar pensiones ordinarias.',
    get: cfg => Number(cfg.contributionRate.toFixed(6)),
    base: Number(DEFAULT_CONFIG.contributionRate.toFixed(6)),
    type: 'float',
    min: 0,
    max: 0.5
  },
  {
    key: 'taxRevenueGDP',
    label: 'Nivel de otros ingresos públicos sobre PIB (0.05 a 0.60)',
    unit: 'tanto por 1',
    range: '0.05 a 0.60',
    desc: 'Nivel de ingresos no contributivos del Estado respecto al PIB de partida.',
    get: cfg => Number(cfg.taxRevenueGDP.toFixed(6)),
    base: Number(DEFAULT_CONFIG.taxRevenueGDP.toFixed(6)),
    type: 'float',
    min: 0.05,
    max: 0.6
  },
  {
    key: 'pensionBudgetShare',
    label: 'Parte de otros ingresos asignada a pensiones (0 a 1)',
    unit: 'tanto por 1',
    range: '0.00 a 1.00',
    desc: 'Porcentaje de los ingresos generales asignado a cubrir el déficit contributivo de pensiones.',
    get: cfg => Number(cfg.pensionBudgetShare.toFixed(6)),
    base: Number(DEFAULT_CONFIG.pensionBudgetShare.toFixed(6)),
    type: 'float',
    min: 0,
    max: 1
  },
  {
    key: 'realReturn',
    label: 'Rentabilidad real anual del fondo antes de comisiones',
    unit: 'tanto por 1',
    range: '-0.05 a 0.08 (ej. 0.03 = 3% real)',
    desc: 'Rentabilidad real anual bruta de las inversiones del fondo de capitalización.',
    get: cfg => Number(cfg.realReturn.toFixed(4)),
    base: DEFAULT_CONFIG.realReturn,
    type: 'float',
    min: -0.05,
    max: 0.08
  },
  {
    key: 'feeRate',
    label: 'Comisión anual de gestión del fondo',
    unit: 'tanto por 1',
    range: '0.00 a 0.02 (ej. 0.005 = 0.5%)',
    desc: 'Comisión anual descontada de la rentabilidad del fondo privado.',
    get: cfg => Number(cfg.feeRate.toFixed(4)),
    base: DEFAULT_CONFIG.feeRate,
    type: 'float',
    min: 0,
    max: 0.02
  },
  {
    key: 'realWageGrowth',
    label: 'Desviación anual del crecimiento salarial real',
    unit: 'tanto por 1',
    range: '-0.02 a 0.015 (0 = senda base)',
    desc: 'Cambio anual adicional sobre la senda base de crecimiento del salario real. Más de 1,5 puntos por encima de la productividad lleva la remuneración por encima de la renta del PIB, y el simulador lo rechaza.',
    get: cfg => Number(cfg.realWageGrowth.toFixed(4)),
    base: DEFAULT_CONFIG.realWageGrowth,
    type: 'float',
    min: -0.02,
    max: 0.015
  },
  {
    key: 'productivityGrowth',
    label: 'Desviación anual de la productividad',
    unit: 'tanto por 1',
    range: '-0.02 a 0.04 (0 = senda base)',
    desc: 'Cambio anual adicional sobre la productividad por trabajador.',
    get: cfg => Number(cfg.productivityGrowth.toFixed(4)),
    base: DEFAULT_CONFIG.productivityGrowth,
    type: 'float',
    min: -0.02,
    max: 0.04
  },
  {
    key: 'entrantGrowth',
    label: 'Desviación anual de nuevas incorporaciones laborales',
    unit: 'tanto por 1',
    range: '-0.02 a 0.02 (0 = senda base)',
    desc: 'Variación anual de las entradas al mercado laboral desde 2027.',
    get: cfg => Number(cfg.entrantGrowth.toFixed(4)),
    base: DEFAULT_CONFIG.entrantGrowth,
    type: 'float',
    min: -0.02,
    max: 0.02
  },
  {
    key: 'longevityGain',
    label: 'Mejora adicional de supervivencia',
    unit: 'años/año',
    range: '0.00 a 0.80',
    desc: '0 mantiene las tablas de mortalidad EUROPOP2025; valores positivos alargan la esperanza de vida.',
    get: cfg => Number(cfg.longevityGain.toFixed(4)),
    base: DEFAULT_CONFIG.longevityGain,
    type: 'float',
    min: 0,
    max: 0.80
  },
  {
    key: 'inflationRate',
    label: 'Inflación anual prevista desde 2027',
    unit: 'tanto por 1',
    range: '0.00 a 0.10 (ej. 0.02 = 2%)',
    desc: 'Tasa de inflación anual para las cuentas nominales y revalorización IPC.',
    get: cfg => Number(cfg.inflationRate.toFixed(4)),
    base: DEFAULT_CONFIG.inflationRate,
    type: 'float',
    min: 0,
    max: 0.1
  },
  {
    key: 'realInterestRate',
    label: 'Tipo de interés real base de la deuda pública (ancla 7,85 años)',
    unit: 'tanto por 1',
    range: '-0.02 a 0.06',
    desc: 'Tipo real de referencia antes de sumar recargos por plazo y prima de riesgo soberana.',
    get: cfg => Number(cfg.realInterestRate.toFixed(6)),
    base: Number(DEFAULT_CONFIG.realInterestRate.toFixed(6)),
    type: 'float',
    min: -0.02,
    max: 0.06
  },
  {
    key: 'riskModel',
    label: 'Modelo de prima de riesgo soberana',
    unit: 'código',
    range: 'linear | quadratic | off',
    desc: 'linear = recargo lineal; quadratic = aceleración cuadrática no lineal (FMI/BCE); off = sin prima adicional.',
    get: cfg => cfg.riskModel,
    base: DEFAULT_CONFIG.riskModel,
    type: 'enum',
    allowed: ['linear', 'quadratic', 'off']
  },
  {
    key: 'riskDebtThreshold',
    label: 'Umbral de Deuda/PIB donde arranca la prima de riesgo',
    unit: 'tanto por 1',
    range: '0.60 a 2.00 (ej. 0.90 = 90 % del PIB)',
    desc: 'Por encima de este nivel de deuda sobre PIB, el mercado exige recargo adicional de interés.',
    get: cfg => Number(cfg.riskDebtThreshold.toFixed(4)),
    base: DEFAULT_CONFIG.riskDebtThreshold,
    type: 'float',
    min: 0.6,
    max: 2
  },
  {
    key: 'irpfSurcharge',
    label: 'Recargo adicional de IRPF (0 a 1)',
    unit: 'tanto por 1',
    range: '0.00 a 1.00 (ej. 0.10 = +10% recaudación IRPF)',
    desc: 'Esfuerzo tributario adicional sobre la recaudación de IRPF.',
    get: cfg => Number((cfg.irpfSurcharge ?? 0).toFixed(4)),
    base: DEFAULT_CONFIG.irpfSurcharge ?? 0,
    type: 'float',
    min: 0,
    max: 1
  },
  {
    key: 'vatSurcharge',
    label: 'Recargo adicional de IVA (0 a 1)',
    unit: 'tanto por 1',
    range: '0.00 a 1.00 (ej. 0.10 = +10% recaudación IVA)',
    desc: 'Esfuerzo tributario adicional sobre la recaudación de IVA.',
    get: cfg => Number((cfg.vatSurcharge ?? 0).toFixed(4)),
    base: DEFAULT_CONFIG.vatSurcharge ?? 0,
    type: 'float',
    min: 0,
    max: 1
  },
  {
    key: 'otherTaxSurcharge',
    label: 'Recargo adicional en otros tributos (0 a 1)',
    unit: 'tanto por 1',
    range: '0.00 a 1.00',
    desc: 'Esfuerzo tributario adicional sobre otros impuestos.',
    get: cfg => Number((cfg.otherTaxSurcharge ?? 0).toFixed(4)),
    base: DEFAULT_CONFIG.otherTaxSurcharge ?? 0,
    type: 'float',
    min: 0,
    max: 1
  },
  {
    key: 'lafferFullResponse',
    label: 'Respuesta completa de Laffer',
    unit: '0 o 1',
    range: '0 o 1 (entero)',
    desc: '1 = subir los impuestos al trabajo baja las horas y, con ellas, la masa salarial, las cotizaciones, los derechos y el PIB (por defecto desde la 1.54); 0 = solo se pierde recaudación, como en la 1.53.',
    get: cfg => cfg.lafferFullResponse ?? DEFAULT_CONFIG.lafferFullResponse,
    base: DEFAULT_CONFIG.lafferFullResponse,
    type: 'int',
    min: 0,
    max: 1
  },
  {
    key: 'lafferVatResponse',
    label: 'El IVA también baja las horas',
    unit: '0 o 1',
    range: '0 o 1 (entero)',
    desc: '1 = con la respuesta completa, el recargo del IVA entra en la cuña del trabajo, como en Trabandt y Uhlig; su recaudación no se recorta (por defecto desde la 1.56). 0 = el IVA no cambia las horas, como hasta la 1.55.',
    get: cfg => cfg.lafferVatResponse ?? DEFAULT_CONFIG.lafferVatResponse,
    base: DEFAULT_CONFIG.lafferVatResponse,
    type: 'int',
    min: 0,
    max: 1
  },
  {
    key: 'retirementDelayEmployment',
    label: 'Quién sigue trabajando al retrasar la jubilación',
    unit: 'parte de 1',
    range: '0,4 a 1',
    desc: 'Parte de quienes se habrían jubilado que sigue empleada en los años de retraso. El resto no trabaja ni cobra pensión hasta la edad nueva, y recibe un subsidio del 40 % del salario. Hasta la 1.58 era 1. Supuesto del proyecto, no una medida.',
    get: cfg => cfg.retirementDelayEmployment ?? DEFAULT_CONFIG.retirementDelayEmployment,
    base: DEFAULT_CONFIG.retirementDelayEmployment,
    type: 'float',
    min: 0.4,
    max: 1
  },
  {
    key: 'publicCapitalElasticity',
    label: 'Lo que cuesta a largo plazo recortar inversión pública',
    unit: 'elasticidad',
    range: '0 a 0,2',
    desc: 'Elasticidad del PIB al capital público a largo plazo. Un recorte de otro gasto baja la inversión en la misma proporción, y el capital público, los salarios y el PIB bajan poco a poco. 0,122 según Bom y Ligthart (2014); 0,170 en infraestructura básica. Con 0, un recorte no cuesta nada a largo plazo, como hasta la 1.59.',
    get: cfg => cfg.publicCapitalElasticity ?? DEFAULT_CONFIG.publicCapitalElasticity,
    base: DEFAULT_CONFIG.publicCapitalElasticity,
    type: 'float',
    min: 0,
    max: 0.2
  },
  {
    key: 'cutInvestmentShare',
    label: 'Parte del recorte que cae sobre la inversión',
    unit: 'proporción',
    range: '0 a 3',
    desc: 'Cuánto cae la inversión pública en un recorte de otro gasto, comparada con el conjunto de ese gasto. 1 = en la misma proporción; 0 = no se toca, y el mismo dinero sale del resto; 3 = tres veces el recorte. En 2009–2014 fue unas 2,3 veces (Eurostat). Supuesto del simulador.',
    get: cfg => cfg.cutInvestmentShare ?? DEFAULT_CONFIG.cutInvestmentShare,
    base: DEFAULT_CONFIG.cutInvestmentShare,
    type: 'float',
    min: 0,
    max: 3
  },
  {
    key: 'automationRegime',
    label: 'Régimen ante la IA y Automatización',
    unit: 'código',
    range: 'status-quo-payroll | robot-tax-payg | capital-boom-dividend | demarquia-funcionarios-primero | demarquia-planetaria-au50',
    desc: 'Define cómo se gravan o reparten las ganancias de productividad de la IA y los robots.',
    get: cfg => cfg.automationRegime ?? 'status-quo-payroll',
    base: DEFAULT_CONFIG.automationRegime ?? 'status-quo-payroll',
    type: 'enum',
    allowed: ['status-quo-payroll', 'robot-tax-payg', 'capital-boom-dividend', 'demarquia-funcionarios-primero', 'demarquia-planetaria-au50']
  },
  {
    key: 'aiAutomationShare',
    label: 'Proporción de horas automatizadas por IA (0 a 0.70)',
    unit: 'tanto por 1',
    range: '0.00 a 0.70',
    desc: 'Porcentaje de horas de trabajo cognitivo automatizadas por IA en el año meta.',
    get: cfg => Number((cfg.aiAutomationShare ?? 0).toFixed(4)),
    base: DEFAULT_CONFIG.aiAutomationShare ?? 0,
    type: 'float',
    // The engine's range (src/config-current-v10.js), as the worlds of «Otro tablero» use it.
    min: 0,
    max: 0.7
  },
  {
    key: 'robotAutomationShare',
    label: 'Proporción de horas automatizadas por Robots (0 a 0.45)',
    unit: 'tanto por 1',
    range: '0.00 a 0.45',
    desc: 'Porcentaje de horas de trabajo físico automatizadas por robótica en el año meta.',
    get: cfg => Number((cfg.robotAutomationShare ?? 0).toFixed(4)),
    base: DEFAULT_CONFIG.robotAutomationShare ?? 0,
    type: 'float',
    min: 0,
    max: 0.45
  },
  {
    key: 'publicAdminAutomationShare',
    label: 'Proporción de Administración Pública automatizada (0 a 1)',
    unit: 'tanto por 1',
    range: '0.00 a 1.00',
    desc: 'Porcentaje de plazas administrativas automatizadas con IA soberana.',
    get: cfg => Number((cfg.publicAdminAutomationShare ?? 0).toFixed(4)),
    base: DEFAULT_CONFIG.publicAdminAutomationShare ?? 0,
    type: 'float',
    min: 0,
    max: 1
  },
  {
    key: 'paradigmRevenueScale',
    label: 'Supuesto del régimen de automatización: recaudación nueva sobre la producción automatizada (0 a 1,5)',
    unit: 'tanto por 1',
    range: '0.00 a 1.50 (1 = el régimen tal como está diseñado)',
    desc: 'Qué parte de este supuesto favorable se da por cumplida. 0 lo elimina; 1 reproduce el diseño del régimen.',
    get: cfg => Number((cfg.paradigmRevenueScale ?? 1).toFixed(4)),
    base: DEFAULT_CONFIG.paradigmRevenueScale ?? 1,
    type: 'float',
    min: 0,
    max: 1.5
  },
  {
    key: 'paradigmSupportScale',
    label: 'Supuesto del régimen de automatización: parte del subsidio a desplazados que no paga el Estado (0 a 1,5)',
    unit: 'tanto por 1',
    range: '0.00 a 1.50 (1 = el régimen tal como está diseñado)',
    desc: 'Qué parte de este supuesto favorable se da por cumplida. 0 lo elimina; 1 reproduce el diseño del régimen.',
    get: cfg => Number((cfg.paradigmSupportScale ?? 1).toFixed(4)),
    base: DEFAULT_CONFIG.paradigmSupportScale ?? 1,
    type: 'float',
    min: 0,
    max: 1.5
  },
  {
    key: 'paradigmReturnScale',
    label: 'Supuesto del régimen de automatización: rentabilidad extra del capital por la IA (0 a 1,5)',
    unit: 'tanto por 1',
    range: '0.00 a 1.50 (1 = el régimen tal como está diseñado)',
    desc: 'Qué parte de este supuesto favorable se da por cumplida. 0 lo elimina; 1 reproduce el diseño del régimen.',
    get: cfg => Number((cfg.paradigmReturnScale ?? 1).toFixed(4)),
    base: DEFAULT_CONFIG.paradigmReturnScale ?? 1,
    type: 'float',
    min: 0,
    max: 1.5
  },
  {
    key: 'paradigmOutputScale',
    label: 'Supuesto del régimen de automatización: producción extra frente a la economía de nóminas (0 a 1,5)',
    unit: 'tanto por 1',
    range: '0.00 a 1.50 (1 = el régimen tal como está diseñado)',
    desc: 'Qué parte de este supuesto favorable se da por cumplida. 0 lo elimina; 1 reproduce el diseño del régimen.',
    get: cfg => Number((cfg.paradigmOutputScale ?? 1).toFixed(4)),
    base: DEFAULT_CONFIG.paradigmOutputScale ?? 1,
    type: 'float',
    min: 0,
    max: 1.5
  },
  {
    key: 'paradigmAdminScale',
    label: 'Supuesto del régimen de automatización: ahorro por automatizar la Administración (0 a 1,5)',
    unit: 'tanto por 1',
    range: '0.00 a 1.50 (1 = el régimen tal como está diseñado)',
    desc: 'Qué parte de este supuesto favorable se da por cumplida. 0 lo elimina; 1 reproduce el diseño del régimen.',
    get: cfg => Number((cfg.paradigmAdminScale ?? 1).toFixed(4)),
    base: DEFAULT_CONFIG.paradigmAdminScale ?? 1,
    type: 'float',
    min: 0,
    max: 1.5
  },
  {
    key: 'paradigmDividendScale',
    label: 'Supuesto del régimen de automatización: dividendo ciudadano contado como renta de los jubilados (0 a 1,5)',
    unit: 'tanto por 1',
    range: '0.00 a 1.50 (1 = el régimen tal como está diseñado)',
    desc: 'Qué parte de este supuesto favorable se da por cumplida. 0 lo elimina; 1 reproduce el diseño del régimen.',
    get: cfg => Number((cfg.paradigmDividendScale ?? 1).toFixed(4)),
    base: DEFAULT_CONFIG.paradigmDividendScale ?? 1,
    type: 'float',
    min: 0,
    max: 1.5
  },
  {
    key: 'selectedYear',
    label: 'Año seleccionado en el reloj del simulador',
    unit: 'año',
    range: '2026 a 2070',
    desc: 'Año activo al abrir el escenario importado.',
    get: (_cfg, state) => state?.selectedYear ?? 2050,
    base: 2026,
    type: 'selectedYear',
    min: 2026,
    max: 2070
  }
]);

// One name for each setting, the catalogue's (docs/PROPUESTA-ORDEN-AJUSTES-2026-11-10.md, batch 3): the same as in
// «Ajustes» and the Laboratorio. The range the sheet adds, «(0 a 1)», stays: it tells what to type, and the Resumen
// reads it to write a share as a percentage. Importing goes by the key of each row, never by its name.
for (const item of EXCEL_PARAMETER_SCHEMA) {
  const name = settingName(item.key);
  if (name) item.label = `${name}${/\s\(\d[\d.,]* a [^)]*\)$/.exec(item.label)?.[0] ?? ''}`;
}

function evaluateResultMilestones(result, fallbackConfig) {
  const sysCfg = result?.config ?? fallbackConfig;
  // Milestones and the risk of each year come from the single app-wide verdict
  // so Excel matches every page. Rescue, haircut and default are assumptions.
  const v = computeVerdict(result, { config: sysCfg });
  const riskByYear = new Map((v?.journey?.stations ?? []).map(st => [st.year, st.risk]));
  return { highYr: v?.sustainedHighRiskYear ?? null, bailoutYr: v?.bailoutYear ?? null, restructYr: v?.restructuringYear ?? null,
    defaultYr: v?.defaultYear ?? null, rescueApplied: v?.rescuedYear ?? null, pensionYr: v?.pensionInsufficientYear ?? null, riskByYear };
}
const RISK_WORD = { low: 'bajo', moderate: 'moderado', high: 'alto' };

// Columns added on 8/11/2026 (docs/REVISION-EXPERTO-2026-11-08.md, proposal 3): the State's accounts year by
// year, named as in the dictionary of the long CSV, with their unit.
const FISCAL_SERIES_IDS = ['ingresos_publicos', 'irpf', 'iva_y_productos', 'sociedades', 'otros_impuestos', 'cotizaciones_pensiones_publicas',
  'mei', 'impuestos_a_pensiones', 'intereses', 'gasto_pensiones_publicas_pct_pib', 'saldo_publico_pct_pib', 'indice_precios'];
const FISCAL_SERIES = FISCAL_SERIES_IDS.map(id => SERIES_VARIABLES.find(item => item.id === id));
const seriesCell = (item, point) => {
  let value;
  try { value = item.get(point); } catch { return ''; }
  return Number.isFinite(value) ? Number(value.toFixed(3)) : '';
};

function buildAnnualSeriesRows(title, result, fallbackConfig) {
  const sysCfg = result?.config ?? fallbackConfig;
  const hist = (result?.retro1985 && Array.isArray(result?.historicalYears))
    ? result.historicalYears.filter(p => p.year >= 1985 && p.year < BASE_YEAR)
    : [];
  const allPts = [...hist, ...(result?.years ?? [])];
  const { highYr, bailoutYr, restructYr, defaultYr, riskByYear } = evaluateResultMilestones(result, fallbackConfig);

  const rows = [
    {
      style: 2,
      height: 24,
      cells: [
        `SERIE ANUAL COMPLETA · ${title}`,
        `Recorrido: ${allPts[0]?.year ?? 2026}–${allPts.at(-1)?.year ?? 2070}`,
        highYr ? `Riesgo alto sostenido: ${highYr}` : 'Sin riesgo alto sostenido',
        bailoutYr ? `Rescate (supuesto): ${bailoutYr}` : 'Sin rescate',
        restructYr ? `Quita (supuesto): ${restructYr}` : 'Sin quita',
        defaultYr ? `Impago (supuesto): ${defaultYr}` : 'Sin impago',
        'Importes en euros de 2026 (reales); el índice de precios los pasa a euros de cada año. Las columnas con [unidad] están en la hoja «Diccionario».'
      ]
    },
    {
      style: 1,
      height: 22,
      cells: [
        'Anio',
        'Tramo',
        'Cotizantes',
        'Jubilados',
        'Cotizantes_por_Jubilado',
        'Pension_Mensual_EUR',
        'Tasa_Reemplazo_Pct',
        'Mochila_Jubilado_EUR',
        'Fondo_Capitalizado_Pct_PIB',
        'Fondo_Miles_MEUR',
        'Brecha_Pensiones_Pct_PIB',
        'Deuda_Bruta_Pct_PIB',
        'Indice_Riesgo_S0_Fiscal',
        'Nivel_Riesgo',
        'necesidades_brutas_financiacion_pct_pib [pct_PIB]',
        'Intereses_Sobre_Ingresos_Pct',
        'Deuda_Por_Cotizante_EUR',
        'Capital_Fondo_Por_Cotizante_EUR',
        'Estado_Anual',
        ...FISCAL_SERIES.map(item => `${item.id} [${SERIES_UNITS[item.unit].code}]`)
      ]
    }
  ];

  for (let i = 0; i < allPts.length; i++) {
    const pt = allPts[i];
    const risk = riskByYear.get(pt.year) ?? null;
    // Contributors are persons who work, not full-time equivalents (1.56).
    const workers = Math.max(1, workingPersonsOf(pt) ?? 1);
    const retirees = Math.max(1, pt.retirees ?? 1);
    const status = defaultYr && pt.year >= defaultYr
      ? `IMPAGO, SUPUESTO (${defaultYr})`
      : restructYr && pt.year >= restructYr
        ? `QUITA, SUPUESTO (${restructYr})`
        : bailoutYr && pt.year >= bailoutYr
          ? `RESCATE, SUPUESTO (${bailoutYr})`
          : highYr && pt.year >= highYr
            ? `RIESGO ALTO SOSTENIDO (${highYr})`
            : 'SIN RIESGO ALTO SOSTENIDO';

    rows.push([
      pt.year,
      // The 1985 counterfactual is simulated before 2026 too, not observed history (1.82).
      pt.year < BASE_YEAR ? 'Contrafactual simulado 1985-2025' : 'Proyección 2026-2070',
      Math.round(workers),
      Math.round(retirees),
      Number((workers / retirees).toFixed(2)),
      Math.round((pt.averagePensionAnnual ?? 0) / 12),
      Number(((pt.replacementRate ?? 0) * 100).toFixed(2)),
      Math.round(pt.newAwardFundedCapitalPerRetiree ?? 0),
      Number((pt.fundedAssetsGDP ?? 0).toFixed(2)),
      Number(((pt.fundedAssets ?? 0) / 1e9).toFixed(2)),
      Number((pt.pensionGapGDP ?? 0).toFixed(2)),
      Number((pt.debtGDP ?? 0).toFixed(2)),
      risk?.index == null ? '' : Number(risk.index.toFixed(3)),
      risk?.level ? RISK_WORD[risk.level] : '',
      risk?.vars?.grossFinancingNeeds == null ? '' : Number(risk.vars.grossFinancingNeeds.toFixed(2)),
      pt.totalPublicRevenue > 0 ? Number(((pt.interest ?? 0) / pt.totalPublicRevenue * 100).toFixed(2)) : '',
      Math.round((pt.debt ?? 0) / workers),
      Math.round((pt.fundedAssets ?? 0) / workers),
      status,
      ...FISCAL_SERIES.map(item => seriesCell(item, pt))
    ]);
  }
  return rows;
}

/**
 * Builds the complete multi-sheet `.xlsx` file as a Uint8Array.
 */
// --- The whole scenario in the workbook (A03, docs/CAMBIOS.md) ---
// Sheet 1 ends with one row that carries the full configuration and the year as JSON, so a
// copy no longer depends on the scenario open in the browser that imports it.
const FULL_SCENARIO_KEY = 'escenario_completo';
const FULL_SCENARIO_FORMAT = 1;
const EXCEL_CELL_LIMIT = 32767;

function fullScenarioCell(config, selectedYear, limits) {
  const text = JSON.stringify({ format: FULL_SCENARIO_FORMAT, calibration: CALIBRATION_ID, stateVersion: STATE_VERSION,
    selectedYear: Number.isInteger(selectedYear) ? selectedYear : null, ...(limits ? { limits } : {}), config });
  return text.length <= EXCEL_CELL_LIMIT ? text : null;
}

/** The scenario of a full-copy cell, or null when it is missing, damaged or of another base or version. */
function readFullScenarioCell(raw) {
  try {
    const data = JSON.parse(String(raw));
    if (data?.format !== FULL_SCENARIO_FORMAT || data.calibration !== CALIBRATION_ID || !readableStateVersion(data.stateVersion)) return null;
    const year = Number.isInteger(data.selectedYear) && data.selectedYear >= BASE_YEAR && data.selectedYear <= END_YEAR ? data.selectedYear : null;
    return { config: validateConfig(configForStateVersion(data.config, data.stateVersion)), selectedYear: year, limits: limitsOf(data.limits) };
  } catch { return null; }
}

// Columns of sheet 2 by measure: a group the reader did not change keeps the exact measure.
const MEASURE_COLUMNS = Object.freeze({ payment: [1, 2, 9], rescue: [3, 4, 5], restructuring: [6, 7, 8] });

/** The rows of sheet 2, one per year from 2027: the export writes them; the import compares with them. */
function measureRows(config) {
  const payMap = new Map((config.paymentAdjustments ?? []).map(p => [p.year, p]));
  const rescMap = new Map((config.fiscalRescues ?? []).map(r => [r.year, r]));
  const restMap = new Map((config.debtRestructurings ?? []).map(d => [d.year, d]));
  const rows = [];
  for (let yr = BASE_YEAR + 1; yr <= END_YEAR; yr++) {
    const p = payMap.get(yr);
    const r = rescMap.get(yr);
    const d = restMap.get(yr);
    rows.push([
      yr,
      Number(((p?.publicPensionCut ?? 0) * 100).toFixed(2)),
      Number(((p?.otherSpendingCut ?? 0) * 100).toFixed(2)),
      r ? Number(((r.vatGeneralRate ?? RESCUE_ROW_DEFAULTS.vatGeneralRate) * 100).toFixed(2)) : 0,
      r ? Number(((r.irpfExtraPoints ?? 0) * 100).toFixed(2)) : 0,
      r ? Math.round(r.irpfThreshold ?? RESCUE_ROW_DEFAULTS.irpfThreshold) : 0,
      d ? Number(((d.haircut ?? 0) * 100).toFixed(2)) : 0,
      d ? (d.termYears ?? 35) : 0,
      d ? Number(((d.nominalRate ?? 0.02) * 100).toFixed(2)) : 0,
      // Payment cuts are levels that last until the next one: a year that sets them back
      // to 0 is a measure, unlike a year without one, and only this mark tells them apart.
      p ? 1 : 0
    ]);
  }
  return rows;
}

/** Whether an imported cell still holds what the export wrote (numbers as written, six decimals). */
function sameCell(raw, written) {
  if (typeof written === 'number') {
    const n = parseFlexNumber(raw);
    return Number.isFinite(n) && n === Number(written.toFixed(6));
  }
  return String(raw ?? '').trim() === String(written ?? '').trim();
}

export function buildModelsXlsxBytes({ state, systems = [], activeResult = null }) {
  const config = state?.config ?? DEFAULT_CONFIG;
  const activeName = scenarioSystemName(config);

  // --- SHEET 1: 1_Parametros_Escenario ---
  const sheet1Rows = [
    {
      style: 2,
      height: 24,
      cells: [
        'PENSIONES LAB · PARÁMETROS DEL ESCENARIO (EDITABLE PARA IMPORTAR)',
        `Escenario activo: ${activeName}`,
        'Edita la columna C (Valor_Activo), guarda el Excel (.xlsx) y pulsa «Importar» en la consola.',
        '', '', '', ''
      ]
    },
    {
      style: 1,
      height: 22,
      cells: [
        'Clave_Tecnica',
        'Parametro',
        'Valor_Activo',
        'Valor_Espana_Hoy_2026',
        'Unidad',
        'Valores_Permitidos_o_Rango',
        'Explicacion'
      ]
    },
    ...EXCEL_PARAMETER_SCHEMA.map((item, idx) => ({
      style: idx === 0 ? 3 : 0,
      cells: [
        item.key,
        item.label,
        { v: item.get(config, state), s: 3 },
        item.base,
        item.unit,
        item.range,
        item.desc
      ]
    }))
  ];

  // The whole scenario, versioned (A03): the cells above show only part of it, rounded.
  const full = fullScenarioCell(config, state?.selectedYear, state?.limits);
  if (full) sheet1Rows.push({ cells: [FULL_SCENARIO_KEY, 'Copia íntegra del escenario (no editar)', full, '', 'JSON',
    `formato ${FULL_SCENARIO_FORMAT} · estado ${STATE_VERSION} · ${CALIBRATION_ID}`,
    'Lleva todos los ajustes, también los que no tienen celda, sin redondear. Al importar se parte de ella; las celdas de arriba y las filas de la hoja 2 que cambies mandan sobre ella.'] });

  // --- SHEET 2: 2_Medidas_Anuales_2027_2070 ---
  const sheet2Rows = [
    {
      style: 2,
      height: 24,
      cells: [
        'MEDIDAS POR AÑO (2027–2070) · RECORTES, RESCATES Y QUITAS (EDITABLE PARA IMPORTAR)',
        'Cualquier fila con valores mayores que 0 se aplicará en ese año exacto al reimportar el Excel. Las columnas _Pct van en %: 0,5 es un 0,5 %. Un 1 en Medida_Pagos fija ese año los recortes que indique la fila, también 0 para retirarlos.',
        '', '', '', '', '', '', '', ''
      ]
    },
    {
      style: 1,
      height: 22,
      cells: [
        'Anio',
        'Recorte_Pension_Publica_Pct',
        'Recorte_Otros_Gastos_Pct',
        'Rescate_IVA_General_Pct',
        'Rescate_IRPF_Puntos_Extra_Pct',
        'Rescate_IRPF_Umbral_EUR',
        'Quita_Deuda_Pct',
        'Plazo_Bono_Reestructurado_Anios',
        'Cupon_Bono_Reestructurado_Pct',
        'Medida_Pagos'
      ]
    }
  ];

  sheet2Rows.push(...measureRows(config));

  // --- SHEET 3: 3_Comparativa_Modelos ---
  const sheet3Rows = [
    {
      style: 2,
      height: 24,
      cells: [
        'COMPARATIVA CARA A CARA DE LOS MODELOS EN AÑOS CLAVE (2026, 2035, 2050, 2070)',
        'Primero las vías principales (con el Mixto con ahorro propio cuando es tu escenario); al final, los sistemas «de golpe», que se rompen por el cambio brusco.',
        '', '', '', '', '', '', '', '', '', '', '', '', ''
      ]
    },
    {
      style: 1,
      height: 22,
      cells: [
        'Clave_Modelo',
        'Modelo',
        'Categoria',
        'Anio',
        'Pension_Mensual_EUR',
        'Tasa_Reemplazo_Pct',
        'Mochila_Jubilado_EUR',
        'Fondo_Pct_PIB',
        'Brecha_Pensiones_Pct_PIB',
        'Deuda_Bruta_Pct_PIB',
        'Indice_Riesgo_S0_Fiscal',
        'necesidades_brutas_financiacion_pct_pib [pct_PIB]',
        'Riesgo_Alto_Sostenido_Anio',
        'Rescate_Supuesto_Anio',
        'Impago_Supuesto_Anio'
      ]
    }
  ];

  const orderedKeys = ['payg', 'ndc', 'progressive', 'mixedGradual', 'retro1985', 'funded', 'mixed'];
  const keyYears = [2026, 2035, 2050, 2070];
  for (const key of orderedKeys) {
    const entry = systems.find(s => s.key === key);
    if (!entry?.result?.years) continue;
    const { highYr, bailoutYr, defaultYr, riskByYear } = evaluateResultMilestones(entry.result, config);
    const cat = (key === 'funded' || key === 'mixed') ? 'De golpe (inviable)' : 'Principal';
    for (const yr of keyYears) {
      const pt = entry.result.years[yr - BASE_YEAR];
      if (!pt) continue;
      const risk = riskByYear.get(yr) ?? null;
      sheet3Rows.push([
        key,
        entry.label,
        cat,
        yr,
        Math.round((pt.averagePensionAnnual ?? 0) / 12),
        Number(((pt.replacementRate ?? 0) * 100).toFixed(1)),
        Math.round(pt.newAwardFundedCapitalPerRetiree ?? 0),
        Number((pt.fundedAssetsGDP ?? 0).toFixed(1)),
        Number((pt.pensionGapGDP ?? 0).toFixed(2)),
        Number((pt.debtGDP ?? 0).toFixed(1)),
        risk?.index == null ? '' : Number(risk.index.toFixed(3)),
        risk?.vars?.grossFinancingNeeds == null ? '' : Number(risk.vars.grossFinancingNeeds.toFixed(1)),
        highYr ?? 'Sin riesgo alto sostenido',
        bailoutYr ?? 'Sin rescate',
        defaultYr ?? 'Sin impago'
      ]);
    }
  }

  // --- SHEET 4..9: Annual trajectories ---
  const primaryResult = activeResult
    || systems.find(s => s.key === activeSystemKey(config))?.result
    || systems[0]?.result;

  const sheets = [
    {
      name: '1_Parametros_Escenario',
      xml: buildWorksheetXml(sheet1Rows, { colWidths: [28, 44, 24, 22, 14, 38, 68], freezeTopRows: 2 })
    },
    {
      name: '2_Medidas_Anuales_2027_2070',
      xml: buildWorksheetXml(sheet2Rows, { colWidths: [10, 26, 24, 28, 20, 20, 18, 18, 22, 14], freezeTopRows: 2 })
    },
    {
      name: '3_Comparativa_Modelos',
      xml: buildWorksheetXml(sheet3Rows, { colWidths: [16, 32, 22, 8, 18, 18, 20, 15, 20, 18, 22, 14, 14, 18, 18], freezeTopRows: 2 })
    }
  ];

  if (primaryResult) {
    sheets.push({
      name: '4_Serie_Escenario_Activo',
      xml: buildWorksheetXml(buildAnnualSeriesRows(`Escenario Activo (${activeName})`, primaryResult, config), {
        colWidths: [8, 20, 14, 14, 20, 18, 18, 18, 20, 16, 20, 18, 22, 24, 16, 20, 20, 22, 18, ...FISCAL_SERIES.map(() => 22)],
        freezeTopRows: 2
      })
    });
  }

  // Tab ids stay as they were; the titles use the systems' names, with no numbering.
  // Mixto con ahorro propio has a tab only when its entry was loaded (while it is the scenario).
  const coreTabs = [
    { key: 'payg', tab: '5_V1_Reparto_Actual', title: `${SYSTEM_INFO.payg.plain} (hoy)` },
    { key: 'ndc', tab: '6_V2_Cuentas_Nocionales', title: SYSTEM_INFO.ndc.plain },
    { key: 'progressive', tab: '7_V3_Mixto_Progresivo', title: `${SYSTEM_INFO.progressive.plain} (2027)` },
    { key: 'mixedGradual', tab: '7b_Mixto_Gradual', title: `${SYSTEM_INFO.mixedGradual.plain} (2027)` },
    { key: 'retro1985', tab: '8_V4_Reforma_1985', title: `${SYSTEM_INFO.retro1985.plain} (1985-2070)` }
  ];
  for (const ct of coreTabs) {
    const sys = systems.find(s => s.key === ct.key);
    if (sys?.result) {
      sheets.push({
        name: ct.tab,
        xml: buildWorksheetXml(buildAnnualSeriesRows(ct.title, sys.result, sys.config), {
          colWidths: [8, 20, 14, 14, 20, 18, 18, 18, 20, 16, 20, 18, 22, 24, 16, 20, 20, 22, 18, ...FISCAL_SERIES.map(() => 22)],
          freezeTopRows: 2
        })
      });
    }
  }

  // The variables of the long CSV (Exportar › Series anuales) and of the columns with [unidad] above.
  sheets.push({
    name: 'Diccionario',
    xml: buildWorksheetXml([
      { style: 2, height: 22, cells: ['DICCIONARIO DE VARIABLES', 'Las del CSV largo de series (Exportar › Series anuales) y las columnas con [unidad] de las series de este libro'] },
      { style: 1, height: 22, cells: ['Variable', 'Grupo', 'Nombre', 'Unidad', 'Significa', 'Definición'] },
      ...SERIES_VARIABLES.map(item => [item.id, item.group, item.name, SERIES_UNITS[item.unit].code, SERIES_UNITS[item.unit].text, item.definition])
    ], { colWidths: [34, 16, 44, 16, 36, 100], freezeTopRows: 2 })
  });

  // Where and when this book comes from, and how to cite it (docs/REVISION-EXPERTO-2026-11-08.md).
  // Last, so a book keeps its parameters and measures as sheets 1 and 2 for older readers.
  const stamp = exportStamp(config);
  sheets.push({
    name: 'Acerca_de',
    xml: buildWorksheetXml([
      { style: 1, height: 22, cells: ['Campo', 'Valor'] },
      ['Aplicación', stamp.app],
      ['Metodología del motor', stamp.methodology],
      ['Datos (calibración)', stamp.calibration],
      ['Fecha de la descarga', stamp.date],
      ['Escenario', stamp.scenario],
      ['Enlace al escenario', stamp.link],
      ['Cómo citar', stamp.cite],
      ['Aviso', stamp.caveat],
      ['Hojas', 'Edita la hoja 1 (parámetros) o la 2 (medidas por año) y vuelve a importar el libro. Las demás son resultados; «Diccionario» explica las variables y sus unidades.']
    ], { colWidths: [24, 140], freezeTopRows: 1 })
  });

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n  ')}
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('\n    ')}
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n  ')}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const zipInputs = [
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: rootRelsXml },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml },
    { name: 'xl/styles.xml', data: STYLES_XML },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml }))
  ];

  return buildZipArchive(zipInputs);
}

// --- XML Worksheet & SharedStrings Parser for Importing .xlsx ---
function decodeXmlEntities(str) {
  return String(str ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseSharedStringsXml(xml) {
  if (!xml) return [];
  const strings = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = siRegex.exec(xml)) !== null) {
    const inner = match[1];
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tMatch;
    let combined = '';
    while ((tMatch = tRegex.exec(inner)) !== null) {
      combined += decodeXmlEntities(tMatch[1]);
    }
    strings.push(combined);
  }
  return strings;
}

function parseWorksheetXmlToGrid(xml, sharedStrings = []) {
  const rows = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rMatch;
  while ((rMatch = rowRegex.exec(xml)) !== null) {
    const rowContent = rMatch[1];
    const rowCells = [];
    const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cMatch;
    let nextCol = 0;
    while ((cMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cMatch[1] || '';
      const inner = cMatch[2] || '';
      const refMatch = /\br="([A-Z]+)\d+"/.exec(attrs);
      const colIdx = refMatch ? colLettersToIndex(refMatch[1]) : nextCol;
      nextCol = colIdx + 1;
      const typeMatch = /\bt="([^"]+)"/.exec(attrs);
      const cellType = typeMatch ? typeMatch[1] : 'n';

      let val = '';
      if (cellType === 'inlineStr') {
        const tMatch = /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(inner);
        val = tMatch ? decodeXmlEntities(tMatch[1]) : '';
      } else {
        const vMatch = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner);
        const rawV = vMatch ? decodeXmlEntities(vMatch[1]).trim() : '';
        if (cellType === 's') {
          const sIdx = Number(rawV);
          val = sharedStrings[sIdx] ?? rawV;
        } else if (cellType === 'str') {
          val = rawV;
        } else if (cellType === 'b') {
          val = rawV === '1' || rawV.toLowerCase() === 'true';
        } else {
          const num = Number(rawV);
          val = rawV !== '' && Number.isFinite(num) ? num : rawV;
        }
      }
      rowCells[colIdx] = val;
    }
    rows.push(rowCells);
  }
  return rows;
}

function parseFlexNumber(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const cleaned = String(raw ?? '').trim().replace(/\s+/g, '').replace(',', '.');
  const num = Number(cleaned);
  return cleaned !== '' && Number.isFinite(num) ? num : NaN;
}

function parseCsvToGrid(text) {
  const lines = String(text ?? '').split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return [];
  const first = lines[0];
  const sep = (first.split(';').length > first.split(',').length) ? ';' : ',';
  return lines.map(line => line.split(sep).map(cell => cell.trim().replace(/^"|"$/g, '')));
}

function applyImportedGrids(paramRows, annualMeasureRows = [], currentConfig = DEFAULT_CONFIG) {
  // What the import changed on the way in, said to the reader (8/11/2026): a value out of range or not allowed.
  const notes = [];
  const noteClamp = (spec, n) => {
    const clamped = Math.max(spec.min, Math.min(spec.max, n));
    if (clamped !== n) notes.push(`${spec.label}: ${n} queda en ${clamped}, el límite permitido`);
    return clamped;
  };
  const capNote = (yr, what, raw, cap, unit = '%') => {
    if (Number.isFinite(raw) && raw > cap) notes.push(`${yr} · ${what}: ${raw} ${unit} queda en ${cap} ${unit}`);
  };
  // A03: with the file's own full copy, start from it, not from the scenario open here.
  const fullRow = paramRows.find(row => Array.isArray(row) && String(row[0] ?? '').trim() === FULL_SCENARIO_KEY);
  const full = fullRow ? readFullScenarioCell(fullRow[2]) : null;
  const base = full?.config ?? currentConfig;
  const baseState = { config: base, selectedYear: full?.selectedYear ?? null };
  const next = { ...base };
  let selectedYear = full?.selectedYear ?? null;
  let edits = 0;
  let presetRequested = null;
  const schemaMap = new Map(EXCEL_PARAMETER_SCHEMA.map(item => [item.key, item]));
  const rawKv = new Map();

  for (const row of paramRows) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const key = String(row[0] ?? '').trim();
    const rawVal = row[2]; // Col C = Valor_Activo
    if (!schemaMap.has(key) || rawVal === undefined || rawVal === null || String(rawVal).trim() === '') continue;
    rawKv.set(key, rawVal);
  }

  // Also support 2-column Key,Value CSVs
  if (rawKv.size === 0) {
    for (const row of paramRows) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const key = String(row[0] ?? '').trim();
      const rawVal = row[1];
      if (!schemaMap.has(key) || rawVal === undefined || rawVal === null || String(rawVal).trim() === '') continue;
      rawKv.set(key, rawVal);
    }
  }

  for (const [key, rawVal] of rawKv.entries()) {
    const spec = schemaMap.get(key);
    if (!spec) continue;
    // A cell that still holds what the export wrote leaves the full copy's exact value.
    if (full && sameCell(rawVal, spec.get(base, baseState))) continue;
    if (full) edits++;
    if (key === 'preset_modelo') {
      presetRequested = String(rawVal).trim().toLowerCase();
      continue;
    }
    if (spec.type === 'selectedYear') {
      const yr = Math.round(parseFlexNumber(rawVal));
      if (Number.isInteger(yr) && yr >= BASE_YEAR && yr <= END_YEAR) selectedYear = yr;
      else notes.push(`${spec.label}: «${rawVal}» no es un año entre ${BASE_YEAR} y ${END_YEAR}, se deja como estaba`);
      continue;
    }
    if (spec.type === 'enum') {
      const strVal = String(rawVal).trim();
      if (spec.allowed.includes(strVal)) next[key] = strVal;
      else notes.push(`${spec.label}: «${strVal}» no es un valor permitido, se deja como estaba`);
      continue;
    }
    if (spec.type === 'int') {
      const n = Math.round(parseFlexNumber(rawVal));
      if (Number.isInteger(n)) next[key] = noteClamp(spec, n);
      else notes.push(`${spec.label}: «${rawVal}» no es un número, se deja como estaba`);
      continue;
    }
    if (spec.type === 'float') {
      const n = parseFlexNumber(rawVal);
      if (Number.isFinite(n)) next[key] = noteClamp(spec, n);
      else notes.push(`${spec.label}: «${rawVal}» no es un número, se deja como estaba`);
    }
  }

  // If the user explicitly changed `preset_modelo` in row 1 without manually changing `system`/`transitionMode`,
  // or if `preset_modelo` specifies a canonical model and `system`/`transitionMode` still match the old state:
  const currentPreset = EXCEL_PARAMETER_SCHEMA[0].get(base);
  if (presetRequested && presetRequested !== currentPreset && presetRequested !== 'personalizado') {
    if (presetRequested === 'reparto_actual') {
      Object.assign(next, { system: 'payg', transitionMode: 'none', capitalizationStyle: 'balanced-standard' });
    } else if (presetRequested === 'cuentas_nocionales') {
      Object.assign(next, { system: 'ndc', transitionMode: 'none', capitalizationStyle: 'balanced-standard' });
    } else if (presetRequested === 'mixto_progresivo_2027') {
      Object.assign(next, FLAGSHIP_PROGRESSIVE);
    } else if (presetRequested === 'mixto_gradual') {
      Object.assign(next, MIXED_GRADUAL, { mix: { ...MIXED_GRADUAL.mix } });
    } else if (presetRequested === 'reforma_1985') {
      Object.assign(next, FLAGSHIP_RETRO_1985);
    } else if (presetRequested === 'capitalizacion_de_golpe') {
      Object.assign(next, { system: 'funded', transitionMode: 'none', capitalizationStyle: 'balanced-standard' });
    } else if (presetRequested === 'mixto_de_golpe') {
      Object.assign(next, { system: 'mixed', transitionMode: 'none', capitalizationStyle: 'balanced-standard' });
    }
  }

  // Parse Sheet 2 (`2_Medidas_Anuales_2027_2070`) if present
  if (Array.isArray(annualMeasureRows) && annualMeasureRows.length > 0) {
    const paymentAdjustments = [];
    const fiscalRescues = [];
    const debtRestructurings = [];

    // A group of columns left as exported keeps the full copy's measure for that year,
    // unrounded and with the fields that have no column (reduced VAT, fund exposure…).
    const written = full ? new Map(measureRows(base).map(row => [row[0], row])) : null;
    const byYear = list => new Map((list ?? []).map(item => [item.year, item]));
    const exact = full ? { payment: byYear(base.paymentAdjustments), rescue: byYear(base.fiscalRescues), restructuring: byYear(base.debtRestructurings) } : null;

    for (const row of annualMeasureRows) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const yr = Math.round(parseFlexNumber(row[0]));
      if (!Number.isInteger(yr) || yr <= BASE_YEAR || yr > END_YEAR) continue;
      const kept = group => Boolean(full && written.has(yr) && MEASURE_COLUMNS[group].every(c => sameCell(row[c], written.get(yr)[c])));
      const keep = { payment: kept('payment'), rescue: kept('rescue'), restructuring: kept('restructuring') };
      if (full) edits += Object.values(keep).filter(k => !k).length;
      if (keep.payment && exact.payment.has(yr)) paymentAdjustments.push(exact.payment.get(yr));
      if (keep.rescue && exact.rescue.has(yr)) fiscalRescues.push(exact.rescue.get(yr));
      if (keep.restructuring && exact.restructuring.has(yr)) debtRestructurings.push(exact.restructuring.get(yr));

      const penCutPct = parseFlexNumber(row[1]);
      const othCutPct = parseFlexNumber(row[2]);
      const rescVatPct = parseFlexNumber(row[3]);
      const rescIrpfPtsPct = parseFlexNumber(row[4]);
      const rescIrpfThresh = parseFlexNumber(row[5]);
      const haircutPct = parseFlexNumber(row[6]);
      const restTermYrs = Math.round(parseFlexNumber(row[7]));
      const restNomRatePct = parseFlexNumber(row[8]);
      // Absent in files written before this column: then only cuts above 0 are measures.
      const paymentMeasure = parseFlexNumber(row[9]) === 1;
      capNote(yr, 'recorte de pensiones', penCutPct, 50);
      capNote(yr, 'recorte de otros gastos', othCutPct, 50);
      capNote(yr, 'IVA general del rescate', rescVatPct, 50);
      capNote(yr, 'puntos extra de IRPF del rescate', rescIrpfPtsPct, 30, 'puntos');
      capNote(yr, 'umbral del IRPF del rescate', rescIrpfThresh, 1_000_000, '€');
      capNote(yr, 'quita', haircutPct, 80);
      capNote(yr, 'plazo del bono reestructurado', restTermYrs, 50, 'años');
      capNote(yr, 'cupón del bono reestructurado', restNomRatePct, 30);

      // The _Pct columns are in percent, whatever their size: 0,5 is 0,5 %, never 50 %.
      const publicPensionCut = Number.isFinite(penCutPct) && penCutPct > 0
        ? Math.min(0.5, penCutPct / 100)
        : 0;
      const otherSpendingCut = Number.isFinite(othCutPct) && othCutPct > 0
        ? Math.min(0.5, othCutPct / 100)
        : 0;
      if (!keep.payment && (paymentMeasure || publicPensionCut > 0.0001 || otherSpendingCut > 0.0001)) {
        paymentAdjustments.push({
          year: yr,
          publicPensionCut: Number(publicPensionCut.toFixed(6)),
          otherSpendingCut: Number(otherSpendingCut.toFixed(6))
        });
      }

      const hasRescueVat = Number.isFinite(rescVatPct) && rescVatPct > 0;
      const hasRescueIrpf = Number.isFinite(rescIrpfPtsPct) && rescIrpfPtsPct > 0;
      if (!keep.rescue && (hasRescueVat || hasRescueIrpf)) {
        const vatGeneralRate = hasRescueVat
          ? Math.min(0.5, rescVatPct / 100)
          : RESCUE_ROW_DEFAULTS.vatGeneralRate;
        const irpfExtraPoints = hasRescueIrpf
          ? Math.min(0.30, rescIrpfPtsPct / 100)
          : 0;
        const irpfThreshold = Number.isFinite(rescIrpfThresh) && rescIrpfThresh > 0
          ? Math.min(1_000_000, Math.round(rescIrpfThresh))
          : RESCUE_ROW_DEFAULTS.irpfThreshold;
        fiscalRescues.push({
          year: yr,
          vatGeneralRate: Number(vatGeneralRate.toFixed(4)),
          // No column: an edited row keeps the full copy's value for that year, if it had one; a new row keeps today's.
          vatReducedRate: exact?.rescue.get(yr)?.vatReducedRate ?? RESCUE_ROW_DEFAULTS.vatReducedRate,
          vatSuperReducedRate: exact?.rescue.get(yr)?.vatSuperReducedRate ?? RESCUE_ROW_DEFAULTS.vatSuperReducedRate,
          irpfExtraPoints: Number(irpfExtraPoints.toFixed(4)),
          irpfThreshold
        });
      }

      const haircut = Number.isFinite(haircutPct) && haircutPct > 0
        ? Math.min(0.8, haircutPct / 100)
        : 0;
      const hasTermOrRate = Number.isInteger(restTermYrs) && restTermYrs > 0;
      if (!keep.restructuring && (haircut > 0.0001 || hasTermOrRate)) {
        const termYears = hasTermOrRate ? Math.max(1, Math.min(50, restTermYrs)) : 35;
        const nominalRate = Number.isFinite(restNomRatePct) && restNomRatePct >= 0
          ? Math.min(0.30, restNomRatePct / 100)
          : 0.02;
        debtRestructurings.push({
          year: yr,
          haircut: Number(haircut.toFixed(4)),
          termYears,
          nominalRate: Number(nominalRate.toFixed(4)),
          fundedSovereignShare: exact?.restructuring.get(yr)?.fundedSovereignShare ?? 0.15,
          creditorDiscountRate: exact?.restructuring.get(yr)?.creditorDiscountRate ?? 0.03
        });
      }
    }

    next.paymentAdjustments = paymentAdjustments;
    next.fiscalRescues = fiscalRescues;
    next.debtRestructurings = debtRestructurings;
  }

  const validated = validateConfig(next);
  return {
    config: validated,
    selectedYear,
    limits: full?.limits ?? null,
    modelName: scenarioSystemName(validated),
    importedKeysCount: rawKv.size,
    notes,
    // complete: the file's full copy was the base; edits: cells and measure groups changed on it.
    complete: Boolean(full),
    edits,
    notice: full ? null
      : `${fullRow ? 'La copia completa del archivo es de otra versión o calibración, o está dañada' : 'El archivo no lleva copia completa del escenario'}: se han leído solo sus celdas, y lo que no tiene celda se toma del escenario abierto.`
  };
}

/**
 * Parses an uploaded `.xlsx`, `.csv`, or `.json` buffer/text and returns `{ config, selectedYear, modelName, importedKeysCount }`.
 */
export async function parseImportedModelFile(uint8OrBuffer, filename = '', currentConfig = DEFAULT_CONFIG) {
  const bytes = uint8OrBuffer instanceof Uint8Array
    ? uint8OrBuffer
    : new Uint8Array(uint8OrBuffer);
  const lower = String(filename).toLowerCase();

  // Check if ZIP (.xlsx) by magic header PK\x03\x04
  const isZip = bytes.length >= 4 &&
    bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

  if (isZip || lower.endsWith('.xlsx')) {
    const entries = await extractZipTextEntries(bytes);
    const sharedStrings = parseSharedStringsXml(entries.get('xl/sharedStrings.xml'));
    const named = sheetFilesByName(entries);
    const sheet1Xml = entries.get(named.params ?? 'xl/worksheets/sheet1.xml');
    if (!sheet1Xml) {
      throw new Error('El archivo .xlsx no contiene la hoja 1 de parámetros (xl/worksheets/sheet1.xml).');
    }
    const sheet1Grid = parseWorksheetXmlToGrid(sheet1Xml, sharedStrings);
    const sheet2Xml = entries.get(named.measures ?? 'xl/worksheets/sheet2.xml');
    const sheet2Grid = sheet2Xml ? parseWorksheetXmlToGrid(sheet2Xml, sharedStrings) : [];
    const result = applyImportedGrids(sheet1Grid, sheet2Grid, currentConfig);
    if (result.importedKeysCount === 0) {
      throw new Error('No se encontraron parámetros reconocidos en la Hoja 1 del archivo Excel (.xlsx).');
    }
    return result;
  }

  const text = utf8Decoder.decode(bytes).trim();
  if (lower.endsWith('.json') || text.startsWith('{')) {
    const parsed = JSON.parse(text);
    const selectedYear = Number.isInteger(parsed?.selectedYear) && parsed.selectedYear >= BASE_YEAR && parsed.selectedYear <= END_YEAR ? parsed.selectedYear : null;
    // A08: a saved scenario (it says its version or its base, as the Laboratorio's JSON copy
    // does) is read whole and migrated like the browser's own state, or refused; a file of
    // loose keys changes only those keys of the open scenario, and the reader is told.
    if (parsed && typeof parsed === 'object' && ('version' in parsed || 'calibration' in parsed)) {
      if (parsed.calibration !== CALIBRATION_ID) {
        throw new Error(`es de otra base de datos («${parsed.calibration ?? 'sin base'}»; esta versión usa «${CALIBRATION_ID}»). No se importa, para no mezclar cifras de bases distintas.`);
      }
      if (!readableStateVersion(parsed.version)) {
        throw new Error(`es un escenario de una versión que esta no sabe leer (${parsed.version ?? 'sin versión'}). No se importa.`);
      }
      if (!parsed.config || typeof parsed.config !== 'object') throw new Error('no trae la configuración del escenario.');
      const validated = validateConfig(configForStateVersion(parsed.config, parsed.version));
      return { config: validated, selectedYear, limits: limitsOf(parsed.limits), modelName: scenarioSystemName(validated),
        importedKeysCount: Object.keys(parsed.config).length, complete: true, edits: 0, notice: null };
    }
    const cfgInput = parsed.config ?? parsed;
    const validated = validateConfig({ ...currentConfig, ...cfgInput });
    return {
      config: validated,
      selectedYear,
      modelName: scenarioSystemName(validated),
      importedKeysCount: Object.keys(cfgInput).length,
      complete: false,
      edits: 0,
      notice: 'Es un archivo de cambios sueltos: los ajustes que no trae conservan el valor del escenario abierto.'
    };
  }

  // Otherwise parse as CSV/TSV
  const csvGrid = parseCsvToGrid(text);
  const result = applyImportedGrids(csvGrid, [], currentConfig);
  if (result.importedKeysCount === 0) {
    // A series CSV exported here carries its scenario as a link in its header (# Escenario: …#escenario=…).
    const linked = decodeScenarioHash(text, DEFAULT_CONFIG, validateConfig);
    if (linked?.rejected) throw new Error(linked.rejected);
    if (linked?.config) return { config: linked.config, selectedYear: null, modelName: scenarioSystemName(linked.config), importedKeysCount: Object.keys(linked.diff).length, complete: false, edits: 0 };
    // Its header without #escenario= is the scenario of today's rules (the console was index.html until 1.78).
    if (/^# Escenario: (?!.*#escenario=)\S*(?:index|consola)\.html\s*$/m.test(text)) return { config: validateConfig({ ...DEFAULT_CONFIG }), selectedYear: null, modelName: scenarioSystemName(DEFAULT_CONFIG), importedKeysCount: 0, complete: true, edits: 0 };
    throw new Error('No se encontraron claves de parámetros válidas en el archivo CSV.');
  }
  return result;
}

export function triggerBlobDownload(bytes, filename, mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// The site's Excel buttons (toast, export and import of the open scenario) were left out: the console
// calls buildModelsXlsxBytes and parseImportedModelFile itself (src/pages/consola.js, docs/DECISIONES.md).
