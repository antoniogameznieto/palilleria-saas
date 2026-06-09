"use server";

import type { LengthUnit, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AuthActionState } from "@/lib/actions/auth";
import { prisma } from "@/lib/db";
import {
  canManageTrameado,
  requireTrameadoSegmentAccess,
  requireTrameadoSheetAccess,
} from "@/lib/permissions/trameado";
import { requireDrawingAccess } from "@/lib/permissions";
import {
  parseDrawingScopeFormData,
  parseTrameadoSegmentScopeFormData,
  parseTrameadoSheetScopeFormData,
} from "@/lib/trameado/scope";
import {
  trameadoSegmentFormSchema,
  trameadoSegmentUpdateSchema,
  trameadoSheetFormSchema,
  trameadoSheetUpdateSchema,
} from "@/lib/validations/trameado";

const suggestedTrameadoSheetsPayloadSchema = z.object({
  suggestions: z
    .array(
      z.object({
        lineIdentifier: z.string().trim().min(1),
        lineClass: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .min(1, "Selecciona al menos una hoja sugerida."),
});

function revalidateDrawingPage(
  companyId: string,
  jobId: string,
  drawingId: string,
) {
  revalidatePath(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
  revalidatePath(`/companies/${companyId}/jobs/${jobId}`);
}

type TrameadoDbClient = Prisma.TransactionClient | typeof prisma;

async function clearTrameadoSheetReview(
  db: TrameadoDbClient,
  sheetId: string,
  companyId: string,
  jobId: string,
  drawingId: string,
) {
  await db.drawingTrameadoSheet.updateMany({
    where: {
      id: sheetId,
      companyId,
      jobId,
      drawingId,
      reviewedAt: { not: null },
    },
    data: {
      reviewedAt: null,
      reviewedById: null,
    },
  });
}

async function resolveNextSegmentSortOrder(sheetId: string): Promise<number> {
  const lastSegment = await prisma.drawingTrameadoSegment.findFirst({
    where: { sheetId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return (lastSegment?.sortOrder ?? 0) + 1;
}

function parseSheetFormData(formData: FormData) {
  return trameadoSheetFormSchema.safeParse({
    lineIdentifier: formData.get("lineIdentifier") ?? undefined,
    lineClass: formData.get("lineClass") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
}

function parseSheetUpdateFormData(formData: FormData) {
  return trameadoSheetUpdateSchema.safeParse({
    lineIdentifier: formData.get("lineIdentifier") ?? undefined,
    lineClass: formData.get("lineClass") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
}

function parseSegmentFormData(formData: FormData) {
  return trameadoSegmentFormSchema.safeParse({
    segmentNumber: formData.get("segmentNumber") ?? undefined,
    segmentLabel: formData.get("segmentLabel") ?? undefined,
    diameter: formData.get("diameter") ?? undefined,
    schedule: formData.get("schedule") ?? undefined,
    palilloLength: formData.get("palilloLength") ?? undefined,
    lengthUnit: formData.get("lengthUnit") ?? undefined,
    heatNumber: formData.get("heatNumber") ?? undefined,
    sourcePage: formData.get("sourcePage") ?? undefined,
    sourceMark: formData.get("sourceMark") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    sortOrder: formData.get("sortOrder") ?? undefined,
  });
}

function parseSegmentUpdateFormData(formData: FormData) {
  return trameadoSegmentUpdateSchema.safeParse({
    segmentNumber: formData.get("segmentNumber") ?? undefined,
    segmentLabel: formData.get("segmentLabel") ?? undefined,
    diameter: formData.get("diameter") ?? undefined,
    schedule: formData.get("schedule") ?? undefined,
    palilloLength: formData.get("palilloLength") ?? undefined,
    lengthUnit: formData.get("lengthUnit") ?? undefined,
    heatNumber: formData.get("heatNumber") ?? undefined,
    sourcePage: formData.get("sourcePage") ?? undefined,
    sourceMark: formData.get("sourceMark") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    sortOrder: formData.get("sortOrder") ?? undefined,
  });
}

function toSegmentCreateData(
  parsed: ReturnType<typeof trameadoSegmentFormSchema.parse>,
  sortOrder: number,
) {
  return {
    segmentNumber: parsed.segmentNumber,
    segmentLabel: parsed.segmentLabel,
    diameter: parsed.diameter,
    schedule: parsed.schedule,
    palilloLength: parsed.palilloLength,
    lengthUnit: parsed.lengthUnit as LengthUnit,
    heatNumber: parsed.heatNumber,
    sourcePage: parsed.sourcePage,
    sourceMark: parsed.sourceMark,
    notes: parsed.notes,
    sortOrder,
  };
}

export async function createTrameadoSheetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId } = scope;
  const { membership } = await requireDrawingAccess(companyId, jobId, drawingId);

  if (!canManageTrameado(membership.role)) {
    return { error: "No tienes permiso para gestionar el trameado." };
  }

  const parsed = parseSheetFormData(formData);

  if (!parsed.success) {
    return {
      error: "Revisa los campos del formulario.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const sheet = await prisma.drawingTrameadoSheet.create({
    data: {
      companyId,
      jobId,
      drawingId,
      ...parsed.data,
    },
  });

  revalidateDrawingPage(companyId, jobId, drawingId);
  return {
    success: "Hoja de trameado creada.",
    trameadoSheetId: sheet.id,
  };
}

export async function updateTrameadoSheetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseTrameadoSheetScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId, sheetId } = scope;
  const access = await requireTrameadoSheetAccess(
    companyId,
    jobId,
    drawingId,
    sheetId,
  );

  if ("error" in access) {
    return { error: access.error };
  }

  if (!canManageTrameado(access.membership.role)) {
    return { error: "No tienes permiso para gestionar el trameado." };
  }

  const parsed = parseSheetUpdateFormData(formData);

  if (!parsed.success) {
    return {
      error: "Revisa los campos del formulario.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.drawingTrameadoSheet.update({
    where: { id: sheetId },
    data: parsed.data,
  });

  revalidateDrawingPage(companyId, jobId, drawingId);
  return { success: "Hoja de trameado actualizada." };
}

export async function deleteTrameadoSheetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseTrameadoSheetScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId, sheetId } = scope;
  const access = await requireTrameadoSheetAccess(
    companyId,
    jobId,
    drawingId,
    sheetId,
  );

  if ("error" in access) {
    return { error: access.error };
  }

  if (!canManageTrameado(access.membership.role)) {
    return { error: "No tienes permiso para gestionar el trameado." };
  }

  await prisma.drawingTrameadoSheet.delete({
    where: { id: sheetId },
  });

  revalidateDrawingPage(companyId, jobId, drawingId);
  return { success: "Hoja de trameado eliminada." };
}

export async function createTrameadoSegmentAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseTrameadoSheetScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId, sheetId } = scope;
  const access = await requireTrameadoSheetAccess(
    companyId,
    jobId,
    drawingId,
    sheetId,
  );

  if ("error" in access) {
    return { error: access.error };
  }

  if (!canManageTrameado(access.membership.role)) {
    return { error: "No tienes permiso para gestionar el trameado." };
  }

  const parsed = parseSegmentFormData(formData);

  if (!parsed.success) {
    return {
      error: "Revisa los campos del formulario.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const sortOrder =
    parsed.data.sortOrder ?? (await resolveNextSegmentSortOrder(sheetId));

  await prisma.$transaction(async (tx) => {
    await tx.drawingTrameadoSegment.create({
      data: {
        companyId,
        jobId,
        drawingId,
        sheetId,
        ...toSegmentCreateData(parsed.data, sortOrder),
      },
    });

    await clearTrameadoSheetReview(
      tx,
      sheetId,
      companyId,
      jobId,
      drawingId,
    );
  });

  revalidateDrawingPage(companyId, jobId, drawingId);
  return { success: "Tramo de trameado añadido." };
}

export async function updateTrameadoSegmentAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseTrameadoSegmentScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId, segmentId } = scope;
  const access = await requireTrameadoSegmentAccess(
    companyId,
    jobId,
    drawingId,
    segmentId,
  );

  if ("error" in access) {
    return { error: access.error };
  }

  if (!canManageTrameado(access.membership.role)) {
    return { error: "No tienes permiso para gestionar el trameado." };
  }

  const parsed = parseSegmentUpdateFormData(formData);

  if (!parsed.success) {
    return {
      error: "Revisa los campos del formulario.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { lengthUnit, palilloLength, sortOrder, ...rest } = parsed.data;

  const updateData = {
    ...rest,
    ...(palilloLength !== undefined ? { palilloLength } : {}),
    ...(lengthUnit !== undefined ? { lengthUnit: lengthUnit as LengthUnit } : {}),
    ...(sortOrder !== undefined && sortOrder !== null ? { sortOrder } : {}),
  };

  await prisma.$transaction(async (tx) => {
    await tx.drawingTrameadoSegment.update({
      where: { id: segmentId },
      data: updateData,
    });

    await clearTrameadoSheetReview(
      tx,
      access.segment.sheetId,
      companyId,
      jobId,
      drawingId,
    );
  });

  revalidateDrawingPage(companyId, jobId, drawingId);
  return { success: "Tramo de trameado actualizado." };
}

export async function deleteTrameadoSegmentAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseTrameadoSegmentScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId, segmentId } = scope;
  const access = await requireTrameadoSegmentAccess(
    companyId,
    jobId,
    drawingId,
    segmentId,
  );

  if ("error" in access) {
    return { error: access.error };
  }

  if (!canManageTrameado(access.membership.role)) {
    return { error: "No tienes permiso para gestionar el trameado." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.drawingTrameadoSegment.delete({
      where: { id: segmentId },
    });

    await clearTrameadoSheetReview(
      tx,
      access.segment.sheetId,
      companyId,
      jobId,
      drawingId,
    );
  });

  revalidateDrawingPage(companyId, jobId, drawingId);
  return { success: "Tramo de trameado eliminado." };
}

export async function markTrameadoSheetReviewedAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseTrameadoSheetScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId, sheetId } = scope;
  const access = await requireTrameadoSheetAccess(
    companyId,
    jobId,
    drawingId,
    sheetId,
  );

  if ("error" in access) {
    return { error: access.error };
  }

  if (!canManageTrameado(access.membership.role)) {
    return { error: "No tienes permiso para gestionar el trameado." };
  }

  const segmentCount = await prisma.drawingTrameadoSegment.count({
    where: { sheetId },
  });

  if (segmentCount === 0) {
    return {
      error: "Añade al menos un tramo antes de marcar la hoja como revisada.",
    };
  }

  await prisma.drawingTrameadoSheet.update({
    where: { id: sheetId },
    data: {
      reviewedAt: new Date(),
      reviewedById: access.user.id,
    },
  });

  revalidateDrawingPage(companyId, jobId, drawingId);
  return { success: "Hoja de trameado marcada como revisada." };
}

export async function createSuggestedTrameadoSheetsAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId } = scope;
  const { membership } = await requireDrawingAccess(companyId, jobId, drawingId);

  if (!canManageTrameado(membership.role)) {
    return { error: "No tienes permiso para gestionar el trameado." };
  }

  const rawPayload = formData.get("suggestionsPayload");

  if (typeof rawPayload !== "string" || rawPayload.trim().length === 0) {
    return { error: "No se recibieron hojas sugeridas para crear." };
  }

  let parsedPayload: z.infer<typeof suggestedTrameadoSheetsPayloadSchema>;

  try {
    parsedPayload = suggestedTrameadoSheetsPayloadSchema.parse(
      JSON.parse(rawPayload),
    );
  } catch {
    return { error: "Las hojas sugeridas no tienen un formato válido." };
  }

  const existingSheets = await prisma.drawingTrameadoSheet.findMany({
    where: {
      companyId,
      jobId,
      drawingId,
    },
    select: {
      lineIdentifier: true,
    },
  });

  const existingIdentifiers = new Set(
    existingSheets.map((sheet) => sheet.lineIdentifier.trim().toLowerCase()),
  );

  const createdSheetIds: string[] = [];
  const skippedExisting: string[] = [];
  const errors: string[] = [];

  for (const suggestion of parsedPayload.suggestions) {
    const normalizedIdentifier = suggestion.lineIdentifier.trim().toLowerCase();

    if (existingIdentifiers.has(normalizedIdentifier)) {
      skippedExisting.push(suggestion.lineIdentifier);
      continue;
    }

    const parsedSheet = trameadoSheetFormSchema.safeParse({
      lineIdentifier: suggestion.lineIdentifier,
      lineClass: suggestion.lineClass ?? undefined,
      notes: suggestion.notes ?? undefined,
    });

    if (!parsedSheet.success) {
      errors.push(
        `${suggestion.lineIdentifier}: ${parsedSheet.error.issues[0]?.message ?? "datos inválidos"}`,
      );
      continue;
    }

    const sheet = await prisma.drawingTrameadoSheet.create({
      data: {
        companyId,
        jobId,
        drawingId,
        lineIdentifier: parsedSheet.data.lineIdentifier,
        lineClass: parsedSheet.data.lineClass,
        notes: parsedSheet.data.notes,
      },
    });

    existingIdentifiers.add(normalizedIdentifier);
    createdSheetIds.push(sheet.id);
  }

  revalidateDrawingPage(companyId, jobId, drawingId);

  if (createdSheetIds.length === 0) {
    if (skippedExisting.length > 0 && errors.length === 0) {
      return {
        error: "Las hojas seleccionadas ya existen para este plano.",
      };
    }

    return {
      error:
        errors[0] ??
        "No se pudo crear ninguna hoja sugerida. Revisa la selección.",
    };
  }

  const summaryParts = [`${createdSheetIds.length} hoja(s) creada(s).`];

  if (skippedExisting.length > 0) {
    summaryParts.push(`${skippedExisting.length} ya existían.`);
  }

  return {
    success: summaryParts.join(" "),
    trameadoSheetIds: createdSheetIds,
    trameadoSheetId: createdSheetIds[0],
  };
}
