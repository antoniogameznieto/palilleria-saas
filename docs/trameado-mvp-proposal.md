# Fase 18A — Propuesta MVP de trameado / hoja de palilleo

> **Estado:** propuesta preliminar para validación interna y con cliente.  
> **Prerrequisito:** [trameado-functional-analysis.md](./trameado-functional-analysis.md).  
> **Sin implementación** en esta fase.

## 1. Objetivo del MVP

Permitir que un ingeniero **digitalice la hoja de palilleo** que hoy rellena a mano: por cada plano/ISO, definir tramos numerados (`<1>`, `<2>`, …) con diámetro, schedule y longitud de corte, y **exportar** una tabla equivalente a `Hoja de palilleo.pdf`.

### Input / output del flujo real

| Etapa | Artefacto |
|-------|-----------|
| **Input** | PDF isométrico vectorial original (`2301GB47G-C1-L-HL-xxxx-01/-02`) |
| **Output** | Hoja de palilleo (CSV/XLSX) + iso trameado (marcas `<n>` — futuro) |
| **Referencia (no input)** | `Isos trameados.pdf`, `Hoja de palilleo.pdf` escaneados |

El MVP **no** intenta leer marcas azules del golden escaneado ni automatizar el trameado visual completo. El BOM (beta actual) actúa como **consulta auxiliar**, no como output final.

## 2. Enfoque recomendado

**Manual asistido (A)** — corto plazo, bajo riesgo, alineado con el flujo real del cliente.

| Enfoque | Decisión |
|---------|----------|
| A. Manual asistido | **MVP** |
| B. Semiautomático | Fase 18I-A (post-research 18H) |
| C. Automático visual | Descartado para MVP; ver [trameado-auto-research.md](./trameado-auto-research.md) |

## 3. Flujo de usuario propuesto

```
1. Trabajo con planos ya subidos y metadatos completos (reutilizar gate actual).
2. Ingeniero abre un plano → pestaña/paso «Trameado» (nuevo, distinto de «Palillería» BOM).
3. Visor PDF del isométrico (lado izquiero o superior).
4. Tabla de tramos editable (lado derecho o inferior):
   - Añadir fila: Nº, Ø, SCH., longitud (mm), observaciones.
   - Ordenar / renumerar tramos.
   - Opcional: etiqueta Tramo A/B (campo secundario, no export obligatorio).
5. Precarga sugerida (solo lectura en MVP):
   - lineIdentifier desde metadatos del plano.
   - Ø y SCH. desde primera tubería del BOM si existe.
6. Revisión: marcar hoja de trameado del plano como «revisada».
7. Export:
   - Excel/CSV de hoja de palilleo (job completo o plano).
   - PDF simple tabular (réplica de plantilla cliente) — stretch 18D.
```

## 4. Campos mínimos (MVP)

### Por hoja / ISO (`TrameadoSheet`)

| Campo | Obligatorio | Fuente MVP |
|-------|-------------|------------|
| lineIdentifier | Sí | Metadatos / edición manual |
| drawingId | Sí | Plano vinculado |
| diameter (default) | Sí | Manual o hint BOM |
| schedule (default) | Sí | Manual o hint BOM |
| status | Sí | draft → reviewed |

### Por tramo (`TrameadoSegment`)

| Campo | Obligatorio | Ejemplo |
|-------|-------------|---------|
| segmentNumber | Sí | 1 → muestra `<1>` |
| diameter | Sí* | 4" (*hereda de sheet si vacío) |
| scheduleOrThickness | Sí* | 40 |
| length | Sí | 363 |
| unit | Sí | mm (fijo MVP) |
| observations | No | — |
| sortOrder | Sí | 1, 2, 3… |

**Fuera de MVP:** COLADA, CLASE como columna separada, anotaciones gráficas en PDF, Tramo A/B en export.

## 5. Pantallas necesarias

| Pantalla | Descripción | Prioridad MVP |
|----------|-------------|---------------|
| Lista de planos con estado trameado | KPI: tramos definidos / revisados | Media |
| Detalle plano — paso Trameado | Visor PDF + tabla tramos | **Alta** |
| Formulario fila tramo | Inline o modal | **Alta** |
| Export hoja (job) | Desde trabajo o detalle | **Alta** |
| Comparación BOM vs trameado | Solo lectura, hints | Baja (18C) |
| Editor anotaciones iso | Marcar `<n>` en PDF | No MVP (18D) |

Integración con wizard UI existente: el paso «Trameado» sería **posterior a Metadatos** y **paralelo o posterior** a BOM/palillería actual — decisión de UX en 18B.

## 6. Relación con BOM / palillería actual

| Capa | Rol | Modelo |
|------|-----|--------|
| **BOM beta** | Lista de materiales SAP, import supervisado | `DrawingTakeoffItem` |
| **Trameado MVP** | Tramos fabricables con longitud | `TrameadoSegment` (nuevo) |

- No sustituir la pestaña Palillería actual en el MVP; añadir capacidad nueva.
- El export CSV actual de takeoff **no** es el export de hoja de palilleo.
- Posible enlace futuro: ítem BOM tipo TUBERÍA → precarga Ø/SCH.; válvulas → sugerir puntos de corte (18C).

## 7. Export esperado

### MVP (18B)

**Excel / CSV — hoja de palilleo**

Columnas:

| ISO | CLASE | Nº | Ø | SCH. | PALILLO | COLADA | Observaciones |
|-----|-------|-----|---|------|---------|--------|---------------|

- Una fila por `TrameadoSegment`.
- ISO repetido en cada fila del mismo plano (como la hoja manuscrita).
- Nº con formato `<n>`.
- COLADA vacía por defecto.

### Stretch (post-18D)

- PDF con rejilla similar a plantilla cliente.
- PDF «iso trameado» con anotaciones vectoriales (líneas, círculos, etiquetas).
- Export Excel formateado (no solo CSV).

## 8. Limitaciones del MVP

1. Sin lectura de marcas azules del PDF de ejemplo.
2. Sin cálculo automático de longitudes desde cotas.
3. Sin validación geométrica (suma de tramos vs tubería BOM).
4. Sin COLADA ni integración ERP.
5. Sin multi-usuario en tiempo real sobre mismas anotaciones.
6. Entidad nueva implica migración Prisma en 18B (fuera de 18A).

## 9. Fases sugeridas

### 18B — Modelo técnico (completado)

- Schema: `DrawingTrameadoSheet`, `DrawingTrameadoSegment` (ver [trameado-technical-model.md](./trameado-technical-model.md)).
- Validaciones Zod, helpers de formato, server actions CRUD + revisión.
- Permisos: owner/admin/engineer editan; viewer lectura.
- Script `npm run verify:trameado`.
- **Sin UI** en esta fase.

### 18C — MVP manual con UI (completado)

- UI: pestaña Trameado en detalle de plano; crear hoja, tramos, revisión.
- Viewer solo lectura.
- E2E: `tests/e2e/trameado-manual.spec.ts`.

### 18D — Export CSV hoja cliente (completado)

- Endpoint `GET /api/files/trameado/[sheetId]/csv`.
- Columnas: ISO, CLASE, Nº, Ø, SCH., PALILLO, COLADA.
- UTF-8 + BOM; separador `,`; anti formula-injection.
- Botón «Exportar CSV» en UI; no exige revisión (aviso si pendiente).
- Excel formateado / PDF plantilla: fase posterior.

### 18E — Entrada rápida de tramos (completado)

- Formulario mantiene Ø, SCH. y COLADA entre altas consecutivas.
- Autoincremento de Nº (`max + 1`); Enter para guardar.
- Acción «Duplicar tramo» en tabla (server action, invalida revisión).
- Resumen «N tramos · X mm» en tabla.
- Sin cambios de modelo ni export CSV.

### 18F — Workspace PDF + hoja (completado)

- Pestaña Trameado con layout de trabajo: plano embebido a la izquierda (desktop) y hoja de palilleo a la derecha.
- En móvil: hoja primero, PDF debajo.
- Sigue siendo manual asistido; sin OCR ni automatización.

### 18G — Export XLSX básico (completado)

- Endpoint `GET /api/files/trameado/[sheetId]/xlsx`.
- Mismas columnas que CSV: ISO, CLASE, Nº, Ø, SCH., PALILLO, COLADA.
- Formato básico: cabecera en negrita, anchos razonables, PALILLO numérico, fila congelada, autofiltro.
- Botón «Exportar Excel» junto a CSV; CSV se mantiene sin cambios.
- Excel formateado avanzado / plantilla exacta cliente: fase posterior.

### 18H — Research trameado automático (completado)

- Documento: [trameado-auto-research.md](./trameado-auto-research.md).
- Script: `npm run research:trameado-auto`.
- **Conclusión:** trameado automático total **no viable** con PDFs de ejemplo del cliente (escaneos RICOH, 12–140 chars embebidos).
- Tramos `<n>` y PALILLO **no** aparecen como texto; marcas azules son raster/OCR (Nivel 4, alto riesgo).
- PDFs vectoriales individuales sí permiten hints metadatos/BOM (Nivel 1–2).
- **Automático realista** = asistente: precrear hojas, sugerir Ø/SCH, usuario introduce longitudes mirando PDF.
- **Automático visual** (OCR marcas azules, geometría) = alto riesgo; no MVP.

### 18I-A — Asistente BOM/metadatos (completado)

- Helper `lib/trameado/suggestions.ts` y action `createSuggestedTrameadoSheetsAction`.
- Bloque «Asistente de hoja de palilleo» en pestaña Trameado.
- Precrea hojas con ISO, CLASE, Ø y SCH sugeridos desde metadatos + BOM.
- Pareja `-01`/`-02` solo con base (plano relacionado o tubería 3/4" en BOM).
- **No** crea tramos ni longitudes PALILLO.
- Viewer no ve el asistente.

### 18I-B — Parser experimental texto embebido (condicional)

- Solo si aparecen PDFs con tramos `<n>` en texto estructurado.
- No prioritario con ejemplos actuales.

### 18I-C — Research OCR visual (backlog)

- OCR no productivo sobre isos escaneados / marcas azules.
- Requiere golden set y precisión medida antes de UI.

### 18J — Research vectorial cotas / palillos (completado)

- Documento: [trameado-vector-research.md](./trameado-vector-research.md).
- Script: `npm run research:trameado-vector`.
- **Input analizado:** 9 PDFs vectoriales HL originales (`Ejemplos/Ejemplo 1/`).
- **Golden:** `Isos trameados.pdf` solo como referencia visual (no input).
- **Conclusión:** cotas candidatas **sí** extraíbles; PALILLO automático **no** (parcial en `-02`, no en `-01` sin geometría).
- Posición X/Y **no** disponible con API pública `pdf-parse`.
- **Recomendación:** 18K-A panel de cotas candidatas.

### 18K-A — Panel cotas candidatas (completado)

- Helper: `lib/trameado/candidate-dimensions.ts` + loader server `load-candidate-dimensions.ts`.
- UI: `TrameadoCandidateDimensionsPanel` debajo del visor PDF en pestaña Trameado.
- Extrae cotas del texto embebido del PDF original; **no** crea palillos ni tramos.
- Engineer: copiar o preparar formulario; viewer solo copia.
- Sin posición X/Y; lista filtrada con avisos de confianza.

### 18K-B — Tramo asistido desde cota candidata (completado)

- Botón **Preparar tramo** en panel de cotas (solo engineer, con hoja activa).
- Abre formulario de nuevo tramo con PALILLO pre-rellenado, Nº siguiente y Ø/SCH/COLADA sticky.
- Aviso contextual hasta guardar, cancelar o elegir otra cota.
- Botón **Confirmar tramo** — **no** guarda automáticamente; el ingeniero revisa y confirma.
- Deshabilitado sin hoja: «Crea o selecciona una hoja antes de usar cotas».

### 18K-C — Estabilidad E2E trameado (completado)

- `scripts/reset-e2e-trameado.ts` + `beforeEach` en `trameado-manual.spec.ts`.
- ISO únicos por escenario; seed no re-ejecuta `main()` al importar.

### 18K-D — Lint borrador asistido (completado)

- Estado derivado `activeAssistedSegmentDraft` (sin setState en effect).

### 18L — Validación funcional PDFs reales (completado)

- Documento: [trameado-functional-validation.md](./trameado-functional-validation.md).
- Script: `npm run validate:trameado-functional`.
- Casos: HL-1291-01/-02 (principal), HL-1289-01/-02 (secundario).
- Golden: `Isos trameados.pdf` solo referencia visual.
- **Conclusión:** flujo manual asistido **viable**; gaps principales en ranking cotas (-01) y ausencia de X/Y/suma automática.
- **Siguiente recomendado:** 18M-A filtro/ranking cotas candidatas.

### 18M-A — Filtro/ranking cotas candidatas (completado)

- Helper: `lib/trameado/candidate-dimensions.ts` — scoring numérico, `confidence` high/medium/low, `reasons[]`, filtros de ruido ampliados.
- UI: panel con **Cotas más probables** (top 10) + **Ver más cotas** (hasta 24).
- **No** crea tramos ni infiere PALILLO definitivo; **18K-B** intacto (Preparar tramo + confirmación).
- **Límites:** sin X/Y, sin agrupación por tramo, sin suma automática.
- Validación: `verify:trameado` + `validate:trameado-functional` — mejora ruido en -01 (17→14 ranked, sin 45/17/1290 en top); -02 mantiene 100/120 en primary; 1289-02 golden 3/3.

### 18M-B — UX pestaña Trameado (completado)

- Jerarquía visual, layout izquierda/derecha, asistente compacto con hoja, tabla tipo taller.
- Documentado en commit `style(trameado): clarify empty sheet workflow` (incl. 18M-B2 estado sin hoja).

### 18M-B2 — Estado sin hoja y CTA principal (completado)

- Tarjeta «Crea una hoja de palilleo para empezar»; CTA principal; cotas con Preparar tramo deshabilitado + aviso.

### 18N-A — Checklist demo interna (completado)

- Documento: [trameado-demo-checklist.md](./trameado-demo-checklist.md).
- **Demo recomendada:** `HL-1289-02` (golden 3/3 en panel); alternativa `HL-1291-02`.
- **Objetivo:** validar entendimiento del flujo asistido antes de más automatización.

### 18O-A — Propuesta automática de tramos candidatos (completado)

- Helper: `lib/trameado/segment-suggestions.ts` — `buildTrameadoSegmentSuggestions`.
- UI: panel **Tramos sugeridos** (añadir / preparar-editar / descartar); sin persistencia en BD.
- **No** guarda tramos hasta confirmación del ingeniero (acciones existentes).
- **-02:** hasta 5 sugerencias desde cotas high/medium; **-01 largos:** modo `unreliable` (0 sugerencias).
- Sin X/Y, sin iso trameado, sin Σ PALILLO vs BOM estricta.

### 18O-B — Validación orientativa de hoja (completado)

- Helper: `lib/trameado/sheet-validation.ts` — `validateTrameadoSheet`.
- UI: panel **Validación de hoja** junto a tabla/export/revisión.
- Compara Σ PALILLO confirmado con referencia tubería BOM (metros) si existe.
- **Informativa:** no bloquea export ni «Marcar revisada»; aviso suave si estado «Revisar».
- Copy prudente: «Parece razonable», «Revisar diferencia», «Sin referencia suficiente».
- **No** garantiza exactitud ni sustituye revisión del ingeniero.

### 18O-C — Marcado manual del isométrico (completado)

- Helper: `lib/trameado/pdf-annotations.ts` — marcas punto/rect con coords relativas 0–1.
- UI: overlay en `TrameadoPdfPanel`, panel **Marcado del isométrico**, acción **Marcar en plano** en tabla.
- Prototipo en estado temporal de sesión (sustituido por 18O-D).

### 18O-D — Persistencia de marcas del isométrico (completado)

- Modelo Prisma `DrawingTrameadoAnnotation` (1 marca activa por tramo, `segmentId` unique).
- Actions: `upsertTrameadoAnnotationAction`, `deleteTrameadoAnnotationAction`.
- Carga con `getDrawingTrameadoSheets`; viewer en lectura.
- **No** trameado automático, **no** coordenadas PDF reales, **no** geometría vectorial.
- Base para exportar/generar iso trameado en fases posteriores.

### 18O-E — Exportar PDF marcado (completado)

- Helper: `lib/trameado/export-marked-pdf.ts` (`pdf-lib`).
- API: `GET /api/files/trameado/[sheetId]/marked-pdf`.
- UI: botón **Exportar PDF marcado** (requiere ≥1 marca).
- Mapea coords relativas del visor a la página PDF; primer entregable visual prudente.
- **No** sustituye revisión del ingeniero ni precisión CAD.

### 18O-E2 — Legibilidad del PDF marcado (completado)

- Estilos escalados con mínimos (`resolveMarkedPdfRenderStyle`, `MARKED_PDF_MIN_SIZES`).
- Marcas más grandes, mayor contraste, etiquetas bold, halo blanco y leader line.

### 18O-F — Paquete de entrega ZIP (completado)

- Helper: `lib/trameado/export-package.ts` (`jszip`).
- API: `GET /api/files/trameado/[sheetId]/package`.
- UI: botón **Descargar paquete** junto a CSV/Excel/PDF marcado.
- Contenido ZIP:
  - `hoja-palilleo.xlsx` (reutiliza export XLSX).
  - `iso-marcado.pdf` solo si hay marcas persistidas.
  - `resumen-validacion.txt` y `resumen-validacion.json` (validación orientativa, totales, BOM).
- Primer **entregable combinado** de trameado/palilleo para taller/cliente.
- Sigue siendo **supervisado**: no sustituye revisión del ingeniero ni cierre automático.

### 18P-A — Cierre MVP y demo end-to-end (completado)

- Reporte: [trameado-mvp-demo-report.md](./trameado-mvp-demo-report.md).
- Caso validado: **HL-1289-02** / hoja **HL-1289-A010AA-N-02** (3 tramos golden, validación 2,5 %, paquete ZIP completo).
- Flujo completo documentado: hoja → sugerencias → validación → marcas → exports → entregable.
- Conclusión: **listo para demo interna y validación con usuario técnico**; no listo para automatización total.
- Recomendación siguiente: **18P-B** hardening QA antes de push/release.

### 18M-F — Export/plantilla cliente (backlog)

- Formato visual más cercano a `Hoja de palilleo.pdf` escaneada.

### 18M-C — Anotaciones manuales sobre PDF (backlog)

- Generar iso trameado / marcas sobre PDF original.

### 18M-D — Motor vectorial / posición (backlog)

- Paths/lines del PDF; coordenadas X/Y; ver [trameado-vector-research.md](./trameado-vector-research.md).

### 18N — Iso trameado y export PDF anotado (futuro)

## 10. Criterios de éxito (MVP)

- [ ] Ingeniero puede reproducir digitalmente un bloque tipo `HL-1291-A012AA-N-01` con 5 tramos — **parcial (18L): manual asistido, no automático**.
- [x] Export genera columnas ISO, Nº, Ø, SCH., PALILLO reconocibles por taller.
- [x] Viewer solo lectura; engineer edita.
- [x] Beta BOM sigue funcionando sin regresión (fuera alcance 18L).
- [x] Demo interna end-to-end con iso real HL-1289-02 — **18P-A** ([reporte](./trameado-mvp-demo-report.md)).
- [ ] Cliente externo valida export en sesión formal (pendiente).

## 11. Referencias

- Análisis funcional: [trameado-functional-analysis.md](./trameado-functional-analysis.md)
- Modelo técnico 18B: [trameado-technical-model.md](./trameado-technical-model.md)
- Beta BOM: [auto-takeoff-research.md](./auto-takeoff-research.md)
- Research automático (escaneos): [trameado-auto-research.md](./trameado-auto-research.md)
- Research vectorial (input real): [trameado-vector-research.md](./trameado-vector-research.md)
- Validación funcional 18L: [trameado-functional-validation.md](./trameado-functional-validation.md)
- Demo interna 18N-A: [trameado-demo-checklist.md](./trameado-demo-checklist.md)
- Cierre MVP 18P-A: [trameado-mvp-demo-report.md](./trameado-mvp-demo-report.md)
- Tramos sugeridos 18O-A: `lib/trameado/segment-suggestions.ts`
- Validación hoja 18O-B: `lib/trameado/sheet-validation.ts`
- Marcado isométrico 18O-C/D: `lib/trameado/pdf-annotations.ts`, `DrawingTrameadoAnnotation`
- PDF marcado 18O-E: `lib/trameado/export-marked-pdf.ts`
- Paquete ZIP 18O-F: `lib/trameado/export-package.ts`

---

*Propuesta Fase 18A; modelo técnico 18B implementado en backend.*
