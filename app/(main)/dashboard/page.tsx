import { Badge } from "@/components/ui/badge";
import { requireActiveCompany } from "@/lib/company";
import { getCompanyMemberCount } from "@/lib/permissions";

export default async function DashboardPage() {
  const { user, company, membership } = await requireActiveCompany();
  const memberCount = await getCompanyMemberCount(company.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bienvenido{user.name ? `, ${user.name}` : ""}. Área de trabajo de{" "}
          {company.name}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Empresa activa</p>
          <p className="mt-1 font-medium">{company.name}</p>
          {company.taxName ? (
            <p className="text-sm text-muted-foreground">{company.taxName}</p>
          ) : null}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Tu rol</p>
          <Badge className="mt-2 capitalize">{membership.role}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Miembros</p>
          <p className="mt-2 text-3xl font-semibold">{memberCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Trabajos</p>
          <p className="mt-2 text-3xl font-semibold">0</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Disponible en la siguiente fase.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Estado</p>
          <Badge className="mt-2">Multiempresa activo</Badge>
        </div>
      </div>
    </div>
  );
}
