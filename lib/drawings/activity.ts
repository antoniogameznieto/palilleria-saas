import type { DrawingActivityType, DrawingStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
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
  return `Detección de metadatos iniciada desde el nombre del archivo (${fileName}).`;
}

export function buildDetectionCompletedActivityMessage(
  appliedFields: string[],
): string {
  if (appliedFields.length === 0) {
    return "Detección completada sin metadatos nuevos en el nombre del archivo.";
  }

  return `Detección completada. Campos aplicados: ${appliedFields.join(", ")}.`;
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
