import Link from "next/link";

import { DrawingsTable } from "@/components/drawings/drawings-table";
import { ExportJobTakeoffCsvButton } from "@/components/jobs/export-job-takeoff-csv-button";
import { ArchiveJobButton } from "@/components/jobs/archive-job-button";
import { JobTakeoffSummaryCard } from "@/components/jobs/job-takeoff-summary";
import { JobSettingsSummary } from "@/components/jobs/job-settings-summary";
import { JobSummaryCard } from "@/components/jobs/job-summary-card";
import { Button } from "@/components/ui/button";
import { getJobTakeoffExportItems } from "@/lib/drawings/job-takeoff-export";
import { buildJobTakeoffSummary } from "@/lib/drawings/takeoff-summary";
import {
  canArchiveJob,
  canDeleteDrawings,
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
  const [drawings, jobTakeoffItems] = await Promise.all([
    getJobDrawings(companyId, jobId),
    getJobTakeoffExportItems(companyId, jobId),
  ]);

  const canEdit = canEditJob(membership.role);
  const canArchive = canArchiveJob(membership.role);
  const canUpload = canUploadDrawings(membership.role);
  const canDelete = canDeleteDrawings(membership.role);
  const jobTakeoffSummary = buildJobTakeoffSummary(
    jobTakeoffItems.map((item) => ({
      drawingId: item.drawingId,
      reference: item.reference,
      quantity: item.quantity,
      unit: item.unit,
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Detalle del trabajo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen, settings, planos y palillería del trabajo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <>
              <Link href={`/companies/${companyId}/jobs/${jobId}/edit`}>
                <Button variant="outline">Editar trabajo</Button>
              </Link>
              <Link href={`/companies/${companyId}/jobs/${jobId}/settings`}>
                <Button variant="outline">Editar settings</Button>
              </Link>
            </>
          ) : null}
          {canArchive && job.status !== "archived" ? (
            <ArchiveJobButton companyId={companyId} jobId={jobId} />
          ) : null}
        </div>
      </div>

      <JobSummaryCard
        name={job.name}
        clientName={job.clientName}
        projectCode={job.projectCode}
        description={job.description}
        status={job.status}
        createdAt={job.createdAt}
        createdByName={job.createdBy.name}
      />

      {job.settings ? (
        <section className="space-y-3">
          <h3 className="text-lg font-medium">Settings de palillería</h3>
          <JobSettingsSummary settings={job.settings} />
        </section>
      ) : null}

      <section className="space-y-3">
        <JobTakeoffSummaryCard summary={jobTakeoffSummary} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-medium">Planos</h3>
          <div className="flex flex-wrap gap-2">
            <ExportJobTakeoffCsvButton
              items={jobTakeoffItems}
              jobName={job.name}
              jobId={jobId}
            />
            {canUpload ? (
              <Link
                href={`/companies/${companyId}/jobs/${jobId}/drawings/upload`}
              >
                <Button>Subir planos</Button>
              </Link>
            ) : null}
          </div>
        </div>

        <DrawingsTable
          companyId={companyId}
          jobId={jobId}
          drawings={drawings.map((drawing) => ({
            id: drawing.id,
            fileName: drawing.fileName,
            originalFileName: drawing.originalFileName,
            drawingNumber: drawing.drawingNumber,
            lineNumber: drawing.lineNumber,
            revision: drawing.revision,
            status: drawing.status,
            createdAt: drawing.createdAt.toISOString(),
          }))}
          canDelete={canDelete}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-medium">Hoja de palillería</h3>
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Sin palillos todavía. La tabla editable de palillería se implementará
          en una fase posterior.
        </div>
      </section>
    </div>
  );
}
