import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DrawingDetailHeader } from "@/components/drawings/drawing-detail-header";
import { DrawingMetadataForm } from "@/components/drawings/drawing-metadata-form";
import { DrawingMetadataReadonly } from "@/components/drawings/drawing-metadata-readonly";
import { PdfViewer } from "@/components/drawings/pdf-viewer";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  canDeleteDrawings,
  canEditDrawingMetadata,
  requireDrawingAccess,
  requireJobAccess,
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
  const [{ membership, drawing }, { job }] = await Promise.all([
    requireDrawingAccess(companyId, jobId, drawingId),
    requireJobAccess(companyId, jobId),
  ]);

  const canEdit = canEditDrawingMetadata(membership.role);
  const canDelete = canDeleteDrawings(membership.role);
  const createdByLabel = drawing.createdBy.name ?? drawing.createdBy.email;
  const jobHref = `/companies/${companyId}/jobs/${jobId}`;

  const metadataProps = {
    companyId,
    jobId,
    drawingId: drawing.id,
    fileSize: drawing.fileSize,
    drawingNumber: drawing.drawingNumber,
    lineNumber: drawing.lineNumber,
    revision: drawing.revision,
    createdByLabel,
  };

  return (
    <div className="space-y-6">
      <AppBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trabajos", href: `/companies/${companyId}/jobs` },
          { label: job.name, href: jobHref },
          { label: drawing.originalFileName },
        ]}
      />

      <Link href={jobHref}>
        <Button variant="outline" type="button">
          <ArrowLeft className="size-4" />
          Volver al trabajo
        </Button>
      </Link>

      <DrawingDetailHeader
        companyId={companyId}
        jobId={jobId}
        drawingId={drawing.id}
        fileName={drawing.originalFileName}
        status={drawing.status}
        createdAt={drawing.createdAt}
        canDelete={canDelete}
      />

      {canEdit ? (
        <DrawingMetadataForm {...metadataProps} />
      ) : (
        <DrawingMetadataReadonly {...metadataProps} />
      )}

      <PdfViewer drawingId={drawing.id} fileName={drawing.originalFileName} />
    </div>
  );
}
