# Fase 18A — Análisis funcional de hoja de palilleo / trameado real

> **Tipo:** investigación funcional y modelo conceptual preliminar.  
> **Sin implementación:** no Prisma, no UI, no parser, no automatización.  
> **Fuentes analizadas:** `Ejemplos/Ejemplo 1/Hoja de palilleo.pdf`, `Ejemplos/Ejemplo 1/Isos trameados.pdf` (análisis visual, jun 2026).  
> **Relacionado:** [auto-takeoff-research.md](./auto-takeoff-research.md) (beta BOM), [trameado-mvp-proposal.md](./trameado-mvp-proposal.md) (MVP propuesto).

## 1. Objetivo

Definir qué debe generar realmente la aplicación para el cliente: una **hoja de palilleo/trameado por tramos fabricables**, no solo una lista de materiales (BOM). La beta actual extrae ítems de «RELACIÓN DE MATERIALES»; los ejemplos del cliente muestran un entregable distinto en granularidad, estructura y origen de datos.

## 2. Qué representa cada archivo

| Archivo | Rol en el flujo del cliente | Contenido observable |
|---------|----------------------------|----------------------|
| **Hoja de palilleo.pdf** | **Resultado esperado** — tabulación final para taller/fabricación | Tabla manuscrita en plantilla impresa (rejilla). Agrupa tramos por identificador de línea/plano. |
| **Isos trameados.pdf** | **Origen visual** — isométricos con marcas de trameado superpuestas | 9 páginas = isométricos del proyecto CEPSA 2301GB47G con anotaciones azules manuales (tramos, números de palillo, puntos de corte). |

**Relación entre ambos:** cada bloque de la hoja (p. ej. `HL-1291-A012AA-N-01`) corresponde a un isométrico concreto del PDF de isos trameados. Los números `<1>…<n>` de la hoja coinciden con las marcas azules del iso. Las longitudes de la columna PALILLO son las medidas de corte que el ingeniero ha calculado a partir del dibujo (cotas impresas + criterio de corte en válvulas/bridas/codos).

## 3. Estructura funcional de la hoja de palilleo

### 3.1 Columnas observadas (plantilla impresa)

| Columna | Contenido real en el ejemplo | Obligatoriedad | Notas |
|---------|------------------------------|----------------|-------|
| **ISO** | Identificador de línea/plano/hoja, p. ej. `HL-1289-A010AA-N-01`, `HL-1291-A012AA-N-02` | **Sí** | Agrupa todas las filas de un mismo isométrico. Formato: `{línea HL}-{clase}-{sufijo -01/-02}`. |
| **CLASE** | Vacía en el ejemplo | Opcional | Podría derivarse del identificador (`A010AA`, `A012AA`, `A032BA`). |
| **Nº** | Número de tramo/palillo: `<1>`, `<2>`, … `<5>` (a veces más) | **Sí** | Orden secuencial dentro del ISO. No es código SAP. |
| **Ø** | Diámetro nominal: `4"`, `3/4"` | **Sí** | Suele ser constante dentro de un ISO `-01` o `-02`. |
| **SCH.** | Schedule / espesor: `40`, `80` | **Sí** | Acoplado al diámetro de la línea. |
| **PALILLO** | Longitud de corte (valor numérico, p. ej. `150`, `363`, `1052`, `2909`) | **Sí** | Unidad implícita **mm** (coherente con cotas del iso). Es el dato central del entregable. |
| **COLADA** | Vacía en el ejemplo | Opcional | Campo de trazabilidad de material (colada/heat); reservado para taller. |

### 3.2 Reglas de agrupación y orden

1. **Agrupación primaria:** por **ISO** (una «hoja lógica» por isométrico).
2. **Orden de tramos:** `<1>` → `<2>` → … secuencial, siguiendo el recorrido de la línea en el isométrico.
3. **Parejas -01 / -02:** en el ejemplo, cada línea HL aparece en dos variantes:
   - **`-01`:** tramo principal (típicamente 4", SCH 40), más tramos y longitudes mayores.
   - **`-02`:** continuación/detalle (típicamente 3/4", SCH 80), menos tramos, longitudes menores.
4. **Separación visual:** línea horizontal entre bloques ISO distintos en la hoja manuscrita.
5. **Constantes por bloque:** Ø y SCH. se repiten en todas las filas del mismo ISO (no varían por tramo en el ejemplo).

### 3.3 Líneas presentes en el ejemplo (muestra)

| ISO (bloque) | Tramos | Ø | SCH. | Longitudes PALILLO (mm) |
|--------------|--------|---|------|-------------------------|
| HL-1289-A010AA-N-01 | `<1>`–`<5>` | 4" | 40 | 150, 363, 231, 1052, 139 |
| HL-1289-A010AA-N-02 | `<1>`–`<3>` | 3/4" | 80 | 170, 100, 120 |
| HL-1291-A012AA-N-01 | `<1>`–`<5>` | 4" | 40 | 150, 363, 231, 1052, 139 |
| HL-1291-A012AA-N-02 | `<1>`–`<3>` | 3/4" | 80 | 170, 100, 120 |
| HL-1292-A032BA-N-01 | `<1>`–`<4>` | 4" | 40 | 150, 363, 231, 1052 |
| HL-1292-A032BA-N-02 | `<1>`–`<3>` | 3/4" | 80 | 170, 100, 120 |
| HL-1293-A012AA-N-01 | `<1>`–`<5>` | 4" | 40 | 150, 363, 231, 1052, 139 |
| HL-1293-A012AA-N-02 | `<1>`–`<3>` | 3/4" | 80 | 170, 100, 120 |
| HL-1294-A012AA-N-01 | `<1>`–`<5>` | 4" | 40 | 150, 363, 231, 1052, 139 |
| HL-1294-A012AA-N-02 | `<1>`–`<3>` | 3/4" | 80 | 170, 100, 120 |

> Los valores repetidos entre líneas HL distintas sugieren que la hoja puede ser plantilla de ejemplo o copia de un mismo criterio de corte; en producto, cada ISO debe tener sus longitudes propias derivadas de su iso.

### 3.4 Limitaciones del PDF como fuente automática

Benchmark previo ([auto-takeoff-benchmark-results.md](./auto-takeoff-benchmark-results.md)):

- `Hoja de palilleo.pdf`: **12 caracteres** de texto embebido → prácticamente **raster/escaneo manuscrito**.
- `Isos trameados.pdf`: **140 caracteres** en 9 páginas → **no parseable** por extracción de texto; las marcas azules son gráficas/manuscritas.

Conclusión: el entregable real **no sale del BOM** ni del texto embebido de estos PDFs.

## 4. Análisis de los isométricos trameados

### 4.1 Contenido impreso (automático potencial a medio plazo)

Por cada página del PDF de isos:

| Elemento | Ejemplo | Utilidad para trameado |
|----------|---------|------------------------|
| Identificador de línea | `2301GB47G-C1-4"-HL-1289-A010AA-N` | Mapea a columna ISO de la hoja |
| Nº plano / revisión | `2301GB47G-C1-L-HL-1289-01`, Rev. 0 | Vincula a `Drawing` en la app |
| Clase / spec | `A010AA`, presión, temperatura | Metadatos de línea; columna CLASE |
| Diámetro en cabecera | `4"`, `3/4"` | Columna Ø |
| BOM embebida | RELACIÓN DE MATERIALES (ítems 1–n) | **Ayuda** (materiales, schedule, válvulas); no sustituye tramos |
| Cotas lineales | `235`, `293`, `129`, `1127`, etc. | Base para calcular longitudes de palillo |
| Elevaciones / coordenadas | `EL=+101300`, `N=…`, `E=…` | Contexto; no van a la hoja directamente |
| Referencias a continuación | «PARA CONT. VER LÍNEA NUM. …» | Explica parejas -01/-02 |
| Símbolos de válvulas, bridas, codos | Items [1]…[11] enlazados al BOM | Delimitan posibles cortes |

### 4.2 Marcas manuales (azul) — origen del trameado

| Marca | Forma | Significado observado |
|-------|-------|----------------------|
| **`<n>`** | Número entre ángulos, junto a tramos rectos | **Número de palillo/tramo** → columna Nº + fila en hoja |
| **`(n)`** | Círculo azul con número | **Punto de referencia** (corte, soldadura, límite de tramo o accesorio) |
| **Tramo A / B / C** | Texto manuscrito + flecha | **Agrupación lógica de fabricación** (varios `<n>` pueden pertenecer a un tramo mayor para montaje) |
| **Líneas/flechas azules** | Sobre tubería | Delimitan visualmente el tramo medido |
| **Etiquetas puntuales** | p. ej. «ACTUADOR WEST» | Aclaración de componente; no siempre aparece en hoja |

**Jerarquía observada:**

```
Línea / ISO (HL-1291-A012AA-N-01)
  └── Tramo lógico (A, B, C) — agrupación de montaje
        └── Segmento numerado (<1>, <2>, …) — unidad de la hoja de palilleo
              └── Puntos (1)…(11) — referencias en el dibujo
```

### 4.3 Correspondencia iso ↔ hoja (ejemplo HL-1289)

| En el iso `-01` | En la hoja |
|-----------------|------------|
| Marcas `<1>`…`<5>` | Filas Nº `<1>`…`<5>` bajo `HL-1289-A010AA-N-01` |
| Diámetro 4", SCH 40 en BOM | Ø `4"`, SCH. `40` |
| Cotas parciales (235, 293, 129…) | Suma/criterio → PALILLO (150, 363, 231, 1052, 139) |
| Tramo A / Tramo B en azul | **No** aparece como columna en la hoja; es capa intermedia de trabajo |

### 4.4 Qué es automático vs manual hoy

| Información | Origen | Automatizable hoy | Automatizable medio plazo |
|-------------|--------|-------------------|-------------------------|
| Identificador ISO / metadatos | Impreso (cajetín + bloque datos) | Parcial (detección metadatos ya existe) | Sí |
| Diámetro / schedule | Impreso (BOM + cabecera) | Parcial (desde BOM beta) | Sí, con validación |
| Lista de accesorios | BOM | Sí (beta actual) | Sí |
| Número de tramos `<n>` | Manuscrito azul | No | Solo con visión/OCR (alto riesgo) |
| Etiqueta Tramo A/B/C | Manuscrito | No | No sin IA visual |
| Longitud PALILLO | Derivada de cotas + criterio ingeniero | No (criterio de corte) | Semiautomático con reglas + revisión |
| Puntos `(n)` | Manuscrito | No | Anotación manual asistida en UI |

## 5. Modelo conceptual preliminar

### 5.1 Entidades propuestas

```
TrameadoSheet (hoja lógica por ISO / plano)
├── id
├── companyId, jobId
├── drawingId (opcional — enlace al PDF origen)
├── lineIdentifier      // HL-1291-A012AA-N-01
├── lineClass           // A012AA (derivable)
├── diameter            // 4" (valor por defecto del bloque)
├── schedule            // 40
├── sheetSuffix         // -01 | -02
├── sourceDrawingNumber // 2301GB47G-C1-L-HL-1291-01
├── status              // draft | reviewed | approved
├── notes
└── segments[]

TrameadoSegment (fila de palillo)
├── id
├── sheetId
├── segmentNumber       // 1, 2, 3… (presentación: "<1>")
├── segmentLabel        // opcional: "A", "B" si se modela tramo lógico
├── spoolGroup          // Tramo A | Tramo B | Tramo C
├── diameter            // redundante por fila o heredado
├── scheduleOrThickness // SCH 40, SCH 80
├── length              // valor PALILLO
├── unit                // mm (default)
├── sourcePage          // página del PDF
├── sourceMark          // referencia visual, p. ej. "entre (2) y (3)"
├── observations
├── lengthOrigin        // manual | calculated | detected
├── confidence          // n/a en manual; 0–1 si hay sugerencia
└── status              // draft | reviewed | approved
```

### 5.2 Relación con el trabajo y el plano

- Un **Job** puede tener muchas **TrameadoSheet** (una por ISO/hoja lógica).
- Una **Drawing** (PDF subido) puede corresponder a 1 sheet (típico `-01` o `-02`).
- La **hoja de palilleo exportada** del cliente es la **agregación** de todas las sheets del job, ordenadas por línea HL.

## 6. Comparación con `DrawingTakeoffItem` (modelo actual)

| Concepto | DrawingTakeoffItem (hoy) | Hoja de palilleo (cliente) |
|----------|--------------------------|----------------------------|
| Unidad de fila | Ítem de material / BOM | Tramo fabricable (tubo a cortar) |
| reference | Código SAP (1000937601) | No aplica; sería `<n>` o nada |
| description | Texto largo de material | Ø + SCH (+ observaciones breves) |
| quantity | Cantidad BOM (metros, ud) | Longitud de **un** palillo |
| unit | M, UD, etc. | mm (implícito) |
| length | Campo opcional poco usado | **Campo central** (PALILLO) |
| Agrupación | Por drawingId | Por lineIdentifier (ISO) + orden `<n>` |
| Origen | Import BOM / manual genérico | Cálculo desde iso trameado |

### 6.1 Campos que coinciden (parcialmente)

- `drawingId`, `jobId`, `companyId` — contexto de tenancy.
- `length` — podría almacenar PALILLO, pero hoy no es el eje semántico.
- `notes` — observaciones.
- `quantity` — **no equivalente** (mezclaría cantidad BOM con longitud de corte).

### 6.2 Campos que faltan en DrawingTakeoffItem

- `lineIdentifier` / ISO
- `segmentNumber` (`<n>`)
- `spoolGroup` / Tramo A|B|C
- `diameter`, `schedule` (como campos de primera clase)
- `segmentLabel`, `sourcePage`, `sourceMark`
- `lengthOrigin`, `status` de segmento
- Orden explícito de tramos dentro del ISO

### 6.3 Campos actuales que sobran o no aplican al trameado

- `reference` (SAP) — propio del BOM, no del palillo.
- `description` como texto BOM — demasiado genérico para export de hoja.
- `width`, `height` — no aparecen en el entregable cliente.
- Import CSV / matched-missing — flujo BOM, no trameado.

### 6.4 ¿Reutilizar o crear entidad nueva?

**Recomendación: entidad nueva** (`TrameadoSegment` / `PipeSegment`), no extender `DrawingTakeoffItem` como modelo principal.

| Opción | Pros | Contras |
|--------|------|---------|
| Reutilizar DrawingTakeoffItem | Menos tablas | Semántica incompatible; exports y UI actuales asumen BOM; riesgo de mezclar dos productos |
| Entidad nueva + convivencia | Separación clara BOM vs trameado; alineado con docs originales (`PipeSegment` en cursor-palilleria-docs) | Migración y UI adicionales en fases posteriores |
| Entidad nueva reemplazando takeoff | Un solo concepto | Rompe beta BOM y flujos ya entregados |

**Convivencia propuesta:** la beta BOM sigue como **entrada de ayuda** (materiales, válvulas, schedule sugerido); el trameado es **salida de fabricación** en tabla distinta.

## 7. Enfoques futuros (clasificación)

### A. Manual asistido — viable corto plazo

- Ingeniero abre PDF (iso) y rellena tabla de tramos.
- App valida orden, duplicados, unidades; agrupa por ISO; exporta hoja.
- **Encaja con el ejemplo del cliente** (hoja manuscrita = lo que la app debe digitalizar).

### B. Semiautomático — viable medio plazo

- App precarga diámetro/schedule desde BOM y metadatos.
- Sugiere número de tramos a partir de cotas y reglas de corte (bridas, válvulas).
- Usuario marca/confirma tramos en visor; app calcula longitudes propuestas.
- Requiere motor de reglas (criterios de palillería del job) + revisión obligatoria.

### C. Automático visual — alto riesgo

- Interpretar marcas azules, `<n>`, Tramo A/B y geometría del iso sin intervención.
- Requiere visión por computador, OCR manuscrito, IA — explícitamente fuera de alcance actual.
- Los PDFs de ejemplo no tienen texto embebido útil para estas marcas.

## 8. Implicaciones para la beta BOM actual

La beta supervisada (Fases 14–17) permanece válida como:

- **Preparación de materiales** y detección de ítems SAP.
- **Checklist** de válvulas, soportes, exclusiones.

No produce:

- Tramos `<n>` con longitud de corte.
- Hoja de palilleo exportable.
- Iso trameado marcado.

Ver [auto-takeoff-research.md § Fase 18A](./auto-takeoff-research.md#fase-18a--trameado-real-vs-beta-bom).

## 9. Preguntas abiertas para validar con cliente

1. ¿La columna CLASE debe exportarse o basta con el identificador ISO?
2. ¿COLADA se rellena en taller o debe estar en la app?
3. ¿Tramo A/B/C debe aparecer en export o es solo ayuda de trabajo?
4. ¿Unidad oficial de PALILLO: siempre mm?
5. ¿Criterio de longitud: corte real, eje a eje, cara a cara?
6. ¿La hoja final es un PDF por job o un Excel editable?

---

*Documento generado en Fase 18A. Sin cambios de código productivo.*
