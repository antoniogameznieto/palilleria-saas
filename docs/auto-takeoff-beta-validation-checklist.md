# Checklist de validación — auto-palillería supervisada beta

> **Fase 17A** — Validación manual antes de demo interna.  
> Plano de referencia: **DMS-703** (`seed-drawing-e2e-bom` / `e2e-dms-703-bom.pdf`).

## Pre-requisitos

- [ ] `npm run db:seed:e2e` ejecutado (o datos E2E ya presentes)
- [ ] App en marcha (`npm run dev`)
- [ ] Usuario engineer: `e2e-engineer@palilleria.local` / `demo1234`
- [ ] Plano: `seed-drawing-e2e-bom` en trabajo `seed-job-e2e`
- [ ] Palillería del plano marcada como **Listo** (1 línea SAP `1000937601` previa)

## A. Acceso y permisos

| # | Paso | Esperado | OK |
|---|------|----------|-----|
| A1 | Login como **engineer** | Acceso al trabajo E2E | ☐ |
| A2 | Abrir plano BOM → **Automatización** | Visible `experimental-auto-takeoff-section` | ☐ |
| A3 | Login como **viewer**, mismo plano → Automatización | Bloque experimental **no** visible | ☐ |

## B. Análisis y propuesta (DMS-703)

| # | Paso | Esperado | OK |
|---|------|----------|-----|
| B1 | Pulsar **Analizar relación de materiales** | Resultados en &lt; 30 s | ☐ |
| B2 | Contador **Listas para incluir** | **18** | ☐ |
| B3 | Contador **Requieren revisión** | **2** | ☐ |
| B4 | Contador **Excluidas por reglas** | **1** | ☐ |
| B5 | Contador **Ya existen en palillería** | **1** | ☐ |
| B6 | Resumen comparación | «1 ya existen», «21 faltan» | ☐ |
| B7 | Fila **SUP-001** | Grupo revisión; badge **Soporte**; `data-business-action="review"` | ☐ |
| B8 | Fila **FIGURA 8** | Grupo excluidas; sin checkbox import | ☐ |
| B9 | Bloque **Revisión manual recomendada** | Visible (`auto-takeoff-manual-checklist`) si hay señales en PDF | ☐ |
| B10 | Copy de seguridad | Menciona que no se importa automáticamente | ☐ |
| B11 | Tras analizar | **0** líneas seleccionadas | ☐ |

## C. Selección e importación

| # | Paso | Esperado | OK |
|---|------|----------|-----|
| C1 | **Seleccionar todas las listas para incluir** | **18** líneas seleccionadas (no incluye review/exclude) | ☐ |
| C2 | Deseleccionar todo → seleccionar 1 línea include (`1000937596`) | 1 línea seleccionada | ☐ |
| C3 | Preview importación | Muestra ref y aviso de invalidación de revisión | ☐ |
| C4 | **Importar propuesta revisada** + confirmar | Éxito; 1 línea creada | ☐ |
| C5 | Estado palillería | Vuelve a **Revisar palillería** (revisión invalidada) | ☐ |
| C6 | `#palilleria` | Aparece `1000937596` además de `1000937601` | ☐ |

## D. Reanálisis post-import

| # | Paso | Esperado | OK |
|---|------|----------|-----|
| D1 | Automatización → **Analizar** de nuevo | Comparación actualizada | ☐ |
| D2 | Resumen comparación | «2 ya existen», «20 faltan» | ☐ |
| D3 | Filtro estado **Ya existen** | 2 filas; sin checkbox import | ☐ |

## E. Casos negativos (opcional)

| # | Paso | Esperado | OK |
|---|------|----------|-----|
| E1 | Plano `seed-drawing-e2e-pending` (PDF mínimo) → Analizar | Sin propuesta importable; `noUsefulText` en checklist | ☐ |
| E2 | Intentar importar fila **exclude** (FIGURA 8) | Sin checkbox; servidor rechaza si se fuerza | ☐ |

## F. Checks automatizados (antes de demo)

```bash
npm run verify:auto-takeoff
npm run smoke:auto-takeoff-beta   # opcional: verify + E2E auto-takeoff
npm run lint
npm run build
npm run test:e2e                  # 14/14
```

| Comando | OK |
|---------|-----|
| `verify:auto-takeoff` | ☐ |
| `smoke:auto-takeoff-beta` | ☐ |
| `lint` | ☐ |
| `build` | ☐ |
| `test:e2e` | ☐ |

## Resultado

| Campo | Valor |
|-------|-------|
| Fecha | |
| Revisor | |
| Commit | |
| Resultado global | ☐ Aprobado ☐ Aprobado con observaciones ☐ No apto |
| Observaciones | |

## Referencias

- [auto-takeoff-beta-demo.md](./auto-takeoff-beta-demo.md)
- [auto-takeoff-beta-supervisada.md](./auto-takeoff-beta-supervisada.md)
