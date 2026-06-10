# Fase 18B — Modelo técnico de trameado / palilleo por segmentos

> **Estado:** implementado en backend (Prisma, validaciones, actions). Sin UI en 18B.  
> **Prerrequisito:** [trameado-functional-analysis.md](./trameado-functional-analysis.md), [trameado-mvp-proposal.md](./trameado-mvp-proposal.md).

## Objetivo

Persistir tramos de palilleo/trameado **separados de `DrawingTakeoffItem`**, alineados con la hoja real del cliente (ISO, Nº, Ø, SCH., PALILLO, COLADA).

## Entidades Prisma

### `DrawingTrameadoSheet`

Hoja lógica por plano / identificador ISO. Un `Drawing` puede tener **varias** hojas (p. ej. variantes `-01`/`-02` o revisiones).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | cuid | PK |
| `companyId` | FK | Tenancy |
| `jobId` | FK | Consultas por trabajo |
| `drawingId` | FK | Plano origen |
| `lineIdentifier` | String | ISO / línea (`HL-1291-A012AA-N-01`) |
| `lineClass` | String? | CLASE (`A012AA`) |
| `notes` | String? | Observaciones de hoja |
| `reviewedAt` | DateTime? | Revisión humana |
| `reviewedById` | FK User? | Quién revisó |
| `createdAt` / `updatedAt` | DateTime | Auditoría |

### `DrawingTrameadoSegment`

Fila de palillo dentro de una hoja.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | cuid | PK |
| `companyId`, `jobId`, `drawingId` | FK | Denormalizado para tenancy/índices (patrón takeoff) |
| `sheetId` | FK | Hoja padre |
| `segmentNumber` | String | Número normalizado (`1`, `2`…) |
| `segmentLabel` | String? | Etiqueta opcional (`Tramo A`) |
| `diameter` | String | Ø (`4"`) |
| `schedule` | String | SCH. (`40`) |
| `palilloLength` | Decimal(12,3) | Longitud de corte |
| `lengthUnit` | `LengthUnit` | Default `mm` |
| `heatNumber` | String? | COLADA |
| `sourcePage` | Int? | Página del PDF |
| `sourceMark` | String? | Referencia visual |
| `notes` | String? | Observaciones |
| `sortOrder` | Int | Orden en hoja |
| `createdAt` / `updatedAt` | DateTime | Auditoría |

## Relaciones

```
Company ──< DrawingTrameadoSheet ──< DrawingTrameadoSegment
Job     ──<        │                        │
Drawing ──<        │                        │
User    ──< reviewedBy (sheet)
```

- **Cascade** al borrar `Drawing`, `Job` o `Company`.
- Borrar `DrawingTrameadoSheet` elimina sus segmentos.

## Por qué no reutilizar `DrawingTakeoffItem`

| | Takeoff (BOM) | Trameado |
|---|---------------|----------|
| Unidad | Ítem material SAP | Tramo fabricable |
| Campo clave | `reference`, `quantity`, `description` | `segmentNumber`, `palilloLength`, `diameter`, `schedule` |
| Agrupación | Por plano | Por `lineIdentifier` (ISO) + `sortOrder` |
| Export | CSV takeoff job | Hoja palilleo (ISO, Nº, PALILLO…) |

`PipeSegment` (schema legacy) permanece sin uso productivo; el modelo activo es **DrawingTrameadoSheet/Segment** con jerarquía sheet → segment.

## Permisos

| Rol | Crear/editar/borrar | Leer |
|-----|---------------------|------|
| owner, admin, engineer | Sí | Sí |
| viewer | No | Sí |

Implementación: `lib/permissions/trameado.ts` — `canManageTrameado`, `canViewTrameado`, helpers de acceso por sheet/segment.

## Validaciones (Zod)

Archivo: `lib/validations/trameado.ts`

- Sheet: `lineIdentifier` obligatorio; `lineClass`, `notes` opcionales.
- Segment: `segmentNumber`, `diameter`, `schedule`, `palilloLength > 0`; `lengthUnit` default `mm`; `heatNumber`, `sourcePage`, `sourceMark`, `notes` opcionales.
- Protección CSV formula injection en campos de texto.

## Helpers de formato

| Archivo | Funciones |
|---------|-----------|
| `lib/trameado/format.ts` | `formatPalilloLength`, `formatSegmentLabel`, `normalizeDiameter`, `normalizeSchedule`, `normalizeSegmentNumber` |
| `lib/trameado/labels.ts` | Columnas export hoja cliente (ISO, CLASE, Nº, Ø, SCH., PALILLO, COLADA) |

## Server actions

Archivo: `lib/actions/trameado.ts`

| Action | Descripción |
|--------|-------------|
| `createTrameadoSheetAction` | Crea hoja en un plano |
| `updateTrameadoSheetAction` | Actualiza metadatos de hoja |
| `deleteTrameadoSheetAction` | Elimina hoja y segmentos |
| `createTrameadoSegmentAction` | Añade tramo; auto `sortOrder`; invalida revisión |
| `updateTrameadoSegmentAction` | Edita tramo; invalida revisión |
| `deleteTrameadoSegmentAction` | Elimina tramo; invalida revisión |
| `markTrameadoSheetReviewedAction` | Marca hoja revisada (requiere ≥1 tramo) |

## Verificación

```bash
npm run verify:trameado
```

Script: `scripts/verify-trameado-model.ts` — validaciones Zod + helpers de formato + export CSV.

## Migración

Nombre: `add_drawing_trameado`  
Tablas: `DrawingTrameadoSheet`, `DrawingTrameadoSegment`.

## Futuras pantallas (18C+)

| Pantalla | Fase |
|----------|------|
| Paso Trameado en detalle de plano (PDF + tabla) | 18C ✅ |
| Export CSV hoja cliente | 18D ✅ |
| Export Excel básico hoja cliente | 18G ✅ |
| Asistente BOM/metadatos | 18I-A ✅ |
| Panel cotas candidatas | 18K-A ✅ |
| Tramo asistido desde cota | 18K-B ✅ |
| Export Excel formateado / PDF plantilla | posterior |
| Hints desde BOM (Ø, SCH.) | 18E |
| Anotaciones iso trameado | 18F |

## Export CSV (18D)

**Ruta:** `GET /api/files/trameado/[sheetId]/csv`  
**Helper:** `lib/trameado/export-csv.ts`

| Columna CSV | Origen |
|-------------|--------|
| ISO | `sheet.lineIdentifier` |
| CLASE | `sheet.lineClass` |
| Nº | `segment.segmentLabel` o `<n>` desde `segmentNumber` |
| Ø | `segment.diameter` |
| SCH. | `segment.schedule` |
| PALILLO | `segment.palilloLength` (mm, sin ceros finales) |
| COLADA | `segment.heatNumber` |

- UTF-8 con BOM (`\uFEFF`) para Excel.
- Separador `,` (mismo criterio que exports takeoff).
- Escape de celdas + `protectCsvExportCell` anti formula-injection.
- Orden: `sortOrder`, luego `segmentNumber`.
- Nombre archivo: `trameado-{drawingNumber}-{lineIdentifier}.csv` (sanitizado).
- Permisos: cualquier rol con acceso de lectura al plano (owner/admin/engineer/viewer); 401 sin sesión; 403 cross-tenant.
- No exige hoja revisada; UI muestra aviso «Hoja pendiente de revisión» si aplica.

**UI:** botón «Exportar CSV» en pestaña Trameado (`ExportTrameadoCsvButton`); visible con ≥1 tramo; viewer puede descargar.

**Verificación:** `verifyCsvExport()` en `scripts/verify-trameado-model.ts`.

## Export XLSX (18G)

**Ruta:** `GET /api/files/trameado/[sheetId]/xlsx`  
**Helper:** `lib/trameado/export-xlsx.ts`  
**Librería:** `exceljs` (misma que export takeoff del trabajo).

| Columna | Origen |
|---------|--------|
| ISO | `sheet.lineIdentifier` |
| CLASE | `sheet.lineClass` |
| Nº | `segment.segmentLabel` o `<n>` desde `segmentNumber` |
| Ø | `segment.diameter` |
| SCH. | `segment.schedule` |
| PALILLO | `segment.palilloLength` (número, mm) |
| COLADA | `segment.heatNumber` |

- Reutiliza orden, etiquetas Nº, nombre de archivo y `protectSpreadsheetExportText` del export CSV.
- Hoja Excel: «Hoja de palilleo»; cabecera en negrita; anchos de columna; fila 1 congelada; autofiltro.
- Nombre archivo: `trameado-{drawingNumber}-{lineIdentifier}.xlsx` (sanitizado); fallback `hoja-palilleo-{lineIdentifier}.xlsx`.
- Permisos: idénticos al CSV (401/403/400 sin tramos).
- CSV existente sin cambios.

**UI:** botones «Exportar CSV» y «Exportar Excel» en cabecera del panel hoja (`ExportTrameadoCsvButton`); visible con ≥1 tramo; viewer puede descargar; aviso si pendiente de revisión.

**Verificación:** `verifyXlsxExport()` en `scripts/verify-trameado-model.ts`.

## Asistente BOM/metadatos (18I-A)

**Helper:** `lib/trameado/suggestions.ts`  
**Action:** `createSuggestedTrameadoSheetsAction` en `lib/actions/trameado.ts`  
**UI:** `TrameadoSheetAssistant` en pestaña Trameado (solo engineer+).

| Automatiza | No automatiza |
|------------|---------------|
| Sugerir ISO desde metadatos | Tramos `<n>` |
| Derivar CLASE de identificador HL | Longitudes PALILLO |
| Sugerir Ø/SCH desde BOM takeoff | Lectura marcas azules / OCR |
| Precrear hojas vacías (sin segmentos) | Duplicar hojas existentes |
| Pareja `-02` con base documentada | Pareja a ciegas |

- Notas de hoja incluyen hint `Asistente BOM/metadatos · Ø … · SCH …`.
- Permisos: owner/admin/engineer; viewer no ve CTA.
- Dedupe por `lineIdentifier` existente en el drawing.

**Verificación:** `verifySheetSuggestions()` en `scripts/verify-trameado-model.ts`.

## Panel cotas candidatas (18K-A)

**Helper:** `lib/trameado/candidate-dimensions.ts`  
**Loader server:** `lib/trameado/load-candidate-dimensions.ts` (lee PDF vía `extractDrawingPdfTextForDetection`; sin persistir en BD)  
**UI:** `TrameadoCandidateDimensionsPanel` — columna izquierda del workspace Trameado, bajo el visor PDF.

| Automatiza | No automatiza |
|------------|---------------|
| Listar cotas candidatas filtradas del texto embebido | Crear tramos / segmentos |
| Copiar valor al portapapeles | Auto-PALILLO |
| Rellenar campo PALILLO del formulario (engineer) | Posición X/Y espacial |
| Avisos de confianza / texto insuficiente | Lectura golden escaneado |

- Extracción en server component (`DrawingDetailPage`); resultado serializado al cliente.
- Filtros: SAP, fechas, presiones/temperaturas, coordenadas E/N/EL, cantidades BOM, SCH 40/80, 3000#, espárragos, números HL de línea/plano.
- Límite por defecto: 24 cotas (`DEFAULT_MAX_CANDIDATE_DIMENSIONS`).
- Permisos: viewer ve panel y copia; engineer además «Usar en PALILLO».

**Verificación:** `verifyCandidateDimensions()` en `scripts/verify-trameado-model.ts`.

## Tramo asistido desde cota (18K-B)

**UI:** botón **Preparar tramo** en `TrameadoCandidateDimensionsPanel`; estado `TrameadoAssistedSegmentDraft` en `TrameadoSection`.

| Automatiza | No automatiza |
|------------|---------------|
| Abrir formulario create con PALILLO desde cota | Guardar segmento en BD |
| Sugerir Nº siguiente (`getNextSegmentNumber`) | Auto-confirmar tramo |
| Mantener Ø/SCH/COLADA sticky (18E) | Crear tramo al pulsar cota |
| Aviso contextual + foco en campo pendiente | Acciones para viewer |

- Sin hoja activa: botón deshabilitado + aviso «Crea o selecciona una hoja…».
- Submit del formulario asistido: **Confirmar tramo** (misma action create existente).
- Aviso desaparece al guardar, cancelar o preparar otra cota.

## Validación orientativa de hoja (18O-B)

**Helper:** `validateTrameadoSheet` en `lib/trameado/sheet-validation.ts`.

| Entrada | Uso |
|---------|-----|
| Segmentos confirmados de la hoja | Σ PALILLO, duplicados, PALILLO inválidos |
| Takeoff/BOM del plano | Referencia tubería en metros (`TUBERIA` / `PIPE` / `TUBO` + unidad M) |

**Estados:** `no_data`, `incomplete`, `no_comparable`, `review_data`, `review_delta`, `review_delta_high`, `reasonable`.

**UI:** `TrameadoSheetValidationPanel` en `TrameadoSection`; aviso opcional en `TrameadoReviewButton` si hay revisión pendiente.

**No bloquea** export CSV/XLSX ni marcar revisada.

## Marcado manual del isométrico (18O-C / 18O-D)

**Helper:** `lib/trameado/pdf-annotations.ts` — tipos y resumen marcado/pendiente.

**UI:** overlay en `TrameadoPdfPanel`; panel `TrameadoIsoMarkingPanel`; acción en `TrameadoSegmentsTable`.

**Modelo (18O-D):** `DrawingTrameadoAnnotation` — `segmentId` unique (máx. 1 marca por tramo).

| Campo | Tipo | Notas |
|-------|------|-------|
| sheetId, segmentId | FK | segment → cascade on delete |
| type | `point` \| `rect` | enum Prisma |
| x, y, width?, height? | Float | coords relativas 0–1 |
| segmentLabel | String? | snapshot etiqueta |
| createdById | FK User | engineer al guardar |

**Actions:** `upsertTrameadoAnnotationAction` (reemplazo por tramo), `deleteTrameadoAnnotationAction`.

**Validación:** `lib/validations/trameado.ts` → `trameadoAnnotationFormSchema`.

**Coordenadas:** relativas al contenedor del visor (0–1), no espacio PDF.

## Exportar PDF marcado (18O-E)

**Helper:** `lib/trameado/export-marked-pdf.ts` — `buildMarkedTrameadoPdf`, mapeo visor → página PDF (`pdf-lib`).

**API:** `GET /api/files/trameado/[sheetId]/marked-pdf` — requiere ≥1 `DrawingTrameadoAnnotation`.

**UI:** `ExportTrameadoMarkedPdfButton` — **Exportar PDF marcado**; viewer puede descargar.

**Limitación:** colocación aproximada; no coordenadas PDF/CAD reales.

**18O-E2:** `MARKED_PDF_MIN_SIZES` + `resolveMarkedPdfRenderStyle` — marcas/etiquetas más legibles, leader line, halo.

## Paquete de entrega ZIP (18O-F)

**Helper:** `lib/trameado/export-package.ts` — `buildTrameadoDeliveryPackage`, `buildTrameadoValidationSummaryText`, `buildTrameadoPackageFileName` (`jszip`).

**API:** `GET /api/files/trameado/[sheetId]/package` — requiere ≥1 tramo; reutiliza `buildTrameadoXlsxBuffer`, `buildMarkedTrameadoPdf` (si hay anotaciones) y `validateTrameadoSheet`.

**Entradas ZIP:**

| Archivo | Condición |
|---------|-----------|
| `hoja-palilleo.xlsx` | Siempre (con tramos) |
| `iso-marcado.pdf` | Solo si hay `DrawingTrameadoAnnotation` |
| `resumen-validacion.txt` / `.json` | Siempre |

**UI:** `ExportTrameadoPackageButton` — **Descargar paquete**; viewer puede descargar con tramos.

**Limitación:** entregable supervisado; validación orientativa en resumen, no bloqueante.

## Archivos tocados en 18B

- `prisma/schema.prisma`
- `prisma/migrations/*_add_drawing_trameado/`
- `lib/validations/trameado.ts`
- `lib/trameado/format.ts`, `labels.ts`, `scope.ts`
- `lib/permissions/trameado.ts`
- `lib/actions/trameado.ts`
- `scripts/verify-trameado-model.ts`
- `package.json` (`verify:trameado`)

**No tocado:** parser BOM, beta auto-takeoff, UI, exports takeoff existentes, wizard backup.
