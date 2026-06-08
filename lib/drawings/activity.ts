import type { DrawingActivityType, DrawingStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  parseDetectionFeedbackFromActivity,
  type DetectionFeedbackSummary,
} from "@/lib/drawings/detection-merge";
import { DRAWING_STATUS_LABELS } from "@/lib/drawings/labels";

export const DRAWING_ACTIVITY_LIMIT = 20;

type RecordDrawingActivityInput = {
  drawingId: string;
  companyId: string;
  jobId: string;
  actorUserId?: string | null;
  type: DrawingActivityType;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export async function recordDrawingActivity(
  input: RecordDrawingActivityInput,
): Promise<void> {
  await prisma.drawingActivity.create({
    data: {
      drawingId: input.drawingId,
      companyId: input.companyId,
      jobId: input.jobId,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      message: input.message,
      metadata: input.metadata,
    },
  });
}

export async function getDrawingRecentActivity(
  companyId: string,
  jobId: string,
  drawingId: string,
  limit = DRAWING_ACTIVITY_LIMIT,
) {
  return prisma.drawingActivity.findMany({
    where: {
      companyId,
      jobId,
      drawingId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      actor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

export function formatDrawingActivityActorLabel(
  actor: { name: string | null; email: string } | null,
): string {
  if (!actor) {
    return "Sistema";
  }

  return actor.name ?? actor.email;
}

export function buildDrawingUploadedActivityMessage(fileName: string): string {
  return `Plano subido: ${fileName}`;
}

export function buildMetadataUpdatedActivityMessage(): string {
  return "Metadatos del plano actualizados manualmente.";
}

export function buildStatusUpdatedActivityMessage(
  previousStatus: DrawingStatus,
  nextStatus: DrawingStatus,
): string {
  return `Estado cambiado de ${DRAWING_STATUS_LABELS[previousStatus]} a ${DRAWING_STATUS_LABELS[nextStatus]}.`;
}

export function buildDetectionStartedActivityMessage(fileName: string): string {
  return `Detección de metadatos iniciada. Se analizarán el nombre del archivo (${fileName}) y el texto embebido del PDF.`;
}

export function buildDetectionCompletedActivityMessage(
  feedback: DetectionFeedbackSummary,
): string {
  if (feedback.detectedFields.length === 0) {
    return "Detección completada sin metadatos detectados.";
  }

  const parts: string[] = [];

  if (feedback.appliedFields.length > 0) {
    parts.push(`aplicados: ${feedback.appliedFields.join(", ")}`);
  }

  if (feedback.skippedFields.length > 0) {
    parts.push(
      `omitidos: ${feedback.skippedFields.map((item) => item.label).join(", ")}`,
    );
  }

  if (parts.length === 0) {
    return "Detección completada sin cambios aplicables.";
  }

  const sourceSuffix =
    feedback.sourcesUsed.length > 0
      ? ` Origen: ${feedback.sourcesUsed.join(", ")}.`
      : ".";

  return `Detección completada. ${parts.join(" · ")}${sourceSuffix}`;
}

export function getLatestDetectionFeedbackFromActivities(
  activities: Array<{ type: DrawingActivityType; metadata: unknown }>,
): DetectionFeedbackSummary | null {
  const latestDetection = activities.find(
    (activity) => activity.type === "detection_completed",
  );

  if (!latestDetection) {
    return null;
  }

  return parseDetectionFeedbackFromActivity(latestDetection.metadata);
}

export function buildMetadataConfirmedActivityMessage(): string {
  return "Metadatos detectados confirmados. El plano pasó a estado Revisado.";
}

export function buildTakeoffItemCreatedActivityMessage(
  description: string,
): string {
  return `Línea de palillería añadida: ${description}`;
}

export function buildTakeoffItemUpdatedActivityMessage(
  description: string,
): string {
  return `Línea de palillería actualizada: ${description}`;
}

export function buildTakeoffItemDeletedActivityMessage(
  description: string,
): string {
  return `Línea de palillería eliminada: ${description}`;
}

export function buildTakeoffItemDuplicatedActivityMessage(): string {
  return "Se duplicó una línea de palillería";
}

export function buildTakeoffItemsImportedActivityMessage(
  importedCount: number,
): string {
  return `Se importaron ${importedCount} líneas de palillería desde CSV`;
}
