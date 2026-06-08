import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserCompanyMembership } from "@/lib/permissions";
import { getFile, PDF_MIME_TYPE } from "@/lib/storage";
import { sanitizeFileName } from "@/lib/storage/paths";

type RouteContext = {
  params: Promise<{
    drawingId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { drawingId } = await context.params;

  const drawing = await prisma.drawing.findUnique({
    where: { id: drawingId },
    select: {
      id: true,
      companyId: true,
      jobId: true,
      storagePath: true,
      originalFileName: true,
      mimeType: true,
    },
  });

  if (!drawing || !drawing.storagePath) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const membership = await getUserCompanyMembership(
    session.user.id,
    drawing.companyId,
  );

  if (!membership) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  const job = await prisma.job.findFirst({
    where: {
      id: drawing.jobId,
      companyId: drawing.companyId,
    },
    select: { id: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  try {
    const fileBuffer = await getFile({ storagePath: drawing.storagePath });
    const fileName = sanitizeFileName(drawing.originalFileName);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": drawing.mimeType ?? PDF_MIME_TYPE,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
