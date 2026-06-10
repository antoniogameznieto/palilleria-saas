"use client";

import { WORKFLOW_CONCEPTS } from "@/lib/jobs/workflow-concepts";
import { cn } from "@/lib/utils";

type WorkflowConceptsHelpProps = {
  testId?: string;
  toggleTestId?: string;
  className?: string;
  summaryClassName?: string;
};

export function WorkflowConceptsHelp({
  testId = "workflow-concepts-help",
  toggleTestId = "workflow-concepts-toggle",
  className,
  summaryClassName,
}: WorkflowConceptsHelpProps = {}) {
  return (
    <details
      className={cn(
        "rounded-lg border border-border/60 bg-muted/10 [&>summary::-webkit-details-marker]:hidden",
        className,
      )}
      data-testid={testId}
    >
      <summary
        className={cn(
          "cursor-pointer list-none px-3 py-2 text-sm font-medium text-primary marker:content-none",
          summaryClassName,
        )}
        data-testid={toggleTestId}
      >
        Ver conceptos básicos
      </summary>
      <dl className="space-y-2 border-t px-3 py-3 text-sm">
        {WORKFLOW_CONCEPTS.map((concept) => (
          <div key={concept.id} data-testid={`workflow-concept-${concept.id}`}>
            <dt className="font-medium text-foreground">{concept.term}</dt>
            <dd className="text-muted-foreground">{concept.definition}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
