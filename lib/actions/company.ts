"use server";

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { setActiveCompanyId } from "@/lib/company";
import { prisma } from "@/lib/db";
import {
  assertCanManageCompany,
  getUserCompaniesWithRoles,
} from "@/lib/permissions";
import { companyOnboardingSchema } from "@/lib/validations/auth";
import { companySettingsSchema } from "@/lib/validations/company";

import type { AuthActionState } from "@/lib/actions/auth";

export async function createCompanyAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await requireAuth();

  const memberships = await getUserCompaniesWithRoles(user.id);

  if (memberships.length > 0) {
    redirect("/dashboard");
  }

  const raw = {
    name: formData.get("name"),
    taxName: formData.get("taxName") || undefined,
  };

  const parsed = companyOnboardingSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const company = await prisma.company.create({
    data: {
      name: parsed.data.name,
      taxName: parsed.data.taxName || null,
    },
  });

  await prisma.companyMember.create({
    data: {
      companyId: company.id,
      userId: user.id,
      role: "owner",
    },
  });

  await setActiveCompanyId(company.id, user.id);

  redirect("/dashboard");
}

export async function updateCompanyAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const companyId = formData.get("companyId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    return { error: "Empresa no válida." };
  }

  await assertCanManageCompany(companyId);

  const raw = {
    name: formData.get("name"),
    taxName: formData.get("taxName") || undefined,
  };

  const parsed = companySettingsSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: parsed.data.name,
      taxName: parsed.data.taxName ?? null,
    },
  });

  return {
    success: "Empresa actualizada correctamente.",
  };
}

export async function switchActiveCompanyAction(formData: FormData) {
  const user = await requireAuth();
  const companyId = formData.get("companyId");

  if (typeof companyId !== "string" || companyId.length === 0) {
    redirect("/dashboard");
  }

  await setActiveCompanyId(companyId, user.id);
  redirect("/dashboard");
}
