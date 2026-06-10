import type { ReactNode } from "react";

import {
  WORKFLOW_MINI_STEP_LABELS,
  WORKFLOW_STEP_ORDER,
  getWorkflowStepNumber,
  type JobWorkflowStepId,
} from "@/lib/jobs/job-workflow-state";
import { cn } from "@/lib/utils";

export type WorkflowGuideVariant = "full" | "compact";

export function workflowGuideShellClass(variant: WorkflowGuideVariant): string {
  return variant === "full"
    ? "space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm"
    : "rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 shadow-sm";
}

type WorkflowGuideShellProps = {
  variant: WorkflowGuideVariant;
  currentStepId: JobWorkflowStepId;
  testId: string;
  className?: string;
  children: ReactNode;
};

export function WorkflowGuideShell({
  variant,
  currentStepId,
  testId,
  className,
  children,
}: WorkflowGuideShellProps) {
  return (
    <section
      className={cn(workflowGuideShellClass(variant), className)}
      data-testid={testId}
      data-current-step={currentStepId}
    >
      {children}
    </section>
  );
}

type WorkflowStepTrailProps = {
  currentStepId: JobWorkflowStepId;
  testId?: string;
  stepTestIdPrefix?: string;
};

export function WorkflowStepTrail({
  currentStepId,
  testId = "workflow-step-trail",
  stepTestIdPrefix = "workflow",
}: WorkflowStepTrailProps) {
  const currentStepNumber = getWorkflowStepNumber(currentStepId);

  return (
    <ol
      className="flex flex-wrap items-center gap-x-1 gap-y-1"
      aria-label="Flujo global del trabajo"
      data-testid={testId}
    >
      {WORKFLOW_STEP_ORDER.map((stepId, index) => {
        const stepNumber = getWorkflowStepNumber(stepId);
        const isCurrent = stepId === currentStepId;
        const isPast = stepNumber < currentStepNumber;

        return (
          <li key={stepId} className="flex items-center gap-1">
            {index > 0 ? (
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
            ) : null}
            <span
              data-testid={`${stepTestIdPrefix}-mini-step-${stepId}`}
              data-state={isCurrent ? "current" : isPast ? "past" : "upcoming"}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                isCurrent &&
                  "bg-primary/10 font-medium text-foreground ring-1 ring-primary/25",
                isPast && !isCurrent && "text-muted-foreground",
                !isPast && !isCurrent && "text-muted-foreground/60",
              )}
            >
              {WORKFLOW_MINI_STEP_LABELS[stepId]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function workflowRecommendedPanelClass(): string {
  return "rounded-lg border border-dashed border-border/60 bg-muted/20 p-3";
}
