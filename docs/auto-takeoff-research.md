# Investigación — extracción automática de palillería desde texto embebido

> **Fase 14A** — Diagnóstico experimental. Sin BD, sin OCR, sin integración productiva.  
> **Commit de referencia:** `7a52fca` (post Fase 13A).  
> **Herramienta:** `npm run research:auto-takeoff -- ./ruta/plano.pdf`

## Objetivo

Evaluar si los PDFs reales del dominio (planos isométricos con «RELACIÓN DE MATERIALES») permiten extraer líneas de palillería/takeoff desde **texto embebido**, como paso previo a una posible Fase 14B (UI de sugerencias / import asistido).

**Fuera de alcance 14A:** OCR, Tesseract, persistencia en BD, autoaplicar líneas, cambios en exports o flujo productivo.

## Enfoque técnico

| Aspecto | Detalle |
|---------|---------|
| Extracción de texto | `pdf-parse` (`PDFParse.getText`) — misma librería que detección de metadatos productiva |
| Parser | `lib/drawings/experimental-auto-takeoff-parse.ts` — conservador, sin inventar cantidades |
| Script CLI | `scripts/research-auto-takeoff-from-pdf.ts` |
| Secciones buscadas | `RELACIÓN DE MATERIALES`, `MATERIALES`, `BILL OF MATERIALS`, `MATERIAL LIST`, `BOM` |
| Normalización | Espacios rotos del PDF (`M ATERIALES` → `MATERIALES`, etc.) |

### Reglas del parser (conservador)

- Filas con patrón tabular: `ITEM + DESCRIPCIÓN + CÓDIGO_SAP + CANTIDAD [UNIDAD]`
- Código SAP: numérico (≥6 dígitos) o `-` (confianza menor)
- Cantidad obligatoria; enteros o decimales con `.` o `,`
- Unidad opcional (`M`, `UD`, etc.)
- Campos `null` si no hay confianza; filas rechazadas si score &lt; 0.45
- Fin de bloque en `SOPORTES` o tras 8 líneas sin patrón tras haber encontrado filas

### Campos tentativos por fila

| Campo | Origen en PDF |
|-------|----------------|
| `item` | Nº posición al inicio de línea |
| `reference` | Código SAP (columna intermedia) |
| `description` | Texto entre ítem y código SAP |
| `quantity` | Columna numérica antes de unidad |
| `unit` | `M`, `UD`, etc. si aparece |
| `confidence` | 0–1 según secuencia, SAP, descripción, unidad |

---

## Pruebas ejecutadas (2026-06-08)

Entorno: macOS local, Node 22, `pdf-parse` 2.4.5.

### 1. `1601GB16A-PL1-L-DMS-703-01-R03.pdf`

| Campo | Resultado |
|-------|-----------|
| **Ruta** | `storage/.../cmq5cxqwk000ho9i12qwjz667/1601GB16A-PL1-L-DMS-703-01-R03.pdf` |
| **Páginas** | 1 |
| **Texto embebido** | 3 652 caracteres — **útil** |
| **Sección BOM** | Sí — `RELACIÓN DE MATERIALES` + `CANT. DESCRIPCIÓN` |
| **Filas candidatas** | **21** (ítems 1–21) |
| **Confianza media** | 1.00 |
| **Precisión manual estimada** | **~95%** en materiales principales; ítem 22 (soportes) no incluido |

**Ejemplos detectados:**

| # | Referencia | Cant. | Unidad | Descripción (recorte) |
|---|------------|-------|--------|------------------------|
| 1 | 1000937601 | 0.2 | M | 1.1/2" SCH 160 TUBERIA EXT. PLANOS A.AL. A-335 P11… |
| 2 | 1000937596 | 2.4 | M | 3/4" SCH 160 TUBERIA EXT. PLANOS… |
| 11 | 1000938321 | 1 | — | 3/4" VALVULA COMPUERTA FORJADA C-238 |
| 14 | — | 1 | — | DISCO CIEGO TALADRADO (SAP `-`, conf. 0.9) |

**Limitaciones en este PDF:**

- Bloque `SOPORTES` (ítem 22 `STD-PS-050` / `SUP-001`) queda **fuera** por diseño del fin de bloque.
- Texto del isométrico (cotas, referencias cruzadas) mezclado en el extracto pero **no** parseado como filas.

---

### 2. `2301GB47G-C1-L-HL-1289-01.pdf`

| Campo | Resultado |
|-------|-----------|
| **Ruta** | `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1289-01.pdf` (mismo contenido en storage) |
| **Páginas** | 1 |
| **Texto embebido** | 2 116 caracteres — **útil** |
| **Sección BOM** | Sí — `RELACIÓN DE M ATERIALES` (normalizado a `MATERIALES`) |
| **Filas candidatas** | **11** (ítems 1–11) |
| **Confianza media** | 1.00 |
| **Precisión manual estimada** | **~100%** en la tabla de materiales |

**Ejemplos detectados:**

| # | Referencia | Cant. | Unidad | Descripción (recorte) |
|---|------------|-------|--------|------------------------|
| 1 | 1000027194 | 2.0 | M | 4" SCH 40 TUBERIA AC EXT. BISEL. A-106 B… |
| 6 | 1000043645 | 4 | — | 4" SCH 40 BRIDA WN RF 150# AC A-105… |
| 8 | 1000000767 | 32 | — | 5/8"x90mm ESPARRAGO+2 TUERCAS A.AL. B7/2H |
| 11 | 1000070694 | 1 | — | 4" VALVULA RETENCION FUNDIDA R-1 |

**Limitaciones:**

- Anotaciones del isométrico tras la tabla generan ruido en el texto bruto pero no producen filas falsas con el parser actual.

---

### 3. `1601GB16A-PL1-L-DMS-704-01-R02.pdf`

| Campo | Resultado |
|-------|-----------|
| **Ruta** | `storage/.../cmq5cxqwg000do9i1bee0fbti/1601GB16A-PL1-L-DMS-704-01-R02.pdf` |
| **Páginas** | 1 |
| **Texto embebido** | 3 149 caracteres — **útil** |
| **Sección BOM** | Sí — `RELACIÓN DE MATERIALES` |
| **Filas candidatas** | **17** (ítems 1–17) |
| **Confianza media** | 1.00 |
| **Precisión manual estimada** | **~95%** (misma familia DMS que 703) |

**Ejemplos detectados:**

| # | Referencia | Cant. | Unidad | Descripción (recorte) |
|---|------------|-------|--------|------------------------|
| 1 | 1000937596 | 1.0 | M | 3/4" SCH 160 TUBERIA EXT. PLANOS… |
| 7 | 1000938214 | 5 | — | 3/4" SCH 160 BRIDA SW RF 1500#… |
| 15 | 1000927008 | 12 | — | 3/4"x120mm ESPARRAGO+2 TUERCAS… |

---

## Resumen comparativo

| PDF | Texto útil | BOM encontrada | Filas | Precisión est. |
|-----|------------|----------------|-------|----------------|
| DMS-703-01-R03 | Sí | RELACIÓN DE MATERIALES | 21 | ~95% |
| HL-1289-01 | Sí | RELACIÓN DE MATERIALES | 11 | ~100% |
| DMS-704-01-R02 | Sí | RELACIÓN DE MATERIALES | 17 | ~95% |

**Observación:** Los tres PDFs probados son **vectoriales con capa de texto** (PDFCreator / CAD). El patrón tabular `ítem + descripción + SAP + cantidad` es consistente en la muestra.

---

## Limitaciones generales

1. **Orden de extracción:** `pdf-parse` devuelve texto en orden de lectura del PDF, no siempre igual al layout visual; en estos planos la tabla BOM sigue siendo parseable.
2. **PDFs escaneados:** Sin texto embebido → **no viable** con este enfoque (candidato a OCR/IA visual, distinto del OCR de cajetín).
3. **Soportes y bloques atípicos:** Filas bajo `SOPORTES` o sin código SAP numérico requieren reglas adicionales.
4. **Mapeo a modelo productivo:** El producto usa `reference`, `description`, `quantity`, `unit`, `length/width/height`, `notes`. Aquí solo se infieren los cuatro primeros; **no** hay tramos ni medidas de tubería del isométrico.
5. **Palillería ≠ BOM:** La relación de materiales es un **insumo fuerte** pero puede no coincidir 1:1 con la hoja de palillería final (agrupaciones, tramos, reglas de oficina).
6. **Falsos positivos potenciales:** En PDFs con formato distinto o texto sin tabuladores, el parser conservador devolverá 0 filas (preferible a inventar).
7. **Sin validación cruzada:** No se comparó aún con palillería manual existente en BD para estos planos.

---

## Conclusión de viabilidad

### Veredicto: **parcialmente viable** con texto embebido

En la muestra probada (planos REFINERÍA / isométricos con tabla «RELACIÓN DE MATERIALES» embebida), la extracción automática de **filas de materiales con cantidad y código SAP** es **factible y de alta precisión** sin OCR.

No es viable **como palillería completa automática** todavía porque:

- Falta validar más formatos de planta/ingeniería.
- PDFs sin texto embebido quedan fuera.
- Soportes, discos sin SAP y reglas de negocio de palillería no están cubiertos.
- Requiere **revisión humana** antes de cualquier import (igual que metadatos).

---

## Qué haría falta para Fase 14B

| Paso | Descripción |
|------|-------------|
| 1 | Ampliar benchmark a ≥10 PDFs (incl. escaneado, sin BOM, otras plantas) |
| 2 | Comparar filas extraídas vs palillería manual en BD (métricas precisión/recall) |
| 3 | UI **experimental** de sugerencias (sin auto-guardar): panel «Sugerencias desde PDF» |
| 4 | Mapeo explícito a `TakeoffCsvImportRowInput` + preview diff |
| 5 | Tests unitarios del parser (`experimental-auto-takeoff-parse.ts`) con fixtures de texto |
| 6 | Reglas para bloque `SOPORTES` y referencias no numéricas (opt-in, baja confianza) |
| 7 | Documentar en checklist que es **asistencia**, no sustituto de revisión |

---

## Riesgos antes de integrar en UI

| Riesgo | Mitigación propuesta |
|--------|----------------------|
| Falsa confianza del usuario | Copy «sugerencias no verificadas»; sin autoaplicar; flag experimental |
| Cantidades incorrectas en formatos nuevos | Parser conservador; umbral de confianza; revisión obligatoria |
| BOM ≠ palillería final | Mostrar como «materiales del plano», no «palillería lista» |
| PDF escaneado sin aviso | Detectar `characterCount` bajo y mensaje claro |
| Regresión en detección productiva | Módulo separado; no reutilizar `detection-apply` |

---

## Fase 14B — Preview experimental en UI (implementado)

### Alcance

| Incluido | Excluido |
|----------|----------|
| Server action `analyzeExperimentalAutoTakeoffAction` | Guardar en BD |
| Panel en pestaña **Automatización** del detalle de plano | Importar a palillería real |
| Tabla de sugerencias (ítem, ref., cant., ud., desc., conf.) | OCR / Tesseract |
| Avisos de preview y warnings del parser | Comparación automática con palillería existente |
| Contador de líneas reales ya en el plano | Autoaplicar / botón guardar |

### Permisos

- **Visible:** `owner`, `admin`, `engineer` (misma gate que editar palillería).
- **Oculto:** `viewer`.

### Ubicación UI

Detalle del plano → pestaña **Automatización** → bloque **«Palillería sugerida (experimental)»** (borde azul), encima del bloque OCR experimental si está habilitado.

### `data-testid`

- `experimental-auto-takeoff-section`
- `experimental-auto-takeoff-run`
- `experimental-auto-takeoff-results`

### Validación esperada (DMS-703)

- Engineer/owner ven el bloque y el botón «Analizar relación de materiales».
- Tras analizar: ~21 filas sugeridas, confianza media ~1.00.
- La palillería real en BD **no cambia** (solo lectura + preview).
- Viewer no ve el bloque.

### Pendiente post-14B

- ~~Comparación automática sugerencias vs palillería existente (diff).~~ → Fase 14C
- Import selectivo a palillería (fase posterior, con revisión).
- E2E del panel experimental.
- Ampliar benchmark de PDFs.

---

## Fase 14C — Comparación experimental con palillería existente (implementado)

### Alcance

| Incluido | Excluido |
|----------|----------|
| Helper `compareSuggestedTakeoffWithExisting` | Modificar palillería en BD |
| Estados por sugerencia: matched / missing / differentQuantity / uncertain | Import o autoaplicar |
| Resumen en action y UI con badges | Comparación fuzzy agresiva |
| Match conservador por referencia SAP o descripción fuerte | OCR |

### Estados de comparación

| Estado | Badge UI | Criterio conservador |
|--------|----------|-------------------|
| `matched` | Ya existe | Misma referencia (o descripción fuerte) + cantidad ≈ + unidades compatibles |
| `missing` | Falta | Sin coincidencia clara en palillería existente |
| `differentQuantity` | Cantidad distinta | Referencia/descripción coinciden pero cantidad fuera de tolerancia (±0,02) |
| `uncertain` | Dudoso | Baja confianza de sugerencia, múltiples candidatos o match débil |

### Matching

1. Prioridad **referencia SAP** normalizada (trim).
2. Sin referencia → **descripción normalizada** (min. 16 caracteres, igualdad o inclusión fuerte).
3. **Unidades** normalizadas (`M`→`m`, `UD`/`U`→`ud`).
4. **Cantidades** con tolerancia 0,02; coma/punto equivalentes.
5. Cada línea existente solo puede emparejarse una vez.

### UI

- Resumen: `21 sugeridas · X ya existen · Y faltan · Z distintas · W dudosas`
- Columna **Estado** en tabla con badges
- Aviso: «Comparación experimental. No guarda ni modifica la palillería.»
- `data-testid`: `experimental-auto-takeoff-comparison-summary`

### Resultado DMS-703 (entorno local, 2026-06-08)

Plano `cmq5cxqwk000ho9i12qwjz667` — `1601GB16A-PL1-L-DMS-703-01-R03.pdf`:

| Métrica | Valor |
|---------|-------|
| Sugerencias del PDF | **21** |
| Líneas reales en palillería | **8** (datos manuales de demo: `a1`, `a2`, `pieza 1`, etc.) |
| Ya existen (`matched`) | **0** |
| Faltan (`missing`) | **21** |
| Cantidad distinta | **0** |
| Dudosas | **0** |

**Interpretación:** la palillería manual del plano **no usa códigos SAP** de la relación de materiales; la comparación marca correctamente las 21 sugerencias como **Falta**. No indica que el PDF esté mal — indica que la palillería registrada no refleja el BOM embebido. Para validar matching positivo haría falta palillería cargada con referencias SAP o descripciones alineadas al PDF.

### Límites 14C

- No detecta duplicados dentro de la palillería existente.
- No compara por posición/ítem del plano.
- Descripciones parcialmente similares pero cortas → `missing` o `uncertain`, no `matched`.
- BOM ≠ palillería de oficina: faltantes pueden ser esperables.

### Pendiente post-14C

- ~~Import selectivo con revisión.~~ → Fase 14D
- E2E del panel, comparación e importación.
- Diff visual sugerencia ↔ línea emparejada.
- Benchmark con palillería cargada desde BOM de referencia.

---

## Fase 14D — Importación experimental seleccionada (implementado)

### Alcance

| Incluido | Excluido |
|----------|----------|
| `importExperimentalAutoTakeoffSuggestionsAction` | Autoimportar |
| Checkboxes solo en filas `missing` (por defecto todas las faltantes seleccionadas) | Importar `matched` / `uncertain` |
| Confirmación explícita antes de crear líneas | Cambios Prisma |
| Re-extracción del PDF en servidor al importar | OCR |
| Validación por `suggestionKey` (no payload libre) | Import masivo sin selección |
| Creación real de `DrawingTakeoffItem` | Modificar exports |
| Invalidación de `takeoffReviewedAt` + actividad `takeoff_items_imported` | |

### Seguridad anti-payload inventado

1. El cliente envía solo **`selectedSuggestionKeys`** (claves derivadas del análisis).
2. En importación el servidor **vuelve a leer el PDF**, parsea sugerencias y compara con palillería actual.
3. Solo se aceptan claves que sigan en estado **`missing`** tras esa re-validación.
4. Campos importados provienen de la fila **verificada en servidor**, no del JSON del cliente.
5. Límite: **200** líneas por operación; validación Zod (`takeoffCsvImportRowSchema`).

### Mapeo a palillería real

| Campo | Origen |
|-------|--------|
| `reference` | Código SAP de la sugerencia verificada |
| `description` | Descripción de la sugerencia |
| `quantity` | Cantidad parseada |
| `unit` | Unidad normalizada (puede ser null) |
| `notes` | «Importado desde extracción experimental de relación de materiales» |
| `length` / `width` / `height` | `null` |

### Invalidación de revisión

Igual que create/import CSV manual: `invalidateDrawingTakeoffReviewInTransaction` con razón `takeoff_changed` si `takeoffReviewedAt` estaba informado.

### UI

- Checkbox por fila importable (`missing` únicamente).
- Botón «Importar seleccionadas (experimental)» + `window.confirm`.
- Tras éxito: `router.refresh()` y mensaje de líneas reales creadas.
- `data-testid`: `experimental-auto-takeoff-import`, `experimental-auto-takeoff-select-row`, `experimental-auto-takeoff-selected-count`.

### Resultado DMS-703 (validación local, 2026-06-08)

Escenario: plano con 8 líneas manuales previas (`a1`, `a2`, …) y 21 sugerencias `missing`.

| Paso | Resultado |
|------|-----------|
| Análisis inicial | 21 faltantes |
| Importar 2 sugerencias SAP (`1000937601`, `1000937596`) | +2 líneas reales (total **10**) |
| Re-análisis | **2 matched**, **19 missing** (las importadas pasan a «Ya existe» por referencia SAP) |
| Importar solo 2 de 21 | Las otras **19 no se crean** |

### Riesgos / límites 14D

- Si el PDF cambia entre análisis e importación, claves pueden dejar de ser válidas (rechazo seguro).
- Match post-import usa referencia SAP; palillería manual sin SAP no empareja con sugerencias importadas por descripción sola.
- Sigue siendo experimental: revisión humana recomendada tras importar.
- Sin E2E automatizado de importación en esta fase (añadido en 14E).

---

## Fase 14E — Hardening y E2E (implementado)

### Límites de importación

| Regla | Comportamiento |
|-------|----------------|
| Máximo por operación | **200** líneas (`EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_MAX`) |
| Selección vacía | Error: *No se seleccionó ninguna sugerencia para importar.* |
| Claves duplicadas | **Rechazo explícito** (no deduplicación silenciosa) |
| Clave inventada / matched / ya en palillería | Error `invalidKeys` tras re-extraer PDF |
| Fila sin descripción o cantidad inválida | Error `invalidRow` (Zod `takeoffCsvImportRowSchema`) |
| Payload del cliente | Solo `selectedSuggestionKeys`; campos desde servidor |

Constantes: `EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS` en `experimental-auto-takeoff-import.ts`.

### Cobertura automatizada

| Capa | Qué cubre |
|------|-----------|
| `npm run verify:auto-takeoff` | Parser, comparador, keys, límites, clave inventada/duplicada/matched, fila inválida |
| `tests/e2e/experimental-auto-takeoff-import.spec.ts` | Análisis BOM → import 1 missing → línea real → invalidación revisión → re-análisis matched; viewer sin bloque |
| CI (`.github/workflows/ci.yml`) | `verify:auto-takeoff` + suite E2E completa |

### Fixture E2E

- PDF: `tests/fixtures/e2e-dms-703-bom.pdf` (texto embebido real, 21 sugerencias parseables).
- Plano seed: `seed-drawing-e2e-bom` con 1 línea SAP `1000937601` y `takeoffReviewedAt` fijado.
- Estado esperado tras análisis: **1 matched / 20 missing**; tras importar 1: **2 matched / 19 missing**.

### Seguridad

- **Viewer:** no ve `experimental-auto-takeoff-section` (permiso `canManageTakeoffItems`).
- **Clave inventada:** cubierta en `verify:auto-takeoff` (servidor re-valida contra PDF).

---

## Fase 14F — Importación asistida (implementado)

### UI — filtros y búsqueda

| Filtro | Valor |
|--------|-------|
| Todas | `all` |
| Faltan | `missing` |
| Ya existen | `matched` |
| Cantidad distinta | `differentQuantity` |
| Dudosas | `uncertain` |

- Búsqueda por referencia o descripción (normalizada).
- Contador: *Mostrando X de Y sugerencia(s)* (`experimental-auto-takeoff-filtered-count`).

Helpers puros: `lib/drawings/experimental-auto-takeoff-ui.ts`.

### Selección masiva controlada

- **Seleccionar faltantes visibles:** añade solo `missing` del resultado filtrado actual (no matched ni uncertain).
- **Deseleccionar todo:** limpia la selección.
- Tras un nuevo análisis: selección vacía por defecto (sin auto-seleccionar todas las faltantes).
- Checkboxes manuales solo en filas `missing`.

### Resumen previo e importación

Panel `experimental-auto-takeoff-import-preview` antes de importar:

- Número de líneas a crear.
- Totales por unidad (si cantidad parseable).
- Primeras 5 referencias/descripciones.
- Aviso de invalidación de revisión.

`window.confirm` repite el resumen ampliado. La validación servidor (14D/14E) no cambia.

### Feedback posterior

La action devuelve `takeoffReviewInvalidated`. La UI muestra:

- Líneas creadas (`importedCount`).
- Si se invalidó la revisión.
- Sugerencia de reanalizar o revisar palillería.

### Cobertura

- `verify:auto-takeoff`: filtros, selección visible, resumen previo.
- E2E: filtro Faltan, selección masiva, búsqueda por referencia, import 1, matched sin checkbox.

---

## Fase 14G — Asistente experimental (implementado)

### Flujo guiado

El bloque experimental se presenta como asistente de 4 pasos (`experimental-auto-takeoff-assistant`):

| Paso | Contenido |
|------|-----------|
| 1. Analizar | Botón de análisis + estado del plano |
| 2. Revisar | Filtros, búsqueda, tabla de sugerencias, métricas |
| 3. Seleccionar e importar | Selección masiva, impacto, preview, botón importar |
| 4. Revisar palillería | Mensaje final + enlace `#palilleria` |

### Estados del asistente (`data-status`)

| Estado | Cuándo |
|--------|--------|
| `not_analyzed` | Sin análisis |
| `analyzed` | Resultados listos, sin selección |
| `with_selection` | Hay sugerencias seleccionadas |
| `imported` | Importación exitosa |
| `requires_review` | Importación + revisión invalidada |

### Copy y métricas

- Descubrimiento: *La app ha encontrado X posibles líneas…*, *Y parecen nuevas*, *Z ya están en tu palillería*.
- Aviso: *Revisa antes de importar. No se importa nada automáticamente.*
- Métricas: sugeridas, nuevas, ya existentes, distintas, dudosas, seleccionadas.
- Bloque **Qué pasará al importar** (`experimental-auto-takeoff-import-impact`).
- Mensaje final: *Importación completada. Revisa la palillería antes de marcarla como revisada.*

Helpers: `resolveExperimentalAssistantStatus`, `buildExperimentalAssistantDiscoveryCopy`, etc. en `experimental-auto-takeoff-ui.ts`. Sin cambios en validación servidor.

---

## Fase 15A — benchmark ampliado

> **Commit de referencia:** `26ff027` (post Fase 14G).  
> **Herramienta:** `npm run benchmark:auto-takeoff -- <pdf|directorio> [...]`  
> **Informe completo:** [auto-takeoff-benchmark-results.md](./auto-takeoff-benchmark-results.md) (JSON: [auto-takeoff-benchmark-results.json](./auto-takeoff-benchmark-results.json))

Benchmark real del motor de extracción sobre **17 PDFs únicos** (Ejemplos 1/2 + job de prueba en storage), sin OCR, sin BD ni cambios de producto.

### Resumen agregado

| Métrica | Resultado |
|---------|-----------|
| PDFs analizados | **17** |
| Con texto embebido útil | **15** (88,2 %) |
| Con BOM / RELACIÓN DE MATERIALES detectable | **15** |
| Con ≥1 sugerencia | **15** |
| Total filas sugeridas | **134** |
| Errores de parseo | **0** |
| Confianza | **Alta en las 134 filas** (bucket ≥ 0,9) |
| Media filas/PDF con BOM | 8,93 |

### Conclusión

**Parcialmente viable para beta acotada** en PDFs vectoriales con BOM embebida, especialmente series **DMS** y **HL** (21 filas en DMS-702/703, 17 en DMS-704, 10–11 en HL-1289/1293, etc.).

### Limitaciones observadas

- **No viable** para hojas manuales o raster (`Hoja de palilleo.pdf`: 12 chars).
- **No viable** para isométricos sin BOM útil (`Isos trameados.pdf`: 140 chars en 9 páginas).
- **Extracción parcial** en algunos **DW** (p. ej. DW-701: 2 filas; DW-702: 2–3 filas) y en hojas detalle `-02` de HL (4 filas vs 10–11 en `-01`).

### Recomendación → Fase 15B

Golden set etiquetado (10–15 PDFs) con filas esperadas para medir **precisión real**, no solo cobertura. Beta interna limitada a planos que pasen preview con texto útil + sección BOM.

---

## Comandos

```bash
npm run research:auto-takeoff -- ./ruta/plano.pdf
npm run benchmark:auto-takeoff -- ./Ejemplos "./storage/.../job" --limit 30
npm run verify:auto-takeoff          # tests puros del parser + benchmark helpers
npm run inspect:pdf -- ./ruta/plano.pdf    # diagnóstico general de texto embebido
```

## Archivos de esta fase

| Archivo | Rol |
|---------|-----|
| `scripts/research-auto-takeoff-from-pdf.ts` | CLI de investigación (14A) |
| `scripts/benchmark-auto-takeoff.ts` | Benchmark ampliado multi-PDF (15A) |
| `lib/drawings/auto-takeoff-benchmark.ts` | Helpers puros de benchmark (15A) |
| `docs/auto-takeoff-benchmark-results.md` | Informe benchmark 15A |
| `scripts/verify-auto-takeoff-parse.ts` | Verificación parser + import (14B–14E) |
| `scripts/validate-14d-dms703-ui.ts` | Validación manual UI DMS-703 (local) |
| `tests/fixtures/e2e-dms-703-bom.pdf` | PDF BOM para E2E |
| `tests/e2e/experimental-auto-takeoff-import.spec.ts` | E2E import experimental (14E–14F) |
| `lib/drawings/experimental-auto-takeoff-ui.ts` | Filtros/selección/resumen UI (14F) |
| `lib/drawings/experimental-auto-takeoff-parse.ts` | Parser puro experimental |
| `lib/drawings/experimental-auto-takeoff-config.ts` | Permisos preview UI |
| `lib/actions/experimental-auto-takeoff.ts` | Analyze + import experimental |
| `lib/drawings/experimental-auto-takeoff-compare.ts` | Comparador puro (14C) |
| `lib/drawings/experimental-auto-takeoff-import.ts` | Validación/import keys (14D) |
| `components/drawings/drawing-experimental-auto-takeoff.tsx` | UI preview + comparación + import |
| `docs/auto-takeoff-research.md` | Este documento |

## Referencias

- [ocr-ai-research.md](./ocr-ai-research.md) — OCR cajetín cerrado como no productivo (distinto de este enfoque)
- [post-demo-backlog.md](./post-demo-backlog.md) — priorización post-demo
- Detección productiva actual: filename + texto embebido para **metadatos** (`lib/drawings/parse-pdf-text.ts`)

---

## Registro

| Fecha | Fase | PDFs probados | Resultado |
|-------|------|---------------|-----------|
| 2026-06-08 | 14A | DMS-703, HL-1289-01, DMS-704 | Parcialmente viable; 49 filas totales en 3 PDFs |
| 2026-06-08 | 14B | UI preview en Automatización | Sin persistencia; ~21 filas en DMS-703 |
| 2026-06-08 | 14C | Comparación vs palillería existente | DMS-703: 0 matched, 21 missing (palillería manual sin SAP) |
| 2026-06-08 | 14D | Importación seleccionada | DMS-703: 8→10 líneas; import 2 → 2 matched, 19 missing |
| 2026-06-09 | 14E | Hardening + E2E | Límites 200/duplicados; E2E seed BOM; verify + CI |
| 2026-06-09 | 14F | Importación asistida | Filtros, selección visible, resumen previo, feedback |
| 2026-06-09 | 14G | Asistente experimental | 4 pasos, estados, métricas, copy guiado |
| 2026-06-09 | 15A | Benchmark 17 PDFs (Ejemplos + storage) | 15 con BOM, 134 filas, 0 errores; beta acotada viable en DMS/HL |
