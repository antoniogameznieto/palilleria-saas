# Palillería SaaS

SaaS multiempresa para ingenieros que generan **hoja de palillería** a partir de planos isométricos de tuberías (PDF).

## Qué incluye el MVP

Flujo productivo actual:

1. **Subida protegida de PDFs** por trabajo (solo `owner`, `admin`, `engineer`).
2. **Detección de metadatos** por nombre de archivo y texto embebido del PDF (sin OCR).
3. **Revisión manual** de nº de plano, línea y revisión antes de dar por buenos los metadatos.
4. **Palillería / takeoff** manual por plano (crear, editar, duplicar, importar CSV).
5. **Revisión de palillería** por plano y estados de progreso hasta **Listo**.
6. **Consolidado por trabajo** (agrupación por referencia, descripción y unidad).
7. **Export CSV** (plano y trabajo, client-side) y **export Excel** (trabajo, vía API).

Otros aspectos:

- **Autenticación** con email/contraseña (Auth.js) y onboarding de empresa.
- **Roles y permisos** por empresa: `owner`, `admin`, `engineer`, `viewer` (lectura y export sin edición).
- **Visualización y descarga protegida** de PDFs (sin exponer rutas de storage al cliente).
- **OCR del cajetín** como herramienta **experimental de diagnóstico** (`EXPERIMENTAL_TITLE_BLOCK_OCR`); no forma parte del flujo productivo ni sustituye la revisión manual.
- **Preview experimental de palillería** desde relación de materiales del PDF embebido (pestaña Automatización); no guarda líneas ni sustituye la revisión manual. Ver [docs/auto-takeoff-research.md](docs/auto-takeoff-research.md).

## Estado actual

| | |
|---|---|
| **Demo interna guiada** | Apta |
| **Último commit base** | `9cefef5` |
| **Release interno** | OK — observaciones menores cerradas (Fases 11A–11C) |

Informe de la última demo: [docs/internal-demo-run-2026-06-09.md](docs/internal-demo-run-2026-06-09.md).

## Requisitos

- **Node.js** 20 o superior
- **npm** 10 o superior
- **PostgreSQL** 15+

## Arranque local

```bash
git clone https://github.com/antoniogameznieto/palilleria-saas.git
cd palilleria-saas
npm install
cp .env.example .env
# Opcional: overrides locales (puerto, flags) sin tocar .env
cp .env.example .env.local   # y edita solo lo que necesites
```

### 1. Configurar entorno

Edita `.env` (o `.env.local` para overrides) con al menos:

```env
DATABASE_URL="postgresql://TU_USUARIO@localhost:5432/palilleria?schema=public"
AUTH_SECRET="tu-secreto-aleatorio"          # openssl rand -base64 32
NEXTAUTH_SECRET="tu-secreto-aleatorio"
NEXTAUTH_URL="http://localhost:3000"
```

Crea la base de datos si no existe:

```bash
createdb palilleria
```

**Puerto y `NEXTAUTH_URL`:** por defecto el dev server usa el puerto **3000**. Si arrancas en otro puerto (p. ej. `npm run dev -- -p 3010` porque 3000 está ocupado), define en `.env.local`:

```env
NEXTAUTH_URL="http://localhost:3010"
```

Los redirects del middleware usan el `Host` de la petición; Auth.js sigue usando `NEXTAUTH_URL` en callbacks de la API de sesión.

### 2. Base de datos

```bash
npm run db:generate   # genera el cliente Prisma
npm run db:migrate      # aplica migraciones en desarrollo
```

### 3. Seed opcional (desarrollo)

```bash
npm run db:seed
```

Crea usuario, empresa y trabajo de ejemplo (ver [Usuarios demo](#usuarios-demo)).

### 4. Servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) (o el puerto que uses).

### Flujo de autenticación

1. **Registro** en `/register` → crea usuario y abre sesión.
2. Sin empresa → redirección a `/onboarding/company`.
3. Crear empresa → queda como `owner` → `/dashboard`.
4. **Login** en `/login` → `/dashboard` u onboarding según empresas.
5. **Logout** desde el header del panel.

### Rutas principales

| Ruta | Acceso |
|------|--------|
| `/` | Público |
| `/login`, `/register` | Público (redirige si hay sesión) |
| `/onboarding/company` | Requiere sesión |
| `/companies/[id]/jobs`, `/dashboard`, `/settings`, `/users` | Requiere sesión y empresa |

## Usuarios demo

### Seed (`npm run db:seed`)

| Campo | Valor |
|-------|-------|
| Usuario | `demo@palilleria.local` |
| Contraseña | `demo1234` |
| Empresa | Empresa Demo |
| Trabajo | Trabajo Demo |

### E2E (`npm run db:seed:e2e`)

Usuarios y datos fijos para tests Playwright (empresa `seed-company-e2e`, trabajo `seed-job-e2e`):

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `e2e-owner@palilleria.local` | `demo1234` | `owner` |
| `e2e-engineer@palilleria.local` | `demo1234` | `engineer` |
| `e2e-viewer@palilleria.local` | `demo1234` | `viewer` |

Ver [docs/e2e-testing-notes.md](docs/e2e-testing-notes.md).

Para demo manual con datos reales, usa tu cuenta local o el plano de referencia en el [informe de demo](docs/internal-demo-run-2026-06-09.md).

## CI

GitHub Actions ejecuta en cada **push a `main`** y en **pull requests** el workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. `npm ci` + Chromium (Playwright)
2. `prisma migrate deploy` sobre PostgreSQL 16 (service container)
3. `npm run lint`
4. `npm run build`
5. `npm run verify:takeoff`
6. `npm run verify:title-block-crop`
7. `npm run test:e2e` (seed E2E vía `global-setup` de Playwright)

Sin deploy. Ver [docs/e2e-testing-notes.md](docs/e2e-testing-notes.md) para detalles y limitaciones en CI.

## Comandos de verificación

Ejecutar antes de una demo o release interno:

```bash
npm run lint
npm run build
npm run verify:takeoff
npm run verify:title-block-crop   # funciones puras OCR experimental
npm run test:e2e                  # Playwright (requiere BD + migraciones)
```

Opcional:

```bash
npm run check:tesseract           # OCR experimental en local
npm run test:e2e:ui               # Playwright modo UI
```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Prisma Client + build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run db:generate` | Genera el cliente Prisma |
| `npm run db:migrate` | Aplica migraciones en desarrollo |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed de desarrollo |
| `npm run verify:takeoff` | Verificación pura de lógica takeoff |
| `npm run verify:title-block-crop` | Verificación recorte cajetín (OCR exp.) |
| `npm run check:tesseract` | Comprueba Tesseract CLI (OCR exp.) |
| `npm run benchmark:ocr` | Benchmark OCR experimental |
| `npm run research:auto-takeoff` | Investigación materiales desde PDF embebido |
| `npm run verify:auto-takeoff` | Verificación parser auto-takeoff experimental |
| `npm run db:seed:e2e` | Seed datos fijos para E2E |
| `npm run test:e2e` | Tests E2E Playwright |
| `npm run test:e2e:ui` | Tests E2E (modo UI) |

## Documentación útil

| Documento | Contenido |
|-----------|-----------|
| [docs/internal-release-checklist.md](docs/internal-release-checklist.md) | Checklist de release y demo interna |
| [docs/internal-demo-run-2026-06-09.md](docs/internal-demo-run-2026-06-09.md) | Informe de demo manual (11B) y seguimiento 11C |
| [docs/takeoff-hardening-checklist.md](docs/takeoff-hardening-checklist.md) | Palillería, permisos, exports |
| [docs/ocr-ai-research.md](docs/ocr-ai-research.md) | Investigación OCR (experimental, no productivo) |
| [docs/ocr-benchmark-results.md](docs/ocr-benchmark-results.md) | Resultados benchmark OCR |
| [docs/tesseract-ocr-setup.md](docs/tesseract-ocr-setup.md) | Instalación Tesseract (solo OCR exp.) |
| [docs/e2e-testing-notes.md](docs/e2e-testing-notes.md) | Tests E2E Playwright (Fase 12A) |
| [docs/post-demo-backlog.md](docs/post-demo-backlog.md) | Backlog priorizado post-demo interna |
| [docs/auto-takeoff-research.md](docs/auto-takeoff-research.md) | Auto-takeoff desde PDF embebido (14A/14B) |
| `cursor-palilleria-docs/` | Especificación funcional del producto |

## Limitaciones conocidas

- **OCR no productivo:** la detección de metadatos usa filename + texto PDF; el OCR del cajetín es solo diagnóstico detrás de `EXPERIMENTAL_TITLE_BLOCK_OCR`.
- **Revisión manual obligatoria** de metadatos y palillería (por diseño).
- **Export CSV client-side:** se genera en el navegador desde el snapshot de la página; refrescar tras editar si necesitas datos al día. Excel usa API servidor (datos frescos).
- **Storage local** (`STORAGE_DRIVER=local`): adecuado para dev; no listo para producción multi-nodo (S3 previsto en configuración).
- **E2E parcial (Playwright):** auth, permisos viewer/engineer, PDF API, flujo Listo, OCR oculto con flag off. Sin subida PDF ni detección completa por UI. Ver [e2e-testing-notes.md](docs/e2e-testing-notes.md).
- **Middleware deprecated (Next.js 16):** convención `middleware` pendiente de migrar a `proxy`; no bloquea demo interna.
- **README:** actualizado en Fase 11D (`a6d8d12`).

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4 + shadcn/ui
- React Hook Form + Zod
- PostgreSQL + Prisma 6
- Auth.js / NextAuth 5 (Credentials)

## Estructura del proyecto

```
app/
  (auth)/             # Login y registro
  (main)/             # Panel con sidebar (protegido)
  onboarding/         # Creación de primera empresa
  api/                # Auth, archivos PDF, export Excel
lib/
  auth/               # Auth.js y sesión
  actions/            # Server actions
  drawings/           # Metadatos, takeoff, exports, OCR exp.
  permissions/        # Roles por empresa
prisma/               # Schema, migraciones y seed
docs/                 # Checklists, demo, OCR
```

## Variables de entorno

Ver [.env.example](.env.example):

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL (**requerida**) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Secreto de sesión (**requerida**) |
| `NEXTAUTH_URL` | URL base de la app |
| `STORAGE_DRIVER`, `LOCAL_STORAGE_PATH`, `MAX_UPLOAD_SIZE_MB` | Almacenamiento de PDFs |
| `EXPERIMENTAL_TITLE_BLOCK_OCR` | `true` = muestra OCR experimental en Automatización |
