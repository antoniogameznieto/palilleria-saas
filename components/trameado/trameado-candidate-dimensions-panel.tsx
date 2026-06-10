"use client";

import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CandidateDimension,
  SerializedCandidateDimensionsResult,
} from "@/lib/trameado/candidate-dimensions";
import { cn } from "@/lib/utils";

type TrameadoCandidateDimensionsPanelProps = {
  result: SerializedCandidateDimensionsResult;
  canPrepareSegment: boolean;
  onPrepareSegment?: (value: string) => void;
};

function confidenceBadgeVariant(
  confidence: CandidateDimension["confidence"],
): "default" | "secondary" | "outline" {
  if (confidence === "high") {
    return "default";
  }

  if (confidence === "medium") {
    return "secondary";
  }

  return "outline";
}

function confidenceLabel(confidence: CandidateDimension["confidence"]): string {
  if (confidence === "high") {
    return "Alta";
  }

  if (confidence === "medium") {
    return "Media";
  }

  return "Baja";
}

function CandidateDimensionItem({
  candidate,
  copyFeedback,
  canPrepareSegment,
  onCopy,
  onPrepareSegment,
}: {
  candidate: CandidateDimension;
  copyFeedback: string | null;
  canPrepareSegment: boolean;
  onCopy: (value: string) => void;
  onPrepareSegment?: (value: string) => void;
}) {
  const title = [
    candidate.reason,
    ...candidate.reasons,
    candidate.contextSnippet,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/15 px-3 py-2"
      data-testid="trameado-candidate-dimension-item"
      title={title || undefined}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-base font-semibold tabular-nums">
          {candidate.displayValue} mm
        </span>
        <Badge
          variant={confidenceBadgeVariant(candidate.confidence)}
          className="text-[10px]"
        >
          {confidenceLabel(candidate.confidence)}
        </Badge>
      </div>

      <div className="flex shrink-0 gap-1.5">
        {onPrepareSegment ? (
          <Button
            type="button"
            size="sm"
            disabled={!canPrepareSegment}
            onClick={() => onPrepareSegment(candidate.displayValue)}
            data-testid="trameado-candidate-dimension-prepare"
            title={
              canPrepareSegment
                ? "Preparar formulario de tramo con esta cota como PALILLO"
                : "Primero crea una hoja de palilleo."
            }
          >
            Preparar tramo
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onCopy(candidate.displayValue)}
          data-testid="trameado-candidate-dimension-copy"
        >
          {copyFeedback === candidate.displayValue ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </li>
  );
}

export function TrameadoCandidateDimensionsPanel({
  result,
  canPrepareSegment,
  onPrepareSegment,
}: TrameadoCandidateDimensionsPanelProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showAdditionalCandidates, setShowAdditionalCandidates] = useState(false);

  const handleCopy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(value);
      window.setTimeout(() => {
        setCopyFeedback((current) => (current === value ? null : current));
      }, 1500);
    } catch {
      setCopyFeedback(null);
    }
  }, []);

  const handlePrepareSegment = useCallback(
    (value: string) => {
      if (onPrepareSegment && canPrepareSegment) {
        onPrepareSegment(value);
      }
    },
    [canPrepareSegment, onPrepareSegment],
  );

  const visibleCandidates = useMemo(() => {
    if (!showAdditionalCandidates) {
      return result.candidates;
    }

    return [...result.candidates, ...result.additionalCandidates];
  }, [result.additionalCandidates, result.candidates, showAdditionalCandidates]);

  const hasAdditionalCandidates = result.additionalCandidates.length > 0;

  return (
    <div
      className="rounded-lg border bg-card p-4"
      data-testid="trameado-candidate-dimensions-panel"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Cotas candidatas</h3>
        <p className="text-xs text-muted-foreground">
          Longitudes probables del plano. Elige una para preparar un tramo; no
          se guarda hasta confirmar.
        </p>
      </div>

      {onPrepareSegment && !canPrepareSegment ? (
        <p
          className="mt-3 text-xs text-amber-800 dark:text-amber-200"
          data-testid="trameado-candidate-dimensions-no-sheet"
        >
          Crea una hoja para preparar tramos desde estas cotas.
        </p>
      ) : null}

      {result.insufficientText ? (
        <p
          className="mt-3 text-xs text-amber-700 dark:text-amber-400"
          data-testid="trameado-candidate-dimensions-warning"
        >
          Texto embebido limitado; revisa siempre contra el PDF.
        </p>
      ) : null}

      {visibleCandidates.length === 0 ? (
        <p
          className="mt-3 text-sm text-muted-foreground"
          data-testid="trameado-candidate-dimensions-empty"
        >
          No se han detectado cotas útiles en el texto del plano. Puedes
          introducir los tramos manualmente mirando el PDF.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              Cotas más probables
            </p>
            <ul
              className="space-y-1.5"
              data-testid="trameado-candidate-dimensions-list"
            >
              {result.candidates.map((candidate) => (
                <CandidateDimensionItem
                  key={`primary-${candidate.value}`}
                  candidate={candidate}
                  copyFeedback={copyFeedback}
                  canPrepareSegment={canPrepareSegment}
                  onCopy={(value) => void handleCopy(value)}
                  onPrepareSegment={
                    onPrepareSegment
                      ? (value) => handlePrepareSegment(value)
                      : undefined
                  }
                />
              ))}
            </ul>
          </div>

          {showAdditionalCandidates && hasAdditionalCandidates ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Otras cotas
              </p>
              <ul
                className="space-y-1.5"
                data-testid="trameado-candidate-dimensions-additional-list"
              >
                {result.additionalCandidates.map((candidate) => (
                  <CandidateDimensionItem
                    key={`additional-${candidate.value}`}
                    candidate={candidate}
                    copyFeedback={copyFeedback}
                    canPrepareSegment={canPrepareSegment}
                    onCopy={(value) => void handleCopy(value)}
                    onPrepareSegment={
                      onPrepareSegment
                        ? (value) => handlePrepareSegment(value)
                        : undefined
                    }
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {hasAdditionalCandidates ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              data-testid="trameado-candidate-dimensions-toggle-more"
              onClick={() => setShowAdditionalCandidates((current) => !current)}
            >
              {showAdditionalCandidates
                ? "Ocultar otras cotas"
                : `Ver más cotas (${result.additionalCandidates.length})`}
            </Button>
          ) : null}
        </div>
      )}

      {result.warnings.length > 0 && visibleCandidates.length > 0 ? (
        <p className={cn("mt-3 text-xs text-muted-foreground")}>
          Revisa siempre contra el isométrico antes de confirmar un tramo.
        </p>
      ) : null}
    </div>
  );
}
