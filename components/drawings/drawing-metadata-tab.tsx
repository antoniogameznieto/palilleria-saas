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
  pendingMetadataConfirmation?: boolean;
};

type DrawingMetadataTabContentProps = Omit<
  DrawingMetadataTabProps,
  "pendingMetadataConfirmation"
> & {
  pendingMetadataConfirmation: boolean;
};

function DrawingMetadataTabContent({
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
  pendingMetadataConfirmation,
}: DrawingMetadataTabContentProps) {
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
    <>
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

      <section
        className="space-y-2"
        data-testid={
          pendingMetadataConfirmation
            ? "drawing-metadata-manual-section"
            : undefined
        }
      >
        <h3 className="text-base font-semibold">
          {pendingMetadataConfirmation
            ? "Ajuste manual de metadatos"
            : "Metadatos"}
        </h3>
        {pendingMetadataConfirmation ? (
          <p className="text-sm text-muted-foreground">
            Usa esta zona solo si necesitas corregir los datos manualmente. Para
            el flujo normal, confirma la propuesta superior.
          </p>
        ) : null}
        {canEditMetadata ? (
          <DrawingMetadataForm
            key={`${drawingId}:${drawingNumber ?? ""}:${lineNumber ?? ""}:${revision ?? ""}`}
            {...metadataProps}
            plain
            secondarySubmit={pendingMetadataConfirmation}
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
          hideFilenameDetection={pendingMetadataConfirmation}
        />
      </section>
    </>
  );
}

export function DrawingMetadataTab({
  pendingMetadataConfirmation = false,
  ...props
}: DrawingMetadataTabProps) {
  const content = (
    <DrawingMetadataTabContent
      {...props}
      pendingMetadataConfirmation={pendingMetadataConfirmation}
    />
  );

  if (pendingMetadataConfirmation) {
    return (
      <details
        className="group rounded-lg border border-border/60 bg-muted/10 [&>summary::-webkit-details-marker]:hidden"
        data-testid="drawing-metadata-advanced-options"
      >
        <summary className="cursor-pointer list-none px-4 py-3 marker:content-none">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Opciones avanzadas</h3>
            <p className="text-sm text-muted-foreground">
              Normalmente no necesitas tocar esto. Úsalo solo si quieres corregir
              datos manualmente, cambiar el estado del plano o revisar herramientas
              de diagnóstico.
            </p>
            <p
              className="text-sm font-medium text-primary group-open:hidden"
              data-testid="drawing-metadata-advanced-toggle"
            >
              Mostrar opciones avanzadas
            </p>
            <p className="hidden text-sm font-medium text-primary group-open:block">
              Ocultar opciones avanzadas
            </p>
          </div>
        </summary>
        <div className="space-y-6 border-t px-4 py-4">{content}</div>
      </details>
    );
  }

  return <div className="space-y-6">{content}</div>;
}
