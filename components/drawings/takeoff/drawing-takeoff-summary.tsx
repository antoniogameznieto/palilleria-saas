import type { TakeoffSummary } from "@/lib/drawings/takeoff-summary";

type DrawingTakeoffSummaryProps = {
  summary: TakeoffSummary;
  compact?: boolean;
};

export function DrawingTakeoffSummary({
  summary,
  compact = false,
}: DrawingTakeoffSummaryProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
        <div>
          <span className="text-muted-foreground">Líneas </span>
          <span className="font-semibold">{summary.lineCount}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Cantidad </span>
          <span className="font-semibold">{summary.totalQuantity}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Referencias </span>
          <span className="font-semibold">{summary.uniqueReferenceCount}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <h3 className="text-sm font-medium">Resumen</h3>
      <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Total líneas</dt>
          <dd className="mt-1 text-lg font-semibold">{summary.lineCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Total cantidad</dt>
          <dd className="mt-1 text-lg font-semibold">{summary.totalQuantity}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Referencias únicas</dt>
          <dd className="mt-1 text-lg font-semibold">
            {summary.uniqueReferenceCount}
          </dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <dt className="text-muted-foreground">Por unidad</dt>
          <dd className="mt-1 space-y-1">
            {summary.quantityByUnit.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              summary.quantityByUnit.map((entry) => (
                <p key={entry.unit}>
                  <span className="font-medium">{entry.unit}:</span>{" "}
                  {entry.totalQuantity}
                </p>
              ))
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
