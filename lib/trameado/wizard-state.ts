import { canExportTrameadoPackage } from "@/lib/trameado/export-package";
import type { TrameadoPdfAnnotationSummary } from "@/lib/trameado/pdf-annotations";
import type {
  TrameadoSegmentSuggestionsResult,
} from "@/lib/trameado/segment-suggestions";
import type { TrameadoSheetValidationResult } from "@/lib/trameado/sheet-validation";

export type TrameadoWizardStepId =
  | "prepare_sheet"
  | "review_suggestions"
  | "confirm_segments"
  | "mark_isometric"
  | "validate_sheet"
  | "download_package";

export type TrameadoWizardStepStatus =
  | "blocked"
  | "pending"
  | "in_progress"
  | "complete"
  | "review";

export type TrameadoWizardChecklistLabel =
  | "Hoja"
  | "Sugerencias"
  | "Tramos"
  | "Marcas"
  | "Validación"
  | "Paquete";

export type TrameadoWizardChecklistItem = {
  id: TrameadoWizardStepId;
  label: TrameadoWizardChecklistLabel;
  status: TrameadoWizardStepStatus;
  displayStatus: "Pendiente" | "En curso" | "Completo" | "Revisar";
};

export type TrameadoWizardSuggestionSummary = {
  highConfidenceCount: number;
  reviewCount: number;
  onSheetCount: number;
  hasActionableSuggestions: boolean;
  mode: TrameadoSegmentSuggestionsResult["mode"];
};

export type TrameadoWizardUnmarkedSegment = {
  id: string;
  label: string;
};

export type TrameadoWizardState = {
  hasSheet: boolean;
  hasSuggestions: boolean;
  suggestionSummary: TrameadoWizardSuggestionSummary;
  confirmedSegmentsCount: number;
  markedSegmentsCount: number;
  totalSegmentsCount: number;
  validationStatus: TrameadoSheetValidationResult["status"];
  validationStatusLabel: string;
  canExportPackage: boolean;
  includesMarkedPdfInPackage: boolean;
  currentStep: TrameadoWizardStepId;
  steps: Record<TrameadoWizardStepId, TrameadoWizardStepStatus>;
  checklist: TrameadoWizardChecklistItem[];
  unmarkedSegments: TrameadoWizardUnmarkedSegment[];
};

export type BuildTrameadoWizardStateInput = {
  hasSheet: boolean;
  segmentSuggestions: TrameadoSegmentSuggestionsResult;
  confirmedSegmentsCount: number;
  annotationSummary: TrameadoPdfAnnotationSummary;
  validation: TrameadoSheetValidationResult;
  segments: Array<{ id: string; segmentLabel: string; segmentNumber: string }>;
};

const STEP_ORDER: TrameadoWizardStepId[] = [
  "prepare_sheet",
  "review_suggestions",
  "confirm_segments",
  "mark_isometric",
  "validate_sheet",
  "download_package",
];

const CHECKLIST_LABELS: Record<TrameadoWizardStepId, TrameadoWizardChecklistLabel> =
  {
    prepare_sheet: "Hoja",
    review_suggestions: "Sugerencias",
    confirm_segments: "Tramos",
    mark_isometric: "Marcas",
    validate_sheet: "Validación",
    download_package: "Paquete",
  };

function toDisplayStatus(
  status: TrameadoWizardStepStatus,
): TrameadoWizardChecklistItem["displayStatus"] {
  switch (status) {
    case "complete":
      return "Completo";
    case "review":
      return "Revisar";
    case "in_progress":
    case "pending":
      return "En curso";
    case "blocked":
    default:
      return "Pendiente";
  }
}

function summarizeSuggestions(
  segmentSuggestions: TrameadoSegmentSuggestionsResult,
): TrameadoWizardSuggestionSummary {
  const pending = segmentSuggestions.suggestions.filter(
    (suggestion) => !suggestion.alreadyOnSheet,
  );

  return {
    highConfidenceCount: pending.filter(
      (suggestion) => suggestion.confidence === "high",
    ).length,
    reviewCount: pending.filter(
      (suggestion) => suggestion.confidence === "medium",
    ).length,
    onSheetCount: segmentSuggestions.suggestions.filter(
      (suggestion) => suggestion.alreadyOnSheet,
    ).length,
    hasActionableSuggestions:
      segmentSuggestions.mode === "short_iso" && pending.length > 0,
    mode: segmentSuggestions.mode,
  };
}

function resolvePrepareSheetStep(hasSheet: boolean): TrameadoWizardStepStatus {
  return hasSheet ? "complete" : "pending";
}

function resolveReviewSuggestionsStep(
  hasSheet: boolean,
  confirmedSegmentsCount: number,
  summary: TrameadoWizardSuggestionSummary,
): TrameadoWizardStepStatus {
  if (!hasSheet) {
    return "blocked";
  }

  if (confirmedSegmentsCount > 0) {
    return "complete";
  }

  if (!summary.hasActionableSuggestions) {
    return "complete";
  }

  if (summary.highConfidenceCount > 0 || summary.reviewCount > 0) {
    return "pending";
  }

  return "complete";
}

function resolveConfirmSegmentsStep(
  hasSheet: boolean,
  confirmedSegmentsCount: number,
): TrameadoWizardStepStatus {
  if (!hasSheet) {
    return "blocked";
  }

  if (confirmedSegmentsCount === 0) {
    return "pending";
  }

  return "complete";
}

function resolveMarkIsometricStep(
  confirmedSegmentsCount: number,
  markedSegmentsCount: number,
): TrameadoWizardStepStatus {
  if (confirmedSegmentsCount === 0) {
    return "blocked";
  }

  if (markedSegmentsCount >= confirmedSegmentsCount) {
    return "complete";
  }

  if (markedSegmentsCount > 0) {
    return "in_progress";
  }

  return "pending";
}

function resolveValidateSheetStep(
  confirmedSegmentsCount: number,
  validation: TrameadoSheetValidationResult,
): TrameadoWizardStepStatus {
  if (confirmedSegmentsCount === 0) {
    return "blocked";
  }

  switch (validation.status) {
    case "reasonable":
      return "complete";
    case "review_data":
    case "review_delta":
    case "review_delta_high":
      return "review";
    case "no_comparable":
      return "review";
    case "incomplete":
    case "no_data":
      return "pending";
    default:
      return "pending";
  }
}

function resolveDownloadPackageStep(
  confirmedSegmentsCount: number,
  canExport: boolean,
): TrameadoWizardStepStatus {
  if (!canExport || confirmedSegmentsCount === 0) {
    return "blocked";
  }

  return "in_progress";
}

function resolveCurrentStep(
  steps: Record<TrameadoWizardStepId, TrameadoWizardStepStatus>,
): TrameadoWizardStepId {
  for (const stepId of STEP_ORDER) {
    const status = steps[stepId];
    if (
      status === "pending" ||
      status === "in_progress" ||
      status === "review"
    ) {
      return stepId;
    }
  }

  return "download_package";
}

function buildUnmarkedSegments(
  segments: BuildTrameadoWizardStateInput["segments"],
  markedSegmentIds: Set<string>,
): TrameadoWizardUnmarkedSegment[] {
  return segments
    .filter((segment) => !markedSegmentIds.has(segment.id))
    .map((segment) => ({
      id: segment.id,
      label: segment.segmentLabel || segment.segmentNumber,
    }));
}

export function buildTrameadoWizardState(
  input: BuildTrameadoWizardStateInput,
): TrameadoWizardState {
  const suggestionSummary = summarizeSuggestions(input.segmentSuggestions);
  const markedSegmentIds = new Set(
    input.annotationSummary.items
      .filter((item) => item.marked)
      .map((item) => item.segmentId),
  );
  const markedSegmentsCount = input.annotationSummary.markedCount;
  const canExportPackage = canExportTrameadoPackage(input.confirmedSegmentsCount);

  const steps: Record<TrameadoWizardStepId, TrameadoWizardStepStatus> = {
    prepare_sheet: resolvePrepareSheetStep(input.hasSheet),
    review_suggestions: resolveReviewSuggestionsStep(
      input.hasSheet,
      input.confirmedSegmentsCount,
      suggestionSummary,
    ),
    confirm_segments: resolveConfirmSegmentsStep(
      input.hasSheet,
      input.confirmedSegmentsCount,
    ),
    mark_isometric: resolveMarkIsometricStep(
      input.confirmedSegmentsCount,
      markedSegmentsCount,
    ),
    validate_sheet: resolveValidateSheetStep(
      input.confirmedSegmentsCount,
      input.validation,
    ),
    download_package: resolveDownloadPackageStep(
      input.confirmedSegmentsCount,
      canExportPackage,
    ),
  };

  const currentStep = resolveCurrentStep(steps);

  const checklist: TrameadoWizardChecklistItem[] = STEP_ORDER.map((stepId) => {
    const status =
      stepId === currentStep &&
      steps[stepId] !== "complete" &&
      steps[stepId] !== "blocked"
        ? steps[stepId] === "review"
          ? "review"
          : "in_progress"
        : steps[stepId];

    return {
      id: stepId,
      label: CHECKLIST_LABELS[stepId],
      status,
      displayStatus: toDisplayStatus(status),
    };
  });

  return {
    hasSheet: input.hasSheet,
    hasSuggestions: suggestionSummary.hasActionableSuggestions,
    suggestionSummary,
    confirmedSegmentsCount: input.confirmedSegmentsCount,
    markedSegmentsCount,
    totalSegmentsCount: input.confirmedSegmentsCount,
    validationStatus: input.validation.status,
    validationStatusLabel: input.validation.statusLabel,
    canExportPackage,
    includesMarkedPdfInPackage: markedSegmentsCount > 0,
    currentStep,
    steps,
    checklist,
    unmarkedSegments: buildUnmarkedSegments(input.segments, markedSegmentIds),
  };
}
