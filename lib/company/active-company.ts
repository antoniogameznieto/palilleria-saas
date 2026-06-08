import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import {
  getUserCompaniesWithRoles,
  getUserCompanyMembership,
} from "@/lib/permissions";

export const ACTIVE_COMPANY_COOKIE = "palilleria_active_company";

export async function getActiveCompanyId(userId: string): Promise<string | null> {
  const memberships = await getUserCompaniesWithRoles(userId);

  if (memberships.length === 0) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;

  if (cookieValue) {
    const isValid = memberships.some(
      (membership) => membership.companyId === cookieValue,
    );

    if (isValid) {
      return cookieValue;
    }
  }

  return memberships[0].companyId;
}

export async function setActiveCompanyId(
  companyId: string,
  userId: string,
): Promise<void> {
  const membership = await getUserCompanyMembership(userId, companyId);

  if (!membership) {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function requireActiveCompany() {
  const user = await requireAuth();
  const companyId = await getActiveCompanyId(user.id);

  if (!companyId) {
    redirect("/onboarding/company");
  }

  const membership = await getUserCompanyMembership(user.id, companyId);

  if (!membership) {
    redirect("/onboarding/company");
  }

  return {
    user,
    companyId,
    membership,
    company: membership.company,
  };
}
