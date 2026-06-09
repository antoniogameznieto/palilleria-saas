# Auto-palillería beta supervisada

Resumen del flujo estable para demo/beta interna (Fases 14G–16C).  
**Commit de referencia:** `9414ce8`.

## Qué es

Propuesta de palillería generada desde la relación de materiales embebida en el PDF, clasificada por reglas de negocio y **revisada por una persona** antes de importar.

No es palillería final automática.

## Estado actual (post 16C)

| Capacidad | Estado |
|-----------|--------|
| Extracción BOM desde texto embebido | ✅ |
| Comparación con palillería existente | ✅ |
| Reglas include / review / exclude | ✅ |
| Propuesta beta en 3 grupos | ✅ |
| Soportes tabulares post-SOPORTES → review | ✅ (16B) |
| Checklist manual fuera del BOM | ✅ (16C) |
| Importación segura (re-extracción servidor) | ✅ |
| E2E auto-takeoff | ✅ 14/14 |

## Acceso

| Rol | Ver bloque | Analizar | Importar |
|-----|------------|----------|----------|
| owner / admin / engineer | Sí | Sí | Sí |
| viewer | No | No | No |

Ubicación: plano → **Automatización** → **Palillería sugerida (beta supervisada)**.

## Criterio de uso recomendado

Usar este flujo cuando:

- El PDF tiene **texto embebido** y una **relación de materiales** tabular (DMS/HL probados).
- Quieres **asistencia** para proponer líneas, no automatización completa.
- Un ingeniero revisará la propuesta antes de importar y marcará la palillería como revisada.

**No usar** como sustituto de palillería final cuando:

- El plano es DW con partidas manuales fuera del BOM.
- El PDF es escaneado o sin texto seleccionable.
- Se espera cobertura de soportes sueltos, bridas en leyendas o continuaciones de línea sin fila SAP.

En esos casos, la **checklist manual** orienta la revisión; las líneas deben crearse o completarse a mano.

## Flujo (4 pasos)

1. **Analizar relación de materiales** — extrae y compara con palillería existente.
2. **Revisar propuesta** — tres grupos:
   - **Listas para incluir** (`missing` + `include`)
   - **Requieren revisión** (`missing` + `review`) — incluye soportes tabulares `STD-PS` / `SUP-xxx` (Fase 16B)
   - **Excluidas por reglas** (`exclude`, p. ej. FIGURA 8)
3. **Importar propuesta revisada** — solo líneas seleccionadas manualmente.
4. **Revisar palillería** — invalida revisión previa si estaba marcada.

## Reglas de selección

- Tras analizar: **0 líneas seleccionadas**.
- **Seleccionar todas las listas para incluir** → solo `missing` + `include`.
- **Seleccionar listas visibles** → mismo criterio, filas visibles según filtros.
- `review`: checkbox manual permitido; aviso en preview. Los **soportes tabulares** (`SUP-001`, etc.) siempre entran aquí, nunca en bulk ready.
- `exclude`: sin checkbox; servidor rechaza importación.

## Revisión manual recomendada (16C)

Bloque `auto-takeoff-manual-checklist` con avisos que **no crean líneas**:

- Menciones sueltas de soporte (`SOPORTE COMÚN`, `SUP-xxx` fuera de fila tabular).
- Señales DW (`DW-xxx`, `PLANO Nº`, `PARA CONT. VER LINEA NUM.`).
- Brida/válvula en notas o leyendas (no fila BOM).
- PDF sin texto útil o sin BOM detectado.

La importación de la propuesta **no se bloquea** por estos avisos.

## Límites conocidos

- **Sin OCR:** requiere texto embebido útil en el PDF.
- **BOM ≠ palillería completa:** recall de negocio ~87,5 % en business set; DW y menciones sueltas quedan fuera.
- **Soportes tabulares** post-SOPORTES → revisión (16B). Menciones sueltas → checklist (16C).
- **Máximo 200** líneas por importación experimental.
- **Re-extracción en servidor** al importar: claves obsoletas o `matched` se rechazan.
- **No tramea** ni interpreta geometría del isométrico.

## Demo recomendada (DMS-703 E2E)

Plano `seed-drawing-e2e-bom`: 18 listas para incluir, 2 revisiones (disco ciego + soporte SUP-001), 1 exclusión, 1 ya existente, checklist manual si hay señales en el PDF.

Guía paso a paso: [auto-takeoff-beta-demo.md](./auto-takeoff-beta-demo.md)  
Checklist QA: [auto-takeoff-beta-validation-checklist.md](./auto-takeoff-beta-validation-checklist.md)

## Comandos de validación

```bash
npm run verify:auto-takeoff
npm run smoke:auto-takeoff-beta
npm run validate:auto-takeoff-business-rules
npm run test:e2e -- tests/e2e/experimental-auto-takeoff-import.spec.ts
```

## Referencias

- [auto-takeoff-research.md](./auto-takeoff-research.md) — fases 14A–17A
- [auto-takeoff-business-rules.md](./auto-takeoff-business-rules.md) — reglas include/review/exclude
- [out-of-bom-items-research.md](./out-of-bom-items-research.md) — investigación fuera del BOM
