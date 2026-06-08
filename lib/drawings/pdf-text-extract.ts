import { PDFParse } from "pdf-parse";

import { PDF_TEXT_PREVIEW_MAX_CHARS } from "@/lib/drawings/pdf-text-constants";
import { PDF_MIME_TYPE, getFile } from "@/lib/storage";

export type PdfEmbeddedTextResult = {
  characterCount: number;
  preview: string;
  hasEmbeddedText: boolean;
};

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

async function readPdfEmbeddedText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

export async function extractPdfEmbeddedText(
  buffer: Buffer,
): Promise<PdfEmbeddedTextResult> {
  const text = await readPdfEmbeddedText(buffer);
  const characterCount = text.length;
  const hasEmbeddedText = characterCount > 0;

  return {
    characterCount,
    preview: hasEmbeddedText
      ? text.slice(0, PDF_TEXT_PREVIEW_MAX_CHARS)
      : "",
    hasEmbeddedText,
  };
}

export type PdfEmbeddedTextForDetectionResult = {
  hasEmbeddedText: boolean;
  characterCount: number;
};

export async function extractDrawingPdfTextForDetection(params: {
  storagePath: string;
  mimeType: string | null;
}): Promise<
  PdfEmbeddedTextForDetectionResult & {
    text: string;
  }
> {
  if (params.mimeType && params.mimeType !== PDF_MIME_TYPE) {
    throw new Error("El archivo no es un PDF válido.");
  }

  const buffer = await getFile({ storagePath: params.storagePath });

  if (!isPdfBuffer(buffer)) {
    throw new Error("El archivo no parece ser un PDF válido.");
  }

  const text = await readPdfEmbeddedText(buffer);
  const characterCount = text.length;

  return {
    characterCount,
    hasEmbeddedText: characterCount > 0,
    text,
  };
}

export async function extractDrawingPdfText(params: {
  storagePath: string;
  mimeType: string | null;
}): Promise<PdfEmbeddedTextResult> {
  if (params.mimeType && params.mimeType !== PDF_MIME_TYPE) {
    throw new Error("El archivo no es un PDF válido.");
  }

  const buffer = await getFile({ storagePath: params.storagePath });

  if (!isPdfBuffer(buffer)) {
    throw new Error("El archivo no parece ser un PDF válido.");
  }

  return extractPdfEmbeddedText(buffer);
}
