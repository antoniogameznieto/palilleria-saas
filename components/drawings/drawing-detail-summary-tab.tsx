import Link from "next/link";
import type { DrawingStatus } from "@prisma/client";

import { DrawingStatusControl } from "@/components/drawings/drawing-status-control";
import { Button } from "@/components/ui/button";
import {
  formatDrawingMetadataLine,
  formatMetadataValue,
} from "@/lib/drawings/format-metadata-line";
import { DRAWING_STATUS_LABELS } from "@/lib/drawings/labels";
import type { TakeoffSummary } from "@/lib/drawings/takeoff-summary";

type DrawingDetailSummaryTabProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  status: DrawingStatus;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  canEditStatus: boolean;
  takeoffSummary: TakeoffSummary;
};

export function DrawingDetailSummaryTab({
  companyId,
  jobId,
  drawingId,
  status,
  drawingNumber,
  lineNumber,
  revision,
  canEditStatus,
  takeoffSummary,
}: DrawingDetailSummaryTabProps) {
  const metadataLine = formatDrawingMetadataLine(
    drawingNumber,
    lineNumber,
    revision,
  );

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Estado</h3>
        <p className="text-sm text-muted-foreground">
          {DRAWING_STATUS_LABELS[status]}
        </p>
        <DrawingStatusControl
          companyId={companyId}
          jobId={jobId}
          drawingId={drawingId}
          status={status}
          canEdit={canEditStatus}
          plain
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Metadatos</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Resumen</dt>
            <dd className="mt-1 font-medium">{metadataLine}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Número de plano</dt>
            <dd className="mt-1 font-medium">
              {formatMetadataValue(drawingNumber)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Línea / revisión</dt>
            <dd className="mt-1 font-medium">
              {formatMetadataValue(lineNumber)} /{" "}
              {formatMetadataValue(revision)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Palillería del plano</h3>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Líneas</dt>
            <dd className="mt-1 text-lg font-semibold">
              {takeoffSummary.lineCount}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cantidad</dt>
            <dd className="mt-1 text-lg font-semibold">
              {takeoffSummary.totalQuantity}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Referencias</dt>
            <dd className="mt-1 text-lg font-semibold">
              {takeoffSummary.uniqueReferenceCount}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href="#palilleria">
          <Button type="button" variant="outline" size="sm">
            Ir a palillería
          </Button>
        </Link>
      </div>
    </div>
  );
}
