import { prisma } from "@/lib/db";
import { canExportTrameadoPackage } from "@/lib/trameado/export-package";

export type JobTrameadoWorkflowSummary = {
  sheetCount: number;
  segmentCount: number;
  exportableSheetCount: number;
  drawingIdsWithSheets: string[];
  primaryExportable: {
    sheetId: string;
    drawingId: string;
    lineIdentifier: string;
    segmentCount: number;
  } | null;
  primarySheet: {
    sheetId: string;
    drawingId: string;
    lineIdentifier: string;
  } | null;
};

export async function getJobTrameadoWorkflowSummary(
  companyId: string,
  jobId: string,
): Promise<JobTrameadoWorkflowSummary> {
  const sheets = await prisma.drawingTrameadoSheet.findMany({
    where: {
      companyId,
      jobId,
    },
    select: {
      id: true,
      drawingId: true,
      lineIdentifier: true,
      _count: {
        select: {
          segments: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const exportableSheets = sheets.filter((sheet) =>
    canExportTrameadoPackage(sheet._count.segments),
  );

  const primaryExportable = exportableSheets[0];
  const primarySheet = sheets[0];

  return {
    sheetCount: sheets.length,
    segmentCount: sheets.reduce(
      (total, sheet) => total + sheet._count.segments,
      0,
    ),
    exportableSheetCount: exportableSheets.length,
    drawingIdsWithSheets: [...new Set(sheets.map((sheet) => sheet.drawingId))],
    primaryExportable: primaryExportable
      ? {
          sheetId: primaryExportable.id,
          drawingId: primaryExportable.drawingId,
          lineIdentifier: primaryExportable.lineIdentifier,
          segmentCount: primaryExportable._count.segments,
        }
      : null,
    primarySheet: primarySheet
      ? {
          sheetId: primarySheet.id,
          drawingId: primarySheet.drawingId,
          lineIdentifier: primarySheet.lineIdentifier,
        }
      : null,
  };
}
