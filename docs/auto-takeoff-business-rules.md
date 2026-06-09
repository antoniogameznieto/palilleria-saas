# Reglas de negocio auto-takeoff — Fase 15D

## Metadatos

| Campo | Valor |
| --- | --- |
| Fecha | 2026-06-09 |
| Commit probado | `bb966f8` |
| Comando | `npm run validate:auto-takeoff-business-rules` |
| Business set | `tests/fixtures/auto-takeoff-business/business-set.json` |
| PDFs evaluados | 5 |

## Reglas aplicadas

| ID | Patrones | Categoría | Acción |
| --- | --- | --- | --- |
| exclusion-spacer | FIGURA 8, FIG. 8, ESPACIADOR, PADDLE SPACER | exclusion | exclude |
| support | SOPORTE, STD-PS, SUP- | support | review |
| pipe | TUBERIA, PIPE | pipe | include |
| valve | VALVULA, VÁLVULA | valve | include |
| flange | BRIDA | flange | include |
| fitting | CODO, TE, REDUCCION, RED EXC, CAP, TAPON, COUPLING | fitting | include |
| bolt | ESPARRAGO, TORNILLO, TUERCA | bolt | include |
| gasket | JUNTA | gasket | include |
| blind | DISCO CIEGO, BRIDA CIEGA | blind | include/review |

Orden de evaluación: exclusiones → soportes → ciegos → tubería → válvulas → bridas → accesorios → fijación → juntas → desconocido (review).

## Métricas agregadas

| Métrica | Valor |
| --- | --- |
| Total sugerencias | 62 |
| **include** | **57** |
| **review** | **1** |
| **exclude** | **4** |
| Utilidad antes (útiles / total extraído) | 53.2% |
| Utilidad después (útiles / propuesta include) | 100.0% |
| Acciones etiquetadas (subset business) | 37 |
| Aciertos de acción | 36 |
| Falsos include | 0 |
| Falsos exclude | 0 |
| Ratio propuesta (include/total) | 91.9% |

## Tabla por PDF

| ID | Sugeridas | include | review | exclude | Utilidad antes | Utilidad después | FP include | FP exclude |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| dms-703 | 21 | 19 | 1 | 1 | 42.9% | 100.0% | 0 | 0 |
| dms-704 | 17 | 16 | 0 | 1 | 47.1% | 100.0% | 0 | 0 |
| hl-1289-01 | 11 | 10 | 0 | 1 | 63.6% | 100.0% | 0 | 0 |
| hl-1293-01 | 11 | 10 | 0 | 1 | 63.6% | 100.0% | 0 | 0 |
| dw-701 | 2 | 2 | 0 | 0 | 100.0% | 100.0% | 0 | 0 |

## Categorías detectadas

- **pipe**: 6
- **flange**: 5
- **valve**: 10
- **fitting**: 18
- **bolt**: 8
- **gasket**: 6
- **blind**: 5
- **exclusion**: 4

## Ejemplos include

- **include** / pipe / high: 1.1/2" SCH 160 TUBERIA EXT. PLANOS A.AL. A-335 P11 ESP-1 — Tubería principal; incluir en propuesta de palillería
- **include** / pipe / high: 3/4" SCH 160 TUBERIA EXT. PLANOS A.AL. A-335 P11 ESP-130 — Tubería principal; incluir en propuesta de palillería
- **include** / fitting / high: 1.1/2" HALF COUPLING SW 6000# A.AL. A-182 F11 ESP-1300-3 — Accesorio de línea; incluir en propuesta de palillería
- **include** / fitting / high: 3/4" TE SW 6000# A.AL. A-182 F11 ESP-1300-3 T>450ºC — Accesorio de línea; incluir en propuesta de palillería
- **include** / fitting / high: 3/4" HALF COUPLING SW 6000# A.AL. A-182 F11 ESP-1300-3 T — Accesorio de línea; incluir en propuesta de palillería
- **include** / fitting / high: 3/4" CODO 90 SW 6000# A.AL. A-182 F11 ESP-1300-3 T>450ºC — Accesorio de línea; incluir en propuesta de palillería

## Ejemplos exclude / review

- **exclude** / exclusion / high: 3/4" FIGURA 8 1500# RF AA A-387 GR11 CL1 ESP-1300-3 T>45 — Elemento BOM no requerido como palillería final según business set
- **review** / blind / medium: DISCO CIEGO TALADRADO — Disco o brida ciega sin referencia SAP; revisar antes de incluir
- **exclude** / exclusion / high: 3/4" FIGURA 8 1500# RF AA A-387 GR11 CL1 ESP-1300-3 T>45 — Elemento BOM no requerido como palillería final según business set
- **exclude** / exclusion / high: 4" FIGURA 8 150# RF AC A-516 60 — Elemento BOM no requerido como palillería final según business set
- **exclude** / exclusion / high: 4" FIGURA 8 150# RF AC A-516 60 — Elemento BOM no requerido como palillería final según business set

## Falsos positivos / negativos

- **Falsos include:** sugerencia con acción `include` frente a `businessRequired: false` en business set (0).
- **Falsos exclude:** sugerencia excluida frente a `businessRequired: true` extraíble (0).

## Qué queda fuera del BOM

Sin cambios respecto a 15C: soportes `STD-PS-050`, partidas manuales DW (brida, válvula, soporte) y bloque `SOPORTES` no parseado. Las reglas de soporte quedan preparadas para cuando aparezcan en extracción.

## Conclusión

Las reglas elevan la **utilidad de propuesta** al excluir automáticamente exclusiones de oficina (FIGURA 8) y marcar ciegos sin SAP para revisión. El BOM sigue siendo la fuente; la capa de reglas acerca la salida a **palillería asistida**, no a palillería final automática.

## Recomendación para Fase 15E

- Exponer `businessAction` y `businessCategory` en el preview experimental (sin import automático).
- Añadir reglas configurables por empresa y gate opcional en CI cuando el business set crezca.
- Integrar partidas `outside_bom` como sugerencias `review` manuales en el asistente.
