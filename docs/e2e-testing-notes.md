# Notas E2E — Fase 12A

> Tests con [Playwright](https://playwright.dev/) sobre el MVP actual. Sin cobertura de OCR/Tesseract ni flujo completo de subida PDF.

## Requisitos

- PostgreSQL local con migraciones aplicadas (`npm run db:migrate`)
- `.env` configurado (misma BD que desarrollo)
- Chromium instalado: `npx playwright install chromium` (tras `npm install`)

## Comandos

```bash
npm run db:seed:e2e    # datos fijos E2E (también en global-setup de Playwright)
npm run test:e2e       # suite headless
npm run test:e2e:ui    # modo UI interactivo
```

El servidor de prueba hace `build` + `start` en **puerto 3100** (`E2E_PORT` para override). No uses `next dev` en paralelo en el mismo directorio (bloqueo de Next 16).

Variables del servidor E2E:

- `NEXTAUTH_URL=http://localhost:3100`
- `EXPERIMENTAL_TITLE_BLOCK_OCR=false`

## Datos de prueba (`scripts/seed-e2e.ts`)

| Recurso | Id / valor |
|---------|------------|
| Empresa E2E | `seed-company-e2e` |
| Trabajo E2E | `seed-job-e2e` |
| Plano con metadatos + palillería | `seed-drawing-e2e-pending` |
| Owner | `e2e-owner@palilleria.local` / `demo1234` |
| Engineer | `e2e-engineer@palilleria.local` / `demo1234` |
| Viewer | `e2e-viewer@palilleria.local` / `demo1234` |
| Cross-tenant | `demo@palilleria.local` en `seed-company-demo` |

El seed **resetea** `takeoffReviewedAt` del plano E2E en cada ejecución para que el test «Listo» sea reproducible.

## Tests incluidos (`tests/e2e/`)

| Archivo | Cobertura |
|---------|-----------|
| `auth.spec.ts` | Redirect sin sesión, login, acceso dashboard/trabajo |
| `viewer-permissions.spec.ts` | Lectura + export; sin edición |
| `engineer-permissions.spec.ts` | Subida/detección/palillería; sin eliminar plano |
| `protected-pdf.spec.ts` | API PDF 401 / 200 / 403 cross-tenant |
| `ready-flow.spec.ts` | Marcar revisada → Listo → KPI + consolidado solo listos |
| `ocr-flag.spec.ts` | Sin bloque OCR experimental; detección productiva visible |

## `data-testid` añadidos (mínimos)

`login-form`, `job-upload-drawings`, `detect-metadata`, `takeoff-add-line`, `takeoff-import-csv`, `export-job-csv`, `export-job-excel`, `confirm-takeoff-review`, `delete-drawing`, `ocr-experimental-section`.

## Limitaciones / fuera de alcance 12A

- Subida real de PDF por UI
- Detección/confirmación de metadatos de punta a punta
- Import CSV por UI
- Descarga verificada de CSV/Excel (solo botones habilitados)
- OCR con Tesseract o flag `true`
- Múltiples workers en paralelo (BD compartida; `workers: 1`)
- CI/CD pipeline (configurar `CI=1` en fase posterior)

## Depuración

- Informe HTML: `playwright-report/` tras fallo
- Re-ejecutar un archivo: `npx playwright test tests/e2e/auth.spec.ts`
- Cada ejecución de `test:e2e` construye y arranca su propio servidor (≈1–2 min la primera vez)
