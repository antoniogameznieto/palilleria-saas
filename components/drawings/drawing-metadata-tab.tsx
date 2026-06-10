import { DrawingAutomationPanel } from "@/components/drawings/drawing-automation-panel";
import { DrawingMetadataForm } from "@/components/drawings/drawing-metadata-form";
import { DrawingMetadataReadonly } from "@/components/drawings/drawing-metadata-readonly";
import { DrawingStatusControl } from "@/components/drawings/drawing-status-control";
import type { DetectionFeedbackSummary } from "@/lib/drawings/detection-merge";
import type { DrawingStatus } from "@prisma/client";

export type DrawingMetadataTabCollapseMode =
  | "pending_confirmation"
  | "materials_step"
  | null;

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
  collapseMode?: DrawingMetadataTabCollapseMode;
};

type DrawingMetadataTabContentProps = Omit<
  DrawingMetadataTabProps,
  "collapseMode"
> & {
  collapseMode: DrawingMetadataTabCollapseMode;
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
  collapseMode,
}: DrawingMetadataTabContentProps) {
  const pendingMetadataConfirmation = collapseMode === "pending_confirmation";
  const deferToMaterialsStep = collapseMode === "materials_step";
  const hideFilenameDetection =
    pendingMetadataConfirmation || deferToMaterialsStep;

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
            : deferToMaterialsStep
              ? "drawing-metadata-complete-section"
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
        ) : deferToMaterialsStep ? (
          <p className="text-sm text-muted-foreground">
            Los metadatos de este plano ya están completos. Si necesitas
            corregirlos, puedes editar los campos manualmente.
          </p>
        ) : null}
        {canEditMetadata ? (
          <DrawingMetadataForm
            key={`${drawingId}:${drawingNumber ?? ""}:${lineNumber ?? ""}:${revision ?? ""}`}
            {...metadataProps}
            plain
            secondarySubmit={pendingMetadataConfirmation || deferToMaterialsStep}
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
          hideFilenameDetection={hideFilenameDetection}
        />
      </section>
    </>
  );
}

type AdvancedCollapseConfig = {
  testId: string;
  title: string;
  description: string;
  toggleTestId: string;
};

function getAdvancedCollapseConfig(
  collapseMode: DrawingMetadataTabCollapseMode,
): AdvancedCollapseConfig {
  if (collapseMode === "materials_step") {
    return {
      testId: "drawing-metadata-advanced-tools",
      title: "Herramientas avanzadas",
      description:
        "Los metadatos de este plano ya están completos. Si necesitas corregirlos, cambiar el estado o usar diagnóstico, ábrelo aquí.",
      toggleTestId: "drawing-metadata-advanced-tools-toggle",
    };
  }

  return {
    testId: "drawing-metadata-advanced-options",
    title: "Opciones avanzadas",
    description:
      "Normalmente no necesitas tocar esto. Úsalo solo si quieres corregir datos manualmente, cambiar el estado del plano o revisar herramientas de diagnóstico.",
    toggleTestId: "drawing-metadata-advanced-toggle",
  };
}

export function DrawingMetadataTab({
  collapseMode = null,
  ...props
}: DrawingMetadataTabProps) {
  const content = (
    <DrawingMetadataTabContent {...props} collapseMode={collapseMode} />
  );

  if (collapseMode) {
    const collapse = getAdvancedCollapseConfig(collapseMode);

    return (
      <details
        className="group rounded-lg border border-border/60 bg-muted/10 [&>summary::-webkit-details-marker]:hidden"
        data-testid={collapse.testId}
      >
        <summary className="cursor-pointer list-none px-4 py-3 marker:content-none">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">{collapse.title}</h3>
            <p className="text-sm text-muted-foreground">{collapse.description}</p>
            <p
              className="text-sm font-medium text-primary group-open:hidden"
              data-testid={collapse.toggleTestId}
            >
              Mostrar {collapse.title.toLowerCase()}
            </p>
            <p className="hidden text-sm font-medium text-primary group-open:block">
              Ocultar {collapse.title.toLowerCase()}
            </p>
          </div>
        </summary>
        <div className="space-y-6 border-t px-4 py-4">{content}</div>
      </details>
    );
  }

  return <div className="space-y-6">{content}</div>;
}
