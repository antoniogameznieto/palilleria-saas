# Auto-palillería supervisada — guía de demo interna

> **Fase 17A** — Paquete demostrable del flujo beta (commit de referencia: `9414ce8`).  
> **No es producto final:** asistencia supervisada desde texto embebido del PDF.

## Objetivo del flujo

Ayudar a un ingeniero a **proponer líneas de palillería** a partir de la relación de materiales embebida en un PDF, clasificarlas (incluir / revisar / excluir), compararlas con la palillería existente e **importar solo lo que el usuario selecciona** tras revisión humana.

La app **no sustituye** la revisión de palillería ni garantiza cobertura completa del plano.

## Requisitos del PDF

| Requisito | Obligatorio | Notas |
|-----------|-------------|-------|
| Texto embebido útil | Sí | ≥ ~200 caracteres; sin OCR |
| Sección BOM reconocible | Sí | `RELACIÓN DE MATERIALES`, `MATERIALES`, `BOM`, etc. |
| Filas tabulares SAP o equivalentes | Sí | Ítem + descripción + ref + cantidad |
| Bloque `SOPORTES` con filas STD-PS / SUP-xxx | No | Si existe, se extraen como **revisión** (16B) |

### PDFs recomendados para demo

| PDF / fixture | Uso |
|---------------|-----|
| `tests/fixtures/e2e-dms-703-bom.pdf` | Seed E2E (`seed-drawing-e2e-bom`) — demo guiada |
| `tests/fixtures/auto-takeoff-golden/dms-703.pdf` | Misma familia DMS; validación scripts |
| `tests/fixtures/auto-takeoff-golden/dw-701.pdf` | Caso parcial + checklist DW |
| PDF escaneado / sin texto | Negativo: sin propuesta importable |

## Qué extrae

1. **BOM principal** — filas de la relación de materiales hasta cabecera `SOPORTES`.
2. **Soportes tabulares** (opt-in en beta) — filas `STD-PS` + `SUP-xxx` tras `SOPORTES`, como sugerencias de **revisión**.

No extrae: menciones sueltas de soporte, brida/válvula en notas, partidas DW manuales sin fila BOM.

## Qué clasifica (reglas de negocio)

| Acción | Ejemplos típicos | Importable |
|--------|------------------|------------|
| **Incluir** | Tubería, brida/válvula con SAP, accesorios, tornillería, juntas | Sí (si `missing`) |
| **Revisar** | Disco ciego sin SAP, soportes tabulares STD-PS | Manual (con aviso) |
| **Excluir** | FIGURA 8 / espaciador según business set | No |

## Checklist manual (16C)

Avisos **sin crear líneas**:

- `looseSupportMention` — soporte suelto / `SOPORTE COMÚN`
- `dwContinuationOrManual` — tags DW, `PLANO Nº`, continuación de línea
- `looseFlangeOrValveMention` — brida/válvula en notas
- `noUsefulText` / `noBomDetected` — PDF no apto

No bloquea la importación de la propuesta.

## Qué no hace

- No tramea visualmente el isométrico.
- No interpreta planos raster sin texto embebido.
- No importa automáticamente (0 líneas seleccionadas tras analizar).
- No garantiza partidas fuera del BOM (DW manual, leyendas, cajetín).
- No usa OCR/Tesseract ni APIs externas en este flujo.
- No es palillería final automática.

## Flujo de demo paso a paso

### Preparación (5 min)

```bash
npm run db:migrate
npm run db:seed:e2e    # datos E2E + plano DMS-703 BOM
npm run dev
```

Credenciales E2E: `e2e-engineer@palilleria.local` / `demo1234`  
Ruta del plano BOM: `/companies/seed-company-e2e/jobs/seed-job-e2e/drawings/seed-drawing-e2e-bom`

### Demo en UI (10–15 min)

1. **Login** como engineer u owner.
2. Abrir el plano BOM seed → pestaña **Palillería** → marcar **Revisar palillería** (estado Listo) si el spec lo requiere.
3. Pestaña **Automatización** → bloque **Propuesta beta supervisada de palillería**.
4. **Analizar relación de materiales**.
5. Revisar conteos esperados (ver [checklist de validación](./auto-takeoff-beta-validation-checklist.md)):
   - 18 listas para incluir
   - 2 requieren revisión (disco ciego + SUP-001)
   - 1 excluida (FIGURA 8)
   - 1 ya existente (`1000937601`)
   - Checklist manual visible si hay señales
6. **Seleccionar todas las listas para incluir** → debe quedar en 18, sin soporte ni exclude.
7. Deseleccionar todo → seleccionar **1 línea** `missing` + `include` (p. ej. `1000937596`).
8. **Importar propuesta revisada** → confirmar diálogo.
9. Comprobar invalidación de revisión de palillería y línea creada en `#palilleria`.
10. **Reanalizar** → 2 ya existen, 20 faltan.
11. **Viewer** (`e2e-viewer@palilleria.local`): mismo plano → Automatización → **no** debe ver el bloque experimental.

### Validación automatizada (opcional)

```bash
npm run smoke:auto-takeoff-beta   # verify + E2E auto-takeoff
npm run test:e2e                  # suite completa 14/14
```

## Métricas de referencia (negocio, con soportes 16B)

| Métrica | Valor (business set) |
|---------|----------------------|
| Recall negocio overall | 87,5 % |
| Recall desde BOM extraíble | 100 % |
| Support recall | 2/5 (tabulares sí; menciones sueltas no) |

Ver [auto-takeoff-business-validation.md](./auto-takeoff-business-validation.md).

## Referencias

- [auto-takeoff-beta-supervisada.md](./auto-takeoff-beta-supervisada.md) — resumen del flujo
- [auto-takeoff-beta-validation-checklist.md](./auto-takeoff-beta-validation-checklist.md) — checklist manual QA
- [auto-takeoff-research.md](./auto-takeoff-research.md) — historial de fases 14A–17A
- [e2e-testing-notes.md](./e2e-testing-notes.md) — fixtures y testids
