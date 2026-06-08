import { DrawingTakeoffSection } from "@/components/drawings/takeoff/drawing-takeoff-section";
import { DrawingActivityCard } from "@/components/drawings/drawing-activity-card";
import { DrawingDetectedMetadataReview } from "@/components/drawings/drawing-detected-metadata-review";
import { DrawingDetectionControl } from "@/components/drawings/drawing-detection-control";
import { DrawingDetailCompactHeader } from "@/components/drawings/drawing-detail-compact-header";
import { DrawingDetailSummaryTab } from "@/components/drawings/drawing-detail-summary-tab";
import { DrawingDetailWorkspace } from "@/components/drawings/drawing-detail-workspace";
import { DrawingMetadataForm } from "@/components/drawings/drawing-metadata-form";
import { DrawingMetadataReadonly } from "@/components/drawings/drawing-metadata-readonly";
import { DrawingPdfTextExtraction } from "@/components/drawings/drawing-pdf-text-extraction";
import { PdfViewer } from "@/components/drawings/pdf-viewer";
import { getDrawingRecentActivity, getLatestDetectionFeedbackFromActivities } from "@/lib/drawings/activity";
import { getDrawingTakeoffItems } from "@/lib/drawings/takeoff";
import { buildTakeoffSummary } from "@/lib/drawings/takeoff-summary";
import {
  canConfirmDetectedDrawingMetadata,
  canDeleteDrawings,
  canEditDrawingMetadata,
  canEditDrawingStatus,
  canExtractDrawingPdfText,
  canManageTakeoffItems,
  canStartDrawingDetection,
  requireDrawingAccess,
  requireJobAccess,
} from "@/lib/permissions";

type DrawingDetailPageProps = {
  params: Promise<{
    companyId: string;
    jobId: string;
    drawingId: string;
  }>;
};

export default async function DrawingDetailPage({
  params,
}: DrawingDetailPageProps) {
  const { companyId, jobId, drawingId } = await params;
  const [{ membership, drawing }, { job }, activities, takeoffItems] =
    await Promise.all([
      requireDrawingAccess(companyId, jobId, drawingId),
      requireJobAccess(companyId, jobId),
      getDrawingRecentActivity(companyId, jobId, drawingId),
      getDrawingTakeoffItems(companyId, jobId, drawingId),
    ]);

  const canEditMetadata = canEditDrawingMetadata(membership.role);
  const canEditStatus = canEditDrawingStatus(membership.role);
  const canStartDetection = canStartDrawingDetection(membership.role);
  const canExtractPdfText = canExtractDrawingPdfText(membership.role);
  const canConfirmDetected = canConfirmDetectedDrawingMetadata(membership.role);
  const canDelete = canDeleteDrawings(membership.role);
  const canEditTakeoff = canManageTakeoffItems(membership.role);
  const isDetected = drawing.status === "detected";
  const createdByLabel = drawing.createdBy.name ?? drawing.createdBy.email;
  const jobHref = `/companies/${companyId}/jobs/${jobId}`;
  const takeoffSummary = buildTakeoffSummary(takeoffItems);
  const lastDetectionFeedback =
    getLatestDetectionFeedbackFromActivities(activities);

  const metadataProps = {
    companyId,
    jobId,
    drawingId: drawing.id,
    fileSize: drawing.fileSize,
    drawingNumber: drawing.drawingNumber,
    lineNumber: drawing.lineNumber,
    revision: drawing.revision,
    createdByLabel,
  };

  return (
    <div className="space-y-6">
      <DrawingDetailCompactHeader
        companyId={companyId}
        jobId={jobId}
        jobName={job.name}
        jobHref={jobHref}
        drawingId={drawing.id}
        fileName={drawing.originalFileName}
        status={drawing.status}
        drawingNumber={drawing.drawingNumber}
        lineNumber={drawing.lineNumber}
        revision={drawing.revision}
        createdAt={drawing.createdAt}
        fileSize={drawing.fileSize}
        createdByLabel={createdByLabel}
        canDelete={canDelete}
        takeoffItems={takeoffItems}
      />

      <DrawingDetailWorkspace
        pdf={
          <PdfViewer
            drawingId={drawing.id}
            fileName={drawing.originalFileName}
            variant="hero"
          />
        }
        resumen={
          <DrawingDetailSummaryTab
            companyId={companyId}
            jobId={jobId}
            drawingId={drawing.id}
            status={drawing.status}
            drawingNumber={drawing.drawingNumber}
            lineNumber={drawing.lineNumber}
            revision={drawing.revision}
            canEditStatus={canEditStatus}
            takeoffSummary={takeoffSummary}
          />
        }
        metadatos={
          canEditMetadata ? (
            <DrawingMetadataForm
              key={`${drawing.id}:${drawing.drawingNumber ?? ""}:${drawing.lineNumber ?? ""}:${drawing.revision ?? ""}`}
              {...metadataProps}
              plain
            />
          ) : (
            <DrawingMetadataReadonly {...metadataProps} plain />
          )
        }
        automatizacion={
          <div className="space-y-6">
            {isDetected ? (
              <DrawingDetectedMetadataReview
                companyId={companyId}
                jobId={jobId}
                drawingId={drawing.id}
                drawingNumber={drawing.drawingNumber}
                lineNumber={drawing.lineNumber}
                revision={drawing.revision}
                canConfirm={canConfirmDetected}
                plain
              />
            ) : null}

            {canStartDetection ? (
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Detección automática</h3>
                <p className="text-xs text-muted-foreground">
                  Analiza el nombre del archivo y el texto embebido del PDF.
                  Solo rellena campos vacíos.
                </p>
                <DrawingDetectionControl
                  companyId={companyId}
                  jobId={jobId}
                  drawingId={drawing.id}
                  status={drawing.status}
                  lastDetectionFeedback={lastDetectionFeedback}
                  plain
                />
              </section>
            ) : null}

            {canExtractPdfText ? (
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Extracción de texto</h3>
                <p className="text-xs text-muted-foreground">
                  Experimental. Vista previa del texto embebido sin OCR ni IA.
                  La detección de metadatos ya usa este texto automáticamente.
                </p>
                <DrawingPdfTextExtraction
                  companyId={companyId}
                  jobId={jobId}
                  drawingId={drawing.id}
                  plain
                />
              </section>
            ) : null}

            {!isDetected && !canStartDetection && !canExtractPdfText ? (
              <p className="text-sm text-muted-foreground">
                No tienes permisos para ejecutar automatizaciones en este plano.
              </p>
            ) : null}
          </div>
        }
        actividad={
          <DrawingActivityCard
            activities={activities}
            initialVisibleCount={5}
            plain
          />
        }
      />

      <DrawingTakeoffSection
        companyId={companyId}
        jobId={jobId}
        drawingId={drawing.id}
        drawingNumber={drawing.drawingNumber}
        items={takeoffItems}
        canEdit={canEditTakeoff}
      />
    </div>
  );
}
