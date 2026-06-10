# Reporte de hardening QA — MVP Trameado

> **Fase 18P-B** — Revisión de permisos, endpoints, acciones, edge cases y E2E antes de push/release.  
> **Fecha:** junio 2026 · **Sin funcionalidad nueva**

---

## Alcance de la revisión

| Área | Qué se revisó |
|------|----------------|
| Permisos y roles | `canManageTrameado`, `canViewTrameado`, UI `canManage`, membership por company |
| Endpoints export | CSV, XLSX, PDF marcado, paquete ZIP, PDF original del plano |
| Server actions | CRUD hoja/tramo, sugerencias, anotaciones, marcar revisada |
| Estados vacíos / edge cases | Sin hoja, sin tramos, sin marcas, sin BOM, -01/-02 |
| E2E / seed | `resetE2eTrameadoData`, aislamiento entre specs |
| Dependencias | `pdf-lib`, `jszip` |
| Runtime | `next.config.ts` → `serverExternalPackages` |

**Fuera de alcance:** rediseño UI, nuevas features, migraciones, suite E2E completa.

---

## Checklist de permisos

### Engineer / owner / admin (`canManageTrameado`)

| Acción | Server | UI | Estado |
|--------|--------|-----|--------|
| Crear hoja | `createTrameadoSheetAction` + `requireDrawingAccess` | `trameado-create-sheet` | ✅ |
| Editar/borrar hoja | `update/deleteTrameadoSheetAction` | forms ocultos si no manage | ✅ |
| Crear/editar/borrar tramo | segment actions + `requireTrameadoSegmentAccess` | tabla acciones | ✅ |
| Preparar tramo desde cota | handler `canManage` | `onPrepareSegment` solo si manage | ✅ |
| Añadir sugerencias | `createSuggestedTrameadoSheetsAction` | panel sugerencias solo si manage | ✅ |
| Marcar/borrar marcas | annotation actions + segment scope | iso panel + overlay | ✅ |
| Marcar hoja revisada | `markTrameadoSheetReviewedAction` | `trameado-mark-reviewed` | ✅ |
| Exportar CSV/XLSX/PDF/paquete | APIs sin role check (lectura) | botones visibles | ✅ |

### Viewer (`canViewTrameado` = true, `canManageTrameado` = false)

| Acción | Permitido | Estado |
|--------|-----------|--------|
| Ver hoja, tramos, cotas, validación | Sí | ✅ E2E |
| Ver marcas persistidas | Sí | ✅ `trameado-annotations` |
| Descargar CSV/XLSX/PDF/paquete | Sí | ✅ E2E + API |
| Crear/editar hoja o tramos | No | ✅ UI oculta |
| Preparar tramo / sugerencias | No | ✅ panel no renderizado |
| Marcar/borrar marcas | No | ✅ E2E |
| Marcar revisada | No | ✅ |

### Cross-tenant

| Recurso | Mecanismo | Estado |
|---------|-----------|--------|
| PDF plano | `getUserCompanyMembership` → 403 | ✅ `protected-pdf.spec.ts` |
| Export trameado (×4) | membership en `sheet.companyId` → 403 | ✅ `trameado-permissions.spec.ts` |
| Server actions | scope parse + `require*Access` + role | ✅ código; sin E2E directo de POST |

**Nota:** Un miembro de la misma company con UUID de otra hoja puede exportar (modelo plano por job). Consistente con acceso a trabajos de la empresa.

---

## Checklist de endpoints

Patrón común en `app/api/files/trameado/[sheetId]/*`:

1. `auth()` → **401** sin sesión  
2. Cargar sheet → **404** si no existe  
3. `getUserCompanyMembership` → **403** si no pertenece a la company  
4. Verificar job + drawing en scope → **403** (csv/xlsx) o **404** (package/marked-pdf si falta storage)  
5. Validación de negocio → **400** (sin tramos / sin marcas)

| Endpoint | Content-Type | Content-Disposition | Sin tramos | Sin marcas | Sin PDF storage |
|----------|--------------|-------------------|------------|------------|-----------------|
| `.../csv` | `text/csv; charset=utf-8` | attachment | 400 | N/A | N/A |
| `.../xlsx` | OpenXML spreadsheet | attachment | 400 | N/A | N/A |
| `.../marked-pdf` | `application/pdf` | attachment | N/A | 400 | 404/500 |
| `.../package` | `application/zip` | attachment | 400 | ZIP sin `iso-marcado.pdf` | 404/500 |
| `.../drawings/[id]` | `application/pdf` | inline/attachment | N/A | N/A | 404 |

Nombres de archivo: `sanitizeTakeoffCsvFileNameSegment` en helpers de export.

---

## Server actions revisadas

Archivo: `lib/actions/trameado.ts`

| Action | Scope | Role | IDOR |
|--------|-------|------|------|
| `createTrameadoSheetAction` | drawing | ✅ | ✅ |
| `updateTrameadoSheetAction` | sheet | ✅ | ✅ |
| `deleteTrameadoSheetAction` | sheet | ✅ | ✅ |
| `createTrameadoSegmentAction` | sheet | ✅ | ✅ |
| `updateTrameadoSegmentAction` | segment | ✅ | ✅ |
| `deleteTrameadoSegmentAction` | segment | ✅ | ✅ |
| `markTrameadoSheetReviewedAction` | sheet | ✅ | ✅ |
| `upsertTrameadoAnnotationAction` | segment + sheetId match | ✅ | ✅ |
| `deleteTrameadoAnnotationAction` | segment | ✅ | ✅ |
| `createSuggestedTrameadoSheetsAction` | drawing | ✅ | ✅ |

Viewer recibe `{ error: "No tienes permiso para gestionar el trameado." }` en mutaciones.

---

## Edge cases probados

| Estado | Comportamiento esperado | Validación |
|--------|------------------------|------------|
| Plano sin hoja | Tarjeta crear hoja; cotas sin preparar tramo | Manual + E2E manual |
| Hoja sin tramos | Export deshabilitado; validación «sin tramos» | E2E package |
| Hoja con tramos, sin marcas | Paquete sin PDF; hint UI; PDF marcado disabled | E2E marked-pdf |
| Hoja con marcas | 3/3; persistencia tras recarga | E2E annotations |
| Sin BOM comparable | Validación «sin referencia» | `validate-trameado-functional` |
| Con BOM (HL-1289-02) | 390 mm vs 0,4 m; 2,5 % | 18P-A report |
| -01 largo | Sugerencias `unreliable` | functional script |
| -02 short_iso | 5 sugerencias; golden en panel | functional script |
| Viewer en cada estado | Lectura + export; sin edición | E2E permissions |

---

## Issues encontrados

### Bloqueantes

**Ninguno.**

### No bloqueantes (documentados, sin fix en 18P-B)

| ID | Issue | Severidad | Decisión |
|----|-------|-----------|----------|
| H1 | csv/xlsx devuelven **403** si drawing ausente; package/marked-pdf **404** | Baja | Inconsistencia cosmética; no afecta seguridad |
| H2 | `requireDrawingAccess` redirige; helpers sheet/segment devuelven `{ error }` | Baja | Comportamiento distinto pero seguro |
| H3 | Sin E2E de POST directo a server actions como viewer | Media | Cubierto por UI; POST directo pendiente si se expone API pública |
| H4 | Turbopack warning NFT en ruta package (`next.config` + storage) | Baja | Build OK; warning conocido |

---

## Fixes aplicados (18P-B)

| Cambio | Motivo |
|--------|--------|
| `tests/e2e/trameado-permissions.spec.ts` | 401/403 API ×4 rutas; viewer/engineer UI; viewer download CSV/ZIP |
| `tests/e2e/viewer-permissions.spec.ts` | Smoke Trameado: viewer sin crear hoja/tramo |
| `scripts/reset-e2e-trameado.ts` | Comentario cascada segmentos/anotaciones |

**Sin cambios** en Prisma, formatos export, UI layout ni lógica de permisos (ya correcta).

---

## E2E / seed

`resetE2eTrameadoData` elimina `DrawingTrameadoSheet` por `drawingId: drawingPending`. Cascada Prisma elimina segmentos y anotaciones.

Specs trameado llaman reset en `beforeEach` o `beforeAll` según necesidad. `trameado-permissions` usa modo **serial** y un único `beforeAll` para compartir `sheetId`.

---

## Dependencias

| Paquete | Uso | Justificación |
|---------|-----|---------------|
| `pdf-lib` | `export-marked-pdf.ts` | Superponer marcas en PDF |
| `jszip` | `export-package.ts` | Paquete ZIP de entrega |

Ambas en `serverExternalPackages` de `next.config.ts`. `package-lock.json` consistente. Build OK.

---

## Riesgos pendientes

1. **Sesión con cliente externo** — validación formal del entregable ZIP aún pendiente (18P-A).
2. **-01 largos** — flujo manual viable pero sin sugerencias automáticas fiables.
3. **Precisión PDF marcado** — coordenadas relativas del visor; revisión humana obligatoria.
4. **Push a remoto** — 9+ commits locales; ejecutar smoke completo antes de release público.

---

## Recomendación push/release

| Paso | Acción |
|------|--------|
| 1 | ✅ Hardening 18P-B completado |
| 2 | Push de `main` cuando Antonio decida (9 commits + este) |
| 3 | Demo interna con [trameado-mvp-demo-report.md](./trameado-mvp-demo-report.md) |
| 4 | Siguiente: **18Q-A** (-01 largos) o **18Q-B** (coords PDF) según feedback |

**Veredicto:** MVP listo para **push y demo interna seria** con supervisión humana documentada.

---

## Evidencia automatizada

```bash
npm run verify:trameado
npm run validate:trameado-functional
npm run lint
npm run build
npm run test:e2e -- tests/e2e/trameado-manual.spec.ts
npm run test:e2e -- tests/e2e/trameado-suggestions.spec.ts
npm run test:e2e -- tests/e2e/trameado-annotations.spec.ts
npm run test:e2e -- tests/e2e/trameado-marked-pdf.spec.ts
npm run test:e2e -- tests/e2e/trameado-package.spec.ts
npm run test:e2e -- tests/e2e/trameado-permissions.spec.ts
```

---

*Reporte Fase 18P-B — hardening QA permisos y exports del MVP Trameado.*
