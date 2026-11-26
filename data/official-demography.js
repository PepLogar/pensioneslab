/** Official AR2024 Spain aggregates and separately labelled reconstructions.
 * No interpolation, simulation, spending correction or newer statistical vintage.
 * See source/cell metadata and limitations before combining series.
 */
export const AR2024_DEMOGRAPHY = {
  "id": "es-ar2024-official-demography-v1",
  "baseYear": 2022,
  "endYear": 2070,
  "retrievedOn": "2026-10-17",
  "sources": {
    "statisticalAnnex": {
      "url": "https://economy-finance.ec.europa.eu/document/download/e248db46-f876-4e72-8821-efae678e81ea_en?filename=2024_Ageing_Report-Statistical_annex_all_countryfiches.xlsx",
      "publicationDate": "2024-04-18",
      "snapshot": "data/sources/2024_Ageing_Report-Statistical_annex_all_countryfiches.xlsx",
      "sha256": "8453dfda8db0ad253d3965cd85490c30e4b5d0598eb6c2ffa4adbf23ab45bb7f",
      "bytes": 11840707,
      "geography": "ES",
      "demographicVintage": "EUROPOP2023",
      "yearColumns": "D=2022 through AZ=2070"
    },
    "spainFiche": {
      "url": "https://economy-finance.ec.europa.eu/document/download/392994f2-c025-4066-bea8-f65cf4bcd411_en?filename=2024-ageing-report-country-fiche-Spain.pdf",
      "publicationDate": "2024-04-18",
      "policyCutoff": "2023-12-01",
      "pageConvention": "Printed page number is PDF viewer page number plus one"
    },
    "methodologyFiches": {
      "url": "https://economy-finance.ec.europa.eu/document/download/ed4a2c74-e35d-48ca-80fc-092a021bddf8_en?filename=Ageing_Report_2024-Country_fiches_1.xlsx",
      "publicationDate": "2023-11-10",
      "notesCells": [
        "ES!C76",
        "ES!C77",
        "ES!C80"
      ],
      "purpose": "Resolve copied footnote errors in the final annex; values remain from the final annex."
    }
  },
  "annualProvenance": {
    "populationPersons": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 16,
      "columns": "D:AZ",
      "sourceLabel": "Population (million)",
      "sourceUnit": "million persons",
      "unit": "persons",
      "multiplier": 1000000.0
    },
    "populationShare25To54Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 17,
      "columns": "D:AZ",
      "sourceLabel": "share of prime-age population (25-54y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "populationShare20To64Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 18,
      "columns": "D:AZ",
      "sourceLabel": "share of working-age population (20-64y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "populationShare65PlusPct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 19,
      "columns": "D:AZ",
      "sourceLabel": "share of elderly population (+65y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "populationShare80PlusPct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 20,
      "columns": "D:AZ",
      "sourceLabel": "share of very elderly population (+80y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "population20To64Persons": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 34,
      "columns": "D:AZ",
      "sourceLabel": "Working-age population (20-64y; thousands)",
      "sourceUnit": "thousand persons",
      "unit": "persons",
      "multiplier": 1000.0
    },
    "population55To64ShareOf20To64Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 69,
      "columns": "D:AZ",
      "sourceLabel": "Share of older population in working-age population (2)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1,
      "definitionNote": "Denominator 20-64 confirmed in methodology workbook ES!C77; the final annex footer contains a stale 15-64 label."
    },
    "lifeExpectancy65MaleYears": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 12,
      "columns": "D:AZ",
      "sourceLabel": "males",
      "sourceUnit": "years",
      "unit": "years",
      "multiplier": 1
    },
    "lifeExpectancy65FemaleYears": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 13,
      "columns": "D:AZ",
      "sourceLabel": "females",
      "sourceUnit": "years",
      "unit": "years",
      "multiplier": 1
    },
    "netMigrationPersons": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 14,
      "columns": "D:AZ",
      "sourceLabel": "Net migration (thousands)",
      "sourceUnit": "thousand persons",
      "unit": "persons",
      "multiplier": 1000.0
    },
    "potentialGDPGrowthPct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 23,
      "columns": "D:AZ",
      "sourceLabel": "Potential GDP (growth rate)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "potentialEmployment15To74GrowthPct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 24,
      "columns": "D:AZ",
      "sourceLabel": "Employment (15-74y; growth rate)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1,
      "definitionNote": "Potential-output assumptions block; not the observed annual growth of the employment-level series. Do not splice it into employment20To74Persons."
    },
    "labourProductivityPerHourGrowthPct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 26,
      "columns": "D:AZ",
      "sourceLabel": "Labour productivity per hour (growth rate)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "potentialGDPPerWorkerGrowthPct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 30,
      "columns": "D:AZ",
      "sourceLabel": "Potential GDP per worker (growth rate)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "hicpInflationPct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 31,
      "columns": "D:AZ",
      "sourceLabel": "HICP (growth rate)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "nominalInterestRatePct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 32,
      "columns": "D:AZ",
      "sourceLabel": "Nominal interest rate",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "labourForce20To64Persons": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 36,
      "columns": "D:AZ",
      "sourceLabel": "Labour force (20-64y; thousands)",
      "sourceUnit": "thousand persons",
      "unit": "persons",
      "multiplier": 1000.0
    },
    "participation20To24Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 39,
      "columns": "D:AZ",
      "sourceLabel": "young (20-24y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "participation25To54Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 40,
      "columns": "D:AZ",
      "sourceLabel": "prime-age (25-54y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "participation55To64Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 41,
      "columns": "D:AZ",
      "sourceLabel": "older (55-64y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "participation65To74Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 42,
      "columns": "D:AZ",
      "sourceLabel": "oldest (65-74y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "labourMarketExitAgeYears": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 55,
      "columns": "D:AZ",
      "sourceLabel": "Average labour market exit age (1)",
      "sourceUnit": "years",
      "unit": "years",
      "multiplier": 1,
      "referenceYearException": {
        "sourceCell": "ESa!D55",
        "columnYear": 2022,
        "actualReferenceYear": 2023,
        "sourceValueYears": 63.994,
        "handling": "annual[2022] is null; 2023 is available at E55. See methodology workbook ES!C76 and Spain fiche Table 8 note."
      }
    },
    "employment20To64Persons": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 62,
      "columns": "D:AZ",
      "sourceLabel": "Employment (20-64y; millions)",
      "sourceUnit": "million persons",
      "unit": "persons",
      "multiplier": 1000000.0
    },
    "employment20To74Persons": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 63,
      "columns": "D:AZ",
      "sourceLabel": "Employment (20-74y; millions)",
      "sourceUnit": "million persons",
      "unit": "persons",
      "multiplier": 1000000.0
    },
    "employmentShare20To24Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 64,
      "columns": "D:AZ",
      "sourceLabel": "share of young (20-24y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "employmentShare25To54Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 65,
      "columns": "D:AZ",
      "sourceLabel": "share of prime-age (25-54y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "employmentShare55To64Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 66,
      "columns": "D:AZ",
      "sourceLabel": "share of older (55-64y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "employmentShare65To74Pct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESa",
      "row": 67,
      "columns": "D:AZ",
      "sourceLabel": "share of oldest (65-74y)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "publicPensionersPersons": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESb",
      "row": 20,
      "columns": "D:AZ",
      "sourceLabel": "Pensioners (public, 1000 persons)",
      "sourceUnit": "thousand persons",
      "unit": "persons",
      "multiplier": 1000.0
    },
    "publicPensioners65PlusPersons": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESb",
      "row": 21,
      "columns": "D:AZ",
      "sourceLabel": "Pensioners aged 65+ (1000 persons)",
      "sourceUnit": "thousand persons",
      "unit": "persons",
      "multiplier": 1000.0
    },
    "publicBenefitRatioPct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESb",
      "row": 23,
      "columns": "D:AZ",
      "sourceLabel": "Benefit ratio (total public pensions, gross)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1
    },
    "earningsRelatedRetirementNewAwardReplacementRatePct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESb",
      "row": 24,
      "columns": "D:AZ",
      "sourceLabel": "Gross replacement rate at retirement (earnings-related public pensions)",
      "sourceUnit": "percent",
      "unit": "percent",
      "multiplier": 1,
      "scopeNote": "Old-age and early earnings-related public pensions; new award divided by wage before retirement. Not the benefit ratio of the pension stock."
    },
    "newAwardAverageContributoryPeriodYears": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESb",
      "row": 26,
      "columns": "D:AZ",
      "sourceLabel": "Average contributory period (new earnings-related pensions)",
      "sourceUnit": "years",
      "unit": "years",
      "multiplier": 1
    },
    "publicPensionContributorsPersons": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESb",
      "row": 27,
      "columns": "D:AZ",
      "sourceLabel": "Contributors (public pensions, 1000 persons)",
      "sourceUnit": "thousand persons",
      "unit": "persons",
      "multiplier": 1000.0
    },
    "publicPensionSpendingGDPpct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESb",
      "row": 7,
      "columns": "D:AZ",
      "sourceLabel": "Public pensions, gross",
      "sourceUnit": "percent of GDP",
      "unit": "percent of GDP",
      "multiplier": 1
    },
    "earningsRelatedRetirementSpendingGDPpct": {
      "sourceId": "statisticalAnnex",
      "sheet": "ESb",
      "row": 12,
      "columns": "D:AZ",
      "sourceLabel": "Earnings-related pensions, gross",
      "sourceUnit": "percent of GDP",
      "unit": "percent of GDP",
      "multiplier": 1
    }
  },
  "ficheAnchorProvenance": {
    "employmentPersons": {
      "sourceId": "spainFiche",
      "table": "14",
      "printedPage": 33,
      "pdfPage": 32,
      "unit": "persons",
      "sourceUnit": "thousand persons",
      "scope": "Employment as reported in Table 14; wider aggregate than the XLS employment20To74Persons series. No equivalence is assumed."
    },
    "retirementCoveragePct": {
      "sourceId": "spainFiche",
      "table": "13",
      "printedPage": 32,
      "pdfPage": 31,
      "unit": "percent",
      "scope": "Old-age earnings-related pensioners as share of all pensioners; rounded whole percent."
    },
    "retirementBenefitRatioPct": {
      "sourceId": "spainFiche",
      "table": "13",
      "printedPage": 32,
      "pdfPage": 31,
      "unit": "percent",
      "scope": "Average old-age earnings-related pension divided by economy-wide average wage; rounded whole percent."
    },
    "effectiveRetirementAgeYears": {
      "sourceId": "spainFiche",
      "table": "8",
      "printedPage": 23,
      "pdfPage": 22,
      "unit": "years",
      "scope": "Age at first receipt of old-age, early or disability pension. Not a statutory retirement age or a pure old-age hazard."
    },
    "retirementDurationYears": {
      "sourceId": "spainFiche",
      "table": "8",
      "printedPage": 23,
      "pdfPage": 22,
      "unit": "years",
      "scope": "Remaining life expectancy at average labour-market EXIT age, not at effective pension-receipt age."
    },
    "newRetirementPensionsCount": {
      "sourceId": "spainFiche",
      "table": "17",
      "printedPage": 34,
      "pdfPage": 33,
      "unit": "pensions",
      "sourceUnit": "thousand pensions",
      "scope": "New old-age and early earnings-related PENSIONS, not unique persons."
    },
    "wageNominalEuros": {
      "sourceId": "spainFiche",
      "table": "A1",
      "printedPage": 59,
      "pdfPage": 58,
      "unit": "nominal euros per year",
      "sourceUnit": "thousand euros per year",
      "scope": "Economy-wide average gross wage; the fiche uses the same wage as its retirement-wage proxy. Not real 2022 euros."
    }
  },
  "publicPensionerPopulationCoverageProvenance": {
    "sourceId": "spainFiche",
    "table": "15",
    "printedPage": 33,
    "pdfPage": 32,
    "unit": "percent of population in age group",
    "scope": "ALL public pensioners, including survivor and disability. Not an old-age retirement probability."
  },
  "derivedAnnualProvenance": {
    "status": "arithmetic reconstruction from published rounded aggregate cells, not a directly published age profile",
    "population25To54Persons": "populationPersons * populationShare25To54Pct / 100",
    "population55To64Persons": "population20To64Persons * population55To64ShareOf20To64Pct / 100",
    "population20To24Persons": "population20To64Persons - population25To54Persons - population55To64Persons",
    "population65To79Persons": "populationPersons * (populationShare65PlusPct - populationShare80PlusPct) / 100",
    "population80PlusPersons": "populationPersons * populationShare80PlusPct / 100",
    "populationUnder20Persons": "populationPersons - population20To64Persons - populationPersons * populationShare65PlusPct / 100",
    "employmentAgeGroupPersons": "employment20To74Persons * matching employmentShareAgeGroupPct / 100"
  },
  "derivedRetirementPensionerAnchorProvenance": {
    "status": "proxy, not observed headcount",
    "formula": "annual.publicPensionersPersons * ficheAnchors.retirementCoveragePct / 100",
    "warning": "Coverage is rounded to a whole percent and only published at six dates. No official annual retirement-pensioner series is claimed."
  },
  "limitations": [
    "Annual population/age shares are aggregates, not single-age cohort sizes. No uniform allocation within groups is implied.",
    "The demographic vintage is EUROPOP2023/AR2024; no later INE or EUROPOP2025 series are spliced in.",
    "Annual levels of employment20To74Persons and the fiche Table14 employmentPersons use different scopes; no automatic rescaling is applied.",
    "Effective retirement age, retirement duration, old-age benefit ratio and old-age coverage are only six published anchors. This module does not interpolate them.",
    "No annual real-wage series was found in these workbooks. Productivity growth is published separately and must not be relabelled as real wages without an explicit modelling assumption.",
    "The labour-market exit-age cell under 2022 refers to 2023; annual[2022].labourMarketExitAgeYears is null and the source value is retained in provenance.",
    "New pension awards count benefits, not unique persons. Population coverage of all pensions is not a retirement hazard.",
    "The final annex contains copied footer references to old years/EUROPOP2015. The series header and original methodology workbook identify EUROPOP2023 and the correct population denominators.",
    "Published percentages are retained as percentages, not fractions. Person counts are scaled from millions/thousands without adding statistical precision.",
    "The module supplies reference observations/projections; it does not multiply model spending by calibration factors."
  ],
  "annual": [
    {"year": 2022, "populationPersons": 47706600.0, "populationShare25To54Pct": 41.4757, "populationShare20To64Pct": 60.6474, "populationShare65PlusPct": 20.1991, "populationShare80PlusPct": 6.0667, "population20To64Persons": 28932822.0, "population55To64ShareOf20To64Pct": 23.0646, "lifeExpectancy65MaleYears": 19.5, "lifeExpectancy65FemaleYears": 23.6, "netMigrationPersons": 677181.0, "potentialGDPGrowthPct": 1.1369, "potentialEmployment15To74GrowthPct": 1.0987, "labourProductivityPerHourGrowthPct": 0.1485, "potentialGDPPerWorkerGrowthPct": 0.0378, "hicpInflationPct": 8.3226, "nominalInterestRatePct": 2.1817, "labourForce20To64Persons": 23032313.7, "participation20To24Pct": 55.3059, "participation25To54Pct": 87.446, "participation55To64Pct": 65.3655, "participation65To74Pct": 6.3741, "labourMarketExitAgeYears": null, "employment20To64Persons": 20130300.0, "employment20To74Persons": 20421000.0, "employmentShare20To24Pct": 4.9581, "employmentShare25To54Pct": 74.781, "employmentShare55To64Pct": 18.8373, "employmentShare65To74Pct": 1.4236, "publicPensionersPersons": 9984303.9, "publicPensioners65PlusPersons": 8125820.7, "publicBenefitRatioPct": 64.0518, "earningsRelatedRetirementNewAwardReplacementRatePct": 77.1799, "newAwardAverageContributoryPeriodYears": 37.8305, "publicPensionContributorsPersons": 23636304.0, "publicPensionSpendingGDPpct": 13.0866, "earningsRelatedRetirementSpendingGDPpct": 9.5636},
    {"year": 2023, "populationPersons": 48163400.0, "populationShare25To54Pct": 41.0682, "populationShare20To64Pct": 60.5548, "populationShare65PlusPct": 20.4776, "populationShare80PlusPct": 6.1046, "population20To64Persons": 29165214.5, "population55To64ShareOf20To64Pct": 23.3962, "lifeExpectancy65MaleYears": 19.7, "lifeExpectancy65FemaleYears": 23.8, "netMigrationPersons": 482259.0, "potentialGDPGrowthPct": 1.2048, "potentialEmployment15To74GrowthPct": 0.8843, "labourProductivityPerHourGrowthPct": 0.1981, "potentialGDPPerWorkerGrowthPct": 0.3178, "hicpInflationPct": 4.0052, "nominalInterestRatePct": 3.34, "labourForce20To64Persons": 23237774.5, "participation20To24Pct": 56.0775, "participation25To54Pct": 87.4774, "participation55To64Pct": 65.9231, "participation65To74Pct": 7.2557, "labourMarketExitAgeYears": 63.994, "employment20To64Persons": 20383200.0, "employment20To74Persons": 20722700.0, "employmentShare20To24Pct": 5.1857, "employmentShare25To54Pct": 73.9569, "employmentShare55To64Pct": 19.2194, "employmentShare65To74Pct": 1.638, "publicPensionersPersons": 10106514.4, "publicPensioners65PlusPersons": 8254885.4, "publicBenefitRatioPct": 67.0555, "earningsRelatedRetirementNewAwardReplacementRatePct": 74.7545, "newAwardAverageContributoryPeriodYears": 37.874, "publicPensionContributorsPersons": 23903441.1, "publicPensionSpendingGDPpct": 13.5672, "earningsRelatedRetirementSpendingGDPpct": 9.9851},
    {"year": 2024, "populationPersons": 48480200.0, "populationShare25To54Pct": 40.6793, "populationShare20To64Pct": 60.4564, "populationShare65PlusPct": 20.8368, "populationShare80PlusPct": 6.2124, "population20To64Persons": 29309378.5, "population55To64ShareOf20To64Pct": 23.7036, "lifeExpectancy65MaleYears": 19.9, "lifeExpectancy65FemaleYears": 24.0, "netMigrationPersons": 380645.0, "potentialGDPGrowthPct": 1.5496, "potentialEmployment15To74GrowthPct": 1.1353, "labourProductivityPerHourGrowthPct": 0.174, "potentialGDPPerWorkerGrowthPct": 0.4096, "hicpInflationPct": 2.7169, "nominalInterestRatePct": 3.4642, "labourForce20To64Persons": 23362028.3, "participation20To24Pct": 56.1019, "participation25To54Pct": 87.5418, "participation55To64Pct": 66.4442, "participation65To74Pct": 8.3576, "labourMarketExitAgeYears": 64.3217, "employment20To64Persons": 20561100.0, "employment20To74Persons": 20962800.0, "employmentShare20To24Pct": 5.3365, "employmentShare25To54Pct": 73.1795, "employmentShare55To64Pct": 19.5679, "employmentShare65To74Pct": 1.9161, "publicPensionersPersons": 10242865.4, "publicPensioners65PlusPersons": 8377269.4, "publicBenefitRatioPct": 68.1161, "earningsRelatedRetirementNewAwardReplacementRatePct": 75.8224, "newAwardAverageContributoryPeriodYears": 37.9229, "publicPensionContributorsPersons": 24099595.7, "publicPensionSpendingGDPpct": 13.655, "earningsRelatedRetirementSpendingGDPpct": 10.0991},
    {"year": 2025, "populationPersons": 48718500.0, "populationShare25To54Pct": 40.3094, "populationShare20To64Pct": 60.3368, "populationShare65PlusPct": 21.2475, "populationShare80PlusPct": 6.3448, "population20To64Persons": 29395192.5, "population55To64ShareOf20To64Pct": 24.0057, "lifeExpectancy65MaleYears": 20.0, "lifeExpectancy65FemaleYears": 24.1, "netMigrationPersons": 324473.0, "potentialGDPGrowthPct": 1.5095, "potentialEmployment15To74GrowthPct": 0.9599, "labourProductivityPerHourGrowthPct": 0.3077, "potentialGDPPerWorkerGrowthPct": 0.5444, "hicpInflationPct": 2.4779, "nominalInterestRatePct": 3.5883, "labourForce20To64Persons": 23445482.3, "participation20To24Pct": 56.0778, "participation25To54Pct": 87.5914, "participation55To64Pct": 67.0269, "participation65To74Pct": 9.5553, "labourMarketExitAgeYears": 64.664, "employment20To64Persons": 20795100.0, "employment20To74Persons": 21269800.0, "employmentShare20To24Pct": 5.4823, "employmentShare25To54Pct": 72.3792, "employmentShare55To64Pct": 19.9071, "employmentShare65To74Pct": 2.2314, "publicPensionersPersons": 10374283.3, "publicPensioners65PlusPersons": 8497151.6, "publicBenefitRatioPct": 68.6803, "earningsRelatedRetirementNewAwardReplacementRatePct": 76.2945, "newAwardAverageContributoryPeriodYears": 37.9701, "publicPensionContributorsPersons": 24264533.1, "publicPensionSpendingGDPpct": 13.7153, "earningsRelatedRetirementSpendingGDPpct": 10.1868},
    {"year": 2026, "populationPersons": 48898100.0, "populationShare25To54Pct": 39.9368, "populationShare20To64Pct": 60.2137, "populationShare65PlusPct": 21.6813, "populationShare80PlusPct": 6.4749, "population20To64Persons": 29443358.5, "population55To64ShareOf20To64Pct": 24.3312, "lifeExpectancy65MaleYears": 20.1, "lifeExpectancy65FemaleYears": 24.2, "netMigrationPersons": 268132.0, "potentialGDPGrowthPct": 1.3824, "potentialEmployment15To74GrowthPct": 0.7285, "labourProductivityPerHourGrowthPct": 0.4619, "potentialGDPPerWorkerGrowthPct": 0.6492, "hicpInflationPct": 2.239, "nominalInterestRatePct": 3.7125, "labourForce20To64Persons": 23518331.5, "participation20To24Pct": 56.0738, "participation25To54Pct": 87.5924, "participation55To64Pct": 67.9845, "participation65To74Pct": 10.632, "labourMarketExitAgeYears": 65.0208, "employment20To64Persons": 20998600.0, "employment20To74Persons": 21544600.0, "employmentShare20To24Pct": 5.6048, "employmentShare25To54Pct": 71.4943, "employmentShare55To64Pct": 20.367, "employmentShare65To74Pct": 2.5339, "publicPensionersPersons": 10506769.6, "publicPensioners65PlusPersons": 8615978.0, "publicBenefitRatioPct": 69.259, "earningsRelatedRetirementNewAwardReplacementRatePct": 76.6153, "newAwardAverageContributoryPeriodYears": 38.0197, "publicPensionContributorsPersons": 24415447.2, "publicPensionSpendingGDPpct": 13.8096, "earningsRelatedRetirementSpendingGDPpct": 10.2933},
    {"year": 2027, "populationPersons": 49021500.0, "populationShare25To54Pct": 39.5424, "populationShare20To64Pct": 60.0853, "populationShare65PlusPct": 22.1358, "populationShare80PlusPct": 6.6025, "population20To64Persons": 29454716.0, "population55To64ShareOf20To64Pct": 24.6931, "lifeExpectancy65MaleYears": 20.2, "lifeExpectancy65FemaleYears": 24.2, "netMigrationPersons": 216313.0, "potentialGDPGrowthPct": 1.2675, "potentialEmployment15To74GrowthPct": 0.5541, "labourProductivityPerHourGrowthPct": 0.5814, "potentialGDPPerWorkerGrowthPct": 0.7095, "hicpInflationPct": 2.0, "nominalInterestRatePct": 3.8367, "labourForce20To64Persons": 23585268.9, "participation20To24Pct": 56.1267, "participation25To54Pct": 87.546, "participation55To64Pct": 69.3655, "participation65To74Pct": 11.5218, "labourMarketExitAgeYears": 65.3922, "employment20To64Persons": 21196900.0, "employment20To74Persons": 21806600.0, "employmentShare20To24Pct": 5.7274, "employmentShare25To54Pct": 70.5003, "employmentShare55To64Pct": 20.9761, "employmentShare65To74Pct": 2.7961, "publicPensionersPersons": 10641624.7, "publicPensioners65PlusPersons": 8734118.9, "publicBenefitRatioPct": 69.7966, "earningsRelatedRetirementNewAwardReplacementRatePct": 76.9588, "newAwardAverageContributoryPeriodYears": 38.0715, "publicPensionContributorsPersons": 24549223.5, "publicPensionSpendingGDPpct": 13.9211, "earningsRelatedRetirementSpendingGDPpct": 10.4071},
    {"year": 2028, "populationPersons": 49118800.0, "populationShare25To54Pct": 39.1532, "populationShare20To64Pct": 59.9402, "populationShare65PlusPct": 22.6261, "populationShare80PlusPct": 6.7751, "population20To64Persons": 29441886.0, "population55To64ShareOf20To64Pct": 25.0342, "lifeExpectancy65MaleYears": 20.3, "lifeExpectancy65FemaleYears": 24.3, "netMigrationPersons": 220030.0, "potentialGDPGrowthPct": 1.0546, "potentialEmployment15To74GrowthPct": 0.2717, "labourProductivityPerHourGrowthPct": 0.7162, "potentialGDPPerWorkerGrowthPct": 0.7808, "hicpInflationPct": 2.0, "nominalInterestRatePct": 3.9608, "labourForce20To64Persons": 23628340.6, "participation20To24Pct": 56.1416, "participation25To54Pct": 87.5338, "participation55To64Pct": 70.55, "participation65To74Pct": 12.3256, "labourMarketExitAgeYears": 65.4632, "employment20To64Persons": 21205600.0, "employment20To74Persons": 21875100.0, "employmentShare20To24Pct": 5.7849, "employmentShare25To54Pct": 69.6241, "employmentShare55To64Pct": 21.5305, "employmentShare65To74Pct": 3.0605, "publicPensionersPersons": 10787630.1, "publicPensioners65PlusPersons": 8862344.6, "publicBenefitRatioPct": 69.5205, "earningsRelatedRetirementNewAwardReplacementRatePct": 76.774, "newAwardAverageContributoryPeriodYears": 38.1606, "publicPensionContributorsPersons": 24650720.4, "publicPensionSpendingGDPpct": 14.0182, "earningsRelatedRetirementSpendingGDPpct": 10.5078},
    {"year": 2029, "populationPersons": 49217400.0, "populationShare25To54Pct": 38.7711, "populationShare20To64Pct": 59.7366, "populationShare65PlusPct": 23.1609, "populationShare80PlusPct": 6.9551, "population20To64Persons": 29400819.0, "population55To64ShareOf20To64Pct": 25.3458, "lifeExpectancy65MaleYears": 20.4, "lifeExpectancy65FemaleYears": 24.4, "netMigrationPersons": 222132.0, "potentialGDPGrowthPct": 0.9464, "potentialEmployment15To74GrowthPct": 0.157, "labourProductivityPerHourGrowthPct": 0.7574, "potentialGDPPerWorkerGrowthPct": 0.7882, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.085, "labourForce20To64Persons": 23651049.3, "participation20To24Pct": 56.1869, "participation25To54Pct": 87.4759, "participation55To64Pct": 71.7672, "participation65To74Pct": 13.1152, "labourMarketExitAgeYears": 65.535, "employment20To64Persons": 21181300.0, "employment20To74Persons": 21915000.0, "employmentShare20To24Pct": 5.812, "employmentShare25To54Pct": 68.7723, "employmentShare55To64Pct": 22.0678, "employmentShare65To74Pct": 3.3479, "publicPensionersPersons": 10952062.2, "publicPensioners65PlusPersons": 9013459.1, "publicBenefitRatioPct": 69.2434, "earningsRelatedRetirementNewAwardReplacementRatePct": 76.45, "newAwardAverageContributoryPeriodYears": 38.252, "publicPensionContributorsPersons": 24734471.7, "publicPensionSpendingGDPpct": 14.1529, "earningsRelatedRetirementSpendingGDPpct": 10.644},
    {"year": 2030, "populationPersons": 49315400.0, "populationShare25To54Pct": 38.3791, "populationShare20To64Pct": 59.4784, "populationShare65PlusPct": 23.7095, "populationShare80PlusPct": 7.0943, "population20To64Persons": 29332005.0, "population55To64ShareOf20To64Pct": 25.6839, "lifeExpectancy65MaleYears": 20.5, "lifeExpectancy65FemaleYears": 24.5, "netMigrationPersons": 221156.0, "potentialGDPGrowthPct": 0.8423, "potentialEmployment15To74GrowthPct": 0.035, "labourProductivityPerHourGrowthPct": 0.7915, "potentialGDPPerWorkerGrowthPct": 0.807, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.2092, "labourForce20To64Persons": 23653533.4, "participation20To24Pct": 56.3605, "participation25To54Pct": 87.3888, "participation55To64Pct": 72.9423, "participation65To74Pct": 13.7932, "labourMarketExitAgeYears": 65.6074, "employment20To64Persons": 21132300.0, "employment20To74Persons": 21926100.0, "employmentShare20To24Pct": 5.8119, "employmentShare25To54Pct": 67.9505, "employmentShare55To64Pct": 22.6172, "employmentShare65To74Pct": 3.6204, "publicPensionersPersons": 11136785.2, "publicPensioners65PlusPersons": 9190607.1, "publicBenefitRatioPct": 68.9618, "earningsRelatedRetirementNewAwardReplacementRatePct": 76.0479, "newAwardAverageContributoryPeriodYears": 38.3539, "publicPensionContributorsPersons": 24796333.9, "publicPensionSpendingGDPpct": 14.3281, "earningsRelatedRetirementSpendingGDPpct": 10.8155},
    {"year": 2031, "populationPersons": 49412100.0, "populationShare25To54Pct": 37.9908, "populationShare20To64Pct": 59.2156, "populationShare65PlusPct": 24.2435, "populationShare80PlusPct": 7.22, "population20To64Persons": 29259659.5, "population55To64ShareOf20To64Pct": 26.0534, "lifeExpectancy65MaleYears": 20.6, "lifeExpectancy65FemaleYears": 24.6, "netMigrationPersons": 221887.0, "potentialGDPGrowthPct": 0.7316, "potentialEmployment15To74GrowthPct": -0.0995, "labourProductivityPerHourGrowthPct": 0.824, "potentialGDPPerWorkerGrowthPct": 0.8319, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.3334, "labourForce20To64Persons": 23644860.6, "participation20To24Pct": 56.5149, "participation25To54Pct": 87.3139, "participation55To64Pct": 73.925, "participation65To74Pct": 14.3436, "labourMarketExitAgeYears": 65.6806, "employment20To64Persons": 21069500.0, "employment20To74Persons": 21915300.0, "employmentShare20To24Pct": 5.7881, "employmentShare25To54Pct": 67.1977, "employmentShare55To64Pct": 23.1548, "employmentShare65To74Pct": 3.8594, "publicPensionersPersons": 11337612.0, "publicPensioners65PlusPersons": 9388810.5, "publicBenefitRatioPct": 68.6661, "earningsRelatedRetirementNewAwardReplacementRatePct": 75.4782, "newAwardAverageContributoryPeriodYears": 38.444, "publicPensionContributorsPersons": 24836549.8, "publicPensionSpendingGDPpct": 14.5384, "earningsRelatedRetirementSpendingGDPpct": 11.0173},
    {"year": 2032, "populationPersons": 49509600.0, "populationShare25To54Pct": 37.6252, "populationShare20To64Pct": 58.9154, "populationShare65PlusPct": 24.7875, "populationShare80PlusPct": 7.3711, "population20To64Persons": 29168800.5, "population55To64ShareOf20To64Pct": 26.3907, "lifeExpectancy65MaleYears": 20.7, "lifeExpectancy65FemaleYears": 24.7, "netMigrationPersons": 224813.0, "potentialGDPGrowthPct": 0.6479, "potentialEmployment15To74GrowthPct": -0.1843, "labourProductivityPerHourGrowthPct": 0.8295, "potentialGDPPerWorkerGrowthPct": 0.8337, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.4575, "labourForce20To64Persons": 23617247.6, "participation20To24Pct": 56.6361, "participation25To54Pct": 87.2459, "participation55To64Pct": 74.7602, "participation65To74Pct": 14.9107, "labourMarketExitAgeYears": 65.7545, "employment20To64Persons": 20988200.0, "employment20To74Persons": 21886500.0, "employmentShare20To24Pct": 5.7348, "employmentShare25To54Pct": 66.5425, "employmentShare55To64Pct": 23.6184, "employmentShare65To74Pct": 4.1043, "publicPensionersPersons": 11552463.7, "publicPensioners65PlusPersons": 9612359.8, "publicBenefitRatioPct": 68.3733, "earningsRelatedRetirementNewAwardReplacementRatePct": 75.0703, "newAwardAverageContributoryPeriodYears": 38.5392, "publicPensionContributorsPersons": 24858074.9, "publicPensionSpendingGDPpct": 14.7779, "earningsRelatedRetirementSpendingGDPpct": 11.2467},
    {"year": 2033, "populationPersons": 49607900.0, "populationShare25To54Pct": 37.3082, "populationShare20To64Pct": 58.569, "populationShare65PlusPct": 25.3314, "populationShare80PlusPct": 7.5406, "population20To64Persons": 29054808.5, "population55To64ShareOf20To64Pct": 26.689, "lifeExpectancy65MaleYears": 20.8, "lifeExpectancy65FemaleYears": 24.8, "netMigrationPersons": 225781.0, "potentialGDPGrowthPct": 0.7474, "potentialEmployment15To74GrowthPct": -0.1402, "labourProductivityPerHourGrowthPct": 0.8863, "potentialGDPPerWorkerGrowthPct": 0.8889, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.4346, "labourForce20To64Persons": 23571976.5, "participation20To24Pct": 56.7175, "participation25To54Pct": 87.1992, "participation55To64Pct": 75.4336, "participation65To74Pct": 15.4489, "labourMarketExitAgeYears": 65.8292, "employment20To64Persons": 21032200.0, "employment20To74Persons": 21982400.0, "employmentShare20To24Pct": 5.6704, "employmentShare25To54Pct": 66.0206, "employmentShare55To64Pct": 23.9865, "employmentShare65To74Pct": 4.3225, "publicPensionersPersons": 11777509.0, "publicPensioners65PlusPersons": 9852067.9, "publicBenefitRatioPct": 68.045, "earningsRelatedRetirementNewAwardReplacementRatePct": 74.6518, "newAwardAverageContributoryPeriodYears": 38.6266, "publicPensionContributorsPersons": 24862999.6, "publicPensionSpendingGDPpct": 15.0145, "earningsRelatedRetirementSpendingGDPpct": 11.4742},
    {"year": 2034, "populationPersons": 49708900.0, "populationShare25To54Pct": 37.0313, "populationShare20To64Pct": 58.2097, "populationShare65PlusPct": 25.8638, "populationShare80PlusPct": 7.7031, "population20To64Persons": 28935391.5, "population55To64ShareOf20To64Pct": 26.919, "lifeExpectancy65MaleYears": 20.9, "lifeExpectancy65FemaleYears": 24.8, "netMigrationPersons": 233277.0, "potentialGDPGrowthPct": 0.8755, "potentialEmployment15To74GrowthPct": -0.0961, "labourProductivityPerHourGrowthPct": 0.9727, "potentialGDPPerWorkerGrowthPct": 0.9725, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.4118, "labourForce20To64Persons": 23520074.1, "participation20To24Pct": 56.7186, "participation25To54Pct": 87.1328, "participation55To64Pct": 76.101, "participation65To74Pct": 15.8454, "labourMarketExitAgeYears": 65.9046, "employment20To64Persons": 21023400.0, "employment20To74Persons": 22015300.0, "employmentShare20To24Pct": 5.5744, "employmentShare25To54Pct": 65.6142, "employmentShare55To64Pct": 24.3059, "employmentShare65To74Pct": 4.5055, "publicPensionersPersons": 12010534.1, "publicPensioners65PlusPersons": 10099561.3, "publicBenefitRatioPct": 67.6633, "earningsRelatedRetirementNewAwardReplacementRatePct": 74.2836, "newAwardAverageContributoryPeriodYears": 38.7199, "publicPensionContributorsPersons": 24851571.8, "publicPensionSpendingGDPpct": 15.2403, "earningsRelatedRetirementSpendingGDPpct": 11.6947},
    {"year": 2035, "populationPersons": 49812300.0, "populationShare25To54Pct": 36.7787, "populationShare20To64Pct": 57.8439, "populationShare65PlusPct": 26.3956, "populationShare80PlusPct": 7.8754, "population20To64Persons": 28813345.5, "population55To64ShareOf20To64Pct": 27.0399, "lifeExpectancy65MaleYears": 21.0, "lifeExpectancy65FemaleYears": 24.9, "netMigrationPersons": 234065.0, "potentialGDPGrowthPct": 1.0188, "potentialEmployment15To74GrowthPct": -0.052, "labourProductivityPerHourGrowthPct": 1.0743, "potentialGDPPerWorkerGrowthPct": 1.0713, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.3889, "labourForce20To64Persons": 23459398.0, "participation20To24Pct": 56.6705, "participation25To54Pct": 87.0657, "participation55To64Pct": 76.722, "participation65To74Pct": 16.197, "labourMarketExitAgeYears": 65.9808, "employment20To64Persons": 21028800.0, "employment20To74Persons": 22059800.0, "employmentShare20To24Pct": 5.5184, "employmentShare25To54Pct": 65.2874, "employmentShare55To64Pct": 24.5206, "employmentShare65To74Pct": 4.6737, "publicPensionersPersons": 12249197.4, "publicPensioners65PlusPersons": 10352738.8, "publicBenefitRatioPct": 67.2146, "earningsRelatedRetirementNewAwardReplacementRatePct": 73.7177, "newAwardAverageContributoryPeriodYears": 38.8163, "publicPensionContributorsPersons": 24823786.9, "publicPensionSpendingGDPpct": 15.4481, "earningsRelatedRetirementSpendingGDPpct": 11.9018},
    {"year": 2036, "populationPersons": 49913500.0, "populationShare25To54Pct": 36.5714, "populationShare20To64Pct": 57.4515, "populationShare65PlusPct": 26.9312, "populationShare80PlusPct": 8.0703, "population20To64Persons": 28676036.5, "population55To64ShareOf20To64Pct": 27.0553, "lifeExpectancy65MaleYears": 21.1, "lifeExpectancy65FemaleYears": 25.0, "netMigrationPersons": 233685.0, "potentialGDPGrowthPct": 1.1763, "potentialEmployment15To74GrowthPct": -0.0079, "labourProductivityPerHourGrowthPct": 1.1902, "potentialGDPPerWorkerGrowthPct": 1.1843, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.366, "labourForce20To64Persons": 23376999.8, "participation20To24Pct": 56.5958, "participation25To54Pct": 87.0353, "participation55To64Pct": 77.1041, "participation65To74Pct": 16.6303, "labourMarketExitAgeYears": 66.0578, "employment20To64Persons": 21013800.0, "employment20To74Persons": 22090100.0, "employmentShare20To24Pct": 5.4575, "employmentShare25To54Pct": 65.1064, "employmentShare55To64Pct": 24.564, "employmentShare65To74Pct": 4.8722, "publicPensionersPersons": 12492889.6, "publicPensioners65PlusPersons": 10616102.7, "publicBenefitRatioPct": 66.6976, "earningsRelatedRetirementNewAwardReplacementRatePct": 73.1605, "newAwardAverageContributoryPeriodYears": 38.906, "publicPensionContributorsPersons": 24777490.0, "publicPensionSpendingGDPpct": 15.6354, "earningsRelatedRetirementSpendingGDPpct": 12.0969},
    {"year": 2037, "populationPersons": 50011600.0, "populationShare25To54Pct": 36.4089, "populationShare20To64Pct": 57.0135, "populationShare65PlusPct": 27.475, "populationShare80PlusPct": 8.2993, "population20To64Persons": 28513361.0, "population55To64ShareOf20To64Pct": 26.9536, "lifeExpectancy65MaleYears": 21.2, "lifeExpectancy65FemaleYears": 25.1, "netMigrationPersons": 233895.0, "potentialGDPGrowthPct": 1.3473, "potentialEmployment15To74GrowthPct": 0.0362, "labourProductivityPerHourGrowthPct": 1.3196, "potentialGDPPerWorkerGrowthPct": 1.3106, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.3431, "labourForce20To64Persons": 23269419.4, "participation20To24Pct": 56.5888, "participation25To54Pct": 86.9862, "participation55To64Pct": 77.3958, "participation65To74Pct": 17.1291, "labourMarketExitAgeYears": 66.1355, "employment20To64Persons": 20975800.0, "employment20To74Persons": 22103200.0, "employmentShare20To24Pct": 5.3948, "employmentShare25To54Pct": 65.0373, "employmentShare55To64Pct": 24.4672, "employmentShare65To74Pct": 5.1007, "publicPensionersPersons": 12742985.5, "publicPensioners65PlusPersons": 10892732.8, "publicBenefitRatioPct": 66.1043, "earningsRelatedRetirementNewAwardReplacementRatePct": 72.5132, "newAwardAverageContributoryPeriodYears": 38.9985, "publicPensionContributorsPersons": 24711158.0, "publicPensionSpendingGDPpct": 15.8007, "earningsRelatedRetirementSpendingGDPpct": 12.2786},
    {"year": 2038, "populationPersons": 50105500.0, "populationShare25To54Pct": 36.2738, "populationShare20To64Pct": 56.5246, "populationShare65PlusPct": 28.0197, "populationShare80PlusPct": 8.56, "population20To64Persons": 28321927.5, "population55To64ShareOf20To64Pct": 26.7465, "lifeExpectancy65MaleYears": 21.3, "lifeExpectancy65FemaleYears": 25.2, "netMigrationPersons": 232715.0, "potentialGDPGrowthPct": 1.4308, "potentialEmployment15To74GrowthPct": -0.0386, "labourProductivityPerHourGrowthPct": 1.4788, "potentialGDPPerWorkerGrowthPct": 1.4701, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.3203, "labourForce20To64Persons": 23145935.0, "participation20To24Pct": 56.7581, "participation25To54Pct": 86.9433, "participation55To64Pct": 77.6785, "participation65To74Pct": 17.5804, "labourMarketExitAgeYears": 66.2187, "employment20To64Persons": 20923500.0, "employment20To74Persons": 22098700.0, "employmentShare20To24Pct": 5.348, "employmentShare25To54Pct": 65.0681, "employmentShare55To64Pct": 24.266, "employmentShare65To74Pct": 5.3179, "publicPensionersPersons": 12995825.7, "publicPensioners65PlusPersons": 11168642.7, "publicBenefitRatioPct": 65.4246, "earningsRelatedRetirementNewAwardReplacementRatePct": 72.0648, "newAwardAverageContributoryPeriodYears": 39.1291, "publicPensionContributorsPersons": 24626862.0, "publicPensionSpendingGDPpct": 15.9546, "earningsRelatedRetirementSpendingGDPpct": 12.4518},
    {"year": 2039, "populationPersons": 50194100.0, "populationShare25To54Pct": 36.1785, "populationShare20To64Pct": 55.9852, "populationShare65PlusPct": 28.5721, "populationShare80PlusPct": 8.8316, "population20To64Persons": 28101303.0, "population55To64ShareOf20To64Pct": 26.438, "lifeExpectancy65MaleYears": 21.4, "lifeExpectancy65FemaleYears": 25.3, "netMigrationPersons": 232838.0, "potentialGDPGrowthPct": 1.5277, "potentialEmployment15To74GrowthPct": -0.1038, "labourProductivityPerHourGrowthPct": 1.6413, "potentialGDPPerWorkerGrowthPct": 1.6332, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.2974, "labourForce20To64Persons": 22995350.6, "participation20To24Pct": 56.9615, "participation25To54Pct": 86.9292, "participation55To64Pct": 77.7768, "participation65To74Pct": 18.1817, "labourMarketExitAgeYears": 66.3041, "employment20To64Persons": 20846700.0, "employment20To74Persons": 22078300.0, "employmentShare20To24Pct": 5.2829, "employmentShare25To54Pct": 65.231, "employmentShare55To64Pct": 23.9075, "employmentShare65To74Pct": 5.5786, "publicPensionersPersons": 13247888.1, "publicPensioners65PlusPersons": 11448640.5, "publicBenefitRatioPct": 64.6672, "earningsRelatedRetirementNewAwardReplacementRatePct": 71.6242, "newAwardAverageContributoryPeriodYears": 39.252, "publicPensionContributorsPersons": 24526600.5, "publicPensionSpendingGDPpct": 16.0923, "earningsRelatedRetirementSpendingGDPpct": 12.6151},
    {"year": 2040, "populationPersons": 50276600.0, "populationShare25To54Pct": 36.126, "populationShare20To64Pct": 55.3993, "populationShare65PlusPct": 29.1347, "populationShare80PlusPct": 9.1151, "population20To64Persons": 27852885.0, "population55To64ShareOf20To64Pct": 26.0442, "lifeExpectancy65MaleYears": 21.5, "lifeExpectancy65FemaleYears": 25.4, "netMigrationPersons": 231735.0, "potentialGDPGrowthPct": 1.6417, "potentialEmployment15To74GrowthPct": -0.1565, "labourProductivityPerHourGrowthPct": 1.8078, "potentialGDPPerWorkerGrowthPct": 1.801, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.2745, "labourForce20To64Persons": 22820769.5, "participation20To24Pct": 57.0605, "participation25To54Pct": 86.9232, "participation55To64Pct": 77.7913, "participation65To74Pct": 18.8881, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 20748000.0, "employment20To74Persons": 22044400.0, "employmentShare20To24Pct": 5.1706, "employmentShare25To54Pct": 65.5083, "employmentShare55To64Pct": 23.4399, "employmentShare65To74Pct": 5.8812, "publicPensionersPersons": 13492765.6, "publicPensioners65PlusPersons": 11727522.2, "publicBenefitRatioPct": 63.8379, "earningsRelatedRetirementNewAwardReplacementRatePct": 71.1162, "newAwardAverageContributoryPeriodYears": 39.3695, "publicPensionContributorsPersons": 24413827.9, "publicPensionSpendingGDPpct": 16.2047, "earningsRelatedRetirementSpendingGDPpct": 12.7608},
    {"year": 2041, "populationPersons": 50351300.0, "populationShare25To54Pct": 36.0986, "populationShare20To64Pct": 54.7913, "populationShare65PlusPct": 29.6957, "populationShare80PlusPct": 9.3976, "population20To64Persons": 27588149.5, "population55To64ShareOf20To64Pct": 25.5762, "lifeExpectancy65MaleYears": 21.6, "lifeExpectancy65FemaleYears": 25.4, "netMigrationPersons": 230588.0, "potentialGDPGrowthPct": 1.5633, "potentialEmployment15To74GrowthPct": -0.2613, "labourProductivityPerHourGrowthPct": 1.8327, "potentialGDPPerWorkerGrowthPct": 1.8294, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.2516, "labourForce20To64Persons": 22629996.7, "participation20To24Pct": 57.0339, "participation25To54Pct": 86.9348, "participation55To64Pct": 77.7334, "participation65To74Pct": 19.4258, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 20634000.0, "employment20To74Persons": 21986100.0, "employmentShare20To24Pct": 5.0408, "employmentShare25To54Pct": 65.9113, "employmentShare55To64Pct": 22.8982, "employmentShare65To74Pct": 6.1497, "publicPensionersPersons": 13747539.8, "publicPensioners65PlusPersons": 12016059.1, "publicBenefitRatioPct": 63.0157, "earningsRelatedRetirementNewAwardReplacementRatePct": 70.4086, "newAwardAverageContributoryPeriodYears": 39.4553, "publicPensionContributorsPersons": 24277035.9, "publicPensionSpendingGDPpct": 16.3406, "earningsRelatedRetirementSpendingGDPpct": 12.9282},
    {"year": 2042, "populationPersons": 50416500.0, "populationShare25To54Pct": 36.0718, "populationShare20To64Pct": 54.1904, "populationShare65PlusPct": 30.2374, "populationShare80PlusPct": 9.6774, "population20To64Persons": 27320898.0, "population55To64ShareOf20To64Pct": 25.0707, "lifeExpectancy65MaleYears": 21.7, "lifeExpectancy65FemaleYears": 25.5, "netMigrationPersons": 227482.0, "potentialGDPGrowthPct": 1.4959, "potentialEmployment15To74GrowthPct": -0.3469, "labourProductivityPerHourGrowthPct": 1.8493, "potentialGDPPerWorkerGrowthPct": 1.8492, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.2288, "labourForce20To64Persons": 22432654.8, "participation20To24Pct": 56.9044, "participation25To54Pct": 86.9328, "participation55To64Pct": 77.7066, "participation65To74Pct": 19.8025, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 20513200.0, "employment20To74Persons": 21908300.0, "employmentShare20To24Pct": 4.9224, "employmentShare25To54Pct": 66.3552, "employmentShare55To64Pct": 22.3547, "employmentShare65To74Pct": 6.3677, "publicPensionersPersons": 14001672.2, "publicPensioners65PlusPersons": 12306346.9, "publicBenefitRatioPct": 62.2055, "earningsRelatedRetirementNewAwardReplacementRatePct": 69.6518, "newAwardAverageContributoryPeriodYears": 39.547, "publicPensionContributorsPersons": 24120978.4, "publicPensionSpendingGDPpct": 16.4857, "earningsRelatedRetirementSpendingGDPpct": 13.1052},
    {"year": 2043, "populationPersons": 50470200.0, "populationShare25To54Pct": 36.0181, "populationShare20To64Pct": 53.6132, "populationShare65PlusPct": 30.7458, "populationShare80PlusPct": 9.9742, "population20To64Persons": 27058675.5, "population55To64ShareOf20To64Pct": 24.5743, "lifeExpectancy65MaleYears": 21.8, "lifeExpectancy65FemaleYears": 25.6, "netMigrationPersons": 224775.0, "potentialGDPGrowthPct": 1.4278, "potentialEmployment15To74GrowthPct": -0.4091, "labourProductivityPerHourGrowthPct": 1.8422, "potentialGDPPerWorkerGrowthPct": 1.8445, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.2059, "labourForce20To64Persons": 22238201.9, "participation20To24Pct": 56.7716, "participation25To54Pct": 86.9609, "participation55To64Pct": 77.6548, "participation65To74Pct": 19.9893, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 20394300.0, "employment20To74Persons": 21816000.0, "employmentShare20To24Pct": 4.8405, "employmentShare25To54Pct": 66.8094, "employmentShare55To64Pct": 21.8333, "employmentShare65To74Pct": 6.5168, "publicPensionersPersons": 14252213.0, "publicPensioners65PlusPersons": 12593891.8, "publicBenefitRatioPct": 61.4175, "earningsRelatedRetirementNewAwardReplacementRatePct": 68.8934, "newAwardAverageContributoryPeriodYears": 39.6425, "publicPensionContributorsPersons": 23952205.3, "publicPensionSpendingGDPpct": 16.6359, "earningsRelatedRetirementSpendingGDPpct": 13.2846},
    {"year": 2044, "populationPersons": 50510800.0, "populationShare25To54Pct": 35.9388, "populationShare20To64Pct": 53.0849, "populationShare65PlusPct": 31.2043, "populationShare80PlusPct": 10.3025, "population20To64Persons": 26813618.5, "population55To64ShareOf20To64Pct": 24.1189, "lifeExpectancy65MaleYears": 21.9, "lifeExpectancy65FemaleYears": 25.7, "netMigrationPersons": 219880.0, "potentialGDPGrowthPct": 1.3794, "potentialEmployment15To74GrowthPct": -0.4516, "labourProductivityPerHourGrowthPct": 1.835, "potentialGDPPerWorkerGrowthPct": 1.8393, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.183, "labourForce20To64Persons": 22049558.3, "participation20To24Pct": 56.6409, "participation25To54Pct": 86.9602, "participation55To64Pct": 77.6431, "participation65To74Pct": 20.0416, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 20279700.0, "employment20To74Persons": 21714400.0, "employmentShare20To24Pct": 4.7973, "employmentShare25To54Pct": 67.21, "employmentShare55To64Pct": 21.3854, "employmentShare65To74Pct": 6.6073, "publicPensionersPersons": 14495029.8, "publicPensioners65PlusPersons": 12874460.7, "publicBenefitRatioPct": 60.6512, "earningsRelatedRetirementNewAwardReplacementRatePct": 68.213, "newAwardAverageContributoryPeriodYears": 39.7393, "publicPensionContributorsPersons": 23775522.5, "publicPensionSpendingGDPpct": 16.7839, "earningsRelatedRetirementSpendingGDPpct": 13.46},
    {"year": 2045, "populationPersons": 50536900.0, "populationShare25To54Pct": 35.8405, "populationShare20To64Pct": 52.6176, "populationShare65PlusPct": 31.6043, "populationShare80PlusPct": 10.6378, "population20To64Persons": 26591327.5, "population55To64ShareOf20To64Pct": 23.7175, "lifeExpectancy65MaleYears": 22.0, "lifeExpectancy65FemaleYears": 25.8, "netMigrationPersons": 216194.0, "potentialGDPGrowthPct": 1.3513, "potentialEmployment15To74GrowthPct": -0.4728, "labourProductivityPerHourGrowthPct": 1.8277, "potentialGDPPerWorkerGrowthPct": 1.8328, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.1601, "labourForce20To64Persons": 21873736.6, "participation20To24Pct": 56.5438, "participation25To54Pct": 86.9671, "participation55To64Pct": 77.5926, "participation65To74Pct": 19.9667, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 20175900.0, "employment20To74Persons": 21608400.0, "employmentShare20To24Pct": 4.7924, "employmentShare25To54Pct": 67.5816, "employmentShare55To64Pct": 20.9966, "employmentShare65To74Pct": 6.6294, "publicPensionersPersons": 14725208.8, "publicPensioners65PlusPersons": 13141317.6, "publicBenefitRatioPct": 59.9064, "earningsRelatedRetirementNewAwardReplacementRatePct": 67.5612, "newAwardAverageContributoryPeriodYears": 39.8434, "publicPensionContributorsPersons": 23596167.2, "publicPensionSpendingGDPpct": 16.9208, "earningsRelatedRetirementSpendingGDPpct": 13.6229},
    {"year": 2046, "populationPersons": 50547900.0, "populationShare25To54Pct": 35.7317, "populationShare20To64Pct": 52.2115, "populationShare65PlusPct": 31.9472, "populationShare80PlusPct": 10.9575, "population20To64Persons": 26391854.0, "population55To64ShareOf20To64Pct": 23.3771, "lifeExpectancy65MaleYears": 22.0, "lifeExpectancy65FemaleYears": 25.8, "netMigrationPersons": 211455.0, "potentialGDPGrowthPct": 1.3436, "potentialEmployment15To74GrowthPct": -0.474, "labourProductivityPerHourGrowthPct": 1.8202, "potentialGDPPerWorkerGrowthPct": 1.8263, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.1373, "labourForce20To64Persons": 21717161.1, "participation20To24Pct": 56.4767, "participation25To54Pct": 86.9813, "participation55To64Pct": 77.5844, "participation65To74Pct": 19.7446, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 20089000.0, "employment20To74Persons": 21502300.0, "employmentShare20To24Pct": 4.8132, "employmentShare25To54Pct": 67.9209, "employmentShare55To64Pct": 20.6927, "employmentShare65To74Pct": 6.5731, "publicPensionersPersons": 14942544.8, "publicPensioners65PlusPersons": 13389208.2, "publicBenefitRatioPct": 59.1788, "earningsRelatedRetirementNewAwardReplacementRatePct": 66.8966, "newAwardAverageContributoryPeriodYears": 39.9469, "publicPensionContributorsPersons": 23418900.9, "publicPensionSpendingGDPpct": 17.0425, "earningsRelatedRetirementSpendingGDPpct": 13.7662},
    {"year": 2047, "populationPersons": 50542900.0, "populationShare25To54Pct": 35.6105, "populationShare20To64Pct": 51.8747, "populationShare65PlusPct": 32.2273, "populationShare80PlusPct": 11.2827, "population20To64Persons": 26218961.0, "population55To64ShareOf20To64Pct": 23.1318, "lifeExpectancy65MaleYears": 22.1, "lifeExpectancy65FemaleYears": 25.9, "netMigrationPersons": 207225.0, "potentialGDPGrowthPct": 1.3616, "potentialEmployment15To74GrowthPct": -0.4489, "labourProductivityPerHourGrowthPct": 1.8125, "potentialGDPPerWorkerGrowthPct": 1.8186, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.1144, "labourForce20To64Persons": 21575560.8, "participation20To24Pct": 56.4205, "participation25To54Pct": 87.0079, "participation55To64Pct": 77.4824, "participation65To74Pct": 19.5189, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 20015100.0, "employment20To74Persons": 21401900.0, "employmentShare20To24Pct": 4.848, "employmentShare25To54Pct": 68.2096, "employmentShare55To64Pct": 20.4623, "employmentShare65To74Pct": 6.4801, "publicPensionersPersons": 15139734.6, "publicPensioners65PlusPersons": 13613479.0, "publicBenefitRatioPct": 58.471, "earningsRelatedRetirementNewAwardReplacementRatePct": 66.2833, "newAwardAverageContributoryPeriodYears": 40.0504, "publicPensionContributorsPersons": 23249258.6, "publicPensionSpendingGDPpct": 17.1376, "earningsRelatedRetirementSpendingGDPpct": 13.8817},
    {"year": 2048, "populationPersons": 50521200.0, "populationShare25To54Pct": 35.4841, "populationShare20To64Pct": 51.6095, "populationShare65PlusPct": 32.444, "populationShare80PlusPct": 11.6059, "population20To64Persons": 26073726.0, "population55To64ShareOf20To64Pct": 22.9734, "lifeExpectancy65MaleYears": 22.2, "lifeExpectancy65FemaleYears": 26.0, "netMigrationPersons": 202507.0, "potentialGDPGrowthPct": 1.3916, "potentialEmployment15To74GrowthPct": -0.4118, "labourProductivityPerHourGrowthPct": 1.8048, "potentialGDPPerWorkerGrowthPct": 1.8108, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0915, "labourForce20To64Persons": 21452519.8, "participation20To24Pct": 56.3896, "participation25To54Pct": 87.0424, "participation55To64Pct": 77.3332, "participation65To74Pct": 19.2687, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 19957600.0, "employment20To74Persons": 21309700.0, "employmentShare20To24Pct": 4.8984, "employmentShare25To54Pct": 68.4458, "employmentShare55To64Pct": 20.3108, "employmentShare65To74Pct": 6.345, "publicPensionersPersons": 15315746.7, "publicPensioners65PlusPersons": 13811051.6, "publicBenefitRatioPct": 57.7806, "earningsRelatedRetirementNewAwardReplacementRatePct": 65.6495, "newAwardAverageContributoryPeriodYears": 40.1545, "publicPensionContributorsPersons": 23090090.6, "publicPensionSpendingGDPpct": 17.2028, "earningsRelatedRetirementSpendingGDPpct": 13.965},
    {"year": 2049, "populationPersons": 50483100.0, "populationShare25To54Pct": 35.3791, "populationShare20To64Pct": 51.4075, "populationShare65PlusPct": 32.607, "populationShare80PlusPct": 11.9186, "population20To64Persons": 25952128.0, "population55To64ShareOf20To64Pct": 22.8524, "lifeExpectancy65MaleYears": 22.3, "lifeExpectancy65FemaleYears": 26.1, "netMigrationPersons": 199414.0, "potentialGDPGrowthPct": 1.3577, "potentialEmployment15To74GrowthPct": -0.4207, "labourProductivityPerHourGrowthPct": 1.7789, "potentialGDPPerWorkerGrowthPct": 1.7859, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0686, "labourForce20To64Persons": 21349156.2, "participation20To24Pct": 56.3615, "participation25To54Pct": 87.0331, "participation55To64Pct": 77.338, "participation65To74Pct": 18.9938, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 19906700.0, "employment20To74Persons": 21216200.0, "employmentShare20To24Pct": 4.951, "employmentShare25To54Pct": 68.6354, "employmentShare55To64Pct": 20.2413, "employmentShare65To74Pct": 6.1723, "publicPensionersPersons": 15471222.2, "publicPensioners65PlusPersons": 13980686.8, "publicBenefitRatioPct": 57.1194, "earningsRelatedRetirementNewAwardReplacementRatePct": 65.1335, "newAwardAverageContributoryPeriodYears": 40.2593, "publicPensionContributorsPersons": 22943165.8, "publicPensionSpendingGDPpct": 17.2509, "earningsRelatedRetirementSpendingGDPpct": 14.027},
    {"year": 2050, "populationPersons": 50429300.0, "populationShare25To54Pct": 35.2891, "populationShare20To64Pct": 51.2568, "populationShare65PlusPct": 32.7294, "populationShare80PlusPct": 12.23, "population20To64Persons": 25848416.0, "population55To64ShareOf20To64Pct": 22.7652, "lifeExpectancy65MaleYears": 22.4, "lifeExpectancy65FemaleYears": 26.2, "netMigrationPersons": 196231.0, "potentialGDPGrowthPct": 1.3359, "potentialEmployment15To74GrowthPct": -0.417, "labourProductivityPerHourGrowthPct": 1.7528, "potentialGDPPerWorkerGrowthPct": 1.7603, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0458, "labourForce20To64Persons": 21259576.1, "participation20To24Pct": 56.334, "participation25To54Pct": 87.0202, "participation55To64Pct": 77.3588, "participation65To74Pct": 18.7912, "labourMarketExitAgeYears": 66.3919, "employment20To64Persons": 19857000.0, "employment20To74Persons": 21124100.0, "employmentShare20To24Pct": 5.0042, "employmentShare25To54Pct": 68.7898, "employmentShare55To64Pct": 20.2074, "employmentShare65To74Pct": 5.9985, "publicPensionersPersons": 15604966.8, "publicPensioners65PlusPersons": 14123186.8, "publicBenefitRatioPct": 56.4868, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.6482, "newAwardAverageContributoryPeriodYears": 40.3661, "publicPensionContributorsPersons": 22810746.3, "publicPensionSpendingGDPpct": 17.2792, "earningsRelatedRetirementSpendingGDPpct": 14.0663},
    {"year": 2051, "populationPersons": 50359800.0, "populationShare25To54Pct": 35.1994, "populationShare20To64Pct": 51.1565, "populationShare65PlusPct": 32.8128, "populationShare80PlusPct": 12.5437, "population20To64Persons": 25762342.0, "population55To64ShareOf20To64Pct": 22.7406, "lifeExpectancy65MaleYears": 22.5, "lifeExpectancy65FemaleYears": 26.2, "netMigrationPersons": 193490.0, "potentialGDPGrowthPct": 1.3159, "potentialEmployment15To74GrowthPct": -0.4119, "labourProductivityPerHourGrowthPct": 1.7268, "potentialGDPPerWorkerGrowthPct": 1.7349, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0229, "labourForce20To64Persons": 21183428.2, "participation20To24Pct": 56.3098, "participation25To54Pct": 87.0058, "participation55To64Pct": 77.3973, "participation65To74Pct": 18.6543, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19808500.0, "employment20To74Persons": 21033900.0, "employmentShare20To24Pct": 5.058, "employmentShare25To54Pct": 68.8791, "employmentShare55To64Pct": 20.2372, "employmentShare65To74Pct": 5.8257, "publicPensionersPersons": 15717545.2, "publicPensioners65PlusPersons": 14238032.7, "publicBenefitRatioPct": 55.8882, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.3316, "newAwardAverageContributoryPeriodYears": 40.4741, "publicPensionContributorsPersons": 22693003.8, "publicPensionSpendingGDPpct": 17.2904, "earningsRelatedRetirementSpendingGDPpct": 14.0845},
    {"year": 2052, "populationPersons": 50275600.0, "populationShare25To54Pct": 35.1022, "populationShare20To64Pct": 51.0984, "populationShare65PlusPct": 32.8658, "populationShare80PlusPct": 12.8636, "population20To64Persons": 25690005.5, "population55To64ShareOf20To64Pct": 22.7829, "lifeExpectancy65MaleYears": 22.6, "lifeExpectancy65FemaleYears": 26.3, "netMigrationPersons": 191464.0, "potentialGDPGrowthPct": 1.2939, "potentialEmployment15To74GrowthPct": -0.4086, "labourProductivityPerHourGrowthPct": 1.7007, "potentialGDPPerWorkerGrowthPct": 1.7095, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 21114285.1, "participation20To24Pct": 56.2888, "participation25To54Pct": 86.9907, "participation55To64Pct": 77.3971, "participation65To74Pct": 18.6327, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19755300.0, "employment20To74Persons": 20945100.0, "employmentShare20To24Pct": 5.1115, "employmentShare25To54Pct": 68.8931, "employmentShare55To64Pct": 20.3151, "employmentShare65To74Pct": 5.6803, "publicPensionersPersons": 15809509.3, "publicPensioners65PlusPersons": 14329886.2, "publicBenefitRatioPct": 55.3257, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.1002, "newAwardAverageContributoryPeriodYears": 40.5808, "publicPensionContributorsPersons": 22588948.2, "publicPensionSpendingGDPpct": 17.287, "earningsRelatedRetirementSpendingGDPpct": 14.0859},
    {"year": 2053, "populationPersons": 50177800.0, "populationShare25To54Pct": 35.0044, "populationShare20To64Pct": 51.0687, "populationShare65PlusPct": 32.902, "populationShare80PlusPct": 13.1835, "population20To64Persons": 25625160.0, "population55To64ShareOf20To64Pct": 22.8597, "lifeExpectancy65MaleYears": 22.7, "lifeExpectancy65FemaleYears": 26.4, "netMigrationPersons": 190405.0, "potentialGDPGrowthPct": 1.2685, "potentialEmployment15To74GrowthPct": -0.4089, "labourProductivityPerHourGrowthPct": 1.6747, "potentialGDPPerWorkerGrowthPct": 1.6843, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 21053164.4, "participation20To24Pct": 56.2715, "participation25To54Pct": 86.974, "participation55To64Pct": 77.4529, "participation65To74Pct": 18.6659, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19698500.0, "employment20To74Persons": 20857000.0, "employmentShare20To24Pct": 5.1639, "employmentShare25To54Pct": 68.8468, "employmentShare55To64Pct": 20.435, "employmentShare65To74Pct": 5.5542, "publicPensionersPersons": 15883458.9, "publicPensioners65PlusPersons": 14399162.5, "publicBenefitRatioPct": 54.8, "earningsRelatedRetirementNewAwardReplacementRatePct": 63.9166, "newAwardAverageContributoryPeriodYears": 40.6883, "publicPensionContributorsPersons": 22497644.8, "publicPensionSpendingGDPpct": 17.2733, "earningsRelatedRetirementSpendingGDPpct": 14.0742},
    {"year": 2054, "populationPersons": 50067700.0, "populationShare25To54Pct": 34.9008, "populationShare20To64Pct": 51.0626, "populationShare65PlusPct": 32.9258, "populationShare80PlusPct": 13.5098, "population20To64Persons": 25565876.0, "population55To64ShareOf20To64Pct": 22.9752, "lifeExpectancy65MaleYears": 22.8, "lifeExpectancy65FemaleYears": 26.5, "netMigrationPersons": 189107.0, "potentialGDPGrowthPct": 1.2923, "potentialEmployment15To74GrowthPct": -0.3589, "labourProductivityPerHourGrowthPct": 1.6484, "potentialGDPPerWorkerGrowthPct": 1.6571, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20992704.0, "participation20To24Pct": 56.2584, "participation25To54Pct": 86.957, "participation55To64Pct": 77.4623, "participation65To74Pct": 18.8235, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19642400.0, "employment20To74Persons": 20779900.0, "employmentShare20To24Pct": 5.2183, "employmentShare25To54Pct": 68.7366, "employmentShare55To64Pct": 20.571, "employmentShare65To74Pct": 5.4741, "publicPensionersPersons": 15940134.5, "publicPensioners65PlusPersons": 14452479.8, "publicBenefitRatioPct": 54.3087, "earningsRelatedRetirementNewAwardReplacementRatePct": 63.7036, "newAwardAverageContributoryPeriodYears": 40.7978, "publicPensionContributorsPersons": 22417649.6, "publicPensionSpendingGDPpct": 17.2412, "earningsRelatedRetirementSpendingGDPpct": 14.0453},
    {"year": 2055, "populationPersons": 49946200.0, "populationShare25To54Pct": 34.7799, "populationShare20To64Pct": 51.0806, "populationShare65PlusPct": 32.9362, "populationShare80PlusPct": 13.8446, "population20To64Persons": 25512813.5, "population55To64ShareOf20To64Pct": 23.1547, "lifeExpectancy65MaleYears": 22.9, "lifeExpectancy65FemaleYears": 26.6, "netMigrationPersons": 188189.0, "potentialGDPGrowthPct": 1.3109, "potentialEmployment15To74GrowthPct": -0.3142, "labourProductivityPerHourGrowthPct": 1.6222, "potentialGDPPerWorkerGrowthPct": 1.6302, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20938114.2, "participation20To24Pct": 56.2498, "participation25To54Pct": 86.9409, "participation55To64Pct": 77.5077, "participation65To74Pct": 18.9978, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19591600.0, "employment20To74Persons": 20712500.0, "employmentShare20To24Pct": 5.2733, "employmentShare25To54Pct": 68.5445, "employmentShare55To64Pct": 20.7705, "employmentShare65To74Pct": 5.4117, "publicPensionersPersons": 15980648.0, "publicPensioners65PlusPersons": 14487774.9, "publicBenefitRatioPct": 53.853, "earningsRelatedRetirementNewAwardReplacementRatePct": 63.567, "newAwardAverageContributoryPeriodYears": 40.9088, "publicPensionContributorsPersons": 22347741.4, "publicPensionSpendingGDPpct": 17.1939, "earningsRelatedRetirementSpendingGDPpct": 14.0002},
    {"year": 2056, "populationPersons": 49814600.0, "populationShare25To54Pct": 34.6564, "populationShare20To64Pct": 51.1183, "populationShare65PlusPct": 32.936, "populationShare80PlusPct": 14.178, "population20To64Persons": 25464406.5, "population55To64ShareOf20To64Pct": 23.3651, "lifeExpectancy65MaleYears": 22.9, "lifeExpectancy65FemaleYears": 26.6, "netMigrationPersons": 187491.0, "potentialGDPGrowthPct": 1.3211, "potentialEmployment15To74GrowthPct": -0.278, "labourProductivityPerHourGrowthPct": 1.596, "potentialGDPPerWorkerGrowthPct": 1.6035, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20888822.5, "participation20To24Pct": 56.2463, "participation25To54Pct": 86.9257, "participation55To64Pct": 77.5844, "participation65To74Pct": 19.1623, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19545700.0, "employment20To74Persons": 20653100.0, "employmentShare20To24Pct": 5.3283, "employmentShare25To54Pct": 68.3073, "employmentShare55To64Pct": 21.0027, "employmentShare65To74Pct": 5.3617, "publicPensionersPersons": 16008085.0, "publicPensioners65PlusPersons": 14508552.5, "publicBenefitRatioPct": 53.4317, "earningsRelatedRetirementNewAwardReplacementRatePct": 63.439, "newAwardAverageContributoryPeriodYears": 41.0197, "publicPensionContributorsPersons": 22285962.2, "publicPensionSpendingGDPpct": 17.1361, "earningsRelatedRetirementSpendingGDPpct": 13.9434},
    {"year": 2057, "populationPersons": 49674900.0, "populationShare25To54Pct": 34.5402, "populationShare20To64Pct": 51.1627, "populationShare65PlusPct": 32.9369, "populationShare80PlusPct": 14.494, "population20To64Persons": 25415025.0, "population55To64ShareOf20To64Pct": 23.5694, "lifeExpectancy65MaleYears": 23.0, "lifeExpectancy65FemaleYears": 26.7, "netMigrationPersons": 188011.0, "potentialGDPGrowthPct": 1.3286, "potentialEmployment15To74GrowthPct": -0.2443, "labourProductivityPerHourGrowthPct": 1.5698, "potentialGDPPerWorkerGrowthPct": 1.5767, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20842116.8, "participation20To24Pct": 56.2487, "participation25To54Pct": 86.9115, "participation55To64Pct": 77.7076, "participation65To74Pct": 19.3232, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19502200.0, "employment20To74Persons": 20601200.0, "employmentShare20To24Pct": 5.382, "employmentShare25To54Pct": 68.0489, "employmentShare55To64Pct": 21.2349, "employmentShare65To74Pct": 5.3343, "publicPensionersPersons": 16021595.5, "publicPensioners65PlusPersons": 14515532.3, "publicBenefitRatioPct": 53.0481, "earningsRelatedRetirementNewAwardReplacementRatePct": 63.4115, "newAwardAverageContributoryPeriodYears": 41.1324, "publicPensionContributorsPersons": 22231728.6, "publicPensionSpendingGDPpct": 17.069, "earningsRelatedRetirementSpendingGDPpct": 13.8775},
    {"year": 2058, "populationPersons": 49528000.0, "populationShare25To54Pct": 34.4151, "populationShare20To64Pct": 51.2176, "populationShare65PlusPct": 32.9332, "populationShare80PlusPct": 14.7805, "population20To64Persons": 25367048.0, "population55To64ShareOf20To64Pct": 23.8084, "lifeExpectancy65MaleYears": 23.1, "lifeExpectancy65FemaleYears": 26.8, "netMigrationPersons": 186971.0, "potentialGDPGrowthPct": 1.3276, "potentialEmployment15To74GrowthPct": -0.2188, "labourProductivityPerHourGrowthPct": 1.5436, "potentialGDPPerWorkerGrowthPct": 1.5498, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20798418.7, "participation20To24Pct": 56.2571, "participation25To54Pct": 86.8993, "participation55To64Pct": 77.8592, "participation65To74Pct": 19.4485, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19461500.0, "employment20To74Persons": 20554900.0, "employmentShare20To24Pct": 5.433, "employmentShare25To54Pct": 67.7456, "employmentShare55To64Pct": 21.5017, "employmentShare65To74Pct": 5.3198, "publicPensionersPersons": 16023871.3, "publicPensioners65PlusPersons": 14510730.0, "publicBenefitRatioPct": 52.7066, "earningsRelatedRetirementNewAwardReplacementRatePct": 63.5663, "newAwardAverageContributoryPeriodYears": 41.246, "publicPensionContributorsPersons": 22183209.1, "publicPensionSpendingGDPpct": 16.9986, "earningsRelatedRetirementSpendingGDPpct": 13.808},
    {"year": 2059, "populationPersons": 49374600.0, "populationShare25To54Pct": 34.2748, "populationShare20To64Pct": 51.2985, "populationShare65PlusPct": 32.9074, "populationShare80PlusPct": 15.0232, "population20To64Persons": 25328415.5, "population55To64ShareOf20To64Pct": 24.1203, "lifeExpectancy65MaleYears": 23.2, "lifeExpectancy65FemaleYears": 26.9, "netMigrationPersons": 185888.0, "potentialGDPGrowthPct": 1.3151, "potentialEmployment15To74GrowthPct": -0.2049, "labourProductivityPerHourGrowthPct": 1.5176, "potentialGDPPerWorkerGrowthPct": 1.5231, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20755814.4, "participation20To24Pct": 56.2711, "participation25To54Pct": 86.8899, "participation55To64Pct": 77.9038, "participation65To74Pct": 19.5704, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19421600.0, "employment20To74Persons": 20512000.0, "employmentShare20To24Pct": 5.4797, "employmentShare25To54Pct": 67.3938, "employmentShare55To64Pct": 21.8105, "employmentShare65To74Pct": 5.3159, "publicPensionersPersons": 16016113.3, "publicPensioners65PlusPersons": 14495304.8, "publicBenefitRatioPct": 52.406, "earningsRelatedRetirementNewAwardReplacementRatePct": 63.7347, "newAwardAverageContributoryPeriodYears": 41.3597, "publicPensionContributorsPersons": 22137777.8, "publicPensionSpendingGDPpct": 16.928, "earningsRelatedRetirementSpendingGDPpct": 13.7384},
    {"year": 2060, "populationPersons": 49216300.0, "populationShare25To54Pct": 34.1319, "populationShare20To64Pct": 51.3947, "populationShare65PlusPct": 32.8679, "populationShare80PlusPct": 15.214, "population20To64Persons": 25294587.5, "population55To64ShareOf20To64Pct": 24.4666, "lifeExpectancy65MaleYears": 23.3, "lifeExpectancy65FemaleYears": 26.9, "netMigrationPersons": 185885.0, "potentialGDPGrowthPct": 1.2981, "potentialEmployment15To74GrowthPct": -0.196, "labourProductivityPerHourGrowthPct": 1.4915, "potentialGDPPerWorkerGrowthPct": 1.4971, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20715916.7, "participation20To24Pct": 56.2902, "participation25To54Pct": 86.8826, "participation55To64Pct": 77.9179, "participation65To74Pct": 19.6475, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19384200.0, "employment20To74Persons": 20471400.0, "employmentShare20To24Pct": 5.521, "employmentShare25To54Pct": 67.0242, "employmentShare55To64Pct": 22.1443, "employmentShare65To74Pct": 5.3105, "publicPensionersPersons": 15998765.3, "publicPensioners65PlusPersons": 14468115.4, "publicBenefitRatioPct": 52.145, "earningsRelatedRetirementNewAwardReplacementRatePct": 63.8799, "newAwardAverageContributoryPeriodYears": 41.4694, "publicPensionContributorsPersons": 22094320.4, "publicPensionSpendingGDPpct": 16.8584, "earningsRelatedRetirementSpendingGDPpct": 13.6692},
    {"year": 2061, "populationPersons": 49055400.0, "populationShare25To54Pct": 33.9849, "populationShare20To64Pct": 51.4882, "populationShare65PlusPct": 32.8303, "populationShare80PlusPct": 15.3541, "population20To64Persons": 25257739.0, "population55To64ShareOf20To64Pct": 24.826, "lifeExpectancy65MaleYears": 23.4, "lifeExpectancy65FemaleYears": 27.0, "netMigrationPersons": 186523.0, "potentialGDPGrowthPct": 1.274, "potentialEmployment15To74GrowthPct": -0.1941, "labourProductivityPerHourGrowthPct": 1.4655, "potentialGDPPerWorkerGrowthPct": 1.471, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20673696.1, "participation20To24Pct": 56.3136, "participation25To54Pct": 86.8773, "participation55To64Pct": 77.9188, "participation65To74Pct": 19.7162, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19344600.0, "employment20To74Persons": 20431600.0, "employmentShare20To24Pct": 5.5558, "employmentShare25To54Pct": 66.6411, "employmentShare55To64Pct": 22.4831, "employmentShare65To74Pct": 5.32, "publicPensionersPersons": 15975100.8, "publicPensioners65PlusPersons": 14434095.1, "publicBenefitRatioPct": 51.9208, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.0231, "newAwardAverageContributoryPeriodYears": 41.5807, "publicPensionContributorsPersons": 22051334.2, "publicPensionSpendingGDPpct": 16.7936, "earningsRelatedRetirementSpendingGDPpct": 13.6047},
    {"year": 2062, "populationPersons": 48893500.0, "populationShare25To54Pct": 33.834, "populationShare20To64Pct": 51.5671, "populationShare65PlusPct": 32.8044, "populationShare80PlusPct": 15.4384, "population20To64Persons": 25212971.0, "population55To64ShareOf20To64Pct": 25.1828, "lifeExpectancy65MaleYears": 23.5, "lifeExpectancy65FemaleYears": 27.1, "netMigrationPersons": 187566.0, "potentialGDPGrowthPct": 1.2444, "potentialEmployment15To74GrowthPct": -0.1977, "labourProductivityPerHourGrowthPct": 1.4396, "potentialGDPPerWorkerGrowthPct": 1.445, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20626195.4, "participation20To24Pct": 56.34, "participation25To54Pct": 86.8742, "participation55To64Pct": 77.9178, "participation65To74Pct": 19.8033, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19300000.0, "employment20To74Persons": 20391500.0, "employmentShare20To24Pct": 5.5833, "employmentShare25To54Pct": 66.2517, "employmentShare55To64Pct": 22.8125, "employmentShare65To74Pct": 5.3525, "publicPensionersPersons": 15945346.4, "publicPensioners65PlusPersons": 14395710.1, "publicBenefitRatioPct": 51.7348, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.1923, "newAwardAverageContributoryPeriodYears": 41.692, "publicPensionContributorsPersons": 22007491.9, "publicPensionSpendingGDPpct": 16.7353, "earningsRelatedRetirementSpendingGDPpct": 13.5481},
    {"year": 2063, "populationPersons": 48731500.0, "populationShare25To54Pct": 33.6676, "populationShare20To64Pct": 51.6344, "populationShare65PlusPct": 32.7851, "populationShare80PlusPct": 15.4669, "population20To64Persons": 25162207.0, "population55To64ShareOf20To64Pct": 25.5655, "lifeExpectancy65MaleYears": 23.6, "lifeExpectancy65FemaleYears": 27.2, "netMigrationPersons": 187734.0, "potentialGDPGrowthPct": 1.2044, "potentialEmployment15To74GrowthPct": -0.2117, "labourProductivityPerHourGrowthPct": 1.4136, "potentialGDPPerWorkerGrowthPct": 1.419, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20574285.8, "participation20To24Pct": 56.3685, "participation25To54Pct": 86.8747, "participation55To64Pct": 77.909, "participation65To74Pct": 19.8867, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19251300.0, "employment20To74Persons": 20348900.0, "employmentShare20To24Pct": 5.603, "employmentShare25To54Pct": 65.8426, "employmentShare55To64Pct": 23.1602, "employmentShare65To74Pct": 5.3942, "publicPensionersPersons": 15910753.2, "publicPensioners65PlusPersons": 14353168.1, "publicBenefitRatioPct": 51.5857, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.3211, "newAwardAverageContributoryPeriodYears": 41.8041, "publicPensionContributorsPersons": 21960605.3, "publicPensionSpendingGDPpct": 16.6861, "earningsRelatedRetirementSpendingGDPpct": 13.5014},
    {"year": 2064, "populationPersons": 48570800.0, "populationShare25To54Pct": 33.511, "populationShare20To64Pct": 51.6815, "populationShare65PlusPct": 32.7792, "populationShare80PlusPct": 15.4494, "population20To64Persons": 25102086.5, "population55To64ShareOf20To64Pct": 25.9139, "lifeExpectancy65MaleYears": 23.6, "lifeExpectancy65FemaleYears": 27.2, "netMigrationPersons": 189400.0, "potentialGDPGrowthPct": 1.1615, "potentialEmployment15To74GrowthPct": -0.2287, "labourProductivityPerHourGrowthPct": 1.3877, "potentialGDPPerWorkerGrowthPct": 1.3934, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20515870.2, "participation20To24Pct": 56.398, "participation25To54Pct": 86.8776, "participation55To64Pct": 77.886, "participation65To74Pct": 19.9847, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19196400.0, "employment20To74Persons": 20303200.0, "employmentShare20To24Pct": 5.6148, "employmentShare25To54Pct": 65.4664, "employmentShare55To64Pct": 23.4671, "employmentShare65To74Pct": 5.4516, "publicPensionersPersons": 15872265.8, "publicPensioners65PlusPersons": 14308544.8, "publicBenefitRatioPct": 51.4739, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.4841, "newAwardAverageContributoryPeriodYears": 41.9143, "publicPensionContributorsPersons": 21909831.2, "publicPensionSpendingGDPpct": 16.6477, "earningsRelatedRetirementSpendingGDPpct": 13.4667},
    {"year": 2065, "populationPersons": 48413000.0, "populationShare25To54Pct": 33.389, "populationShare20To64Pct": 51.694, "populationShare65PlusPct": 32.7994, "populationShare80PlusPct": 15.3987, "population20To64Persons": 25026616.0, "population55To64ShareOf20To64Pct": 26.1603, "lifeExpectancy65MaleYears": 23.7, "lifeExpectancy65FemaleYears": 27.3, "netMigrationPersons": 190715.0, "potentialGDPGrowthPct": 1.116, "potentialEmployment15To74GrowthPct": -0.2482, "labourProductivityPerHourGrowthPct": 1.3618, "potentialGDPPerWorkerGrowthPct": 1.3676, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20447721.6, "participation20To24Pct": 56.4276, "participation25To54Pct": 86.8819, "participation55To64Pct": 77.8568, "participation65To74Pct": 20.1222, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19132300.0, "employment20To74Persons": 20253900.0, "employmentShare20To24Pct": 5.6188, "employmentShare25To54Pct": 65.1752, "employmentShare55To64Pct": 23.6686, "employmentShare65To74Pct": 5.5374, "publicPensionersPersons": 15830811.6, "publicPensioners65PlusPersons": 14265247.0, "publicBenefitRatioPct": 51.397, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.633, "newAwardAverageContributoryPeriodYears": 42.0256, "publicPensionContributorsPersons": 21854741.2, "publicPensionSpendingGDPpct": 16.6206, "earningsRelatedRetirementSpendingGDPpct": 13.4464},
    {"year": 2066, "populationPersons": 48258500.0, "populationShare25To54Pct": 33.2777, "populationShare20To64Pct": 51.6837, "populationShare65PlusPct": 32.8328, "populationShare80PlusPct": 15.318, "population20To64Persons": 24941804.5, "population55To64ShareOf20To64Pct": 26.3684, "lifeExpectancy65MaleYears": 23.8, "lifeExpectancy65FemaleYears": 27.4, "netMigrationPersons": 190939.0, "potentialGDPGrowthPct": 1.0615, "potentialEmployment15To74GrowthPct": -0.2769, "labourProductivityPerHourGrowthPct": 1.336, "potentialGDPPerWorkerGrowthPct": 1.3421, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20373301.1, "participation20To24Pct": 56.4563, "participation25To54Pct": 86.8891, "participation55To64Pct": 77.8161, "participation65To74Pct": 20.2346, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 19062400.0, "employment20To74Persons": 20199000.0, "employmentShare20To24Pct": 5.6153, "employmentShare25To54Pct": 64.9295, "employmentShare55To64Pct": 23.8283, "employmentShare65To74Pct": 5.6269, "publicPensionersPersons": 15787886.6, "publicPensioners65PlusPersons": 14222506.3, "publicBenefitRatioPct": 51.3481, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.5423, "newAwardAverageContributoryPeriodYears": 42.136, "publicPensionContributorsPersons": 21793477.8, "publicPensionSpendingGDPpct": 16.6057, "earningsRelatedRetirementSpendingGDPpct": 13.4404},
    {"year": 2067, "populationPersons": 48107700.0, "populationShare25To54Pct": 33.1821, "populationShare20To64Pct": 51.6582, "populationShare65PlusPct": 32.8711, "populationShare80PlusPct": 15.2169, "population20To64Persons": 24851573.5, "population55To64ShareOf20To64Pct": 26.539, "lifeExpectancy65MaleYears": 23.9, "lifeExpectancy65FemaleYears": 27.5, "netMigrationPersons": 191233.0, "potentialGDPGrowthPct": 1.0025, "potentialEmployment15To74GrowthPct": -0.3099, "labourProductivityPerHourGrowthPct": 1.3101, "potentialGDPPerWorkerGrowthPct": 1.3165, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20294477.7, "participation20To24Pct": 56.4833, "participation25To54Pct": 86.8987, "participation55To64Pct": 77.7441, "participation65To74Pct": 20.3103, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 18988400.0, "employment20To74Persons": 20137800.0, "employmentShare20To24Pct": 5.6048, "employmentShare25To54Pct": 64.7414, "employmentShare55To64Pct": 23.9464, "employmentShare65To74Pct": 5.7074, "publicPensionersPersons": 15744742.3, "publicPensioners65PlusPersons": 14179628.4, "publicBenefitRatioPct": 51.3271, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.4826, "newAwardAverageContributoryPeriodYears": 42.247, "publicPensionContributorsPersons": 21725203.5, "publicPensionSpendingGDPpct": 16.605, "earningsRelatedRetirementSpendingGDPpct": 13.4499},
    {"year": 2068, "populationPersons": 47962200.0, "populationShare25To54Pct": 33.1197, "populationShare20To64Pct": 51.5997, "populationShare65PlusPct": 32.9312, "populationShare80PlusPct": 15.1097, "population20To64Persons": 24748335.5, "population55To64ShareOf20To64Pct": 26.6116, "lifeExpectancy65MaleYears": 24.0, "lifeExpectancy65FemaleYears": 27.5, "netMigrationPersons": 192885.0, "potentialGDPGrowthPct": 0.945, "potentialEmployment15To74GrowthPct": -0.3416, "labourProductivityPerHourGrowthPct": 1.2842, "potentialGDPPerWorkerGrowthPct": 1.291, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20206775.9, "participation20To24Pct": 56.508, "participation25To54Pct": 86.9095, "participation55To64Pct": 77.6552, "participation65To74Pct": 20.3931, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 18906100.0, "employment20To74Persons": 20070300.0, "employmentShare20To24Pct": 5.5883, "employmentShare25To54Pct": 64.6459, "employmentShare55To64Pct": 23.9649, "employmentShare65To74Pct": 5.8009, "publicPensionersPersons": 15704128.3, "publicPensioners65PlusPersons": 14142028.2, "publicBenefitRatioPct": 51.3307, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.3792, "newAwardAverageContributoryPeriodYears": 42.3571, "publicPensionContributorsPersons": 21650189.5, "publicPensionSpendingGDPpct": 16.6201, "earningsRelatedRetirementSpendingGDPpct": 13.4771},
    {"year": 2069, "populationPersons": 47822900.0, "populationShare25To54Pct": 33.0661, "populationShare20To64Pct": 51.5015, "populationShare65PlusPct": 33.0195, "populationShare80PlusPct": 15.002, "population20To64Persons": 24629520.5, "population55To64ShareOf20To64Pct": 26.6222, "lifeExpectancy65MaleYears": 24.1, "lifeExpectancy65FemaleYears": 27.6, "netMigrationPersons": 193530.0, "potentialGDPGrowthPct": 0.8857, "potentialEmployment15To74GrowthPct": -0.3751, "labourProductivityPerHourGrowthPct": 1.2584, "potentialGDPPerWorkerGrowthPct": 1.2655, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20108972.8, "participation20To24Pct": 56.5295, "participation25To54Pct": 86.9216, "participation55To64Pct": 77.5771, "participation65To74Pct": 20.4588, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 18814300.0, "employment20To74Persons": 19996400.0, "employmentShare20To24Pct": 5.5669, "employmentShare25To54Pct": 64.5989, "employmentShare55To64Pct": 23.9228, "employmentShare65To74Pct": 5.9114, "publicPensionersPersons": 15667757.0, "publicPensioners65PlusPersons": 14112603.4, "publicBenefitRatioPct": 51.3553, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.2309, "newAwardAverageContributoryPeriodYears": 42.4675, "publicPensionContributorsPersons": 21568135.9, "publicPensionSpendingGDPpct": 16.652, "earningsRelatedRetirementSpendingGDPpct": 13.5237},
    {"year": 2070, "populationPersons": 47689900.0, "populationShare25To54Pct": 33.0021, "populationShare20To64Pct": 51.3757, "populationShare65PlusPct": 33.1243, "populationShare80PlusPct": 14.8946, "population20To64Persons": 24500992.5, "population55To64ShareOf20To64Pct": 26.623, "lifeExpectancy65MaleYears": 24.1, "lifeExpectancy65FemaleYears": 27.7, "netMigrationPersons": 193711.0, "potentialGDPGrowthPct": 0.8197, "potentialEmployment15To74GrowthPct": -0.4152, "labourProductivityPerHourGrowthPct": 1.2326, "potentialGDPPerWorkerGrowthPct": 1.24, "hicpInflationPct": 2.0, "nominalInterestRatePct": 4.0, "labourForce20To64Persons": 20004502.5, "participation20To24Pct": 56.5471, "participation25To54Pct": 86.9357, "participation55To64Pct": 77.5061, "participation65To74Pct": 20.4637, "labourMarketExitAgeYears": 66.3918, "employment20To64Persons": 18716400.0, "employment20To74Persons": 19914700.0, "employmentShare20To24Pct": 5.5417, "employmentShare25To54Pct": 64.5671, "employmentShare55To64Pct": 23.8743, "employmentShare65To74Pct": 6.0169, "publicPensionersPersons": 15636735.5, "publicPensioners65PlusPersons": 14090473.9, "publicBenefitRatioPct": 51.3975, "earningsRelatedRetirementNewAwardReplacementRatePct": 64.0104, "newAwardAverageContributoryPeriodYears": 42.5884, "publicPensionContributorsPersons": 21477756.6, "publicPensionSpendingGDPpct": 16.702, "earningsRelatedRetirementSpendingGDPpct": 13.5898}
  ],
  "ficheAnchors": [
    {"year": 2022, "employmentPersons": 20581000, "retirementCoveragePct": 67, "retirementBenefitRatioPct": 70, "effectiveRetirementAgeYears": 63.4, "retirementDurationYears": 22.4, "newRetirementPensionsCount": 354500, "wageNominalEuros": 27200},
    {"year": 2030, "employmentPersons": 22119000, "retirementCoveragePct": 69, "retirementBenefitRatioPct": 76, "effectiveRetirementAgeYears": 64.3, "retirementDurationYears": 21.7, "newRetirementPensionsCount": 426800, "wageNominalEuros": 33800},
    {"year": 2040, "employmentPersons": 22208000, "retirementCoveragePct": 73, "retirementBenefitRatioPct": 69, "effectiveRetirementAgeYears": 65.4, "retirementDurationYears": 22.6, "newRetirementPensionsCount": 549800, "wageNominalEuros": 46400},
    {"year": 2050, "employmentPersons": 21311000, "retirementCoveragePct": 77, "retirementBenefitRatioPct": 60, "effectiveRetirementAgeYears": 66.2, "retirementDurationYears": 23.4, "newRetirementPensionsCount": 527200, "wageNominalEuros": 67700},
    {"year": 2060, "employmentPersons": 20671000, "retirementCoveragePct": 78, "retirementBenefitRatioPct": 55, "effectiveRetirementAgeYears": 65.7, "retirementDurationYears": 24.2, "newRetirementPensionsCount": 458000, "wageNominalEuros": 96900},
    {"year": 2070, "employmentPersons": 20099000, "retirementCoveragePct": 78, "retirementBenefitRatioPct": 54, "effectiveRetirementAgeYears": 65.7, "retirementDurationYears": 25.0, "newRetirementPensionsCount": 501700, "wageNominalEuros": 135200}
  ],
  "publicPensionerPopulationCoverageAnchors": [
    {"year": 2022, "under55": 2.3, "age55To59": 10.0, "age60To64": 25.3, "age65To69": 76.1, "age70To74": 82.4, "age75Plus": 89.7},
    {"year": 2030, "under55": 2.3, "age55To59": 9.9, "age60To64": 24.3, "age65To69": 59.1, "age70To74": 81.1, "age75Plus": 88.7},
    {"year": 2040, "under55": 2.0, "age55To59": 9.7, "age60To64": 22.5, "age65To69": 63.5, "age70To74": 83.1, "age75Plus": 87.0},
    {"year": 2050, "under55": 2.0, "age55To59": 9.4, "age60To64": 21.6, "age65To69": 64.0, "age70To74": 88.7, "age75Plus": 91.8},
    {"year": 2060, "under55": 2.1, "age55To59": 9.8, "age60To64": 21.6, "age65To69": 62.2, "age70To74": 87.1, "age75Plus": 97.5},
    {"year": 2070, "under55": 1.9, "age55To59": 10.1, "age60To64": 22.2, "age65To69": 62.9, "age70To74": 86.9, "age75Plus": 98.4}
  ],
  "derivedAnnual": [
    {"year": 2022, "populationUnder20Persons": 9137474.1594, "population20To24Persons": 2472936.040788, "population25To54Persons": 19786646.2962, "population55To64Persons": 6673239.663012, "population65To79Persons": 6742087.5384, "population80PlusPersons": 2894216.3022, "employment20To24Persons": 1012493.601, "employment25To54Persons": 15271028.01, "employment55To64Persons": 3846765.033, "employment65To74Persons": 290713.356},
    {"year": 2023, "populationUnder20Persons": 9135477.1016, "population20To24Persons": 2561821.146351, "population25To54Persons": 19779841.4388, "population55To64Persons": 6823551.914849, "population65To79Persons": 6922525.482, "population80PlusPersons": 2940182.9164, "employment20To24Persons": 1074617.0539, "employment25To54Persons": 15325866.5163, "employment55To64Persons": 3982778.6038, "employment65To74Persons": 339437.826},
    {"year": 2024, "populationUnder20Persons": 9069099.1864, "population20To24Persons": 2640594.659274, "population25To54Persons": 19721405.9986, "population55To64Persons": 6947377.842126, "population65To79Persons": 7089938.3688, "population80PlusPersons": 3011783.9448, "employment20To24Persons": 1118679.822, "employment25To54Persons": 15340472.226, "employment55To64Persons": 4101979.7412, "employment65To74Persons": 401668.2108},
    {"year": 2025, "populationUnder20Persons": 8971844.2125, "population20To24Persons": 2700535.735028, "population25To54Persons": 19638135.039, "population55To64Persons": 7056521.725972, "population65To79Persons": 7260371.8995, "population80PlusPersons": 3091091.388, "employment20To24Persons": 1166074.2454, "employment25To54Persons": 15394911.0816, "employment55To64Persons": 4234200.3558, "employment65To74Persons": 474614.3172},
    {"year": 2026, "populationUnder20Persons": 8852997.7447, "population20To24Persons": 2751099.655848, "population25To54Persons": 19528336.4008, "population55To64Persons": 7163922.443352, "population65To79Persons": 7435640.6784, "population80PlusPersons": 3166103.0769, "employment20To24Persons": 1207531.7408, "employment25To54Persons": 15403160.9578, "employment55To64Persons": 4387988.682, "employment65To74Persons": 545918.6194},
    {"year": 2027, "populationUnder20Persons": 8715482.803, "population20To24Persons": 2797155.907404, "population25To54Persons": 19384277.616, "population55To64Persons": 7273282.476596, "population65To79Persons": 7614656.6595, "population80PlusPersons": 3236644.5375, "employment20To24Persons": 1248951.2084, "employment25To54Persons": 15373718.4198, "employment55To64Persons": 4574174.2226, "employment65To74Persons": 609734.3426},
    {"year": 2028, "populationUnder20Persons": 8563245.1932, "population20To24Persons": 2839763.373388, "population25To54Persons": 19231582.0016, "population55To64Persons": 7370540.625012, "population65To79Persons": 7785820.988, "population80PlusPersons": 3327847.8188, "employment20To24Persons": 1265452.6599, "employment25To54Persons": 15230341.4991, "employment55To64Persons": 4709818.4055, "employment65To74Persons": 669487.4355},
    {"year": 2029, "populationUnder20Persons": 8417388.2034, "population20To24Persons": 2866818.846498, "population25To54Persons": 19082127.3714, "population55To64Persons": 7451872.782102, "population65To79Persons": 7976073.4092, "population80PlusPersons": 3423119.3874, "employment20To24Persons": 1273699.8, "employment25To54Persons": 15071449.545, "employment55To64Persons": 4836158.37, "employment65To74Persons": 733692.285},
    {"year": 2030, "populationUnder20Persons": 8290960.237, "population20To24Persons": 2871595.486405, "population25To54Persons": 18926806.6814, "population55To64Persons": 7533602.832195, "population65To79Persons": 8193852.3408, "population80PlusPersons": 3498582.4222, "employment20To24Persons": 1274323.0059, "employment25To54Persons": 14898894.5805, "employment55To64Persons": 4959069.8892, "employment65To74Persons": 793812.5244},
    {"year": 2031, "populationUnder20Persons": 8173218.0365, "population20To24Persons": 2864471.285027, "population25To54Persons": 18772052.0868, "population55To64Persons": 7623136.128173, "population65To79Persons": 8411668.8435, "population80PlusPersons": 3567553.62, "employment20To24Persons": 1268479.4793, "employment25To54Persons": 14726577.5481, "employment55To64Persons": 5074443.8844, "employment65To74Persons": 845799.0882},
    {"year": 2032, "populationUnder20Persons": 8068607.4, "population20To24Persons": 2842863.847246, "population25To54Persons": 18628086.0192, "population55To64Persons": 7697850.633554, "population65To79Persons": 8622789.9744, "population80PlusPersons": 3649402.1256, "employment20To24Persons": 1255147.002, "employment25To54Persons": 14563824.2625, "employment55To64Persons": 5169241.116, "employment65To74Persons": 898287.6195},
    {"year": 2033, "populationUnder20Persons": 7986715.9194, "population20To24Persons": 2792556.111635, "population25To54Persons": 18507814.5478, "population55To64Persons": 7754437.840565, "population65To79Persons": 8825642.2732, "population80PlusPersons": 3740733.3074, "employment20To24Persons": 1246490.0096, "employment25To54Persons": 14512912.3744, "employment55To64Persons": 5272808.376, "employment65To74Persons": 950189.24},
    {"year": 2034, "populationUnder20Persons": 7916898.0218, "population20To24Persons": 2738421.576415, "population25To54Persons": 18407851.8857, "population55To64Persons": 7789118.037885, "population65To79Persons": 9027484.2023, "population80PlusPersons": 3829126.2759, "employment20To24Persons": 1227220.8832, "employment25To54Persons": 14445162.9726, "employment55To64Persons": 5351016.8027, "employment65To74Persons": 991899.3415},
    {"year": 2035, "populationUnder20Persons": 7850699.0412, "population20To24Persons": 2701929.310045, "population25To54Persons": 18320316.3801, "population55To64Persons": 7791099.809854, "population65To79Persons": 9225337.5846, "population80PlusPersons": 3922917.8742, "employment20To24Persons": 1217348.0032, "employment25To54Persons": 14402269.8652, "employment55To64Persons": 5409195.3188, "employment65To74Persons": 1031008.8726},
    {"year": 2036, "populationUnder20Persons": 7795158.988, "population20To24Persons": 2663583.057816, "population25To54Persons": 18254065.739, "population55To64Persons": 7758387.703184, "population65To79Persons": 9414135.3215, "population80PlusPersons": 4028169.1905, "employment20To24Persons": 1205567.2075, "employment25To54Persons": 14382068.8664, "employment55To64Persons": 5426212.164, "employment65To74Persons": 1076273.8522},
    {"year": 2037, "populationUnder20Persons": 7757551.9, "population20To24Persons": 2619310.297104, "population25To54Persons": 18208673.4324, "population55To64Persons": 7685377.270496, "population65To79Persons": 9590074.3812, "population80PlusPersons": 4150612.7188, "employment20To24Persons": 1192423.4336, "employment25To54Persons": 14375324.4936, "employment55To64Persons": 5408034.1504, "employment65To74Persons": 1127417.9224},
    {"year": 2038, "populationUnder20Persons": 7744161.7165, "population20To24Persons": 2571634.302212, "population25To54Persons": 18175168.859, "population55To64Persons": 7575124.338788, "population65To79Persons": 9750379.9835, "population80PlusPersons": 4289030.8, "employment20To24Persons": 1181838.476, "employment25To54Persons": 14379204.2147, "employment55To64Persons": 5362470.542, "employment65To74Persons": 1175186.7673},
    {"year": 2039, "populationUnder20Persons": 7751288.5539, "population20To24Persons": 2512408.04436, "population25To54Persons": 18159472.4685, "population55To64Persons": 7429422.48714, "population65To79Persons": 9908566.3105, "population80PlusPersons": 4432942.1356, "employment20To24Persons": 1166374.5107, "employment25To54Persons": 14401895.873, "employment55To64Persons": 5278369.5725, "employment65To74Persons": 1231660.0438},
    {"year": 2040, "populationUnder20Persons": 7775778.4198, "population20To24Persons": 2435899.40883, "population25To54Persons": 18162924.516, "population55To64Persons": 7254061.07517, "population65To79Persons": 10065174.2136, "population80PlusPersons": 4582762.3666, "employment20To24Persons": 1139827.7464, "employment25To54Persons": 14440911.6852, "employment55To64Persons": 5167185.3156, "employment65To74Persons": 1296475.2528},
    {"year": 2041, "populationUnder20Persons": 7810979.5059, "population20To24Persons": 2356034.825781, "population25To54Persons": 18176114.3818, "population55To64Persons": 7056000.292419, "population65To79Persons": 10220357.2253, "population80PlusPersons": 4731813.7688, "employment20To24Persons": 1108275.3288, "employment25To54Persons": 14491324.3293, "employment55To64Persons": 5034421.1502, "employment65To74Persons": 1352079.1917},
    {"year": 2042, "populationUnder20Persons": 7850963.229, "population20To24Persons": 2285218.578114, "population25To54Persons": 18186139.047, "population55To64Persons": 6849540.374886, "population65To79Persons": 10365632.4, "population80PlusPersons": 4879006.371, "employment20To24Persons": 1078414.1592, "employment25To54Persons": 14537296.2816, "employment55To64Persons": 4897534.7401, "employment65To74Persons": 1395054.8191},
    {"year": 2043, "populationUnder20Persons": 7894057.7484, "population20To24Persons": 2230788.300404, "population25To54Persons": 18178407.1062, "population55To64Persons": 6649480.093397, "population65To79Persons": 10483468.0632, "population80PlusPersons": 5033998.6884, "employment20To24Persons": 1056003.48, "employment25To54Persons": 14575138.704, "employment55To64Persons": 4763152.728, "employment65To74Persons": 1421705.088},
    {"year": 2044, "populationUnder20Persons": 7935639.9356, "population20To24Persons": 2193493.277204, "population25To54Persons": 18152975.3904, "population55To64Persons": 6467149.832396, "population65To79Persons": 10557666.3944, "population80PlusPersons": 5203875.17, "employment20To24Persons": 1041704.9112, "employment25To54Persons": 14594248.24, "employment55To64Persons": 4643711.2976, "employment65To74Persons": 1434735.5512},
    {"year": 2045, "populationUnder20Persons": 7973739.0133, "population20To24Persons": 2171851.755687, "population25To54Persons": 18112677.6445, "population55To64Persons": 6306798.099813, "population65To79Persons": 10595819.1385, "population80PlusPersons": 5376014.3482, "employment20To24Persons": 1035560.9616, "employment25To54Persons": 14603302.4544, "employment55To64Persons": 4537029.3144, "employment65To74Persons": 1432507.2696},
    {"year": 2046, "populationUnder20Persons": 8007407.2912, "population20To24Persons": 2160579.914266, "population25To54Persons": 18061623.9843, "population55To64Persons": 6169650.101434, "population65To79Persons": 10609852.5663, "population80PlusPersons": 5538786.1425, "employment20To24Persons": 1034948.7036, "employment25To54Persons": 14604555.6807, "employment55To64Persons": 4449406.4321, "employment65To74Persons": 1413367.6813},
    {"year": 2047, "populationUnder20Persons": 8035326.9883, "population20To24Persons": 2155463.974902, "population25To54Persons": 17998579.4045, "population55To64Persons": 6064917.620598, "population65To79Persons": 10586008.2334, "population80PlusPersons": 5702603.7783, "employment20To24Persons": 1037564.112, "employment25To54Persons": 14598150.3824, "employment55To64Persons": 4379320.9837, "employment65To74Persons": 1386864.5219},
    {"year": 2048, "populationUnder20Persons": 8056375.872, "population20To24Persons": 2156711.501916, "population25To54Persons": 17926993.1292, "population55To64Persons": 5990021.368884, "population65To79Persons": 10527658.1772, "population80PlusPersons": 5863439.9508, "employment20To24Persons": 1043834.3448, "employment25To54Persons": 14585594.6426, "employment55To64Persons": 4328170.5476, "employment65To74Persons": 1352100.465},
    {"year": 2049, "populationUnder20Persons": 8069947.583, "population20To24Persons": 2160977.468828, "population25To54Persons": 17860466.4321, "population55To64Persons": 5930684.099072, "population65To79Persons": 10444145.6604, "population80PlusPersons": 6016878.7566, "employment20To24Persons": 1050414.062, "employment25To54Persons": 14561823.7348, "employment55To64Persons": 4294434.6906, "employment65To74Persons": 1309527.5126},
    {"year": 2050, "populationUnder20Persons": 8075676.6858, "population20To24Persons": 2167926.294468, "population25To54Persons": 17796046.1063, "population55To64Persons": 5884443.599232, "population65To79Persons": 10337703.9242, "population80PlusPersons": 6167503.39, "employment20To24Persons": 1057092.2122, "employment25To54Persons": 14531226.1418, "employment55To64Persons": 4268631.3834, "employment65To74Persons": 1267129.1385},
    {"year": 2051, "populationUnder20Persons": 8072997.5456, "population20To24Persons": 2177483.413948, "population25To54Persons": 17726347.4412, "population55To64Persons": 5858511.144852, "population65To79Persons": 10207478.2218, "population80PlusPersons": 6316982.2326, "employment20To24Persons": 1063894.662, "employment25To54Persons": 14487961.0149, "employment55To64Persons": 4256672.4108, "employment65To74Persons": 1225371.9123},
    {"year": 2052, "populationUnder20Persons": 8062116.3552, "population20To24Persons": 2189235.57374, "population25To54Persons": 17647841.6632, "population55To64Persons": 5852928.26306, "population65To79Persons": 10056226.0632, "population80PlusPersons": 6467252.0816, "employment20To24Persons": 1070608.7865, "employment25To54Persons": 14429728.6881, "employment55To64Persons": 4255018.0101, "employment65To74Persons": 1189744.5153},
    {"year": 2053, "populationUnder20Persons": 8043140.244, "population20To24Persons": 2202887.47628, "population25To54Persons": 17564437.8232, "population55To64Persons": 5857834.70052, "population65To79Persons": 9894309.493, "population80PlusPersons": 6615190.263, "employment20To24Persons": 1077034.623, "employment25To54Persons": 14359377.076, "employment55To64Persons": 4262127.95, "employment65To74Persons": 1158439.494},
    {"year": 2054, "populationUnder20Persons": 8016633.2334, "population20To24Persons": 2218037.015648, "population25To54Persons": 17474027.8416, "population55To64Persons": 5873811.142752, "population65To79Persons": 9721144.632, "population80PlusPersons": 6764046.1346, "employment20To24Persons": 1084357.5217, "employment25To54Persons": 14283396.7434, "employment55To64Persons": 4274633.229, "employment65To74Persons": 1137512.5059},
    {"year": 2055, "populationUnder20Persons": 7983006.1756, "population20To24Persons": 2234159.658716, "population25To54Persons": 17371238.4138, "population55To64Persons": 5907415.427484, "population65To79Persons": 9535528.7192, "population80PlusPersons": 6914851.6052, "employment20To24Persons": 1092232.2625, "employment25To54Persons": 14197279.5625, "employment55To64Persons": 4302089.8125, "employment65To74Persons": 1120898.3625},
    {"year": 2056, "populationUnder20Persons": 7943256.844, "population20To24Persons": 2250675.422469, "population25To54Persons": 17263947.0344, "population55To64Persons": 5949784.043132, "population65To79Persons": 9344222.668, "population80PlusPersons": 7062713.988, "employment20To24Persons": 1100459.1273, "employment25To54Persons": 14107574.9763, "employment55To64Persons": 4337708.6337, "employment65To74Persons": 1107357.2627},
    {"year": 2057, "populationUnder20Persons": 7898502.8619, "population20To24Persons": 2267046.28785, "population25To54Persons": 17157809.8098, "population55To64Persons": 5990168.90235, "population65To79Persons": 9161492.1321, "population80PlusPersons": 7199880.006, "employment20To24Persons": 1108756.584, "employment25To54Persons": 14018889.9868, "employment55To64Persons": 4374644.2188, "employment65To74Persons": 1098929.8116},
    {"year": 2058, "populationUnder20Persons": 7849796.704, "population20To24Persons": 2282449.015968, "population25To54Persons": 17045110.728, "population55To64Persons": 6039488.256032, "population65To79Persons": 8990669.256, "population80PlusPersons": 7320486.04, "employment20To24Persons": 1116747.717, "employment25To54Persons": 13925040.3344, "employment55To64Persons": 4419652.9333, "employment65To74Persons": 1093479.5702},
    {"year": 2059, "populationUnder20Persons": 7798287.3796, "population20To24Persons": 2296080.295353, "population25To54Persons": 16923045.4008, "population55To64Persons": 6109289.803846, "population65To79Persons": 8830252.2132, "population80PlusPersons": 7417644.9072, "employment20To24Persons": 1123996.064, "employment25To54Persons": 13823816.256, "employment55To64Persons": 4473769.76, "employment65To74Persons": 1090397.408},
    {"year": 2060, "populationUnder20Persons": 7745348.2323, "population20To24Persons": 2307403.655025, "population25To54Persons": 16798458.2997, "population55To64Persons": 6188725.545275, "population65To79Persons": 8688596.3857, "population80PlusPersons": 7487767.882, "employment20To24Persons": 1130225.994, "employment25To54Persons": 13720792.0788, "employment55To64Persons": 4533248.2302, "employment65To74Persons": 1087133.697},
    {"year": 2061, "populationUnder20Persons": 7692626.0138, "population20To24Persons": 2315824.08126, "population25To54Persons": 16671428.6346, "population55To64Persons": 6270486.28414, "population65To79Persons": 8573019.8148, "population80PlusPersons": 7532015.1714, "employment20To24Persons": 1135138.8328, "employment25To54Persons": 13615842.9876, "employment55To64Persons": 4593657.0596, "employment65To74Persons": 1086961.12},
    {"year": 2062, "populationUnder20Persons": 7641309.686, "population20To24Persons": 2321012.149012, "population25To54Persons": 16542626.79, "population55To64Persons": 6349332.060988, "population65To79Persons": 8490845.21, "population80PlusPersons": 7548374.104, "employment20To24Persons": 1138518.6195, "employment25To54Persons": 13509715.4055, "employment55To64Persons": 4651810.9375, "employment65To74Persons": 1091455.0375},
    {"year": 2063, "populationUnder20Persons": 7592621.9935, "population20To24Persons": 2322636.475415, "population25To54Persons": 16406726.494, "population55To64Persons": 6432844.030585, "population65To79Persons": 8439418.633, "population80PlusPersons": 7537252.3735, "employment20To24Persons": 1140148.867, "employment25To54Persons": 13398244.8314, "employment55To64Persons": 4712845.9378, "employment65To74Persons": 1097660.3638},
    {"year": 2064, "populationUnder20Persons": 7547593.8264, "population20To24Persons": 2320596.118476, "population25To54Persons": 16276560.788, "population55To64Persons": 6504929.593523, "population65To79Persons": 8417222.4984, "population80PlusPersons": 7503897.1752, "employment20To24Persons": 1139984.0736, "employment25To54Persons": 13291774.1248, "employment55To64Persons": 4764572.2472, "employment65To74Persons": 1106849.2512},
    {"year": 2065, "populationUnder20Persons": 7507210.478, "population20To24Persons": 2314961.604552, "population25To54Persons": 16164616.57, "population55To64Persons": 6547037.825448, "population65To79Persons": 8424200.891, "population80PlusPersons": 7454972.631, "employment20To24Persons": 1138026.1332, "employment25To54Persons": 13200519.8328, "employment55To64Persons": 4793814.5754, "employment65To74Persons": 1121539.4586},
    {"year": 2066, "populationUnder20Persons": 7472078.712, "population20To24Persons": 2305730.867722, "population25To54Persons": 16059318.8545, "population55To64Persons": 6576754.777778, "population65To79Persons": 8452379.758, "population80PlusPersons": 7392237.03, "employment20To24Persons": 1134234.447, "employment25To54Persons": 13115109.705, "employment55To64Persons": 4813078.317, "employment65To74Persons": 1136577.531},
    {"year": 2067, "populationUnder20Persons": 7442596.3253, "population20To24Persons": 2293069.287135, "population25To54Persons": 15963145.1217, "population55To64Persons": 6595359.091165, "population65To79Persons": 8493029.5734, "population80PlusPersons": 7320500.6013, "employment20To24Persons": 1128683.4144, "employment25To54Persons": 13037493.6492, "employment55To64Persons": 4822278.1392, "employment65To74Persons": 1149344.7972},
    {"year": 2068, "populationUnder20Persons": 7419336.4936, "population20To24Persons": 2277470.696682, "population25To54Persons": 15884936.7534, "population55To64Persons": 6585928.049918, "population65To79Persons": 8547583.473, "population80PlusPersons": 7246944.5334, "employment20To24Persons": 1121588.5749, "employment25To54Persons": 12974626.0677, "employment55To64Persons": 4809827.3247, "employment65To74Persons": 1164258.0327},
    {"year": 2069, "populationUnder20Persons": 7402497.0345, "population20To24Persons": 2259432.356549, "population25To54Persons": 15813167.9369, "population55To64Persons": 6556920.206551, "population65To79Persons": 8616491.0075, "population80PlusPersons": 7174391.458, "employment20To24Persons": 1113179.5916, "employment25To54Persons": 12917454.4396, "employment55To64Persons": 4783698.7792, "employment65To74Persons": 1182067.1896},
    {"year": 2070, "populationUnder20Persons": 7391961.9543, "population20To24Persons": 2239424.778825, "population25To54Persons": 15738668.4879, "population55To64Persons": 6522899.233275, "population65To79Persons": 8693725.7003, "population80PlusPersons": 7103219.8454, "employment20To24Persons": 1103612.9299, "employment25To54Persons": 12858344.2637, "employment55To64Persons": 4754495.2221, "employment65To74Persons": 1198247.5843}
  ],
  "derivedRetirementPensionerAnchors": [
    {"year": 2022, "retirementPensionerProxyPersons": 6689483.613},
    {"year": 2030, "retirementPensionerProxyPersons": 7684381.788},
    {"year": 2040, "retirementPensionerProxyPersons": 9849718.888},
    {"year": 2050, "retirementPensionerProxyPersons": 12015824.436},
    {"year": 2060, "retirementPensionerProxyPersons": 12479036.934},
    {"year": 2070, "retirementPensionerProxyPersons": 12196653.69}
  ],
};
