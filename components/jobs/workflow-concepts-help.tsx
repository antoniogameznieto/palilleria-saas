"use client";

import { WORKFLOW_CONCEPTS } from "@/lib/jobs/workflow-concepts";

export function WorkflowConceptsHelp() {
  return (
    <details
      className="rounded-lg border border-border/60 bg-muted/10 [&>summary::-webkit-details-marker]:hidden"
      data-testid="workflow-concepts-help"
    >
      <summary
        className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-primary marker:content-none"
        data-testid="workflow-concepts-toggle"
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
