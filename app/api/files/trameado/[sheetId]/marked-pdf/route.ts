import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserCompanyMembership } from "@/lib/permissions";
import { getFile } from "@/lib/storage";
import { formatAnnotationSegmentLabel } from "@/lib/trameado/pdf-annotations";
import {
  buildMarkedTrameadoPdf,
  buildTrameadoMarkedPdfFileName,
} from "@/lib/trameado/export-marked-pdf";

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
      drawing: {
        select: {
          drawingNumber: true,
          storagePath: true,
          mimeType: true,
        },
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
    select: { id: true, storagePath: true },
  });

  if (!drawing || !sheet.drawing.storagePath) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (sheet.annotations.length === 0) {
    return NextResponse.json(
      { error: "Marca al menos un tramo en el isométrico para exportar el PDF marcado." },
      { status: 400 },
    );
  }

  try {
    const pdfBuffer = await getFile({ storagePath: sheet.drawing.storagePath });
    const markedPdf = await buildMarkedTrameadoPdf({
      pdfBuffer,
      sheetLabel: sheet.lineIdentifier,
      annotations: sheet.annotations.map((annotation) => ({
        segmentLabel: formatAnnotationSegmentLabel({
          id: annotation.segmentId,
          segmentNumber: annotation.segment.segmentNumber,
          segmentLabel: annotation.segment.segmentLabel,
          palilloLength: annotation.segment.palilloLength.toString(),
        }),
        pageNumber: annotation.pageNumber,
        type: annotation.type,
        x: annotation.x,
        y: annotation.y,
        width: annotation.width ?? undefined,
        height: annotation.height ?? undefined,
      })),
    });

    const fileName = buildTrameadoMarkedPdfFileName(
      sheet.lineIdentifier,
      sheet.drawing.drawingNumber,
    );

    return new NextResponse(new Uint8Array(markedPdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo generar el PDF marcado." },
      { status: 500 },
    );
  }
}
