import Link from "next/link";
import type { JobStatus } from "@prisma/client";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";

type JobRow = {
  id: string;
  name: string;
  clientName: string | null;
  projectCode: string | null;
  status: JobStatus;
  createdAt: Date;
  _count: {
    drawings: number;
  };
};

type JobsTableProps = {
  companyId: string;
  jobs: JobRow[];
};

export function JobsTable({ companyId, jobs }: JobsTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay trabajos todavía. Crea el primero para empezar.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Código proyecto</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Creado</th>
            <th className="px-4 py-3 font-medium">Planos</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b last:border-b-0">
              <td className="px-4 py-3">
                <Link
                  href={`/companies/${companyId}/jobs/${job.id}`}
                  className="font-medium hover:underline"
                >
                  {job.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {job.clientName ?? "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {job.projectCode ?? "—"}
              </td>
              <td className="px-4 py-3">
                <JobStatusBadge status={job.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {job.createdAt.toLocaleDateString("es-ES")}
              </td>
              <td className="px-4 py-3">{job._count.drawings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
