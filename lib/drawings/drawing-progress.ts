import type { DrawingStatus } from "@prisma/client";

export type DrawingProgressState =
  | "error"
  | "missing_metadata"
  | "metadata_pending_review"
  | "takeoff_missing"
  | "takeoff_pending_review"
  | "ready";

export type DrawingProgressInput = {
  status: DrawingStatus;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  takeoffLineCount: number;
  takeoffReviewedAt: Date | string | null;
};

export const DRAWING_PROGRESS_LABELS: Record<DrawingProgressState, string> = {
  error: "Error",
  missing_metadata: "Faltan metadatos",
  metadata_pending_review: "Revisar metadatos",
  takeoff_missing: "Sin palillería",
  takeoff_pending_review: "Revisar palillería",
  ready: "Listo",
};

export type JobDrawingProgressSummary = {
  total: number;
  readyCount: number;
  pendingCount: number;
  errorCount: number;
};

function isMetadataFieldPresent(value: string | null): boolean {
  return value != null && value.trim() !== "";
}

function hasCompleteMetadata(
  input: Pick<
    DrawingProgressInput,
    "drawingNumber" | "lineNumber" | "revision"
  >,
): boolean {
  return (
    isMetadataFieldPresent(input.drawingNumber) &&
    isMetadataFieldPresent(input.lineNumber) &&
    isMetadataFieldPresent(input.revision)
  );
}

function isMetadataReviewed(status: DrawingStatus): boolean {
  return status === "reviewed" || status === "approved";
}

export function getDrawingProgress(
  input: DrawingProgressInput,
): DrawingProgressState {
  if (input.status === "error") {
    return "error";
  }

  if (!hasCompleteMetadata(input)) {
    return "missing_metadata";
  }

  if (!isMetadataReviewed(input.status)) {
    return "metadata_pending_review";
  }

  if (input.takeoffLineCount === 0) {
    return "takeoff_missing";
  }

  if (input.takeoffReviewedAt == null) {
    return "takeoff_pending_review";
  }

  return "ready";
}

export function buildJobDrawingProgressSummary(
  drawings: DrawingProgressInput[],
): JobDrawingProgressSummary {
  let readyCount = 0;
  let pendingCount = 0;
  let errorCount = 0;

  for (const drawing of drawings) {
    const progress = getDrawingProgress(drawing);

    if (progress === "ready") {
      readyCount += 1;
    } else if (progress === "error") {
      errorCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  return {
    total: drawings.length,
    readyCount,
    pendingCount,
    errorCount,
  };
}

export function formatJobDrawingProgressHint(
  summary: JobDrawingProgressSummary,
): string | undefined {
  if (summary.total === 0) {
    return undefined;
  }

  const parts = [
    summary.readyCount > 0 ? `${summary.readyCount} listos` : null,
    summary.pendingCount > 0 ? `${summary.pendingCount} pendientes` : null,
    summary.errorCount > 0 ? `${summary.errorCount} errores` : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}
