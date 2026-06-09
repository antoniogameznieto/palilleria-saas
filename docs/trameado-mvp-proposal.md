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

### 18K-C — Prepropuesta experimental palillos (condicional)

- Solo tras validar reglas en golden set; prioritario para planos `-02`.

### 18K-C — Geometría vectorial experimental (backlog)

- Paths/lines del PDF; motor geométrico dedicado.

### 18L — Iso trameado y export PDF anotado (futuro)

## 10. Criterios de éxito (MVP)

- [ ] Ingeniero puede reproducir digitalmente un bloque tipo `HL-1291-A012AA-N-01` con 5 tramos.
- [ ] Export genera columnas ISO, Nº, Ø, SCH., PALILLO reconocibles por taller.
- [ ] Viewer solo lectura; engineer edita.
- [ ] Beta BOM sigue funcionando sin regresión.
- [ ] Cliente valida export con un iso real del paquete `Ejemplos/Ejemplo 1`.

## 11. Referencias

- Análisis funcional: [trameado-functional-analysis.md](./trameado-functional-analysis.md)
- Modelo técnico 18B: [trameado-technical-model.md](./trameado-technical-model.md)
- Beta BOM: [auto-takeoff-research.md](./auto-takeoff-research.md)
- Research automático (escaneos): [trameado-auto-research.md](./trameado-auto-research.md)
- Research vectorial (input real): [trameado-vector-research.md](./trameado-vector-research.md)

---

*Propuesta Fase 18A; modelo técnico 18B implementado en backend.*
