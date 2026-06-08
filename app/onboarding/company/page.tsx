import { redirect } from "next/navigation";

import { CompanyOnboardingForm } from "@/components/onboarding/company-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserCompanies, requireAuth } from "@/lib/auth";

export default async function CompanyOnboardingPage() {
  const user = await requireAuth();
  const memberships = await getUserCompanies(user.id);

  if (memberships.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Crea tu empresa</CardTitle>
            <CardDescription>
              Hola{user.name ? `, ${user.name}` : ""}. Antes de usar el panel
              necesitas crear o pertenecer a una empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyOnboardingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
