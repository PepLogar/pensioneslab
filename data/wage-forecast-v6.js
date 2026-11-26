// Official AMECO components; explicitly derived gross-wage index. No forecast beyond 2027.
// Sources and exact extraction are frozen in pensiones_lab_2/data/sources/wages-v6/ (not copied here). No motor outputs used.
export const WAGE_FORECAST_V6 = Object.freeze({
  "id": "ameco-spring2026-resident-gross-wage-index-v6",
  "baseYear": 2026,
  "identifiedForecastYears": [
    2027
  ],
  "nominalWageGrowthByYear": {
    "2027": 0.028738705287687516
  },
  "nominalWageIndexByYear": {
    "2026": 1,
    "2027": 1.0287387052876875
  },
  "formula": "(UWSH_2027/NWTN_2027)/(UWSH_2026/NWTN_2026)",
  "rawRows": [
    {
      "year": 2025,
      "grossWagesResidentHouseholdsBillionEUR": 636.2522,
      "residentEmployeesThousandPersons": 19465.7,
      "domesticEmployeesThousandPersons": 19374.3,
      "derivedGrossWagePerResidentEmployeeEUR": 32685.811452965987
    },
    {
      "year": 2026,
      "grossWagesResidentHouseholdsBillionEUR": 673.36495,
      "residentEmployeesThousandPersons": 19962.075,
      "domesticEmployeesThousandPersons": 19868.345,
      "derivedGrossWagePerResidentEmployeeEUR": 33732.212207398275
    },
    {
      "year": 2027,
      "grossWagesResidentHouseholdsBillionEUR": 703.80008,
      "residentEmployeesThousandPersons": 20281.469,
      "domesticEmployeesThousandPersons": 20186.238,
      "derivedGrossWagePerResidentEmployeeEUR": 34701.63231272843
    }
  ],
  "source": {
    "provider": "European Commission, DG ECFIN, AMECO",
    "releaseDate": "2026-06-03",
    "forecastVintage": "Spring 2026, released 2026-05-21; AMECO update 2026-06-03",
    "informationCutoff": "2026-10-18",
    "publicationNote": "AMECO catalogue identifies 03/06/2026 as current release; next release 17/11/2026.",
    "catalogueUrl": "https://economy-finance.ec.europa.eu/economic-research-and-databases/economic-databases/ameco-database_en",
    "numerator": {
      "code": "ESP.1.0.99.0.UWSH",
      "title": "Gross wages and salaries: households and NPISH",
      "unit": "Mrd ECU/EUR",
      "sourceFile": "ameco15-20260603.zip",
      "sourceMember": "AMECO15.TXT",
      "line": 131,
      "values": {
        "2023": 554.587,
        "2024": 595.672,
        "2025": 636.2522,
        "2026": 673.36495,
        "2027": 703.80008
      }
    },
    "denominator": {
      "code": "ESP.1.0.0.0.NWTN",
      "title": "Employees, persons: total economy (National accounts)",
      "unit": "1000 persons",
      "sourceFile": "ameco1-20260603.zip",
      "sourceMember": "AMECO1.TXT",
      "line": 792,
      "values": {
        "2023": 18446.8,
        "2024": 18940.9,
        "2025": 19465.7,
        "2026": 19962.075,
        "2027": 20281.469
      }
    },
    "originalFiles": [
      {
        "file": "ameco15-20260603.zip",
        "url": "https://ec.europa.eu/economy_finance/db_indicators/ameco/documents/ameco15.zip",
        "sha256": "62aa753b94e575850d420f9f29ffdfb168d60b0fb806fb8e3fb4b28cd0e06a45",
        "bytes": 263565,
        "retrievedAt": "2026-10-18"
      },
      {
        "file": "ameco1-20260603.zip",
        "url": "https://ec.europa.eu/economy_finance/db_indicators/ameco/documents/ameco1.zip",
        "sha256": "0758efc351af462750761fbfa76cb14c5567462945749e6f596a4046054e5689",
        "bytes": 190307,
        "retrievedAt": "2026-10-18"
      },
      {
        "file": "ameco-help-202605.zip",
        "url": "https://economy-finance.ec.europa.eu/document/download/ee1f3fdc-bef6-498e-9de0-d57257186a66_en?filename=Ameco%20help%20files%20%282026_05%29.zip",
        "sha256": "a1a9abd671e9eedfb5a644f7917caee9e3e9168ef04a5dae2d8f99457a403258",
        "bytes": 256498,
        "retrievedAt": "2026-10-18"
      },
      {
        "file": "ameco-catalogue.html",
        "url": "https://economy-finance.ec.europa.eu/economic-research-and-databases/economic-databases/ameco-database_en",
        "sha256": "a449b3512f05e21b241603acaeadad0d1da46b27700615ada65cbe4a4cf59d12",
        "bytes": 82846,
        "retrievedAt": "2026-10-18"
      }
    ],
    "definitionMembers": [
      "UWSH.TXT",
      "NWTN.TXT"
    ],
    "concept": "D.11 received by resident households / resident employees, annual average persons; both national concept. No employers social contributions."
  },
  "application": {
    "replaceOpeningWageLevel": false,
    "identifiedHorizonEnds": 2027,
    "after2027": "No AMECO gross-wage forecast here; the consuming model may retain its documented AR real-growth path and preserve the acquired level.",
    "priority": "An explicit complete nominalWageIndex supplied by a scenario takes precedence.",
    "realConversion": "Divide the nominal annual growth factor by that scenario annual CPI factor; do not add inflation twice.",
    "perimeterLimitation": "Apply only the growth index to the existing equivalent-wage level. EAES and resident national-account employees have different coverage. Total TGSS affiliates include self-employed and are not this denominator."
  },
  "nominalGrowth2027": 0.028738705287687516,
  "status": "official-components-derived-index-identified-through-2027"
});
