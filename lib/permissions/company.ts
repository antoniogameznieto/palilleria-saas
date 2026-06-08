import type { CompanyRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MANAGE_COMPANY_ROLES: CompanyRole[] = ["owner", "admin"];

export async function getUserCompanyMembership(userId: string, companyId: string) {
  return prisma.companyMember.findUnique({
    where: {
      companyId_userId: {
        companyId,
        userId,
      },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          taxName: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function getUserCompaniesWithRoles(userId: string) {
  return prisma.companyMember.findMany({
    where: { userId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          taxName: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCompanyForUser(companyId: string, userId: string) {
  const membership = await getUserCompanyMembership(userId, companyId);

  if (!membership) {
    return null;
  }

  return membership.company;
}

export async function requireCompanyMember(companyId: string) {
  const user = await requireAuth();
  const membership = await getUserCompanyMembership(user.id, companyId);

  if (!membership) {
    redirect("/dashboard");
  }

  return { user, membership };
}

export async function requireCompanyRole(
  companyId: string,
  allowedRoles: CompanyRole[],
) {
  const { user, membership } = await requireCompanyMember(companyId);

  if (!allowedRoles.includes(membership.role)) {
    redirect(`/companies/${companyId}/settings`);
  }

  return { user, membership };
}

export async function assertCanManageCompany(companyId: string) {
  return requireCompanyRole(companyId, MANAGE_COMPANY_ROLES);
}

export function canManageCompany(role: CompanyRole): boolean {
  return MANAGE_COMPANY_ROLES.includes(role);
}

export async function getCompanyMembers(companyId: string) {
  return prisma.companyMember.findMany({
    where: { companyId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCompanyMemberCount(companyId: string) {
  return prisma.companyMember.count({
    where: { companyId },
  });
}
