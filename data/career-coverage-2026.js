/** Retirement coverage by generation (designed 26/11/2026; calibrated and on since 1.78, docs/DECISIONES.md).
 * Without it, only those employed in 2026 (and later entrants) ever retire, so each generation retires with its
 * 2026 employment rate: too few for those born 1962–1971, who also retire from unemployment or inactivity with a
 * career, and too many for those born from 1972, all of whom retire. With it on:
 *  - the 2026 workers are spread by age and sex inside each Ageing Report group with the EPA's five-year rates
 *    (data/epa-employment-2026.js);
 *  - `extra`: a share of each generation's population, not employed in 2026 but with a career, is added: it does
 *    not work nor contribute, keeps its earlier rights for `inactiveCareerShare` of a full career, and retires at its
 *    age like everyone else;
 *  - `noClaim`: a share of each generation's 2026 workers works and contributes but reaches no contributory public
 *    pension (an incomplete career): at retirement it loses the earlier, new pay-as-you-go and notional rights (the
 *    notional ones as extinguished), keeps any private fund, and is not counted as a retiree.
 * The shares are by year of birth and sex; a missing year is 0. Calibration (R): the Ageing Report's new pensions
 * (country fiche, Table 17) over the population of their age.
 */
function row(extra, noClaim) { const v = Object.freeze({ extra, noClaim }); return Object.freeze({ M: v, F: v }); }

export const CAREER_COVERAGE_2026 = Object.freeze({
  id: 'career-coverage-2026-v1',
  enabled: true,
  inactiveCareerShare: 0.7,
  // R (1.78): a net coverage change by year of birth, linear between the generations retiring in the Ageing Report's
  // published years (1964 → 2030, 1974 → 2040, 1984 → 2050, 1994 → 2060), flat outside them, fitted so that with its
  // assumptions (ref:ageing-report-2024) new retirements equal its Table 17: 1964 0.0609, 1974 -0.0541, 1984 -0.0618, 1994 -0.0520.
  // Positive = extra (share of the population), negative = noClaim (share of the 2026 workers); the same for both sexes.
  // { [birthYear]: { M: { extra, noClaim }, F: { extra, noClaim } } }
  byBirthYear: Object.freeze({
    1962: row(0.0609, 0),
    1963: row(0.0609, 0),
    1964: row(0.0609, 0),
    1965: row(0.0494, 0),
    1966: row(0.0379, 0),
    1967: row(0.0264, 0),
    1968: row(0.0149, 0),
    1969: row(0.0034, 0),
    1970: row(0, 0.0081),
    1971: row(0, 0.0196),
    1972: row(0, 0.0311),
    1973: row(0, 0.0426),
    1974: row(0, 0.0541),
    1975: row(0, 0.0548),
    1976: row(0, 0.0556),
    1977: row(0, 0.0564),
    1978: row(0, 0.0572),
    1979: row(0, 0.0579),
    1980: row(0, 0.0587),
    1981: row(0, 0.0595),
    1982: row(0, 0.0603),
    1983: row(0, 0.0611),
    1984: row(0, 0.0618),
    1985: row(0, 0.0608),
    1986: row(0, 0.0599),
    1987: row(0, 0.0589),
    1988: row(0, 0.0579),
    1989: row(0, 0.0569),
    1990: row(0, 0.0559),
    1991: row(0, 0.0549),
    1992: row(0, 0.0539),
    1993: row(0, 0.053),
    1994: row(0, 0.052),
    1995: row(0, 0.052),
    1996: row(0, 0.052),
    1997: row(0, 0.052),
    1998: row(0, 0.052),
    1999: row(0, 0.052),
    2000: row(0, 0.052),
    2001: row(0, 0.052),
    2002: row(0, 0.052),
    2003: row(0, 0.052),
    2004: row(0, 0.052)
  })
});

const ZERO = Object.freeze({ extra: 0, noClaim: 0 });

/** The coverage shares of a generation and sex ({ extra, noClaim }, both 0 when off or not set). */
export function careerCoverage(birthYear, sex, table = CAREER_COVERAGE_2026) {
  if (!table.enabled) return ZERO;
  const row = table.byBirthYear[birthYear]?.[sex];
  return row ? { extra: row.extra ?? 0, noClaim: row.noClaim ?? 0 } : ZERO;
}
