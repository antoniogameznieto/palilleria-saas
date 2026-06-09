import type { CompanyRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireDrawingAccess } from "@/lib/permissions/drawing";

const MANAGE_TRAMEADO_ROLES: CompanyRole[] = ["owner", "admin", "engineer"];

export function canManageTrameado(role: CompanyRole): boolean {
  return MANAGE_TRAMEADO_ROLES.includes(role);
}

export function canViewTrameado(_role: CompanyRole): boolean {
  void _role;
  return true;
}

export async function requireTrameadoSheetAccess(
  companyId: string,
  jobId: string,
  drawingId: string,
  sheetId: string,
) {
  const access = await requireDrawingAccess(companyId, jobId, drawingId);

  const sheet = await prisma.drawingTrameadoSheet.findFirst({
    where: {
      id: sheetId,
      companyId,
      jobId,
      drawingId,
    },
  });

  if (!sheet) {
    return { error: "Hoja de trameado no encontrada." as const };
  }

  return { ...access, sheet };
}

export async function requireTrameadoSegmentAccess(
  companyId: string,
  jobId: string,
  drawingId: string,
  segmentId: string,
) {
  const access = await requireDrawingAccess(companyId, jobId, drawingId);

  const segment = await prisma.drawingTrameadoSegment.findFirst({
    where: {
      id: segmentId,
      companyId,
      jobId,
      drawingId,
    },
    include: {
      sheet: true,
    },
  });

  if (!segment) {
    return { error: "Tramo de trameado no encontrado." as const };
  }

  return { ...access, segment, sheet: segment.sheet };
}
