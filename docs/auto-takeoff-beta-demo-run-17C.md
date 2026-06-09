# Demo interna guiada — auto-palillería supervisada (Fase 17C)

> Ejecución controlada del [checklist de validación beta](./auto-takeoff-beta-validation-checklist.md).  
> Sin cambios de motor, parser, importación ni UI en esta fase.

## Metadatos

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-06-09 |
| **Commit probado** | `cb6c7bb` |
| **Entorno** | Local — Playwright E2E (`npm run smoke:auto-takeoff-beta` + `npm run test:e2e`); seed E2E vía global-setup |
| **Base de datos** | PostgreSQL local (`palilleria`) |
| **Revisor** | Sesión automatizada + validación agente |
| **Guía seguida** | [auto-takeoff-beta-validation-checklist.md](./auto-takeoff-beta-validation-checklist.md) |
| **Resultado general** | **Aprobado** — beta lista para demo interna controlada |

### Datos de prueba

| Recurso | Valor |
|---------|-------|
| Empresa E2E | `seed-company-e2e` |
| Trabajo E2E | `seed-job-e2e` |
| Plano principal (DMS-703) | `seed-drawing-e2e-bom` / `tests/fixtures/e2e-dms-703-bom.pdf` |
| Plano sin texto útil | `seed-drawing-e2e-pending` (PDF mínimo) |
| Usuario engineer | `e2e-engineer@palilleria.local` / `demo1234` |
| Usuario viewer | `e2e-viewer@palilleria.local` / `demo1234` |
| Usuario owner | `e2e-owner@palilleria.local` — login OK en suite auth; flujo beta no recorrido explícitamente (mismo permiso que engineer por `canManageTakeoffItems`) |
| PDF complementario HL | `HL-1291-01` — validado en Fase 17B (pipeline); no re-ejecutado en UI esta sesión |

### Método de ejecución

La demo principal DMS-703 se ejecutó mediante **`tests/e2e/experimental-auto-takeoff-import.spec.ts`**, que reproduce paso a paso el checklist (análisis, conteos, SUP-001, FIGURA 8, checklist manual, selección, import parcial, reanálisis, permisos viewer, PDF negativo). Equivale a demo guiada reproducible sin sesión manual en navegador.

---

## Verificaciones automáticas

| Comando | Resultado |
|---------|-----------|
| `npm run verify:auto-takeoff` | OK |
| `npm run smoke:auto-takeoff-beta` | OK — 3/3 |
| `npm run lint` | OK (1 warning preexistente en `auto-takeoff-manual-checklist.ts`) |
| `npm run build` | OK |
| `npm run test:e2e` | OK — 14/14 |

---

## Resumen por flujo obligatorio

| Flujo | Resultado | Evidencia |
|-------|-----------|-----------|
| Engineer ve bloque experimental | OK | E2E `experimental-auto-takeoff-section` visible |
| Viewer no ve bloque | OK | E2E count = 0 |
| DMS-703 análisis y conteos | OK | ready 18, review 2, exclude 1, matched 1 |
| SUP-001 en revisión | OK | `data-business-action="review"`, badge Soporte |
| FIGURA 8 excluida | OK | Grupo exclude, sin checkbox |
| Checklist manual | OK | `auto-takeoff-manual-checklist` visible |
| Copy supervisado | OK | «No se importa nada automáticamente», «requiere revisión humana» |
| Select all ready = 18 | OK | E2E |
| Importación parcial (1 línea) | OK | `1000937596`; invalida revisión; 2 líneas en palillería |
| Reanálisis post-import | OK | «2 ya existen», «20 faltan» |
| PDF sin texto útil | OK | `noUsefulText`; sin propuesta ni CTA import |
| HL-1291 complementario | OK (17B) | 9 incluir, 1 exclude, apto beta |

---

## Detalle checklist — DMS-703 (`seed-drawing-e2e-bom`)

### A. Acceso y permisos

| ID | Comprobación | Esperado | Real | OK |
|----|--------------|----------|------|-----|
| A1 | Login engineer | Acceso trabajo E2E | OK | ✓ |
| A2 | Automatización → bloque beta | Visible | OK | ✓ |
| A3 | Login viewer | Bloque no visible | OK | ✓ |

### B. Análisis y propuesta

| ID | Comprobación | Esperado | Real | OK |
|----|--------------|----------|------|-----|
| B1 | Analizar | &lt; 30 s | ~2 s (E2E) | ✓ |
| B2 | Listas para incluir | 18 | 18 | ✓ |
| B3 | Requieren revisión | 2 | 2 | ✓ |
| B4 | Excluidas | 1 | 1 | ✓ |
| B5 | Ya existen | 1 | 1 | ✓ |
| B6 | Resumen | 1 ya / 21 faltan | Coincide | ✓ |
| B7 | SUP-001 | review + Soporte | Coincide | ✓ |
| B8 | FIGURA 8 | exclude, sin checkbox | Coincide | ✓ |
| B9 | Checklist manual | Visible | OK | ✓ |
| B10 | Copy seguridad | No autoimport | OK | ✓ |
| B11 | Tras analizar | 0 seleccionadas | OK | ✓ |

### C. Selección e importación

| ID | Comprobación | Esperado | Real | OK |
|----|--------------|----------|------|-----|
| C1 | Select all ready | 18 | 18 | ✓ |
| C2 | 1 línea `1000937596` | 1 seleccionada | OK | ✓ |
| C3 | Preview importación | Ref + invalidación revisión | OK | ✓ |
| C4 | Importar + confirmar | 1 línea creada | OK | ✓ |
| C5 | Estado palillería | Revisar palillería | OK | ✓ |
| C6 | `#palilleria` | `1000937596` + `1000937601` | OK | ✓ |

### D. Reanálisis

| ID | Comprobación | Esperado | Real | OK |
|----|--------------|----------|------|-----|
| D1 | Reanalizar | Comparación actualizada | OK | ✓ |
| D2 | Resumen | 2 ya / 20 faltan | Coincide | ✓ |
| D3 | Filtro matched | 2 filas, sin checkbox | OK | ✓ |

### E. Casos negativos

| ID | Comprobación | Esperado | Real | OK |
|----|--------------|----------|------|-----|
| E1 | PDF mínimo (`seed-drawing-e2e-pending`) | Sin propuesta; `noUsefulText` | OK | ✓ |
| E2 | FIGURA 8 exclude | Sin checkbox import | OK (UI); servidor rechaza si se fuerza (15G) | ✓ |

---

## HL complementario (Fase 17B)

| PDF | Incluir | Revisión | Excluir | Veredicto demo |
|-----|---------|----------|---------|----------------|
| HL-1291-01 | 9 | 0 | 1 | Apto — coherente con mensaje supervisado |

Referencia: [auto-takeoff-beta-internal-test-17B.md](./auto-takeoff-beta-internal-test-17B.md).

---

## Observaciones clasificadas

| ID | Severidad | Observación | Acción en 17C |
|----|-----------|-------------|---------------|
| OBS-01 | **minor** | Owner no recorrió flujo beta en UI; permiso equivalente a engineer en código | Documentar; no requiere cambio |
| OBS-02 | **future** | HL-1294: soportes multi-fila solo parcialmente en propuesta | Ya documentado en 17B |
| OBS-03 | **future** | DW-702: BOM corto; checklist manual imprescindible | Ya documentado en 17B |
| OBS-04 | **minor** | Demo reproducible vía E2E; sesión manual en `npm run dev` opcional para presentación | Guías 17A cubren pasos |

**Blockers:** ninguno.

No se requirieron ajustes de copy ni docs adicionales en esta fase.

---

## Decisiones

1. **Declarar beta interna lista** para demo controlada con DMS-703 (seed E2E) y guías 17A/17B.
2. **Mantener posicionamiento supervisado** — copy actual es claro; sin cambios.
3. **No ampliar motor** en 17C — limitaciones HL/DW quedan como trabajo futuro.
4. **Smoke `npm run smoke:auto-takeoff-beta`** como pre-flight obligatorio antes de demos en vivo.

---

## Recomendaciones post-demo

| Prioridad | Recomendación |
|-----------|---------------|
| Investigación | Soportes multi-fila HL (parser 16B+) |
| Producto/doc | Reforzar mensaje DW + checklist en demos con planos DW |
| Infra | Staging/despliegue si se enseña fuera del entorno local E2E |
| Opcional | Recorrido owner en E2E smoke (mismo assert que engineer) |

---

## Referencias

- [auto-takeoff-beta-demo.md](./auto-takeoff-beta-demo.md)
- [auto-takeoff-beta-validation-checklist.md](./auto-takeoff-beta-validation-checklist.md)
- [auto-takeoff-beta-supervisada.md](./auto-takeoff-beta-supervisada.md)
- [auto-takeoff-beta-internal-test-17B.md](./auto-takeoff-beta-internal-test-17B.md)
