"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import { detectDrawingMetadataPlaceholder } from "@/lib/drawings/detection";
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
  canStartDrawingDetection,
  canUploadDrawings,
  requireDrawingAccess,
  requireJobAccess,
} from "@/lib/permissions";
import {
  updateDrawingMetadataSchema,
  updateDrawingStatusSchema,
  validatePdfFiles,
} from "@/lib/validations/drawing";

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

function revalidateDrawingPages(
  companyId: string,
  jobId: string,
  drawingId: string,
) {
  revalidatePath(`/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`);
  revalidatePath(`/companies/${companyId}/jobs/${jobId}`);
}

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

  revalidateDrawingPages(companyId, jobId, drawingId);

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

  revalidateDrawingPages(companyId, jobId, drawingId);

  return { success: "Estado actualizado correctamente." };
}

export async function startDrawingDetectionAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId } = scope;
  const { membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canStartDrawingDetection(membership.role)) {
    redirect(
      `/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`,
    );
  }

  if (drawing.status === "processing") {
    return { error: "La detección ya está en curso para este plano." };
  }

  await prisma.drawing.updateMany({
    where: {
      id: drawingId,
      companyId,
      jobId,
    },
    data: {
      status: "processing",
    },
  });

  await detectDrawingMetadataPlaceholder(drawingId);

  revalidateDrawingPages(companyId, jobId, drawingId);

  return {
    success:
      "Detección iniciada. El plano está en procesamiento. En esta fase aún no se analiza el PDF.",
  };
}

export async function completeSimulatedDrawingDetectionAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const scope = parseDrawingScopeFormData(formData);

  if ("error" in scope) {
    return { error: scope.error };
  }

  const { companyId, jobId, drawingId } = scope;
  const { membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

  if (!canStartDrawingDetection(membership.role)) {
    redirect(
      `/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`,
    );
  }

  if (drawing.status !== "processing") {
    return {
      error: "Solo se puede completar la detección simulada cuando el plano está en procesamiento.",
    };
  }

  await prisma.drawing.updateMany({
    where: {
      id: drawingId,
      companyId,
      jobId,
    },
    data: {
      status: "detected",
    },
  });

  revalidateDrawingPages(companyId, jobId, drawingId);

  return {
    success:
      "Detección simulada completada. El plano está marcado como Detectado. Los metadatos no se han modificado en esta fase.",
  };
}
