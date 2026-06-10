import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserCompanyMembership } from "@/lib/permissions";
import { getFile } from "@/lib/storage";
import {
  buildTrameadoDeliveryPackage,
  buildTrameadoPackageFileName,
} from "@/lib/trameado/export-package";
import { buildMarkedTrameadoPdf } from "@/lib/trameado/export-marked-pdf";
import { buildTrameadoXlsxBuffer } from "@/lib/trameado/export-xlsx";
import { formatAnnotationSegmentLabel } from "@/lib/trameado/pdf-annotations";
import { validateTrameadoSheet } from "@/lib/trameado/sheet-validation";

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
          storagePath: true,
        },
      },
      segments: {
        orderBy: [{ sortOrder: "asc" }, { segmentNumber: "asc" }],
        select: {
          id: true,
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

  if (sheet.segments.length === 0) {
    return NextResponse.json(
      { error: "No hay tramos para exportar en esta hoja." },
      { status: 400 },
    );
  }

  const takeoffItems = await prisma.drawingTakeoffItem.findMany({
    where: {
      companyId: sheet.companyId,
      jobId: sheet.jobId,
      drawingId: sheet.drawingId,
    },
    select: {
      description: true,
      reference: true,
      quantity: true,
      unit: true,
    },
  });

  try {
    const xlsxBuffer = await buildTrameadoXlsxBuffer({
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

    const includesMarkedPdf = sheet.annotations.length > 0;
    let markedPdfBuffer: Buffer | null = null;

    if (includesMarkedPdf) {
      const pdfBuffer = await getFile({ storagePath: sheet.drawing.storagePath });
      markedPdfBuffer = await buildMarkedTrameadoPdf({
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
    }

    const validation = validateTrameadoSheet({
      hasActiveSheet: true,
      segments: sheet.segments.map((segment) => ({
        segmentNumber: segment.segmentNumber,
        palilloLength: segment.palilloLength.toString(),
        lengthUnit: segment.lengthUnit,
      })),
      takeoffItems: takeoffItems.map((item) => ({
        description: item.description,
        reference: item.reference,
        quantity: item.quantity.toString(),
        unit: item.unit,
      })),
    });

    const markedSegmentIds = new Set(
      sheet.annotations.map((annotation) => annotation.segmentId),
    );

    const zipBuffer = await buildTrameadoDeliveryPackage({
      xlsxBuffer,
      markedPdfBuffer,
      summary: {
        generatedAt: new Date(),
        sheetLineIdentifier: sheet.lineIdentifier,
        drawingNumber: sheet.drawing.drawingNumber,
        validation,
        markedCount: markedSegmentIds.size,
        totalSegmentCount: sheet.segments.length,
        includesMarkedPdf,
      },
    });

    const fileName = buildTrameadoPackageFileName(
      sheet.lineIdentifier,
      sheet.drawing.drawingNumber,
    );

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo generar el paquete de trameado." },
      { status: 500 },
    );
  }
}
