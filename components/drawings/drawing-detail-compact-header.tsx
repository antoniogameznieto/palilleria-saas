import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { DrawingStatus } from "@prisma/client";

import { DeleteDrawingButton } from "@/components/drawings/delete-drawing-button";
import { DrawingProgressBadge } from "@/components/drawings/drawing-progress-badge";
import { DrawingStatusBadge } from "@/components/drawings/drawing-status-badge";
import { FileSize } from "@/components/drawings/file-size";
import { ExportTakeoffCsvButton } from "@/components/drawings/takeoff/export-takeoff-csv-button";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { Button } from "@/components/ui/button";
import { formatDrawingMetadataLine } from "@/lib/drawings/format-metadata-line";
import type { DrawingProgressState } from "@/lib/drawings/drawing-progress";
import type { SerializedTakeoffItem } from "@/lib/drawings/takeoff";

type DrawingDetailCompactHeaderProps = {
  companyId: string;
  jobId: string;
  jobName: string;
  jobHref: string;
  drawingId: string;
  fileName: string;
  status: DrawingStatus;
  progress: DrawingProgressState;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  createdAt: Date;
  fileSize: bigint | null;
  createdByLabel: string;
  canDelete: boolean;
  takeoffItems: SerializedTakeoffItem[];
};

export function DrawingDetailCompactHeader({
  companyId,
  jobId,
  jobName,
  jobHref,
  drawingId,
  fileName,
  status,
  progress,
  drawingNumber,
  lineNumber,
  revision,
  createdAt,
  fileSize,
  createdByLabel,
  canDelete,
  takeoffItems,
}: DrawingDetailCompactHeaderProps) {
  const metadataLine = formatDrawingMetadataLine(
    drawingNumber,
    lineNumber,
    revision,
  );

  return (
    <header className="space-y-3 rounded-lg border bg-card p-4">
      <AppBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trabajos", href: `/companies/${companyId}/jobs` },
          { label: jobName, href: jobHref },
          { label: fileName },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={jobHref}>
              <Button variant="outline" size="sm" type="button">
                <ArrowLeft className="size-4" />
                Volver al trabajo
              </Button>
            </Link>
            <DrawingStatusBadge status={status} />
            <DrawingProgressBadge progress={progress} />
          </div>

          <h1 className="text-xl font-semibold tracking-tight break-all sm:text-2xl">
            {fileName}
          </h1>

          <p className="text-sm text-muted-foreground">{metadataLine}</p>

          <p className="text-xs text-muted-foreground">
            <time dateTime={createdAt.toISOString()}>
              {createdAt.toLocaleString("es-ES")}
            </time>
            {" · "}
            <FileSize bytes={fileSize} />
            {" · "}
            {createdByLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={`/api/files/drawings/${drawingId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm">Abrir PDF</Button>
          </a>
          <ExportTakeoffCsvButton
            items={takeoffItems}
            drawingNumber={drawingNumber}
            drawingId={drawingId}
            size="sm"
          />
          {canDelete ? (
            <DeleteDrawingButton
              companyId={companyId}
              jobId={jobId}
              drawingId={drawingId}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
