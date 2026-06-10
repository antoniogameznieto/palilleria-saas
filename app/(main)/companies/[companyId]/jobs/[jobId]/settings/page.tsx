import { redirect } from "next/navigation";

import { JobSettingsForm } from "@/components/jobs/job-settings-form";
import { serializeJobSettings } from "@/lib/jobs/serialize-settings";
import { canEditJob, requireJobAccess } from "@/lib/permissions";

type JobSettingsPageProps = {
  params: Promise<{
    companyId: string;
    jobId: string;
  }>;
};

export default async function JobSettingsPage({ params }: JobSettingsPageProps) {
  const { companyId, jobId } = await params;
  const { membership, job } = await requireJobAccess(companyId, jobId);

  if (!canEditJob(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  if (!job.settings) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Settings de palillería
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura los criterios de palillería para {job.name}.
        </p>
      </div>

      <JobSettingsForm
        companyId={companyId}
        jobId={jobId}
        defaultValues={serializeJobSettings(job.settings)}
      />
    </div>
  );
}
