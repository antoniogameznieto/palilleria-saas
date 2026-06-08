import { redirect } from "next/navigation";

import { requireActiveCompany } from "@/lib/company";

export default async function SettingsRedirectPage() {
  const { companyId } = await requireActiveCompany();

  redirect(`/companies/${companyId}/settings`);
}
