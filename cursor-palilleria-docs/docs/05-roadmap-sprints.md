# Roadmap por sprints

## Sprint 1 - Base SaaS

Objetivo: crear la base multiempresa.

Incluye:

- Next.js App Router
- PostgreSQL
- Prisma
- Auth.js / NextAuth
- registro/login
- empresas
- roles
- trabajos
- settings de palillería
- subida de PDFs
- storage local protegido

No incluye:

- análisis automático
- exportaciones
- visor PDF avanzado
- editor de anotaciones

## Sprint 2 - Tabla editable de palillería

Objetivo: permitir crear y editar palillos manualmente.

Incluye:

- listado de pipe_segments por trabajo
- crear palillo manual
- editar palillo
- borrar palillo
- cambiar estado
- filtrar por plano, material, diámetro, schedule y estado

## Sprint 3 - Visor PDF básico

Objetivo: visualizar los planos dentro de la app.

Incluye:

- PDF.js
- visor protegido
- navegación por páginas
- zoom
- panel lateral con datos del plano

## Sprint 4 - Editor de isos trameados

Objetivo: marcar sobre el PDF como en los ejemplos.

Incluye:

- líneas azules
- círculos con número de palillo
- etiquetas Tramo A/B/C
- textos libres
- marcadores de duda
- persistencia en annotations.data JSON

## Sprint 5 - Exportaciones

Objetivo: exportar documentos finales.

Incluye:

- Excel de palillería
- PDF de palillería
- PDF de isos trameados
- tabla exports
- histórico de exportaciones

## Sprint 6 - Análisis automático

Objetivo: conectar análisis de planos.

Incluye:

- extracción de cajetín
- número de plano
- número de línea
- diámetro
- clase
- material
- schedule
- cotas visibles
- accesorios
- notas
- continuidades
- propuesta inicial de pipe_segments

## Sprint 7 - Suscripciones

Objetivo: preparar venta SaaS.

Incluye:

- planes
- límites por empresa
- Stripe
- facturación
- bloqueo por uso
