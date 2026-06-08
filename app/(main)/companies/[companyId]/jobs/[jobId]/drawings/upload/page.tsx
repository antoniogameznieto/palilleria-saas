import Link from "next/link";
import { redirect } from "next/navigation";

import { DrawingUploader } from "@/components/drawings/drawing-uploader";
import { Button } from "@/components/ui/button";
import { getMaxUploadSizeBytes } from "@/lib/storage";
import {
  canUploadDrawings,
  requireJobAccess,
} from "@/lib/permissions";

type UploadDrawingsPageProps = {
  params: Promise<{
    companyId: string;
    jobId: string;
  }>;
};

export default async function UploadDrawingsPage({
  params,
}: UploadDrawingsPageProps) {
  const { companyId, jobId } = await params;
  const { membership, job } = await requireJobAccess(companyId, jobId);

  if (!canUploadDrawings(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  const maxUploadSizeMb = Math.round(getMaxUploadSizeBytes() / (1024 * 1024));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Subir planos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube uno o varios PDFs isométricos al trabajo {job.name}.
          </p>
        </div>
        <Link href={`/companies/${companyId}/jobs/${jobId}`}>
          <Button variant="outline">Volver al trabajo</Button>
        </Link>
      </div>

      <DrawingUploader
        companyId={companyId}
        jobId={jobId}
        maxUploadSizeMb={maxUploadSizeMb}
      />
    </div>
  );
}
