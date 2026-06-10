import type { DrawingProgressState } from "@/lib/drawings/drawing-progress";
import { needsMetadataAttention } from "@/lib/drawings/drawing-workspace-default-tab";
import type { ExperimentalAssistantStatus } from "@/lib/drawings/experimental-auto-takeoff-ui";
import type { JobWorkflowStepId } from "@/lib/jobs/job-workflow-state";

export type DrawingWorkflowContext = {
  progress: DrawingProgressState;
  showBetaProposal: boolean;
  betaAssistantStatus: ExperimentalAssistantStatus | null;
  hasTrameadoSheets: boolean;
  hasExportablePackage: boolean;
};

function isBetaProposalReviewPhase(
  status: ExperimentalAssistantStatus | null,
): boolean {
  return (
    status === "analyzed" ||
    status === "with_selection" ||
    status === "requires_review"
  );
}

export function resolveDrawingWorkflowStepId(
  input: DrawingWorkflowContext,
): JobWorkflowStepId {
  const {
    progress,
    showBetaProposal,
    betaAssistantStatus,
    hasTrameadoSheets,
    hasExportablePackage,
  } = input;

  if (needsMetadataAttention(progress) || progress === "error") {
    return "complete_metadata";
  }

  if (progress === "takeoff_missing") {
    if (showBetaProposal && isBetaProposalReviewPhase(betaAssistantStatus)) {
      return "review_beta_proposal";
    }

    if (showBetaProposal) {
      return "analyze_materials";
    }

    return "review_palilleria";
  }

  if (progress === "takeoff_pending_review") {
    return "review_palilleria";
  }

  if (hasExportablePackage) {
    return "export_delivery";
  }

  if (hasTrameadoSheets || progress === "ready") {
    return "trameado";
  }

  return "trameado";
}
