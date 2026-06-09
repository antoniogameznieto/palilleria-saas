import { extractDrawingPdfTextForDetection } from "@/lib/drawings/pdf-text-extract";
import {
  extractCandidateDimensionsFromText,
  type CandidateDimensionsExtractionResult,
} from "@/lib/trameado/candidate-dimensions";

export type LoadCandidateDimensionsInput = {
  storagePath: string | null;
  mimeType: string | null;
  drawingNumber: string | null;
  lineNumber: string | null;
  originalFileName: string;
};

export async function loadCandidateDimensionsForDrawing(
  input: LoadCandidateDimensionsInput,
): Promise<CandidateDimensionsExtractionResult> {
  if (!input.storagePath) {
    return {
      candidates: [],
      additionalCandidates: [],
      totalRankedCount: 0,
      embeddedTextLength: 0,
      hasEmbeddedText: false,
      insufficientText: true,
      overallConfidence: "low",
      warnings: [
        "No hay archivo PDF disponible para este plano.",
        "Revisa siempre contra el isométrico.",
      ],
    };
  }

  try {
    const extraction = await extractDrawingPdfTextForDetection({
      storagePath: input.storagePath,
      mimeType: input.mimeType,
    });

    return extractCandidateDimensionsFromText(extraction.text, {
      drawingNumber: input.drawingNumber,
      lineNumber: input.lineNumber,
      fileName: input.originalFileName,
    });
  } catch {
    return {
      candidates: [],
      additionalCandidates: [],
      totalRankedCount: 0,
      embeddedTextLength: 0,
      hasEmbeddedText: false,
      insufficientText: true,
      overallConfidence: "low",
      warnings: [
        "No se pudo leer el texto embebido del PDF.",
        "Revisa siempre contra el isométrico.",
      ],
    };
  }
}
