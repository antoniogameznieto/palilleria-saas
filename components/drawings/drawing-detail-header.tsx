import type { DrawingStatus } from "@prisma/client";

import { DeleteDrawingButton } from "@/components/drawings/delete-drawing-button";
import { DrawingStatusBadge } from "@/components/drawings/drawing-status-badge";
import { Button } from "@/components/ui/button";

type DrawingDetailHeaderProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  fileName: string;
  status: DrawingStatus;
  createdAt: Date;
  canDelete: boolean;
};

export function DrawingDetailHeader({
  companyId,
  jobId,
  drawingId,
  fileName,
  status,
  createdAt,
  canDelete,
}: DrawingDetailHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-4">
      <div className="min-w-0 space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight break-all">
          {fileName}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <DrawingStatusBadge status={status} />
          <span aria-hidden>·</span>
          <time dateTime={createdAt.toISOString()}>
            Subido el {createdAt.toLocaleString("es-ES")}
          </time>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <a
          href={`/api/files/drawings/${drawingId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button>Abrir PDF</Button>
        </a>
        {canDelete ? (
          <DeleteDrawingButton
            companyId={companyId}
            jobId={jobId}
            drawingId={drawingId}
          />
        ) : null}
      </div>
    </div>
  );
}
