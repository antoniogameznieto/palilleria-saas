import { DrawingTakeoffSection } from "@/components/drawings/takeoff/drawing-takeoff-section";
import { DrawingActivityCard } from "@/components/drawings/drawing-activity-card";
import { DrawingBetaProposalPanel } from "@/components/drawings/drawing-beta-proposal-panel";
import { DrawingDetailCompactHeader } from "@/components/drawings/drawing-detail-compact-header";
import { DrawingDetailWorkspace } from "@/components/drawings/drawing-detail-workspace";
import { DrawingMetadataTab } from "@/components/drawings/drawing-metadata-tab";
import { PdfViewer } from "@/components/drawings/pdf-viewer";
import { getDrawingRecentActivity, getLatestDetectionFeedbackFromActivities } from "@/lib/drawings/activity";
import { getDrawingProgress } from "@/lib/drawings/drawing-progress";
import { getDrawingTakeoffItems } from "@/lib/drawings/takeoff";
import { getJobTakeoffExportItems } from "@/lib/drawings/job-takeoff-export";
import { toTakeoffSuggestionSourceItems } from "@/lib/drawings/takeoff-suggestions";
import { formatTakeoffReviewedByLabel } from "@/lib/drawings/takeoff-review";
import { canAccessExperimentalAutoTakeoff } from "@/lib/drawings/experimental-auto-takeoff-config";
import { canAccessExperimentalTitleBlockOcr } from "@/lib/drawings/experimental-title-block-ocr-config";
import { TrameadoSection } from "@/components/trameado/trameado-section";
import { getDrawingTrameadoSheets } from "@/lib/trameado/db";
import { buildSuggestedLineIdentifier } from "@/lib/trameado/suggest-line-identifier";
import { buildTrameadoSheetSuggestions } from "@/lib/trameado/suggestions";
import { loadCandidateDimensionsForDrawing } from "@/lib/trameado/load-candidate-dimensions";
import { prisma } from "@/lib/db";
import {
  canConfirmDetectedDrawingMetadata,
  canDeleteDrawings,
  canEditDrawingMetadata,
  canEditDrawingStatus,
  canExtractDrawingPdfText,
  canManageTakeoffItems,
  canManageTrameado,
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
  const canEditTrameado = canManageTrameado(membership.role);
  const [{ job }, activities, takeoffItems, jobTakeoffItems, trameadoSheets, jobDrawings, candidateDimensions] =
    await Promise.all([
      requireJobAccess(companyId, jobId),
      getDrawingRecentActivity(companyId, jobId, drawingId),
      getDrawingTakeoffItems(companyId, jobId, drawingId),
      canEditTakeoff
        ? getJobTakeoffExportItems(companyId, jobId)
        : Promise.resolve([]),
      getDrawingTrameadoSheets(companyId, jobId, drawingId),
      prisma.drawing.findMany({
        where: {
          companyId,
          jobId,
        },
        select: {
          id: true,
          drawingNumber: true,
          lineNumber: true,
          revision: true,
        },
      }),
      loadCandidateDimensionsForDrawing({
        storagePath: drawing.storagePath,
        mimeType: drawing.mimeType,
        drawingNumber: drawing.drawingNumber,
        lineNumber: drawing.lineNumber,
        originalFileName: drawing.originalFileName,
      }),
    ]);

  const canEditMetadata = canEditDrawingMetadata(membership.role);
  const canEditStatus = canEditDrawingStatus(membership.role);
  const canStartDetection = canStartDrawingDetection(membership.role);
  const canExtractPdfText = canExtractDrawingPdfText(membership.role);
  const canConfirmDetected = canConfirmDetectedDrawingMetadata(membership.role);
  const canDelete = canDeleteDrawings(membership.role);
  const showExperimentalAutoTakeoff = canAccessExperimentalAutoTakeoff(
    membership.role,
  );
  const showExperimentalTitleBlockOcr = canAccessExperimentalTitleBlockOcr(
    membership.role,
  );
  const createdByLabel = drawing.createdBy.name ?? drawing.createdBy.email;
  const jobSuggestionItems = toTakeoffSuggestionSourceItems(
    jobTakeoffItems.map((item) => ({
      reference: item.reference,
      description: item.description,
      unit: item.unit,
    })),
  );
  const jobHref = `/companies/${companyId}/jobs/${jobId}`;
  const takeoffReviewedByLabel = formatTakeoffReviewedByLabel(
    drawing.takeoffReviewedBy,
  );
  const lastDetectionFeedback =
    getLatestDetectionFeedbackFromActivities(activities);
  const suggestedLineIdentifier = buildSuggestedLineIdentifier({
    drawingNumber: drawing.drawingNumber,
    lineNumber: drawing.lineNumber,
    revision: drawing.revision,
  });
  const trameadoSheetSuggestions = buildTrameadoSheetSuggestions({
    drawing: {
      id: drawing.id,
      drawingNumber: drawing.drawingNumber,
      lineNumber: drawing.lineNumber,
      revision: drawing.revision,
    },
    takeoffItems,
    existingLineIdentifiers: trameadoSheets.map((sheet) => sheet.lineIdentifier),
    relatedDrawings: jobDrawings.filter((jobDrawing) => jobDrawing.id !== drawing.id),
  });
  const drawingProgress = getDrawingProgress({
    status: drawing.status,
    drawingNumber: drawing.drawingNumber,
    lineNumber: drawing.lineNumber,
    revision: drawing.revision,
    takeoffLineCount: takeoffItems.length,
    takeoffReviewedAt: drawing.takeoffReviewedAt,
  });

  const takeoffSection = (
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
      variant="workspace"
    />
  );

  const trameadoSection = (
    <TrameadoSection
      companyId={companyId}
      jobId={jobId}
      drawingId={drawing.id}
      drawingFileName={drawing.originalFileName}
      sheets={trameadoSheets}
      sheetSuggestions={trameadoSheetSuggestions}
      candidateDimensions={candidateDimensions}
      takeoffItems={takeoffItems}
      canManage={canEditTrameado}
      suggestedLineIdentifier={suggestedLineIdentifier}
      variant="workspace"
    />
  );

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
        takeoffReviewedAt={drawing.takeoffReviewedAt?.toISOString() ?? null}
      />

      <DrawingDetailWorkspace
        pdf={
          <PdfViewer
            drawingId={drawing.id}
            fileName={drawing.originalFileName}
            variant="default"
          />
        }
        palilleria={takeoffSection}
        trameado={trameadoSection}
        progress={drawingProgress}
        showBetaProposal={showExperimentalAutoTakeoff}
        takeoffLineCount={takeoffItems.length}
        propuestaBeta={
          showExperimentalAutoTakeoff ? (
            <DrawingBetaProposalPanel
              companyId={companyId}
              jobId={jobId}
              drawingId={drawing.id}
              existingTakeoffLineCount={takeoffItems.length}
            />
          ) : null
        }
        metadatos={
          <DrawingMetadataTab
            companyId={companyId}
            jobId={jobId}
            drawingId={drawing.id}
            status={drawing.status}
            drawingNumber={drawing.drawingNumber}
            lineNumber={drawing.lineNumber}
            revision={drawing.revision}
            fileSize={drawing.fileSize}
            createdByLabel={createdByLabel}
            canEditMetadata={canEditMetadata}
            canEditStatus={canEditStatus}
            canStartDetection={canStartDetection}
            canExtractPdfText={canExtractPdfText}
            canConfirmDetected={canConfirmDetected}
            showExperimentalTitleBlockOcr={showExperimentalTitleBlockOcr}
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
    </div>
  );
}
