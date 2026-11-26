// Who counts as a contributor in the «per contributor» figures (1.56, docs/PLAN-1.56-LOTE.md).
// The engine's `workers` are full-time equivalents: with the full Laffer response (1.54)
// they fall with the hours lost to the labour tax wedge, though the same persons work.
// Payroll, contributions, rights and GDP use them. Contributors per pensioner, debt per
// contributor and the like count persons: `workingPersons`, before the hours. Rows from
// before 1.56 (or from engines without the response) do not carry it and read `workers`.

/** Persons who work in a year row. */
export const workingPersonsOf = point => point?.workingPersons ?? point?.workers;

/** What a person who works earns in the year: the full-time wage times the year's hours
 *  (`averageEarningsAnnual`, only with the full response), else the wage. */
export const earningsPerPersonOf = point => point?.averageEarningsAnnual ?? point?.wage;
