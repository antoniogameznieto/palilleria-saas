"use client";

import Link from "next/link";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  CircleDashed,
  Minus,
} from "lucide-react";

import { WorkflowConceptsHelp } from "@/components/jobs/workflow-concepts-help";
import { Button } from "@/components/ui/button";
import {
  formatWorkflowStepHeading,
  type JobWorkflowState,
  type JobWorkflowStepStatus,
} from "@/lib/jobs/job-workflow-state";
import { cn } from "@/lib/utils";

type JobWorkflowGuideProps = {
  workflowState: JobWorkflowState;
  canAdvance: boolean;
};

function checklistIcon(displayStatus: string) {
  switch (displayStatus) {
    case "Completo":
      return <Check className="size-3.5 shrink-0" aria-hidden />;
    case "Revisar":
      return <AlertCircle className="size-3.5 shrink-0 text-amber-600" aria-hidden />;
    case "En curso":
      return <CircleDashed className="size-3.5 shrink-0" aria-hidden />;
    case "Bloqueado":
      return <Minus className="size-3.5 shrink-0 opacity-40" aria-hidden />;
    default:
      return <Circle className="size-3.5 shrink-0 opacity-50" aria-hidden />;
  }
}

function stepStatusIcon(status: JobWorkflowStepStatus) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />;
    case "review":
      return <AlertCircle className="size-4 shrink-0 text-amber-600" aria-hidden />;
    case "current":
      return <CircleDashed className="size-4 shrink-0 text-primary" aria-hidden />;
    default:
      return <Circle className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />;
  }
}

export function JobWorkflowGuide({
  workflowState,
  canAdvance,
}: JobWorkflowGuideProps) {
  const { steps, currentStep, summary, recommendedAction, deliveryNote } =
    workflowState;
  const currentStepMeta = steps.find((step) => step.id === currentStep);
  const showPrimaryCta =
    recommendedAction != null &&
    (canAdvance || !recommendedAction.requiresEditPermission);

  return (
    <section
      className="space-y-4 rounded-xl border bg-card p-4 shadow-sm"
      data-testid="job-workflow-guide"
      data-current-step={currentStep}
    >
      <header className="space-y-2 border-b pb-3">
        <h2
          className="text-lg font-semibold leading-tight"
          data-testid="job-workflow-title"
        >
          Flujo del trabajo
        </h2>
        <p className="text-sm text-muted-foreground">
          Sigue estos pasos para pasar de los planos a una entrega revisable.
        </p>
        <p className="text-xs text-muted-foreground">
          Esta guía no bloquea el trabajo: solo te indica qué falta y cuál es el
          siguiente paso recomendado.
        </p>
        {!canAdvance ? (
          <p
            className="text-xs text-muted-foreground"
            data-testid="job-workflow-viewer-note"
          >
            Tu rol permite revisar el estado, pero no modificar algunos pasos de
            edición.
          </p>
        ) : null}
        <WorkflowConceptsHelp />
      </header>

      <ol
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8"
        aria-label="Progreso del flujo del trabajo"
        data-testid="job-workflow-checklist"
      >
        {steps.map((step) => (
          <li key={step.id}>
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs",
                step.status === "current"
                  ? "border-primary/40 bg-primary/10 font-medium"
                  : step.status === "complete"
                    ? "border-border bg-muted/40"
                    : step.status === "review"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : step.status === "blocked"
                        ? "border-transparent bg-muted/10 text-muted-foreground/70"
                        : "border-transparent bg-muted/20 text-muted-foreground",
              )}
              data-testid={`job-workflow-check-${step.id}`}
              data-status={step.displayStatus}
            >
              {checklistIcon(step.displayStatus)}
              <span className="min-w-0 truncate">
                <span className="font-medium">{step.label}</span>
                <span className="hidden xl:inline"> · </span>
                <span className="block xl:inline">{step.displayStatus}</span>
              </span>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Siguiente paso recomendado
        </p>
        {currentStepMeta ? (
          <>
            <p
              className="mt-1 text-sm font-medium"
              data-testid="job-workflow-recommended-step"
            >
              {formatWorkflowStepHeading(
                currentStepMeta.number,
                currentStepMeta.shortLabel,
              )}
            </p>
            <p
              className="mt-1 text-sm text-muted-foreground"
              data-testid="job-workflow-recommended-description"
            >
              {currentStepMeta.description}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm">{summary}</p>
        )}
        {showPrimaryCta && recommendedAction?.href ? (
          <div className="mt-3">
            <Link href={recommendedAction.href}>
              <Button
                type="button"
                size="default"
                data-testid={recommendedAction.testId}
              >
                {recommendedAction.label}
              </Button>
            </Link>
          </div>
        ) : recommendedAction && !canAdvance ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Tu rol permite revisar el estado, pero no modificar este paso.
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">{deliveryNote}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resumen del trabajo
        </p>
        <ul className="space-y-1.5">
          {steps
            .filter((step) => step.status !== "blocked")
            .map((step) => (
              <li
                key={step.id}
                className={cn(
                  "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                  step.status === "current" && "bg-primary/5",
                )}
                data-testid={`job-workflow-step-${step.number}`}
              >
                {stepStatusIcon(step.status)}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-medium",
                      step.status === "current"
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {step.number}. {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.summary}</p>
                </div>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
