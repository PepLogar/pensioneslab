/** V3 separates the two levies grouped in TGSS budget heading120.
 * These are net recognised rights, not receipts. The annual pace remains an
 * explicit Jan-Aug ×12/8 estimate, with no completed2026 outcome implied. */
import { CURRENT_SPAIN as PREVIOUS } from './current-spain-v2.js';

const million = 1e6;
export const CONTRIBUTION_BREAKDOWN_2026 = Object.freeze({
  period: '2026-01/2026-08', measure: 'net-recognised-rights', unit: 'EUR',
  heading120: 4074.65 * million,
  solidarity1206: 483.39 * million, solidarity1207: 3.92 * million,
  solidarity: 487.31 * million,
  mei: 3587.34 * million,
  meiDerivation: 'Heading120 less solidarity1206 and1207; rounded MEI subheadings sum to3587.35M, a0.01M rounding discrepancy.',
  source: Object.freeze({
    url: 'https://www.seg-social.es/descarga/es/L_Entidades_Agosto_2026.pdf',
    snapshot: 'data/sources/fmi-income-tgss-202608.pdf',
    sha256: '998526f8dbb5fc6d890d5e2c326537bb8eae95f50c3c8d776516b9baf5327d4a',
    locator: 'PDF page59 / printed page58; TGSS income, cumulative through August2026, heading120 and subheadings1206/1207',
    informationCutoff: '2026-10-17'
  })
});
const meiAnnualPace = CONTRIBUTION_BREAKDOWN_2026.mei * 12 / 8;
const solidarityAnnualPace = CONTRIBUTION_BREAKDOWN_2026.solidarity * 12 / 8;
// Preserve the earlier ordinary allocation literally: this correction does not
// retrospectively claim to identify taxable payroll or improve that proxy.
const ordinaryPensionPool = PREVIOUS.base.ordinaryPensionPool;
const pensionContributions = ordinaryPensionPool + meiAnnualPace + solidarityAnnualPace;

export const CURRENT_SPAIN = Object.freeze({ ...PREVIOUS,
  id: 'es-current-2026-10-17-v3', previousCalibration: PREVIOUS.id,
  observed: Object.freeze({ ...PREVIOUS.observed,
    specialContributionsJanAug: CONTRIBUTION_BREAKDOWN_2026.heading120,
    meiJanAug: CONTRIBUTION_BREAKDOWN_2026.mei,
    solidarityJanAug: CONTRIBUTION_BREAKDOWN_2026.solidarity,
    solidarityByBudgetCode: Object.freeze({
      '1206': CONTRIBUTION_BREAKDOWN_2026.solidarity1206,
      '1207': CONTRIBUTION_BREAKDOWN_2026.solidarity1207
    }) }),
  base: Object.freeze({ ...PREVIOUS.base, ordinaryPensionPool,
    meiAnnualPace, solidarityAnnualPace, pensionContributions,
    otherRevenue: PREVIOUS.base.totalRevenue - pensionContributions }),
  methods: Object.freeze({ ...PREVIOUS.methods,
    contributions: 'Ordinary pension pool retained literally fromv2. TGSS heading120 is split into MEI and solidarity, each estimated at Jan-Aug net recognised rights ×12/8; neither is observed annual cash revenue.',
    openingReclassification: 'The old4075M heading estimate becomes4074.65M. Its0.525M annualised rounding difference moves to other revenue; consolidated opening income is unchanged.',
    solidarity: 'Public non-contributory levy on excess pay, creating no individual rights and not allocated to the Reserve Fund. Future ledger revenue uses the minimum statutory band-rate ratio to2026, assuming every band excess scales with aggregate payroll; the maximum ratio is a diagnostic only, not extra revenue or a forecast interval.',
    fiscal: 'Opening consolidated totals unchanged. Optional external research opening components and matched temporary grant/spending calendars are explicit inputs; future fiscal outcomes never serve as targets.' }),
  sources: Object.freeze({ ...PREVIOUS.sources,
    contributionBreakdown: CONTRIBUTION_BREAKDOWN_2026.source,
    solidarityNoRights: Object.freeze({
      url: 'https://www.congreso.es/l15p/e2/e_0026517_n_000.pdf',
      date: '2024-05-22', locator: 'Government response184/6348, page2; solidarity creates no individual benefit rights',
      statutoryLocator: 'LGSS articles19bis,127bis,118.4 and120.2; solidarity and MEI have distinct earmarking' }) })
});
