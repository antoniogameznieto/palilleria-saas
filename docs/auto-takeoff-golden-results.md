# Golden set auto-takeoff — Fase 15B

## Metadatos

| Campo | Valor |
| --- | --- |
| Fecha | 2026-06-09 |
| Commit probado | `7da37c7` |
| Comando | `npm run validate:auto-takeoff-golden` |
| Golden set | `tests/fixtures/auto-takeoff-golden/golden-set.json` |
| PDFs en set | 7 |
| Resultado global | **PASS** |

## Resumen agregado

| Métrica | Valor |
| --- | --- |
| Casos evaluados | 7 |
| Expected rows evaluadas | 35 |
| Matches | 35 |
| Missing expected | 0 |
| Recall agregado | 100.0% |
| Precision agregada (casos con total) | 100.0% |
| Casos negativos | 1 |
| Violaciones negativas | 0 |

## Por PDF

| ID | PDF | BOM esperada | Total esperado | Sugeridas | Matches | Recall | Precision | FP high-conf | Estado |
| --- | --- | --- | ---: | ---: | --- | ---: | ---: | ---: | --- |
| dms-703 | dms-703.pdf | sí | 21 | 21 | 8/8 | 100.0% | 100.0% | 0 | recall 100.0%, precision 100.0% |
| dms-704 | dms-704.pdf | sí | 17 | 17 | 7/7 | 100.0% | 100.0% | 0 | recall 100.0%, precision 100.0% |
| dms-702 | dms-702.pdf | sí | 21 | 21 | 6/6 | 100.0% | 100.0% | 0 | recall 100.0%, precision 100.0% |
| hl-1289-01 | hl-1289-01.pdf | sí | 11 | 11 | 6/6 | 100.0% | 100.0% | 0 | recall 100.0%, precision 100.0% |
| hl-1293-01 | hl-1293-01.pdf | sí | 11 | 11 | 6/6 | 100.0% | 100.0% | 0 | recall 100.0%, precision 100.0% |
| dw-701 | dw-701.pdf | sí | 2 | 2 | 2/2 | 100.0% | 100.0% | 0 | recall 100.0%, precision 100.0% |
| no-bom-negative | no-bom-negative.pdf | no | 0 | 0 | 0/0 | — | — | 0 | negativo OK |

## Misses (expected no encontradas)

_Ninguno._

## Falsos positivos high-confidence

_Ninguno._

## Excepciones documentadas

_Ninguna._

## Fallos de umbral

_Ninguno — todos los umbrales cumplidos._

## Conclusión

El motor cumple recall ≥ 90 % y precision ≥ 85 % en el golden set versionado. Listo para ampliar validación en 15C.

## Recomendación para Fase 15C

- Ampliar golden set con hojas `-02` y más DW para medir regresiones.
- Añadir comparación contra palillería manual en BD (precisión de negocio).
- Evaluar beta interna con gate `validate:auto-takeoff-golden` en CI.
