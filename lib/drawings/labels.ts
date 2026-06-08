import type { DrawingStatus } from "@prisma/client";

export const DRAWING_STATUS_LABELS: Record<DrawingStatus, string> = {
  uploaded: "Subido",
  processing: "Procesando",
  detected: "Detectado",
  reviewed: "Revisado",
  approved: "Aprobado",
  error: "Error",
};
