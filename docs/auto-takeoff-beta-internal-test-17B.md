# Prueba beta interna — Fase 17B

> Validación de auto-palillería supervisada contra PDFs reales **no usados** en golden set, business set ni E2E.

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-06-09 |
| **Commit probado** | `fce8fc7` |
| **Metodología** | `inspect:pdf`, `research:auto-takeoff`, `research:out-of-bom`, simulación pipeline beta (`includeSupportRows: true` + reglas + checklist), benchmark puntual (3 PDFs, sin persistir informe global) |

## Criterio de selección de PDFs

| Excluido | PDFs / familias |
|----------|-----------------|
| Golden set | `dms-703`, `dms-704`, `dms-702`, `hl-1289-01`, `hl-1293-01`, `dw-701`, `no-bom-negative` |
| Business set | `dms-703`, `dms-704`, `hl-1289-01`, `hl-1293-01`, `dw-701` |
| E2E | `e2e-dms-703-bom.pdf`, `e2e-dms-701-pl1-l-r01.pdf` |
| Casos principales 15A | DMS-702/703/704, HL-1289/1293, DW-701 |

**Nota:** Los 3 PDFs de esta fase aparecieron en el benchmark exploratorio 15A (17 PDFs de `./Ejemplos`), pero **no** forman parte de fixtures de regresión ni del business set. Son candidatos válidos para validar comportamiento “en campo” sin repetir el caso DMS-703 de demo.

## PDFs probados

1. `2301GB47G-C1-L-HL-1291-01.pdf` — HL, tubería 4"
2. `2301GB47G-C1-L-HL-1294-01.pdf` — HL, tubería 4" con bloque SOPORTES
3. `1601GB16A-PL1-L-DW-702-01-R1.pdf` — DW, tubería 1.1/2"

Rutas: `./Ejemplos/Ejemplo 1/` (HL) y `./Ejemplos/Ejemplo 2/` (DW).

---

## 1. HL-1291-01

| Campo | Resultado |
|-------|-----------|
| **Familia** | HL (P&ID / línea caliente) |
| **Texto embebido** | Sí — 2015 chars |
| **BOM detectada** | Sí — `RELACION_DE_MATERIALES`, `MATERIALES` |
| **Filas extraídas (beta, soportes on)** | 10 |
| **Soportes tabulares** | No — sin bloque `SOPORTES` en texto |
| **Listas para incluir** | **9** |
| **Requieren revisión** | **0** |
| **Excluidas** | **1** — FIGURA 8 (`1000079108`) |
| **Ya existentes** | 0 (simulación sin palillería previa) |
| **Checklist manual** | `dwContinuationOrManual` (señales P&ID / línea en cajetín) |
| **Importación parcial** | Coherente — 9 filas `include` importables vía mismo pipeline que E2E |
| **Resultado** | **Apto para beta con revisión** |
| **Problemas** | Ningún bug. Checklist DW es aviso esperado; no bloquea import. |

**Observaciones:** Confianza media 1,0; 10/10 refs SAP en BOM. Comportamiento alineado con HL-1289/1293 del business set, sin soportes.

---

## 2. HL-1294-01

| Campo | Resultado |
|-------|-----------|
| **Familia** | HL |
| **Texto embebido** | Sí — 2100 chars |
| **BOM detectada** | Sí |
| **Filas extraídas (beta, soportes on)** | **11** (10 BOM + 1 soporte tabular) |
| **Soportes detectados** | Bloque `SOPORTES` línea 86; `research:out-of-bom` reporta **4 tabulares** + menciones sueltas |
| **Listas para incluir** | **9** |
| **Requieren revisión** | **1** — `SUP-002` / `STD-PS-053 (PSL)` |
| **Excluidas** | **1** — FIGURA 8 |
| **Checklist manual** | `looseSupportMention`, `dwContinuationOrManual` |
| **Importación parcial** | Coherente — bulk ready seleccionaría 9; soporte en revisión manual |
| **Resultado** | **Apto para beta con revisión** |
| **Problemas** | **Limitación conocida:** solo 1 de 4 soportes tabulares entra en propuesta; el resto queda en checklist (`looseSupportMention`). No es regresión de 17A; gap ya documentado en 16A/16B. |

---

## 3. DW-702-01-R1

| Campo | Resultado |
|-------|-----------|
| **Familia** | DW (diseño / montaje) |
| **Texto embebido** | Sí — 1742 chars |
| **BOM detectada** | Sí |
| **Filas extraídas (beta, soportes on)** | **3** (tubería + te + codo) |
| **Soportes detectados** | Bloque `SOPORTES` línea 81; `research:out-of-bom`: 5 candidatos soporte, **7 partidas fuera BOM** (p. ej. tag `DW-702-A010AA-N-01`) |
| **Listas para incluir** | **3** |
| **Requieren revisión** | **0** |
| **Excluidas** | **0** |
| **Checklist manual** | `looseSupportMention`, `dwContinuationOrManual` |
| **Importación parcial** | Coherente — 3 filas importables; palillería real requerirá completar manualmente |
| **Resultado** | **Apto con revisión** (asistencia parcial, no cobertura completa) |
| **Problemas** | **Limitación conocida:** BOM corto vs partidas DW manuales y soportes no tabulares (`4 - SUP-001`). Mismo patrón que `dw-701` en business set. Sin bug de clasificación. |

---

## Validación UI (opcional)

Los tres PDFs existen en **storage** de la empresa demo (`./storage/companies/...`). No se ejecutó sesión UI manual en esta fase; la simulación usa el mismo pipeline que el servidor (`parseTakeoffRowsFromEmbeddedText` + `applyBusinessRules` + `buildManualTakeoffChecklist` + comparación vacía).

Para repetir en UI: subir o abrir plano en trabajo demo → Automatización → Analizar. Conteos esperados coinciden con la tabla anterior.

## Resumen comparativo

| PDF | Filas | Incluir | Revisión | Excluir | Checklist | Veredicto |
|-----|-------|---------|----------|---------|-----------|-----------|
| HL-1291-01 | 10 | 9 | 0 | 1 | DW | Apto beta |
| HL-1294-01 | 11 | 9 | 1 | 1 | Soporte + DW | Apto beta |
| DW-702-01 | 3 | 3 | 0 | 0 | Soporte + DW | Apto con revisión |

## Bugs vs limitaciones

| Tipo | Hallazgo |
|------|----------|
| **Bugs** | Ninguno crítico en parser, reglas, checklist ni clasificación |
| **Limitaciones conocidas** | HL-1294: recall parcial soportes tabulares; DW-702: BOM ≠ palillería completa; checklist manual imprescindible en DW |

## Conclusión global

**Apto para beta interna supervisada con revisión humana.**

La beta se comporta de forma predecible en HL no regresados y en DW parcial: propuesta útil para materiales BOM, exclusiones FIGURA 8 correctas, soportes tabulares cuando el formato lo permite, checklist orientando lo no parseable.

**No apto** como automatización completa en DW ni en planos con múltiples soportes tabulares HL sin revisión.

## Recomendaciones para siguiente fase

1. **Mantener mensaje supervisado** — no ampliar copy hacia “automático completo” tras estas pruebas.
2. **Soportes HL multi-fila** — investigar por qué HL-1294 solo importa 1/4 tabulares (formato STD-PS vs parser 16B); posible 17C/18A sin tocar import.
3. **DW** — reforzar en demo/docs que la beta es **asistencia BOM**, no sustituto de palillería DW; checklist ya cubre el gap.
4. **Regresión opcional** — valorar HL-1291-01 como fixture ligero de humo (no golden) si se quiere diversificar E2E más allá de DMS-703.
5. **No añadir fixtures** en 17B — los PDFs de Ejemplos son suficientemente grandes; no se versionaron copias nuevas.

## Comandos usados

```bash
npm run inspect:pdf -- <pdf>
npm run research:auto-takeoff -- <pdf>
npm run research:out-of-bom -- <pdf1> <pdf2> <pdf3> --no-md
# Simulación beta: pipeline lib (temporal, no commiteado)
```

## Referencias

- [auto-takeoff-beta-demo.md](./auto-takeoff-beta-demo.md)
- [auto-takeoff-beta-validation-checklist.md](./auto-takeoff-beta-validation-checklist.md)
- [out-of-bom-items-research.md](./out-of-bom-items-research.md)
