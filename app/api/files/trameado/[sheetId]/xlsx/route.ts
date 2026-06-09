import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserCompanyMembership } from "@/lib/permissions";
import {
  buildTrameadoXlsxBuffer,
  buildTrameadoXlsxFileName,
  TRAMEADO_XLSX_CONTENT_TYPE,
} from "@/lib/trameado/export-xlsx";

type RouteContext = {
  params: Promise<{
    sheetId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { sheetId } = await context.params;

  const sheet = await prisma.drawingTrameadoSheet.findUnique({
    where: { id: sheetId },
    select: {
      id: true,
      companyId: true,
      jobId: true,
      drawingId: true,
      lineIdentifier: true,
      lineClass: true,
      drawing: {
        select: {
          drawingNumber: true,
        },
      },
      segments: {
        orderBy: [{ sortOrder: "asc" }, { segmentNumber: "asc" }],
        select: {
          segmentNumber: true,
          segmentLabel: true,
          diameter: true,
          schedule: true,
          palilloLength: true,
          lengthUnit: true,
          heatNumber: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!sheet) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const membership = await getUserCompanyMembership(
    session.user.id,
    sheet.companyId,
  );

  if (!membership) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  const job = await prisma.job.findFirst({
    where: {
      id: sheet.jobId,
      companyId: sheet.companyId,
    },
    select: { id: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  const drawing = await prisma.drawing.findFirst({
    where: {
      id: sheet.drawingId,
      companyId: sheet.companyId,
      jobId: sheet.jobId,
    },
    select: { id: true },
  });

  if (!drawing) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  if (sheet.segments.length === 0) {
    return NextResponse.json(
      { error: "No hay tramos para exportar en esta hoja." },
      { status: 400 },
    );
  }

  const buffer = await buildTrameadoXlsxBuffer({
    lineIdentifier: sheet.lineIdentifier,
    lineClass: sheet.lineClass,
    segments: sheet.segments.map((segment) => ({
      segmentNumber: segment.segmentNumber,
      segmentLabel: segment.segmentLabel,
      diameter: segment.diameter,
      schedule: segment.schedule,
      palilloLength: segment.palilloLength.toString(),
      lengthUnit: segment.lengthUnit,
      heatNumber: segment.heatNumber,
      sortOrder: segment.sortOrder,
    })),
  });

  const fileName = buildTrameadoXlsxFileName(
    sheet.lineIdentifier,
    sheet.drawing.drawingNumber,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": TRAMEADO_XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
