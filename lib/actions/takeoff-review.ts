"use server";

import { revalidatePath } from "next/cache";

import type { AuthActionState } from "@/lib/actions/auth";
import {
  buildTakeoffReviewedActivityMessage,
} from "@/lib/drawings/activity";
import { invalidateDrawingTakeoffReviewInTransaction } from "@/lib/drawings/takeoff-review";
import { prisma } from "@/lib/db";
import { canManageTakeoffItems, requireDrawingAccess } from "@/lib/permissions";

function parseDrawingScopeFormData(formData: FormData) {
  const companyId = formData.get("companyId");
  const jobId = formData.get("jobId");
  const drawingId = formData.get("drawingId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    return { error: "Empresa no válida." as const };
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    return { error: "Trabajo no válido." as const };
  }

  if (typeof drawingId !== "string" || drawingId.length === 0) {
    return { error: "Plano no válido." as const };
  }

  return { companyId, jobId, drawingId };
}

function revalidateDrawingAndJobPages(
  companyId: string,
  jobId: string,
  drawingId: string,
) {
  revalidatePath(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
  revalidatePath(`/companies/${companyId}/jobs/${jobId}`);
}

export async function confirmDrawingTakeoffReviewedAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId } = scope;
  const { user, membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canManageTakeoffItems(membership.role)) {
    return { error: "No tienes permiso para marcar la palillería como revisada." };
  }

  if (drawing.takeoffReviewedAt) {
    return { error: "La palillería de este plano ya está marcada como revisada." };
  }

  const takeoffLineCount = await prisma.drawingTakeoffItem.count({
    where: {
      companyId,
      jobId,
      drawingId,
    },
  });

  if (takeoffLineCount === 0) {
    return {
      error:
        "No se puede marcar como revisada: el plano no tiene líneas de palillería.",
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.drawing.updateMany({
      where: {
        id: drawingId,
        companyId,
        jobId,
        takeoffReviewedAt: null,
      },
      data: {
        takeoffReviewedAt: new Date(),
        takeoffReviewedById: user.id,
      },
    });

    if (result.count === 0) {
      return result;
    }

    await tx.drawingActivity.create({
      data: {
        drawingId,
        companyId,
        jobId,
        actorUserId: user.id,
        type: "takeoff_reviewed",
        message: buildTakeoffReviewedActivityMessage(),
        metadata: {
          takeoffLineCount,
        },
      },
    });

    return result;
  });

  if (updated.count === 0) {
    return {
      error: "No se pudo marcar la palillería como revisada. Inténtalo de nuevo.",
    };
  }

  revalidateDrawingAndJobPages(companyId, jobId, drawingId);

  return { success: "Palillería marcada como revisada correctamente." };
}

export async function resetDrawingTakeoffReviewAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId } = scope;
  const { user, membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canManageTakeoffItems(membership.role)) {
    return { error: "No tienes permiso para desmarcar la revisión de palillería." };
  }

  if (!drawing.takeoffReviewedAt) {
    return { error: "La palillería de este plano no está marcada como revisada." };
  }

  const reset = await prisma.$transaction(async (tx) =>
    invalidateDrawingTakeoffReviewInTransaction(tx, {
      drawingId,
      companyId,
      jobId,
      actorUserId: user.id,
      reason: "manual",
    }),
  );

  if (!reset) {
    return {
      error: "No se pudo desmarcar la revisión de palillería. Inténtalo de nuevo.",
    };
  }

  revalidateDrawingAndJobPages(companyId, jobId, drawingId);

  return { success: "Revisión de palillería desmarcada correctamente." };
}
