import type { DrawingStatus } from "@prisma/client";

import { DrawingsTable } from "@/components/drawings/drawings-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildJobDrawingStatusSummary,
  formatJobDrawingStatusSubtitle,
} from "@/lib/drawings/drawing-status-summary";

type JobDrawingRow = {
  id: string;
  fileName: string;
  originalFileName: string;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  status: DrawingStatus;
  createdAt: string;
  takeoffLineCount: number;
  takeoffReviewedAt: string | null;
};

type JobDrawingsSectionProps = {
  companyId: string;
  jobId: string;
  drawings: JobDrawingRow[];
  canDelete: boolean;
};

export function JobDrawingsSection({
  companyId,
  jobId,
  drawings,
  canDelete,
}: JobDrawingsSectionProps) {
  const statusSummary = buildJobDrawingStatusSummary(drawings);
  const drawingLabel =
    statusSummary.total === 1 ? "1 plano" : `${statusSummary.total} planos`;

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle>{drawingLabel}</CardTitle>
        <CardDescription>
          {formatJobDrawingStatusSubtitle(statusSummary)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <DrawingsTable
          companyId={companyId}
          jobId={jobId}
          drawings={drawings}
          canDelete={canDelete}
        />
      </CardContent>
    </Card>
  );
}
