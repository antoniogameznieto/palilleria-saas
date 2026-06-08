"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import {
  buildDrawingDetectionUpdate,
  logDrawingDetectionDebug,
  resolveDrawingFileNameForDetection,
} from "@/lib/drawings/detection-apply";
import {
  serializeDetectionFeedbackForActivity,
  type DetectionFeedbackSummary,
} from "@/lib/drawings/detection-merge";
import {
  buildDetectionCompletedActivityMessage,
  buildDetectionStartedActivityMessage,
  buildDrawingUploadedActivityMessage,
  buildMetadataConfirmedActivityMessage,
  buildMetadataUpdatedActivityMessage,
  buildStatusUpdatedActivityMessage,
  recordDrawingActivity,
} from "@/lib/drawings/activity";
import { detectDrawingMetadataPlaceholder } from "@/lib/drawings/detection";
import { drawingMetadataEquals } from "@/lib/drawings/metadata";
import { prisma } from "@/lib/db";
import {
  buildDrawingStoragePath,
  deleteFile,
  PDF_MIME_TYPE,
  sanitizeFileName,
  uploadFile,
} from "@/lib/storage";
import {
  canConfirmDetectedDrawingMetadata,
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

export type DrawingDetectionActionState = AuthActionState & {
  detectionFeedback?: DetectionFeedbackSummary | null;
};

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
    .filter((entry): entry is File => entry instanceof File);

  const validationError = validatePdfFiles(files);

  if (validationError) {
    return { error: validationError };
  }

  for (const file of files) {
    const originalFileName = file.name;
    const safeFileName = sanitizeFileName(originalFileName);
    let drawingId: string | null = null;
    let storagePath: string | null = null;

    try {
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

      drawingId = drawing.id;
      storagePath = buildDrawingStoragePath(
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

      await recordDrawingActivity({
        drawingId: drawing.id,
        companyId,
        jobId,
        actorUserId: user.id,
        type: "drawing_uploaded",
        message: buildDrawingUploadedActivityMessage(originalFileName),
        metadata: {
          fileName: originalFileName,
        },
      });
    } catch {
      if (storagePath) {
        await deleteFile({ storagePath }).catch(() => undefined);
      }

      if (drawingId) {
        await prisma.drawing.deleteMany({
          where: {
            id: drawingId,
            companyId,
            jobId,
          },
        });
      }

      return {
        error: `No se pudo subir "${originalFileName}". Inténtalo de nuevo.`,
      };
    }
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

  const deleted = await prisma.drawing.deleteMany({
    where: {
      id: drawingId,
      companyId,
      jobId,
    },
  });

  if (deleted.count === 0) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  if (drawing.storagePath) {
    await deleteFile({ storagePath: drawing.storagePath }).catch(() => undefined);
  }

  revalidatePath(`/companies/${companyId}/jobs/${jobId}`);

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

  const { user, membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

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

  if (drawingMetadataEquals(drawing, parsed.data)) {
    return { success: "Los metadatos no han cambiado." };
  }

  const updated = await prisma.drawing.updateMany({
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

  if (updated.count === 0) {
    return { error: "No se pudo actualizar el plano." };
  }

  await recordDrawingActivity({
    drawingId,
    companyId,
    jobId,
    actorUserId: user.id,
    type: "metadata_updated",
    message: buildMetadataUpdatedActivityMessage(),
    metadata: {
      previous: {
        drawingNumber: drawing.drawingNumber,
        lineNumber: drawing.lineNumber,
        revision: drawing.revision,
      },
      next: {
        drawingNumber: parsed.data.drawingNumber,
        lineNumber: parsed.data.lineNumber,
        revision: parsed.data.revision,
      },
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

  const { user, membership, drawing } = await requireDrawingAccess(
    companyId,
    jobId,
    drawingId,
  );

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

  const previousStatus = drawing.status;

  if (previousStatus === parsed.data.status) {
    return { success: "El estado no ha cambiado." };
  }

  const updated = await prisma.drawing.updateMany({
    where: {
      id: drawingId,
      companyId,
      jobId,
      status: previousStatus,
    },
    data: {
      status: parsed.data.status,
    },
  });

  if (updated.count === 0) {
    return {
      error:
        "No se pudo actualizar el estado. El plano puede haber cambiado mientras editabas.",
    };
  }

  await recordDrawingActivity({
    drawingId,
    companyId,
    jobId,
    actorUserId: user.id,
    type: "status_updated",
    message: buildStatusUpdatedActivityMessage(
      previousStatus,
      parsed.data.status,
    ),
    metadata: {
      previousStatus,
      nextStatus: parsed.data.status,
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
  const { user, membership, drawing } = await requireDrawingAccess(
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

  const previousStatus = drawing.status;

  const updated = await prisma.drawing.updateMany({
    where: {
      id: drawingId,
      companyId,
      jobId,
      status: { not: "processing" },
    },
    data: {
      status: "processing",
    },
  });

  if (updated.count === 0) {
    return { error: "La detección ya está en curso para este plano." };
  }

  const fileName = resolveDrawingFileNameForDetection(drawing);

  logDrawingDetectionDebug("start", {
    drawingId,
    originalFileName: drawing.originalFileName,
    fileName: drawing.fileName,
    resolvedFileName: fileName,
  });

  const detectionStart = await detectDrawingMetadataPlaceholder(
    drawingId,
    fileName,
  );

  await recordDrawingActivity({
    drawingId,
    companyId,
    jobId,
    actorUserId: user.id,
    type: "detection_started",
    message: buildDetectionStartedActivityMessage(fileName),
    metadata: {
      fileName,
      previousStatus,
      nextStatus: "processing",
    },
  });

  revalidateDrawingPages(companyId, jobId, drawingId);

  return {
    success: `${detectionStart.message} El plano está en procesamiento.`,
  };
}

export async function completeSimulatedDrawingDetectionAction(
  _prevState: DrawingDetectionActionState,
  formData: FormData,
): Promise<DrawingDetectionActionState> {
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

  if (!canStartDrawingDetection(membership.role)) {
    redirect(
      `/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`,
    );
  }

  const drawing = await prisma.drawing.findFirst({
    where: {
      id: drawingId,
      companyId,
      jobId,
    },
    select: {
      status: true,
      originalFileName: true,
      fileName: true,
      drawingNumber: true,
      lineNumber: true,
      revision: true,
      storagePath: true,
      mimeType: true,
    },
  });

  if (!drawing) {
    return { error: "Plano no encontrado." };
  }

  if (drawing.status !== "processing") {
    return {
      error: "Solo se puede completar la detección simulada cuando el plano está en procesamiento.",
    };
  }

  const detectionResult = await buildDrawingDetectionUpdate(drawing);

  logDrawingDetectionDebug("complete:pre-update", {
    drawingId,
    resolvedFileName: detectionResult.fileName,
    filenameDetected: detectionResult.filenameDetected,
    pdfTextDetected: detectionResult.pdfTextDetected,
    detected: detectionResult.detected,
    feedback: detectionResult.feedback,
    sourcesUsed: detectionResult.feedback.sourcesUsed,
    pdfTextAttempted: detectionResult.pdfTextAttempted,
    hasEmbeddedText: detectionResult.hasEmbeddedText,
    currentRevision: drawing.revision,
    metadataUpdate: detectionResult.metadataUpdate,
    updateData: detectionResult.updateData,
  });

  const updated = await prisma.drawing.updateMany({
    where: {
      id: drawingId,
      companyId,
      jobId,
      status: "processing",
    },
    data: detectionResult.updateData,
  });

  if (updated.count === 0) {
    return {
      error:
        "Solo se puede completar la detección simulada cuando el plano está en procesamiento.",
    };
  }

  const drawingAfterUpdate = await prisma.drawing.findFirst({
    where: {
      id: drawingId,
      companyId,
      jobId,
    },
    select: {
      drawingNumber: true,
      lineNumber: true,
      revision: true,
      status: true,
    },
  });

  logDrawingDetectionDebug("complete:post-update", {
    drawingId,
    dbRevision: drawingAfterUpdate?.revision ?? null,
    dbDrawingNumber: drawingAfterUpdate?.drawingNumber ?? null,
    dbLineNumber: drawingAfterUpdate?.lineNumber ?? null,
    dbStatus: drawingAfterUpdate?.status ?? null,
  });

  await recordDrawingActivity({
    drawingId,
    companyId,
    jobId,
    actorUserId: user.id,
    type: "detection_completed",
    message: buildDetectionCompletedActivityMessage(detectionResult.feedback),
    metadata: serializeDetectionFeedbackForActivity(detectionResult.feedback, {
      previousStatus: "processing",
      nextStatus: "detected",
      hasEmbeddedText: detectionResult.hasEmbeddedText,
    }),
  });

  revalidateDrawingPages(companyId, jobId, drawingId);

  return {
    success: detectionResult.message,
    detectionFeedback: detectionResult.feedback,
  };
}

export async function confirmDetectedDrawingMetadataAction(
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

  if (!canConfirmDetectedDrawingMetadata(membership.role)) {
    redirect(
      `/companies/${companyId}/jobs/${jobId}/drawings/${drawingId}`,
    );
  }

  if (drawing.status !== "detected") {
    return {
      error:
        "Solo se pueden confirmar metadatos cuando el plano está en estado Detectado.",
    };
  }

  const updated = await prisma.drawing.updateMany({
    where: {
      id: drawingId,
      companyId,
      jobId,
      status: "detected",
    },
    data: {
      status: "reviewed",
    },
  });

  if (updated.count === 0) {
    return {
      error:
        "Solo se pueden confirmar metadatos cuando el plano está en estado Detectado.",
    };
  }

  await recordDrawingActivity({
    drawingId,
    companyId,
    jobId,
    actorUserId: user.id,
    type: "metadata_confirmed",
    message: buildMetadataConfirmedActivityMessage(),
    metadata: {
      previousStatus: "detected",
      nextStatus: "reviewed",
      drawingNumber: drawing.drawingNumber,
      lineNumber: drawing.lineNumber,
      revision: drawing.revision,
    },
  });

  revalidateDrawingPages(companyId, jobId, drawingId);

  return {
    success:
      "Metadatos confirmados. El plano ha pasado a estado Revisado.",
  };
}
