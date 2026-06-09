# Resultados del benchmark OCR experimental (cajetín)

> **Alcance:** evaluación manual de calidad y rendimiento del flujo experimental (`EXPERIMENTAL_TITLE_BLOCK_OCR=true`).  
> **No** integra OCR productivo ni autoaplica metadatos.  
> **Herramienta:** `npm run benchmark:ocr -- <ruta-local.pdf> [opciones]`

Registra aquí las pruebas reales antes de decidir templates de ROI, idiomas o integración más seria.

---

## Cómo ejecutar una prueba

```bash
# Default (preset abajo-derecha: X 65, Y 75, ancho 35, alto 25)
npm run benchmark:ocr -- ./samples/plano-ejemplo.pdf

# Preset nombrado
npm run benchmark:ocr -- ./samples/plano.pdf --preset bottom-left

# Recorte manual (%)
npm run benchmark:ocr -- ./samples/plano.pdf --x 65 --y 75 --width 35 --height 25
```

Comprobar Tesseract antes:

```bash
npm run check:tesseract
```

Instalación: [tesseract-ocr-setup.md](./tesseract-ocr-setup.md)

---

## Tabla de registro

Copia una fila por PDF probado. Rellena **candidatos correctos/incorrectos** tras revisión humana contra el plano original.

| # | Archivo / plano | Tipo PDF | Preset | Zona (X/Y/ancho/alto %) | Idiomas usados | Texto OCR (resumen) | Candidatos detectados | Correctos / incorrectos | Tiempo (ms) | Observaciones |
|---|-----------------|----------|--------|-------------------------|----------------|---------------------|----------------------|-------------------------|-------------|---------------|
| 1 | 1601GB16A-PL1-L-DMS-703-01-R03.pdf | pendiente (OCR legible en cajetín) | bottom-right | 65 / 75 / 35 / 25 | spa+eng → eng → spa | `LEEN \| a` / fragmentos ruidosos; intuye DMS-703 | — / — / — | ✗ todos | 499 | Recorte demasiado estrecho/sucio; OCR intuye DMS-703 pero no parsea |
| 2 | 1601GB16A-PL1-L-DMS-703-01-R03.pdf | pendiente | bottom-left | 0 / 75 / 35 / 25 | spa+eng → eng → spa | `DETALLETR? Seer O` / `PRESIÓN DISEÑO...` | — / — / — | ✗ todos | 492 | No contiene cajetín útil para metadatos |
| 3 | 1601GB16A-PL1-L-DMS-703-01-R03.pdf | pendiente | top-right | 65 / 0 / 35 / 25 | spa+eng → eng → spa | `RELACIÓN DE MATERIALES...` | — / — / — | ✗ todos | 654 | Detecta tabla de materiales, no cajetín |
| 4 | 1601GB16A-PL1-L-DMS-703-01-R03.pdf | pendiente | top-left | 0 / 0 / 35 / 25 | spa+eng → eng → spa | _(sin texto legible)_ | — / — / — | ✗ todos | 526 | Zona no útil |
| 5 | 1601GB16A-PL1-L-DMS-703-01-R03.pdf | pendiente | _(manual)_ | 45 / 65 / 55 / 35 | spa+eng → eng → spa | `1601GB16A PLI-L-OMS-709-01` | DMS-709 / — / — | ✗ nº (debería DMS-703) / ✗ línea / ✗ rev | 750 | Mejora respecto al preset; detecta mal el número por OCR/recorte |
| 6 | 1601GB16A-PL1-L-DMS-703-01-R03.pdf | pendiente | _(manual)_ | 35 / 60 / 65 / 40 | spa+eng → eng → spa | `*1601GB16A-PL1-3/4'-DMS-703-CO90AHT-N-01` | DMS-703 / — / — | ✓ nº DMS-703 / ✗ línea / ✗ rev | 790 | **Mejor resultado.** Nº plano correcto; línea y revisión aún sin detectar |

### Leyenda — tipo de PDF

| Valor | Criterio orientativo |
|-------|----------------------|
| **texto embebido** | `npm run inspect:pdf` devuelve texto seleccionable en el cajetín |
| **escaneado** | Página rasterizada; poco o ningún texto embebido |
| **vectorial** | Dibujo CAD/vector sin capa de texto útil en el cajetín |

### Leyenda — candidatos

Campos parseados por `parseDrawingMetadataFromPdfText`:

- **Nº plano** (`drawingNumber`)
- **Línea** (`lineNumber`)
- **Revisión** (`revision`)

Marca en **Correctos / incorrectos** qué campos coinciden con el plano real.

---

## Sesión 2026-06-09 — `1601GB16A-PL1-L-DMS-703-01-R03.pdf`

- **Archivo:** `1601GB16A-PL1-L-DMS-703-01-R03.pdf`
- **Ruta local:** `./storage/companies/cmq59yda70001o9qewato82p8/jobs/cmq5a8ic50009o9qegcl9k1a6/drawings/cmq5cxqwk000ho9i12qwjz667/1601GB16A-PL1-L-DMS-703-01-R03.pdf`
- **Entorno:** macOS local — Tesseract **5.5.2**
- **Idiomas (pipeline):** `spa+eng` → `eng` → `spa` (`--psm 6`)
- **Tipo PDF:** pendiente de clasificar (vectorial / escaneado / texto embebido); OCR legible en zona de cajetín
- **Tesseract disponible:** sí

### Resumen por zona

| Prueba | Preset / zona | Duración | Nº plano detectado | Valor real esperado | ¿Correcto? |
|--------|---------------|----------|--------------------|---------------------|------------|
| 1 | bottom-right (65/75/35/25) | 499 ms | — | DMS-703 | ✗ |
| 2 | bottom-left (0/75/35/25) | 492 ms | — | DMS-703 | ✗ |
| 3 | top-right (65/0/35/25) | 654 ms | — | DMS-703 | ✗ |
| 4 | top-left (0/0/35/25) | 526 ms | — | DMS-703 | ✗ |
| 5 | amplia inf. derecha (45/65/55/35) | 750 ms | DMS-709 | DMS-703 | ✗ |
| 6 | amplia inferior (35/60/65/40) | 790 ms | DMS-703 | DMS-703 | ✓ |

### Texto OCR por prueba

**1) bottom-right** — recorte 65/75/35/25

```
LEEN | a
AE corcerenrttae-oMs-703-cosoantnct [ae
```

**2) bottom-left** — recorte 0/75/35/25

```
DETALLETR? Seer O
PRESIÓN DISEÑO...
```

**3) top-right** — recorte 65/0/35/25

```
RELACIÓN DE MATERIALES...
```

**4) top-left** — recorte 0/0/35/25

```
(sin texto legible)
```

**5) zona amplia inferior derecha** — recorte 45/65/55/35

```
1601GB16A PLI-L-OMS-709-01
```

**6) zona amplia inferior** — recorte 35/60/65/40 _(mejor resultado)_

```
*1601GB16A-PL1-3/4'-DMS-703-CO90AHT-N-01
```

### Conclusión de esta sesión

- Tesseract funciona y es rápido en local (**< 1 s** por prueba).
- La calidad depende **mucho del ROI**; el preset default `bottom-right` 35×25 % es insuficiente para este formato.
- La zona **X 35 / Y 60 / ancho 65 / alto 40** detecta correctamente el nº de plano **DMS-703**.
- Línea y revisión no se extraen aún con los patrones actuales de `parse-pdf-text`.
- **Próximo paso recomendado:** añadir preset experimental «Franja inferior derecha amplia» (35/60/65/40) y mejorar el parser para códigos OCR ruidosos (línea/revisión).

---

## Plantilla por prueba (detalle)

Usa este bloque debajo de la tabla cuando necesites más contexto.

### Prueba N — `<nombre-archivo>`

- **Fecha:**
- **Entorno:** macOS / Linux / Docker — Tesseract versión:
- **Preset / zona:**
- **Tipo PDF:**
- **Duración total (script):**
- **Tesseract disponible:** sí / no
- **Texto OCR completo (preview):**

```
(pegar salida del script o textPreview)
```

- **Candidatos:**

| Campo | Detectado | Valor real | ¿Correcto? |
|-------|-----------|------------|------------|
| Nº plano | | | |
| Línea | | | |
| Revisión | | | |

- **Observaciones:**

---

## Conclusiones preliminares

Basado en la sesión con `1601GB16A-PL1-L-DMS-703-01-R03.pdf` (Tesseract 5.5.2, 6 zonas probadas).

| Aspecto | Hallazgo inicial |
|---------|------------------|
| Calidad OCR en vectoriales | Pendiente clasificar tipo PDF; OCR legible en cajetín con ROI adecuado |
| Calidad OCR en escaneados | Sin datos aún |
| ROI default (abajo-derecha 35×25) | **Insuficiente** para este formato; texto ruidoso, sin candidatos parseados |
| ROI amplia inferior (35/60/65/40) | **Mejor opción probada** — nº plano DMS-703 correcto |
| Idiomas spa+eng | Funcionan; pipeline < 1 s en local |
| Tiempo medio por plano | ~500–790 ms (6 pruebas, mismo PDF) |
| Línea / revisión | No detectadas; parser actual no cubre códigos OCR ruidosos |
| ¿Listo para integración seria? | **No** — hace falta preset ROI por formato y mejoras de parser antes de «Aplicar» |

---

## Referencias

- Investigación: [ocr-ai-research.md](./ocr-ai-research.md) — Fase 10F
- Tesseract: [tesseract-ocr-setup.md](./tesseract-ocr-setup.md)
- Script: `scripts/benchmark-title-block-ocr.ts`
