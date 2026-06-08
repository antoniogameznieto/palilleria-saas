import type { CompanyRole } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardCompanyCardProps = {
  companyName: string;
  taxName: string | null;
  role: CompanyRole;
  memberCount: number;
};

export function DashboardCompanyCard({
  companyName,
  taxName,
  role,
  memberCount,
}: DashboardCompanyCardProps) {
  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Empresa activa</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Empresa</p>
          <p className="mt-1 font-medium">{companyName}</p>
          {taxName ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{taxName}</p>
          ) : null}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tu rol</p>
          <Badge className="mt-2 capitalize">{role}</Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Miembros</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{memberCount}</p>
        </div>
      </CardContent>
    </Card>
  );
}
