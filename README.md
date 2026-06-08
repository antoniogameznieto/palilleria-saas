# Palillería SaaS

SaaS multiempresa para ingenieros que generan **hoja de palillería** e **isos trameados** a partir de planos isométricos de tuberías.

## Requisitos

- **Node.js** 20 o superior
- **npm** 10 o superior
- **PostgreSQL** 15+ (necesario desde la Fase 2; no hace falta para arrancar esta base)

## Instalación

```bash
# 1. Clonar el repositorio y entrar en la carpeta del proyecto
cd trameado-masa

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env
```

Edita `.env` con tus valores locales. En esta fase solo son referencia; la base de datos se conectará en la Fase 2.

## Arranque en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

- `/` — página de bienvenida
- `/dashboard` — dashboard con layout y sidebar (placeholder)
- `/jobs`, `/settings`, `/users` — rutas preparadas sin lógica de negocio

## Scripts disponibles

| Comando        | Descripción              |
|----------------|--------------------------|
| `npm run dev`  | Servidor de desarrollo   |
| `npm run build`| Build de producción      |
| `npm run start`| Servidor de producción   |
| `npm run lint` | ESLint                   |

## Stack (Fase 1)

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- React Hook Form + Zod
- PostgreSQL + Prisma *(Fase 2)*
- Auth.js / NextAuth *(Fase 3)*

## Estructura del proyecto

```
app/                  # Rutas y layouts (App Router)
components/           # Componentes de aplicación
components/ui/        # Componentes shadcn/ui
lib/
  auth/               # Autenticación (pendiente)
  db/                 # Prisma client (pendiente)
  storage/            # Almacenamiento de PDFs (pendiente)
  permissions/        # Seguridad multiempresa (pendiente)
  validations/        # Zod + resolvers para formularios
prisma/               # Schema y migraciones (pendiente)
storage/              # PDFs locales en desarrollo (gitignored)
```

## Variables de entorno

Ver `.env.example`:

- `DATABASE_URL` — conexión PostgreSQL
- `NEXTAUTH_SECRET` — secreto de sesión
- `NEXTAUTH_URL` — URL base de la app
- `STORAGE_DRIVER` — `local` (por defecto)
- `LOCAL_STORAGE_PATH` — ruta de almacenamiento local
- `MAX_UPLOAD_SIZE_MB` — tamaño máximo de subida

## Documentación del producto

La especificación funcional está en `cursor-palilleria-docs/`.

## Estado actual

**Fase 1 completada:** scaffold Next.js, Tailwind, shadcn/ui, estructura de carpetas y layout base con sidebar.

Próximo paso: **Fase 2** — Prisma schema, PostgreSQL y migraciones.
