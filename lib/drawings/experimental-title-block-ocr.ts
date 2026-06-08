import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { PDFParse } from "pdf-parse";

import {
  TITLE_BLOCK_SCREENSHOT_WIDTH_PX,
  computeTitleBlockCropRect,
} from "@/lib/drawings/experimental-title-block-crop";
import { encodeTitleBlockCropPreview } from "@/lib/drawings/experimental-title-block-crop-preview";
import { PDF_TEXT_PREVIEW_MAX_CHARS } from "@/lib/drawings/pdf-text-constants";
import { parseDrawingMetadataFromPdfText } from "@/lib/drawings/parse-pdf-text";
import type { ParsedDrawingMetadata } from "@/lib/drawings/parse-filename";
import { PDF_MIME_TYPE, getFile } from "@/lib/storage";

const execFileAsync = promisify(execFile);

const TESSERACT_TIMEOUT_MS = 45_000;

export type ExperimentalTitleBlockOcrResult = {
  hasPreview: boolean;
  cropImageDataUrl: string | null;
  extractedText: string | null;
  textPreview: string | null;
  metadataCandidates: ParsedDrawingMetadata;
  warnings: string[];
};

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

function buildTextPreview(text: string | null): string | null {
  if (text == null) {
    return null;
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, PDF_TEXT_PREVIEW_MAX_CHARS);
}

async function renderFirstPageScreenshot(
  buffer: Buffer,
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const parser = new PDFParse({ data: buffer });

  try {
    const screenshot = await parser.getScreenshot({
      partial: [1],
      desiredWidth: TITLE_BLOCK_SCREENSHOT_WIDTH_PX,
      imageBuffer: true,
      imageDataUrl: false,
    });

    const firstPage = screenshot.pages[0];

    if (!firstPage?.data) {
      throw new Error("No se pudo renderizar la primera página del PDF.");
    }

    return {
      data: firstPage.data,
      width: firstPage.width,
      height: firstPage.height,
    };
  } finally {
    await parser.destroy();
  }
}

async function cropTitleBlockFromPagePng(
  pagePng: Uint8Array,
  pageWidth: number,
  pageHeight: number,
): Promise<{ buffer: Buffer; crop: ReturnType<typeof computeTitleBlockCropRect> }> {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(Buffer.from(pagePng));
  const crop = computeTitleBlockCropRect(pageWidth, pageHeight);
  const canvas = createCanvas(crop.width, crop.height);
  const context = canvas.getContext("2d");

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return {
    buffer: canvas.toBuffer("image/png"),
    crop,
  };
}

async function isTesseractCliAvailable(): Promise<boolean> {
  try {
    await execFileAsync("tesseract", ["--version"], {
      timeout: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}

async function runTesseractOnPng(pngBuffer: Buffer): Promise<string | null> {
  const basePath = join(tmpdir(), `palilleria-title-block-ocr-${randomUUID()}`);
  const inputPath = `${basePath}.png`;
  const outputBase = basePath;

  try {
    await writeFile(inputPath, pngBuffer);

    const languageAttempts = ["spa+eng", "eng", "spa"];

    for (const language of languageAttempts) {
      try {
        await execFileAsync(
          "tesseract",
          [inputPath, outputBase, "-l", language, "--psm", "6"],
          { timeout: TESSERACT_TIMEOUT_MS },
        );

        const text = (await readFile(`${outputBase}.txt`, "utf8")).trim();

        if (text.length > 0) {
          return text;
        }
      } catch {
        // Try next language pack or fail gracefully.
      } finally {
        await unlink(`${outputBase}.txt`).catch(() => undefined);
      }
    }

    return null;
  } finally {
    await unlink(inputPath).catch(() => undefined);
    await unlink(`${outputBase}.txt`).catch(() => undefined);
  }
}

export async function analyzeTitleBlockFromPdfBuffer(
  buffer: Buffer,
): Promise<ExperimentalTitleBlockOcrResult> {
  const warnings: string[] = [];

  if (!isPdfBuffer(buffer)) {
    throw new Error("El archivo no parece ser un PDF válido.");
  }

  let pageScreenshot: { data: Uint8Array; width: number; height: number };

  try {
    pageScreenshot = await renderFirstPageScreenshot(buffer);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "No se pudo renderizar el PDF para OCR experimental.",
    );
  }

  let titleBlockPng: Buffer;
  let cropWidth = 0;
  let cropHeight = 0;

  try {
    const cropped = await cropTitleBlockFromPagePng(
      pageScreenshot.data,
      pageScreenshot.width,
      pageScreenshot.height,
    );
    titleBlockPng = cropped.buffer;
    cropWidth = cropped.crop.width;
    cropHeight = cropped.crop.height;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "No se pudo recortar la zona del cajetín.",
    );
  }

  const hasPreview = titleBlockPng.length > 0;
  let cropImageDataUrl: string | null = null;

  if (hasPreview) {
    const encoded = await encodeTitleBlockCropPreview(
      titleBlockPng,
      cropWidth,
      cropHeight,
    );
    cropImageDataUrl = encoded.cropImageDataUrl;

    if (encoded.previewWarning) {
      warnings.push(encoded.previewWarning);
    }
  } else {
    warnings.push("No se pudo generar el recorte del cajetín para preview.");
  }

  let extractedText: string | null = null;

  const tesseractAvailable = await isTesseractCliAvailable();

  if (!tesseractAvailable) {
    warnings.push(
      "Tesseract no está instalado o no está en PATH. Se completó render + recorte del cajetín, pero no se ejecutó OCR.",
    );
    warnings.push(
      "Instala Tesseract localmente (p. ej. brew install tesseract tesseract-lang) para habilitar OCR real.",
    );
  } else {
    extractedText = await runTesseractOnPng(titleBlockPng);

    if (!extractedText) {
      warnings.push(
        "Tesseract no devolvió texto legible en la zona del cajetín. Prueba con otro PDF o ajusta el recorte en fases posteriores.",
      );
    }
  }

  const metadataCandidates = extractedText
    ? parseDrawingMetadataFromPdfText(extractedText)
    : {
        drawingNumber: null,
        lineNumber: null,
        revision: null,
      };

  if (
    extractedText &&
    !metadataCandidates.drawingNumber &&
    !metadataCandidates.lineNumber &&
    !metadataCandidates.revision
  ) {
    warnings.push(
      "El OCR devolvió texto, pero no se detectaron metadatos con los patrones actuales de parse-pdf-text.",
    );
  }

  warnings.push(
    "Resultado experimental: no se guarda en base de datos ni modifica la detección productiva.",
  );

  return {
    hasPreview,
    cropImageDataUrl,
    extractedText,
    textPreview: buildTextPreview(extractedText),
    metadataCandidates,
    warnings,
  };
}

export async function analyzeTitleBlockFromDrawingStorage(params: {
  storagePath: string | null;
  mimeType: string | null;
}): Promise<ExperimentalTitleBlockOcrResult> {
  if (params.mimeType && params.mimeType !== PDF_MIME_TYPE) {
    throw new Error("El archivo no es un PDF válido.");
  }

  if (!params.storagePath) {
    throw new Error("El plano no tiene un archivo PDF asociado.");
  }

  const buffer = await getFile({ storagePath: params.storagePath });

  return analyzeTitleBlockFromPdfBuffer(buffer);
}
