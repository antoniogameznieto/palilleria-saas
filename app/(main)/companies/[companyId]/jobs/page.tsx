import Link from "next/link";

import { JobsTable } from "@/components/jobs/jobs-table";
import { Button } from "@/components/ui/button";
import {
  canManageJobs,
  getCompanyJobs,
  requireCompanyMember,
} from "@/lib/permissions";

type CompanyJobsPageProps = {
  params: Promise<{
    companyId: string;
  }>;
};

export default async function CompanyJobsPage({ params }: CompanyJobsPageProps) {
  const { companyId } = await params;
  const { membership } = await requireCompanyMember(companyId);
  const jobs = await getCompanyJobs(companyId);
  const canCreate = canManageJobs(membership.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Trabajos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Listado de trabajos de la empresa activa.
          </p>
        </div>
        {canCreate ? (
          <Link href={`/companies/${companyId}/jobs/new`}>
            <Button>Nuevo trabajo</Button>
          </Link>
        ) : null}
      </div>

      <JobsTable companyId={companyId} jobs={jobs} />
    </div>
  );
}
