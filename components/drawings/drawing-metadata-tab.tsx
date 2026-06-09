import { DrawingAutomationPanel } from "@/components/drawings/drawing-automation-panel";
import { DrawingMetadataForm } from "@/components/drawings/drawing-metadata-form";
import { DrawingMetadataReadonly } from "@/components/drawings/drawing-metadata-readonly";
import { DrawingStatusControl } from "@/components/drawings/drawing-status-control";
import type { DetectionFeedbackSummary } from "@/lib/drawings/detection-merge";
import type { DrawingStatus } from "@prisma/client";

type DrawingMetadataTabProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  status: DrawingStatus;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  fileSize: bigint | null;
  createdByLabel: string;
  canEditMetadata: boolean;
  canEditStatus: boolean;
  canStartDetection: boolean;
  canExtractPdfText: boolean;
  canConfirmDetected: boolean;
  showExperimentalTitleBlockOcr: boolean;
  lastDetectionFeedback: DetectionFeedbackSummary | null;
};

export function DrawingMetadataTab({
  companyId,
  jobId,
  drawingId,
  status,
  drawingNumber,
  lineNumber,
  revision,
  fileSize,
  createdByLabel,
  canEditMetadata,
  canEditStatus,
  canStartDetection,
  canExtractPdfText,
  canConfirmDetected,
  showExperimentalTitleBlockOcr,
  lastDetectionFeedback,
}: DrawingMetadataTabProps) {
  const metadataProps = {
    companyId,
    jobId,
    drawingId,
    fileSize,
    drawingNumber,
    lineNumber,
    revision,
    createdByLabel,
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-base font-semibold">Estado del plano</h3>
        <DrawingStatusControl
          companyId={companyId}
          jobId={jobId}
          drawingId={drawingId}
          status={status}
          canEdit={canEditStatus}
          plain
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">Metadatos</h3>
        {canEditMetadata ? (
          <DrawingMetadataForm
            key={`${drawingId}:${drawingNumber ?? ""}:${lineNumber ?? ""}:${revision ?? ""}`}
            {...metadataProps}
            plain
          />
        ) : (
          <DrawingMetadataReadonly {...metadataProps} plain />
        )}
      </section>

      <section className="space-y-2 border-t pt-6">
        <h3 className="text-base font-semibold">Detección y herramientas</h3>
        <DrawingAutomationPanel
          companyId={companyId}
          jobId={jobId}
          drawingId={drawingId}
          status={status}
          drawingNumber={drawingNumber}
          lineNumber={lineNumber}
          revision={revision}
          canStartDetection={canStartDetection}
          canExtractPdfText={canExtractPdfText}
          canConfirmDetected={canConfirmDetected}
          showExperimentalTitleBlockOcr={showExperimentalTitleBlockOcr}
          lastDetectionFeedback={lastDetectionFeedback}
        />
      </section>
    </div>
  );
}
