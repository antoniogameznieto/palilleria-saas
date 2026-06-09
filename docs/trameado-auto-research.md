# Fase 18H — Research de trameado automático / semiautomático

> **Tipo:** investigación técnica. Sin implementación productiva.  
> **Herramienta:** `npm run research:trameado-auto`  
> **Script:** `scripts/research-trameado-auto.ts`  
> **Relacionado:** [trameado-functional-analysis.md](./trameado-functional-analysis.md) (18A), [auto-takeoff-benchmark-results.md](./auto-takeoff-benchmark-results.md), [trameado-mvp-proposal.md](./trameado-mvp-proposal.md)

## 1. Objetivo

Determinar qué parte del **trameado / hoja de palilleo** puede automatizarse de forma realista a partir de PDFs de isométricos y ejemplos del cliente, **sin vender automático total** si no es técnicamente viable.

Preguntas clave:

1. ¿Podemos generar propuestas automáticas de tramos (`<1>`, `<2>`, …) y longitudes PALILLO?
2. ¿O el MVP debe seguir siendo **manual asistido** con ayudas inteligentes (metadatos, BOM, precreación de hojas)?
3. ¿Qué diferencia hay entre los PDFs que el cliente usa como referencia visual y los PDFs vectoriales que sube la app?

## 2. Metodología

| Aspecto | Enfoque |
|---------|---------|
| Extracción | Solo **texto embebido** vía `pdf-parse` (misma base que auto-takeoff beta) |
| OCR / visión | **No** en esta fase (exploración futura documentada como Nivel 4) |
| BD / UI / producto | **No tocados** |
| Patrones | Regex sobre texto embebido (HL, `<n>`, Ø, SCH, PALILLO, etc.) |
| PDFs analizados | Ejemplos cliente + contraste con isos vectoriales HL individuales |

### Ejecución

```bash
# PDFs por defecto (Hoja de palilleo + Isos trameados)
npm run research:trameado-auto

# Incluir PDFs vectoriales HL-1291 -01/-02 como contraste
npm run research:trameado-auto -- --comparison

# Rutas arbitrarias + salida JSON
npm run research:trameado-auto -- ./ruta/a.pdf --json
```

**Rutas por defecto** (si existen localmente, no versionadas en git):

- `Ejemplos/Ejemplo 1/Hoja de palilleo.pdf`
- `Ejemplos/Ejemplo 1/Isos trameados.pdf`

## 3. Resultados por PDF

### 3.1 Hoja de palilleo.pdf (resultado esperado del cliente)

| Métrica | Valor |
|---------|-------|
| Páginas | 1 |
| Tamaño | 679 KB |
| Productor | RICOH IM C4510 (escáner multifunción) |
| Texto embebido | **12 caracteres** (`-- 1 of 1 --`) |
| Texto por página | 0 chars útiles en contenido |
| Clasificación | Escaneo raster |

**Patrones detectados automáticamente:** ninguno.

| Pregunta | Respuesta |
|----------|-----------|
| ¿HL / identificadores ISO como texto? | **No** |
| ¿-01 / -02? | **No** |
| ¿Tramos `<1>`, `<2>`? | **No** |
| ¿Diámetros 4", 3/4"? | **No** |
| ¿SCH 40 / 80? | **No** |
| ¿Longitudes PALILLO? | **No** |
| ¿Columna PALILLO / ISO / COLADA? | **No** |

**Interpretación:** la hoja es una **plantilla impresa rellenada a mano** y escaneada. El contenido útil (tabla manuscrita) es **imagen raster**, no texto seleccionable. Confirma el análisis visual de 18A.

**Limitación:** imposible reconstruir la hoja automáticamente desde este PDF con texto embebido.

---

### 3.2 Isos trameados.pdf (origen visual del trameado)

| Métrica | Valor |
|---------|-------|
| Páginas | 9 |
| Tamaño | 6,85 MB |
| Productor | RICOH IM C4510 |
| Texto embebido | **140 caracteres** (solo pies `-- N of 9 --`) |
| Texto por página | **0 chars** en cada página de contenido |
| Clasificación | Compuesto raster (9 isos escaneados) |

**Patrones detectados automáticamente:** ninguno.

| Pregunta | Respuesta |
|----------|-----------|
| ¿HL / identificadores? | **No** |
| ¿Tramos `<n>`? | **No** |
| ¿Longitudes PALILLO? | **No** |
| ¿Marcas azules como texto? | **No** |

**Marcas azules / anotaciones manuscritas:**

- En el flujo real del cliente, los números `<1>…<n>` y longitudes aparecen como **marcas azules superpuestas** sobre el isométrico (análisis visual 18A).
- En este PDF compuesto escaneado, **no hay capa de texto** para esas marcas.
- Son **gráficos rasterizados** (tinta azul + posible escritura a mano), no objetos vectoriales ni texto embebido detectable.
- **Conclusión:** leer tramos o PALILLO desde `Isos trameados.pdf` requiere **OCR / visión por computador (Nivel 4)**, no parser de texto.

**Limitación:** ratio tamaño/texto (~49 KB/página, ~0 chars útiles) confirma contenido predominantemente imagen.

---

### 3.3 Contraste: PDFs vectoriales individuales (los que sube la app)

Análisis con `--comparison` sobre isos **originales vectoriales** del mismo proyecto:

#### 2301GB47G-C1-L-HL-1291-01.pdf

| Métrica | Valor |
|---------|-------|
| Texto embebido | **2 015 caracteres** |
| Productor | OpenText PDF Writer (vectorial CAD/P&ID) |
| BOM | Sí (`RELACIÓN DE M ATERIALES`) |

**Patrones detectados:**

| Patrón | Ejemplos |
|--------|----------|
| HL completo | `HL-1291-A012AA-N-01` |
| Nº plano | `2301GB47G-C1-L-HL-1291-01`, `-02` |
| Diámetros | `4"`, `3/4"`, `5/8"`, `8"` |
| SCH | `SCH 40`, `40`, `80` |
| Cotas numéricas | 150, 363, 1059, … (mezcladas con refs HL/fechas) |
| Tramos `<n>` | **No** |
| PALILLO (columna) | **No** |

#### 2301GB47G-C1-L-HL-1291-02.pdf

| Métrica | Valor |
|---------|-------|
| Texto embebido | **1 245 caracteres** |
| SCH dominante | `SCH 80` |
| Diámetros | `3/4"`, `4"` |
| Tramos `<n>` | **No** |
| PALILLO | **No** |

**Interpretación:** los PDFs **individuales** que la app ya almacena sí permiten **Nivel 1–2** (metadatos, BOM, Ø/SCH por tubería principal). **No** contienen la hoja de palilleo ni las marcas de trameado como texto estructurado.

## 4. Síntesis de hallazgos

### 4.1 Texto embebido útil

| PDF | Chars | ¿Automatizar tramos? | ¿Hints metadatos/BOM? |
|-----|-------|----------------------|------------------------|
| Hoja de palilleo.pdf | 12 | No | No |
| Isos trameados.pdf | 140 | No | No |
| HL-1291-01.pdf (vectorial) | 2 015 | No | **Sí** |
| HL-1291-02.pdf (vectorial) | 1 245 | No | **Sí** |

### 4.2 Patrones automáticos confirmados

| Patrón | Hoja palilleo | Isos trameados | HL vectorial |
|--------|---------------|----------------|--------------|
| `HL-\d+` | — | — | ✓ |
| `HL-…-A012AA-N-0\d` | — | — | ✓ |
| `-01` / `-02` | — | — | ✓ (en metadatos) |
| `<\d+>` tramos | — | — | — |
| `4"`, `3/4"` | — | — | ✓ |
| SCH 40 / 80 | — | — | ✓ |
| PALILLO / longitudes de corte | — | — | — |
| Marcas azules | raster | raster | N/A (no en PDF origen) |

### 4.3 Marcas azules

- **No detectables** en texto embebido en ninguno de los PDFs de ejemplo del cliente.
- En `Isos trameados.pdf` el contenido gráfico es **escaneo RICOH** → marcas y números son píxeles, no texto.
- Automatizar lectura de esas marcas = **Nivel 4** (OCR + visión), alto riesgo y fuera del alcance actual.

## 5. Niveles de automatización

### Nivel 0 — Manual asistido ✅ (implementado 18C–18G)

- Usuario introduce tramos mirando PDF en workspace.
- Export CSV/XLSX.
- **Estado actual del producto.**

### Nivel 1 — Sugerencias por contexto ✅ (parcialmente implementado)

| Capacidad | Estado |
|-----------|--------|
| Sugerir ISO desde metadatos (`buildSuggestedLineIdentifier`) | ✅ |
| Autoincremento Nº, mantener Ø/SCH/COLADA | ✅ 18E |
| Sugerir Ø/SCH desde BOM | ❌ pendiente |
| Resumen tramos · mm | ✅ |

**Viable y recomendado** como siguiente paso productivo.

### Nivel 2 — Precreación de hojas

- Detectar patrón `-01`/`-02` en metadatos del plano o líneas relacionadas en el trabajo.
- Crear hojas vacías con ISO, CLASE, Ø y SCH por defecto (p. ej. 4" SCH 40 para `-01`, 3/4" SCH 80 para `-02`).
- Usuario solo introduce **conteo y longitudes PALILLO** mirando el iso (escaneado o vectorial).
- **Viable** usando metadatos + BOM existente; **no** requiere leer marcas azules.

### Nivel 3 — Propuesta desde texto embebido

- Parser que infiera filas `<n>` + PALILLO desde PDF.
- **No viable** en ejemplos analizados: cero tramos `<n>` en texto embebido.
- Podría existir en PDFs hipotéticos «digitales nativos» de hoja Excel exportada a PDF; **no** en los del cliente.
- Si aparece en el futuro: parser **experimental separado**, no mezclado con flujo manual.

### Nivel 4 — Propuesta desde marcas visuales / OCR

- Detectar números manuscritos, marcas azules, longitudes en imagen.
- Requeriría Tesseract u otro OCR + heurísticas de color/forma.
- **Alto riesgo:** baja precisión, muchos falsos positivos en cotas del plano vs palillos.
- Mantener como **research no productivo** (similar a OCR title-block experimental).

### Nivel 5 — Trameado geométrico real

- Interpretar topología del isométrico, válvulas, codos, reglas de corte.
- **Muy alto riesgo**; fuera de alcance previsible del MVP.

## 6. MVP automático realista (recomendación)

**No prometer trameado automático total** con los PDFs actuales del cliente.

Posicionamiento honesto:

> **Asistente de palilleo / trameado** — el ingeniero sigue siendo la fuente de verdad para longitudes; la app reduce fricción y errores de transcripción.

| Capacidad MVP automático | Prioridad |
|--------------------------|-----------|
| Precrear hoja con ISO desde metadatos | Alta (parcial ✅) |
| Precrear hojas -01/-02 con Ø/SCH típicos | Alta |
| Sugerir Ø/SCH desde primera tubería BOM | Alta |
| Autoincremento Nº, sticky fields | ✅ hecho |
| Validar suma tramos vs tubería BOM (alerta) | Media |
| Usuario introduce PALILLO mirando PDF | **Siempre** en MVP |
| Auto-leer marcas azules | **No** |

## 7. Siguiente fase recomendada: **18I-A**

Opciones evaluadas:

| Opción | Descripción | Viabilidad | Recomendación |
|--------|-------------|------------|---------------|
| **18I-A** | Sugerencias desde BOM/metadatos; precrear hojas; Ø/SCH | **Alta** — datos ya en app | **✅ Recomendada** |
| 18I-B | Parser experimental tramos desde texto embebido | **Baja** — 0 matches en ejemplos | Solo si aparecen PDFs con `<n>` en texto |
| 18I-C | Research OCR visual no productivo | **Media investigación / baja producto** | Backlog; no bloquear MVP |

### Justificación 18I-A

1. Confirma técnicamente que **HL, Ø, SCH y BOM** sí están en PDFs vectoriales de la app.
2. Confirma que **PALILLO y `<n>`** solo existen en capa visual (escaneos / marcas azules).
3. Alineado con lo ya construido (workspace PDF + hoja manual + export).
4. Entrega valor al cliente («automatización» percibida) sin prometer magia sobre escaneos.
5. Reutiliza motor auto-takeoff beta **solo como consulta**, no como output de trameado.

### Alcance propuesto 18I-A (borrador)

- Al abrir Trameado sin hoja: botón «Crear hoja sugerida» con ISO, CLASE, Ø, SCH desde metadatos + BOM.
- Si el trabajo tiene pareja `-01`/`-02` detectable: ofrecer precreación de ambas hojas vacías.
- Banner informativo: «Longitudes de corte: introdúcelas manualmente desde el isométrico».
- Sin autoaplicar tramos ni longitudes.

### 18I-B / 18I-C (postergar)

- **18I-B:** script `research-trameado-embedded-segments.ts` solo si el cliente aporta PDFs con hoja digital nativa.
- **18I-C:** extensión de benchmark OCR sobre regiones de iso escaneado; documentar precisión antes de cualquier UI.

## 8. Riesgos de «vender automático»

| Riesgo | Mitigación |
|--------|------------|
| Cliente espera leer `Isos trameados.pdf` automáticamente | Mostrar research 18H; explicar escaneo vs vectorial |
| Confundir BOM (palillería) con hoja de palilleo (tramos) | Mantener pestañas separadas; copy claro en UI |
| OCR en cotas del plano vs palillos reales | No implementar sin golden set de trameado |
| Inversión en Nivel 5 geométrico | Descartar explícitamente en roadmap |

## 9. Referencias cruzadas

- Benchmark previo: [auto-takeoff-benchmark-results.md](./auto-takeoff-benchmark-results.md) — mismos 12/140 chars para estos PDFs.
- Análisis funcional 18A: [trameado-functional-analysis.md](./trameado-functional-analysis.md) — estructura hoja, bloques ISO, longitudes de ejemplo.
- Producto actual: pestaña Trameado 18C–18G, manual asistido.

## 10. Re-ejecutar research

```bash
npm run research:trameado-auto
npm run research:trameado-auto -- --comparison
npm run research:trameado-auto -- "Ejemplos/Ejemplo 1/Hoja de palilleo.pdf" --json
```

Salida JSON útil para adjuntar a informes o ampliar golden set futuro.

---

*Investigación Fase 18H — jun 2026. Sin cambios de producto.*
