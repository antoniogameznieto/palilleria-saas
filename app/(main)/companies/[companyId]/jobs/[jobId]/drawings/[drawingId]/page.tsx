import Link from "next/link";

import { DeleteDrawingButton } from "@/components/drawings/delete-drawing-button";
import { DrawingMetadataForm } from "@/components/drawings/drawing-metadata-form";
import { DrawingMetadataReadonly } from "@/components/drawings/drawing-metadata-readonly";
import { PdfViewer } from "@/components/drawings/pdf-viewer";
import { Button } from "@/components/ui/button";
import {
  canDeleteDrawings,
  canEditDrawingMetadata,
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

  const canEdit = canEditDrawingMetadata(membership.role);
  const canDelete = canDeleteDrawings(membership.role);
  const createdByLabel = drawing.createdBy.name ?? drawing.createdBy.email;

  const metadataProps = {
    originalFileName: drawing.originalFileName,
    status: drawing.status,
    fileSize: drawing.fileSize,
    createdAt: drawing.createdAt,
    drawingNumber: drawing.drawingNumber,
    lineNumber: drawing.lineNumber,
    revision: drawing.revision,
    createdByLabel,
  };

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

      {canEdit ? (
        <DrawingMetadataForm
          companyId={companyId}
          jobId={jobId}
          drawingId={drawing.id}
          {...metadataProps}
        />
      ) : (
        <DrawingMetadataReadonly {...metadataProps} />
      )}

      <PdfViewer drawingId={drawing.id} fileName={drawing.originalFileName} />

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
