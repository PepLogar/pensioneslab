# Fuentes descargadas (no incluidas)

Esta carpeta no está en el repositorio. Guardaba copias de documentos y datos públicos de otros: organismos, bancos centrales, la Comisión Europea, la AIReF, Funcas y autores académicos. Esas copias son de sus autores, así que aquí solo se dice de dónde vienen y cómo comprobarlas.

**Para comprobar una cifra:**
1. Busca la ruta en el código. Cada módulo de `data/` cita su fuente, y Metodología → «Fuentes de datos» las lista todas.
2. Descarga el documento de su origen y guárdalo en esta carpeta con el nombre de la tabla.
3. Compara su huella SHA-256 con la de la tabla. Si no coincide, el organismo ha publicado otra versión, y las cifras pueden diferir.

Las pruebas no leen estos ficheros: el simulador funciona sin ellos.

| Fichero | Origen | Bytes | SHA-256 |
|---|---|---:|---|
| `2024_Ageing_Report-Statistical_annex_all_countryfiches.xlsx` | <https://economy-finance.ec.europa.eu/document/download/e248db46-f876-4e72-8821-efae678e81ea_en?filename=2024_Ageing_Report-Statistical_annex_all_countryfiches.xlsx> | 11.840.707 | `8453dfda8db0ad253d3965cd85490c30e4b5d0598eb6c2ffa4adbf23ab45bb7f` |
| `airef-2026/estudio-1-2026.pdf` | AIReF, Estudio 1/2026 (29/05/2026), en www.airef.es | 1.333.654 | `a41ffe179cb55e31fed1dba5ac28c83b521eb0f74fe0655d0ed3141c42727787` |
| `airef-2026/informe-seguimiento-pfemp-2026.pdf` | <https://www.airef.es/wp-content/uploads/2026/05/Informe_Progreso_PFEMP/Informe-Seguimiento-PFEMP-2026.pdf> | 1.721.908 | `7104e1a01f5b4d40322888fc00bec29b7b0b38c25e239fa6c7fce9e28da3420c` |
| `airef-2026/opinion-sostenibilidad-2025.pdf` | AIReF, Opinión sobre la sostenibilidad de las AA. PP. a largo plazo (31/03/2025), en www.airef.es | 1.953.530 | `2af1f49f2d1554c42e0eae82f6855683224d31b89b974216c6d40f1a48680ea1` |
| `ar2024-fiche-es/2024-ageing-report-country-fiche-Spain.pdf` | <https://economy-finance.ec.europa.eu/document/download/392994f2-c025-4066-bea8-f65cf4bcd411_en?filename=2024-ageing-report-country-fiche-Spain.pdf> | 1.305.914 | `073dca6b182b575cb78abe236e77db5014e78319cd0a0563e7ddaa161a307e3d` |
| `audit-laffer-2026/w15343.pdf` | Trabandt y Uhlig, «The Laffer Curve Revisited», NBER Working Paper 15343 (2009), en www.nber.org | 515.245 | `28043dccf535bcb7f5ffee5c0683b8acc21f481b0567cc51e26717094cdabc5a` |
| `audit-multiplicador-2026/bde-dt1309-hernandez-de-cos-moral-benito.pdf` | Hernández de Cos y Moral-Benito, «Fiscal multipliers in turbulent times: the case of Spain», Banco de España, Documento de Trabajo 1309 (2013), en www.bde.es | 748.724 | `7b33d79bcdecf904b369ceb23f361659ade5833e7435d2511f068315d6d3732d` |
| `audit-prima-riesgo-2026/ecb-irs-ES-DE-IT-PT-monthly-2007-2015.csv` | BCE, serie IRS (tipos de interés a largo plazo, convergencia), mensual 2007–2015, en data.ecb.europa.eu | 155.825 | `c567c1e6bbd513351cbcf8af222ba9d110f560289414ba60b27ef632abb63f65` |
| `crisis-metodologia-2026/ec-dsm-2022-ip199.pdf` | <https://economy-finance.ec.europa.eu/system/files/2023-06/ip199_en_UPD.pdf> | 4.918.799 | `556353687736b082a286cbc4c820a5b0679da1fe4ec8b7c3b48bd2c46fbdf9b0` |
| `current-2026/ED202609.xlsx` | <https://www.seg-social.es/wps/wcm/connect/wss/9a130d7f-83d3-4009-aece-d56ab3b81aa0/ED202609.xlsx?MOD=AJPERES> | 113.166 | `29dc25de4c5bbc1e4db4b1d6dd7090495046df1720aeeca6064ab3aa655ff7d2` |
| `current-2026/EVOEDAD202608.xlsx` | <https://www.seg-social.es/wps/wcm/connect/wss/5408b307-f2db-4df7-ba7f-34aa3d07ba05/EVOEDAD202608.xlsx?MOD=AJPERES> | 342.001 | `9f430517b3e37a2f5220dd00b7d59b7d0fd478b8392b4bb680614073e2ec9164` |
| `current-2026/bde-projections-october2026.html` | <https://www.bde.es/wbe/es/publicaciones/analisis-economico-investigacion/proyecciones-macro-informe-trimestral/proyecciones-e-informe-trimestral-de-la-economia-espanola-tercer-trimestre-2026.html> | 570.954 | `4f27d4d7e1d22efd188e2704e1eb7611f95181a4cb699b358f1dcba14410ab4e` |
| `current-2026/fiscal-IGAE-A_AAPP-20260930.xlsx` | <https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/AAPP_A/A_AAPP.xlsx> | 87.607 | `01925303ac94e6b5a3ef2c2057b08a3c830e50ff24c2cf34cf0c48deef58c563` |
| `current-2026/lgss-policy-snapshot-20261017.html` | <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724> | 2.609.780 | `349531be0a807b2649373f0777c9635f88ecc1cc503fc97846a5e634ce2bc8e6` |
| `current-2026/reserve-fund-2025-20260807.pdf` | <https://www.seg-social.es/descarga/es/15072026> | 3.759.590 | `5c8f6606c26ae8f813ed6d6be890fc6abe8ff7d82590b31576930998c736e27c` |
| `current-2026/reserve-fund-march2026.html` | <https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/inclusion/Paginas/2026/130426-fondo-reserva-seguridad-social-abril.aspx?mode=Light> | 62.438 | `20d2ab72689d873867a7ed5a015374d34a9725e5ef3ba0a739f149b16785afb5` |
| `current-2026/reserve-fund-regulation-20250219.html` | <https://www.boe.es/buscar/act.php?id=BOE-A-2025-3188> | 111.877 | `b2a01c6662246109b686febfbbc1cb500c8120ea72b08d432bc83123ef4495f0` |
| `debt-2026/tesoro-02-202609.pdf` | <https://www.tesoro.es/documents/d/tesoro/02-pdf> | 123.548 | `046449af18670b52eb9dd4fcb412d752aa05d370b5e3eb870f7d6e56c90e4dbb` |
| `debt-2026/tesoro-03-202609.pdf` | <https://www.tesoro.es/documents/d/tesoro/03-pdf> | 153.060 | `3b08a0534418c299b22ab23c48ed31429ec1e507a06c673a66f5969086992de7` |
| `debt-2026/tesoro-10-202609.pdf` | <https://www.tesoro.es/documents/d/tesoro/10-pdf> | 135.199 | `2d95db60ff26e5245199cd7e33fdf14126b5c9cb45bd1ae2aeaa9790789eb230` |
| `debt-2026/tesoro-14-202609.xlsx` | <https://www.tesoro.es/documents/d/tesoro/14-xlsx> | 54.496 | `f62a310809ca022546c89364961a0b82f041a1f24b1c0002771d892a878ccc3c` |
| `debt-term-2026/bde-si-1-2-p1.png` | Página 1 de https://www.bde.es/webbe/es/estadisticas/compartido/datos/pdf/si_1_2.pdf, como imagen | 22.681 | `e60ce85f06fdfe0bf4e5e3d3c47de9b427860ea11b464c289711081c9c34ea81` |
| `debt-term-2026/bde-si-1-2.pdf` | <https://www.bde.es/webbe/es/estadisticas/compartido/datos/pdf/si_1_2.pdf> | 8943 | `fa0dae052c8288537792cd7d877b9f814718d375ea6d2af2413da0b9f41a4069` |
| `debt-term-2026/tesoro-auctions-202609.xlsx` | <https://www.tesoro.es/deuda-publica/estad%C3%ADsticas-mensuales> | 40.591 | `d1e6e336a625c62f60e25985340339dd7d7326f49b86950126eebe8c87b78838` |
| `debt-term-2026/tesoro-bonos-latest-20261020.html` | <https://www.tesoro.es/deuda-publica/subastas/resultado-ultimas-subastas/bonos-del-estado> | 302.259 | `458d78e8a3f1513a67bbb4de4ed09e0cdd4c05dc03b313d75439485a5edd7a7f` |
| `debt-term-2026/tesoro-obligaciones-latest-20261020.html` | <https://www.tesoro.es/deuda-publica/subastas/resultado-ultimas-subastas/obligaciones-del-estado> | 305.204 | `30127784c90745a8581ba3e2145e849884de61f82b14931c787a7bb8d97472e1` |
| `epa-2026/ine-65109-ocupados-sexo-edad.json` | <https://www.ine.es/jaxiT3/Tabla.htm?t=65109> | 43.816 | `6fff72fa674247c4e50cce8e89ada4db03eee4db5cfe7a2cc129d3bf3b443e70` |
| `europop2025/proj_25naasfr-ES-BSL-2025-2100.json` | <https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/proj_25naasfr?geo=ES&projection=BSL&lang=EN> | 47.662 | `6bddfd5463f027e230894a3eb0cad4a872951cbf1e4e457544cec953523b3dec` |
| `europop2025/proj_25naasmr-ES-BSL-2025-2100.json` | <https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/proj_25naasmr?geo=ES&projection=BSL&lang=EN> | 257.051 | `6a70d24ff502c7b476456d6e9e96d7b6caa2ee4586a686ceaf61712435101171` |
| `europop2025/proj_25nanmig-ES-BSL-2025-2100.json` | <https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/proj_25nanmig?geo=ES&projection=BSL&lang=EN> | 290.161 | `b47fad4ef7b63cc27718bab6532adb5e20095f2762df0bbd604964ba8303f5ac` |
| `europop2025/proj_25np-ES-BSL-2025-2100.json` | <https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/proj_25np?geo=ES&projection=BSL&lang=EN> | 374.494 | `ee66f4cf41324bfa0005918c1d83fb717783adc6ad5a36634f5d9627ee1c4d8b` |
| `external-forecasts/funcas-PIB2610-20261015.pdf` | <https://www.funcas.es/wp-content/uploads/2026/10/PIB2610.pdf> | 294.890 | `5e6ded644e5a38acf45c9a705f82fd34add258c9724974b435da79a48118d50a` |
| `external-forecasts/funcas-PIB2610-scenarios-p8.png` | Página 8 de https://www.funcas.es/wp-content/uploads/2026/10/PIB2610.pdf, como imagen | 175.321 | `8b9f06ea2a7957d75c5170aff32baef7712fdebab7b9877b065d49f210e8361c` |
| `external-forecasts/funcas-PIB2610-table-p9.png` | Página 9 de https://www.funcas.es/wp-content/uploads/2026/10/PIB2610.pdf, como imagen | 474.626 | `e400046eacb9c13204cca663bde3a3611a8746097e142182048931d97e1cbd54` |
| `fmi-income-bde-do2422.pdf` | <https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesSeriadas/DocumentosOcasionales/24/Fich/do2422.pdf> | 696.027 | `eacd53793d0eb3f5479a557de7dbb1b33e74bb0b2a4589412dc6bf6dca7a4913` |
| `fmi-income-tgss-202608.pdf` | <https://www.seg-social.es/descarga/es/L_Entidades_Agosto_2026.pdf> | 21.795.696 | `998526f8dbb5fc6d890d5e2c326537bb8eae95f50c3c8d776516b9baf5327d4a` |
| `healthy-life-years/hlth_hlye-ES.json` | <https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/hlth_hlye?geo=ES&lang=EN> | 10.388 | `1491adc4f4a72f3c0136a2b7998ea1e64c19ab7554679324f585159a2d22ed71` |
| `rescue-vat2025-8.7.xlsx` | <https://sede.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_2025/Cuadro_8.7_es_es.xlsx> | 85.516 | `2e01307b301ac7d6f790ae90ea0b67a5377869987f43f5e8065cfbfdafecd5c9` |
| `revenue-v4-root/IGAE-impuestos-AAPP-20261017.xlsx` | <https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/AAPP_A/A_AAPP_Imp.xlsx> | 403.626 | `6616aea5a95c992fc66e97e1fe97d3e116c5b34908ad832cbb6b41d4548cac9a` |
| `revenue-v4-root/INE-CNA2025-20260918.html` | <https://www.ine.es/dyngs/Prensa/CNA2025.htm> | 70.614 | `ea7b65fbc10dcea21da1137ba1826b09f266dd283e510bbbb0edee921565336c` |
| `tax-v4-aeat-iart2025-2.1.xlsx` | <https://www3.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_2025/Cuadro_2.1_es_es.xlsx> | 75.046 | `d9bc09b194e8c2698bf2a3cd582c4bc5e1fbdc0457cfff43319a5669e02eb7d6` |
| `tax-v4-aeat-iart2025-2.2.xlsx` | <https://www3.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_2025/Cuadro_2.2_es_es.xlsx> | 60.367 | `affadf86a114ef1be4be0fb5815ec24b7a3efd8a867bbf3225c91edb9b4f74bd` |
| `tax-v4-aeat-iart2025-2.3.xlsx` | <https://www3.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_2025/Cuadro_2.3_es_es.xlsx> | 80.345 | `34eb8deb5f3347be53f0a346ca195cae82a509588d3c8d2a778f3fb182c52eb5` |
| `tax-v4-aeat-iart2025-3.1.xlsx` | <https://www3.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_2025/Cuadro_3.1_es_es.xlsx> | 75.684 | `2487c88a9e45ebf29dabf736777e1f00fb67d695b4339592312107443e95d72e` |
| `tax-v4-aeat-iart2025-4.1.xlsx` | <https://www3.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_Anuales_de_Recaudacion_Tributaria/Ejercicio_2025/Cuadro_4.1_es_es.xlsx> | 55.435 | `61e3de3d325aca5c0655ae6ce97080b255f30d4470218c898d0d16b3d7aa9316` |
| `tax-v4-aeat-irpf2024-505.html` | <https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/irpf/2024/jrubik7fd3b98e12c4926ff77bbeff41fed2678f3180fd.html> | 21.146 | `54565dfe978b114cd991f246d62ef715e8d45e002cb89a2f1e2dc54c0e366f88` |
| `tax-v4-aeat-irpf2024-530.html` | <https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/irpf/2024/jrubikf7f8962a05e0f2ab93c599500ba86a44fb3803c89.html> | 21.629 | `13dc58b6330be364162cb2e9426160c5f2d43e19c198a30e1210ed0881b2b06d` |
| `tax-v4-aeat-irpf2024-532.html` | <https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/irpf/2024/jrubik34c4d19c5d2bd7eaf59f6e349d282f128b6cddd2.html> | 21.456 | `6e632a8276b6022caf96c2aa7ff3709529d5a6f617f615d5210de4740a57c862` |
| `tax-v4-aeat-irpf2024-570.html` | <https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/irpf/2024/jrubik589aee5d7db64c565e91196c7b78844fc6099839.html> | 20.395 | `53c30741ddf1ab7932108506429a579af6995f58d0fc483ab9fd913a503fdb2e` |
| `tax-v4-aeat-irpf2024-catalogue.html` | <https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/Estadistica_de_los_declarantes_del_IRPF.shtml> | 14.642 | `fe4a7318f76e1a6be96c1a7bc1a82a064e452ef3f10133f652565e2db78e7fcb` |
| `tax-v4-aeat-irpf2024-totals.html` | <https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/irpf/2024/jrubik76548ae38735bf03449602c040daab039a324e4a.html> | 23.519 | `e8764788d756b6c01910808c5be80b7dacd6f3a166b966fdff0600d1a737c5ab` |
| `tax-v4-airef-modelos-ingresos-202504.pdf` | <https://www.airef.es/wp-content/uploads/2025/04/Documentos-tecnicos-segunda-opinion-sostenibilidad-a-largo-plazo-AAPP/DT-modelos-ingresos-y-desempleo.pdf> | 500.458 | `cad62b0ad1e5bb376743e575b92d25c0e59c9c18043b1e7dff2d158d593bdaaa` |
| `tax-v4-boe-irpf-consolidated-20261007.html` | <https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764> | 2.028.862 | `0f7c0ed2104c10b74c00ecda6fe8bdeeb5d9628912ad17f5b6dd8b248d430c6a` |

Notas:
- Las copias se descargaron entre el 1/10 y el 26/11/2026. Algunas direcciones apuntan siempre a la última versión, por ejemplo las del Tesoro o las de la IGAE.
- Las imágenes PNG son páginas de un PDF de la tabla, guardadas para revisar las celdas transcritas.
