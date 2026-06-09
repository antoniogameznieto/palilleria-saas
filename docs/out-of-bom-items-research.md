# Investigación partidas fuera del BOM (Fase 16A)

**Fecha:** 2026-06-09  
**Commit probado:** `52d4f6a93e334b123412c9a1c915d98f119502df`  
**Entradas:** `./tests/fixtures/auto-takeoff-business`, `./Ejemplos`

## Resumen

| Métrica | Valor |
|---------|-------|
| PDFs analizados | 20 |
| Con BOM | 18 |
| Con bloque SOPORTES | 6 |
| Candidatos soporte (total) | 32 |
| Filas soporte tabulares | 12 |
| Menciones soporte sueltas | 12 |
| Candidatos fuera de BOM | 20 |

**PDFs:** dms-703.pdf, dms-704.pdf, hl-1289-01.pdf, hl-1293-01.pdf, dw-701.pdf, 2301GB47G-C1-L-HL-1289-01.pdf, 2301GB47G-C1-L-HL-1289-02.pdf, 2301GB47G-C1-L-HL-1291-01.pdf, 2301GB47G-C1-L-HL-1291-02.pdf, 2301GB47G-C1-L-HL-1292-01.pdf, 2301GB47G-C1-L-HL-1292-02.pdf, 2301GB47G-C1-L-HL-1293-01.pdf, 2301GB47G-C1-L-HL-1293-02.pdf, 2301GB47G-C1-L-HL-1294-01.pdf, Hoja de palilleo.pdf, Isos trameados.pdf, 1601GB16A-PL1-L-DMS-702-01-R03.pdf, 1601GB16A-PL1-L-DMS-703-01-R03.pdf, 1601GB16A-PL1-L-DMS-704-01-R02.pdf, 1601GB16A-PL1-L-DW-701-01-R1.pdf

## Patrones buscados

- SOPORTES, SOPORTE, STD-PS, SUP-, SUPPORT
- BRIDA, VÁLVULA (fuera del BOM parseado)
- Referencias DW en texto embebido

## Hallazgos por PDF

## dms-703.pdf

- **Ruta:** `tests/fixtures/auto-takeoff-golden/dms-703.pdf`
- **Páginas:** 1
- **Texto embebido:** 3652 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** sí (línea 116)
- **Filas BOM parseadas:** 21
- **Candidatos soporte:** 4
- **Candidatos fuera de BOM:** 2
- **Observaciones:** Cabecera SOPORTES en línea 116. 2 fila(s) de soporte con formato tabular tras SOPORTES.

### Soportes

- **L116** (SOPORTES, post_soportes, header_only)
  - `SOPORTES`
  - Antes: `20 1.1/2" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938243	1` · `21 3/4" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938241	1`
  - Después: `22 STD-PS-050 (PSL)	SUP-001	1` · `PENDIENTE 1.1%`
  - Aparece en bloque posterior a SOPORTES. Solo cabecera de bloque; sin fila estructurada en la misma línea.
- **L117** (STD-PS, post_soportes, tab_row_support)
  - `22 STD-PS-050 (PSL)	SUP-001	1`
  - Antes: `21 3/4" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938241	1` · `SOPORTES`
  - Después: `PENDIENTE 1.1%` · `PARA CONT. VER LINEA NUM.`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L117** (SUP-, post_soportes, tab_row_support)
  - `22 STD-PS-050 (PSL)	SUP-001	1`
  - Antes: `21 3/4" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938241	1` · `SOPORTES`
  - Después: `PENDIENTE 1.1%` · `PARA CONT. VER LINEA NUM.`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L178** (SUP-, post_soportes, loose_text)
  - `SUP-001`
  - Antes: `F10 G17 B19` · `041`
  - Después: `VER DETALLE "R"` · `3`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.

### Fuera de BOM (manual)

- **L186** (BRIDA, post_soportes, loose_text)
  - `1.1/2" BRIDA CIEGA RF 1500 #`
  - Antes: `NOTA 29` · `TALADRO DE 3/4"`
  - Después: `HALF COUPLING 3/4"` · `3/4"-DMS`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.
- **L190** (BRIDA, post_soportes, loose_text)
  - `1.1/2" BRIDA SW 1500 #`
  - Antes: `3/4"-DMS` · `TUBERIA 3/4"`
  - Después: `DISCO CIEGO 1.1/2" CON TALADRO DE 3/4"` · `INOX 321 (SOLDAR AL DISTRIBUIDOR 3/4")`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.

## dms-704.pdf

- **Ruta:** `tests/fixtures/auto-takeoff-golden/dms-704.pdf`
- **Páginas:** 1
- **Texto embebido:** 3149 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 17
- **Candidatos soporte:** 1
- **Candidatos fuera de BOM:** 2
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido.

### Soportes

- **L39** (SOPORTES, bom, loose_text)
  - `NO NECESITA SOPORTES`
  - Antes: `A2` · `NOTAS : 1.- TODAS LAS COTAS SE COMPROBARÁN EN OBRA`
  - Después: `1601GB16A-REVAMPING DE PLATFORMING R-98` · `SR-01-A01-PL1 UNIDAD DE PLATFORMING`
  - Texto suelto; no sigue patrón tabular del parser.

### Fuera de BOM (manual)

- **L153** (BRIDA, bom, loose_text)
  - `1.1/2" BRIDA SW 1500 #`
  - Antes: `DETALLE "R"` · `TUBERIA 3/4"`
  - Después: `DISCO CIEGO 1.1/2" CON TALADRO DE 3/4"` · `INOX 321 (SOLDAR AL DISTRIBUIDOR 3/4")`
  - Mención dentro del bloque BOM (posible falso positivo manual). Texto suelto; no sigue patrón tabular del parser.
- **L167** (BRIDA, bom, loose_text)
  - `1.1/2" BRIDA CIEGA RF 1500 #`
  - Antes: `NOTA 29` · `TALADRO DE 3/4"`
  - Después: `HALF COUPLING 3/4"`
  - Mención dentro del bloque BOM (posible falso positivo manual). Texto suelto; no sigue patrón tabular del parser.

## hl-1289-01.pdf

- **Ruta:** `tests/fixtures/auto-takeoff-golden/hl-1289-01.pdf`
- **Páginas:** 1
- **Texto embebido:** 2116 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 11
- **Candidatos soporte:** 0
- **Candidatos fuera de BOM:** 0
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido. Sin candidatos fuera del BOM detectados por patrones.

### Soportes

_Ninguno._

### Fuera de BOM (manual)

_Ninguno._

## hl-1293-01.pdf

- **Ruta:** `tests/fixtures/auto-takeoff-golden/hl-1293-01.pdf`
- **Páginas:** 1
- **Texto embebido:** 2253 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 11
- **Candidatos soporte:** 3
- **Candidatos fuera de BOM:** 0
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido.

### Soportes

- **L132** (SUP-, bom, loose_text)
  - `SUP-001`
  - Antes: `PLANO Nº: 2301GB47G-C1-L-KP-1290-01` · `4X4"DN`
  - Después: `SOPORTE COMÚN CON LÍNEA: 2301GB47G-HL-1275 (SUP-001)` · `NA`
  - Texto suelto; no sigue patrón tabular del parser.
- **L133** (SOPORTE, bom, loose_text)
  - `SOPORTE COMÚN CON LÍNEA: 2301GB47G-HL-1275 (SUP-001)`
  - Antes: `4X4"DN` · `SUP-001`
  - Después: `NA` · `NA`
  - Texto suelto; no sigue patrón tabular del parser.
- **L133** (SUP-, bom, loose_text)
  - `SOPORTE COMÚN CON LÍNEA: 2301GB47G-HL-1275 (SUP-001)`
  - Antes: `4X4"DN` · `SUP-001`
  - Después: `NA` · `NA`
  - Texto suelto; no sigue patrón tabular del parser.

### Fuera de BOM (manual)

_Ninguno._

## dw-701.pdf

- **Ruta:** `tests/fixtures/auto-takeoff-golden/dw-701.pdf`
- **Páginas:** 1
- **Texto embebido:** 1574 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** sí (línea 73)
- **Filas BOM parseadas:** 2
- **Candidatos soporte:** 4
- **Candidatos fuera de BOM:** 5
- **Observaciones:** Cabecera SOPORTES en línea 73. 2 fila(s) de soporte con formato tabular tras SOPORTES.

### Soportes

- **L73** (SOPORTES, post_soportes, header_only)
  - `SOPORTES`
  - Antes: `1 1.1/2" SCH 80 TUBERIA EXT. PLANOS A.C. A-106 B	1000026994	8.4 M` · `2 1.1/2" CODO 90 SW 3000# A.C. A-105	1000030543	5`
  - Después: `3 STD-PS-051 (PSL) STD-PS-275 (PS) LISEGA 29D219 (SH-012) (SH)	SUP-001	1` · `CLASE:`
  - Aparece en bloque posterior a SOPORTES. Solo cabecera de bloque; sin fila estructurada en la misma línea.
- **L74** (STD-PS, post_soportes, tab_row_support)
  - `3 STD-PS-051 (PSL) STD-PS-275 (PS) LISEGA 29D219 (SH-012) (SH)	SUP-001	1`
  - Antes: `2 1.1/2" CODO 90 SW 3000# A.C. A-105	1000030543	5` · `SOPORTES`
  - Después: `CLASE:` · `C090AHT`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L74** (SUP-, post_soportes, tab_row_support)
  - `3 STD-PS-051 (PSL) STD-PS-275 (PS) LISEGA 29D219 (SH-012) (SH)	SUP-001	1`
  - Antes: `2 1.1/2" CODO 90 SW 3000# A.C. A-105	1000030543	5` · `SOPORTES`
  - Después: `CLASE:` · `C090AHT`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L98** (SUP-, post_soportes, loose_text)
  - `SUP-001`
  - Antes: `PLANO Nº: 1601GB16A-PL1-L-DW-702-01` · `1.1/2X1.1/2"DN`
  - Después: `Punto de Apoyo`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.

### Fuera de BOM (manual)

- **L61** (DW, bom, loose_text)
  - `1601GB16A-PL1-1.1/2"-DW-701-A010AA-N-01`
  - Antes: `EL=+104577` · `N`
  - Después: `1.02` · `3.50`
  - Mención dentro del bloque BOM (posible falso positivo manual). Texto suelto; no sigue patrón tabular del parser.
- **L69** (DW, bom, loose_text)
  - `1601GB16A-PL1-L-DW-701-01	2559-00-1`
  - Antes: `NO` · `A010AA`
  - Después: `1601GB16A-PL1-1.1/2"-DW-701-A010AA-N` · `1 1.1/2" SCH 80 TUBERIA EXT. PLANOS A.C. A-106 B	1000026994	8.4 M`
  - Mención dentro del bloque BOM (posible falso positivo manual). Texto suelto; no sigue patrón tabular del parser.
- **L70** (DW, bom, loose_text)
  - `1601GB16A-PL1-1.1/2"-DW-701-A010AA-N`
  - Antes: `A010AA` · `1601GB16A-PL1-L-DW-701-01	2559-00-1`
  - Después: `1 1.1/2" SCH 80 TUBERIA EXT. PLANOS A.C. A-106 B	1000026994	8.4 M` · `2 1.1/2" CODO 90 SW 3000# A.C. A-105	1000030543	5`
  - Mención dentro del bloque BOM (posible falso positivo manual). Texto suelto; no sigue patrón tabular del parser.
- **L95** (DW, post_soportes, loose_text)
  - `1601GB16A-PL1-1.1/2"-DW-702-A010AA-N`
  - Antes: `836` · `PARA CONT. VER LINEA NUM.`
  - Después: `PLANO Nº: 1601GB16A-PL1-L-DW-702-01` · `1.1/2X1.1/2"DN`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.
- **L96** (DW, post_soportes, loose_text)
  - `PLANO Nº: 1601GB16A-PL1-L-DW-702-01`
  - Antes: `PARA CONT. VER LINEA NUM.` · `1601GB16A-PL1-1.1/2"-DW-702-A010AA-N`
  - Después: `1.1/2X1.1/2"DN` · `SUP-001`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.

## 2301GB47G-C1-L-HL-1289-01.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1289-01.pdf`
- **Páginas:** 1
- **Texto embebido:** 2116 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 11
- **Candidatos soporte:** 0
- **Candidatos fuera de BOM:** 0
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido. Sin candidatos fuera del BOM detectados por patrones.

### Soportes

_Ninguno._

### Fuera de BOM (manual)

_Ninguno._

## 2301GB47G-C1-L-HL-1289-02.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1289-02.pdf`
- **Páginas:** 1
- **Texto embebido:** 1244 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 4
- **Candidatos soporte:** 0
- **Candidatos fuera de BOM:** 0
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido. Sin candidatos fuera del BOM detectados por patrones.

### Soportes

_Ninguno._

### Fuera de BOM (manual)

_Ninguno._

## 2301GB47G-C1-L-HL-1291-01.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-01.pdf`
- **Páginas:** 1
- **Texto embebido:** 2015 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 10
- **Candidatos soporte:** 0
- **Candidatos fuera de BOM:** 0
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido. Sin candidatos fuera del BOM detectados por patrones.

### Soportes

_Ninguno._

### Fuera de BOM (manual)

_Ninguno._

## 2301GB47G-C1-L-HL-1291-02.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-02.pdf`
- **Páginas:** 1
- **Texto embebido:** 1245 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 4
- **Candidatos soporte:** 0
- **Candidatos fuera de BOM:** 0
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido. Sin candidatos fuera del BOM detectados por patrones.

### Soportes

_Ninguno._

### Fuera de BOM (manual)

_Ninguno._

## 2301GB47G-C1-L-HL-1292-01.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1292-01.pdf`
- **Páginas:** 1
- **Texto embebido:** 2040 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 10
- **Candidatos soporte:** 0
- **Candidatos fuera de BOM:** 0
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido. Sin candidatos fuera del BOM detectados por patrones.

### Soportes

_Ninguno._

### Fuera de BOM (manual)

_Ninguno._

## 2301GB47G-C1-L-HL-1292-02.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1292-02.pdf`
- **Páginas:** 1
- **Texto embebido:** 1246 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 4
- **Candidatos soporte:** 0
- **Candidatos fuera de BOM:** 0
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido. Sin candidatos fuera del BOM detectados por patrones.

### Soportes

_Ninguno._

### Fuera de BOM (manual)

_Ninguno._

## 2301GB47G-C1-L-HL-1293-01.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1293-01.pdf`
- **Páginas:** 1
- **Texto embebido:** 2253 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 11
- **Candidatos soporte:** 3
- **Candidatos fuera de BOM:** 0
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido.

### Soportes

- **L132** (SUP-, bom, loose_text)
  - `SUP-001`
  - Antes: `PLANO Nº: 2301GB47G-C1-L-KP-1290-01` · `4X4"DN`
  - Después: `SOPORTE COMÚN CON LÍNEA: 2301GB47G-HL-1275 (SUP-001)` · `NA`
  - Texto suelto; no sigue patrón tabular del parser.
- **L133** (SOPORTE, bom, loose_text)
  - `SOPORTE COMÚN CON LÍNEA: 2301GB47G-HL-1275 (SUP-001)`
  - Antes: `4X4"DN` · `SUP-001`
  - Después: `NA` · `NA`
  - Texto suelto; no sigue patrón tabular del parser.
- **L133** (SUP-, bom, loose_text)
  - `SOPORTE COMÚN CON LÍNEA: 2301GB47G-HL-1275 (SUP-001)`
  - Antes: `4X4"DN` · `SUP-001`
  - Después: `NA` · `NA`
  - Texto suelto; no sigue patrón tabular del parser.

### Fuera de BOM (manual)

_Ninguno._

## 2301GB47G-C1-L-HL-1293-02.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1293-02.pdf`
- **Páginas:** 1
- **Texto embebido:** 1245 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 4
- **Candidatos soporte:** 0
- **Candidatos fuera de BOM:** 0
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido. Sin candidatos fuera del BOM detectados por patrones.

### Soportes

_Ninguno._

### Fuera de BOM (manual)

_Ninguno._

## 2301GB47G-C1-L-HL-1294-01.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1294-01.pdf`
- **Páginas:** 1
- **Texto embebido:** 2100 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** sí (línea 86)
- **Filas BOM parseadas:** 10
- **Candidatos soporte:** 4
- **Candidatos fuera de BOM:** 0
- **Observaciones:** Cabecera SOPORTES en línea 86. 2 fila(s) de soporte con formato tabular tras SOPORTES.

### Soportes

- **L86** (SOPORTES, post_soportes, header_only)
  - `SOPORTES`
  - Antes: `9 4" VALVULA COMPUERTA FUNDIDA C-1	1000069035	2` · `10 4" VALVULA RETENCION FUNDIDA R-1	1000070694	1`
  - Después: `11 STD-PS-053 (PSL)	SUP-002	1` · `4X4"DN`
  - Aparece en bloque posterior a SOPORTES. Solo cabecera de bloque; sin fila estructurada en la misma línea.
- **L87** (STD-PS, post_soportes, tab_row_support)
  - `11 STD-PS-053 (PSL)	SUP-002	1`
  - Antes: `10 4" VALVULA RETENCION FUNDIDA R-1	1000070694	1` · `SOPORTES`
  - Después: `4X4"DN` · `PARA CONT. VER LINEA NUM.`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L87** (SUP-, post_soportes, tab_row_support)
  - `11 STD-PS-053 (PSL)	SUP-002	1`
  - Antes: `10 4" VALVULA RETENCION FUNDIDA R-1	1000070694	1` · `SOPORTES`
  - Después: `4X4"DN` · `PARA CONT. VER LINEA NUM.`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L129** (SUP-, post_soportes, loose_text)
  - `SUP-002`
  - Antes: `NA` · `NA`
  - Después: `-- 1 of 1 --`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.

### Fuera de BOM (manual)

_Ninguno._

## Hoja de palilleo.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/Hoja de palilleo.pdf`
- **Páginas:** 1
- **Texto embebido:** 12 caracteres
- **BOM:** no
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 0
- **Candidatos soporte:** 0
- **Candidatos fuera de BOM:** 0
- **Observaciones:** Sin encabezado BOM reconocible. No se detectó cabecera SOPORTES en texto embebido. Sin candidatos fuera del BOM detectados por patrones.

### Soportes

_Ninguno._

### Fuera de BOM (manual)

_Ninguno._

## Isos trameados.pdf

- **Ruta:** `Ejemplos/Ejemplo 1/Isos trameados.pdf`
- **Páginas:** 9
- **Texto embebido:** 140 caracteres
- **BOM:** no
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 0
- **Candidatos soporte:** 0
- **Candidatos fuera de BOM:** 0
- **Observaciones:** Sin encabezado BOM reconocible. No se detectó cabecera SOPORTES en texto embebido. Sin candidatos fuera del BOM detectados por patrones.

### Soportes

_Ninguno._

### Fuera de BOM (manual)

_Ninguno._

## 1601GB16A-PL1-L-DMS-702-01-R03.pdf

- **Ruta:** `Ejemplos/Ejemplo 2/1601GB16A-PL1-L-DMS-702-01-R03.pdf`
- **Páginas:** 1
- **Texto embebido:** 3616 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** sí (línea 117)
- **Filas BOM parseadas:** 21
- **Candidatos soporte:** 4
- **Candidatos fuera de BOM:** 2
- **Observaciones:** Cabecera SOPORTES en línea 117. 2 fila(s) de soporte con formato tabular tras SOPORTES.

### Soportes

- **L117** (SOPORTES, post_soportes, header_only)
  - `SOPORTES`
  - Antes: `20 1.1/2" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938243	1` · `21 3/4" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938241	1`
  - Después: `22 STD-PS-050 (PSL)	SUP-001	1` · `PARA CONT. VER LINEA NUM.`
  - Aparece en bloque posterior a SOPORTES. Solo cabecera de bloque; sin fila estructurada en la misma línea.
- **L118** (STD-PS, post_soportes, tab_row_support)
  - `22 STD-PS-050 (PSL)	SUP-001	1`
  - Antes: `21 3/4" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938241	1` · `SOPORTES`
  - Después: `PARA CONT. VER LINEA NUM.` · `P-156-20"-CL371-INS`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L118** (SUP-, post_soportes, tab_row_support)
  - `22 STD-PS-050 (PSL)	SUP-001	1`
  - Antes: `21 3/4" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938241	1` · `SOPORTES`
  - Después: `PARA CONT. VER LINEA NUM.` · `P-156-20"-CL371-INS`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L174** (SUP-, post_soportes, loose_text)
  - `SUP-001`
  - Antes: `F10 G17 B19` · `TIEIN-040`
  - Después: `VER DETALLE "R"` · `3	3	3	3	3	3	3	3`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.

### Fuera de BOM (manual)

- **L183** (BRIDA, post_soportes, loose_text)
  - `1.1/2" BRIDA CIEGA RF 1500 #`
  - Antes: `NOTA 29` · `TALADRO DE 3/4"`
  - Después: `HALF COUPLING 3/4"` · `3/4"-DMS`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.
- **L187** (BRIDA, post_soportes, loose_text)
  - `1.1/2" BRIDA SW 1500 #`
  - Antes: `3/4"-DMS` · `TUBERIA 3/4"`
  - Después: `DISCO CIEGO 1.1/2" CON TALADRO DE 3/4"` · `INOX 321 (SOLDAR AL DISTRIBUIDOR 3/4")`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.

## 1601GB16A-PL1-L-DMS-703-01-R03.pdf

- **Ruta:** `Ejemplos/Ejemplo 2/1601GB16A-PL1-L-DMS-703-01-R03.pdf`
- **Páginas:** 1
- **Texto embebido:** 3652 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** sí (línea 116)
- **Filas BOM parseadas:** 21
- **Candidatos soporte:** 4
- **Candidatos fuera de BOM:** 2
- **Observaciones:** Cabecera SOPORTES en línea 116. 2 fila(s) de soporte con formato tabular tras SOPORTES.

### Soportes

- **L116** (SOPORTES, post_soportes, header_only)
  - `SOPORTES`
  - Antes: `20 1.1/2" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938243	1` · `21 3/4" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938241	1`
  - Después: `22 STD-PS-050 (PSL)	SUP-001	1` · `PENDIENTE 1.1%`
  - Aparece en bloque posterior a SOPORTES. Solo cabecera de bloque; sin fila estructurada en la misma línea.
- **L117** (STD-PS, post_soportes, tab_row_support)
  - `22 STD-PS-050 (PSL)	SUP-001	1`
  - Antes: `21 3/4" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938241	1` · `SOPORTES`
  - Después: `PENDIENTE 1.1%` · `PARA CONT. VER LINEA NUM.`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L117** (SUP-, post_soportes, tab_row_support)
  - `22 STD-PS-050 (PSL)	SUP-001	1`
  - Antes: `21 3/4" BRIDA CIEGA RF 1500# AA A-182 F11 ESP-1300-3 T>450ºC	1000938241	1` · `SOPORTES`
  - Después: `PENDIENTE 1.1%` · `PARA CONT. VER LINEA NUM.`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L178** (SUP-, post_soportes, loose_text)
  - `SUP-001`
  - Antes: `F10 G17 B19` · `041`
  - Después: `VER DETALLE "R"` · `3`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.

### Fuera de BOM (manual)

- **L186** (BRIDA, post_soportes, loose_text)
  - `1.1/2" BRIDA CIEGA RF 1500 #`
  - Antes: `NOTA 29` · `TALADRO DE 3/4"`
  - Después: `HALF COUPLING 3/4"` · `3/4"-DMS`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.
- **L190** (BRIDA, post_soportes, loose_text)
  - `1.1/2" BRIDA SW 1500 #`
  - Antes: `3/4"-DMS` · `TUBERIA 3/4"`
  - Después: `DISCO CIEGO 1.1/2" CON TALADRO DE 3/4"` · `INOX 321 (SOLDAR AL DISTRIBUIDOR 3/4")`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.

## 1601GB16A-PL1-L-DMS-704-01-R02.pdf

- **Ruta:** `Ejemplos/Ejemplo 2/1601GB16A-PL1-L-DMS-704-01-R02.pdf`
- **Páginas:** 1
- **Texto embebido:** 3149 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** no
- **Filas BOM parseadas:** 17
- **Candidatos soporte:** 1
- **Candidatos fuera de BOM:** 2
- **Observaciones:** No se detectó cabecera SOPORTES en texto embebido.

### Soportes

- **L39** (SOPORTES, bom, loose_text)
  - `NO NECESITA SOPORTES`
  - Antes: `A2` · `NOTAS : 1.- TODAS LAS COTAS SE COMPROBARÁN EN OBRA`
  - Después: `1601GB16A-REVAMPING DE PLATFORMING R-98` · `SR-01-A01-PL1 UNIDAD DE PLATFORMING`
  - Texto suelto; no sigue patrón tabular del parser.

### Fuera de BOM (manual)

- **L153** (BRIDA, bom, loose_text)
  - `1.1/2" BRIDA SW 1500 #`
  - Antes: `DETALLE "R"` · `TUBERIA 3/4"`
  - Después: `DISCO CIEGO 1.1/2" CON TALADRO DE 3/4"` · `INOX 321 (SOLDAR AL DISTRIBUIDOR 3/4")`
  - Mención dentro del bloque BOM (posible falso positivo manual). Texto suelto; no sigue patrón tabular del parser.
- **L167** (BRIDA, bom, loose_text)
  - `1.1/2" BRIDA CIEGA RF 1500 #`
  - Antes: `NOTA 29` · `TALADRO DE 3/4"`
  - Después: `HALF COUPLING 3/4"`
  - Mención dentro del bloque BOM (posible falso positivo manual). Texto suelto; no sigue patrón tabular del parser.

## 1601GB16A-PL1-L-DW-701-01-R1.pdf

- **Ruta:** `Ejemplos/Ejemplo 2/1601GB16A-PL1-L-DW-701-01-R1.pdf`
- **Páginas:** 1
- **Texto embebido:** 1574 caracteres
- **BOM:** RELACION_DE_MATERIALES, MATERIALES
- **Bloque SOPORTES:** sí (línea 73)
- **Filas BOM parseadas:** 2
- **Candidatos soporte:** 4
- **Candidatos fuera de BOM:** 5
- **Observaciones:** Cabecera SOPORTES en línea 73. 2 fila(s) de soporte con formato tabular tras SOPORTES.

### Soportes

- **L73** (SOPORTES, post_soportes, header_only)
  - `SOPORTES`
  - Antes: `1 1.1/2" SCH 80 TUBERIA EXT. PLANOS A.C. A-106 B	1000026994	8.4 M` · `2 1.1/2" CODO 90 SW 3000# A.C. A-105	1000030543	5`
  - Después: `3 STD-PS-051 (PSL) STD-PS-275 (PS) LISEGA 29D219 (SH-012) (SH)	SUP-001	1` · `CLASE:`
  - Aparece en bloque posterior a SOPORTES. Solo cabecera de bloque; sin fila estructurada en la misma línea.
- **L74** (STD-PS, post_soportes, tab_row_support)
  - `3 STD-PS-051 (PSL) STD-PS-275 (PS) LISEGA 29D219 (SH-012) (SH)	SUP-001	1`
  - Antes: `2 1.1/2" CODO 90 SW 3000# A.C. A-105	1000030543	5` · `SOPORTES`
  - Después: `CLASE:` · `C090AHT`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L74** (SUP-, post_soportes, tab_row_support)
  - `3 STD-PS-051 (PSL) STD-PS-275 (PS) LISEGA 29D219 (SH-012) (SH)	SUP-001	1`
  - Antes: `2 1.1/2" CODO 90 SW 3000# A.C. A-105	1000030543	5` · `SOPORTES`
  - Después: `CLASE:` · `C090AHT`
  - Aparece en bloque posterior a SOPORTES. Formato tabular tipo soporte (ítem + ref no SAP).
- **L98** (SUP-, post_soportes, loose_text)
  - `SUP-001`
  - Antes: `PLANO Nº: 1601GB16A-PL1-L-DW-702-01` · `1.1/2X1.1/2"DN`
  - Después: `Punto de Apoyo`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.

### Fuera de BOM (manual)

- **L61** (DW, bom, loose_text)
  - `1601GB16A-PL1-1.1/2"-DW-701-A010AA-N-01`
  - Antes: `EL=+104577` · `N`
  - Después: `1.02` · `3.50`
  - Mención dentro del bloque BOM (posible falso positivo manual). Texto suelto; no sigue patrón tabular del parser.
- **L69** (DW, bom, loose_text)
  - `1601GB16A-PL1-L-DW-701-01	2559-00-1`
  - Antes: `NO` · `A010AA`
  - Después: `1601GB16A-PL1-1.1/2"-DW-701-A010AA-N` · `1 1.1/2" SCH 80 TUBERIA EXT. PLANOS A.C. A-106 B	1000026994	8.4 M`
  - Mención dentro del bloque BOM (posible falso positivo manual). Texto suelto; no sigue patrón tabular del parser.
- **L70** (DW, bom, loose_text)
  - `1601GB16A-PL1-1.1/2"-DW-701-A010AA-N`
  - Antes: `A010AA` · `1601GB16A-PL1-L-DW-701-01	2559-00-1`
  - Después: `1 1.1/2" SCH 80 TUBERIA EXT. PLANOS A.C. A-106 B	1000026994	8.4 M` · `2 1.1/2" CODO 90 SW 3000# A.C. A-105	1000030543	5`
  - Mención dentro del bloque BOM (posible falso positivo manual). Texto suelto; no sigue patrón tabular del parser.
- **L95** (DW, post_soportes, loose_text)
  - `1601GB16A-PL1-1.1/2"-DW-702-A010AA-N`
  - Antes: `836` · `PARA CONT. VER LINEA NUM.`
  - Después: `PLANO Nº: 1601GB16A-PL1-L-DW-702-01` · `1.1/2X1.1/2"DN`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.
- **L96** (DW, post_soportes, loose_text)
  - `PLANO Nº: 1601GB16A-PL1-L-DW-702-01`
  - Antes: `PARA CONT. VER LINEA NUM.` · `1601GB16A-PL1-1.1/2"-DW-702-A010AA-N`
  - Después: `1.1/2X1.1/2"DN` · `SUP-001`
  - Aparece en bloque posterior a SOPORTES. Texto suelto; no sigue patrón tabular del parser.


## Patrones encontrados

| Patrón | Dónde aparece | Estructura | Parseable |
|--------|---------------|------------|-----------|
| SOPORTES + STD-PS / SUP- | DMS/HL tras BOM | Bloque tabular tras cabecera | **Sí** (mismo patrón que `SUPPORT_ROW_PATTERN`) |
| SOPORTE suelto | HL/DW en notas o leyendas | Texto suelto | No automático |
| BRIDA / VÁLVULA sin SAP | DW-701 cajetín o notas | Texto suelto / anotación | No fiable sin OCR espacial |
| BRIDA en BOM | DMS/HL | Ya en tabla BOM | N/A (no es fuera de BOM) |

## Riesgos de falso positivo

- Menciones de BRIDA/VÁLVULA **dentro** del BOM principal (filas SAP ya parseadas).
- Texto de cajetín, notas generales o simbología que repite palabras clave.
- Parser actual **corta en SOPORTES**; filas posteriores no entran al BOM aunque sean tabulares.

## Recomendación para Fase 16B

1. **Soportes DMS/HL (STD-PS, SUP-):** ampliar parser con bloque opt-in post-SOPORTES; confianza media; acción `review` hasta validar en más PDFs.
2. **Partidas DW (brida/válvula/soporte sin SAP):** **checklist manual** en asistente; no parsear automáticamente desde texto suelto.
3. **HL soporte genérico:** marcar como `review` manual si aparece solo como mención suelta tras SOPORTES.

_No modifica producto ni importación. Investigación con texto embebido únicamente._
