"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import {
  buildTakeoffItemCreatedActivityMessage,
  buildTakeoffItemDeletedActivityMessage,
  buildTakeoffItemDuplicatedActivityMessage,
  buildTakeoffItemUpdatedActivityMessage,
  recordDrawingActivity,
} from "@/lib/drawings/activity";
import { takeoffItemsEqual } from "@/lib/drawings/takeoff";
import { prisma } from "@/lib/db";
import { canManageTakeoffItems, requireDrawingAccess } from "@/lib/permissions";
import { takeoffItemFormSchema } from "@/lib/validations/takeoff";

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

function parseTakeoffItemScopeFormData(formData: FormData):
  | { error: string }
  | {
      companyId: string;
      jobId: string;
      drawingId: string;
      takeoffItemId: string;
    } {
  const companyId = formData.get("companyId");
  const jobId = formData.get("jobId");
  const drawingId = formData.get("drawingId");
  const takeoffItemId = formData.get("takeoffItemId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    return { error: "Empresa no válida." };
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    return { error: "Trabajo no válido." };
  }

  if (typeof drawingId !== "string" || drawingId.length === 0) {
    return { error: "Plano no válido." };
  }

  if (typeof takeoffItemId !== "string" || takeoffItemId.length === 0) {
    return { error: "Línea de palillería no válida." };
  }

  return { companyId, jobId, drawingId, takeoffItemId };
}

function revalidateDrawingPage(
  companyId: string,
  jobId: string,
  drawingId: string,
) {
  revalidatePath(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
}

function parseTakeoffItemFormData(formData: FormData) {
  return takeoffItemFormSchema.safeParse({
    reference: formData.get("reference") ?? undefined,
    description: formData.get("description") ?? undefined,
    quantity: formData.get("quantity") ?? undefined,
    unit: formData.get("unit") ?? undefined,
    length: formData.get("length") ?? undefined,
    width: formData.get("width") ?? undefined,
    height: formData.get("height") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
}

function toTakeoffItemData(parsed: ReturnType<typeof takeoffItemFormSchema.parse>) {
  return {
    reference: parsed.reference,
    description: parsed.description,
    quantity: parsed.quantity,
    unit: parsed.unit,
    length: parsed.length,
    width: parsed.width,
    height: parsed.height,
    notes: parsed.notes,
  };
}

export async function createTakeoffItemAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId } = scope;
  const { user, membership } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canManageTakeoffItems(membership.role)) {
    redirect(
      `/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`,
    );
  }

  const parsed = parseTakeoffItemFormData(formData);

  if (!parsed.success) {
    return {
      error: "Revisa los campos del formulario.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const item = await prisma.drawingTakeoffItem.create({
    data: {
      companyId,
      jobId,
      drawingId,
      createdById: user.id,
      ...toTakeoffItemData(parsed.data),
    },
  });

  await recordDrawingActivity({
    drawingId,
    companyId,
    jobId,
    actorUserId: user.id,
    type: "takeoff_item_created",
    message: buildTakeoffItemCreatedActivityMessage(item.description),
    metadata: {
      takeoffItemId: item.id,
      reference: item.reference,
    },
  });

  revalidateDrawingPage(companyId, jobId, drawingId);

  return { success: "Línea de palillería añadida correctamente." };
}

export async function updateTakeoffItemAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseTakeoffItemScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId, takeoffItemId } = scope;
  const { user, membership } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canManageTakeoffItems(membership.role)) {
    redirect(
      `/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`,
    );
  }

  const existing = await prisma.drawingTakeoffItem.findFirst({
    where: {
      id: takeoffItemId,
      companyId,
      jobId,
      drawingId,
    },
  });

  if (!existing) {
    return { error: "Línea de palillería no encontrada." };
  }

  const parsed = parseTakeoffItemFormData(formData);

  if (!parsed.success) {
    return {
      error: "Revisa los campos del formulario.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const nextValues = {
    reference: parsed.data.reference,
    description: parsed.data.description,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    length: parsed.data.length,
    width: parsed.data.width,
    height: parsed.data.height,
    notes: parsed.data.notes,
  };

  const currentValues = {
    reference: existing.reference,
    description: existing.description,
    quantity: existing.quantity.toString(),
    unit: existing.unit,
    length: existing.length?.toString() ?? null,
    width: existing.width?.toString() ?? null,
    height: existing.height?.toString() ?? null,
    notes: existing.notes,
  };

  if (takeoffItemsEqual(currentValues, nextValues)) {
    return { success: "La línea de palillería no ha cambiado." };
  }

  const updated = await prisma.drawingTakeoffItem.updateMany({
    where: {
      id: takeoffItemId,
      companyId,
      jobId,
      drawingId,
    },
    data: toTakeoffItemData(parsed.data),
  });

  if (updated.count === 0) {
    return { error: "No se pudo actualizar la línea de palillería." };
  }

  await recordDrawingActivity({
    drawingId,
    companyId,
    jobId,
    actorUserId: user.id,
    type: "takeoff_item_updated",
    message: buildTakeoffItemUpdatedActivityMessage(parsed.data.description),
    metadata: {
      takeoffItemId,
      reference: parsed.data.reference,
    },
  });

  revalidateDrawingPage(companyId, jobId, drawingId);

  return { success: "Línea de palillería actualizada correctamente." };
}

export async function deleteTakeoffItemAction(
  formData: FormData,
): Promise<void> {
  const scope = parseTakeoffItemScopeFormData(formData);

  if ("error" in scope) {
    redirect("/dashboard");
  }

  const { companyId, jobId, drawingId, takeoffItemId } = scope;
  const { user, membership } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canManageTakeoffItems(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
  }

  const existing = await prisma.drawingTakeoffItem.findFirst({
    where: {
      id: takeoffItemId,
      companyId,
      jobId,
      drawingId,
    },
  });

  if (!existing) {
    redirect(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
  }

  const deleted = await prisma.drawingTakeoffItem.deleteMany({
    where: {
      id: takeoffItemId,
      companyId,
      jobId,
      drawingId,
    },
  });

  if (deleted.count > 0) {
    await recordDrawingActivity({
      drawingId,
      companyId,
      jobId,
      actorUserId: user.id,
      type: "takeoff_item_deleted",
      message: buildTakeoffItemDeletedActivityMessage(existing.description),
      metadata: {
        takeoffItemId,
        reference: existing.reference,
      },
    });
  }

  revalidateDrawingPage(companyId, jobId, drawingId);

  redirect(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
}

export async function duplicateTakeoffItemAction(
  formData: FormData,
): Promise<void> {
  const scope = parseTakeoffItemScopeFormData(formData);

  if ("error" in scope) {
    redirect("/dashboard");
  }

  const { companyId, jobId, drawingId, takeoffItemId } = scope;
  const { user, membership } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canManageTakeoffItems(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
  }

  const existing = await prisma.drawingTakeoffItem.findFirst({
    where: {
      id: takeoffItemId,
      companyId,
      jobId,
      drawingId,
    },
  });

  if (!existing) {
    redirect(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
  }

  const duplicated = await prisma.drawingTakeoffItem.create({
    data: {
      companyId,
      jobId,
      drawingId,
      createdById: user.id,
      reference: existing.reference,
      description: existing.description,
      quantity: existing.quantity,
      unit: existing.unit,
      length: existing.length,
      width: existing.width,
      height: existing.height,
      notes: existing.notes,
    },
  });

  await recordDrawingActivity({
    drawingId,
    companyId,
    jobId,
    actorUserId: user.id,
    type: "takeoff_item_duplicated",
    message: buildTakeoffItemDuplicatedActivityMessage(),
    metadata: {
      originalItemId: takeoffItemId,
      duplicatedItemId: duplicated.id,
      reference: existing.reference,
      description: existing.description,
    },
  });

  revalidateDrawingPage(companyId, jobId, drawingId);

  redirect(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
}
