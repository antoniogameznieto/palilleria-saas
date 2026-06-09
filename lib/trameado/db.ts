import type { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/db";

export type SerializedTrameadoSegment = {
  id: string;
  sheetId: string;
  segmentNumber: string;
  segmentLabel: string | null;
  diameter: string;
  schedule: string;
  palilloLength: string;
  lengthUnit: string;
  heatNumber: string | null;
  sourcePage: number | null;
  sourceMark: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SerializedTrameadoSheet = {
  id: string;
  lineIdentifier: string;
  lineClass: string | null;
  notes: string | null;
  reviewedAt: string | null;
  reviewedByLabel: string | null;
  segments: SerializedTrameadoSegment[];
  createdAt: string;
  updatedAt: string;
};

function serializeDecimal(value: Decimal): string {
  return value.toString();
}

function formatReviewedByLabel(
  user: { name: string | null; email: string } | null,
): string | null {
  if (!user) {
    return null;
  }

  return user.name ?? user.email;
}

export async function getDrawingTrameadoSheets(
  companyId: string,
  jobId: string,
  drawingId: string,
): Promise<SerializedTrameadoSheet[]> {
  const sheets = await prisma.drawingTrameadoSheet.findMany({
    where: {
      companyId,
      jobId,
      drawingId,
    },
    orderBy: { createdAt: "asc" },
    include: {
      reviewedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      segments: {
        orderBy: [{ sortOrder: "asc" }, { segmentNumber: "asc" }],
      },
    },
  });

  return sheets.map((sheet) => ({
    id: sheet.id,
    lineIdentifier: sheet.lineIdentifier,
    lineClass: sheet.lineClass,
    notes: sheet.notes,
    reviewedAt: sheet.reviewedAt?.toISOString() ?? null,
    reviewedByLabel: formatReviewedByLabel(sheet.reviewedBy),
    createdAt: sheet.createdAt.toISOString(),
    updatedAt: sheet.updatedAt.toISOString(),
    segments: sheet.segments.map((segment) => ({
      id: segment.id,
      sheetId: segment.sheetId,
      segmentNumber: segment.segmentNumber,
      segmentLabel: segment.segmentLabel,
      diameter: segment.diameter,
      schedule: segment.schedule,
      palilloLength: serializeDecimal(segment.palilloLength),
      lengthUnit: segment.lengthUnit,
      heatNumber: segment.heatNumber,
      sourcePage: segment.sourcePage,
      sourceMark: segment.sourceMark,
      notes: segment.notes,
      sortOrder: segment.sortOrder,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
    })),
  }));
}
