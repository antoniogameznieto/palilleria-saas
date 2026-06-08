import { DrawingTakeoffSection } from "@/components/drawings/takeoff/drawing-takeoff-section";
import { DrawingActivityCard } from "@/components/drawings/drawing-activity-card";
import { DrawingAutomationPanel } from "@/components/drawings/drawing-automation-panel";
import { DrawingDetailCompactHeader } from "@/components/drawings/drawing-detail-compact-header";
import { DrawingDetailSummaryTab } from "@/components/drawings/drawing-detail-summary-tab";
import { DrawingDetailWorkspace } from "@/components/drawings/drawing-detail-workspace";
import { DrawingMetadataForm } from "@/components/drawings/drawing-metadata-form";
import { DrawingMetadataReadonly } from "@/components/drawings/drawing-metadata-readonly";
import { PdfViewer } from "@/components/drawings/pdf-viewer";
import { getDrawingRecentActivity, getLatestDetectionFeedbackFromActivities } from "@/lib/drawings/activity";
import { getDrawingProgress } from "@/lib/drawings/drawing-progress";
import { getDrawingTakeoffItems } from "@/lib/drawings/takeoff";
import { getJobTakeoffExportItems } from "@/lib/drawings/job-takeoff-export";
import { toTakeoffSuggestionSourceItems } from "@/lib/drawings/takeoff-suggestions";
import { formatTakeoffReviewedByLabel } from "@/lib/drawings/takeoff-review";
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
  const { membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );
  const canEditTakeoff = canManageTakeoffItems(membership.role);
  const [{ job }, activities, takeoffItems, jobTakeoffItems] =
    await Promise.all([
      requireJobAccess(companyId, jobId),
      getDrawingRecentActivity(companyId, jobId, drawingId),
      getDrawingTakeoffItems(companyId, jobId, drawingId),
      canEditTakeoff
        ? getJobTakeoffExportItems(companyId, jobId)
        : Promise.resolve([]),
    ]);

  const canEditMetadata = canEditDrawingMetadata(membership.role);
  const canEditStatus = canEditDrawingStatus(membership.role);
  const canStartDetection = canStartDrawingDetection(membership.role);
  const canExtractPdfText = canExtractDrawingPdfText(membership.role);
  const canConfirmDetected = canConfirmDetectedDrawingMetadata(membership.role);
  const canDelete = canDeleteDrawings(membership.role);
  const createdByLabel = drawing.createdBy.name ?? drawing.createdBy.email;
  const jobSuggestionItems = toTakeoffSuggestionSourceItems(
    jobTakeoffItems.map((item) => ({
      reference: item.reference,
      description: item.description,
      unit: item.unit,
    })),
  );
  const jobHref = `/companies/${companyId}/jobs/${jobId}`;
  const takeoffSummary = buildTakeoffSummary(takeoffItems);
  const takeoffReviewedByLabel = formatTakeoffReviewedByLabel(
    drawing.takeoffReviewedBy,
  );
  const lastDetectionFeedback =
    getLatestDetectionFeedbackFromActivities(activities);
  const drawingProgress = getDrawingProgress({
    status: drawing.status,
    drawingNumber: drawing.drawingNumber,
    lineNumber: drawing.lineNumber,
    revision: drawing.revision,
    takeoffLineCount: takeoffItems.length,
    takeoffReviewedAt: drawing.takeoffReviewedAt,
  });

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
        progress={drawingProgress}
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
          <DrawingAutomationPanel
            companyId={companyId}
            jobId={jobId}
            drawingId={drawing.id}
            status={drawing.status}
            drawingNumber={drawing.drawingNumber}
            lineNumber={drawing.lineNumber}
            revision={drawing.revision}
            canStartDetection={canStartDetection}
            canExtractPdfText={canExtractPdfText}
            canConfirmDetected={canConfirmDetected}
            lastDetectionFeedback={lastDetectionFeedback}
          />
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
        jobSuggestionItems={jobSuggestionItems}
        canEdit={canEditTakeoff}
        takeoffReviewedAt={drawing.takeoffReviewedAt?.toISOString() ?? null}
        takeoffReviewedByLabel={takeoffReviewedByLabel}
      />
    </div>
  );
}
