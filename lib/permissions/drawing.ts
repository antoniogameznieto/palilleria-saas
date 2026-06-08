import type { CompanyRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";

import { requireCompanyMember } from "@/lib/permissions/company";

const UPLOAD_DRAWING_ROLES: CompanyRole[] = ["owner", "admin", "engineer"];
const EDIT_DRAWING_METADATA_ROLES: CompanyRole[] = ["owner", "admin", "engineer"];
const EDIT_DRAWING_STATUS_ROLES: CompanyRole[] = ["owner", "admin", "engineer"];
const START_DRAWING_DETECTION_ROLES: CompanyRole[] = ["owner", "admin", "engineer"];
const DELETE_DRAWING_ROLES: CompanyRole[] = ["owner", "admin"];

export function canUploadDrawings(role: CompanyRole): boolean {
  return UPLOAD_DRAWING_ROLES.includes(role);
}

export function canEditDrawingMetadata(role: CompanyRole): boolean {
  return EDIT_DRAWING_METADATA_ROLES.includes(role);
}

export function canEditDrawingStatus(role: CompanyRole): boolean {
  return EDIT_DRAWING_STATUS_ROLES.includes(role);
}

export function canStartDrawingDetection(role: CompanyRole): boolean {
  return START_DRAWING_DETECTION_ROLES.includes(role);
}

export function canDeleteDrawings(role: CompanyRole): boolean {
  return DELETE_DRAWING_ROLES.includes(role);
}

export async function getDrawingForUser(
  companyId: string,
  jobId: string,
  drawingId: string,
) {
  const { user, membership } = await requireCompanyMember(companyId);

  const drawing = await prisma.drawing.findFirst({
    where: {
      id: drawingId,
      companyId,
      jobId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!drawing) {
    return null;
  }

  return { user, membership, drawing };
}

export async function requireDrawingAccess(
  companyId: string,
  jobId: string,
  drawingId: string,
) {
  const result = await getDrawingForUser(companyId, jobId, drawingId);

  if (!result) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  return result;
}

export async function getJobDrawings(companyId: string, jobId: string) {
  await requireCompanyMember(companyId);

  return prisma.drawing.findMany({
    where: {
      companyId,
      jobId,
    },
    orderBy: { createdAt: "desc" },
  });
}
