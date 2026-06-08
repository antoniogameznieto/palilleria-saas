import type { JobStatus, LengthCriteria, LengthUnit } from "@prisma/client";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Borrador",
  in_progress: "En curso",
  reviewed: "Revisado",
  approved: "Aprobado",
  archived: "Archivado",
};

export const LENGTH_CRITERIA_LABELS: Record<LengthCriteria, string> = {
  real_cut_length: "Longitud real de corte",
  center_to_center: "Entre centros",
  face_to_face: "Entre caras",
  drawing_dimension: "Cota del plano",
  drawing_dimension_with_review: "Cota del plano + revisión",
  manual: "Manual",
  calculated_with_fitting_deductions: "Calculada con descuentos de accesorios",
};

export const LENGTH_UNIT_LABELS: Record<LengthUnit, string> = {
  mm: "mm",
  cm: "cm",
  m: "m",
};

export const LENGTH_CRITERIA_OPTIONS = Object.entries(LENGTH_CRITERIA_LABELS).map(
  ([value, label]) => ({
    value: value as LengthCriteria,
    label,
  }),
);

export const LENGTH_UNIT_OPTIONS = Object.entries(LENGTH_UNIT_LABELS).map(
  ([value, label]) => ({
    value: value as LengthUnit,
    label,
  }),
);

export const JOB_STATUS_OPTIONS = Object.entries(JOB_STATUS_LABELS).map(
  ([value, label]) => ({
    value: value as JobStatus,
    label,
  }),
);

export const DEFAULT_JOB_SETTINGS = {
  lengthCriteria: "drawing_dimension_with_review" as const,
  lengthUnit: "mm" as const,
  roundingMm: 1,
  maxPieceLengthMm: null,
  minPieceLengthMm: null,
  maxPieceWeightKg: null,
  separateByDiameter: true,
  separateBySchedule: true,
  separateByMaterial: true,
  separateAtFlanges: true,
  separateAtValves: true,
  separateAtFittings: true,
  requireReviewBeforeExport: true,
  notes: null,
};
