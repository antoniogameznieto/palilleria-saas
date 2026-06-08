# Prompt maestro para Cursor - Paso 1

Quiero construir una aplicación SaaS para ayudar a ingenieros a generar documentación de palillería a partir de planos isométricos de tuberías.

La aplicación debe permitir que una empresa suba planos isométricos en PDF, cree trabajos, configure criterios de palillería, revise datos detectados, genere una hoja de palillería editable y más adelante exporte isos trameados marcados sobre el PDF original.

En este primer paso quiero construir la base del producto, sin integrar todavía análisis automático de planos.

## Stack tecnológico

Usa este stack:

- Next.js con App Router
- TypeScript
- Tailwind CSS
- shadcn/ui para componentes
- PostgreSQL como base de datos
- Prisma ORM
- Auth.js / NextAuth para autenticación
- Login con email y contraseña
- bcrypt para hash de contraseñas
- React Hook Form + Zod para formularios y validaciones
- Almacenamiento de PDFs local en desarrollo, preparado para S3 o MinIO en producción

## Objetivo del primer paso

Construir una primera versión funcional con:

1. Registro y login de usuarios.
2. Gestión de empresas.
3. Relación empresa-usuarios.
4. Roles básicos.
5. Creación de trabajos.
6. Subida de planos PDF asociados a un trabajo.
7. Persistencia de todos los datos en PostgreSQL.
8. Dashboard básico.
9. Settings básicos de palillería por trabajo.

No implementar todavía:

- análisis automático de planos;
- generación automática de palillería;
- editor visual de PDF;
- exportación Excel/PDF;
- pagos con Stripe.

Pero deja la arquitectura preparada para añadir esas funciones después.

## Concepto del producto

Una empresa puede tener varios usuarios.
Cada usuario puede pertenecer a una o varias empresas.
Cada empresa puede tener varios trabajos.
Cada trabajo puede tener varios planos PDF.
Cada trabajo tendrá settings de palillería.
Más adelante, cada plano generará palillos, anotaciones e isos trameados.

## Roles iniciales

Crear estos roles:

- owner
- admin
- engineer
- viewer

Permisos básicos:

- owner: puede gestionar empresa, usuarios, trabajos, settings y todo el contenido.
- admin: puede gestionar trabajos, planos y settings.
- engineer: puede crear y editar trabajos, subir planos y revisar palillería.
- viewer: solo puede ver trabajos y descargar documentos cuando existan.

Para este primer paso, implementa control básico de acceso por rol.

## Seguridad multiempresa

Implementa la seguridad a nivel de servidor en Next.js.

Crear helpers reutilizables:

- getCurrentUser()
- requireAuth()
- getUserCompanies(userId)
- getActiveCompany(userId)
- requireCompanyMember(companyId)
- requireCompanyRole(companyId, allowedRoles)
- canAccessJob(userId, companyId, jobId)
- canAccessDrawing(userId, companyId, drawingId)

Regla principal:

Un usuario solo puede acceder a datos de una empresa si existe un registro en CompanyMember con su userId y companyId.

Nunca devolver trabajos, planos, settings, segmentos, anotaciones o exportaciones de empresas a las que el usuario no pertenece.

Todas las queries de trabajos, planos, settings, segmentos, anotaciones y exportaciones deben filtrar siempre por companyId.

## Almacenamiento de PDFs

En desarrollo, guardar los PDFs localmente en:

/storage/companies/{companyId}/jobs/{jobId}/drawings/{drawingId}/{originalFileName}

Guardar esa ruta en Drawing.storagePath.

Crear una capa de abstracción para storage:

- uploadFile()
- getFileUrl()
- deleteFile()

Ahora debe usar almacenamiento local, pero debe estar preparada para S3 o MinIO.

No guardar PDFs dentro de /public sin control de permisos.

Crear una ruta protegida para servir archivos:

/api/files/drawings/[drawingId]

Esta ruta debe:

1. comprobar sesión;
2. comprobar que el usuario pertenece a la empresa del plano;
3. leer el archivo desde storage;
4. devolver el PDF.

## Rutas necesarias

### /login

Pantalla de login con email y contraseña.

### /register

Pantalla de registro.

Después del registro, si el usuario no tiene empresa, redirigir a crear empresa.

### /onboarding/company

Pantalla para crear la primera empresa.

Campos:

- nombre de empresa
- razón social opcional

El usuario que crea la empresa debe quedar como owner.

### /dashboard

Dashboard principal.

Debe mostrar:

- empresa activa
- número de trabajos
- últimos trabajos
- botón para crear nuevo trabajo

### /companies/[companyId]/settings

Pantalla de settings de empresa.

Por ahora mostrar información básica de empresa y usuarios miembros.

### /companies/[companyId]/jobs

Listado de trabajos de la empresa.

Debe mostrar:

- nombre
- cliente
- código de proyecto
- estado
- fecha de creación
- número de planos subidos

### /companies/[companyId]/jobs/new

Formulario para crear trabajo.

Campos:

- nombre del trabajo
- cliente
- código de proyecto
- descripción

Al crear trabajo, crear también automáticamente un registro en JobSettings con valores por defecto.

### /companies/[companyId]/jobs/[jobId]

Detalle del trabajo.

Debe mostrar:

- datos generales del trabajo
- settings de palillería
- listado de planos subidos
- botón para subir planos
- tabla vacía o placeholder de palillería futura

### /companies/[companyId]/jobs/[jobId]/settings

Pantalla para configurar criterios de palillería del trabajo.

Campos editables:

- criterio de longitud
- unidad de longitud
- redondeo en mm
- longitud máxima de palillo
- longitud mínima de palillo
- peso máximo
- separar por diámetro
- separar por schedule
- separar por material
- separar en bridas
- separar en válvulas
- separar en accesorios
- revisión obligatoria antes de exportar
- notas

### /companies/[companyId]/jobs/[jobId]/drawings/upload

Pantalla o modal para subir PDFs.

Debe permitir subir varios PDFs a la vez.

Validar:

- solo PDF
- tamaño máximo configurable, usar de momento 50 MB por archivo

Al subir cada PDF:

- crear primero el registro Drawing;
- guardar el PDF en storage local;
- actualizar Drawing.storagePath;
- estado uploaded.

### /companies/[companyId]/jobs/[jobId]/drawings/[drawingId]

Detalle de plano.

Debe mostrar:

- nombre del archivo
- estado
- datos técnicos vacíos o editables:
  - drawingNumber
  - lineNumber
  - revision
- enlace protegido para visualizar o descargar el PDF usando /api/files/drawings/[drawingId]

No implementar todavía visor avanzado con anotaciones, pero deja la página preparada.

## UI

Usar una interfaz limpia, técnica y profesional.

Estilo:

- fondo claro
- tablas limpias
- botones claros
- badges para estados
- navegación lateral con:
  - Dashboard
  - Trabajos
  - Settings
  - Usuarios

Importante: no usar la palabra IA en estados. Usar Detectado.

## Criterios de aceptación

Al terminar este primer paso, debe funcionar lo siguiente:

1. Un usuario puede registrarse.
2. Un usuario puede iniciar sesión.
3. Las contraseñas se guardan hasheadas con bcrypt.
4. Un usuario puede crear una empresa.
5. El usuario queda como owner de esa empresa.
6. El usuario puede crear un trabajo.
7. Al crear un trabajo, se crean settings por defecto.
8. El usuario puede editar los settings del trabajo.
9. El usuario puede subir varios PDFs a un trabajo.
10. Los PDFs se guardan en storage local.
11. Los registros de PDFs se guardan en PostgreSQL.
12. El dashboard muestra los trabajos creados.
13. El detalle de trabajo muestra los planos subidos.
14. Los datos persisten al cerrar sesión y volver a entrar.
15. Un usuario no puede ver datos de empresas a las que no pertenece.
16. Los PDFs se sirven desde una ruta protegida, no públicamente.
