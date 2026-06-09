# Demo interna — 2026-06-09

> **Fase 11B** — Ejecución manual del [checklist de release interno](./internal-release-checklist.md).  
> Sin cambios de código ni corrección de incidencias en esta fase.

## Metadatos de la ejecución

| Campo | Valor |
|-------|-------|
| **Commit probado** | `d8d2f1c` |
| **Entorno** | Local (`npm run dev` en puerto **3010** — instancia previa en ejecución) |
| **Base de datos** | PostgreSQL local (`palilleria`) |
| **Revisor** | Antonio |
| **Fecha** | 2026-06-09 |
| **Resultado general** | **Aprobado con observaciones** |

### Datos de prueba usados

| Recurso | Valor |
|---------|-------|
| Empresa principal | Agencia Adhoc (`cmq59yda70001o9qewato82p8`) |
| Trabajo | Prueba numero 2 (`cmq5a8ic50009o9qegcl9k1a6`) |
| Plano con metadatos + palillería | `1601GB16A-PL1-L-DMS-703-01-R03.pdf` (`cmq5cxqwk000ho9i12qwjz667`) |
| Plano sin metadatos | `2301GB47G-C1-L-HL-1289-01.pdf` (`cmq5g1lbc001to97crryu2kcr`) |
| Usuario owner (BD) | `antoniogamez@agenciaadhoc.com` |
| Usuario engineer (creado para demo) | `engineer-demo@palilleria.local` / `demo1234` |
| Usuario viewer (creado para demo) | `viewer-demo@palilleria.local` / `demo1234` |
| Usuario seed | `demo@palilleria.local` / `demo1234` (Empresa Demo, sin planos) |

> **Nota:** Para probar roles viewer/engineer sin tocar código se añadieron dos miembros de prueba en la empresa Agencia Adhoc. El seed (`npm run db:seed`) también se ejecutó para validar login con credenciales documentadas.

### Variables de entorno relevantes

- `EXPERIMENTAL_TITLE_BLOCK_OCR=true`
- `NEXTAUTH_URL=http://localhost:3000` (desajuste con dev en **3010** — ver incidencia DEMO-01)
- `STORAGE_DRIVER=local`, `LOCAL_STORAGE_PATH=./storage`

---

## Verificaciones automáticas

| Comando | Resultado |
|---------|-----------|
| `npm run lint` | OK |
| `npm run build` | OK (warnings conocidos: middleware deprecated, NFT trace) |
| `npm run verify:takeoff` | OK |
| `npm run verify:title-block-crop` | OK |

---

## Resumen por flujo obligatorio

| Flujo | Resultado | Notas |
|-------|-----------|-------|
| Login | OK | Auth.js credentials vía API; `demo@palilleria.local` y usuarios de prueba |
| Empresa / trabajo | OK | Listado y detalle de «Prueba numero 2» accesibles con sesión |
| Subida PDF | Parcial | Engineer: página upload HTTP 200; viewer: redirect 307 al trabajo (bloqueado). No se subió un PDF nuevo en esta sesión |
| Visualización protegida | OK | PDF `200 application/pdf` con sesión; `401` sin sesión |
| Detección metadatos productiva | Parcial | UI «Detectar metadatos» presente en plano `uploaded`; plano principal ya en `reviewed` con DMS-703 / PL1-L / R03. No se pulsó detectar en sesión |
| Confirmación metadatos | Parcial | Plano principal ya confirmado (`status: reviewed`). UI de confirmación no visible (esperado) |
| Creación líneas palillería | OK (estado BD) | 16 líneas en BD; 8 en plano principal; UI engineer muestra «Añadir línea» |
| Revisión palillería | Parcial | Botón «Marcar palillería como revisada» visible (engineer). **Ningún plano con `takeoffReviewedAt` en BD** — acción no ejecutada |
| Progreso «Listo» | No verificado E2E | Plano principal muestra **«Revisar palillería»** (correcto dado `takeoffReviewedAt: null`). 0 planos en estado `ready` |
| Consolidado por trabajo | OK | Sección visible; 16 líneas exportables; agrupación coherente en datos |
| Export CSV plano | OK (UI) | Botón presente engineer y viewer; generación client-side (no descargado a disco en sesión automatizada) |
| Export CSV trabajo | OK (UI) | «Exportar palillería CSV» en detalle del trabajo |
| Export Excel trabajo | OK | HTTP `200`; archivo `.xlsx` válido; hojas **Resumen**, **Consolidado**, **Detalle** |
| Viewer lectura/export | OK | Sin «Añadir línea», import ni detectar; con export CSV/Excel |
| OCR experimental | Parcial | Con flag **on**: bloque «Herramientas experimentales» visible (engineer). Flag **off** no probado (requiere reinicio) |

---

## Detalle por sección del checklist

### 1. Autenticación y roles

| ID | Comprobación | OK |
|----|--------------|-----|
| 1.1 | Registro | No ejecutado |
| 1.2 | Login | Sí |
| 1.3 | Logout | Parcial (sesión invalidada tras signout API) |
| 1.4 | Sin sesión → redirect login | Sí (`/dashboard` → 302) |
| 1.5–1.6 | Onboarding empresa | No ejecutado (cuenta con empresa existente) |
| 1.7 | Seed dev | Sí (`npm run db:seed`) |

### 2–3. Compañías, trabajos, subida

| ID | Comprobación | OK |
|----|--------------|-----|
| 2.1–2.3 | Listado / detalle trabajo | Sí |
| 2.4 | Cross-tenant | Sí (Excel API `403` con usuario Empresa Demo) |
| 2.5 | Progreso en cabecera | Sí («listos» / «pendientes» en HTML) |
| 3.1 | Upload engineer | Sí (página 200) |
| 3.2 | Upload viewer bloqueado | Sí (redirect) |
| 3.3–3.5 | PDF / storage / lista | Parcial (datos preexistentes; sin subida nueva) |
| 3.6 | Eliminar plano | No ejecutado |

### 4. Descarga / visualización protegida

| ID | Comprobación | OK |
|----|--------------|-----|
| 4.1 | PDF con sesión | Sí |
| 4.2 | Sin sesión → 401 | Sí |
| 4.3 | Cross-tenant → 403 | Sí |
| 4.4 | Sin `storagePath` en HTML | Sí (0 coincidencias) |
| 4.5 | Visor PDF en UI | Asumido OK (misma ruta API sirve inline) |

### 5–6. Detección y revisión de metadatos

| ID | Comprobación | OK |
|----|--------------|-----|
| 5.1 | Detectar (engineer) | UI sí |
| 5.2 | Sin OCR productivo | Sí (flujo separado) |
| 5.3–5.6 | Feedback / estados | Parcial (plano ya detectado/revisado; plano `uploaded` muestra «Faltan metadatos») |
| 6.1–6.4 | Revisión metadatos | Parcial (estado `reviewed` en plano principal) |

### 7–8. Progreso y palillería

| ID | Comprobación | OK |
|----|--------------|-----|
| 7.1–7.2 | Badges y resumen | Sí |
| 7.3 | Filtro solo listos | No ejecutado clic a clic |
| 8.1–8.4 | CRUD / viewer RO | Parcial (BD + UI; sin crear línea nueva en sesión) |
| 8.5 | Marcar revisada | UI sí; acción no ejecutada |
| 8.6–8.7 | Invalidación revisión | No ejecutado |

### 9–12. Import, exports, consolidado

| ID | Comprobación | OK |
|----|--------------|-----|
| 9.1–9.4 | Import CSV | No ejecutado |
| 10.1–10.6 | Export CSV | UI sí; inyección CSV verificada en unit (`protectCsvExportCell`) |
| 11.1–11.5 | Export Excel | Sí (API + hojas + 400 sin líneas en job seed) |
| 12.1–12.5 | Consolidado | Sí (sección visible; datos con 16 líneas) |

### 13–15. Permisos, OCR, empty states

| ID | Comprobación | OK |
|----|--------------|-----|
| 13.1 | Flujo engineer | Parcial |
| 13.2 | Viewer lectura/export | Sí |
| 13.3 | Eliminar plano admin | No ejecutado |
| 14.1 | OCR oculto flag off | No ejecutado |
| 14.2–14.5 | OCR experimental flag on | Parcial (sección visible; copy no fiable en componente cliente) |
| 15.1–15.5 | Empty states / errores | Parcial (400 Excel job vacío verificado) |

---

## Incidencias

| ID | Severidad | Área | Descripción | Pasos para reproducir | Esperado | Actual | Estado |
|----|-----------|------|-------------|----------------------|----------|--------|--------|
| DEMO-01 | minor | auth / config | `NEXTAUTH_URL` apunta a `:3000` pero el dev server activo está en `:3010` | Arrancar `npm run dev` cuando ya hay instancia en 3010; acceder vía 3010; visitar `/dashboard` sin sesión | Redirect a login en el mismo origen (3010) | Redirect a `http://localhost:3000/login?...` | abierto |
| DEMO-02 | major | takeoff / progreso | Estado **«Listo»** no alcanzado en la sesión de demo | Trabajo Prueba 2 → plano DMS-703 → palillería con 8 líneas sin marcar revisada | Tras marcar revisada, progreso «Listo» | Sigue «Revisar palillería»; `takeoffReviewedAt` null en todos los planos | pendiente |
| DEMO-03 | note | demo / cobertura | Subida PDF, detección y confirmación de metadatos no re-ejecutadas clic a clic | — | Flujo completo en sesión | Validado por estado BD + presencia UI en planos `uploaded` / `reviewed` | abierto |
| DEMO-04 | note | roles | Rol viewer probado con usuario sintético, no con invitación real | Crear `viewer-demo@palilleria.local` en empresa | Mismo comportamiento que viewer de producción | Comportamiento coherente con permisos en código | descartado |
| DEMO-05 | minor | OCR | Flag `EXPERIMENTAL_TITLE_BLOCK_OCR=false` no verificado en sesión | Cambiar `.env`, reiniciar dev, abrir tab Automatización | Bloque OCR ausente | No probado (flag `true` en `.env`) | pendiente |
| DEMO-06 | note | docs | README indica «Fase 3» | Abrir `README.md` | Estado MVP actual | Desactualizado | descartado (riesgo conocido 11A) |
| DEMO-07 | note | export CSV | Export CSV es client-side (snapshot de página) | Editar palillería sin refrescar → exportar | Datos frescos | Riesgo documentado; no reprobado en sesión | abierto |

---

## Criterio demo-ready (checklist)

### Automático — cumplido

- [x] lint, build, verify:takeoff, verify:title-block-crop

### Flujo productivo manual — parcial

- [x] Login → empresa → trabajo
- [~] Subir PDF (permisos OK; sin archivo nuevo)
- [~] Detectar → confirmar metadatos (estado preexistente)
- [x] Palillería con líneas (BD)
- [ ] Marcar revisada → **Listo** (no completado)
- [x] Consolidado con datos
- [~] Export CSV (UI; sin descarga verificada en disco)
- [x] Export Excel
- [x] Viewer lectura + export; sin edición

### Seguridad mínima — cumplido

- [x] PDF sin sesión → 401
- [x] Cross-tenant → 403
- [x] Sin filtrado de `storagePath`

### OCR — parcial

- [x] Con flag on: sección experimental separada
- [ ] Con flag off: no verificado

---

## Conclusión

El MVP es **demostrable internamente** para el flujo principal (auth, multi-tenant, PDF protegido, metadatos, palillería, consolidado, exports Excel/CSV, permisos viewer). La sesión deja **observaciones** porque:

1. No se completó el último paso hasta **«Listo»** (revisión de palillería).
2. Varios pasos del checklist se validaron por **estado existente en BD** y comprobaciones HTTP/HTML, no por un recorrido UI completo de punta a punta.
3. Desajuste menor `NEXTAUTH_URL` / puerto dev.
4. OCR con flag desactivado sin verificar.

**No hay blockers** que impidan una demo interna guiada; sí conviene marcar revisada un plano antes de la presentación y alinear `NEXTAUTH_URL` con el puerto real.

---

## Siguiente paso sugerido (fuera de 11B)

- Fase posterior: corregir DEMO-01, completar flujo hasta «Listo», actualizar README.
- Opcional: E2E Playwright para roles y flujo completo.
