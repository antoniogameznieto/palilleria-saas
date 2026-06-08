import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista principal del SaaS. La lógica de empresas y trabajos se
          conectará en los siguientes sprints.
        </p>
      </div>

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
          <Badge className="mt-2">Base lista</Badge>
        </div>
      </div>
    </div>
  );
}
