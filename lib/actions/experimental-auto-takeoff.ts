"use server";

import {
  compareSuggestedTakeoffWithExisting,
  type TakeoffComparisonStatus,
  type TakeoffComparisonSummary,
} from "@/lib/drawings/experimental-auto-takeoff-compare";
import {
  hasUsefulEmbeddedText,
  parseTakeoffRowsFromEmbeddedText,
} from "@/lib/drawings/experimental-auto-takeoff-parse";
import { canAccessExperimentalAutoTakeoff } from "@/lib/drawings/experimental-auto-takeoff-config";
import { extractDrawingPdfTextForDetection } from "@/lib/drawings/pdf-text-extract";
import { getDrawingTakeoffItems } from "@/lib/drawings/takeoff";
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

export type SerializedSuggestedTakeoffItem = {
  item: number | null;
  reference: string | null;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  confidence: number;
  warnings: string[];
  comparisonStatus?: TakeoffComparisonStatus;
};

export type ExperimentalAutoTakeoffActionState = {
  error?: string;
  success?: string;
  hasEmbeddedText?: boolean;
  textLength?: number;
  sectionsFound?: string[];
  suggestedItems?: SerializedSuggestedTakeoffItem[];
  warnings?: string[];
  averageConfidence?: number;
  existingTakeoffCount?: number;
  comparisonSummary?: TakeoffComparisonSummary;
};

export async function analyzeExperimentalAutoTakeoffAction(
  _prevState: ExperimentalAutoTakeoffActionState,
  formData: FormData,
): Promise<ExperimentalAutoTakeoffActionState> {
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

  if (!canAccessExperimentalAutoTakeoff(membership.role)) {
    return {
      error: "No tienes permiso para analizar sugerencias experimentales.",
    };
  }

  try {
    const [extraction, existingTakeoffItems] = await Promise.all([
      extractDrawingPdfTextForDetection({
        storagePath: drawing.storagePath,
        mimeType: drawing.mimeType,
      }),
      getDrawingTakeoffItems(companyId, jobId, drawingId),
    ]);

    const existingTakeoffCount = existingTakeoffItems.length;

    const textLength = extraction.characterCount;
    const hasEmbeddedText = extraction.hasEmbeddedText;
    const useful = hasUsefulEmbeddedText(textLength);

    if (!hasEmbeddedText || !useful) {
      return {
        success: useful
          ? undefined
          : "No se encontró texto embebido útil en este PDF. Puede ser un plano escaneado o sin relación de materiales legible.",
        hasEmbeddedText,
        textLength,
        sectionsFound: [],
        suggestedItems: [],
        existingTakeoffCount,
        warnings: [
          "Sin texto embebido suficiente para analizar la relación de materiales.",
        ],
      };
    }

    const parseResult = parseTakeoffRowsFromEmbeddedText(extraction.text);
    const parsedSuggestions = parseResult.candidateRows.map((row) => ({
      item: row.item,
      reference: row.reference,
      description: row.description,
      quantity: row.quantity,
      unit: row.unit,
      confidence: row.confidence,
      warnings: row.warnings,
    }));

    const comparison = compareSuggestedTakeoffWithExisting(
      parsedSuggestions,
      existingTakeoffItems.map((item) => ({
        reference: item.reference,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
      })),
    );

    const suggestedItems: SerializedSuggestedTakeoffItem[] = comparison.items.map(
      (item, index) => ({
        item: item.item,
        reference: item.reference,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        confidence: item.confidence,
        warnings: parsedSuggestions[index]?.warnings ?? [],
        comparisonStatus: item.comparisonStatus,
      }),
    );

    const averageConfidence =
      suggestedItems.length > 0
        ? Number(
            (
              suggestedItems.reduce((sum, item) => sum + item.confidence, 0) /
              suggestedItems.length
            ).toFixed(2),
          )
        : undefined;

    const sectionsFound = [
      ...new Set(parseResult.sections.map((section) => section.id)),
    ];

    const success =
      suggestedItems.length > 0
        ? `Análisis completado: ${suggestedItems.length} fila(s) sugerida(s). Solo preview; no se guardó nada.`
        : sectionsFound.length > 0
          ? "Se detectó una sección de materiales pero ninguna fila pasó el parser conservador."
          : "No se encontró una relación de materiales reconocible en el texto embebido.";

    return {
      success,
      hasEmbeddedText: true,
      textLength,
      sectionsFound,
      suggestedItems,
      warnings: parseResult.warnings,
      averageConfidence,
      existingTakeoffCount,
      comparisonSummary: comparison.summary,
    };
  } catch {
    return {
      error:
        "No se pudo analizar el PDF. Comprueba que el archivo sea válido y accesible.",
    };
  }
}
