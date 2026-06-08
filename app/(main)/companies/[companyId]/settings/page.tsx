import { notFound } from "next/navigation";

import { CompanyMembersTable } from "@/components/company/company-members-table";
import { CompanySettingsForm } from "@/components/company/company-settings-form";
import { CompanySettingsReadonly } from "@/components/company/company-settings-readonly";
import { Badge } from "@/components/ui/badge";
import {
  canManageCompany,
  getCompanyForUser,
  getCompanyMembers,
  requireCompanyMember,
} from "@/lib/permissions";

type CompanySettingsPageProps = {
  params: Promise<{
    companyId: string;
  }>;
};

export default async function CompanySettingsPage({
  params,
}: CompanySettingsPageProps) {
  const { companyId } = await params;
  const { user, membership } = await requireCompanyMember(companyId);

  const company = await getCompanyForUser(companyId, user.id);

  if (!company) {
    notFound();
  }

  const members = await getCompanyMembers(companyId);
  const canManage = canManageCompany(membership.role);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Settings de empresa
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Información básica y miembros de {company.name}.
        </p>
        <Badge variant="outline" className="mt-3 capitalize">
          Tu rol: {membership.role}
        </Badge>
      </div>

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Datos de la empresa</h3>
        {canManage ? (
          <CompanySettingsForm
            companyId={company.id}
            defaultValues={{
              name: company.name,
              taxName: company.taxName,
            }}
          />
        ) : (
          <CompanySettingsReadonly
            name={company.name}
            taxName={company.taxName}
          />
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Miembros</h3>
          <p className="text-sm text-muted-foreground">
            {members.length} miembro{members.length === 1 ? "" : "s"} en esta
            empresa.
          </p>
        </div>
        <CompanyMembersTable members={members} />
      </section>
    </div>
  );
}
