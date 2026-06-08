import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUserCompanies, requireAuth } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireAuth();
  const memberships = await getUserCompanies(user.id);
  const activeCompany = memberships[0]?.company;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bienvenido{user.name ? `, ${user.name}` : ""}. Gestiona trabajos y
          planos desde tu área de trabajo.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Usuario</p>
        <p className="mt-1 font-medium">{user.name ?? "Sin nombre"}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      {activeCompany ? (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Empresa activa</p>
          <p className="mt-1 font-medium">{activeCompany.name}</p>
          {activeCompany.taxName ? (
            <p className="text-sm text-muted-foreground">
              {activeCompany.taxName}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Aún no perteneces a ninguna empresa.
          </p>
          <Link href="/onboarding/company" className="mt-3 inline-block">
            <Button>Crear empresa</Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Trabajos</p>
          <p className="mt-2 text-3xl font-semibold">0</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Planos subidos</p>
          <p className="mt-2 text-3xl font-semibold">0</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Estado</p>
          <Badge className="mt-2">Autenticación lista</Badge>
        </div>
      </div>
    </div>
  );
}
