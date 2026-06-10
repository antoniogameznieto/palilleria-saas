"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import { createSuggestedTrameadoSheetsAction } from "@/lib/actions/trameado";
import { Button } from "@/components/ui/button";
import type { TrameadoSheetSuggestion } from "@/lib/trameado/suggestions";
import { cn } from "@/lib/utils";

type TrameadoSheetAssistantProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  suggestions: TrameadoSheetSuggestion[];
  onSheetsCreated?: (sheetIds: string[]) => void;
  variant?: "prominent" | "compact";
  defaultExpanded?: boolean;
};

const initialState: AuthActionState = {};

function formatConfidenceLabel(
  confidence: TrameadoSheetSuggestion["confidence"],
): string {
  switch (confidence) {
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    default:
      return "Baja";
  }
}

function formatSourceLabel(source: TrameadoSheetSuggestion["source"]): string {
  switch (source) {
    case "metadata_bom":
      return "Metadatos + BOM";
    case "bom":
      return "BOM";
    case "related_drawing":
      return "Plano relacionado";
    case "pair_pattern":
      return "Patrón -01/-02";
    default:
      return "Metadatos";
  }
}

export function TrameadoSheetAssistant({
  companyId,
  jobId,
  drawingId,
  suggestions,
  onSheetsCreated,
  variant = "prominent",
  defaultExpanded = true,
}: TrameadoSheetAssistantProps) {
  const router = useRouter();
  const isCompact = variant === "compact";
  const [expanded, setExpanded] = useState(defaultExpanded);
  const creatableSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !suggestion.alreadyExists),
    [suggestions],
  );
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    creatableSuggestions.map((suggestion) => suggestion.suggestionKey),
  );
  const [state, formAction, isPending] = useActionState(
    createSuggestedTrameadoSheetsAction,
    initialState,
  );

  useEffect(() => {
    if (state.success && state.trameadoSheetIds?.length) {
      router.refresh();
      onSheetsCreated?.(state.trameadoSheetIds);
    }
  }, [onSheetsCreated, router, state.success, state.trameadoSheetIds]);

  if (creatableSuggestions.length === 0) {
    return null;
  }

  const selectedSuggestions = creatableSuggestions.filter((suggestion) =>
    selectedKeys.includes(suggestion.suggestionKey),
  );

  const payload = JSON.stringify({
    suggestions: selectedSuggestions.map((suggestion) => ({
      lineIdentifier: suggestion.lineIdentifier,
      lineClass: suggestion.lineClass,
      notes: suggestion.notes,
    })),
  });

  const summaryLabel = selectedSuggestions
    .map((suggestion) => suggestion.lineIdentifier)
    .join(", ");

  return (
    <section
      className={cn(
        "rounded-lg border",
        isCompact
          ? "border-border bg-muted/20 p-3"
          : "border-primary/20 bg-primary/5 p-4",
      )}
      data-testid="trameado-sheet-assistant"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h4 className="text-sm font-semibold">
            {isCompact ? "Asistente de hoja" : "Asistente de hoja de palilleo"}
          </h4>
          {!isCompact || expanded ? (
            <p className="text-sm text-muted-foreground">
              Prepara la hoja con ISO, Ø y SCH. Las longitudes se introducen
              manualmente desde el plano.
            </p>
          ) : (
            <p className="truncate text-xs text-muted-foreground">{summaryLabel}</p>
          )}
        </div>
        {isCompact ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            data-testid="trameado-sheet-assistant-toggle"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Ocultar" : "Mostrar"}
          </Button>
        ) : null}
      </div>

      {(!isCompact || expanded) && (
        <div className="mt-3 space-y-4">
          {!isCompact ? (
            <p
              className="text-xs text-amber-800 dark:text-amber-200"
              data-testid="trameado-assistant-no-segments-warning"
            >
              No se crearán tramos ni longitudes automáticamente.
            </p>
          ) : null}

          <ul className="space-y-2">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.suggestionKey}
                className={cn(
                  "rounded-md border bg-background px-3 py-2.5 text-sm",
                  suggestion.alreadyExists && "opacity-70",
                )}
                data-testid="trameado-sheet-suggestion"
                data-suggestion-key={suggestion.suggestionKey}
              >
                <div className="flex flex-wrap items-start gap-3">
                  {suggestion.alreadyExists ? (
                    <span className="mt-0.5 text-xs font-medium text-muted-foreground">
                      Ya existe
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      className="mt-1 size-4 rounded border-input"
                      data-testid="trameado-sheet-suggestion-checkbox"
                      checked={selectedKeys.includes(suggestion.suggestionKey)}
                      onChange={(event) => {
                        setSelectedKeys((current) =>
                          event.target.checked
                            ? [...current, suggestion.suggestionKey]
                            : current.filter(
                                (key) => key !== suggestion.suggestionKey,
                              ),
                        );
                      }}
                    />
                  )}

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">
                        {suggestion.lineIdentifier}
                      </span>
                      {suggestion.lineClass ? (
                        <span className="text-muted-foreground">
                          CLASE {suggestion.lineClass}
                        </span>
                      ) : null}
                      {suggestion.diameter ? (
                        <span data-testid="trameado-suggestion-diameter">
                          Ø {suggestion.diameter}
                        </span>
                      ) : null}
                      {suggestion.schedule ? (
                        <span data-testid="trameado-suggestion-schedule">
                          SCH {suggestion.schedule}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatSourceLabel(suggestion.source)}</span>
                      <span>
                        Confianza {formatConfidenceLabel(suggestion.confidence)}
                      </span>
                    </div>

                    {!isCompact ? (
                      <p className="text-xs text-muted-foreground">
                        {suggestion.reason}
                      </p>
                    ) : null}

                    {suggestion.warnings.map((warning) => (
                      <p
                        key={warning}
                        className="text-xs text-amber-800 dark:text-amber-200"
                      >
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {state.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          {state.success ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              {state.success}
            </p>
          ) : null}

          <form action={formAction}>
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="drawingId" value={drawingId} />
            <input
              type="hidden"
              name="suggestionsPayload"
              value={payload}
              readOnly
            />

            <Button
              type="submit"
              size={isCompact ? "sm" : "default"}
              disabled={isPending || selectedSuggestions.length === 0}
              data-testid="trameado-create-suggested-sheets"
            >
              {isPending ? "Creando hojas..." : "Crear hojas sugeridas"}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
