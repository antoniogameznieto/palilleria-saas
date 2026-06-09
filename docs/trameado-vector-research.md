# Fase 18J — Research vectorial para cotas y palillos desde planos originales

> **Tipo:** investigación técnica. Sin implementación productiva.  
> **Herramienta:** `npm run research:trameado-vector`  
> **Script:** `scripts/research-trameado-vector.ts`  
> **Relacionado:** [trameado-auto-research.md](./trameado-auto-research.md) (18H), [trameado-functional-analysis.md](./trameado-functional-analysis.md) (18A), [trameado-mvp-proposal.md](./trameado-mvp-proposal.md)

## 1. Objetivo

Investigar si los **PDFs isométricos vectoriales originales** (input real del trabajo) contienen información suficiente para **proponer tramos de palilleo (PALILLO)** de forma automática o semiautomática.

### Aclaración funcional (input vs output)

| Artefacto | Rol | ¿Input productivo? |
|-----------|-----|-------------------|
| `2301GB47G-C1-L-HL-xxxx-01.pdf` / `-02.pdf` | Plano isométrico vectorial original | **Sí — input real** |
| `Isos trameados.pdf` | Iso con marcas azules + referencia visual de trameado humano | **No — golden output / referencia** |
| `Hoja de palilleo.pdf` | Hoja manuscrita escaneada | **No — golden output** |

El producto debe trabajar sobre los **planos originales vectoriales**. `Isos trameados.pdf` solo sirve para **validar visualmente** cuántos tramos humanos hay y qué PALILLO esperaba el cliente; **no** debe leerse como fuente de datos (escaneo RICOH, 140 chars embebidos — ver 18H).

## 2. Metodología

| Aspecto | Enfoque |
|---------|---------|
| Extracción texto | `pdf-parse` → `getText()` (misma base que auto-takeoff beta) |
| Posición X/Y | Probar API pública de `pdf-parse`; documentar límites |
| Geometría vectorial | Conteo heurístico de operadores PDF en stream crudo; **sin** motor geométrico |
| OCR / visión | **No** |
| BD / UI / producto | **No tocados** |
| Golden | Comparación documentada vs valores de [trameado-functional-analysis.md](./trameado-functional-analysis.md) |

### Ejecución

```bash
# 9 PDFs vectoriales por defecto (Ejemplos/Ejemplo 1/)
npm run research:trameado-vector

# Rutas concretas + JSON
npm run research:trameado-vector -- "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-01.pdf" --json
```

## 3. Posición X/Y — ¿se puede extraer?

| Pregunta | Resultado |
|----------|-----------|
| ¿`getText()` devuelve X/Y por ítem? | **No.** `TextResult` solo expone `pages[].text` concatenado. |
| ¿`getTable()` ayuda? | Parcialmente: usa geometría interna para detectar celdas, pero la API pública devuelve **strings fusionados sin coordenadas**. En algunos PDFs falla. |
| ¿Agrupar cotas por proximidad espacial? | **No automatizable** con la API pública actual. |
| ¿Separar BOM/cajetín vs zona de dibujo? | Solo por **heurística textual** (cabeceras, patrones); no por bounding box. |

**Conclusión:** para panel de cotas con contexto espacial haría falta ampliar el parser (p. ej. acceder a `TextContent.items[].transform` vía pdf.js directo, o exportar posiciones desde AutoCAD) — fuera del alcance 18J y sin añadir dependencias pesadas.

## 4. Geometría vectorial (paths/lines)

Todos los PDFs analizados muestran **contenido vectorial significativo**:

| PDF | pathOperatorHints | lineMoveHints | likelyVector |
|-----|-------------------|---------------|--------------|
| HL-1289-01 | ~3269 | ~809 | sí |
| HL-1289-02 | ~2940 | ~752 | sí |
| HL-1291-01 | ~3310 | ~852 | sí |
| HL-1291-02 | ~2885 | ~735 | sí |
| HL-1292-01 | ~3266 | ~850 | sí |
| HL-1292-02 | ~2928 | ~728 | sí |
| HL-1293-01 | ~3335 | ~860 | sí |
| HL-1293-02 | ~2962 | ~740 | sí |
| HL-1294-01 | ~3436 | ~880 | sí |

El PDF **contiene** operadores de trazado (`m`, `l`, `re`, etc.) accesibles en el stream binario, pero **interpretarlos** (polilínea del iso, válvulas, codos, puntos de corte) requiere un **motor geométrico dedicado** (Nivel 4). No está en el proyecto ni se añadió en 18J.

## 5. Resultados por PDF original

> Datos generados con `npm run research:trameado-vector -- --json` (jun 2026).

### Resumen tabular

| PDF | Línea | Clase | Sufijo | Ø | SCH | Tubería BOM | Cotas candidatas | Golden PALILLO (ref.) | Match literal |
|-----|-------|-------|--------|---|-----|-------------|------------------|----------------------|---------------|
| HL-1289-01 | HL-1289-A010AA-N-01 | A010AA | -01 | 4" | 40 | 2.0 M | 30, 297, 232, 179, 129, 235, 295, 738, 939, 1362, … | 150, 363, 231, 1052, 139 (5) | ninguno |
| HL-1289-02 | HL-1289-A010AA-N-02 | A010AA | -02 | 3/4" | 80 | 0.4 M | 85, 100, 120, 170, 339, 69 | 170, 100, 120 (3) | **170, 100, 120** |
| HL-1291-01 | HL-1291-A012AA-N-01 | A012AA | -01 | 4" | 40 | 1.8 M | 297, 1127, 629, 232, 179, 1059, 129, 235, 295, 279, 938, … | 150, 363, 231, 1052, 139 (5) | ninguno |
| HL-1291-02 | HL-1291-A012AA-N-02 | A012AA | -02 | 3/4" | 80 | 0.4 M | 68, 85, 100, 120, 193, 361 | 170, 100, 120 (3) | **100, 120** |
| HL-1292-01 | HL-1292-A032BA-N-01 | A032BA | -01 | 4" | 40 | 2.2 M | 138, 170, 297, 359, 893, 1104, 1787, … | 150, 363, 231, 1052 (4) | ninguno |
| HL-1292-02 | HL-1292-A032BA-N-02 | A032BA | -02 | 3/4" | 80 | 0.6 M | 86, 100, 121, 170, 347, 516, 69 | 170, 100, 120 (3) | **170, 100** |
| HL-1293-01 | HL-1293-A012AA-N-01 | A012AA | -01 | 4" | 40 | 5.0 M | 129, 152, 179, 236, 295, 738, 1259, 2295, … | 150, 363, 231, 1052, 139 (5) | ninguno |
| HL-1293-02 | HL-1293-A012AA-N-02 | A012AA | -02 | 3/4" | 80 | 0.4 M | 68, 85, 100, 120, 193, 361 | 170, 100, 120 (3) | **100, 120** |
| HL-1294-01 | HL-1294-A012AA-N-01 | A012AA | -01 | 4" | 40 | 2.6 M | 16, 129, 179, 232, 235, 279, 424, 577, 938, 942, 948, 1840, … | 150, 363, 231, 1052, 139 (5) | ninguno |

### Metadatos comunes extraíbles

En **todos** los PDFs vectoriales:

- **drawingNumber** — desde nombre de archivo / bloque PLANO NUMERO
- **lineIdentifier** — p. ej. `HL-1291-A012AA-N-01`
- **lineClass** — derivable (`A012AA`, `A010AA`, `A032BA`)
- **suffix** `-01` / `-02`
- **Ø y SCH** — cabecera + primera tubería BOM
- **BOM resumida** — 4–11 ítems parseables (tubería, codos, bridas, válvulas, espárragos)
- **Referencias «PARA CONT. VER LINEA NUM.»** — 1–3 por plano, con plano de continuación
- **Coordenadas E/N/EL** — múltiples puntos
- **Ruido detectado** — presiones, temperaturas, rejilla F/G/B, DN, actuador, sello revisión

### HL-1291-01 — ejemplo detallado

**Continuaciones:**

1. `2301GB47G-C1-8"-HL-1278-A010AA_2-N` → plano `HL-1278-01`
2. `2301GB47G-C1-4"-HL-1291-A012AA-N` → plano `HL-1291-02`
3. `2301GB47G-C1-4"-KP-1290-A012AA-N` → plano `KP-1290-01`

**Cotas en texto embebido (zona dibujo):** 297, 1127, 629, 232, 20, 179, 1059, 129, 295, 235, 279, 938, 80.

**Golden (p.3 Isos trameados, 5 tramos):** PALILLO = 150, 363, 231, 1052, 139 mm.

**Observación:** ningún valor PALILLO aparece literal en el original. Hipótesis documentada (no validada automáticamente):

- 235 + 129 = **364** ≈ 363
- Otros tramos requieren **criterio de corte** (codos, válvulas, tramos lógicos A/B) no presente en texto

## 6. Heurísticas de cotas candidatas

> **18M-A (implementado):** scoring numérico + ranking high/medium/low en `lib/trameado/candidate-dimensions.ts`. Panel muestra top 10 + «Ver más cotas» (hasta 24). No genera PALILLO automáticamente.

### Incluir (rango 16–5000 mm, entero, score ≥15)

Números aislados en zona de dibujo, priorizados 60–2500 mm y longitudes habituales -02: 68, 85, 100, 120, 129, 170, 193, 235, 279, 295, 297, 361, etc.

### Excluir o degradar (18M-A)

| Categoría | Ejemplos | Heurística |
|-----------|----------|------------|
| Códigos SAP | `1000027194` | Regex 10 dígitos `1000…` |
| Fechas / años | `2025`, `58` (hora) | Contexto APROBADO/FECHA/`:` |
| Presiones / temperaturas | 13, 17.6, 26.4, 51, 79 | Bloque PRESIÓN/TEMPERATURA/CLASE |
| Cantidades BOM | 1.8, 2, 32 | Fila BOM + contexto TUBERIA/UD |
| Coordenadas | E/N/EL, UTM 651658… | Token `E=`/`N=`/`EL=` o valor en set coordenadas |
| Schedule | 40, 80 | Contexto `SCH 40` |
| Rating accesorio | 150#, 3000# | Contexto FIGURA 8 / BRIDA / 3000# |
| Espárragos | 90, 110, 120, 140 | Solo longitud en `5/8"x90mm` |
| Orientación | 45, 44.99 | Solo valores ángulo cerca ORIENTACION |
| Ref. línea/plano | 1289–1294, 1290 | Contexto `HL-1291`, `PLANO Nº`, KP |
| DN fraccionario | 5/8, 3/4 | Contexto tubería/accesorio, no como cota mm |

### Ranking (18M-A)

- **Primary:** top 10 por score (utilidad probable PALILLO).
- **Additional:** resto hasta `maxCandidates` 24.
- **Confidence:** high ≥70 · medium ≥40 · low &lt;40.
- **Límites abiertos:** sin X/Y, sin agrupación por tramo, sin suma automática.

### Falsos positivos residuales

- **Número de línea HL** (1289, 1291…) cuando la heurística de contexto no lo filtra
- **45** de orientación `O 45.0 S`
- **17** fragmento de `17.60` kg/cm²
- **80** ambiguo (cota vs DN vs SCH contexto)
- **Suma de todas las cotas** ≠ longitud total tubería BOM (metros) ni PALILLO

## 7. Comparación con golden output (`Isos trameados.pdf`)

| Golden página | Plano ref. | Tramos humanos (visual 18A) | PALILLO esperado | Cotas útiles en original |
|---------------|------------|-------------------------------|------------------|--------------------------|
| 1 | HL-1289-01 | 5 | 150, 363, 231, 1052, 139 | Parciales; sin match literal |
| 2 | HL-1289-02 | 3 | 170, 100, 120 | **Match literal 3/3** |
| 3 | HL-1291-01 | 5 | 150, 363, 231, 1052, 139 | Parciales; 235+129≈363 |
| 4 | HL-1291-02 | 3 | 170, 100, 120 | Match literal 2/3 (100, 120) |
| 5 | HL-1292-01 | 4 | 150, 363, 231, 1052 | Parciales |
| 6 | HL-1292-02 | 3 | 170, 100, 120 | Match literal 2/3 |
| 7 | HL-1293-01 | 5 | 150, 363, 231, 1052, 139 | Parciales |
| 8 | HL-1293-02 | 3 | 170, 100, 120 | Match literal 2/3 |
| 9 | HL-1294-01 | 5 | 150, 363, 231, 1052, 139 | Parciales; más cotas (424, 577, 1840…) |

**Limitaciones de la comparación automática:**

- `Isos trameados.pdf` no tiene texto embebido útil → **no** se leen marcas azules `<n>` ni PALILLO escrito
- La comparación es **preliminar**: cruce de cotas del vectorial vs tabla funcional 18A
- **No** se valida suma algebraica automática de cotas → PALILLO (requeriría reglas de corte + geometría)

**Patrón observado:**

- Planos **`-02`** (3/4", tramos cortos): PALILLO coincide **literalmente** con cotas en varios casos → panel de cotas muy útil
- Planos **`-01`** (4", tramos largos): PALILLO parece **combinación/selección** de cotas parciales + criterio ingeniero → prepropuesta automática arriesgada

## 8. Pregunta clave — ¿hay suficiente información para proponer PALILLOS automáticamente?

### Clasificación: **Parcial — solo cotas candidatas, no palillos completos**

| Afirmación | Evidencia |
|------------|-----------|
| Metadatos + BOM + Ø/SCH | **Sí** — ya explotado en 18I-A |
| Cotas numéricas en original | **Sí** — 7–18 candidatas/plano tras filtrar ruido |
| Tramos `<n>` en texto | **No** |
| PALILLO en texto | **No** |
| Mapeo 1:1 cota → PALILLO en `-01` | **No** demostrado |
| Mapeo literal en `-02` | **Parcial** — frecuente pero requiere elegir cuáles cotas son tramos |
| Sin interpretación humana/geométrica | **No viable** para palillos completos |

Para **prepropuesta con revisión obligatoria** en subconjunto `-02`: **marginalmente viable** (18K-B experimental). Para **`-01` principales**: **no** sin geometría o UI de selección de cotas.

## 9. Algoritmo preliminar propuesto (sin implementar en producto)

```
1. Extraer metadatos + BOM (existente 18I-A)
2. Detectar zona de dibujo vs ruido (heurística textual; idealmente bbox futuro)
3. Extraer cotas candidatas (script 18J)
4. Clasificar cotas:
   - longitudinales (candidatas PALILLO)
   - offsets / elevaciones (EL=… junto a cota)
   - referencias continuidad (PARA CONT…)
   - coordenadas / ruido
5. Mostrar panel «Cotas candidatas» al ingeniero junto al PDF
6. Ingeniero selecciona/suma → crea tramos manualmente (18C)
7. NO auto-crear palillos en producto hasta validar reglas en golden set
```

## 10. Niveles de automatización (actualizados)

| Nivel | Descripción | Estado |
|-------|-------------|--------|
| **1** | Precrear hojas + Ø/SCH desde BOM/metadatos | ✅ 18I-A |
| **2** | Panel de **cotas candidatas** filtradas y rankeadas junto al PDF/hoja | ✅ 18K-A + 18M-A |
| **3** | Prepropuesta de palillos desde cotas + revisión obligatoria | ⚠️ solo plausible en `-02`; experimental |
| **4** | Interpretación geométrica vectorial (paths, topología iso) | Research; requiere motor nuevo |
| **5** | Iso trameado automático completo + marcas `<n>` | No viable MVP; OCR/visión alto riesgo |

## 11. Siguiente fase recomendada: **18K-A** ✅ implementado

Producto: panel «Cotas candidatas» en pestaña Trameado (`TrameadoCandidateDimensionsPanel`). Ver [trameado-technical-model.md](./trameado-technical-model.md#panel-cotas-candidatas-18k-a).

| Opción | Descripción | Viabilidad | Recomendación |
|--------|-------------|------------|---------------|
| **18K-A** | Panel cotas candidatas junto PDF/hoja | **Alta** — datos ya en vectorial | **✅ Completado** |
| 18K-B | Prepropuesta experimental palillos desde cotas | Media-baja — `-02` okish, `-01` no | Tras 18K-A + golden manual |
| 18K-C | Extracción geométrica vectorial experimental | Media investigación / alto esfuerzo | Backlog; no bloquear MVP |
| 18K-D | Solo asistente manual; descartar auto | Conservadora | Innecesaria tras 18J — sí hay valor en cotas |

### Justificación 18K-A

1. Los PDFs originales **sí** contienen cotas útiles tras filtrar ruido.
2. No hay X/Y hoy, pero **lista asistida** ya reduce fricción vs buscar números en el PDF.
3. No promete PALILLO correcto; el ingeniero sigue siendo fuente de verdad.
4. Reutiliza script 18J como backend de sugerencias de cotas (similar a 18I-A para hojas).
5. Evita OCR sobre `Isos trameados.pdf` (golden, no input).

## 12. Qué haría falta para geometría (Nivel 4)

Sin añadir dependencias pesadas en 18J, opciones futuras:

- Acceso directo a **pdf.js** `getTextContent()` con matriz `transform` por ítem
- O parser de operadores `m/l/c` sobre content streams (complejidad alta)
- O exportación DXF/CSV de cotas desde CAD fuente (fuera de app)

## 13. Referencias

- Research escaneos / no usar golden como input: [trameado-auto-research.md](./trameado-auto-research.md)
- Valores PALILLO golden tabular: [trameado-functional-analysis.md](./trameado-functional-analysis.md) §3.3
- Roadmap MVP: [trameado-mvp-proposal.md](./trameado-mvp-proposal.md)

## 14. Re-ejecutar

```bash
npm run research:trameado-vector
npm run research:trameado-vector -- --json
npm run research:trameado-vector -- "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-01.pdf"
```

---

*Investigación Fase 18J — jun 2026. Sin cambios de producto.*
