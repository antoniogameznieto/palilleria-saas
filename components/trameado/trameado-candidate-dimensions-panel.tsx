"use client";

import { useCallback, useState } from "react";

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

export function TrameadoCandidateDimensionsPanel({
  result,
  canPrepareSegment,
  onPrepareSegment,
}: TrameadoCandidateDimensionsPanelProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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

  return (
    <div
      className="rounded-lg border bg-card p-4"
      data-testid="trameado-candidate-dimensions-panel"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Cotas candidatas</h3>
        <p className="text-xs text-muted-foreground">
          Estas cotas se han extraído del texto del plano. Puedes preparar un
          tramo con una cota; no se guarda hasta que confirmes.
        </p>
      </div>

      {onPrepareSegment && !canPrepareSegment ? (
        <p
          className="mt-3 text-xs text-amber-700 dark:text-amber-400"
          data-testid="trameado-candidate-dimensions-no-sheet"
        >
          Crea o selecciona una hoja antes de usar cotas.
        </p>
      ) : null}

      {result.insufficientText ? (
        <p
          className="mt-3 text-xs text-amber-700 dark:text-amber-400"
          data-testid="trameado-candidate-dimensions-warning"
        >
          Texto embebido limitado o ausente; la lista puede estar vacía o ser poco
          fiable.
        </p>
      ) : null}

      {result.overallConfidence !== "high" && result.candidates.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Detección de confianza {confidenceLabel(result.overallConfidence).toLowerCase()}
          . Revisa siempre contra el isométrico.
        </p>
      ) : null}

      {result.candidates.length === 0 ? (
        <p
          className="mt-3 text-sm text-muted-foreground"
          data-testid="trameado-candidate-dimensions-empty"
        >
          No se han detectado cotas candidatas en el texto del plano.
        </p>
      ) : (
        <ul
          className="mt-3 space-y-2"
          data-testid="trameado-candidate-dimensions-list"
        >
          {result.candidates.map((candidate) => (
            <li
              key={candidate.value}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2"
              data-testid="trameado-candidate-dimension-item"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium tabular-nums">
                    {candidate.displayValue} mm
                  </span>
                  <Badge variant={confidenceBadgeVariant(candidate.confidence)}>
                    {confidenceLabel(candidate.confidence)}
                  </Badge>
                </div>
                {candidate.contextSnippet ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {candidate.contextSnippet}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopy(candidate.displayValue)}
                  data-testid="trameado-candidate-dimension-copy"
                >
                  {copyFeedback === candidate.displayValue ? "Copiado" : "Copiar"}
                </Button>
                {onPrepareSegment ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canPrepareSegment}
                    onClick={() => handlePrepareSegment(candidate.displayValue)}
                    data-testid="trameado-candidate-dimension-prepare"
                    title={
                      canPrepareSegment
                        ? "Preparar formulario de tramo con esta cota como PALILLO"
                        : "Crea o selecciona una hoja antes de usar cotas"
                    }
                  >
                    Preparar tramo
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {result.warnings.length > 0 ? (
        <div
          className={cn(
            "mt-3 space-y-1 text-xs text-muted-foreground",
            result.candidates.length === 0 && "mt-3",
          )}
        >
          {result.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
