# Auto-palillería beta supervisada

Resumen del flujo estable para demo/beta interna (Fases 14G–15G).

## Qué es

Propuesta de palillería generada desde la relación de materiales embebida en el PDF, clasificada por reglas de negocio y **revisada por una persona** antes de importar.

No es palillería final automática.

## Acceso

| Rol | Ver bloque | Analizar | Importar |
|-----|------------|----------|----------|
| owner / admin / engineer | Sí | Sí | Sí |
| viewer | No | No | No |

Ubicación: plano → **Automatización** → **Palillería sugerida (beta supervisada)**.

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

## Límites conocidos

- Sin OCR: requiere texto embebido útil en el PDF.
- Soportes **tabulares** post-SOPORTES sí aparecen como revisión (16B). Menciones sueltas y partidas DW manuales siguen fuera.
- Máximo **200** líneas por importación.
- Re-extracción en servidor al importar: claves obsoletas o `matched` se rechazan.

## Demo recomendada (DMS-703 E2E)

Plano `seed-drawing-e2e-bom`: 18 listas para incluir, 2 revisiones (disco ciego + soporte SUP-001), 1 exclusión, 1 ya existente.

## Comandos de validación

```bash
npm run verify:auto-takeoff
npm run validate:auto-takeoff-business-rules
npm run test:e2e -- tests/e2e/experimental-auto-takeoff-import.spec.ts
```

## Referencias

- [auto-takeoff-research.md](./auto-takeoff-research.md) — fases 14A–15G
- [auto-takeoff-business-rules.md](./auto-takeoff-business-rules.md) — reglas include/review/exclude
