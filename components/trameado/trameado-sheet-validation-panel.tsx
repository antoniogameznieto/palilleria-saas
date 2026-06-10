"use client";

import { Badge } from "@/components/ui/badge";
import { formatTrameadoPalilloTotalMm } from "@/lib/trameado/segment-helpers";
import type { TrameadoSheetValidationResult } from "@/lib/trameado/sheet-validation";

type TrameadoSheetValidationPanelProps = {
  validation: TrameadoSheetValidationResult;
};

function statusBadgeVariant(
  status: TrameadoSheetValidationResult["status"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "reasonable":
      return "default";
    case "review_data":
    case "review_delta":
    case "review_delta_high":
      return "secondary";
    case "no_data":
    case "incomplete":
    case "no_comparable":
      return "outline";
    default:
      return "outline";
  }
}

function formatMeters(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

export function TrameadoSheetValidationPanel({
  validation,
}: TrameadoSheetValidationPanelProps) {
  const showComparison =
    validation.hasReferenceLength &&
    validation.referencePipeLengthM != null &&
    validation.deltaPct != null;

  return (
    <section
      className="rounded-lg border bg-card p-4"
      data-testid="trameado-sheet-validation-panel"
      data-validation-status={validation.status}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Validación de hoja</h3>
          <p className="text-xs text-muted-foreground">
            Validación orientativa. Revisa siempre contra el isométrico antes de
            cerrar la hoja.
          </p>
        </div>
        <Badge
          variant={statusBadgeVariant(validation.status)}
          data-testid="trameado-sheet-validation-status"
        >
          {validation.statusLabel}
        </Badge>
      </div>

      <p
        className="mt-3 text-sm text-muted-foreground"
        data-testid="trameado-sheet-validation-reason"
      >
        {validation.reason}
      </p>

      {validation.status !== "no_data" ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Tramos confirmados
            </dt>
            <dd
              className="mt-0.5 tabular-nums"
              data-testid="trameado-sheet-validation-segment-count"
            >
              {validation.confirmedSegmentCount}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Total PALILLO
            </dt>
            <dd
              className="mt-0.5 tabular-nums"
              data-testid="trameado-sheet-validation-total-palillo"
            >
              {formatTrameadoPalilloTotalMm(validation.totalPalilloMm)} mm /{" "}
              {formatMeters(validation.totalPalilloM)} m
            </dd>
          </div>

          {validation.hasReferenceLength &&
          validation.referencePipeLengthM != null ? (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Referencia BOM
              </dt>
              <dd
                className="mt-0.5 tabular-nums"
                data-testid="trameado-sheet-validation-reference"
              >
                {formatMeters(validation.referencePipeLengthM)} m
              </dd>
            </div>
          ) : (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Referencia BOM
              </dt>
              <dd
                className="mt-0.5 text-muted-foreground"
                data-testid="trameado-sheet-validation-reference"
              >
                Sin referencia suficiente
              </dd>
            </div>
          )}

          {showComparison ? (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Diferencia
              </dt>
              <dd
                className="mt-0.5 tabular-nums"
                data-testid="trameado-sheet-validation-delta"
              >
                {formatPercent(validation.deltaPct!)} %
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {validation.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-amber-800 dark:text-amber-200">
          {validation.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

    </section>
  );
}
