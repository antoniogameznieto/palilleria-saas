# Benchmark auto-takeoff — Fase 15A

## Metadatos

| Campo | Valor |
| --- | --- |
| Fecha | 2026-06-09 |
| Commit probado | `26ff027` |
| Comando | `npm run benchmark:auto-takeoff -- ./Ejemplos/Ejemplo 1 ./Ejemplos/Ejemplo 2 ./storage/companies/cmq59yda70001o9qewato82p8/jobs/cmq5a8ic50009o9qegcl9k1a6 --limit 30` |
| Entradas | `./Ejemplos/Ejemplo 1`, `./Ejemplos/Ejemplo 2`, `./storage/companies/cmq59yda70001o9qewato82p8/jobs/cmq5a8ic50009o9qegcl9k1a6` |
| PDFs únicos analizados | 17 |
| Fingerprint muestra | `fc53986285ee` |

## Resumen agregado

| Métrica | Valor |
| --- | --- |
| PDFs analizados | 17 |
| PDFs con texto embebido útil | 15 |
| PDFs con BOM / relación detectada | 15 |
| PDFs con ≥1 sugerencia | 15 |
| Total filas sugeridas | 134 |
| Media filas/PDF con BOM y filas | 8.93 |
| Confianza alta (filas) | 134 |
| Confianza media (filas) | 0 |
| Confianza baja (filas) | 0 |
| PDFs con error | 0 |

### Top unidades detectadas

- `m`: 15 PDF(s)

### Secciones BOM detectadas (conteo PDFs)

- `MATERIALES`: 15
- `RELACION_DE_MATERIALES`: 15

### Errores por tipo

_Ninguno_

## Tabla por PDF

| Archivo | Páginas | Texto (chars) | Texto útil | Secciones BOM | Filas | Conf. media | Con ref | Sin ref | Estado |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- |
| 2301GB47G-C1-L-HL-1289-01.pdf | 1 | 2116 | sí | MATERIALES, RELACION_DE_MATERIALES | 11 | 1 | 11 | 0 | 11 filas |
| 2301GB47G-C1-L-HL-1289-02.pdf | 1 | 1244 | sí | MATERIALES, RELACION_DE_MATERIALES | 4 | 1 | 4 | 0 | 4 filas |
| 2301GB47G-C1-L-HL-1291-01.pdf | 1 | 2015 | sí | MATERIALES, RELACION_DE_MATERIALES | 10 | 1 | 10 | 0 | 10 filas |
| 2301GB47G-C1-L-HL-1291-02.pdf | 1 | 1245 | sí | MATERIALES, RELACION_DE_MATERIALES | 4 | 1 | 4 | 0 | 4 filas |
| 2301GB47G-C1-L-HL-1292-01.pdf | 1 | 2040 | sí | MATERIALES, RELACION_DE_MATERIALES | 10 | 1 | 10 | 0 | 10 filas |
| 2301GB47G-C1-L-HL-1292-02.pdf | 1 | 1246 | sí | MATERIALES, RELACION_DE_MATERIALES | 4 | 1 | 4 | 0 | 4 filas |
| 2301GB47G-C1-L-HL-1293-01.pdf | 1 | 2253 | sí | MATERIALES, RELACION_DE_MATERIALES | 11 | 1 | 11 | 0 | 11 filas |
| 2301GB47G-C1-L-HL-1293-02.pdf | 1 | 1245 | sí | MATERIALES, RELACION_DE_MATERIALES | 4 | 1 | 4 | 0 | 4 filas |
| 2301GB47G-C1-L-HL-1294-01.pdf | 1 | 2100 | sí | MATERIALES, RELACION_DE_MATERIALES | 10 | 1 | 10 | 0 | 10 filas |
| Hoja de palilleo.pdf | 1 | 12 | no | — | 0 | — | 0 | 0 | Sin texto útil |
| Isos trameados.pdf | 9 | 140 | no | — | 0 | — | 0 | 0 | Sin texto útil |
| 1601GB16A-PL1-L-DMS-702-01-R03.pdf | 1 | 3616 | sí | MATERIALES, RELACION_DE_MATERIALES | 21 | 0.9952 | 20 | 1 | 21 filas |
| 1601GB16A-PL1-L-DMS-703-01-R03.pdf | 1 | 3652 | sí | MATERIALES, RELACION_DE_MATERIALES | 21 | 0.9952 | 20 | 1 | 21 filas |
| 1601GB16A-PL1-L-DMS-704-01-R02.pdf | 1 | 3149 | sí | MATERIALES, RELACION_DE_MATERIALES | 17 | 1 | 17 | 0 | 17 filas |
| 1601GB16A-PL1-L-DW-701-01-R1.pdf | 1 | 1574 | sí | MATERIALES, RELACION_DE_MATERIALES | 2 | 1 | 2 | 0 | 2 filas |
| 1601GB16A-PL1-L-DW-702-01-R1.pdf | 1 | 1742 | sí | MATERIALES, RELACION_DE_MATERIALES | 3 | 1 | 3 | 0 | 3 filas |
| 1601GB16A-PL1-L-DW-702-02-R0.pdf | 1 | 1415 | sí | MATERIALES, RELACION_DE_MATERIALES | 2 | 1 | 2 | 0 | 2 filas |

## Casos buenos

- **1601GB16A-PL1-L-DMS-702-01-R03.pdf**: 21 filas, confianza media 0.9952, secciones `MATERIALES`, `RELACION_DE_MATERIALES`, refs 20/21.
- **1601GB16A-PL1-L-DMS-703-01-R03.pdf**: 21 filas, confianza media 0.9952, secciones `MATERIALES`, `RELACION_DE_MATERIALES`, refs 20/21.
- **1601GB16A-PL1-L-DMS-704-01-R02.pdf**: 17 filas, confianza media 1, secciones `MATERIALES`, `RELACION_DE_MATERIALES`, refs 17/17.
- **2301GB47G-C1-L-HL-1289-01.pdf**: 11 filas, confianza media 1, secciones `MATERIALES`, `RELACION_DE_MATERIALES`, refs 11/11.
- **2301GB47G-C1-L-HL-1293-01.pdf**: 11 filas, confianza media 1, secciones `MATERIALES`, `RELACION_DE_MATERIALES`, refs 11/11.

## Casos problemáticos

- **Hoja de palilleo.pdf**: poco o ningún texto embebido (12 chars).
- **Isos trameados.pdf**: poco o ningún texto embebido (140 chars).
- **1601GB16A-PL1-L-DW-701-01-R1.pdf**: BOM detectada pero solo 2 fila(s) — extracción parcial (posible formato DW distinto o bloque cortado).
- **1601GB16A-PL1-L-DW-702-01-R1.pdf**: BOM detectada pero solo 3 fila(s) — extracción parcial (posible formato DW distinto o bloque cortado).
- **1601GB16A-PL1-L-DW-702-02-R0.pdf**: BOM detectada pero solo 2 fila(s) — extracción parcial (posible formato DW distinto o bloque cortado).

## Conclusiones

Parcialmente viable para beta acotada: varios planos reales extraen filas útiles, pero la cobertura no es universal.

El motor actual (`experimental-auto-takeoff-parse`) depende de:

1. Texto embebido seleccionable (no escaneado).
2. Presencia de encabezados tipo RELACIÓN DE MATERIALES / BOM / MATERIAL LIST.
3. Filas con cantidad + descripción (+ referencia SAP opcional).

Secciones rastreadas en este benchmark: `RELACION_DE_MATERIALES`, `RELACION_DE_MATERIALES_CLEAN`, `MATERIALES`, `BOM`, `BILL_OF_MATERIALS`, `MATERIAL_LIST`, `RELACION_DE_MATERIALES`, `RELACION_DE_MATERIALES_CLEAN`, etc.

## Limitaciones (15A)

- Sin OCR: PDFs raster o con texto como trazos no aportan BOM.
- Sin validación contra palillería real (solo extracción).
- Dedupe por nombre de archivo: copias en distintas carpetas cuentan una vez.
- Warnings del parser no implican fallo; pueden indicar filas dudosas.

## Recomendación para Fase 15B

- Ampliar golden set etiquetado (10–15 PDFs) con filas esperadas para medir precisión, no solo cobertura.
- Priorizar planos con `RELACIÓN DE MATERIALES` y referencias SAP en texto seleccionable.
- Excluir o marcar aparte isométricos/palilleros manuales sin BOM embebida.
- Beta interna solo en job/drawing con PDFs que pasen `hasUsefulEmbeddedText` + sección BOM en preview.
