# Palillería — checklist de hardening (Fase 9F)

Comprobaciones manuales recomendadas antes de avanzar a OCR/IA.

## Permisos por rol

| Acción | viewer | engineer | admin/owner |
|--------|--------|----------|-------------|
| Ver palillería por plano | Sí | Sí | Sí |
| Ver consolidado del trabajo | Sí | Sí | Sí |
| Exportar CSV por plano | Sí (si hay líneas) | Sí | Sí |
| Exportar CSV/Excel por trabajo | Sí (si hay líneas) | Sí | Sí |
| Crear / editar / eliminar línea | No | Sí | Sí |
| Duplicar línea | No | Sí | Sí |
| Importar CSV | No | Sí | Sí |
| Marcar / desmarcar revisión | No | Sí | Sí |

## Estados vacíos

- Trabajo sin planos: tabla de planos vacía; consolidado sin palillería; exports deshabilitados.
- Trabajo con planos sin palillería: consolidado vacío; exports deshabilitados; avance «Sin palillería».
- Plano sin líneas: mensaje en sección palillería; export CSV deshabilitado; no se puede marcar revisión.
- Consolidado sin líneas coincidentes con filtros: mensaje de filtros vacíos.
- Export CSV/Excel sin líneas: botones deshabilitados; API Excel responde 400 con mensaje claro.
- Formulario sin datos previos: unidades comunes disponibles; sin datalists de referencia/descripción.

## Invalidación de revisión

Tras marcar un plano como revisado, comprobar que `takeoffReviewedAt` se borra al:

1. Crear línea
2. Editar línea (con cambio real)
3. Eliminar línea
4. Duplicar línea
5. Importar CSV

No debe invalidarse si se guarda una edición sin cambios.

## Exportaciones

- CSV por plano / trabajo: no incluye `storagePath`.
- Excel por trabajo: tres hojas (Resumen, Consolidado, Detalle); celdas de texto con protección anti-inyección.
- Datos acotados por `companyId` + `jobId` (+ `drawingId` en CSV por plano).
- Valores que empiezan por `=`, `+`, `-`, `@` se neutralizan en CSV y Excel.
- Probar también valores con tabulador o retorno de carro **delante** de un prefijo peligroso (el código recorta whitespace inicial y luego evalúa el prefijo):

  - `=SUM(A1)`
  - `+123`
  - `-123`
  - `@cmd`
  - tab + `=SUM(A1)` (p. ej. `\t=SUM(A1)`)
  - retorno de carro + `=SUM(A1)` (p. ej. `\r=SUM(A1)`)

  Solo tab/retorno delante de texto inocuo (p. ej. `\tx`) no requiere neutralización.

## Consolidado

- Agrupación por referencia + descripción + unidad (coherente con hoja Consolidado del Excel).
- Filtro «Solo planos listos» excluye planos no `ready`.
- Filtros de búsqueda/unidad toleran referencia o unidad vacías.
- Cantidades numéricas suman correctamente entre planos.

## Sugerencias del formulario

- Viewer no recibe sugerencias del trabajo (solo ve palillería en lectura).
- Autofill de referencia no sobrescribe descripción/unidad ya tocadas manualmente.
- Unidad libre (texto fuera del datalist) sigue guardándose.

## Verificación automática (funciones puras)

```bash
npm run verify:takeoff
```

Cubre progreso de planos, consolidado, filtros, sugerencias y protección CSV/Excel.
