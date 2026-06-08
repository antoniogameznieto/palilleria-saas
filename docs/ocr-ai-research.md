# Investigación técnica OCR/IA para planos PDF (Fase 10A)

> **Estado:** experimental / investigación  
> **Alcance:** evaluación aislada. No integrado en detección productiva, palillería ni permisos.  
> **Commit base:** Fase 9F (`70992e5`)

## Contexto actual en palilleria-saas

| Capacidad | Implementación | Limitación |
|-----------|----------------|------------|
| Texto embebido | `pdf-parse` → `getText()` en `lib/drawings/pdf-text-extract.ts` | Solo PDFs con capa de texto |
| Metadatos cajetín | Regex sobre texto embebido (`lib/drawings/parse-pdf-text.ts`) | Depende de texto legible y patrones conocidos |
| Detección productiva | Filename + texto embebido → merge → revisión humana (`detection-apply.ts`) | Sin visión ni OCR |
| UI manual | Extracción de texto bajo demanda (`drawing-pdf-text-extraction.tsx`) | Preview en memoria; no persiste |

Cuando `hasEmbeddedText === false`, el mensaje actual indica plano escaneado o vectorial sin texto — **hueco que OCR/IA debe cubrir**.

---

## Comparativa de enfoques

### 1. Texto embebido actual (baseline)

**Qué es:** extraer strings ya presentes en el PDF (no renderizar píxeles).

| Pros | Contras |
|------|---------|
| Rápido, barato, on-prem | Inútil en escaneados |
| Ya integrado y probado | Orden espacial imperfecto en cajetines complejos |
| Sin datos saliendo del servidor | No lee texto “dibujado” como geometría |

**Cuándo usar:** siempre como **primer paso** (coste ~0).

---

### 2. OCR local (Tesseract, etc.)

**Qué es:** PDF → imagen por página → motor OCR open source.

| Pros | Contras |
|------|---------|
| Privacidad total | Calidad variable en planos técnicos |
| Sin coste por página (solo CPU/RAM) | Requiere binarios/deps nativas |
| Predecible en servidor propio | Lento en PDFs multipágina A0/A1 |
| | Necesita recorte de zonas (cajetín) para precisión |

**Opciones típicas:**

- **Tesseract 5** (+ `tesseract.js` o wrapper CLI): maduro, gratuito, peor en rotaciones/fuentes CAD.
- **ocrmypdf** (preproceso + Tesseract): útil en batch dev, pesado en runtime web.
- **PaddleOCR / docTR**: mejor en documentos, más peso de modelo.

**Cuándo usar:** MVP offline/dev, empresas con restricción cloud, volúmenes moderados.

---

### 3. OCR externo (cloud managed)

**Qué es:** API tipo Google Document AI, Azure Document Intelligence, AWS Textract, OCR.space.

| Pros | Contras |
|------|---------|
| Mejor en layouts complejos | Coste por página |
| Escala sin gestionar GPU | PDF sale del perímetro (privacidad) |
| Algunos detectan tablas/bloques | Latencia de red + cuotas |
| Menos ops de infra | Vendor lock-in |

**Cuándo usar:** piloto 10B con pocos planos/día, o clientes que aceptan DPA cloud.

---

### 4. IA visual / multimodal (GPT-4o, Claude, Gemini, modelos visión)

**Qué es:** imagen (o PDF renderizado) + prompt → JSON estructurado con campos candidatos.

| Pros | Contras |
|------|---------|
| Flexible ante formatos nuevos | Coste alto por plano |
| Puede inferir contexto (“parece revisión”) | Alucinaciones → **revisión humana obligatoria** |
| Un solo prompt para cajetín + notas | Latencia; límites de tamaño/resolución |
| | Privacidad / retención según proveedor |

**Cuándo usar:** asistencia en cajetín y textos ambiguos, **nunca** auto-aplicar a palillería en v1.

---

### 5. Extracción por zonas del cajetín (recomendado como núcleo)

**Qué es:** detectar o configurar ROI (esquina inferior derecha típica en P&ID/isométricos) → OCR/IA solo en esa región.

| Pros | Contras |
|------|---------|
| Menos ruido que OCR full-page | Plantillas varían por cliente/proyecto |
| Más barato (menos píxeles) | Requiere heurística de orientación/escala |
| Encaja con metadatos actuales (nº plano, línea, rev) | Multipágina: ¿cuál es el cajetín oficial? |

**Heurísticas posibles (10B):**

- Última página o página 1 según tipo de documento.
- Región = % ancho/alto desde esquina (p. ej. bottom-right 35×25 %).
- Refinar con detección de rectángulos (líneas del cajetín) vía pdf.js vector ops o visión ligera.

---

### 6. Híbrido por fases (recomendación global)

```
PDF subido
  → [A] Texto embebido (actual)
  → [B] Si insuficiente: render página objetivo (pdf-parse getScreenshot)
  → [C] Recorte cajetín (heurística / template)
  → [D] OCR local OR cloud OR multimodal (solo ROI)
  → [E] Parser regex + normalización (reutilizar parse-pdf-text)
  → [F] Merge con filename (detection-merge existente)
  → [G] Revisión humana (UI tipo “Confirmar metadatos detectados”)
  → [H] Aplicar solo campos confirmados
```

**Palillería / partidas / medidas:** fuera del MVP; solo investigación en 10A.

---

## Pipeline objetivo (producto futuro)

```mermaid
flowchart LR
  PDF[PDF en storage] --> R[Render página]
  R --> Z[Zona cajetín]
  Z --> O[OCR / IA]
  O --> C[Candidatos JSON]
  C --> H[Revisión humana]
  H --> A[Aplicar metadatos]
  A --> DB[(Drawing)]
```

Principios:

1. **Nunca** escribir candidatos directamente como verdad en BD.
2. Guardar trazabilidad: fuente (`embedded` | `ocr` | `vision`), confianza, snapshot opcional en storage dev.
3. Reutilizar `mergeDetectionFromSources` y flujo de confirmación existente.
4. Feature flag / rol engineer-only en 10B.

---

## Qué extraer primero (priorización)

| Prioridad | Dato | Motivo | Fuente probable |
|-----------|------|--------|-----------------|
| P0 | Nº plano, línea, revisión | Ya en producto; ROI claro | Embebido → OCR cajetín |
| P1 | Escala, formato hoja, fecha | Contexto del plano | Cajetín |
| P2 | Título / descripción del plano | UX búsqueda | Cajetín o notas |
| P3 | Referencias / tags visibles | Puente hacia palillería futura | OCR full o IA |
| P4 | Partidas, cantidades, medidas | Alto riesgo de error | Solo IA + revisión; **futuro** |

---

## Herramienta experimental: `scripts/inspect-pdf-pages.ts`

Script **dev-only** (no producción):

```bash
# Informe básico: páginas, texto embebido por página
npm run inspect:pdf -- ./ruta/local/plano.pdf

# Además PNG de página 1 en scripts/.tmp/ (gitignored)
npm run inspect:pdf -- ./ruta/local/plano.pdf --preview
```

Informa:

- número de páginas y dimensiones (pt)
- texto embebido por página y total
- preview de texto en consola (no persiste)
- opcionalmente PNG primera página vía `pdf-parse` + `@napi-rs/canvas` (transitivo)

**No sube archivos ni escribe en BD.**

---

## Render PDF → imagen (sin nuevas deps en 10A)

| Opción | Deps | Notas |
|--------|------|-------|
| **pdf-parse `getScreenshot`** | Ya en proyecto (transitivo `@napi-rs/canvas`) | Usado en script experimental `--preview` |
| **pdfjs + canvas** | Similar | Duplicaría stack |
| **Poppler `pdftoppm`** | Binario sistema | Ops en Docker; muy fiable |
| **MuPDF / Ghostscript** | Binario | Batch server-side |

**Decisión 10A:** usar `getScreenshot` en script dev; **no** integrar render en app hasta 10B.

---

## OCR: opciones para Fase 10B

| Opción | Esfuerzo | MVP |
|--------|----------|-----|
| Tesseract CLI sobre PNG recortado | Medio | Sí — privado, barato |
| `tesseract.js` en worker | Medio-alto | Sí — evita CLI |
| Google/Azure OCR | Bajo código, alto governance | Piloto |
| Multimodal (1 imagen cajetín) | Bajo código | Piloto calidad, revisión obligatoria |

---

## Recomendaciones para Fase 10B

### Opción mínima viable (recomendada)

1. **Feature flag** `experimentalTitleBlockOcr` (env, solo dev/staging).
2. Tras upload, si texto embebido vacío o parse devuelve null en campos clave:
   - render página 1 (o última) con `getScreenshot` en **job en background** (cola simple, timeout).
   - recorte cajetín heurístico bottom-right.
   - OCR local Tesseract **solo sobre recorte**.
   - mapear a `ParsedDrawingMetadata` + mostrar en panel revisión (igual que detección actual).
3. **No tocar** palillería ni `buildDrawingDetectionUpdate` en producción hasta validar precisión.

### Riesgos técnicos

| Riesgo | Mitigación |
|--------|------------|
| PDFs enormes (A0, 50+ MB) | Límite tamaño; solo página 1; timeout |
| Canvas nativo en deploy | Verificar `@napi-rs/canvas` en imagen Docker |
| OCR erróneo en revisión | UI diff candidato vs actual; no auto-approve |
| Multimodal alucina | Solo sugerencia; confianza + cita región |
| Duplicar pipeline detección | Un solo merge + confirmación |

### Coste / performance (orden de magnitud)

| Paso | Tiempo típico | Coste |
|------|---------------|-------|
| Texto embebido | 100–500 ms | ~0 |
| Screenshot 1 página 1400px | 1–3 s | CPU |
| Tesseract ROI | 0.5–2 s | CPU |
| Cloud OCR / página | 1–5 s | €0.001–0.01 |
| Multimodal / imagen | 3–15 s | €0.01–0.10 |

### Privacidad

- OCR local: PDF no sale del servidor.
- Cloud/IA: requiere acuerdo, región EU, retención cero si es posible, anonimizar nombre archivo en logs.
- Script 10A: solo filesystem local del desarrollador.

### Impacto en servidor

- Render + OCR **no debe** ejecutarse en request síncrono del usuario.
- Cola/worker con concurrencia limitada (1–2 PDFs simultáneos por instancia pequeña).
- Cache por hash de PDF + versión algoritmo.

### UX necesaria (revisión humana)

Reutilizar patrón de **metadatos detectados**:

- Tabla campo / valor actual / candidato OCR / confianza.
- Checkbox por campo o “Aplicar seleccionados”.
- Preview imagen del recorte cajetín junto al formulario.
- Mensaje claro: “Sugerencia automática — verificar antes de guardar”.
- Registro en `drawingActivity` con tipo `ocr_suggested` (futuro schema, no en 10A).

---

## Qué NO hacer en 10B inicial

- Auto-crear líneas de palillería desde IA.
- Sustituir detección filename+embebido.
- Añadir Prisma/migraciones sin diseño de trazabilidad.
- OCR full-page en cada upload en producción.

---

## Referencias en el repo

| Archivo | Rol |
|---------|-----|
| `lib/drawings/pdf-text-extract.ts` | Extracción embebida productiva |
| `lib/drawings/parse-pdf-text.ts` | Parser metadatos |
| `lib/drawings/detection-apply.ts` | Pipeline detección |
| `lib/drawings/detection-merge.ts` | Merge fuentes |
| `scripts/inspect-pdf-pages.ts` | Inspección experimental 10A |
| `docs/takeoff-hardening-checklist.md` | Hardening palillería (9F) |

---

## Conclusión 10A

**Enfoque recomendado:** híbrido por fases, con **texto embebido como baseline**, **OCR por zona de cajetín** como primer salto de valor en PDFs escaneados, e **IA multimodal opcional** solo para asistir revisión humana — no para palillería automática.

**Entregable 10A:** este documento + script `inspect-pdf-pages` para caracterizar PDFs reales antes de elegir motor OCR en 10B.
