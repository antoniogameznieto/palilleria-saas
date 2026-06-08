import { redirect } from "next/navigation";

import { requireActiveCompany } from "@/lib/company";

export default async function JobsRedirectPage() {
  const { companyId } = await requireActiveCompany();

  redirect(`/companies/${companyId}/jobs`);
}
