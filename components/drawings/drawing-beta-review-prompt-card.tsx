"use client";

import { WorkflowStepBadgeById } from "@/components/jobs/workflow-step-badge";
import { Button } from "@/components/ui/button";
import type { BetaProposalSummary } from "@/lib/drawings/experimental-auto-takeoff-ui";

type DrawingBetaReviewPromptCardProps = {
  summary: BetaProposalSummary;
  selectedCount: number;
  suggestedCount: number;
  hasImportableMissing: boolean;
  onSelectRecommended: () => void;
  onImport: () => void;
  onOpenDetails: () => void;
};

export function DrawingBetaReviewPromptCard({
  summary,
  selectedCount,
  suggestedCount,
  hasImportableMissing,
  onSelectRecommended,
  onImport,
  onOpenDetails,
}: DrawingBetaReviewPromptCardProps) {
  const { readyCount, reviewCount, excludedCount } = summary;

  const headline =
    readyCount > 0
      ? `La app recomienda importar ${readyCount} línea${readyCount === 1 ? "" : "s"}. Primero selecciónalas y luego confirma la importación para pasarlas a la palillería.`
      : `La app ha encontrado ${suggestedCount} sugerencia${suggestedCount === 1 ? "" : "s"}.`;

  let primaryLabel: string | null = null;
  let primaryAction: (() => void) | null = null;
  let primaryTestId: string | null = null;

  if (hasImportableMissing && readyCount > 0 && selectedCount === 0) {
    primaryLabel =
      readyCount === 1
        ? "Seleccionar recomendada"
        : `Seleccionar ${readyCount} recomendadas`;
    primaryAction = onSelectRecommended;
    primaryTestId = "beta-review-select-recommended";
  } else if (selectedCount > 0) {
    primaryLabel = "Importar propuesta revisada";
    primaryAction = onImport;
    primaryTestId = "beta-review-import-proposal";
  } else if (reviewCount > 0) {
    primaryLabel = "Revisar líneas pendientes";
    primaryAction = onOpenDetails;
    primaryTestId = "beta-review-open-details";
  }

  return (
    <section
      className="rounded-xl border-2 border-emerald-500/25 bg-emerald-500/5 p-4 shadow-sm"
      data-testid="beta-review-prompt-card"
    >
      <header className="space-y-2">
        <WorkflowStepBadgeById
          stepId="review_beta_proposal"
          className="text-emerald-800 dark:text-emerald-200"
        />
        <h2 className="text-lg font-semibold leading-tight">
          Revisa la propuesta beta
        </h2>
        <p className="text-sm text-muted-foreground">
          La app ha encontrado sugerencias de palillería a partir del PDF. Si
          aceptas la propuesta, estas líneas pasarán a la palillería.
        </p>
        <p className="text-sm text-foreground">{headline}</p>
        {excludedCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            Hay {excludedCount} línea{excludedCount === 1 ? "" : "s"} excluida
            {excludedCount === 1 ? "" : "s"} por reglas.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Seleccionar recomendadas no importa todavía. «Importar propuesta
          revisada» es lo que crea la palillería.
        </p>
      </header>

      <dl
        className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
        data-testid="beta-review-summary"
      >
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-2 text-center">
          <dt className="text-[11px] text-muted-foreground">Recomendadas</dt>
          <dd
            className="text-base font-semibold"
            data-testid="beta-review-ready-count"
          >
            {readyCount}
          </dd>
        </div>
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-center">
          <dt className="text-[11px] text-muted-foreground">Requieren revisión</dt>
          <dd
            className="text-base font-semibold"
            data-testid="beta-review-review-count"
          >
            {reviewCount}
          </dd>
        </div>
        <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
          <dt className="text-[11px] text-muted-foreground">Excluidas</dt>
          <dd
            className="text-base font-semibold"
            data-testid="beta-review-excluded-count"
          >
            {excludedCount}
          </dd>
        </div>
        <div className="rounded-md border border-sky-500/30 bg-sky-500/5 px-2.5 py-2 text-center">
          <dt className="text-[11px] text-muted-foreground">Seleccionadas</dt>
          <dd
            className="text-base font-semibold"
            data-testid="beta-review-selected-count"
          >
            {selectedCount}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        {primaryLabel && primaryAction && primaryTestId ? (
          <Button
            type="button"
            onClick={primaryAction}
            data-testid={primaryTestId}
          >
            {primaryLabel}
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              No hay líneas recomendadas para importar.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenDetails}
              data-testid="beta-review-open-details"
            >
              Ver detalle de sugerencias
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
