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

- Import selectivo con revisión.
- E2E del panel y comparación.
- Diff visual sugerencia ↔ línea emparejada.
- Benchmark con palillería cargada desde BOM de referencia.

---

## Comandos

```bash
npm run research:auto-takeoff -- ./ruta/plano.pdf
npm run verify:auto-takeoff          # tests puros del parser
npm run inspect:pdf -- ./ruta/plano.pdf    # diagnóstico general de texto embebido
```

## Archivos de esta fase

| Archivo | Rol |
|---------|-----|
| `scripts/research-auto-takeoff-from-pdf.ts` | CLI de investigación (14A) |
| `scripts/verify-auto-takeoff-parse.ts` | Verificación pura del parser (14B) |
| `lib/drawings/experimental-auto-takeoff-parse.ts` | Parser puro experimental |
| `lib/drawings/experimental-auto-takeoff-config.ts` | Permisos preview UI |
| `lib/actions/experimental-auto-takeoff.ts` | Server action (sin BD) |
| `lib/drawings/experimental-auto-takeoff-compare.ts` | Comparador puro (14C) |
| `components/drawings/drawing-experimental-auto-takeoff.tsx` | UI preview + comparación |
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
