"use client";

import { useMemo } from "react";

import { WorkflowConceptsHelp } from "@/components/jobs/workflow-concepts-help";
import { useBetaAssistantStatus } from "@/components/drawings/use-beta-assistant-status";
import type { DrawingProgressState } from "@/lib/drawings/drawing-progress";
import { resolveDrawingWorkflowStepId } from "@/lib/drawings/drawing-workflow-step";
import {
  WORKFLOW_MINI_STEP_LABELS,
  WORKFLOW_STEP_ORDER,
  formatWorkflowStepHeading,
  getWorkflowStepNumber,
  getWorkflowStepShortLabel,
} from "@/lib/jobs/job-workflow-state";
import { cn } from "@/lib/utils";

type DrawingWorkflowMiniGuideProps = {
  progress: DrawingProgressState;
  showBetaProposal: boolean;
  hasTrameadoSheets: boolean;
  hasExportablePackage: boolean;
  showConceptHelp?: boolean;
};

export function DrawingWorkflowMiniGuide({
  progress,
  showBetaProposal,
  hasTrameadoSheets,
  hasExportablePackage,
  showConceptHelp = true,
}: DrawingWorkflowMiniGuideProps) {
  const betaAssistantStatus = useBetaAssistantStatus();

  const currentStepId = useMemo(
    () =>
      resolveDrawingWorkflowStepId({
        progress,
        showBetaProposal,
        betaAssistantStatus,
        hasTrameadoSheets,
        hasExportablePackage,
      }),
    [
      betaAssistantStatus,
      hasExportablePackage,
      hasTrameadoSheets,
      progress,
      showBetaProposal,
    ],
  );

  const currentStepNumber = getWorkflowStepNumber(currentStepId);
  const currentStepLabel = getWorkflowStepShortLabel(currentStepId);

  return (
    <section
      className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 shadow-sm"
      data-testid="drawing-workflow-mini-guide"
      data-current-step={currentStepId}
    >
      <p
        className="text-sm font-medium leading-snug"
        data-testid="drawing-workflow-mini-guide-heading"
      >
        {formatWorkflowStepHeading(currentStepNumber, currentStepLabel)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Este es el avance de este plano dentro del trabajo.
      </p>

      <ol
        className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1"
        aria-label="Flujo global del trabajo"
        data-testid="drawing-workflow-mini-trail"
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
                data-testid={`drawing-workflow-mini-step-${stepId}`}
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

      {showConceptHelp ? (
        <div className="mt-2">
          <WorkflowConceptsHelp
            testId="drawing-workflow-concepts-help"
            toggleTestId="drawing-workflow-concepts-toggle"
            className="border-0 bg-transparent"
            summaryClassName="px-0 py-1 text-xs"
          />
        </div>
      ) : null}
    </section>
  );
}
