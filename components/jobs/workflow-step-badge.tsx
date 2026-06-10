import {
  formatWorkflowStepBadge,
  type JobWorkflowStepId,
  getWorkflowStepNumber,
} from "@/lib/jobs/job-workflow-state";
import { cn } from "@/lib/utils";

type WorkflowStepBadgeProps = {
  stepNumber: number;
  className?: string;
};

export function WorkflowStepBadge({
  stepNumber,
  className,
}: WorkflowStepBadgeProps) {
  return (
    <p
      className={cn(
        "text-xs font-medium uppercase tracking-wide",
        className,
      )}
      data-testid="workflow-step-badge"
      data-step-number={stepNumber}
    >
      {formatWorkflowStepBadge(stepNumber)}
    </p>
  );
}

type WorkflowStepBadgeByIdProps = {
  stepId: JobWorkflowStepId;
  className?: string;
};

export function WorkflowStepBadgeById({
  stepId,
  className,
}: WorkflowStepBadgeByIdProps) {
  return (
    <WorkflowStepBadge
      stepNumber={getWorkflowStepNumber(stepId)}
      className={className}
    />
  );
}
