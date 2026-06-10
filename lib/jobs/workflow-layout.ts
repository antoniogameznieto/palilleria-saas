import type { JobWorkflowStepId } from "@/lib/jobs/job-workflow-state";

const EARLY_WORKFLOW_STEPS: JobWorkflowStepId[] = [
  "job_created",
  "upload_drawings",
  "complete_metadata",
  "analyze_materials",
  "review_beta_proposal",
];

export function shouldCollapseJobTechnicalSummary(
  currentStep: JobWorkflowStepId,
): boolean {
  return EARLY_WORKFLOW_STEPS.includes(currentStep);
}

export function shouldCollapseTakeoffConsolidated(
  currentStep: JobWorkflowStepId,
  takeoffLineCount: number,
): boolean {
  if (takeoffLineCount === 0) {
    return true;
  }

  return EARLY_WORKFLOW_STEPS.includes(currentStep);
}

export function shouldCollapseJobSettings(
  currentStep: JobWorkflowStepId,
): boolean {
  return EARLY_WORKFLOW_STEPS.includes(currentStep);
}

export function shouldShowJobTakeoffExports(
  currentStep: JobWorkflowStepId,
  takeoffLineCount: number,
): boolean {
  return takeoffLineCount > 0 && !EARLY_WORKFLOW_STEPS.includes(currentStep);
}
