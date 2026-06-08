import type { JobDrawingStatusSummary } from "@/lib/drawings/drawing-status-summary";
import type { JobTakeoffReviewSummary } from "@/lib/drawings/takeoff-review";
import type { JobTakeoffSummary } from "@/lib/drawings/takeoff-summary";

type JobDetailKpisProps = {
  drawingSummary: JobDrawingStatusSummary;
  takeoffSummary: JobTakeoffSummary;
  takeoffReviewSummary: JobTakeoffReviewSummary;
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

function formatUnitBreakdown(summary: JobTakeoffSummary): string {
  if (summary.quantityByUnit.length === 0) {
    return "—";
  }

  return summary.quantityByUnit
    .map((entry) => `${entry.unit}: ${entry.totalQuantity}`)
    .join(" · ");
}

export function JobDetailKpis({
  drawingSummary,
  takeoffSummary,
  takeoffReviewSummary,
}: JobDetailKpisProps) {
  const drawingStatusHint = [
    drawingSummary.reviewedCount > 0
      ? `${drawingSummary.reviewedCount} revisados`
      : null,
    drawingSummary.pendingCount > 0
      ? `${drawingSummary.pendingCount} pendientes`
      : null,
    drawingSummary.errorCount > 0
      ? `${drawingSummary.errorCount} errores`
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  const takeoffReviewHint =
    takeoffReviewSummary.drawingsWithTakeoff === 0
      ? undefined
      : [
          takeoffReviewSummary.reviewedCount > 0
            ? `${takeoffReviewSummary.reviewedCount} revisada${takeoffReviewSummary.reviewedCount === 1 ? "" : "s"}`
            : null,
          takeoffReviewSummary.pendingCount > 0
            ? `${takeoffReviewSummary.pendingCount} pendiente${takeoffReviewSummary.pendingCount === 1 ? "" : "s"}`
            : null,
        ]
          .filter((part): part is string => part !== null)
          .join(" · ");

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Resumen del trabajo</h2>
        <p className="text-xs text-muted-foreground">
          Planos y palillería consolidada del trabajo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <KpiItem
          label="Total planos"
          value={drawingSummary.total}
          hint={drawingStatusHint || undefined}
        />
        <KpiItem
          label="Revisados"
          value={drawingSummary.reviewedCount}
        />
        <KpiItem
          label="Pendientes"
          value={drawingSummary.pendingCount}
        />
        <KpiItem
          label="Líneas de palillería"
          value={takeoffSummary.lineCount}
        />
        <KpiItem
          label="Cantidad total"
          value={takeoffSummary.totalQuantity}
        />
        <KpiItem
          label="Referencias únicas"
          value={takeoffSummary.uniqueReferenceCount}
        />
        <KpiItem
          label="Planos con palillería"
          value={takeoffSummary.drawingCountWithTakeoff}
          hint={
            takeoffReviewHint
              ? `${takeoffReviewHint} · ${formatUnitBreakdown(takeoffSummary)}`
              : formatUnitBreakdown(takeoffSummary)
          }
        />
      </div>
    </section>
  );
}
