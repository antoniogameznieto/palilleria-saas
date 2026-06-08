# Palillería SaaS

SaaS multiempresa para ingenieros que generan **hoja de palillería** e **isos trameados** a partir de planos isométricos de tuberías.

## Requisitos

- **Node.js** 20 o superior
- **npm** 10 o superior
- **PostgreSQL** 15+

## Instalación

```bash
git clone https://github.com/antoniogameznieto/palilleria-saas.git
cd palilleria-saas
npm install
cp .env.example .env
```

## Configuración de `.env`

Edita `.env` con estos valores mínimos:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/palilleria?schema=public"
NEXTAUTH_SECRET="tu-secreto-aleatorio"
NEXTAUTH_URL="http://localhost:3000"
```

Generar `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Base de datos (Prisma)

```bash
# Generar cliente Prisma
npm run db:generate

# Crear base de datos y aplicar migraciones
npm run db:migrate
```

### Seed opcional (desarrollo)

```bash
npm run db:seed
```

| Recurso | Valor |
|---------|-------|
| Usuario | `demo@palilleria.local` |
| Contraseña | `demo1234` |
| Empresa | Empresa Demo |
| Trabajo | Trabajo Demo |

## Arranque en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Flujo de autenticación

1. **Registro** en `/register` → crea usuario y abre sesión.
2. Si no tiene empresa → redirección a `/onboarding/company`.
3. Crea empresa → queda como `owner` → redirección a `/dashboard`.
4. **Login** en `/login` → redirección a `/dashboard` o onboarding según empresas.
5. **Logout** desde el header del panel.

### Rutas principales

| Ruta | Acceso |
|------|--------|
| `/` | Público |
| `/login`, `/register` | Público (redirige si hay sesión) |
| `/onboarding/company` | Requiere sesión |
| `/dashboard`, `/jobs`, `/settings`, `/users` | Requiere sesión y empresa |

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Genera Prisma Client y build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run db:generate` | Genera el cliente Prisma |
| `npm run db:migrate` | Aplica migraciones en desarrollo |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run db:seed` | Ejecuta el seed de desarrollo |

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
  api/auth/           # Rutas Auth.js
lib/
  auth/               # Configuración Auth.js y helpers de sesión
  actions/            # Server actions (auth, empresa)
  db/                 # Cliente Prisma
prisma/               # Schema, migraciones y seed
```

## Variables de entorno

Ver `.env.example`:

- `DATABASE_URL` — conexión PostgreSQL (**requerida**)
- `NEXTAUTH_SECRET` — secreto de sesión (**requerida**)
- `NEXTAUTH_URL` — URL base de la app
- `STORAGE_DRIVER`, `LOCAL_STORAGE_PATH`, `MAX_UPLOAD_SIZE_MB` — almacenamiento (fases posteriores)

## Documentación del producto

Especificación funcional en `cursor-palilleria-docs/`.

## Estado actual

**Fase 3 completada:** autenticación con email/contraseña, rutas protegidas y onboarding de empresa.

Próximo paso: **Fase 4** — helpers multiempresa, permisos por rol y CRUD de trabajos.
