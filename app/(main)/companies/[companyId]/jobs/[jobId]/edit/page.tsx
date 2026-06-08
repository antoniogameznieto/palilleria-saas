import { redirect } from "next/navigation";

import { JobForm } from "@/components/jobs/job-form";
import {
  canArchiveJob,
  canEditJob,
  requireJobAccess,
} from "@/lib/permissions";

type EditJobPageProps = {
  params: Promise<{
    companyId: string;
    jobId: string;
  }>;
};

export default async function EditJobPage({ params }: EditJobPageProps) {
  const { companyId, jobId } = await params;
  const { membership, job } = await requireJobAccess(companyId, jobId);

  if (!canEditJob(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Editar trabajo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Actualiza los datos básicos de {job.name}.
        </p>
      </div>

      <JobForm
        mode="edit"
        companyId={companyId}
        jobId={jobId}
        canArchive={canArchiveJob(membership.role)}
        defaultValues={{
          name: job.name,
          clientName: job.clientName,
          projectCode: job.projectCode,
          description: job.description,
          status: job.status,
        }}
      />
    </div>
  );
}
