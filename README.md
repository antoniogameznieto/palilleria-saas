# Palillería SaaS

SaaS multiempresa para ingenieros que generan **hoja de palillería** e **isos trameados** a partir de planos isométricos de tuberías.

## Requisitos

- **Node.js** 20 o superior
- **npm** 10 o superior
- **PostgreSQL** 15+

## Instalación

```bash
# 1. Clonar el repositorio y entrar en la carpeta del proyecto
git clone https://github.com/antoniogameznieto/palilleria-saas.git
cd palilleria-saas

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env
```

Edita `.env` y configura al menos `DATABASE_URL` con tu instancia PostgreSQL local.

Ejemplo:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/palilleria?schema=public"
```

## Base de datos (Prisma)

La migración inicial está en `prisma/migrations/`. Para aplicarla en local:

```bash
# Generar el cliente Prisma
npm run db:generate

# Crear la base de datos en PostgreSQL y aplicar migraciones
npm run db:migrate
```

En la primera ejecución de `db:migrate`, Prisma pedirá un nombre si hiciera falta; con el repo actual aplica la migración `20250608120000_init`.

### Seed opcional (desarrollo)

Con PostgreSQL en marcha y migraciones aplicadas:

```bash
npm run db:seed
```

Crea datos de demo:

| Recurso | Valor |
|---------|-------|
| Usuario | `demo@palilleria.local` |
| Contraseña | `demo1234` |
| Empresa | Empresa Demo |
| Trabajo | Trabajo Demo |

### Prisma Studio

```bash
npm run db:studio
```

## Arranque en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

- `/` — página de bienvenida
- `/dashboard` — dashboard con layout y sidebar (placeholder)
- `/jobs`, `/settings`, `/users` — rutas preparadas sin lógica de negocio

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
- Tailwind CSS v4
- shadcn/ui
- React Hook Form + Zod
- PostgreSQL + Prisma 6
- Auth.js / NextAuth *(Fase 3)*

## Estructura del proyecto

```
app/                  # Rutas y layouts (App Router)
components/           # Componentes de aplicación
components/ui/        # Componentes shadcn/ui
lib/
  auth/               # Autenticación (pendiente)
  db/                 # Cliente Prisma singleton
  storage/            # Almacenamiento de PDFs (pendiente)
  permissions/        # Seguridad multiempresa (pendiente)
  validations/        # Zod + resolvers para formularios
prisma/
  schema.prisma       # Modelo de datos
  migrations/         # Migraciones SQL
  seed.ts             # Seed de desarrollo
storage/              # PDFs locales en desarrollo (gitignored)
```

## Variables de entorno

Ver `.env.example`:

- `DATABASE_URL` — conexión PostgreSQL (**requerida** para migrar y seed)
- `NEXTAUTH_SECRET` — secreto de sesión *(Fase 3)*
- `NEXTAUTH_URL` — URL base de la app *(Fase 3)*
- `STORAGE_DRIVER` — `local` (por defecto)
- `LOCAL_STORAGE_PATH` — ruta de almacenamiento local
- `MAX_UPLOAD_SIZE_MB` — tamaño máximo de subida

## Documentación del producto

La especificación funcional está en `cursor-palilleria-docs/`.

## Estado actual

**Fase 2 completada:** Prisma + PostgreSQL, schema completo, migración inicial y seed opcional.

Próximo paso: **Fase 3** — Auth.js / NextAuth (registro, login, sesión).
