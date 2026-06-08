import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getUserCompanies, requireAuth } from "@/lib/auth";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuth();
  const memberships = await getUserCompanies(user.id);

  if (memberships.length === 0) {
    redirect("/onboarding/company");
  }

  const activeMembership = memberships[0];

  return (
    <AppShell
      user={user}
      activeCompany={activeMembership.company}
      membershipRole={activeMembership.role}
    >
      {children}
    </AppShell>
  );
}
