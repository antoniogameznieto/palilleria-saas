import Link from "next/link";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardRecentJob } from "@/lib/dashboard/company-dashboard";

type DashboardRecentJobsProps = {
  companyId: string;
  jobs: DashboardRecentJob[];
  canCreateJob: boolean;
};

export function DashboardRecentJobs({
  companyId,
  jobs,
  canCreateJob,
}: DashboardRecentJobsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 border-b pb-3">
        <div>
          <CardTitle className="text-base">Últimos trabajos</CardTitle>
          <CardDescription>
            Acceso rápido a los trabajos más recientes.
          </CardDescription>
        </div>
        <Link
          href={`/companies/${companyId}/jobs`}
          className="text-sm text-primary hover:underline"
        >
          Ver todos
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No hay trabajos todavía.
            {canCreateJob ? " Crea el primero desde el botón superior." : ""}
          </div>
        ) : (
          jobs.map((job) => {
            const jobHref = `/companies/${companyId}/jobs/${job.id}`;
            const drawingLabel =
              job.drawingCount === 1 ? "1 plano" : `${job.drawingCount} planos`;

            return (
              <div
                key={job.id}
                className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link href={jobHref} className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{job.name}</p>
                      <JobStatusBadge status={job.status} />
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {job.clientName ?? "Sin cliente"} ·{" "}
                      {job.createdAt.toLocaleDateString("es-ES")}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{drawingLabel}</span>
                      <span>
                        {job.takeoffLineCount} línea
                        {job.takeoffLineCount === 1 ? "" : "s"} de palillería
                      </span>
                      <span>
                        {job.reviewedDrawingCount}/{job.drawingCount} planos
                        revisados
                      </span>
                    </div>
                  </Link>

                  <Link href={jobHref} className="shrink-0">
                    <Button size="sm" type="button">
                      Abrir trabajo
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
