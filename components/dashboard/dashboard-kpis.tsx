import type { CompanyDashboardOperationalStats } from "@/lib/dashboard/company-dashboard";

type DashboardKpisProps = {
  stats: CompanyDashboardOperationalStats;
};

type KpiItemProps = {
  label: string;
  value: string | number;
  hint?: string;
};

function KpiItem({ label, value, hint }: KpiItemProps) {
  return (
    <div className="rounded-lg border bg-muted/20 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function DashboardKpis({ stats }: DashboardKpisProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Estado operativo</h2>
        <p className="text-xs text-muted-foreground">
          Trabajos, planos y palillería de la empresa activa.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiItem label="Trabajos totales" value={stats.totalJobs} />
        <KpiItem
          label="Trabajos en curso"
          value={stats.activeJobs}
        />
        <KpiItem label="Planos totales" value={stats.totalDrawings} />
        <KpiItem
          label="Planos revisados"
          value={stats.reviewedDrawings}
        />
        <KpiItem
          label="Líneas de palillería"
          value={stats.takeoffLineCount}
        />
        <KpiItem
          label="Cantidad total"
          value={stats.totalTakeoffQuantity}
        />
      </div>
    </section>
  );
}
