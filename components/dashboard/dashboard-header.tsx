import Link from "next/link";

import { Button } from "@/components/ui/button";

type DashboardHeaderProps = {
  companyName: string;
  companyId: string;
  canCreateJob: boolean;
  summaryLine?: string;
};

export function DashboardHeader({
  companyName,
  companyId,
  canCreateJob,
  summaryLine,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Empresa activa: {companyName}
        </p>
        {summaryLine ? (
          <p className="text-xs text-muted-foreground">{summaryLine}</p>
        ) : null}
      </div>

      {canCreateJob ? (
        <Link href={`/companies/${companyId}/jobs/new`}>
          <Button>Nuevo trabajo</Button>
        </Link>
      ) : null}
    </header>
  );
}
