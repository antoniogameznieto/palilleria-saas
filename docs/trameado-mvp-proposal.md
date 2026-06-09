# Fase 18A — Propuesta MVP de trameado / hoja de palilleo

> **Estado:** propuesta preliminar para validación interna y con cliente.  
> **Prerrequisito:** [trameado-functional-analysis.md](./trameado-functional-analysis.md).  
> **Sin implementación** en esta fase.

## 1. Objetivo del MVP

Permitir que un ingeniero **digitalice la hoja de palilleo** que hoy rellena a mano: por cada plano/ISO, definir tramos numerados (`<1>`, `<2>`, …) con diámetro, schedule y longitud de corte, y **exportar** una tabla equivalente a `Hoja de palilleo.pdf`.

El MVP **no** intenta leer marcas azules ni automatizar el trameado visual. El BOM (beta actual) actúa como **consulta auxiliar**, no como output final.

## 2. Enfoque recomendado

**Manual asistido (A)** — corto plazo, bajo riesgo, alineado con el flujo real del cliente.

| Enfoque | Decisión |
|---------|----------|
| A. Manual asistido | **MVP** |
| B. Semiautomático | Fase 18C (post-MVP) |
| C. Automático visual | Descartado hasta nuevo input; requiere OCR/visión |

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

### 18H — Semiautomático asistido

- Hints desde BOM (Ø, SCH., cantidad tubería vs suma tramos).
- Reglas de corte desde `JobSettings` (bridas, válvulas, codos).
- Sugerencia de longitudes desde cotas extraídas (si texto embebido).
- Alertas de discrepancia; sin autoaplicar.

### 18I — Iso trameado y export PDF

- Capa `Annotation` (líneas, círculos, etiquetas Tramo A/B).
- Export PDF iso marcado.
- Export PDF hoja con plantilla visual del cliente.
- Opcional: renumeración automática al mover anotaciones.

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

---

*Propuesta Fase 18A; modelo técnico 18B implementado en backend.*
