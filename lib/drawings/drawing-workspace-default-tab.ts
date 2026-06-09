import type { DrawingProgressState } from "@/lib/drawings/drawing-progress";

export type DrawingWorkspaceTab =
  | "propuesta-beta"
  | "palilleria"
  | "pdf"
  | "metadatos"
  | "actividad";

export function resolveDrawingWorkspaceDefaultTab(
  showBetaProposal: boolean,
): DrawingWorkspaceTab {
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
