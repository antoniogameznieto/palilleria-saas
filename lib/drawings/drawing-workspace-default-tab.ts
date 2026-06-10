import type { DrawingProgressState } from "@/lib/drawings/drawing-progress";

export type DrawingWorkspaceTab =
  | "propuesta-beta"
  | "palilleria"
  | "trameado"
  | "pdf"
  | "metadatos"
  | "actividad";

export function resolveDrawingWorkspaceDefaultTab(
  showBetaProposal: boolean,
  progress?: DrawingProgressState,
): DrawingWorkspaceTab {
  if (progress && needsMetadataAttention(progress)) {
    return "metadatos";
  }

  if (showBetaProposal) {
    return "propuesta-beta";
  }

  return "palilleria";
}

export function needsMetadataAttention(progress: DrawingProgressState): boolean {
  return (
    progress === "missing_metadata" || progress === "metadata_pending_review"
  );
}

export function shouldDeferMetadataTab(
  progress: DrawingProgressState,
  takeoffLineCount: number,
  showBetaProposal: boolean,
): boolean {
  return (
    showBetaProposal &&
    progress === "takeoff_missing" &&
    takeoffLineCount === 0
  );
}
