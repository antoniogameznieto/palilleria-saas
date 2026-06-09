/**
 * EXPERIMENTAL / DEV ONLY — Fase 10F+
 *
 * Benchmark local del pipeline OCR experimental (render + recorte + preprocesado + Tesseract).
 * No toca BD, storage productivo ni CI/build.
 *
 * Uso:
 *   npm run benchmark:ocr -- ./ruta/plano.pdf
 *   npm run benchmark:ocr -- ./ruta/plano.pdf --preset bottom-wide
 *   npm run benchmark:ocr -- ./ruta/plano.pdf --preset bottom-wide --preprocess grayscale
 */

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { analyzeTitleBlockFromPdfBuffer } from "../lib/drawings/experimental-title-block-ocr";
import {
  DEFAULT_TITLE_BLOCK_CROP_PERCENTS,
  TITLE_BLOCK_CROP_PRESETS,
  formatTitleBlockCropZoneLabel,
  validateTitleBlockCropPercents,
  type TitleBlockCropPercents,
} from "../lib/drawings/experimental-title-block-crop-params";
import {
  DEFAULT_OCR_PREPROCESS_STRATEGY,
  OCR_PREPROCESS_STRATEGY_IDS,
  formatOcrPreprocessLabel,
  parseOcrPreprocessStrategy,
  type OcrPreprocessStrategy,
} from "../lib/drawings/experimental-ocr-preprocess-constants";
import { PDF_TEXT_PREVIEW_MAX_CHARS } from "../lib/drawings/pdf-text-constants";
import { TESSERACT_SETUP_DOC } from "../lib/drawings/tesseract-cli-constants";
import { diagnoseTesseractCli } from "../lib/drawings/tesseract-cli-diagnostic";

const PIPELINE_LANGUAGE_ATTEMPTS = ["spa+eng", "eng", "spa"] as const;

type CliOptions = {
  pdfPath: string;
  presetId: string | null;
  cropPercents: TitleBlockCropPercents;
  preprocessStrategy: OcrPreprocessStrategy;
  help: boolean;
};

function printUsage(): void {
  console.log(`benchmark-title-block-ocr — benchmark experimental (Fase 10F+)

Uso:
  npm run benchmark:ocr -- <ruta-local.pdf> [opciones]

Opciones:
  --preset <id>        Preset de recorte (${TITLE_BLOCK_CROP_PRESETS.map((p) => p.id).join(", ")})
  --preprocess <id>    Preprocesado OCR (${OCR_PREPROCESS_STRATEGY_IDS.join(", ")}, default ${DEFAULT_OCR_PREPROCESS_STRATEGY})
  --x <0-95>           X en % (default ${DEFAULT_TITLE_BLOCK_CROP_PERCENTS.xPercent})
  --y <0-95>           Y en % (default ${DEFAULT_TITLE_BLOCK_CROP_PERCENTS.yPercent})
  --width <5-100>      Ancho en % (default ${DEFAULT_TITLE_BLOCK_CROP_PERCENTS.widthPercent})
  --height <5-100>     Alto en % (default ${DEFAULT_TITLE_BLOCK_CROP_PERCENTS.heightPercent})
  --help               Muestra esta ayuda

Notas:
  - Mismo pipeline que la server action experimental (sin BD ni upload).
  - Idiomas Tesseract intentados: ${PIPELINE_LANGUAGE_ATTEMPTS.join(" → ")} (--psm 6).
  - Registra resultados en docs/ocr-benchmark-results.md
  - Si Tesseract no está en PATH: render + recorte + warnings; exit 0 (no rompe CI).
  - Instalación: ${TESSERACT_SETUP_DOC}
`);
}

function parseOptionalPercent(raw: string | undefined, label: string): number {
  if (raw == null) {
    throw new Error(`Falta valor para ${label}.`);
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`Valor no numérico para ${label}: ${raw}`);
  }

  return Math.round(value);
}

function parseArgs(argv: string[]): CliOptions {
  const positional: string[] = [];
  const options = new Map<string, string>();
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[index + 1];

      if (next == null || next.startsWith("-")) {
        throw new Error(`La opción ${arg} requiere un valor.`);
      }

      options.set(key, next);
      index += 1;
      continue;
    }

    positional.push(arg);
  }

  if (help) {
    return {
      pdfPath: "",
      presetId: null,
      cropPercents: DEFAULT_TITLE_BLOCK_CROP_PERCENTS,
      preprocessStrategy: DEFAULT_OCR_PREPROCESS_STRATEGY,
      help: true,
    };
  }

  const pdfPath = positional[0];

  if (!pdfPath) {
    throw new Error("Indica la ruta de un PDF local.");
  }

  const presetId = options.get("preset") ?? null;
  let cropPercents: TitleBlockCropPercents = { ...DEFAULT_TITLE_BLOCK_CROP_PERCENTS };

  if (presetId) {
    const preset = TITLE_BLOCK_CROP_PRESETS.find((entry) => entry.id === presetId);

    if (!preset) {
      throw new Error(
        `Preset desconocido: ${presetId}. Válidos: ${TITLE_BLOCK_CROP_PRESETS.map((p) => p.id).join(", ")}`,
      );
    }

    cropPercents = { ...preset.params };
  }

  cropPercents = {
    xPercent: options.has("x")
      ? parseOptionalPercent(options.get("x"), "--x")
      : cropPercents.xPercent,
    yPercent: options.has("y")
      ? parseOptionalPercent(options.get("y"), "--y")
      : cropPercents.yPercent,
    widthPercent: options.has("width")
      ? parseOptionalPercent(options.get("width"), "--width")
      : cropPercents.widthPercent,
    heightPercent: options.has("height")
      ? parseOptionalPercent(options.get("height"), "--height")
      : cropPercents.heightPercent,
  };

  const validationError = validateTitleBlockCropPercents(cropPercents);

  if (validationError) {
    throw new Error(validationError);
  }

  const preprocessParsed = parseOcrPreprocessStrategy(options.get("preprocess"));

  if ("error" in preprocessParsed) {
    throw new Error(preprocessParsed.error);
  }

  return {
    pdfPath,
    presetId,
    cropPercents,
    preprocessStrategy: preprocessParsed.strategy,
    help: false,
  };
}

function formatCandidate(value: string | null): string {
  return value == null || value.trim() === "" ? "—" : value;
}

function formatDurationMs(durationMs: number): string {
  return `${Math.round(durationMs)} ms`;
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return 0;
  }

  const absolutePdfPath = path.resolve(options.pdfPath);

  try {
    await access(absolutePdfPath);
  } catch {
    console.error(`No se encontró el archivo: ${absolutePdfPath}`);
    return 1;
  }

  const tesseractDiagnostic = await diagnoseTesseractCli();

  console.log("=== Benchmark OCR experimental del cajetín ===\n");
  console.log(`Archivo: ${absolutePdfPath}`);

  if (options.presetId) {
    console.log(`Preset: ${options.presetId}`);
  }

  console.log(`Zona: ${formatTitleBlockCropZoneLabel(options.cropPercents)}`);
  console.log(
    `Preprocesado: ${formatOcrPreprocessLabel(options.preprocessStrategy)}`,
  );
  console.log(
    `Idiomas (pipeline): ${PIPELINE_LANGUAGE_ATTEMPTS.join(" → ")} (--psm 6)`,
  );

  if (!tesseractDiagnostic.available) {
    console.warn("\n⚠ Tesseract CLI no está en PATH.");
    console.warn(`  Instala siguiendo ${TESSERACT_SETUP_DOC}.`);
    console.warn("  Se ejecutará render + recorte; OCR de texto omitido.\n");
  } else if (tesseractDiagnostic.version) {
    console.log(`Tesseract: ${tesseractDiagnostic.version}`);
  }

  const buffer = await readFile(absolutePdfPath);
  const startedAt = performance.now();

  let result;

  try {
    result = await analyzeTitleBlockFromPdfBuffer(
      buffer,
      options.cropPercents,
      options.preprocessStrategy,
    );
  } catch (error) {
    console.error(
      "\nError en el pipeline experimental:",
      error instanceof Error ? error.message : String(error),
    );
    return 1;
  }

  const durationMs = performance.now() - startedAt;

  console.log(`\nDuración total: ${formatDurationMs(durationMs)}`);
  console.log(`Preview generada: ${result.hasPreview ? "sí" : "no"}`);
  console.log(`Data URL preview: ${result.cropImageDataUrl ? "sí (no impresa)" : "no"}`);
  console.log(`Zona aplicada: ${result.cropZoneLabel}`);
  console.log(`Preprocesado aplicado: ${result.preprocessLabel}`);

  console.log("\n--- Candidatos parseados ---");
  console.log(`  Nº plano: ${formatCandidate(result.metadataCandidates.drawingNumber)}`);
  console.log(`  Línea:    ${formatCandidate(result.metadataCandidates.lineNumber)}`);
  console.log(`  Revisión: ${formatCandidate(result.metadataCandidates.revision)}`);

  console.log("\n--- Texto OCR (preview) ---");

  if (result.textPreview) {
    console.log(result.textPreview);

    if (
      result.extractedText &&
      result.extractedText.length > PDF_TEXT_PREVIEW_MAX_CHARS
    ) {
      console.log(
        `\n… truncado a ${PDF_TEXT_PREVIEW_MAX_CHARS} caracteres (texto completo más largo).`,
      );
    }
  } else {
    console.log("(sin texto OCR — Tesseract ausente o sin resultado legible)");
  }

  if (result.warnings.length > 0) {
    console.log("\n--- Warnings ---");
    for (const warning of result.warnings) {
      console.log(`  • ${warning}`);
    }
  }

  console.log("\nRegistra esta prueba en docs/ocr-benchmark-results.md");

  if (!tesseractDiagnostic.available) {
    console.warn("\n⚠ Benchmark parcial: instala Tesseract para medir calidad OCR real.");
    return 0;
  }

  return 0;
}

main()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      printUsage();
    } else {
      console.error("Error inesperado:", error);
    }

    process.exit(1);
  });
