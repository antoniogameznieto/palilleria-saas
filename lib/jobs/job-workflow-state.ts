import type { DrawingStatus } from "@prisma/client";

import {
  getDrawingProgress,
  type DrawingProgressState,
} from "@/lib/drawings/drawing-progress";
import type { JobTrameadoWorkflowSummary } from "@/lib/jobs/get-job-trameado-summary";

export type JobWorkflowStepId =
  | "job_created"
  | "upload_drawings"
  | "complete_metadata"
  | "analyze_materials"
  | "review_beta_proposal"
  | "review_palilleria"
  | "trameado"
  | "export_delivery";

export type JobWorkflowStepStatus =
  | "complete"
  | "current"
  | "pending"
  | "review"
  | "blocked";

export type JobWorkflowDisplayStatus =
  | "Completo"
  | "En curso"
  | "Pendiente"
  | "Revisar"
  | "Bloqueado";

export type JobWorkflowDrawingInput = {
  id: string;
  originalFileName: string;
  status: DrawingStatus;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  takeoffLineCount: number;
  takeoffReviewedAt: Date | string | null;
};

export const WORKFLOW_STEP_TOTAL = 8;

export type JobWorkflowStep = {
  id: JobWorkflowStepId;
  number: number;
  total: number;
  label: string;
  shortLabel: string;
  description: string;
  status: JobWorkflowStepStatus;
  displayStatus: JobWorkflowDisplayStatus;
  summary: string;
};

export type JobWorkflowRecommendedAction = {
  stepId: JobWorkflowStepId;
  label: string;
  href: string | null;
  requiresEditPermission: boolean;
  testId: string;
};

export type JobWorkflowState = {
  steps: JobWorkflowStep[];
  currentStep: JobWorkflowStepId;
  summary: string;
  recommendedAction: JobWorkflowRecommendedAction | null;
  deliveryNote: string;
};

export type BuildJobWorkflowStateInput = {
  companyId: string;
  jobId: string;
  jobName: string;
  drawings: JobWorkflowDrawingInput[];
  showBetaProposal: boolean;
  trameado: JobTrameadoWorkflowSummary;
};

export const WORKFLOW_STEP_ORDER: JobWorkflowStepId[] = [
  "job_created",
  "upload_drawings",
  "complete_metadata",
  "analyze_materials",
  "review_beta_proposal",
  "review_palilleria",
  "trameado",
  "export_delivery",
];

const STEP_LABELS: Record<JobWorkflowStepId, string> = {
  job_created: "Trabajo creado",
  upload_drawings: "Subir planos",
  complete_metadata: "Completar metadatos",
  analyze_materials: "Analizar materiales",
  review_beta_proposal: "Revisar propuesta",
  review_palilleria: "Revisar palillería",
  trameado: "Tramear / palillear",
  export_delivery: "Exportar entrega",
};

const STEP_NUMBERS: Record<JobWorkflowStepId, number> = {
  job_created: 1,
  upload_drawings: 2,
  complete_metadata: 3,
  analyze_materials: 4,
  review_beta_proposal: 5,
  review_palilleria: 6,
  trameado: 7,
  export_delivery: 8,
};

const STEP_SHORT_LABELS: Record<JobWorkflowStepId, string> = {
  job_created: "Trabajo creado",
  upload_drawings: "Subir planos",
  complete_metadata: "Confirmar metadatos",
  analyze_materials: "Analizar materiales",
  review_beta_proposal: "Revisar propuesta",
  review_palilleria: "Revisar palillería",
  trameado: "Tramear / palillear",
  export_delivery: "Exportar entrega",
};

const STEP_DESCRIPTIONS: Record<JobWorkflowStepId, string> = {
  job_created: "El trabajo ya está creado. Sube los planos para empezar.",
  upload_drawings: "Añade los PDF del trabajo para poder confirmar metadatos y materiales.",
  complete_metadata:
    "Confirma nº plano, línea y revisión antes de analizar materiales.",
  analyze_materials:
    "La app lee la relación de materiales del PDF para preparar la propuesta.",
  review_beta_proposal:
    "La app ha generado una propuesta beta. Revisa las líneas recomendadas antes de importarlas a la palillería.",
  review_palilleria:
    "Revisa las líneas importadas o añadidas antes de pasar a Trameado.",
  trameado:
    "Aquí conviertes la palillería en una hoja revisable y marcas en el plano dónde va cada tramo.",
  export_delivery:
    "El paquete reúne la hoja Excel, el PDF marcado y el resumen de validación.",
};

export const WORKFLOW_MINI_STEP_LABELS: Record<JobWorkflowStepId, string> = {
  job_created: "Trabajo",
  upload_drawings: "Planos",
  complete_metadata: "Metadatos",
  analyze_materials: "Materiales",
  review_beta_proposal: "Propuesta",
  review_palilleria: "Palillería",
  trameado: "Trameado",
  export_delivery: "Entrega",
};

export function formatWorkflowStepBadge(stepNumber: number): string {
  return `Paso ${stepNumber} de ${WORKFLOW_STEP_TOTAL}`;
}

export function formatWorkflowStepHeading(
  stepNumber: number,
  label: string,
): string {
  return `${formatWorkflowStepBadge(stepNumber)} · ${label}`;
}

export function getWorkflowStepNumber(stepId: JobWorkflowStepId): number {
  return STEP_NUMBERS[stepId];
}

export function getWorkflowStepLabel(stepId: JobWorkflowStepId): string {
  return STEP_LABELS[stepId];
}

export function getWorkflowStepShortLabel(stepId: JobWorkflowStepId): string {
  return STEP_SHORT_LABELS[stepId];
}

export function getWorkflowStepDescription(stepId: JobWorkflowStepId): string {
  return STEP_DESCRIPTIONS[stepId];
}

function toDisplayStatus(
  status: JobWorkflowStepStatus,
): JobWorkflowDisplayStatus {
  switch (status) {
    case "complete":
      return "Completo";
    case "current":
      return "En curso";
    case "review":
      return "Revisar";
    case "blocked":
      return "Bloqueado";
    default:
      return "Pendiente";
  }
}

function drawingDetailHref(
  companyId: string,
  jobId: string,
  drawingId: string,
): string {
  return `/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`;
}

function uploadHref(companyId: string, jobId: string): string {
  return `/companies/${companyId}/jobs/${jobId}/drawings/upload`;
}

function pickDrawing(
  drawings: JobWorkflowDrawingInput[],
  predicate: (progress: DrawingProgressState, drawing: JobWorkflowDrawingInput) => boolean,
): JobWorkflowDrawingInput | null {
  for (const drawing of drawings) {
    const progress = getDrawingProgress(drawing);
    if (predicate(progress, drawing)) {
      return drawing;
    }
  }

  return null;
}

function pickDrawingWithTrameado(
  drawings: JobWorkflowDrawingInput[],
  drawingIds: string[],
): JobWorkflowDrawingInput | null {
  const match = drawings.find((drawing) => drawingIds.includes(drawing.id));
  return match ?? drawings[0] ?? null;
}

type WorkflowMetrics = {
  drawingsCount: number;
  totalTakeoffLines: number;
  metadataIssueCount: number;
  takeoffMissingCount: number;
  takeoffPendingReviewCount: number;
  readyDrawingCount: number;
  hasMetadataCompleteDrawing: boolean;
};

function buildMetrics(drawings: JobWorkflowDrawingInput[]): WorkflowMetrics {
  let metadataIssueCount = 0;
  let takeoffMissingCount = 0;
  let takeoffPendingReviewCount = 0;
  let readyDrawingCount = 0;
  let hasMetadataCompleteDrawing = false;
  let totalTakeoffLines = 0;

  for (const drawing of drawings) {
    totalTakeoffLines += drawing.takeoffLineCount;
    const progress = getDrawingProgress(drawing);

    if (
      progress === "missing_metadata" ||
      progress === "metadata_pending_review" ||
      progress === "error"
    ) {
      metadataIssueCount += 1;
    }

    if (progress === "takeoff_missing") {
      takeoffMissingCount += 1;
    }

    if (progress === "takeoff_pending_review") {
      takeoffPendingReviewCount += 1;
    }

    if (progress === "ready") {
      readyDrawingCount += 1;
    }

    if (
      progress !== "missing_metadata" &&
      progress !== "metadata_pending_review" &&
      progress !== "error"
    ) {
      hasMetadataCompleteDrawing = true;
    }
  }

  return {
    drawingsCount: drawings.length,
    totalTakeoffLines,
    metadataIssueCount,
    takeoffMissingCount,
    takeoffPendingReviewCount,
    readyDrawingCount,
    hasMetadataCompleteDrawing,
  };
}

function resolveBaseStatuses(
  input: BuildJobWorkflowStateInput,
  metrics: WorkflowMetrics,
): Record<JobWorkflowStepId, JobWorkflowStepStatus> {
  const { showBetaProposal, trameado } = input;
  const uploadComplete = metrics.drawingsCount > 0;
  const metadataComplete =
    uploadComplete && metrics.metadataIssueCount === 0;
  const hasTakeoffLines = metrics.totalTakeoffLines > 0;
  const palilleriaComplete =
    uploadComplete && metrics.readyDrawingCount === metrics.drawingsCount;
  const hasExportablePackage = trameado.exportableSheetCount > 0;
  const hasTrameadoActivity =
    trameado.sheetCount > 0 || trameado.segmentCount > 0;

  return {
    job_created: "complete",
    upload_drawings: uploadComplete ? "complete" : "pending",
    complete_metadata: !uploadComplete
      ? "blocked"
      : metadataComplete
        ? "complete"
        : metrics.metadataIssueCount > 0
          ? "pending"
          : "pending",
    analyze_materials: !metadataComplete
      ? "blocked"
      : hasTakeoffLines
        ? "complete"
        : "pending",
    review_beta_proposal: !showBetaProposal
      ? "complete"
      : !metadataComplete
        ? "blocked"
        : hasTakeoffLines
          ? "complete"
          : "review",
    review_palilleria: !hasTakeoffLines
      ? "blocked"
      : palilleriaComplete
        ? "complete"
        : metrics.takeoffPendingReviewCount > 0
          ? "pending"
          : "pending",
    trameado: !palilleriaComplete
      ? "blocked"
      : hasExportablePackage
        ? "complete"
        : hasTrameadoActivity
          ? "review"
          : "pending",
    export_delivery: hasExportablePackage ? "complete" : "blocked",
  };
}

function resolveCurrentStep(
  statuses: Record<JobWorkflowStepId, JobWorkflowStepStatus>,
): JobWorkflowStepId {
  for (const stepId of WORKFLOW_STEP_ORDER) {
    const status = statuses[stepId];
    if (status !== "complete" && status !== "blocked") {
      return stepId;
    }
  }

  return "export_delivery";
}

function buildStepSummary(
  stepId: JobWorkflowStepId,
  input: BuildJobWorkflowStateInput,
  metrics: WorkflowMetrics,
  status: JobWorkflowStepStatus,
): string {
  const { trameado } = input;

  switch (stepId) {
    case "job_created":
      return input.jobName;
    case "upload_drawings":
      return metrics.drawingsCount === 0
        ? "Aún no hay planos"
        : `${metrics.drawingsCount} plano${metrics.drawingsCount === 1 ? "" : "s"}`;
    case "complete_metadata":
      if (metrics.drawingsCount === 0) {
        return "Sube planos primero";
      }
      if (metrics.metadataIssueCount === 0) {
        return "Metadatos confirmados";
      }
      return `${metrics.metadataIssueCount} plano${metrics.metadataIssueCount === 1 ? "" : "s"} por confirmar`;
    case "analyze_materials":
      if (!metrics.hasMetadataCompleteDrawing) {
        return "Completa metadatos antes";
      }
      if (metrics.totalTakeoffLines > 0) {
        return `${metrics.totalTakeoffLines} línea${metrics.totalTakeoffLines === 1 ? "" : "s"} de palillería`;
      }
      return "Sin líneas importadas";
    case "review_beta_proposal":
      if (!input.showBetaProposal) {
        return "No disponible en este plano";
      }
      if (metrics.totalTakeoffLines > 0) {
        return "Propuesta revisada o importada";
      }
      return "Abre la propuesta beta en el plano";
    case "review_palilleria":
      if (metrics.totalTakeoffLines === 0) {
        return "Importa o añade líneas";
      }
      if (metrics.readyDrawingCount === metrics.drawingsCount) {
        return "Palillería revisada";
      }
      if (metrics.takeoffPendingReviewCount > 0) {
        return `${metrics.takeoffPendingReviewCount} plano${metrics.takeoffPendingReviewCount === 1 ? "" : "s"} por revisar`;
      }
      return "Revisión pendiente";
    case "trameado":
      if (trameado.segmentCount > 0) {
        return `${trameado.segmentCount} tramo${trameado.segmentCount === 1 ? "" : "s"} confirmado${trameado.segmentCount === 1 ? "" : "s"}`;
      }
      if (trameado.sheetCount > 0) {
        return `${trameado.sheetCount} hoja${trameado.sheetCount === 1 ? "" : "s"} creada${trameado.sheetCount === 1 ? "" : "s"}`;
      }
      return status === "blocked"
        ? "Cierra la palillería antes"
        : "Crea hojas en Trameado";
    case "export_delivery":
      if (trameado.exportableSheetCount > 0) {
        return `${trameado.exportableSheetCount} paquete${trameado.exportableSheetCount === 1 ? "" : "s"} disponible${trameado.exportableSheetCount === 1 ? "" : "s"}`;
      }
      return "Confirma tramos en Trameado";
    default:
      return "";
  }
}

function buildWorkflowSummary(
  currentStep: JobWorkflowStepId,
  metrics: WorkflowMetrics,
  trameado: JobTrameadoWorkflowSummary,
): string {
  if (metrics.drawingsCount === 0) {
    return "Empieza subiendo el primer plano del trabajo.";
  }

  if (metrics.metadataIssueCount > 0) {
    return "Confirma la propuesta de metadatos detectada en cada plano antes de avanzar con materiales y palillería.";
  }

  if (metrics.totalTakeoffLines === 0) {
    return "Analiza la relación de materiales y revisa la propuesta antes de cerrar la palillería.";
  }

  if (metrics.readyDrawingCount < metrics.drawingsCount) {
    return "Revisa la palillería de cada plano antes de pasar a Trameado.";
  }

  if (trameado.exportableSheetCount === 0) {
    return "Abre Trameado en un plano listo y confirma tramos para preparar la entrega.";
  }

  if (currentStep === "export_delivery") {
    return "Hay paquetes listos para descargar desde los planos trameados.";
  }

  return "Sigue el paso recomendado para avanzar hacia la entrega.";
}

function resolveRecommendedAction(
  input: BuildJobWorkflowStateInput,
  currentStep: JobWorkflowStepId,
): JobWorkflowRecommendedAction | null {
  const { companyId, jobId, drawings, trameado } = input;

  switch (currentStep) {
    case "job_created":
      return null;
    case "upload_drawings":
      return {
        stepId: currentStep,
        label: "Subir plano",
        href: uploadHref(companyId, jobId),
        requiresEditPermission: true,
        testId: "job-workflow-upload-drawing",
      };
    case "complete_metadata": {
      const drawing =
        pickDrawing(
          drawings,
          (progress) =>
            progress === "missing_metadata" ||
            progress === "metadata_pending_review" ||
            progress === "error",
        ) ?? drawings[0];

      return drawing
        ? {
            stepId: currentStep,
            label: "Revisar metadatos pendientes",
            href: drawingDetailHref(companyId, jobId, drawing.id),
            requiresEditPermission: true,
            testId: "job-workflow-review-metadata",
          }
        : null;
    }
    case "analyze_materials": {
      const drawing =
        pickDrawing(drawings, (progress) => progress === "takeoff_missing") ??
        drawings[0];

      return drawing
        ? {
            stepId: currentStep,
            label: "Ir a analizar materiales",
            href: drawingDetailHref(companyId, jobId, drawing.id),
            requiresEditPermission: true,
            testId: "job-workflow-analyze-materials",
          }
        : null;
    }
    case "review_beta_proposal": {
      const drawing =
        pickDrawing(drawings, (progress) => progress === "takeoff_missing") ??
        drawings[0];

      return drawing
        ? {
            stepId: currentStep,
            label: "Ir a revisar propuesta",
            href: drawingDetailHref(companyId, jobId, drawing.id),
            requiresEditPermission: true,
            testId: "job-workflow-review-beta",
          }
        : null;
    }
    case "review_palilleria": {
      const drawing =
        pickDrawing(
          drawings,
          (progress) => progress === "takeoff_pending_review",
        ) ??
        pickDrawing(drawings, (progress) => progress === "takeoff_missing") ??
        drawings[0];

      return drawing
        ? {
            stepId: currentStep,
            label: "Ir a revisar palillería",
            href: drawingDetailHref(companyId, jobId, drawing.id),
            requiresEditPermission: true,
            testId: "job-workflow-review-palilleria",
          }
        : null;
    }
    case "trameado": {
      const drawing =
        (trameado.primarySheet
          ? drawings.find(
              (item) => item.id === trameado.primarySheet?.drawingId,
            )
          : null) ??
        pickDrawing(drawings, (progress) => progress === "ready") ??
        drawings[0];

      return drawing
        ? {
            stepId: currentStep,
            label: "Ir a Trameado",
            href: drawingDetailHref(companyId, jobId, drawing.id),
            requiresEditPermission: true,
            testId: "job-workflow-open-trameado",
          }
        : null;
    }
    case "export_delivery": {
      const exportTarget = trameado.primaryExportable;
      const drawing = exportTarget
        ? (drawings.find((item) => item.id === exportTarget.drawingId) ??
          pickDrawingWithTrameado(
            drawings,
            trameado.drawingIdsWithSheets,
          ))
        : pickDrawingWithTrameado(drawings, trameado.drawingIdsWithSheets);

      return drawing
        ? {
            stepId: currentStep,
            label: "Ir a entrega",
            href: drawingDetailHref(companyId, jobId, drawing.id),
            requiresEditPermission: false,
            testId: "job-workflow-open-export",
          }
        : null;
    }
    default:
      return null;
  }
}

export function buildJobWorkflowState(
  input: BuildJobWorkflowStateInput,
): JobWorkflowState {
  const metrics = buildMetrics(input.drawings);
  const baseStatuses = resolveBaseStatuses(input, metrics);
  const currentStep = resolveCurrentStep(baseStatuses);

  const steps: JobWorkflowStep[] = WORKFLOW_STEP_ORDER.map((stepId) => {
    const baseStatus = baseStatuses[stepId];
    const status =
      stepId === currentStep &&
      baseStatus !== "complete" &&
      baseStatus !== "blocked"
        ? "current"
        : baseStatus;

    return {
      id: stepId,
      number: STEP_NUMBERS[stepId],
      total: WORKFLOW_STEP_TOTAL,
      label: STEP_LABELS[stepId],
      shortLabel: STEP_SHORT_LABELS[stepId],
      description: STEP_DESCRIPTIONS[stepId],
      status,
      displayStatus: toDisplayStatus(status),
      summary: buildStepSummary(stepId, input, metrics, status),
    };
  });

  const recommendedAction = resolveRecommendedAction(input, currentStep);

  return {
    steps,
    currentStep,
    summary: buildWorkflowSummary(currentStep, metrics, input.trameado),
    recommendedAction,
    deliveryNote: "La descarga se realiza desde cada plano trameado.",
  };
}
