import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DrawingTakeoffSection } from "@/components/drawings/takeoff/drawing-takeoff-section";
import { DrawingActivityCard } from "@/components/drawings/drawing-activity-card";
import { DrawingDetectedMetadataReview } from "@/components/drawings/drawing-detected-metadata-review";
import { DrawingDetectionControl } from "@/components/drawings/drawing-detection-control";
import { DrawingDetailHeader } from "@/components/drawings/drawing-detail-header";
import { DrawingMetadataForm } from "@/components/drawings/drawing-metadata-form";
import { DrawingMetadataReadonly } from "@/components/drawings/drawing-metadata-readonly";
import { DrawingStatusControl } from "@/components/drawings/drawing-status-control";
import { PdfViewer } from "@/components/drawings/pdf-viewer";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { Button } from "@/components/ui/button";
import { getDrawingRecentActivity } from "@/lib/drawings/activity";
import { getDrawingTakeoffItems } from "@/lib/drawings/takeoff";
import {
  canConfirmDetectedDrawingMetadata,
  canDeleteDrawings,
  canEditDrawingMetadata,
  canEditDrawingStatus,
  canManageTakeoffItems,
  canStartDrawingDetection,
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
  const [{ membership, drawing }, { job }, activities, takeoffItems] =
    await Promise.all([
      requireDrawingAccess(companyId, jobId, drawingId),
      requireJobAccess(companyId, jobId),
      getDrawingRecentActivity(companyId, jobId, drawingId),
      getDrawingTakeoffItems(companyId, jobId, drawingId),
    ]);

  const canEditMetadata = canEditDrawingMetadata(membership.role);
  const canEditStatus = canEditDrawingStatus(membership.role);
  const canStartDetection = canStartDrawingDetection(membership.role);
  const canConfirmDetected = canConfirmDetectedDrawingMetadata(membership.role);
  const canDelete = canDeleteDrawings(membership.role);
  const canEditTakeoff = canManageTakeoffItems(membership.role);
  const isDetected = drawing.status === "detected";
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

      <DrawingStatusControl
        companyId={companyId}
        jobId={jobId}
        drawingId={drawing.id}
        status={drawing.status}
        canEdit={canEditStatus}
      />

      {canStartDetection ? (
        <DrawingDetectionControl
          companyId={companyId}
          jobId={jobId}
          drawingId={drawing.id}
          status={drawing.status}
        />
      ) : null}

      {isDetected ? (
        <DrawingDetectedMetadataReview
          companyId={companyId}
          jobId={jobId}
          drawingId={drawing.id}
          drawingNumber={drawing.drawingNumber}
          lineNumber={drawing.lineNumber}
          revision={drawing.revision}
          canConfirm={canConfirmDetected}
        />
      ) : null}

      {canEditMetadata ? (
        <DrawingMetadataForm
          key={`${drawing.id}:${drawing.drawingNumber ?? ""}:${drawing.lineNumber ?? ""}:${drawing.revision ?? ""}`}
          {...metadataProps}
        />
      ) : (
        <DrawingMetadataReadonly {...metadataProps} />
      )}

      <DrawingActivityCard activities={activities} />

      <PdfViewer drawingId={drawing.id} fileName={drawing.originalFileName} />

      <DrawingTakeoffSection
        companyId={companyId}
        jobId={jobId}
        drawingId={drawing.id}
        items={takeoffItems}
        canEdit={canEditTakeoff}
      />
    </div>
  );
}
