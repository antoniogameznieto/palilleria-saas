export type DrawingDetectionPlaceholderResult = {
  drawingId: string;
  status: "pending";
  message: string;
};

/**
 * Punto de entrada para la detección automática de metadatos.
 * En la fase 6B se integrará aquí el análisis real del PDF.
 */
export async function detectDrawingMetadataPlaceholder(
  drawingId: string,
): Promise<DrawingDetectionPlaceholderResult> {
  return {
    drawingId,
    status: "pending",
    message:
      "Detección automática pendiente de implementación. No se han extraído metadatos del PDF.",
  };
}
