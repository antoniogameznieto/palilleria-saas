"use client";

import { useMemo } from "react";

import { WorkflowConceptsHelp } from "@/components/jobs/workflow-concepts-help";
import { useBetaAssistantStatus } from "@/components/drawings/use-beta-assistant-status";
import {
  WorkflowGuideShell,
  WorkflowStepTrail,
} from "@/components/workflow/workflow-guide";
import type { DrawingProgressState } from "@/lib/drawings/drawing-progress";
import { resolveDrawingWorkflowStepId } from "@/lib/drawings/drawing-workflow-step";
import {
  formatWorkflowStepHeading,
  getWorkflowStepNumber,
  getWorkflowStepShortLabel,
} from "@/lib/jobs/job-workflow-state";

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
    <WorkflowGuideShell
      variant="compact"
      currentStepId={currentStepId}
      testId="drawing-workflow-mini-guide"
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

      <div className="mt-2">
        <WorkflowStepTrail
          currentStepId={currentStepId}
          testId="drawing-workflow-mini-trail"
          stepTestIdPrefix="drawing-workflow"
        />
      </div>

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
    </WorkflowGuideShell>
  );
}
