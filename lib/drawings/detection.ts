import { resolveDrawingFileNameForDetection } from "@/lib/drawings/detection-apply";
import {
  hasDetectedMetadata,
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
 * Punto de entrada para la detección automática de metadatos.
 * En una fase posterior se integrará aquí el análisis del contenido del PDF.
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
    message: hasDetectedMetadata(detected)
      ? "Detección iniciada. Los metadatos se aplicarán al completar el proceso."
      : "Detección iniciada. No se han detectado metadatos claros en el nombre del archivo todavía.",
  };
}

export function detectMetadataFromFileName(fileName: string): ParsedDrawingMetadata {
  return parseDrawingMetadataFromFileName(fileName);
}

export { resolveDrawingFileNameForDetection, parseDrawingMetadataFromFileName };
