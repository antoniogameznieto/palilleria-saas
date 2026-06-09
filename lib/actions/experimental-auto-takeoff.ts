"use server";

import { revalidatePath } from "next/cache";

import type {
  TakeoffComparisonStatus,
  TakeoffComparisonSummary,
} from "@/lib/drawings/experimental-auto-takeoff-compare";
import { canAccessExperimentalAutoTakeoff } from "@/lib/drawings/experimental-auto-takeoff-config";
import {
  extractVerifiedExperimentalSuggestions,
  resolveSelectedSuggestionsForImport,
} from "@/lib/drawings/experimental-auto-takeoff-import";
import { buildExperimentalAutoTakeoffImportedActivityMessage } from "@/lib/drawings/activity";
import { getDrawingTakeoffItems } from "@/lib/drawings/takeoff";
import { invalidateDrawingTakeoffReviewInTransaction } from "@/lib/drawings/takeoff-review";
import { prisma } from "@/lib/db";
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

function revalidateDrawingPage(
  companyId: string,
  jobId: string,
  drawingId: string,
) {
  revalidatePath(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
  revalidatePath(`/companies/${companyId}/jobs/${jobId}`);
}

function parseSelectedSuggestionKeys(formData: FormData):
  | { error: string }
  | { keys: string[] } {
  const raw = formData.get("selectedSuggestionKeys");

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { error: "No se seleccionó ninguna sugerencia para importar." };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { error: "No se seleccionó ninguna sugerencia para importar." };
    }

    const keys = parsed.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

    if (keys.length === 0) {
      return { error: "No se seleccionó ninguna sugerencia para importar." };
    }

    return { keys };
  } catch {
    return { error: "Selección de sugerencias no válida." };
  }
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
  suggestionKey: string;
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

export type ExperimentalAutoTakeoffImportActionState = {
  error?: string;
  success?: string;
  importedCount?: number;
  takeoffReviewInvalidated?: boolean;
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
    const existingTakeoffItems = await getDrawingTakeoffItems(
      companyId,
      jobId,
      drawingId,
    );

    const analysis = await extractVerifiedExperimentalSuggestions({
      storagePath: drawing.storagePath,
      mimeType: drawing.mimeType,
      existingTakeoffItems: existingTakeoffItems.map((item) => ({
        reference: item.reference,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
      })),
    });

    const existingTakeoffCount = existingTakeoffItems.length;

    if (!analysis.ok) {
      return {
        success: analysis.hasEmbeddedText
          ? undefined
          : analysis.error,
        hasEmbeddedText: analysis.hasEmbeddedText,
        textLength: analysis.textLength,
        sectionsFound: [],
        suggestedItems: [],
        existingTakeoffCount,
        warnings: [analysis.error],
      };
    }

    const suggestedItems: SerializedSuggestedTakeoffItem[] = analysis.items.map(
      (item) => ({
        item: item.item,
        reference: item.reference,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        confidence: item.confidence,
        warnings: [],
        comparisonStatus: item.comparisonStatus,
        suggestionKey: item.suggestionKey,
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

    const success =
      suggestedItems.length > 0
        ? `Análisis completado: ${suggestedItems.length} fila(s) sugerida(s). Selecciona las que quieras importar.`
        : analysis.sectionsFound.length > 0
          ? "Se detectó una sección de materiales pero ninguna fila pasó el parser conservador."
          : "No se encontró una relación de materiales reconocible en el texto embebido.";

    return {
      success,
      hasEmbeddedText: true,
      textLength: analysis.textLength,
      sectionsFound: analysis.sectionsFound,
      suggestedItems,
      warnings: analysis.warnings,
      averageConfidence,
      existingTakeoffCount,
      comparisonSummary: analysis.comparisonSummary,
    };
  } catch {
    return {
      error:
        "No se pudo analizar el PDF. Comprueba que el archivo sea válido y accesible.",
    };
  }
}

export async function importExperimentalAutoTakeoffSuggestionsAction(
  _prevState: ExperimentalAutoTakeoffImportActionState,
  formData: FormData,
): Promise<ExperimentalAutoTakeoffImportActionState> {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const keysResult = parseSelectedSuggestionKeys(formData);

  if ("error" in keysResult) {
    return { error: keysResult.error };
  }

  const { companyId, jobId, drawingId } = scope;
  const { user, membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canAccessExperimentalAutoTakeoff(membership.role)) {
    return {
      error: "No tienes permiso para importar sugerencias experimentales.",
    };
  }

  try {
    const existingTakeoffItems = await getDrawingTakeoffItems(
      companyId,
      jobId,
      drawingId,
    );

    const analysis = await extractVerifiedExperimentalSuggestions({
      storagePath: drawing.storagePath,
      mimeType: drawing.mimeType,
      existingTakeoffItems: existingTakeoffItems.map((item) => ({
        reference: item.reference,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
      })),
    });

    if (!analysis.ok) {
      return { error: analysis.error };
    }

    const resolved = resolveSelectedSuggestionsForImport({
      verifiedItems: analysis.items,
      selectedSuggestionKeys: keysResult.keys,
    });

    if (!resolved.ok) {
      return { error: resolved.error };
    }

    let takeoffReviewInvalidated = false;

    await prisma.$transaction(async (tx) => {
      for (const row of resolved.rows) {
        await tx.drawingTakeoffItem.create({
          data: {
            companyId,
            jobId,
            drawingId,
            createdById: user.id,
            reference: row.reference,
            description: row.description,
            quantity: row.quantity,
            unit: row.unit,
            length: row.length,
            width: row.width,
            height: row.height,
            notes: row.notes,
          },
        });
      }

      await tx.drawingActivity.create({
        data: {
          drawingId,
          companyId,
          jobId,
          actorUserId: user.id,
          type: "takeoff_items_imported",
          message: buildExperimentalAutoTakeoffImportedActivityMessage(
            resolved.rows.length,
          ),
          metadata: {
            importedCount: resolved.rows.length,
            source: "experimental_auto_takeoff",
          },
        },
      });

      takeoffReviewInvalidated = await invalidateDrawingTakeoffReviewInTransaction(
        tx,
        {
          drawingId,
          companyId,
          jobId,
          actorUserId: user.id,
          reason: "takeoff_changed",
        },
      );
    });

    revalidateDrawingPage(companyId, jobId, drawingId);

    return {
      success: `Se importaron ${resolved.rows.length} línea(s) reales de palillería desde sugerencias experimentales.`,
      importedCount: resolved.rows.length,
      takeoffReviewInvalidated,
    };
  } catch {
    return {
      error:
        "No se pudieron importar las sugerencias seleccionadas. Inténtalo de nuevo.",
    };
  }
}
