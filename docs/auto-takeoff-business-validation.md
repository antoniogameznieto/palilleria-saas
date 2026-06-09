# Validación de negocio auto-takeoff — Fase 15C / 16B

## Metadatos

| Campo | Valor |
| --- | --- |
| Fecha | 2026-06-09 |
| Commit probado | `94a2b5c` |
| Comando | `npm run validate:auto-takeoff-business` |
| Business set | `tests/fixtures/auto-takeoff-business/business-set.json` |
| PDFs evaluados | 5 |

## Métricas agregadas

| Métrica | Valor |
| --- | --- |
| Filas esperadas de negocio (total) | 44 |
| Filas businessRequired | 40 |
| Matches businessRequired | 35 |
| Missing businessRequired | 5 |
| Extraídas no requeridas (BOM correcto) | 4 |
| Total filas extraídas | 64 |
| Filas útiles extraídas | 33 |
| **Recall de negocio (overall)** | **87.5%** |
| Recall desde BOM extraíble | 100.0% |
| **Utilidad de extracción** | **51.6%** |

### Delta Fase 16B (`includeSupportRows: true`)

| Métrica | 15C (solo BOM) | 16B (+ soportes tabulares) |
| --- | ---: | ---: |
| Recall negocio overall | 82.5% | **87.5%** |
| Matches businessRequired | 33/40 | **35/40** |
| support (categoría) | 0/5 | **2/5** |
| dms-703 recall negocio | 90.0% | **100.0%** |
| dw-701 recall negocio | 40.0% | **60.0%** |

Soportes recuperados: **SUP-001** en dms-703 y dw-701. Pendientes: menciones sueltas HL, DMS-704 sin bloque SOPORTES.

## Tabla por PDF

| ID | PDF | Required | Match BOM | Recall BOM | Recall negocio | Utilidad | BOM no útil | Fuera BOM | Estado |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| dms-703 | dms-703.pdf | 10 | 9/9 | 100.0% | 100.0% | 40.9% | 1 | 0 | recall negocio 100.0% |
| dms-704 | dms-704.pdf | 9 | 8/8 | 100.0% | 88.9% | 47.1% | 1 | 1 | recall negocio 88.9% |
| hl-1289-01 | hl-1289-01.pdf | 8 | 7/7 | 100.0% | 87.5% | 63.6% | 1 | 1 | recall negocio 87.5% |
| hl-1293-01 | hl-1293-01.pdf | 8 | 7/7 | 100.0% | 87.5% | 63.6% | 1 | 1 | recall negocio 87.5% |
| dw-701 | dw-701.pdf | 5 | 2/2 | 100.0% | 60.0% | 66.7% | 0 | 2 | recall negocio 60.0% |

## Categorías con buena cobertura (recall ≥ 90 %)

- **blind**: 100.0% (2/2)
- **bolt**: 100.0% (4/4)
- **fitting**: 100.0% (5/5)
- **gasket**: 100.0% (4/4)
- **pipe**: 100.0% (6/6)

## Categorías con mala cobertura (< 90 %)

- **flange**: 80.0% (4/5)
- **support**: 40.0% (2/5)
- **valve**: 88.9% (8/9)

## Qué parte de la palillería real no sale del BOM

- dms-704: STD-PS-050 (support)
- hl-1289-01: SOPORTE (support)
- hl-1293-01: SOPORTE (support)
- dw-701: BRIDA WN (flange)
- dw-701: VALVULA (valve)

### Misses desde BOM (businessRequired extraíble)

_Ninguno._

### Extraídas correctas pero no útiles como palillería final

- **dms-703**: 3/4" FIGURA 8 1500# RF AA A-387 GR11 CL1 ESP-1300-3 T>450ºC
- **dms-704**: 3/4" FIGURA 8 1500# RF AA A-387 GR11 CL1 ESP-1300-3 T>450ºC
- **hl-1289-01**: 4" FIGURA 8 150# RF AC A-516 60
- **hl-1293-01**: 4" FIGURA 8 150# RF AC A-516 60

## Conclusión

**Sirve como lista de materiales útil** y base de palillería asistida. Con **16B** los soportes tabulares post-SOPORTES entran como revisión; siguen fuera las **menciones sueltas**, **partidas DW manuales** y **exclusiones de oficina** (p. ej. FIGURA 8).

El golden estructural (15B) mide parsing BOM; esta fase mide **utilidad para palillería** con `includeSupportRows` activado en validación de negocio.

## Recomendación para Fase 15D

- Reglas opt-in para bloque SOPORTES y referencias no SAP.
- Marcar en UI filas «lista de materiales» vs «palillería sugerida» según categoría.
- Ampliar business-set con palillería manual real de oficina (no solo BOM).
- Gate de beta: recall BOM ≥ 95 % y utilidad ≥ 90 % en DMS/HL.

## Integración CI

Script **separado** en 15C (`validate:auto-takeoff-business`). No se añade a `verify:auto-takeoff` para no bloquear CI con criterio de negocio aún exploratorio. El golden estructural (15B) sigue en CI.
