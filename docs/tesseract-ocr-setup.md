# Tesseract CLI — instalación para OCR experimental

> **Alcance:** solo el flujo experimental del cajetín (`EXPERIMENTAL_TITLE_BLOCK_OCR=true`).  
> Tesseract **no** es dependencia npm del proyecto; debe estar instalado en el sistema donde corre Next.js (dev, staging o producción).

El OCR experimental renderiza la primera página del PDF, recorta la zona del cajetín y, **si Tesseract CLI está en PATH**, ejecuta OCR local sobre un PNG temporal. Sin Tesseract, el flujo sigue devolviendo preview visual del recorte y avisos claros — no rompe build ni CI.

---

## Comprobar instalación

```bash
# ¿Está instalado y en PATH?
tesseract --version

# ¿Qué idiomas hay disponibles?
tesseract --list-langs
```

Desde el repo:

```bash
npm run check:tesseract
npm run benchmark:ocr -- ./ruta/local/plano.pdf
```

El benchmark (`benchmark:ocr`) usa el mismo pipeline experimental que la UI; registra resultados en [ocr-benchmark-results.md](./ocr-benchmark-results.md). **No se ejecuta en build ni CI.**

Ese script sale siempre con código **0** (no rompe CI). Si Tesseract no está, muestra un warning con enlace a esta guía.

### Idiomas recomendados

Para planos en español/inglés, instala al menos:

| Código | Uso |
|--------|-----|
| `eng` | Texto en inglés, códigos alfanuméricos |
| `spa` | Texto en español (cajetines, revisiones, etc.) |

El pipeline experimental intenta `spa+eng`, luego `eng`, luego `spa` (`--psm 6`).

---

## macOS (Homebrew)

```bash
brew install tesseract tesseract-lang
```

Comprobar:

```bash
tesseract --version
tesseract --list-langs | grep -E '^(eng|spa)$'
npm run check:tesseract
```

Si falta un idioma, reinstala el paquete de idiomas:

```bash
brew reinstall tesseract-lang
```

---

## Linux (Debian / Ubuntu)

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa
```

En otras distros basadas en Debian, los paquetes suelen llamarse igual. En Fedora/RHEL:

```bash
sudo dnf install tesseract tesseract-langpack-eng tesseract-langpack-spa
```

Comprobar:

```bash
tesseract --version
tesseract --list-langs
npm run check:tesseract
```

---

## Docker / producción (orientativo)

Tesseract debe existir **dentro de la imagen** donde corre la app Node/Next.js, no en el contenedor de la base de datos.

Ejemplo en Dockerfile (Debian/Ubuntu):

```dockerfile
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-spa \
  && rm -rf /var/lib/apt/lists/*
```

Consideraciones:

- **No** añadir Tesseract como dependencia npm; el binario del sistema es suficiente para el experimental.
- El OCR corre en la **server action** (síncrono, CPU). En producción real conviene cola/worker — fuera del alcance de la Fase 10E.
- Variables de entorno: activa solo donde quieras probar:

  ```bash
  EXPERIMENTAL_TITLE_BLOCK_OCR=true
  ```

- Tras desplegar, entra al contenedor o ejecuta en el host del servicio:

  ```bash
  tesseract --version
  npm run check:tesseract
  ```

---

## Integración en palilleria-saas

| Pieza | Rol |
|-------|-----|
| `lib/drawings/tesseract-cli-constants.ts` | Constantes y mensajes de aviso (sin Node) |
| `lib/drawings/tesseract-cli-diagnostic.ts` | Diagnóstico compartido (versión, idiomas) |
| `lib/drawings/experimental-title-block-ocr.ts` | Invoca Tesseract solo si está disponible |
| `scripts/check-tesseract.ts` | Script local/CI-friendly |
| Tab Automatización → OCR experimental | Preview + OCR + candidatos (sin persistir) |

### Si Tesseract no está instalado

- Se muestra preview del recorte (Fase 10C).
- Avisos en UI mencionan `docs/tesseract-ocr-setup.md` y `npm run check:tesseract`.
- No hay stack traces ni errores 500 por ausencia de OCR.

### Referencias

- Investigación OCR: [ocr-ai-research.md](./ocr-ai-research.md)
- Feature flag: `.env.example` → `EXPERIMENTAL_TITLE_BLOCK_OCR`
