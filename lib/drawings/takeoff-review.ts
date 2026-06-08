import type { Prisma } from "@prisma/client";

import { buildTakeoffReviewResetActivityMessage } from "@/lib/drawings/activity";

export type TakeoffReviewResetReason = "takeoff_changed" | "manual";

type InvalidateDrawingTakeoffReviewInput = {
  drawingId: string;
  companyId: string;
  jobId: string;
  actorUserId: string;
  reason: TakeoffReviewResetReason;
};

export async function invalidateDrawingTakeoffReviewInTransaction(
  tx: Prisma.TransactionClient,
  input: InvalidateDrawingTakeoffReviewInput,
): Promise<boolean> {
  const drawing = await tx.drawing.findFirst({
    where: {
      id: input.drawingId,
      companyId: input.companyId,
      jobId: input.jobId,
    },
    select: {
      takeoffReviewedAt: true,
    },
  });

  if (!drawing?.takeoffReviewedAt) {
    return false;
  }

  const updated = await tx.drawing.updateMany({
    where: {
      id: input.drawingId,
      companyId: input.companyId,
      jobId: input.jobId,
      takeoffReviewedAt: { not: null },
    },
    data: {
      takeoffReviewedAt: null,
      takeoffReviewedById: null,
    },
  });

  if (updated.count === 0) {
    return false;
  }

  await tx.drawingActivity.create({
    data: {
      drawingId: input.drawingId,
      companyId: input.companyId,
      jobId: input.jobId,
      actorUserId: input.actorUserId,
      type: "takeoff_review_reset",
      message: buildTakeoffReviewResetActivityMessage(
        input.reason === "manual" ? "manual" : "modified",
      ),
      metadata: {
        reason: input.reason,
      },
    },
  });

  return true;
}

export type JobTakeoffReviewSummary = {
  drawingsWithTakeoff: number;
  reviewedCount: number;
  pendingCount: number;
};

export function buildJobTakeoffReviewSummary(
  drawings: Array<{
    takeoffReviewedAt: Date | null;
    _count: { takeoffItems: number };
  }>,
): JobTakeoffReviewSummary {
  let drawingsWithTakeoff = 0;
  let reviewedCount = 0;

  for (const drawing of drawings) {
    if (drawing._count.takeoffItems === 0) {
      continue;
    }

    drawingsWithTakeoff += 1;

    if (drawing.takeoffReviewedAt) {
      reviewedCount += 1;
    }
  }

  return {
    drawingsWithTakeoff,
    reviewedCount,
    pendingCount: drawingsWithTakeoff - reviewedCount,
  };
}

export function formatTakeoffReviewedByLabel(
  reviewer: { name: string | null; email: string } | null | undefined,
): string | null {
  if (!reviewer) {
    return null;
  }

  return reviewer.name ?? reviewer.email;
}

export function formatTakeoffReviewedAt(value: Date | string): string {
  return new Date(value).toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
