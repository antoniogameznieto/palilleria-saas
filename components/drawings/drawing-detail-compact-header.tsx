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
import { formatMetadataValue } from "@/lib/drawings/format-metadata-line";
import {
  DRAWING_PROGRESS_LABELS,
  type DrawingProgressState,
} from "@/lib/drawings/drawing-progress";
import { buildTakeoffSummary } from "@/lib/drawings/takeoff-summary";
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
  takeoffReviewedAt: string | null;
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
  takeoffReviewedAt,
}: DrawingDetailCompactHeaderProps) {
  const takeoffSummary = buildTakeoffSummary(takeoffItems);
  const metadataStatusLabel = getMetadataStatusLabel(progress);
  const takeoffStatusLabel =
    takeoffItems.length === 0
      ? "Sin líneas"
      : takeoffReviewedAt
        ? "Revisada"
        : "Pendiente de revisión";

  return (
    <header className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <AppBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trabajos", href: `/companies/${companyId}/jobs` },
          { label: jobName, href: jobHref },
          { label: fileName },
        ]}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
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

          <div>
            <h1 className="text-xl font-semibold tracking-tight break-all sm:text-2xl">
              {fileName}
            </h1>
            <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Nº plano</dt>
                <dd className="font-medium">
                  {formatMetadataValue(drawingNumber)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Línea</dt>
                <dd className="font-medium">
                  {formatMetadataValue(lineNumber)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Revisión</dt>
                <dd className="font-medium">
                  {formatMetadataValue(revision)}
                </dd>
              </div>
            </dl>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Estado metadatos</dt>
              <dd className="font-medium">{metadataStatusLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estado palillería</dt>
              <dd className="font-medium">{takeoffStatusLabel}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <div>
              <span className="text-muted-foreground">Palillería · </span>
              <span className="font-semibold">{takeoffSummary.lineCount}</span>
              <span className="text-muted-foreground"> líneas</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cantidad · </span>
              <span className="font-semibold">{takeoffSummary.totalQuantity}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Referencias · </span>
              <span className="font-semibold">
                {takeoffSummary.uniqueReferenceCount}
              </span>
            </div>
          </div>

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
            <Button size="sm" variant="outline">
              Abrir PDF
            </Button>
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

function getMetadataStatusLabel(progress: DrawingProgressState): string {
  switch (progress) {
    case "error":
      return DRAWING_PROGRESS_LABELS.error;
    case "missing_metadata":
      return "Incompletos";
    case "metadata_pending_review":
      return "Pendiente de revisión";
    default:
      return "Completos";
  }
}
