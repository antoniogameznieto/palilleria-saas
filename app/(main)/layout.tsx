import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/company";
import {
  getUserCompaniesWithRoles,
  getUserCompanyMembership,
} from "@/lib/permissions";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuth();
  const memberships = await getUserCompaniesWithRoles(user.id);

  if (memberships.length === 0) {
    redirect("/onboarding/company");
  }

  const activeCompanyId = await getActiveCompanyId(user.id);

  if (!activeCompanyId) {
    redirect("/onboarding/company");
  }

  const activeMembership = await getUserCompanyMembership(
    user.id,
    activeCompanyId,
  );

  if (!activeMembership) {
    redirect("/onboarding/company");
  }

  const companies = memberships.map((membership) => ({
    id: membership.company.id,
    name: membership.company.name,
  }));

  return (
    <AppShell
      user={user}
      activeCompany={activeMembership.company}
      membershipRole={activeMembership.role}
      activeCompanyId={activeCompanyId}
      companies={companies}
    >
      {children}
    </AppShell>
  );
}
