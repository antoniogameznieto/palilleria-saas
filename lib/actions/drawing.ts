"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import { prisma } from "@/lib/db";
import {
  buildDrawingStoragePath,
  deleteFile,
  PDF_MIME_TYPE,
  sanitizeFileName,
  uploadFile,
} from "@/lib/storage";
import {
  canDeleteDrawings,
  canEditDrawingMetadata,
  canEditDrawingStatus,
  canUploadDrawings,
  requireDrawingAccess,
  requireJobAccess,
} from "@/lib/permissions";
import {
  updateDrawingMetadataSchema,
  updateDrawingStatusSchema,
  validatePdfFiles,
} from "@/lib/validations/drawing";

export async function uploadDrawingsAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const companyId = formData.get("companyId");
  const jobId = formData.get("jobId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    return { error: "Empresa no válida." };
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    return { error: "Trabajo no válido." };
  }

  const { user, membership } = await requireJobAccess(companyId, jobId);

  if (!canUploadDrawings(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const validationError = validatePdfFiles(files);

  if (validationError) {
    return { error: validationError };
  }

  for (const file of files) {
    const originalFileName = file.name;
    const safeFileName = sanitizeFileName(originalFileName);

    const drawing = await prisma.drawing.create({
      data: {
        companyId,
        jobId,
        fileName: safeFileName,
        originalFileName,
        storagePath: "",
        mimeType: PDF_MIME_TYPE,
        status: "uploaded",
        createdById: user.id,
      },
    });

    const storagePath = buildDrawingStoragePath(
      companyId,
      jobId,
      drawing.id,
      originalFileName,
    );

    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadFile({ storagePath, buffer });

    await prisma.drawing.update({
      where: { id: drawing.id },
      data: {
        storagePath,
        fileSize: BigInt(file.size),
        fileName: sanitizeFileName(originalFileName),
      },
    });
  }

  redirect(`/companies/${companyId}/jobs/${jobId}`);
}

export async function deleteDrawingAction(formData: FormData) {
  const companyId = formData.get("companyId");
  const jobId = formData.get("jobId");
  const drawingId = formData.get("drawingId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    redirect("/dashboard");
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    redirect(`/companies/${companyId}/jobs`);
  }

  if (typeof drawingId !== "string" || drawingId.length === 0) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  const { membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canDeleteDrawings(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  if (drawing.storagePath) {
    await deleteFile({ storagePath: drawing.storagePath });
  }

  await prisma.drawing.deleteMany({
    where: {
      id: drawingId,
      companyId,
      jobId,
    },
  });

  redirect(`/companies/${companyId}/jobs/${jobId}`);
}

export async function updateDrawingMetadataAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const companyId = formData.get("companyId");
  const jobId = formData.get("jobId");
  const drawingId = formData.get("drawingId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    return { error: "Empresa no válida." };
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    return { error: "Trabajo no válido." };
  }

  if (typeof drawingId !== "string" || drawingId.length === 0) {
    return { error: "Plano no válido." };
  }

  const { membership } = await requireDrawingAccess(companyId, jobId, drawingId);

  if (!canEditDrawingMetadata(membership.role)) {
    redirect(
      `/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`,
    );
  }

  const parsed = updateDrawingMetadataSchema.safeParse({
    drawingNumber: formData.get("drawingNumber") ?? undefined,
    lineNumber: formData.get("lineNumber") ?? undefined,
    revision: formData.get("revision") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: "Revisa los campos del formulario.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.drawing.updateMany({
    where: {
      id: drawingId,
      companyId,
      jobId,
    },
    data: {
      drawingNumber: parsed.data.drawingNumber,
      lineNumber: parsed.data.lineNumber,
      revision: parsed.data.revision,
    },
  });

  revalidatePath(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
  revalidatePath(`/companies/${companyId}/jobs/${jobId}`);

  return { success: "Metadatos guardados correctamente." };
}

export async function updateDrawingStatusAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const companyId = formData.get("companyId");
  const jobId = formData.get("jobId");
  const drawingId = formData.get("drawingId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    return { error: "Empresa no válida." };
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    return { error: "Trabajo no válido." };
  }

  if (typeof drawingId !== "string" || drawingId.length === 0) {
    return { error: "Plano no válido." };
  }

  const { membership } = await requireDrawingAccess(companyId, jobId, drawingId);

  if (!canEditDrawingStatus(membership.role)) {
    redirect(
      `/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`,
    );
  }

  const parsed = updateDrawingStatusSchema.safeParse({
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      error: "Estado no válido.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.drawing.updateMany({
    where: {
      id: drawingId,
      companyId,
      jobId,
    },
    data: {
      status: parsed.data.status,
    },
  });

  revalidatePath(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
  revalidatePath(`/companies/${companyId}/jobs/${jobId}`);

  return { success: "Estado actualizado correctamente." };
}
