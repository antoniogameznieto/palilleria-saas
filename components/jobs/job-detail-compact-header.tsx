import Link from "next/link";
import type { JobStatus } from "@prisma/client";

import { ArchiveJobButton } from "@/components/jobs/archive-job-button";
import { ExportJobTakeoffCsvButton } from "@/components/jobs/export-job-takeoff-csv-button";
import { ExportJobTakeoffExcelButton } from "@/components/jobs/export-job-takeoff-excel-button";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { Button } from "@/components/ui/button";
import type { SerializedJobTakeoffExportItem } from "@/lib/drawings/job-takeoff-export";
import { cn } from "@/lib/utils";

type JobDetailCompactHeaderProps = {
  companyId: string;
  jobId: string;
  name: string;
  status: JobStatus;
  clientName: string | null;
  projectCode: string | null;
  description: string | null;
  createdAt: Date;
  createdByName: string | null;
  canEdit: boolean;
  canArchive: boolean;
  canUpload: boolean;
  takeoffItems: SerializedJobTakeoffExportItem[];
};

export function JobDetailCompactHeader({
  companyId,
  jobId,
  name,
  status,
  clientName,
  projectCode,
  description,
  createdAt,
  createdByName,
  canEdit,
  canArchive,
  canUpload,
  takeoffItems,
}: JobDetailCompactHeaderProps) {
  const metadataParts = [
    clientName ? `Cliente: ${clientName}` : null,
    projectCode ? `Proyecto: ${projectCode}` : null,
  ].filter((part): part is string => part !== null);

  return (
    <header className="space-y-3 rounded-lg border bg-card p-4">
      <AppBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trabajos", href: `/companies/${companyId}/jobs` },
          { label: name },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {name}
            </h1>
            <JobStatusBadge status={status} />
          </div>

          {metadataParts.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {metadataParts.join(" · ")}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            <time dateTime={createdAt.toISOString()}>
              {createdAt.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
            {createdByName ? ` · ${createdByName}` : ""}
          </p>

          {description ? (
            <p className={cn("max-w-3xl text-sm text-muted-foreground", "line-clamp-2")}>
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {canUpload ? (
            <Link href={`/companies/${companyId}/jobs/${jobId}/drawings/upload`}>
              <Button size="sm" data-testid="job-upload-drawings">
                Subir planos
              </Button>
            </Link>
          ) : null}

          <ExportJobTakeoffCsvButton
            items={takeoffItems}
            jobName={name}
            jobId={jobId}
            size="sm"
          />

          <ExportJobTakeoffExcelButton
            companyId={companyId}
            jobId={jobId}
            itemCount={takeoffItems.length}
            size="sm"
          />

          {canEdit ? (
            <>
              <Link href={`/companies/${companyId}/jobs/${jobId}/edit`}>
                <Button variant="outline" size="sm" type="button">
                  Editar trabajo
                </Button>
              </Link>
              <Link href={`/companies/${companyId}/jobs/${jobId}/settings`}>
                <Button variant="outline" size="sm" type="button">
                  Editar settings
                </Button>
              </Link>
            </>
          ) : null}

          {canArchive && status !== "archived" ? (
            <ArchiveJobButton
              companyId={companyId}
              jobId={jobId}
              size="sm"
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
