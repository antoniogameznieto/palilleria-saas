# Checklist de release interno — MVP Palillería SaaS

> **Fase 11A** — Revisión interna sin funcionalidad nueva.  
> **Commit de referencia:** `516b84c` (post Fase 10I).  
> **Objetivo:** validar el MVP antes de seguir construyendo.

## Flujo principal del MVP (recordatorio)

1. Subida protegida de PDFs  
2. Detección de metadatos (filename + texto embebido PDF)  
3. Revisión manual de metadatos  
4. Palillería / takeoff manual  
5. Revisión de palillería por plano  
6. Consolidado por trabajo  
7. Export CSV / Excel  

**OCR del cajetín:** herramienta experimental aparte (`EXPERIMENTAL_TITLE_BLOCK_OCR`). **No** forma parte del flujo productivo.

---

## Comandos automáticos (ejecutar antes de la demo)

```bash
npm run lint
npm run build
npm run verify:takeoff
npm run verify:title-block-crop   # OCR experimental (funciones puras)
```

Opcional (solo si se va a probar OCR en la demo):

```bash
npm run check:tesseract
npm run benchmark:ocr -- ./ruta/plano.pdf --preset bottom-wide --preprocess high-contrast
```

---

## 1. Autenticación y roles

| # | Comprobación | OK |
|---|--------------|-----|
| 1.1 | Registro en `/register` crea usuario y abre sesión | ☐ |
| 1.2 | Login en `/login` con credenciales válidas | ☐ |
| 1.3 | Logout cierra sesión y redirige correctamente | ☐ |
| 1.4 | Sin sesión → rutas `/dashboard`, `/jobs`, etc. redirigen a login | ☐ |
| 1.5 | Usuario sin empresa → redirección a `/onboarding/company` | ☐ |
| 1.6 | Crear empresa en onboarding → usuario queda como `owner` | ☐ |
| 1.7 | Seed dev (`demo@palilleria.local` / `demo1234`) funciona si se usa | ☐ |

**Roles en `CompanyMember`:** `owner`, `admin`, `engineer`, `viewer`.

---

## 2. Compañías y trabajos

| # | Comprobación | OK |
|---|--------------|-----|
| 2.1 | Listado de trabajos por empresa (`/companies/[id]/jobs`) | ☐ |
| 2.2 | Crear trabajo (`/jobs/new`) — owner/admin/engineer | ☐ |
| 2.3 | Editar trabajo y settings del trabajo | ☐ |
| 2.4 | Usuario de otra empresa **no** accede a `companyId` ajeno (URL directa → 404/redirección) | ☐ |
| 2.5 | Cabecera del trabajo muestra progreso de planos (listos / pendientes) | ☐ |

---

## 3. Subida de planos

| # | Comprobación | OK |
|---|--------------|-----|
| 3.1 | Subida PDF desde UI del trabajo (`/drawings/upload`) — owner/admin/engineer | ☐ |
| 3.2 | Viewer **no** puede subir planos | ☐ |
| 3.3 | Solo PDF aceptado; tamaño acotado por `MAX_UPLOAD_SIZE_MB` | ☐ |
| 3.4 | Archivo guardado en storage local (`LOCAL_STORAGE_PATH`) sin exponer ruta al cliente | ☐ |
| 3.5 | Tras subida, plano aparece en lista con estado inicial coherente | ☐ |
| 3.6 | Eliminar plano — solo owner/admin (si está implementado en UI) | ☐ |

---

## 4. Descarga / visualización protegida

| # | Comprobación | OK |
|---|--------------|-----|
| 4.1 | PDF servido vía `/api/files/drawings/[drawingId]` con sesión + membership | ☐ |
| 4.2 | Sin sesión → 401 | ☐ |
| 4.3 | Usuario de otra empresa → 403/404 | ☐ |
| 4.4 | `storagePath` **no** aparece en HTML ni en exports | ☐ |
| 4.5 | Visualización/incrustación del PDF en detalle de plano funciona | ☐ |

---

## 5. Detección de metadatos (productivo)

| # | Comprobación | OK |
|---|--------------|-----|
| 5.1 | Tab Automatización → «Detectar metadatos» (owner/admin/engineer) | ☐ |
| 5.2 | Usa filename + texto embebido PDF (no OCR) | ☐ |
| 5.3 | Feedback de detección muestra fuentes y campos sugeridos | ☐ |
| 5.4 | Campos vacíos del plano se rellenan; existentes no se sobrescriben sin política clara | ☐ |
| 5.5 | Viewer **no** puede iniciar detección | ☐ |
| 5.6 | Plano pasa a estado `detected` cuando corresponde | ☐ |

---

## 6. Revisión de metadatos

| # | Comprobación | OK |
|---|--------------|-----|
| 6.1 | Plano `detected` muestra bloque de revisión de metadatos | ☐ |
| 6.2 | «Confirmar metadatos» (owner/admin/engineer) → estado `reviewed` | ☐ |
| 6.3 | Edición manual de nº plano / línea / revisión antes o después de confirmar | ☐ |
| 6.4 | Progreso del plano refleja «Revisar metadatos» hasta confirmación | ☐ |

---

## 7. Estados y progreso de planos

Estados de progreso (`lib/drawings/drawing-progress.ts`):

| Estado UI | Condición resumida |
|-----------|-------------------|
| Error | `status === error` |
| Faltan metadatos | Falta nº, línea o revisión |
| Revisar metadatos | Metadatos completos pero no `reviewed`/`approved` |
| Sin palillería | Sin líneas de takeoff |
| Revisar palillería | Hay líneas pero sin `takeoffReviewedAt` |
| Listo | Metadatos revisados + palillería revisada |

| # | Comprobación | OK |
|---|--------------|-----|
| 7.1 | Badge/etiqueta de progreso coherente en lista y detalle | ☐ |
| 7.2 | Resumen del trabajo (X listos, Y pendientes) correcto | ☐ |
| 7.3 | Filtro consolidado «Solo planos listos» excluye no-ready | ☐ |

---

## 8. Palillería manual (takeoff)

| # | Comprobación | OK |
|---|--------------|-----|
| 8.1 | Crear línea — engineer/admin/owner | ☐ |
| 8.2 | Editar / duplicar / eliminar línea | ☐ |
| 8.3 | Viewer ve líneas en **solo lectura** | ☐ |
| 8.4 | Sugerencias de referencia/unidad (engineer+) sin sobrescribir campos tocados | ☐ |
| 8.5 | Marcar palillería como revisada en el plano | ☐ |
| 8.6 | Editar/importar líneas **invalida** revisión de palillería | ☐ |
| 8.7 | Guardar edición sin cambios **no** invalida revisión | ☐ |

Ver también: [takeoff-hardening-checklist.md](./takeoff-hardening-checklist.md).

---

## 9. Import CSV (palillería)

| # | Comprobación | OK |
|---|--------------|-----|
| 9.1 | Import CSV en plano — engineer/admin/owner | ☐ |
| 9.2 | Viewer **no** puede importar | ☐ |
| 9.3 | Cabeceras y filas inválidas muestran error claro | ☐ |
| 9.4 | Import invalida revisión de palillería | ☐ |

---

## 10. Export CSV

| # | Comprobación | OK |
|---|--------------|-----|
| 10.1 | Export CSV por plano (cliente, desde datos serializados en página) | ☐ |
| 10.2 | Export CSV por trabajo (mismo mecanismo) | ☐ |
| 10.3 | Viewer puede exportar si hay líneas (lectura) | ☐ |
| 10.4 | Botones deshabilitados sin líneas | ☐ |
| 10.5 | Celdas con `=`, `+`, `-`, `@` neutralizadas (inyección CSV) | ☐ |
| 10.6 | Tras editar palillería, **refrescar página** antes de export CSV si se exige snapshot actualizado | ☐ |

> **Nota:** CSV se genera en el navegador a partir del snapshot cargado en la página. Excel usa API servidor (datos frescos).

---

## 11. Export Excel

| # | Comprobación | OK |
|---|--------------|-----|
| 11.1 | Botón export Excel en trabajo → `/api/.../takeoff-export` | ☐ |
| 11.2 | Tres hojas: Resumen, Consolidado, Detalle | ☐ |
| 11.3 | Sin líneas → 400 con mensaje claro | ☐ |
| 11.4 | Protección anti-inyección en celdas de texto | ☐ |
| 11.5 | `companyId` + `jobId` acotan datos (no fuga cross-tenant) | ☐ |

---

## 12. Consolidado por trabajo

| # | Comprobación | OK |
|---|--------------|-----|
| 12.1 | Sección consolidado visible en detalle del trabajo | ☐ |
| 12.2 | Agrupación por referencia + descripción + unidad | ☐ |
| 12.3 | Cantidades suman correctamente entre planos | ☐ |
| 12.4 | Filtros búsqueda/unidad y «solo planos listos» | ☐ |
| 12.5 | Empty state sin líneas / sin resultados de filtro | ☐ |

---

## 13. Permisos por rol (resumen)

| Acción | viewer | engineer | admin | owner |
|--------|--------|----------|-------|-------|
| Ver planos / palillería / consolidado | ✓ | ✓ | ✓ | ✓ |
| Subir planos | ✗ | ✓ | ✓ | ✓ |
| Detectar / confirmar metadatos | ✗ | ✓ | ✓ | ✓ |
| Gestionar palillería | ✗ | ✓ | ✓ | ✓ |
| Import CSV | ✗ | ✓ | ✓ | ✓ |
| Export CSV / Excel | ✓* | ✓ | ✓ | ✓ |
| Eliminar planos | ✗ | ✗ | ✓ | ✓ |
| OCR experimental | ✗** | ✓** | ✓** | ✓** |

\* Si hay líneas para exportar.  
\** Solo si `EXPERIMENTAL_TITLE_BLOCK_OCR=true` (misma gate que detección: owner/admin/engineer).

| # | Comprobación | OK |
|---|--------------|-----|
| 13.1 | Probar al menos un flujo completo como **engineer** | ☐ |
| 13.2 | Probar lectura + export como **viewer** | ☐ |
| 13.3 | Probar eliminación de plano como **admin/owner** | ☐ |

---

## 14. OCR experimental (separado del productivo)

| # | Comprobación | OK |
|---|--------------|-----|
| 14.1 | Con flag **desactivado** → bloque OCR no visible | ☐ |
| 14.2 | Con flag **activado** → bloque bajo «Herramientas experimentales», no mezclado con detección | ☐ |
| 14.3 | Copy indica no fiable / no productivo / revisión manual | ☐ |
| 14.4 | **No** hay botón aplicar/guardar candidatos OCR | ☐ |
| 14.5 | Resultados no persisten en BD | ☐ |

Documentación: [ocr-ai-research.md](./ocr-ai-research.md) (Fases 10A–10I), [ocr-benchmark-results.md](./ocr-benchmark-results.md).

---

## 15. Errores y empty states

| # | Comprobación | OK |
|---|--------------|-----|
| 15.1 | Trabajo sin planos — mensajes y exports deshabilitados | ☐ |
| 15.2 | Plano sin palillería — mensaje claro | ☐ |
| 15.3 | Detección sin resultados — feedback sin romper UI | ☐ |
| 15.4 | Error de subida / PDF inválido — mensaje al usuario | ☐ |
| 15.5 | API archivos y export con errores HTTP coherentes (401/403/404) | ☐ |

---

## Riesgos conocidos

| Riesgo | Impacto | Mitigación actual |
|--------|---------|-------------------|
| **OCR no productivo** | Falsa confianza en metadatos | Cerrado en 10I; UI + docs; flag opcional |
| **Revisión manual obligatoria** | Flujo más lento | Por diseño; estados de progreso guían al usuario |
| **CSV client-side = snapshot** | Export desactualizado si no se refresca | Excel vía API; documentar refresco antes de CSV |
| **Sin E2E automatizado de roles** | Regresiones de permisos no detectadas | Checklist manual 13.x; `verify:takeoff` parcial |
| **Sin tests de integración API** | Rutas `/api/files`, `/takeoff-export` solo probadas a mano | Incluir en demo interna |
| **README desactualizado** | Indica «Fase 3»; no refleja MVP actual | Actualizar en fase posterior (no bloqueante demo) |
| **Storage local** | No listo para producción multi-nodo | `STORAGE_DRIVER` preparado para S3; solo local hoy |
| **OCR depende de Tesseract en servidor** | Sin binario → solo preview | `check:tesseract`; avisos en UI |
| **Detección sin OCR** | PDFs escaneados sin texto embebido → metadatos incompletos | Revisión manual; OCR solo diagnóstico |
| **Build warning NFT/next.config** | Ruido en CI; posible sorpresa en deploy | Conocido; build pasa |
| **Middleware deprecated (Next 16)** | Migrar a `proxy` en el futuro | No bloquea demo interna |
| **`.env.example` con OCR=true** | Puede confundir en staging | Dejar `false` en prod; documentado en tesseract-ocr-setup |

### Riesgos adicionales detectados en revisión 11A

| Riesgo | Detalle |
|--------|---------|
| **Multi-empresa en URLs** | `companyId` en path; validar siempre membership (no confiar solo en UI) |
| **Engineer no puede borrar planos** | Solo admin/owner; confirmar que UI no muestra acción a engineer |
| **Palillería «lista» ≠ estado Drawing `approved`** | Progreso `ready` es lógica derivada (metadatos + takeoff revisado), no solo enum Prisma |
| **Flag experimental en `.env.example`** | Por defecto `true`; en demo interna conviene saber si está on/off |

---

## Criterio de listo para demo interna

Consideramos el MVP **demo-ready** para revisión interna cuando se cumple **todo** lo siguiente:

### Automático (obligatorio)

- [ ] `npm run lint` sin errores  
- [ ] `npm run build` sin errores  
- [ ] `npm run verify:takeoff` pasa  
- [ ] `npm run verify:title-block-crop` pasa  

### Flujo productivo (obligatorio, manual)

- [ ] Login → empresa → trabajo → subir PDF  
- [ ] Detectar metadatos → confirmar → plano en estado revisado a nivel metadatos  
- [ ] Añadir al menos 2 líneas de palillería → marcar revisada  
- [ ] Progreso del plano muestra **Listo**  
- [ ] Consolidado del trabajo muestra cantidades correctas  
- [ ] Export CSV (plano y trabajo) y Excel (trabajo) descargan sin error  
- [ ] Viewer puede ver y exportar; **no** puede editar ni importar  

### Seguridad mínima (obligatorio)

- [ ] PDF no accesible sin sesión ni cross-tenant  
- [ ] `storagePath` no filtrado al cliente  

### OCR (opcional en demo)

- [ ] Si se muestra OCR: dejar claro que es experimental y no usar sus sugerencias como verdad  
- [ ] Si no se muestra: `EXPERIMENTAL_TITLE_BLOCK_OCR=false`  

### Documentación

- [ ] Revisores conocen [takeoff-hardening-checklist.md](./takeoff-hardening-checklist.md)  
- [ ] Decisión OCR documentada en [ocr-ai-research.md](./ocr-ai-research.md) § Fase 10I  

---

## Referencias

| Documento | Uso |
|-----------|-----|
| [takeoff-hardening-checklist.md](./takeoff-hardening-checklist.md) | Palillería, exports, permisos takeoff |
| [ocr-ai-research.md](./ocr-ai-research.md) | Investigación y cierre OCR experimental |
| [ocr-benchmark-results.md](./ocr-benchmark-results.md) | Resultados benchmark; no listo para producción |
| [tesseract-ocr-setup.md](./tesseract-ocr-setup.md) | Tesseract CLI (solo dev/OCR) |
| [README.md](../README.md) | Instalación y arranque (parcialmente desactualizado) |
| `cursor-palilleria-docs/` | Especificación producto original |

---

## Registro de ejecución (rellenar en la revisión)

| Fecha | Revisor | Commit | lint | build | verify:takeoff | verify:crop | Demo OK |
|-------|---------|--------|------|-------|----------------|-------------|---------|
| 2026-06-09 | Antonio | `516b84c` | OK | OK | OK | OK | pendiente |
