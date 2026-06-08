"use server";

import { extractDrawingPdfText } from "@/lib/drawings/pdf-text-extract";
import {
  canExtractDrawingPdfText,
  requireDrawingAccess,
} from "@/lib/permissions";

function parseDrawingScopeFormData(formData: FormData) {
  const companyId = formData.get("companyId");
  const jobId = formData.get("jobId");
  const drawingId = formData.get("drawingId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    return { error: "Empresa no válida." as const };
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    return { error: "Trabajo no válido." as const };
  }

  if (typeof drawingId !== "string" || drawingId.length === 0) {
    return { error: "Plano no válido." as const };
  }

  return { companyId, jobId, drawingId };
}

export type DrawingPdfTextExtractionActionState = {
  error?: string;
  success?: string;
  characterCount?: number;
  preview?: string;
  hasEmbeddedText?: boolean;
};

export async function extractDrawingPdfTextAction(
  _prevState: DrawingPdfTextExtractionActionState,
  formData: FormData,
): Promise<DrawingPdfTextExtractionActionState> {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId } = scope;
  const { membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canExtractDrawingPdfText(membership.role)) {
    return { error: "No tienes permiso para extraer texto del PDF." };
  }

  try {
    const result = await extractDrawingPdfText({
      storagePath: drawing.storagePath,
      mimeType: drawing.mimeType,
    });

    if (!result.hasEmbeddedText) {
      return {
        success:
          "No se encontró texto embebido en este PDF. Puede ser un plano escaneado o vectorial sin capa de texto.",
        characterCount: 0,
        hasEmbeddedText: false,
      };
    }

    return {
      success: `Se extrajeron ${result.characterCount.toLocaleString("es-ES")} caracteres de texto embebido.`,
      characterCount: result.characterCount,
      preview: result.preview,
      hasEmbeddedText: true,
    };
  } catch {
    return {
      error:
        "No se pudo extraer texto embebido del PDF. Comprueba que el archivo sea válido y accesible.",
    };
  }
}
