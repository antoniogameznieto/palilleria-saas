import { resolveDrawingFileNameForDetection } from "@/lib/drawings/detection-apply";
import {
  parseDrawingMetadataFromFileName,
  type ParsedDrawingMetadata,
} from "@/lib/drawings/parse-filename";

export type DrawingDetectionResult = {
  drawingId: string;
  status: "completed" | "pending";
  detected: ParsedDrawingMetadata;
  message: string;
};

/**
 * Punto de entrada para la detección automática de metadatos al iniciar el flujo.
 * La aplicación final combina nombre de archivo y texto embebido del PDF al completar.
 */
export async function detectDrawingMetadataPlaceholder(
  drawingId: string,
  fileName: string,
): Promise<DrawingDetectionResult> {
  const resolvedFileName = fileName.trim();
  const detected = parseDrawingMetadataFromFileName(resolvedFileName);

  return {
    drawingId,
    status: "pending",
    detected,
    message:
      "Detección iniciada. Se analizarán el nombre del archivo y el texto embebido del PDF al completar.",
  };
}

export function detectMetadataFromFileName(fileName: string): ParsedDrawingMetadata {
  return parseDrawingMetadataFromFileName(fileName);
}

export { resolveDrawingFileNameForDetection, parseDrawingMetadataFromFileName };
