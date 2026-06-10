"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import type { AuthActionState } from "@/lib/actions/auth";
import { createTrameadoSegmentAction } from "@/lib/actions/trameado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  TrameadoSegmentSuggestion,
  TrameadoSegmentSuggestionsResult,
} from "@/lib/trameado/segment-suggestions";

type TrameadoSegmentSuggestionsPanelProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  sheetId: string;
  result: TrameadoSegmentSuggestionsResult;
  canManage: boolean;
  onPrepareSuggestion: (suggestion: TrameadoSegmentSuggestion) => void;
};

const initialState: AuthActionState = {};

function confidenceBadgeVariant(
  confidence: TrameadoSegmentSuggestion["confidence"],
): "default" | "secondary" {
  return confidence === "high" ? "default" : "secondary";
}

function confidenceLabel(
  confidence: TrameadoSegmentSuggestion["confidence"],
): string {
  return confidence === "high" ? "Alta confianza" : "Revisar";
}

function AddSuggestionSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      disabled={pending}
      data-testid="trameado-segment-suggestion-add"
    >
      {pending ? "Añadiendo..." : "Añadir a hoja"}
    </Button>
  );
}

function AddSuggestionForm({
  companyId,
  jobId,
  drawingId,
  sheetId,
  suggestion,
  onSuccess,
}: {
  companyId: string;
  jobId: string;
  drawingId: string;
  sheetId: string;
  suggestion: TrameadoSegmentSuggestion;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    createTrameadoSegmentAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess();
    }
  }, [onSuccess, router, state.success]);

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      <input type="hidden" name="sheetId" value={sheetId} />
      <input type="hidden" name="lengthUnit" value="mm" />
      <input
        type="hidden"
        name="segmentNumber"
        value={suggestion.suggestedLabel}
      />
      <input type="hidden" name="diameter" value={suggestion.diameter} />
      <input type="hidden" name="schedule" value={suggestion.schedule} />
      <input
        type="hidden"
        name="palilloLength"
        value={suggestion.palilloLength}
      />
      <input type="hidden" name="heatNumber" value={suggestion.heatNumber} />
      <input type="hidden" name="notes" value={suggestion.notes} />
      <AddSuggestionSubmitButton />
      {state.error ? (
        <span className="sr-only" data-testid="trameado-segment-suggestion-error">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function SuggestionItem({
  suggestion,
  companyId,
  jobId,
  drawingId,
  sheetId,
  canManage,
  onPrepareSuggestion,
  onDismiss,
  onAccepted,
}: {
  suggestion: TrameadoSegmentSuggestion;
  companyId: string;
  jobId: string;
  drawingId: string;
  sheetId: string;
  canManage: boolean;
  onPrepareSuggestion: (suggestion: TrameadoSegmentSuggestion) => void;
  onDismiss: (suggestionKey: string) => void;
  onAccepted: (suggestionKey: string) => void;
}) {
  return (
    <li
      className="rounded-md border bg-muted/15 px-3 py-2.5"
      data-testid="trameado-segment-suggestion-item"
      data-suggestion-key={suggestion.suggestionKey}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">
              Nº {suggestion.suggestedNumber} · PALILLO{" "}
              {suggestion.displayPalilloLength} mm
            </span>
            <Badge variant={confidenceBadgeVariant(suggestion.confidence)}>
              {confidenceLabel(suggestion.confidence)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
        </div>

        {canManage ? (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <AddSuggestionForm
              companyId={companyId}
              jobId={jobId}
              drawingId={drawingId}
              sheetId={sheetId}
              suggestion={suggestion}
              onSuccess={() => onAccepted(suggestion.suggestionKey)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="trameado-segment-suggestion-prepare"
              onClick={() => onPrepareSuggestion(suggestion)}
            >
              Preparar/editar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              data-testid="trameado-segment-suggestion-dismiss"
              onClick={() => onDismiss(suggestion.suggestionKey)}
            >
              Descartar
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function TrameadoSegmentSuggestionsPanel({
  companyId,
  jobId,
  drawingId,
  sheetId,
  result,
  canManage,
  onPrepareSuggestion,
}: TrameadoSegmentSuggestionsPanelProps) {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const visibleSuggestions = useMemo(
    () =>
      result.suggestions.filter(
        (suggestion) =>
          !dismissedKeys.has(suggestion.suggestionKey) &&
          !acceptedKeys.has(suggestion.suggestionKey),
      ),
    [acceptedKeys, dismissedKeys, result.suggestions],
  );

  if (!canManage && result.mode === "no_sheet") {
    return null;
  }

  return (
    <div
      className="rounded-lg border bg-card p-4"
      data-testid="trameado-segment-suggestions-panel"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Tramos sugeridos</h3>
        <p className="text-xs text-muted-foreground">
          Revisa estas propuestas antes de añadirlas a la hoja. No se guardan
          hasta que las confirmes.
        </p>
      </div>

      {result.mode === "no_sheet" ? (
        <p
          className="mt-3 text-sm text-muted-foreground"
          data-testid="trameado-segment-suggestions-no-sheet"
        >
          Crea una hoja para generar sugerencias de tramos.
        </p>
      ) : null}

      {result.mode === "unreliable" ? (
        <p
          className="mt-3 text-sm text-amber-800 dark:text-amber-200"
          data-testid="trameado-segment-suggestions-unreliable"
        >
          Sugerencias automáticas no fiables todavía para este plano. Puedes
          seguir usando las cotas candidatas manualmente.
        </p>
      ) : null}

      {visibleSuggestions.length === 0 &&
      result.mode !== "no_sheet" &&
      result.mode !== "unreliable" ? (
        <p
          className="mt-3 text-sm text-muted-foreground"
          data-testid="trameado-segment-suggestions-empty"
        >
          No hay sugerencias automáticas fiables para este plano. Puedes seguir
          usando las cotas candidatas manualmente.
        </p>
      ) : null}

      {visibleSuggestions.length > 0 ? (
        <ul className="mt-3 space-y-2" data-testid="trameado-segment-suggestions-list">
          {visibleSuggestions.map((suggestion) => (
            <SuggestionItem
              key={suggestion.suggestionKey}
              suggestion={suggestion}
              companyId={companyId}
              jobId={jobId}
              drawingId={drawingId}
              sheetId={sheetId}
              canManage={canManage}
              onPrepareSuggestion={onPrepareSuggestion}
              onDismiss={(key) =>
                setDismissedKeys((current) => new Set([...current, key]))
              }
              onAccepted={(key) =>
                setAcceptedKeys((current) => new Set([...current, key]))
              }
            />
          ))}
        </ul>
      ) : null}

      {result.warnings.length > 0 &&
      visibleSuggestions.length === 0 &&
      result.mode !== "unreliable" ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {result.warnings[0]}
        </p>
      ) : null}
    </div>
  );
}
