import Link from "next/link";

import { ArchiveJobButton } from "@/components/jobs/archive-job-button";
import { JobSettingsSummary } from "@/components/jobs/job-settings-summary";
import { JobSummaryCard } from "@/components/jobs/job-summary-card";
import { Button } from "@/components/ui/button";
import {
  canArchiveJob,
  canEditJob,
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

  const canEdit = canEditJob(membership.role);
  const canArchive = canArchiveJob(membership.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Detalle del trabajo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen, settings y placeholders de planos y palillería.
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
        <h3 className="text-lg font-medium">Planos</h3>
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {job._count.drawings} plano{job._count.drawings === 1 ? "" : "s"}{" "}
          subido{job._count.drawings === 1 ? "" : "s"}. La subida de PDFs estará
          disponible en la siguiente fase.
        </div>
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
