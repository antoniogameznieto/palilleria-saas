import { DrawingDetectedMetadataReview } from "@/components/drawings/drawing-detected-metadata-review";
import { DrawingDetectionControl } from "@/components/drawings/drawing-detection-control";
import { DrawingPdfTextExtraction } from "@/components/drawings/drawing-pdf-text-extraction";
import type { DetectionFeedbackSummary } from "@/lib/drawings/detection-merge";
import type { DrawingStatus } from "@prisma/client";
import type { ReactNode } from "react";

type DrawingAutomationPanelProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  status: DrawingStatus;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  canStartDetection: boolean;
  canExtractPdfText: boolean;
  canConfirmDetected: boolean;
  lastDetectionFeedback: DetectionFeedbackSummary | null;
};

function AutomationBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function DrawingAutomationPanel({
  companyId,
  jobId,
  drawingId,
  status,
  drawingNumber,
  lineNumber,
  revision,
  canStartDetection,
  canExtractPdfText,
  canConfirmDetected,
  lastDetectionFeedback,
}: DrawingAutomationPanelProps) {
  const isDetected = status === "detected";
  const hasAutomationAccess = canStartDetection || canExtractPdfText;

  if (!hasAutomationAccess && !isDetected) {
    return (
      <p className="text-sm text-muted-foreground">
        No tienes permisos para ejecutar automatizaciones en este plano.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {isDetected ? (
        <DrawingDetectedMetadataReview
          companyId={companyId}
          jobId={jobId}
          drawingId={drawingId}
          drawingNumber={drawingNumber}
          lineNumber={lineNumber}
          revision={revision}
          canConfirm={canConfirmDetected}
          plain
        />
      ) : null}

      {canStartDetection ? (
        <AutomationBlock
          title="Detectar metadatos"
          description="Busca número de plano, línea y revisión usando el nombre del archivo y el texto embebido del PDF."
        >
          <DrawingDetectionControl
            companyId={companyId}
            jobId={jobId}
            drawingId={drawingId}
            status={status}
            lastDetectionFeedback={lastDetectionFeedback}
            plain
          />
        </AutomationBlock>
      ) : null}

      {canExtractPdfText ? (
        <AutomationBlock
          title="Herramientas de diagnóstico"
          description="Vista previa del texto embebido del PDF. No modifica metadatos ni palillería."
        >
          <p className="text-xs text-muted-foreground">
            No necesitas ejecutar esto para detectar metadatos; la detección ya
            intenta leer el texto automáticamente.
          </p>
          <DrawingPdfTextExtraction
            companyId={companyId}
            jobId={jobId}
            drawingId={drawingId}
            plain
          />
        </AutomationBlock>
      ) : null}
    </div>
  );
}
