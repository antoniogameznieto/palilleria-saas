"use server";

import { redirect } from "next/navigation";

import { getUserCompanies, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { companyOnboardingSchema } from "@/lib/validations/auth";

import type { AuthActionState } from "@/lib/actions/auth";

export async function createCompanyAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await requireAuth();

  const memberships = await getUserCompanies(user.id);

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

  redirect("/dashboard");
}
