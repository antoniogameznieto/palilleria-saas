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

Script: `scripts/verify-trameado-model.ts` — validaciones Zod + helpers de formato + columnas export.

## Migración

Nombre: `add_drawing_trameado`  
Tablas: `DrawingTrameadoSheet`, `DrawingTrameadoSegment`.

## Futuras pantallas (18C+)

| Pantalla | Fase |
|----------|------|
| Paso Trameado en detalle de plano (PDF + tabla) | 18C |
| Export Excel/CSV hoja cliente | 18C |
| Hints desde BOM (Ø, SCH.) | 18D |
| Anotaciones iso trameado | 18E |

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
