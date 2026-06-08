import type { DrawingStatus } from "@prisma/client";

import { DRAWING_STATUS_LABELS } from "@/lib/drawings/labels";

const REVIEWED_STATUSES: DrawingStatus[] = ["reviewed", "approved"];
const PENDING_STATUSES: DrawingStatus[] = [
  "uploaded",
  "processing",
  "detected",
];

const STATUS_DISPLAY_ORDER: DrawingStatus[] = [
  "uploaded",
  "processing",
  "detected",
  "reviewed",
  "approved",
  "error",
];

export type JobDrawingStatusSummary = {
  total: number;
  reviewedCount: number;
  pendingCount: number;
  errorCount: number;
  byStatus: Partial<Record<DrawingStatus, number>>;
};

export function buildJobDrawingStatusSummary(
  drawings: Array<{ status: DrawingStatus }>,
): JobDrawingStatusSummary {
  const byStatus: Partial<Record<DrawingStatus, number>> = {};

  for (const drawing of drawings) {
    byStatus[drawing.status] = (byStatus[drawing.status] ?? 0) + 1;
  }

  const countStatuses = (statuses: DrawingStatus[]) =>
    statuses.reduce((total, status) => total + (byStatus[status] ?? 0), 0);

  return {
    total: drawings.length,
    reviewedCount: countStatuses(REVIEWED_STATUSES),
    pendingCount: countStatuses(PENDING_STATUSES),
    errorCount: byStatus.error ?? 0,
    byStatus,
  };
}

export function formatJobDrawingStatusSubtitle(
  summary: JobDrawingStatusSummary,
): string {
  if (summary.total === 0) {
    return "Sin planos subidos todavía";
  }

  const parts: string[] = [];

  if (summary.reviewedCount > 0) {
    parts.push(
      `${summary.reviewedCount} revisado${summary.reviewedCount === 1 ? "" : "s"}`,
    );
  }

  if (summary.pendingCount > 0) {
    parts.push(
      `${summary.pendingCount} pendiente${summary.pendingCount === 1 ? "" : "s"}`,
    );
  }

  if (summary.errorCount > 0) {
    parts.push(
      `${summary.errorCount} error${summary.errorCount === 1 ? "" : "es"}`,
    );
  }

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  return STATUS_DISPLAY_ORDER.map((status) => {
    const count = summary.byStatus[status] ?? 0;

    if (count === 0) {
      return null;
    }

    return `${count} ${DRAWING_STATUS_LABELS[status].toLowerCase()}`;
  })
    .filter((part): part is string => part !== null)
    .join(" · ");
}
