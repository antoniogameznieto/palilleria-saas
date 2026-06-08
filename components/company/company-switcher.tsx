"use client";

import { switchActiveCompanyAction } from "@/lib/actions/company";

type CompanyOption = {
  id: string;
  name: string;
};

type CompanySwitcherProps = {
  companies: CompanyOption[];
  activeCompanyId: string;
  membershipRole: string;
};

export function CompanySwitcher({
  companies,
  activeCompanyId,
  membershipRole,
}: CompanySwitcherProps) {
  const activeCompany = companies.find(
    (company) => company.id === activeCompanyId,
  );

  if (companies.length <= 1) {
    return (
      <div>
        <p className="mt-1 truncate text-sm font-medium">
          {activeCompany?.name ?? "Sin empresa"}
        </p>
        <p className="mt-1 text-xs capitalize text-muted-foreground">
          Rol: {membershipRole}
        </p>
      </div>
    );
  }

  return (
    <form action={switchActiveCompanyAction} className="space-y-2">
      <select
        name="companyId"
        defaultValue={activeCompanyId}
        className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
      <p className="text-xs capitalize text-muted-foreground">
        Rol: {membershipRole}
      </p>
    </form>
  );
}
