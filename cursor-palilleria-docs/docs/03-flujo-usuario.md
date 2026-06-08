# Flujo de usuario

## Flujo inicial

1. El usuario se registra.
2. El usuario inicia sesión.
3. Si no tiene empresa, crea una empresa.
4. El usuario queda como owner de la empresa.
5. Entra al dashboard.
6. Crea un trabajo.
7. Configura criterios de palillería del trabajo.
8. Sube planos PDF.
9. Revisa el listado de planos subidos.

## Flujo futuro con análisis

1. El usuario crea un trabajo.
2. Sube varios planos PDF.
3. Pulsa analizar planos.
4. El sistema extrae información técnica.
5. El sistema propone palillos.
6. El ingeniero revisa la tabla.
7. El ingeniero corrige longitudes y observaciones.
8. El ingeniero marca o ajusta los isos trameados.
9. El trabajo pasa a reviewed o approved.
10. Se exportan Excel, PDF de palillería e isos trameados.

## Rutas principales

- /login
- /register
- /onboarding/company
- /dashboard
- /companies/[companyId]/settings
- /companies/[companyId]/jobs
- /companies/[companyId]/jobs/new
- /companies/[companyId]/jobs/[jobId]
- /companies/[companyId]/jobs/[jobId]/settings
- /companies/[companyId]/jobs/[jobId]/drawings/upload
- /companies/[companyId]/jobs/[jobId]/drawings/[drawingId]

## Dashboard

Debe mostrar:

- empresa activa
- número de trabajos
- últimos trabajos
- botón crear trabajo

## Detalle de trabajo

Debe mostrar:

- datos generales
- estado
- settings resumidos
- planos subidos
- placeholder de palillería
- acciones futuras: analizar, exportar, aprobar

## Detalle de plano

Debe mostrar:

- nombre de archivo
- estado
- drawing number
- line number
- revision
- enlace protegido para ver/descargar PDF
