import type { JobStatus } from "@prisma/client";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";

type JobSummaryCardProps = {
  name: string;
  clientName: string | null;
  projectCode: string | null;
  description: string | null;
  status: JobStatus;
  createdAt: Date;
  createdByName: string | null;
};

export function JobSummaryCard({
  name,
  clientName,
  projectCode,
  description,
  status,
  createdAt,
  createdByName,
}: JobSummaryCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Creado el {createdAt.toLocaleDateString("es-ES")}
            {createdByName ? ` por ${createdByName}` : ""}
          </p>
        </div>
        <JobStatusBadge status={status} />
      </div>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Cliente</dt>
          <dd className="mt-1 font-medium">{clientName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Código de proyecto</dt>
          <dd className="mt-1 font-medium">{projectCode ?? "—"}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-muted-foreground">Descripción</dt>
          <dd className="mt-1 font-medium">{description ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
