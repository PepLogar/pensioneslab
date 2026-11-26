/** Official 2026 INSS snapshot. Benefits are not unique people.
 * Grouped stock at1September; awards Jan-August. Raw sources and hashes in metadata.
 * Weight ages54/71 represent open groups <=54/>70; they are explicit approximations.
 * No fitting, future legal hazard, fourteen-payment annualisation or CP mixing. */
export const OFFICIAL_CURRENT_RETIREMENT_STOCK = Object.freeze({
  "schemaVersion": 1,
  "metadata": {
    "id": "es-inss-retirement-stock-age-sex-20260901-v1",
    "informationCutoff": "2026-10-17",
    "file": "data/sources/current-2026/ED202609.xlsx",
    "url": "https://www.seg-social.es/wps/wcm/connect/wss/9a130d7f-83d3-4009-aece-d56ab3b81aa0/ED202609.xlsx?MOD=AJPERES",
    "sha256": "29dc25de4c5bbc1e4db4b1d6dd7090495046df1720aeeca6064ab3aa655ff7d2",
    "period": "2026-09-01",
    "publicationDate": "2026-09-25",
    "publicationDateBasis": "INSS publication accompanying September 2026 release; workbook contains no independent release timestamp",
    "availableBy": "2026-10-17",
    "retrievedAtUTC": "2026-10-17T16:54:00.174225+00:00",
    "bytes": 113166,
    "sourceTable": "Edades_Total sistema; N:S, rows7:25; totals row6",
    "stockDate": "2026-09-01",
    "countUnit": "pensions/benefits, not unique persons",
    "amountUnit": "EUR per ordinary monthly pension; full source precision, not annual expenditure",
    "scope": "Total Sistema Seguridad Social retirement, including SOVI and IP renamed retirement; excludes Clases Pasivas and non-contributory pensions",
    "unknownSexDerivation": "U count=T-M-F; U amount from aggregate weighted amounts, subject to floating-point precision",
    "limitations": [
      "Five-year age groups and open85+; unknown age/sex preserved",
      "Individual ages inside each group are not observed",
      "A benefit count is not a unique retiree count",
      "Monthly amounts must not automatically be multiplied by14 as observed annual expenditure",
      "No fit to projected spending or historical forecast errors"
    ]
  },
  "rows": [
    {
      "ageLower": 0,
      "ageUpper": 4,
      "ageLabel": "0 - 4",
      "M": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "F": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "T": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 5,
      "ageUpper": 9,
      "ageLabel": "5 - 9",
      "M": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "F": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "T": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 10,
      "ageUpper": 14,
      "ageLabel": "10 - 14",
      "M": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "F": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "T": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 15,
      "ageUpper": 19,
      "ageLabel": "15 - 19",
      "M": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "F": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "T": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 20,
      "ageUpper": 24,
      "ageLabel": "20 - 24",
      "M": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "F": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "T": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 25,
      "ageUpper": 29,
      "ageLabel": "25 - 29",
      "M": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "F": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "T": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 30,
      "ageUpper": 34,
      "ageLabel": "30 - 34",
      "M": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "F": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "T": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 35,
      "ageUpper": 39,
      "ageLabel": "35 - 39",
      "M": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "F": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "T": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 40,
      "ageUpper": 44,
      "ageLabel": "40 - 44",
      "M": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "F": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "T": {
        "count": 0,
        "averageMonthlyEUR": null
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 45,
      "ageUpper": 49,
      "ageLabel": "45 - 49",
      "M": {
        "count": 37,
        "averageMonthlyEUR": 2713.4491891891885
      },
      "F": {
        "count": 9,
        "averageMonthlyEUR": 2217.6322222222225
      },
      "T": {
        "count": 46,
        "averageMonthlyEUR": 2616.4415217391297
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 50,
      "ageUpper": 54,
      "ageLabel": "50 - 54",
      "M": {
        "count": 231,
        "averageMonthlyEUR": 2678.477965367965
      },
      "F": {
        "count": 78,
        "averageMonthlyEUR": 2500.557820512821
      },
      "T": {
        "count": 309,
        "averageMonthlyEUR": 2633.5660841423946
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 55,
      "ageUpper": 59,
      "ageLabel": "55 - 59",
      "M": {
        "count": 8461,
        "averageMonthlyEUR": 2897.0596643422773
      },
      "F": {
        "count": 831,
        "averageMonthlyEUR": 2287.9103610108305
      },
      "T": {
        "count": 9292,
        "averageMonthlyEUR": 2842.5823643994845
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 60,
      "ageUpper": 64,
      "ageLabel": "60 - 64",
      "M": {
        "count": 141029,
        "averageMonthlyEUR": 2253.4664251324184
      },
      "F": {
        "count": 50711,
        "averageMonthlyEUR": 1929.462723669417
      },
      "T": {
        "count": 191740,
        "averageMonthlyEUR": 2167.7745939814317
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 65,
      "ageUpper": 69,
      "ageLabel": "65 - 69",
      "M": {
        "count": 956750,
        "averageMonthlyEUR": 1859.5368226600467
      },
      "F": {
        "count": 702818,
        "averageMonthlyEUR": 1528.851141319662
      },
      "T": {
        "count": 1659568,
        "averageMonthlyEUR": 1719.4932395177552
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 70,
      "ageUpper": 74,
      "ageLabel": "70 - 74",
      "M": {
        "count": 934948,
        "averageMonthlyEUR": 1844.0694478837374
      },
      "F": {
        "count": 717351,
        "averageMonthlyEUR": 1415.8833120327472
      },
      "T": {
        "count": 1652299,
        "averageMonthlyEUR": 1658.1710404291282
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    },
    {
      "ageLower": 75,
      "ageUpper": 79,
      "ageLabel": "75 - 79",
      "M": {
        "count": 782163,
        "averageMonthlyEUR": 1837.0743251214826
      },
      "F": {
        "count": 543051,
        "averageMonthlyEUR": 1233.8254072453622
      },
      "T": {
        "count": 1325215,
        "averageMonthlyEUR": 1589.873048554382
      },
      "U": {
        "count": 1,
        "averageMonthlyEUR": 1925.4499998092651
      }
    },
    {
      "ageLower": 80,
      "ageUpper": 84,
      "ageLabel": "80 - 84",
      "M": {
        "count": 573846,
        "averageMonthlyEUR": 1720.3992954207301
      },
      "F": {
        "count": 402282,
        "averageMonthlyEUR": 1000.128781128666
      },
      "T": {
        "count": 976130,
        "averageMonthlyEUR": 1423.5601641994472
      },
      "U": {
        "count": 2,
        "averageMonthlyEUR": 861.3350000083447
      }
    },
    {
      "ageLower": 85,
      "ageUpper": null,
      "ageLabel": "85 y más",
      "M": {
        "count": 515801,
        "averageMonthlyEUR": 1484.952774151305
      },
      "F": {
        "count": 429640,
        "averageMonthlyEUR": 827.610065682911
      },
      "T": {
        "count": 945456,
        "averageMonthlyEUR": 1186.233365994846
      },
      "U": {
        "count": 15,
        "averageMonthlyEUR": 1129.2533333261808
      }
    },
    {
      "ageLower": null,
      "ageUpper": null,
      "ageLabel": "No consta",
      "M": {
        "count": 64,
        "averageMonthlyEUR": 2563.9390625000005
      },
      "F": {
        "count": 18,
        "averageMonthlyEUR": 1650.7144444444446
      },
      "T": {
        "count": 82,
        "averageMonthlyEUR": 2363.47512195122
      },
      "U": {
        "count": 0,
        "averageMonthlyEUR": null
      }
    }
  ],
  "publishedTotals": {
    "M": {
      "count": 3913330,
      "averageMonthlyEUR": 1798.0840355809394
    },
    "F": {
      "count": 2846789,
      "averageMonthlyEUR": 1270.947260278143
    },
    "T": {
      "count": 6760137,
      "averageMonthlyEUR": 1576.0975651854442
    },
    "U": {
      "count": 18,
      "averageMonthlyEUR": 1143.7177845372094
    },
    "monthlyAmountEUR": 10654635466.020016
  }
});

export const RETIREMENT_AGE_SOURCE = Object.freeze({
  "schemaVersion": 1,
  "metadata": {
    "file": "data/sources/current-2026/EVOEDAD202608.xlsx",
    "url": "https://www.seg-social.es/wps/wcm/connect/wss/5408b307-f2db-4df7-ba7f-34aa3d07ba05/EVOEDAD202608.xlsx?MOD=AJPERES",
    "sha256": "9f430517b3e37a2f5220dd00b7d59b7d0fd478b8392b4bb680614073e2ec9164",
    "period": "2026-01/2026-08",
    "publicationDate": "2026-09-25",
    "publicationDateBasis": "INSS publication accompanying September 2026 release; workbook contains no independent release timestamp",
    "availableBy": "2026-10-17",
    "retrievedAtUTC": "2026-10-17T16:54:00.174225+00:00",
    "bytes": 342001,
    "informationCutoff": "2026-10-17",
    "sourceTable": "Total nacional!N7:P24; totalN25; labelsA7:A24",
    "denominator": 247161,
    "weightDefinition": "Each observed age-group award count / observed total247161; no target mean adjustment",
    "dateDefinition": "Annual accumulated processing-month counts Jan-Aug2026; age at economic effects, not process date",
    "openGroupRepresentatives": {
      "upTo54": 54,
      "over70": 71
    },
    "limitations": [
      "Weights describe observed awards, not age-specific retirement hazards among workers",
      "Age54 and71 are representatives of open groups, not observed exact ages; over70 may include unknown/erroneous ages",
      "No age-by-career-length cross-tab: legal short-career share cannot be identified",
      "Observed awards include partial/early/delayed cases; pension count is not a complete withdrawal from work",
      "No conversion from January-August flow to full-year flow"
    ]
  },
  "rows": [
    {
      "ageLabel": "Hasta 54 años",
      "age": 54,
      "representativeAgeIsAssumption": true,
      "count": 33,
      "recognisedMonthlyAmountEUR": 88407.21999999999,
      "averageMonthlyEUR": 2679.006666666666
    },
    {
      "ageLabel": "55 años",
      "age": 55,
      "representativeAgeIsAssumption": false,
      "count": 43,
      "recognisedMonthlyAmountEUR": 110564.3,
      "averageMonthlyEUR": 2571.2627906976745
    },
    {
      "ageLabel": "56 años",
      "age": 56,
      "representativeAgeIsAssumption": false,
      "count": 288,
      "recognisedMonthlyAmountEUR": 604731.59,
      "averageMonthlyEUR": 2099.7624652777777
    },
    {
      "ageLabel": "57 años",
      "age": 57,
      "representativeAgeIsAssumption": false,
      "count": 204,
      "recognisedMonthlyAmountEUR": 499780.25000000006,
      "averageMonthlyEUR": 2449.90318627451
    },
    {
      "ageLabel": "58 años",
      "age": 58,
      "representativeAgeIsAssumption": false,
      "count": 242,
      "recognisedMonthlyAmountEUR": 583043.8499999997,
      "averageMonthlyEUR": 2409.2721074380156
    },
    {
      "ageLabel": "59 años",
      "age": 59,
      "representativeAgeIsAssumption": false,
      "count": 650,
      "recognisedMonthlyAmountEUR": 1847732.91,
      "averageMonthlyEUR": 2842.666015384615
    },
    {
      "ageLabel": "60 años",
      "age": 60,
      "representativeAgeIsAssumption": false,
      "count": 1579,
      "recognisedMonthlyAmountEUR": 4694432.540000002,
      "averageMonthlyEUR": 2973.041507283092
    },
    {
      "ageLabel": "61 años",
      "age": 61,
      "representativeAgeIsAssumption": false,
      "count": 6065,
      "recognisedMonthlyAmountEUR": 13280467.719999999,
      "averageMonthlyEUR": 2189.6896488046164
    },
    {
      "ageLabel": "62 años",
      "age": 62,
      "representativeAgeIsAssumption": false,
      "count": 8222,
      "recognisedMonthlyAmountEUR": 11697964.150000004,
      "averageMonthlyEUR": 1422.7638226708834
    },
    {
      "ageLabel": "63 años",
      "age": 63,
      "representativeAgeIsAssumption": false,
      "count": 32464,
      "recognisedMonthlyAmountEUR": 68654386.11999999,
      "averageMonthlyEUR": 2114.785181123706
    },
    {
      "ageLabel": "64 años",
      "age": 64,
      "representativeAgeIsAssumption": false,
      "count": 19224,
      "recognisedMonthlyAmountEUR": 37654985.669999994,
      "averageMonthlyEUR": 1958.7487343945065
    },
    {
      "ageLabel": "65 años",
      "age": 65,
      "representativeAgeIsAssumption": false,
      "count": 86256,
      "recognisedMonthlyAmountEUR": 162308935.98,
      "averageMonthlyEUR": 1881.7118343071786
    },
    {
      "ageLabel": "66 años",
      "age": 66,
      "representativeAgeIsAssumption": false,
      "count": 61943,
      "recognisedMonthlyAmountEUR": 80359870.53999996,
      "averageMonthlyEUR": 1297.3196412831146
    },
    {
      "ageLabel": "67 años",
      "age": 67,
      "representativeAgeIsAssumption": false,
      "count": 14369,
      "recognisedMonthlyAmountEUR": 18363905.09,
      "averageMonthlyEUR": 1278.0224852112185
    },
    {
      "ageLabel": "68 años",
      "age": 68,
      "representativeAgeIsAssumption": false,
      "count": 5550,
      "recognisedMonthlyAmountEUR": 7476160.029999999,
      "averageMonthlyEUR": 1347.055861261261
    },
    {
      "ageLabel": "69 años",
      "age": 69,
      "representativeAgeIsAssumption": false,
      "count": 3116,
      "recognisedMonthlyAmountEUR": 4269927.2700000005,
      "averageMonthlyEUR": 1370.3232573812581
    },
    {
      "ageLabel": "70 años",
      "age": 70,
      "representativeAgeIsAssumption": false,
      "count": 2753,
      "recognisedMonthlyAmountEUR": 4947243.530000001,
      "averageMonthlyEUR": 1797.0372430076284
    },
    {
      "ageLabel": "Más de 70 años",
      "age": 71,
      "representativeAgeIsAssumption": true,
      "count": 4160,
      "recognisedMonthlyAmountEUR": 5215385.049999999,
      "averageMonthlyEUR": 1253.6983293269227
    }
  ],
  "publishedTotal": 247161,
  "averageMonthlyEUR": 1710.0510347910877
});

export const RETIREMENT_AGE_WEIGHTS = Object.freeze([
  {
    "age": 54,
    "weight": 0.00013351621008168764
  },
  {
    "age": 55,
    "weight": 0.00017397566768219904
  },
  {
    "age": 56,
    "weight": 0.0011652323788947285
  },
  {
    "age": 57,
    "weight": 0.0008253729350504327
  },
  {
    "age": 58,
    "weight": 0.000979118873932376
  },
  {
    "age": 59,
    "weight": 0.0026298647440332417
  },
  {
    "age": 60,
    "weight": 0.006388548355120751
  },
  {
    "age": 61,
    "weight": 0.02453866103471017
  },
  {
    "age": 62,
    "weight": 0.03326576603914048
  },
  {
    "age": 63,
    "weight": 0.13134758315430023
  },
  {
    "age": 64,
    "weight": 0.07777926129122313
  },
  {
    "age": 65,
    "weight": 0.3489870974789712
  },
  {
    "age": 66,
    "weight": 0.2506180182148478
  },
  {
    "age": 67,
    "weight": 0.05813619462617484
  },
  {
    "age": 68,
    "weight": 0.022454998968283832
  },
  {
    "age": 69,
    "weight": 0.012607166988319355
  },
  {
    "age": 70,
    "weight": 0.01113848867742079
  },
  {
    "age": 71,
    "weight": 0.016831134361812744
  }
].map(Object.freeze));
