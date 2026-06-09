# Backlog post-demo interna — MVP Palillería SaaS

> **Fase 13A** — Priorización sin desarrollo de funcionalidad nueva.  
> **Commit de referencia:** `f069ceb` (post Fase 12B, CI verde).  
> **Estado MVP:** apto para demo interna guiada; E2E básico y CI en `main`/PR.

Fuentes consolidadas: [internal-release-checklist.md](./internal-release-checklist.md), [internal-demo-run-2026-06-09.md](./internal-demo-run-2026-06-09.md), [e2e-testing-notes.md](./e2e-testing-notes.md), [takeoff-hardening-checklist.md](./takeoff-hardening-checklist.md), [ocr-ai-research.md](./ocr-ai-research.md), [ocr-benchmark-results.md](./ocr-benchmark-results.md), [README.md](../README.md).

**Convenciones**

| Campo | Valores |
|-------|---------|
| Prioridad | P0 bloqueante · P1 corto plazo · P2 medio · P3 bajo / diferido |
| Esfuerzo | S (&lt;1 día) · M (1–3 días) · L (&gt;3 días) |
| Tipo | bug · mejora · hardening · docs · investigación |
| Origen | demo · checklist · riesgo · idea producto · deuda técnica |

---

## Ítems cerrados (no pendientes)

| ID | Título | Descripción | Origen | Prioridad | Esfuerzo | Tipo | Criterio de aceptación |
|----|--------|-------------|--------|-----------|----------|------|------------------------|
| **BACK-DOC-001** | README actualizado para MVP | README refleja flujo productivo, demo, CI, limitaciones y docs útiles (Fase 11D). | checklist | — | — | docs | README en `main` describe MVP actual; sin referencias obsoletas a «Fase 3». **Cerrado.** |
| **BACK-CI-001** | CI GitHub Actions en PR y main | Workflow `.github/workflows/ci.yml`: lint, build, verify, E2E con Postgres 16 y Playwright Chromium (Fase 12B). | checklist | — | — | hardening | Push/PR a `main` ejecutan job verde con los checks acordados. **Cerrado.** |
| **BACK-DEMO-001** | Observaciones DEMO-01, DEMO-02, DEMO-05 | Redirects por Host; plano demo en «Listo»; OCR oculto con flag off verificado (Fase 11C). | demo | — | — | bug | Informe 11C marca incidencias cerradas. **Cerrado.** |
| **BACK-E2E-001** | E2E básico auth, roles, PDF API, Listo, OCR off | 11 tests Playwright; seed vía `global-setup` (Fase 12A). | checklist | — | — | hardening | `npm run test:e2e` pasa en local y CI. **Cerrado (alcance 12A).** |

---

## Bloqueantes antes de demo externa

| ID | Título | Descripción | Origen | Prioridad | Esfuerzo | Tipo | Criterio de aceptación |
|----|--------|-------------|--------|-----------|----------|------|------------------------|
| **BACK-INFRA-001** | Entorno staging / demo desplegado | URL estable (no laptop del desarrollador) con BD, migraciones, storage y variables documentadas para presentaciones a terceros. | idea producto | **P0** | L | hardening | Staging accesible con credenciales demo; checklist de release ejecutable contra esa URL; rollback documentado. |
| **BACK-INFRA-002** | Storage producción: local → S3 (o compatible) | Hoy `STORAGE_DRIVER=local` no sirve multi-nodo ni despliegue real. Abstracción existe; falta configurar y probar en staging. | riesgo | **P0** | L | hardening | PDFs subidos en staging persisten tras redeploy; rutas no expuestas al cliente; variable documentada en `.env.example`. |
| **BACK-SEC-001** | Auditoría multi-tenant en APIs y server actions | `companyId` en URL; validar membership en todas las rutas `/api/*` y actions sensibles (archivos, export, CRUD). Demo validó casos puntuales; falta revisión sistemática. | riesgo | **P0** | M | hardening | Matriz de endpoints revisada; tests o checklist firmado; sin acceso cross-tenant en pruebas dirigidas. |
| **BACK-E2E-002** | E2E flujo núcleo clic a clic (subida → metadatos → Listo) | DEMO-03: subida PDF, detección y confirmación de metadatos no re-ejecutadas en demo manual. E2E actual no cubre subida ni detección completa. | demo | **P0** | L | hardening | Test(s) que suben PDF de fixture, detectan, confirman metadatos, añaden línea, marcan revisada y verifican «Listo». |
| **BACK-DEMO-002** | Datos demo controlados para presentaciones | Mezcla de datos locales (Agencia Adhoc) y seed E2E; conviene script o seed «demo presentation» reproducible. | demo | **P0** | M | mejora | Un comando deja staging/local con 1 trabajo, 2 planos (uno Listo, uno pendiente), usuarios por rol documentados. |

---

## Mejoras recomendadas corto plazo

| ID | Título | Descripción | Origen | Prioridad | Esfuerzo | Tipo | Criterio de aceptación |
|----|--------|-------------|--------|-----------|----------|------|------------------------|
| **BACK-PROD-001** | Decisión CSV client-side vs API servidor | Export CSV se genera en navegador desde snapshot de página (DEMO-07); Excel ya usa API fresca. Decidir: documentar solo, o unificar CSV en servidor. | riesgo | **P1** | M | investigación | ADR o nota en docs con decisión; si API: paridad con Excel en datos y anti-inyección. |
| **BACK-UX-001** | Onboarding y usuarios demo | Registro/onboarding no probados en demo 11B; seed demo sin planos útiles. Evaluar flujo primer uso y cuenta invitada. | demo | **P1** | M | mejora | Checklist 1.1–1.6 ejecutado; seed demo incluye al menos un plano de ejemplo opcional. |
| **BACK-UX-002** | Empty states y mensajes de error en UI | Checklist 15.x parcial en demo; reforzar copy en subida fallida, detección vacía, import inválido. | checklist | **P1** | M | mejora | Revisión manual de estados vacíos; incidencias menores corregidas o documentadas. |
| **BACK-PROD-002** | Invitación real de miembros (vs usuarios sintéticos) | Demo usó `viewer-demo@` / `engineer-demo@` creados a mano; flujo `/users` e invitaciones no validado E2E. | demo | **P1** | M | mejora | Owner puede añadir miembro con rol; nuevo usuario accede con permisos esperados. |
| **BACK-DOC-002** | Actualizar commit base en README | README «Estado actual» cita `9cefef5`; tras 12A/12B conviene alinear referencia. | deuda técnica | **P1** | S | docs | Campo «Último commit base» refleja release actual o se sustituye por enlace a releases/tags. |

---

## Hardening técnico

| ID | Título | Descripción | Origen | Prioridad | Esfuerzo | Tipo | Criterio de aceptación |
|----|--------|-------------|--------|-----------|----------|------|------------------------|
| **BACK-TECH-001** | Migrar middleware → proxy (Next.js 16) | Build advierte convención `middleware` deprecated; migrar a `proxy` cuando la guía de Next esté estable en el proyecto. | deuda técnica | **P2** | M | hardening | Sin warning de middleware deprecated en build; redirects auth siguen funcionando (incl. puerto alternativo). |
| **BACK-TECH-002** | Warning NFT / `next.config.ts` trace | Build Turbopack traza proyecto entero vía `lib/storage/local.ts` y `path` dinámico. Riesgo en deploy futuro. | riesgo | **P2** | M | hardening | Warning eliminado o acotado con ignore estático documentado; build limpio en CI. |
| **BACK-TECH-003** | Evitar doble build en CI para E2E | Job ejecuta `npm run build` y Playwright vuelve a build en `webServer`. Alarga CI ~1–2 min. | deuda técnica | **P2** | S | hardening | E2E reutiliza artefacto de build previo o documentación acepta el coste con métrica de tiempo. |
| **BACK-TECH-004** | Tests de integración API (archivos, export) | Rutas `/api/files/drawings/*` y `/takeoff-export` cubiertas parcialmente por E2E; sin suite API dedicada. | checklist | **P2** | M | hardening | Tests que cubren 401/403/200/400 sin browser o ampliación E2E documentada como suficiente. |
| **BACK-TECH-005** | Invalidación revisión palillería (checklist 8.6–8.7) | takeoff-hardening: crear/editar/import invalidan revisión; guardar sin cambios no. No ejecutado en demo 11B. | checklist | **P2** | S | hardening | Casos verificados manualmente o cubiertos por test automatizado. |

---

## E2E / QA

| ID | Título | Descripción | Origen | Prioridad | Esfuerzo | Tipo | Criterio de aceptación |
|----|--------|-------------|--------|-----------|----------|------|------------------------|
| **BACK-E2E-003** | E2E subida PDF + detección + confirmación metadatos | Extensión de BACK-E2E-002; cubre gap DEMO-03 y limitación 12A. | demo | **P1** | L | hardening | Spec dedicado con fixture PDF; estados `uploaded` → `detected` → `reviewed` verificados en UI. |
| **BACK-E2E-004** | E2E import CSV palillería | `data-testid` `takeoff-import-csv` existe; sin test. | checklist | **P1** | M | hardening | Import de fixture CSV añade líneas; revisión invalidada si aplica. |
| **BACK-E2E-005** | E2E export CSV/Excel con descarga real | Hoy solo se comprueba que botones están habilitados; no se valida contenido del archivo descargado. | demo | **P1** | M | hardening | `download` de Playwright verifica MIME, nombre y al menos una fila esperada en CSV/Excel. |
| **BACK-E2E-006** | E2E eliminar plano (admin/owner) | Checklist 3.6 y 13.3 no ejecutados; engineer no debe ver acción. | checklist | **P1** | S | hardening | Owner elimina plano; desaparece de lista; engineer no ve `delete-drawing`. |
| **BACK-E2E-007** | Artifacts Playwright en CI si falla | Facilitar depuración de flakes en GitHub Actions: `playwright-report`, traces, screenshots. | idea producto | **P2** | S | hardening | Step `upload-artifact` on failure; documentado en e2e-testing-notes. |
| **BACK-E2E-008** | E2E filtro consolidado «solo planos listos» | Checklist 7.3 no ejecutado clic a clic en demo. | checklist | **P2** | S | hardening | Tras flujo Listo, filtro reduce totales coherentemente. |
| **BACK-E2E-009** | E2E registro y onboarding empresa | Checklist 1.1, 1.5–1.6 omitidos en demo. | checklist | **P2** | M | hardening | Spec aislado crea usuario temporal y empresa; limpieza o BD efímera en CI. |

---

## UX / producto

| ID | Título | Descripción | Origen | Prioridad | Esfuerzo | Tipo | Criterio de aceptación |
|----|--------|-------------|--------|-----------|----------|------|------------------------|
| **BACK-UX-003** | Guía visual de progreso de plano | Estados derivados (metadatos, palillería, Listo) son correctos pero densos para nuevos usuarios. | idea producto | **P2** | M | mejora | Copy o tooltip que explique cada badge sin cambiar lógica de negocio. |
| **BACK-UX-004** | Aviso «refrescar antes de export CSV» | Si se mantiene CSV client-side, UX debe avisar tras editar palillería sin recargar. | riesgo | **P2** | S | mejora | Banner o toast contextual; o resuelto por BACK-PROD-001 (API). |
| **BACK-UX-005** | Flujo eliminar plano en UI | Solo admin/owner; confirmar modal y feedback post-eliminación. | checklist | **P2** | S | mejora | Acción visible solo a roles correctos; confirmación antes de borrar. |
| **BACK-UX-006** | PDFs escaneados sin texto embebido | Detección productiva no usa OCR; metadatos incompletos hasta revisión manual. Comunicar expectativa en UI. | riesgo | **P2** | S | docs | Mensaje en detección cuando no hay texto embebido; enlace a revisión manual. |

---

## Seguridad / multi-tenant

| ID | Título | Descripción | Origen | Prioridad | Esfuerzo | Tipo | Criterio de aceptación |
|----|--------|-------------|--------|-----------|----------|------|------------------------|
| **BACK-SEC-002** | Revisión profunda APIs (matriz completa) | Extensión de BACK-SEC-001: documentar cada handler con `requireCompanyMember` o equivalente. | riesgo | **P0** | M | hardening | Tabla endpoint × rol × tenant en docs o código comentado; gaps corregidos. |
| **BACK-SEC-003** | Rate limiting y tamaño upload en producción | `MAX_UPLOAD_SIZE_MB` existe; falta política en edge/reverse proxy para staging/prod. | riesgo | **P1** | M | hardening | Límite coherente en app y proxy; respuesta 413 documentada. |
| **BACK-SEC-004** | Secretos y `.env` en staging | `AUTH_SECRET`, `DATABASE_URL`, credenciales S3 solo en gestor de secretos del host. | riesgo | **P1** | S | hardening | Sin secretos en repo; `.env.example` sin valores reales; runbook staging. |
| **BACK-SEC-005** | `storagePath` nunca en cliente | Validado en demo (4.4); mantener en regresiones E2E y exports. | checklist | **P1** | S | hardening | E2E o script que inspecciona HTML/CSV export por fugas de path. |

---

## Deploy / infraestructura

| ID | Título | Descripción | Origen | Prioridad | Esfuerzo | Tipo | Criterio de aceptación |
|----|--------|-------------|--------|-----------|----------|------|------------------------|
| **BACK-INFRA-003** | Pipeline deploy staging (sin prod aún) | CI solo verifica; falta job o proceso manual documentado para desplegar `main` a staging. | idea producto | **P1** | L | hardening | Documento «deploy staging» con pasos; opcional workflow `deploy-staging.yml` manual. |
| **BACK-INFRA-004** | BD gestionada en staging/prod | PostgreSQL local no escala; migraciones con `prisma migrate deploy` en CI ya probado. | riesgo | **P1** | M | hardening | Instancia gestionada; backup diario; `migrate deploy` en release. |
| **BACK-INFRA-005** | Health check y observabilidad mínima | Sin endpoint `/health` ni logs estructurados para operación. | idea producto | **P2** | S | mejora | Ruta health (app + BD); logs de error accesibles en staging. |
| **BACK-INFRA-006** | Dominio, HTTPS y `NEXTAUTH_URL` producción | Demo corrigió desajuste puerto local; staging/prod requieren URL canónica. | demo | **P1** | S | hardening | `NEXTAUTH_URL` coincide con URL pública; cookies secure en HTTPS. |

---

## OCR / IA futura

| ID | Título | Descripción | Origen | Prioridad | Esfuerzo | Tipo | Criterio de aceptación |
|----|--------|-------------|--------|-----------|----------|------|------------------------|
| **BACK-OCR-001** | OCR experimental: no ampliar sin decisión explícita | Fase 10I cerró OCR como diagnóstico; benchmark no listo para producción. Flag off en CI y demo productiva. | checklist | **P3** | — | docs | Ningún trabajo de producto en OCR salvo ticket explícito aprobado por producto. **Política activa.** |
| **BACK-OCR-002** | Mantener docs y scripts OCR en modo mantenimiento | `verify:title-block-crop`, `benchmark:ocr`, `check:tesseract` siguen en CI/local sin integrar UI productiva. | deuda técnica | **P3** | S | docs | Scripts no rotos; README indica alcance experimental. |
| **BACK-OCR-003** | Investigación IA multimodal (futuro) | ocr-ai-research § pipeline futuro: asistencia revisión, no palillería automática. | investigación | **P3** | L | investigación | Documento de viabilidad si negocio lo pide; sin implementación en MVP. |
| **BACK-OCR-004** | `.env.example` flag OCR por defecto | Riesgo 11A: `EXPERIMENTAL_TITLE_BLOCK_OCR=true` puede confundir; prod/staging deben usar `false`. | riesgo | **P2** | S | docs | `.env.example` con `false` y comentario; staging documentado. |

---

## Documentación

| ID | Título | Descripción | Origen | Prioridad | Esfuerzo | Tipo | Criterio de aceptación |
|----|--------|-------------|--------|-----------|----------|------|------------------------|
| **BACK-DOC-003** | Runbook demo externa | Guion + datos + URL staging + rollback para presentación a cliente/inversor. | idea producto | **P1** | M | docs | `docs/demo-externa-runbook.md` o sección en checklist con pasos &lt;30 min. |
| **BACK-DOC-004** | Sincronizar internal-release-checklist con estado post-12B | Checklist aún cita commit `516b84c` y riesgo «README desactualizado» ya resuelto. | deuda técnica | **P2** | S | docs | Referencias y riesgos al día; enlace a este backlog. |
| **BACK-DOC-005** | ADR decisión CSV (ver BACK-PROD-001) | Si se decide migrar CSV a API, documentar trade-offs. | riesgo | **P2** | S | docs | ADR publicado en `docs/adr/` o sección en takeoff-hardening. |
| **BACK-DOC-006** | Cerrar DEMO-03 y DEMO-07 en informe demo | Tras E2E o decisión CSV, actualizar tabla de incidencias en informe 11B. | demo | **P2** | S | docs | DEMO-03 cerrado con ref a spec E2E; DEMO-07 cerrado o «aceptado» con ADR. |

---

## Resumen por prioridad

| Prioridad | Cantidad (pendientes) | Notas |
|-----------|----------------------|--------|
| **P0** | 5 | Staging, S3, multi-tenant, E2E núcleo, datos demo |
| **P1** | 14 | E2E ampliado, CSV, onboarding, deploy staging, seguridad operativa |
| **P2** | 14 | Deuda Next/middleware, UX, docs, OCR env, API tests |
| **P3** | 3 | OCR/IA congelado + mantenimiento scripts |
| **Cerrados** | 4 | README, CI, observaciones 11C, E2E básico 12A |

*Total ítems en backlog: 40 (36 pendientes + 4 cerrados).*

---

## Recomendación: tres fases justo después de la demo

### Fase A — Confianza en el flujo (E2E + QA)

**Objetivo:** Cerrar gaps de la demo manual (DEMO-03, DEMO-07) con automatización y checklist actualizado.

- BACK-E2E-002 / BACK-E2E-003 (subida, detección, confirmación, Listo)
- BACK-E2E-004, BACK-E2E-005, BACK-E2E-006 (import, descargas, delete drawing)
- BACK-E2E-007 (artifacts CI)
- BACK-PROD-001 (decisión CSV documentada o implementada)
- BACK-DEMO-002 (seed demo presentación)

**Entregable:** Suite E2E cubre el flujo productivo de punta a punta; CI sigue verde.

### Fase B — Listo para miradas externas (staging + seguridad)

**Objetivo:** Dejar de depender del portátil del desarrollador.

- BACK-INFRA-001, BACK-INFRA-002, BACK-INFRA-003, BACK-INFRA-004, BACK-INFRA-006
- BACK-SEC-001 / BACK-SEC-002 (auditoría multi-tenant)
- BACK-SEC-003, BACK-SEC-004
- BACK-DOC-003 (runbook demo externa)

**Entregable:** URL staging estable, PDFs en storage remoto, auditoría tenant documentada.

### Fase C — Pulido producto y deuda controlada

**Objetivo:** Primer contacto externo sin sorpresas de UX ni warnings ruidosos.

- BACK-UX-001, BACK-UX-002, BACK-UX-004
- BACK-TECH-001, BACK-TECH-002 (middleware/proxy, NFT warning)
- BACK-DOC-002, BACK-DOC-004
- BACK-OCR-004 (`.env.example` flag false)

**Entregable:** Onboarding probado, build más limpio, documentación alineada con `main`.

---

## Qué NO tocar todavía

| Área | Motivo |
|------|--------|
| **OCR como flujo productivo** | Decisión 10I + benchmark: no fiable; solo diagnóstico con flag explícito (BACK-OCR-001). |
| **IA multimodal / palillería automática** | Alto riesgo; fuera de MVP; investigación P3. |
| **Deploy producción multi-cliente** | Sin staging estable y S3 probado (Fase B primero). |
| **Cambios Prisma / migraciones por OCR** | Regla de proyecto; OCR no persiste candidatos. |
| **Paralelizar workers E2E** | BD compartida; mantener `workers: 1` hasta aislamiento por test. |
| **Tesseract en CI** | No aporta al flujo productivo; alarga job sin valor MVP. |
| **Refactors grandes de arquitectura** | Minimizar scope; priorizar hardening y cobertura del flujo existente. |

---

## Referencias cruzadas

| Documento | Relación con backlog |
|-----------|---------------------|
| [internal-release-checklist.md](./internal-release-checklist.md) | Origen de ítems checklist y riesgos |
| [internal-demo-run-2026-06-09.md](./internal-demo-run-2026-06-09.md) | DEMO-03, DEMO-07 abiertos |
| [e2e-testing-notes.md](./e2e-testing-notes.md) | Limitaciones 12A → BACK-E2E-003–009 |
| [takeoff-hardening-checklist.md](./takeoff-hardening-checklist.md) | Invalidación, exports → BACK-TECH-005, BACK-PROD-001 |
| [ocr-ai-research.md](./ocr-ai-research.md) | Cierre 10I → BACK-OCR-001 |
| [ocr-benchmark-results.md](./ocr-benchmark-results.md) | Evidencia «no producción» |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | BACK-CI-001 cerrado |

---

## Registro

| Fecha | Autor | Commit ref | Notas |
|-------|-------|------------|-------|
| 2026-06-08 | Fase 13A | `f069ceb` | Backlog inicial post-demo interna |
