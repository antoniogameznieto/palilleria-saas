import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDrawingProgress } from "@/lib/drawings/drawing-progress";
import {
  buildJobTakeoffExcelBuffer,
  buildJobTakeoffExcelFileName,
} from "@/lib/drawings/job-takeoff-excel";
import { getJobTakeoffExportItems } from "@/lib/drawings/job-takeoff-export";
import { prisma } from "@/lib/db";
import { getUserCompanyMembership } from "@/lib/permissions";

type RouteContext = {
  params: Promise<{
    companyId: string;
    jobId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { companyId, jobId } = await context.params;

  const membership = await getUserCompanyMembership(session.user.id, companyId);

  if (!membership) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      companyId,
    },
    select: {
      id: true,
      name: true,
      projectCode: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const [items, drawings] = await Promise.all([
    getJobTakeoffExportItems(companyId, jobId),
    prisma.drawing.findMany({
      where: {
        companyId,
        jobId,
      },
      select: {
        id: true,
        status: true,
        drawingNumber: true,
        lineNumber: true,
        revision: true,
        takeoffReviewedAt: true,
        _count: {
          select: {
            takeoffItems: true,
          },
        },
      },
    }),
  ]);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "No hay líneas de palillería para exportar." },
      { status: 400 },
    );
  }

  const exportedAt = new Date();
  const drawingProgressByDrawingId = Object.fromEntries(
    drawings.map((drawing) => [
      drawing.id,
      getDrawingProgress({
        status: drawing.status,
        drawingNumber: drawing.drawingNumber,
        lineNumber: drawing.lineNumber,
        revision: drawing.revision,
        takeoffLineCount: drawing._count.takeoffItems,
        takeoffReviewedAt: drawing.takeoffReviewedAt,
      }),
    ]),
  );

  const buffer = await buildJobTakeoffExcelBuffer({
    companyName: membership.company.name,
    jobName: job.name,
    projectCode: job.projectCode,
    exportedAt,
    items,
    drawingProgressByDrawingId,
  });

  const fileName = buildJobTakeoffExcelFileName(
    job.projectCode,
    job.name,
    job.id,
    exportedAt,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
