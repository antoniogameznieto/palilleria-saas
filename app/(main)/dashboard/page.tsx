import Link from "next/link";
import type { JobStatus } from "@prisma/client";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireActiveCompany } from "@/lib/company";
import { JOB_STATUS_LABELS } from "@/lib/jobs/labels";
import {
  canManageJobs,
  getCompanyJobStats,
  getCompanyJobs,
  getCompanyMemberCount,
} from "@/lib/permissions";

export default async function DashboardPage() {
  const { user, company, membership } = await requireActiveCompany();
  const [memberCount, jobs, stats] = await Promise.all([
    getCompanyMemberCount(company.id),
    getCompanyJobs(company.id),
    getCompanyJobStats(company.id),
  ]);

  const recentJobs = jobs.slice(0, 5);
  const canCreate = canManageJobs(membership.role);

  const statusCounts = Object.fromEntries(
    stats.byStatus.map((item) => [item.status, item._count.status]),
  ) as Partial<Record<JobStatus, number>>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bienvenido{user.name ? `, ${user.name}` : ""}. Área de trabajo de{" "}
            {company.name}.
          </p>
        </div>
        {canCreate ? (
          <Link href={`/companies/${company.id}/jobs/new`}>
            <Button>Nuevo trabajo</Button>
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Empresa activa</p>
          <p className="mt-1 font-medium">{company.name}</p>
          {company.taxName ? (
            <p className="text-sm text-muted-foreground">{company.taxName}</p>
          ) : null}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Tu rol</p>
          <Badge className="mt-2 capitalize">{membership.role}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Miembros</p>
          <p className="mt-2 text-3xl font-semibold">{memberCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Trabajos totales</p>
          <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Estado</p>
          <Badge className="mt-2">Trabajos activos</Badge>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-medium">Trabajos por estado</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(JOB_STATUS_LABELS) as JobStatus[]).map((status) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <JobStatusBadge status={status} />
              <span className="font-medium">{statusCounts[status] ?? 0}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium">Últimos trabajos</h3>
          <Link
            href={`/companies/${company.id}/jobs`}
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No hay trabajos todavía.
            {canCreate ? " Crea el primero desde el botón superior." : ""}
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/companies/${company.id}/jobs/${job.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <div>
                  <p className="font-medium">{job.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.clientName ?? "Sin cliente"} ·{" "}
                    {job.createdAt.toLocaleDateString("es-ES")}
                  </p>
                </div>
                <JobStatusBadge status={job.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
