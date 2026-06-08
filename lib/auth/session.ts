import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getUserCompanies(userId: string) {
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

export async function getPostLoginRedirect(userId: string) {
  const memberships = await getUserCompanies(userId);

  return memberships.length === 0 ? "/onboarding/company" : "/dashboard";
}
