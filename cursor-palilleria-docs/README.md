# Palillería SaaS - documentación para Cursor

Esta carpeta contiene la documentación base para arrancar en Cursor el MVP de una aplicación SaaS para generar hoja de palillería e isos trameados a partir de planos isométricos de tuberías.

## Orden recomendado de uso

1. Lee `docs/00-contexto-producto.md`
2. Pega en Cursor `docs/01-prompt-maestro-cursor.md`
3. Usa `docs/02-modelo-datos-prisma.md` para revisar el schema
4. Usa `docs/03-flujo-usuario.md` para validar pantallas
5. Usa `docs/04-settings-palilleria.md` para configurar criterios
6. Usa `docs/05-roadmap-sprints.md` para dividir el desarrollo

## Stack propuesto

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Prisma ORM
- Auth.js / NextAuth
- bcrypt
- Storage local preparado para S3/MinIO

## Alcance del primer paso

Crear la base SaaS multiempresa: login, usuarios, empresas, roles, trabajos, settings y subida de PDFs. No se implementa todavía análisis automático, exportación ni editor visual.
