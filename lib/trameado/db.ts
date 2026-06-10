import type { DrawingTrameadoAnnotation } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/db";
import { formatAnnotationSegmentLabel } from "@/lib/trameado/pdf-annotations";

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

export type SerializedTrameadoAnnotation = {
  id: string;
  sheetId: string;
  segmentId: string;
  segmentNumber: string;
  segmentLabel: string;
  palilloLength: string;
  pageNumber: number;
  type: "point" | "rect";
  x: number;
  y: number;
  width?: number;
  height?: number;
  createdAt: string;
};

export type SerializedTrameadoSheet = {
  id: string;
  lineIdentifier: string;
  lineClass: string | null;
  notes: string | null;
  reviewedAt: string | null;
  reviewedByLabel: string | null;
  segments: SerializedTrameadoSegment[];
  annotations: SerializedTrameadoAnnotation[];
  createdAt: string;
  updatedAt: string;
};

function serializeDecimal(value: Decimal): string {
  return value.toString();
}

type AnnotationWithSegment = DrawingTrameadoAnnotation & {
  segment: {
    segmentNumber: string;
    segmentLabel: string | null;
    palilloLength: Decimal;
  };
};

function serializeAnnotation(
  annotation: AnnotationWithSegment,
): SerializedTrameadoAnnotation {
  const segmentSource = {
    id: annotation.segmentId,
    segmentNumber: annotation.segment.segmentNumber,
    segmentLabel: annotation.segment.segmentLabel,
    palilloLength: serializeDecimal(annotation.segment.palilloLength),
  };

  return {
    id: annotation.id,
    sheetId: annotation.sheetId,
    segmentId: annotation.segmentId,
    segmentNumber: segmentSource.segmentNumber,
    segmentLabel: formatAnnotationSegmentLabel(segmentSource),
    palilloLength: segmentSource.palilloLength,
    pageNumber: annotation.pageNumber,
    type: annotation.type,
    x: annotation.x,
    y: annotation.y,
    width: annotation.width ?? undefined,
    height: annotation.height ?? undefined,
    createdAt: annotation.createdAt.toISOString(),
  };
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
      annotations: {
        include: {
          segment: {
            select: {
              segmentNumber: true,
              segmentLabel: true,
              palilloLength: true,
            },
          },
        },
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
    annotations: sheet.annotations.map(serializeAnnotation),
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
