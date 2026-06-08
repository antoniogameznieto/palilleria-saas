"use server";

import {
  analyzeTitleBlockFromDrawingStorage,
  type ExperimentalTitleBlockOcrResult,
} from "@/lib/drawings/experimental-title-block-ocr";
import { parseTitleBlockCropPercentsFromFormData } from "@/lib/drawings/experimental-title-block-crop-params";
import {
  canAccessExperimentalTitleBlockOcr,
  isExperimentalTitleBlockOcrEnabled,
} from "@/lib/drawings/experimental-title-block-ocr-config";
import { requireDrawingAccess } from "@/lib/permissions";

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

export type ExperimentalTitleBlockOcrActionState = {
  error?: string;
  success?: string;
  hasPreview?: boolean;
  cropImageDataUrl?: string | null;
  cropZoneLabel?: string;
  textPreview?: string | null;
  metadataCandidates?: ExperimentalTitleBlockOcrResult["metadataCandidates"];
  warnings?: string[];
};

export async function analyzeExperimentalTitleBlockOcrAction(
  _prevState: ExperimentalTitleBlockOcrActionState,
  formData: FormData,
): Promise<ExperimentalTitleBlockOcrActionState> {
  if (!isExperimentalTitleBlockOcrEnabled()) {
    return { error: "OCR experimental del cajetín no está habilitado." };
  }

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

  if (!canAccessExperimentalTitleBlockOcr(membership.role)) {
    return {
      error: "No tienes permiso para usar OCR experimental del cajetín.",
    };
  }

  const cropParams = parseTitleBlockCropPercentsFromFormData(formData);

  if ("error" in cropParams) {
    return { error: cropParams.error };
  }

  try {
    const result = await analyzeTitleBlockFromDrawingStorage({
      storagePath: drawing.storagePath,
      mimeType: drawing.mimeType,
      cropPercents: cropParams.params,
    });

    const detectedFields = [
      result.metadataCandidates.drawingNumber ? "nº plano" : null,
      result.metadataCandidates.lineNumber ? "línea" : null,
      result.metadataCandidates.revision ? "revisión" : null,
    ].filter((field): field is string => field != null);

    const success =
      result.textPreview && detectedFields.length > 0
        ? `OCR experimental completado. Candidatos detectados: ${detectedFields.join(", ")}.`
        : result.textPreview
          ? "OCR experimental completado. Revisa el texto y los candidatos sugeridos."
          : result.hasPreview
            ? "Render del cajetín completado. OCR no disponible o sin texto detectado."
            : "Análisis experimental completado sin contenido útil.";

    return {
      success,
      hasPreview: result.hasPreview,
      cropImageDataUrl: result.cropImageDataUrl,
      cropZoneLabel: result.cropZoneLabel,
      textPreview: result.textPreview,
      metadataCandidates: result.metadataCandidates,
      warnings: result.warnings,
    };
  } catch {
    return {
      error:
        "No se pudo analizar el cajetín con OCR experimental. Comprueba que el PDF sea válido y accesible.",
    };
  }
}
