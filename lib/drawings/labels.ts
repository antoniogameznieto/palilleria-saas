import type { DrawingStatus } from "@prisma/client";

export const DRAWING_STATUS_LABELS: Record<DrawingStatus, string> = {
  uploaded: "Subido",
  processing: "Procesando",
  detected: "Detectado",
  reviewed: "Revisado",
  approved: "Aprobado",
  error: "Error",
};

export const MANUAL_DRAWING_STATUS_VALUES = [
  "uploaded",
  "processing",
  "detected",
  "reviewed",
  "error",
] as const satisfies readonly DrawingStatus[];

export type ManualDrawingStatus = (typeof MANUAL_DRAWING_STATUS_VALUES)[number];

export const MANUAL_DRAWING_STATUS_OPTIONS = MANUAL_DRAWING_STATUS_VALUES.map(
  (value) => ({
    value,
    label: DRAWING_STATUS_LABELS[value],
  }),
);

export function isManualDrawingStatus(
  status: DrawingStatus,
): status is ManualDrawingStatus {
  return MANUAL_DRAWING_STATUS_VALUES.includes(status as ManualDrawingStatus);
}
