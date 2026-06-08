import { redirect } from "next/navigation";

import { JobForm } from "@/components/jobs/job-form";
import { canEditJob, requireCompanyMember } from "@/lib/permissions";

type NewJobPageProps = {
  params: Promise<{
    companyId: string;
  }>;
};

export default async function NewJobPage({ params }: NewJobPageProps) {
  const { companyId } = await params;
  const { membership } = await requireCompanyMember(companyId);

  if (!canEditJob(membership.role)) {
    redirect(`/companies/${companyId}/jobs`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Nuevo trabajo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea un trabajo y se generarán sus settings de palillería por defecto.
        </p>
      </div>

      <JobForm mode="create" companyId={companyId} />
    </div>
  );
}
