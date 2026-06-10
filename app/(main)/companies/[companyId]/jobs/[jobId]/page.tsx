import Link from "next/link";

import { JobDetailCompactHeader } from "@/components/jobs/job-detail-compact-header";
import { Button } from "@/components/ui/button";
import { JobDetailKpis } from "@/components/jobs/job-detail-kpis";
import { JobDrawingsSection } from "@/components/jobs/job-drawings-section";
import { JobTakeoffConsolidatedSection } from "@/components/jobs/job-takeoff-consolidated-section";
import { JobSettingsCollapsible } from "@/components/jobs/job-settings-collapsible";
import { JobWorkflowGuide } from "@/components/jobs/job-workflow-guide";
import { JobWorkflowSecondarySections } from "@/components/jobs/job-workflow-secondary-sections";
import { getDrawingProgress, buildJobDrawingProgressSummary } from "@/lib/drawings/drawing-progress";
import { buildJobDrawingStatusSummary } from "@/lib/drawings/drawing-status-summary";
import { canAccessExperimentalAutoTakeoff } from "@/lib/drawings/experimental-auto-takeoff-config";
import { getJobTakeoffExportItems } from "@/lib/drawings/job-takeoff-export";
import { buildJobTakeoffReviewSummary } from "@/lib/drawings/takeoff-review";
import { buildJobTakeoffSummary } from "@/lib/drawings/takeoff-summary";
import { getJobTrameadoWorkflowSummary } from "@/lib/jobs/get-job-trameado-summary";
import { buildJobWorkflowState } from "@/lib/jobs/job-workflow-state";
import {
  shouldCollapseJobSettings,
  shouldCollapseJobTechnicalSummary,
  shouldCollapseTakeoffConsolidated,
  shouldShowJobTakeoffExports,
} from "@/lib/jobs/workflow-layout";
import { serializeJobSettings } from "@/lib/jobs/serialize-settings";
import {
  canArchiveJob,
  canDeleteDrawings,
  canDeleteJob,
  canEditJob,
  canUploadDrawings,
  getJobDrawings,
  requireJobAccess,
} from "@/lib/permissions";

type JobDetailPageProps = {
  params: Promise<{
    companyId: string;
    jobId: string;
  }>;
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { companyId, jobId } = await params;
  const { membership, job } = await requireJobAccess(companyId, jobId);
  const [drawings, jobTakeoffItems, trameadoSummary] = await Promise.all([
    getJobDrawings(companyId, jobId),
    getJobTakeoffExportItems(companyId, jobId),
    getJobTrameadoWorkflowSummary(companyId, jobId),
  ]);

  const canEdit = canEditJob(membership.role);
  const canArchive = canArchiveJob(membership.role);
  const canDelete = canDeleteJob(membership.role);
  const canUpload = canUploadDrawings(membership.role);
  const canDeleteDrawing = canDeleteDrawings(membership.role);
  const jobTakeoffSummary = buildJobTakeoffSummary(
    jobTakeoffItems.map((item) => ({
      drawingId: item.drawingId,
      reference: item.reference,
      quantity: item.quantity,
      unit: item.unit,
    })),
  );
  const drawingSummary = buildJobDrawingStatusSummary(drawings);
  const takeoffReviewSummary = buildJobTakeoffReviewSummary(drawings);
  const drawingProgressSummary = buildJobDrawingProgressSummary(
    drawings.map((drawing) => ({
      status: drawing.status,
      drawingNumber: drawing.drawingNumber,
      lineNumber: drawing.lineNumber,
      revision: drawing.revision,
      takeoffLineCount: drawing._count.takeoffItems,
      takeoffReviewedAt: drawing.takeoffReviewedAt,
    })),
  );
  const serializedDrawings = drawings.map((drawing) => ({
    id: drawing.id,
    fileName: drawing.fileName,
    originalFileName: drawing.originalFileName,
    drawingNumber: drawing.drawingNumber,
    lineNumber: drawing.lineNumber,
    revision: drawing.revision,
    status: drawing.status,
    createdAt: drawing.createdAt.toISOString(),
    takeoffLineCount: drawing._count.takeoffItems,
    takeoffReviewedAt: drawing.takeoffReviewedAt?.toISOString() ?? null,
  }));
  const drawingProgressByDrawingId = Object.fromEntries(
    drawings.map((drawing) => [
      drawing.id,
      getDrawingProgress({
        status: drawing.status,
        drawingNumber: drawing.drawingNumber,
        lineNumber: drawing.lineNumber,
        revision: drawing.revision,
        takeoffLineCount: drawing._count.takeoffItems,
        takeoffReviewedAt: drawing.takeoffReviewedAt,
      }),
    ]),
  );
  const workflowState = buildJobWorkflowState({
    companyId,
    jobId,
    jobName: job.name,
    drawings: drawings.map((drawing) => ({
      id: drawing.id,
      originalFileName: drawing.originalFileName,
      status: drawing.status,
      drawingNumber: drawing.drawingNumber,
      lineNumber: drawing.lineNumber,
      revision: drawing.revision,
      takeoffLineCount: drawing._count.takeoffItems,
      takeoffReviewedAt: drawing.takeoffReviewedAt,
    })),
    showBetaProposal: canAccessExperimentalAutoTakeoff(membership.role),
    trameado: trameadoSummary,
  });
  const canAdvanceWorkflow = canEdit || canUpload;
  const collapseTechnicalSummary = shouldCollapseJobTechnicalSummary(
    workflowState.currentStep,
  );
  const collapseTakeoffConsolidated = shouldCollapseTakeoffConsolidated(
    workflowState.currentStep,
    jobTakeoffItems.length,
  );
  const collapseJobSettings = shouldCollapseJobSettings(workflowState.currentStep);
  const showTakeoffExports = shouldShowJobTakeoffExports(
    workflowState.currentStep,
    jobTakeoffItems.length,
  );

  return (
    <div className="space-y-6">
      <JobDetailCompactHeader
        companyId={companyId}
        jobId={jobId}
        name={job.name}
        status={job.status}
        clientName={job.clientName}
        projectCode={job.projectCode}
        description={job.description}
        createdAt={job.createdAt}
        createdByName={job.createdBy.name}
        canEdit={canEdit}
        canArchive={canArchive}
        canDelete={canDelete}
        canUpload={canUpload}
        showTakeoffExports={showTakeoffExports}
        takeoffItems={jobTakeoffItems}
      />

      <JobWorkflowGuide
        workflowState={workflowState}
        canAdvance={canAdvanceWorkflow}
      />

      <JobDrawingsSection
        companyId={companyId}
        jobId={jobId}
        drawings={serializedDrawings}
        canDelete={canDeleteDrawing}
      />

      <JobWorkflowSecondarySections
        showTechnicalSummary
        technicalSummaryDefaultOpen={!collapseTechnicalSummary}
        technicalSummary={
          <JobDetailKpis
            drawingSummary={drawingSummary}
            takeoffSummary={jobTakeoffSummary}
            takeoffReviewSummary={takeoffReviewSummary}
            drawingProgressSummary={drawingProgressSummary}
          />
        }
        showTakeoffConsolidated
        takeoffConsolidatedDefaultOpen={!collapseTakeoffConsolidated}
        takeoffConsolidated={
          <JobTakeoffConsolidatedSection
            companyId={companyId}
            jobId={jobId}
            items={jobTakeoffItems}
            drawingProgressByDrawingId={drawingProgressByDrawingId}
          />
        }
        showSettings={job.settings != null}
        settingsDefaultOpen={!collapseJobSettings}
        settings={
          job.settings ? (
            <div className="space-y-3">
              {canEdit ? (
                <Link href={`/companies/${companyId}/jobs/${jobId}/settings`}>
                  <Button type="button" variant="outline" size="sm">
                    Editar settings
                  </Button>
                </Link>
              ) : null}
              <JobSettingsCollapsible
                settings={serializeJobSettings(job.settings)}
              />
            </div>
          ) : null
        }
      />
    </div>
  );
}
