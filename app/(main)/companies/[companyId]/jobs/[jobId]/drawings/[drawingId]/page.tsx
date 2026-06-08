import Link from "next/link";

import { DeleteDrawingButton } from "@/components/drawings/delete-drawing-button";
import { DrawingStatusBadge } from "@/components/drawings/drawing-status-badge";
import { FileSize } from "@/components/drawings/file-size";
import { Button } from "@/components/ui/button";
import {
  canDeleteDrawings,
  requireDrawingAccess,
} from "@/lib/permissions";

type DrawingDetailPageProps = {
  params: Promise<{
    companyId: string;
    jobId: string;
    drawingId: string;
  }>;
};

export default async function DrawingDetailPage({
  params,
}: DrawingDetailPageProps) {
  const { companyId, jobId, drawingId } = await params;
  const { membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  const canDelete = canDeleteDrawings(membership.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {drawing.originalFileName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Detalle del plano isométrico.
          </p>
        </div>
        <Link href={`/companies/${companyId}/jobs/${jobId}`}>
          <Button variant="outline">Volver al trabajo</Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Estado</dt>
            <dd className="mt-1">
              <DrawingStatusBadge status={drawing.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tamaño</dt>
            <dd className="mt-1 font-medium">
              <FileSize bytes={drawing.fileSize} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tipo MIME</dt>
            <dd className="mt-1 font-medium">{drawing.mimeType ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Fecha de subida</dt>
            <dd className="mt-1 font-medium">
              {drawing.createdAt.toLocaleString("es-ES")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Número de plano</dt>
            <dd className="mt-1 font-medium">
              {drawing.drawingNumber ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Número de línea</dt>
            <dd className="mt-1 font-medium">{drawing.lineNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Revisión</dt>
            <dd className="mt-1 font-medium">{drawing.revision ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Subido por</dt>
            <dd className="mt-1 font-medium">
              {drawing.createdBy.name ?? drawing.createdBy.email}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/files/drawings/${drawing.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button>Abrir PDF</Button>
        </a>
        {canDelete ? (
          <DeleteDrawingButton
            companyId={companyId}
            jobId={jobId}
            drawingId={drawing.id}
          />
        ) : null}
      </div>
    </div>
  );
}
