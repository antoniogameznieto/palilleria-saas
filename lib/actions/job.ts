"use server";

import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";

import type { AuthActionState } from "@/lib/actions/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_JOB_SETTINGS } from "@/lib/jobs/labels";
import {
  canArchiveJob,
  canDeleteJob,
  canEditJob,
  requireCompanyMember,
  requireJobAccess,
} from "@/lib/permissions";
import { deleteFile } from "@/lib/storage";
import {
  createJobSchema,
  jobSettingsSchema,
  updateJobSchema,
} from "@/lib/validations/job";

function parseJobFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    clientName: formData.get("clientName") || undefined,
    projectCode: formData.get("projectCode") || undefined,
    description: formData.get("description") || undefined,
  };
}

function parseUpdateJobFormData(formData: FormData) {
  const status = formData.get("status");

  return {
    ...parseJobFormData(formData),
    status: typeof status === "string" && status.length > 0 ? status : undefined,
  };
}

function parseJobSettingsFormData(formData: FormData) {
  return {
    lengthCriteria: formData.get("lengthCriteria"),
    lengthUnit: formData.get("lengthUnit"),
    roundingMm: formData.get("roundingMm"),
    maxPieceLengthMm: formData.get("maxPieceLengthMm"),
    minPieceLengthMm: formData.get("minPieceLengthMm"),
    maxPieceWeightKg: formData.get("maxPieceWeightKg"),
    separateByDiameter: formData.get("separateByDiameter"),
    separateBySchedule: formData.get("separateBySchedule"),
    separateByMaterial: formData.get("separateByMaterial"),
    separateAtFlanges: formData.get("separateAtFlanges"),
    separateAtValves: formData.get("separateAtValves"),
    separateAtFittings: formData.get("separateAtFittings"),
    requireReviewBeforeExport: formData.get("requireReviewBeforeExport"),
    notes: formData.get("notes") || undefined,
  };
}

function checkboxValue(formData: FormData, name: string): string {
  return formData.get(name) === "true" ? "true" : "false";
}

export async function createJobAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const companyId = formData.get("companyId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    return { error: "Empresa no válida." };
  }

  const { user, membership } = await requireCompanyMember(companyId);

  if (!canEditJob(membership.role)) {
    redirect(`/companies/${companyId}/jobs`);
  }

  const parsed = createJobSchema.safeParse(parseJobFormData(formData));

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const job = await prisma.$transaction(async (tx) => {
    const createdJob = await tx.job.create({
      data: {
        companyId,
        name: parsed.data.name,
        clientName: parsed.data.clientName ?? null,
        projectCode: parsed.data.projectCode ?? null,
        description: parsed.data.description ?? null,
        createdById: user.id,
      },
    });

    await tx.jobSettings.create({
      data: {
        companyId,
        jobId: createdJob.id,
        ...DEFAULT_JOB_SETTINGS,
      },
    });

    return createdJob;
  });

  redirect(`/companies/${companyId}/jobs/${job.id}`);
}

export async function updateJobAction(
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

  const { membership } = await requireJobAccess(companyId, jobId);

  if (!canEditJob(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  const parsed = updateJobSchema.safeParse(parseUpdateJobFormData(formData));

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data: Prisma.JobUpdateInput = {
    name: parsed.data.name,
    clientName: parsed.data.clientName ?? null,
    projectCode: parsed.data.projectCode ?? null,
    description: parsed.data.description ?? null,
  };

  if (parsed.data.status) {
    if (
      parsed.data.status === "archived" &&
      !canArchiveJob(membership.role)
    ) {
      return {
        error: "No tienes permiso para archivar este trabajo.",
      };
    }

    data.status = parsed.data.status;
  }

  const updated = await prisma.job.updateMany({
    where: {
      id: jobId,
      companyId,
    },
    data,
  });

  if (updated.count === 0) {
    return { error: "No se pudo actualizar el trabajo." };
  }

  redirect(`/companies/${companyId}/jobs/${jobId}`);
}

export async function archiveJobAction(formData: FormData) {
  const companyId = formData.get("companyId");
  const jobId = formData.get("jobId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    redirect("/dashboard");
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    redirect(`/companies/${companyId}/jobs`);
  }

  const { membership } = await requireJobAccess(companyId, jobId);

  if (!canArchiveJob(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  await prisma.job.updateMany({
    where: {
      id: jobId,
      companyId,
    },
    data: {
      status: "archived",
    },
  });

  redirect(`/companies/${companyId}/jobs/${jobId}`);
}

export async function deleteJobAction(formData: FormData) {
  const companyId = formData.get("companyId");
  const jobId = formData.get("jobId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    redirect("/dashboard");
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    redirect(`/companies/${companyId}/jobs`);
  }

  const { membership } = await requireJobAccess(companyId, jobId);

  if (!canDeleteJob(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  const drawings = await prisma.drawing.findMany({
    where: {
      companyId,
      jobId,
    },
    select: {
      storagePath: true,
    },
  });

  const deleted = await prisma.job.deleteMany({
    where: {
      id: jobId,
      companyId,
    },
  });

  if (deleted.count === 0) {
    redirect(`/companies/${companyId}/jobs`);
  }

  await Promise.all(
    drawings.map((drawing) =>
      drawing.storagePath
        ? deleteFile({ storagePath: drawing.storagePath }).catch(() => undefined)
        : Promise.resolve(),
    ),
  );

  revalidatePath(`/companies/${companyId}/jobs`);

  redirect(`/companies/${companyId}/jobs`);
}

export async function updateJobSettingsAction(
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

  const { membership } = await requireJobAccess(companyId, jobId);

  if (!canEditJob(membership.role)) {
    redirect(`/companies/${companyId}/jobs/${jobId}`);
  }

  const raw = {
    ...parseJobSettingsFormData(formData),
    separateByDiameter: checkboxValue(formData, "separateByDiameter"),
    separateBySchedule: checkboxValue(formData, "separateBySchedule"),
    separateByMaterial: checkboxValue(formData, "separateByMaterial"),
    separateAtFlanges: checkboxValue(formData, "separateAtFlanges"),
    separateAtValves: checkboxValue(formData, "separateAtValves"),
    separateAtFittings: checkboxValue(formData, "separateAtFittings"),
    requireReviewBeforeExport: checkboxValue(
      formData,
      "requireReviewBeforeExport",
    ),
  };

  const parsed = jobSettingsSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingSettings = await prisma.jobSettings.findFirst({
    where: { jobId, companyId },
    select: { id: true },
  });

  if (!existingSettings) {
    return { error: "Settings del trabajo no encontrados." };
  }

  await prisma.jobSettings.update({
    where: {
      jobId,
    },
    data: {
      lengthCriteria: parsed.data.lengthCriteria,
      lengthUnit: parsed.data.lengthUnit,
      roundingMm: parsed.data.roundingMm ?? null,
      maxPieceLengthMm: parsed.data.maxPieceLengthMm ?? null,
      minPieceLengthMm: parsed.data.minPieceLengthMm ?? null,
      maxPieceWeightKg: parsed.data.maxPieceWeightKg ?? null,
      separateByDiameter: parsed.data.separateByDiameter,
      separateBySchedule: parsed.data.separateBySchedule,
      separateByMaterial: parsed.data.separateByMaterial,
      separateAtFlanges: parsed.data.separateAtFlanges,
      separateAtValves: parsed.data.separateAtValves,
      separateAtFittings: parsed.data.separateAtFittings,
      requireReviewBeforeExport: parsed.data.requireReviewBeforeExport,
      notes: parsed.data.notes ?? null,
    },
  });

  redirect(`/companies/${companyId}/jobs/${jobId}`);
}
