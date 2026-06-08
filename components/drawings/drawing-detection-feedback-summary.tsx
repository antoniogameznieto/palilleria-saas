import type { ReactNode } from "react";

import type { DetectionFeedbackSummary } from "@/lib/drawings/detection-merge";
import { formatDetectionSourceLabel } from "@/lib/drawings/detection-merge";

type DrawingDetectionFeedbackSummaryProps = {
  feedback: DetectionFeedbackSummary;
};

function FeedbackSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

export function DrawingDetectionFeedbackSummary({
  feedback,
}: DrawingDetectionFeedbackSummaryProps) {
  const appliedLabels = new Set(feedback.appliedFields);

  return (
    <div className="space-y-4 rounded-md bg-muted/15 px-3 py-3 text-sm">
      {feedback.detectedFields.length > 0 ? (
        <FeedbackSection title="Detectado">
          <ul className="space-y-1">
            {feedback.detectedFields.map((item) => (
              <li key={item.field}>
                <span className="font-medium">{item.displayLabel}:</span>{" "}
                {item.value}{" "}
                <span className="text-muted-foreground">
                  ({formatDetectionSourceLabel(item.source)})
                </span>
              </li>
            ))}
          </ul>
        </FeedbackSection>
      ) : (
        <FeedbackSection title="Detectado">
          <p className="text-muted-foreground">
            No se detectaron metadatos claros.
          </p>
        </FeedbackSection>
      )}

      {feedback.appliedFields.length > 0 ? (
        <FeedbackSection title="Aplicado">
          <ul className="space-y-1">
            {feedback.detectedFields
              .filter((item) => appliedLabels.has(item.label))
              .map((item) => (
                <li key={`applied-${item.field}`}>{item.displayLabel}</li>
              ))}
          </ul>
        </FeedbackSection>
      ) : (
        <FeedbackSection title="Aplicado">
          <p className="text-muted-foreground">Ningún campo nuevo aplicado.</p>
        </FeedbackSection>
      )}

      {feedback.skippedFields.length > 0 ? (
        <FeedbackSection title="No aplicado">
          <ul className="space-y-1 text-muted-foreground">
            {feedback.skippedFields.map((item) => (
              <li key={`skipped-${item.field}`}>
                {item.displayLabel}, porque ya tenía valor manual
                {item.existingValue ? ` (${item.existingValue})` : ""}
              </li>
            ))}
          </ul>
        </FeedbackSection>
      ) : null}
    </div>
  );
}
