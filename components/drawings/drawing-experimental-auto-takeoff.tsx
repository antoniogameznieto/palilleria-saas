"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  analyzeExperimentalAutoTakeoffAction,
  importExperimentalAutoTakeoffSuggestionsAction,
  type ExperimentalAutoTakeoffActionState,
  type ExperimentalAutoTakeoffImportActionState,
} from "@/lib/actions/experimental-auto-takeoff";
import {
  TAKEOFF_COMPARISON_STATUS_BADGE_CLASS,
  TAKEOFF_COMPARISON_STATUS_LABELS,
} from "@/lib/drawings/experimental-auto-takeoff-compare-labels";
import type { TakeoffComparisonStatus } from "@/lib/drawings/experimental-auto-takeoff-compare";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DrawingExperimentalAutoTakeoffProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  existingTakeoffLineCount: number;
};

const initialAnalyzeState: ExperimentalAutoTakeoffActionState = {};
const initialImportState: ExperimentalAutoTakeoffImportActionState = {};

function formatCell(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "—";
  }

  return String(value);
}

function formatConfidence(value: number | undefined): string {
  if (value == null) {
    return "—";
  }

  return value.toFixed(2);
}

function ComparisonStatusBadge({
  status,
}: {
  status: TakeoffComparisonStatus | undefined;
}) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <Badge
      variant="outline"
      className={TAKEOFF_COMPARISON_STATUS_BADGE_CLASS[status]}
    >
      {TAKEOFF_COMPARISON_STATUS_LABELS[status]}
    </Badge>
  );
}

function formatComparisonSummary(
  suggestedCount: number,
  summary: ExperimentalAutoTakeoffActionState["comparisonSummary"],
): string | null {
  if (!summary) {
    return null;
  }

  return [
    `${suggestedCount} sugeridas`,
    `${summary.matchedCount} ya existen`,
    `${summary.missingCount} faltan`,
    `${summary.differentQuantityCount} distintas`,
    `${summary.uncertainCount} dudosas`,
  ].join(" · ");
}

export function DrawingExperimentalAutoTakeoff({
  companyId,
  jobId,
  drawingId,
  existingTakeoffLineCount,
}: DrawingExperimentalAutoTakeoffProps) {
  const router = useRouter();
  const [analyzeState, analyzeAction, analyzePending] = useActionState(
    analyzeExperimentalAutoTakeoffAction,
    initialAnalyzeState,
  );
  const [importState, importAction, importPending] = useActionState(
    importExperimentalAutoTakeoffSuggestionsAction,
    initialImportState,
  );
  const suggestedItems = useMemo(
    () => analyzeState.suggestedItems ?? [],
    [analyzeState.suggestedItems],
  );
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const hasResult = analyzeState.success != null || analyzeState.error != null;
  const hasSuggestions = suggestedItems.length > 0;
  const existingCount =
    analyzeState.existingTakeoffCount ?? existingTakeoffLineCount;
  const comparisonLine = formatComparisonSummary(
    suggestedItems.length,
    analyzeState.comparisonSummary,
  );
  const missingItems = useMemo(
    () =>
      suggestedItems.filter(
        (item) =>
          item.comparisonStatus === "missing" && item.suggestionKey.length > 0,
      ),
    [suggestedItems],
  );
  const analysisFingerprint = useMemo(
    () => suggestedItems.map((item) => item.suggestionKey).join("|"),
    [suggestedItems],
  );
  const [selectionFingerprint, setSelectionFingerprint] =
    useState(analysisFingerprint);

  if (selectionFingerprint !== analysisFingerprint) {
    setSelectionFingerprint(analysisFingerprint);
    setSelectedKeys(
      analysisFingerprint
        ? new Set(missingItems.map((item) => item.suggestionKey))
        : new Set(),
    );
  }

  useEffect(() => {
    if (importState.success) {
      router.refresh();
    }
  }, [importState.success, router]);

  const noEmbeddedText =
    hasResult &&
    analyzeState.hasEmbeddedText === false &&
    !analyzeState.error &&
    suggestedItems.length === 0;
  const emptyBom =
    hasResult &&
    !analyzeState.error &&
    analyzeState.hasEmbeddedText === true &&
    suggestedItems.length === 0;

  function toggleSelection(key: string, checked: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  }

  function selectAllMissing() {
    setSelectedKeys(new Set(missingItems.map((item) => item.suggestionKey)));
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  function handleImportSubmit(event: React.FormEvent<HTMLFormElement>) {
    const count = selectedKeys.size;

    if (count === 0) {
      event.preventDefault();
      return;
    }

    const confirmed = window.confirm(
      `Se crearán ${count} línea(s) reales de palillería. Esta acción invalidará la revisión de palillería si estaba marcada. ¿Continuar?`,
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <div
      className="space-y-4"
      data-testid="experimental-auto-takeoff-section"
    >
      <p className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:text-sky-100">
        <strong>Extracción e importación experimental.</strong> Puedes analizar la
        relación de materiales del PDF y, con selección explícita, crear líneas
        reales de palillería. Revisa siempre antes de importar.
      </p>

      <p className="text-xs text-muted-foreground">
        Palillería actual en este plano: <strong>{existingCount}</strong>{" "}
        línea(s).
        {comparisonLine ? (
          <>
            {" "}
            Comparación:{" "}
            <span
              className="font-medium text-foreground"
              data-testid="experimental-auto-takeoff-comparison-summary"
            >
              {comparisonLine}
            </span>
          </>
        ) : (
          " Ejecuta el análisis para comparar con la palillería existente."
        )}
      </p>

      {analyzeState.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {analyzeState.error}
        </p>
      ) : null}

      {importState.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {importState.error}
        </p>
      ) : null}

      {analyzeState.success ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {analyzeState.success}
        </p>
      ) : null}

      {importState.success ? (
        <p
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
          data-testid="experimental-auto-takeoff-import-success"
        >
          {importState.success} Vuelve a analizar para actualizar la comparación.
        </p>
      ) : null}

      {noEmbeddedText ? (
        <p className="rounded-lg border border-dashed bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          Este PDF no contiene texto embebido útil. Puede ser un plano escaneado
          o vectorial sin capa de texto.
        </p>
      ) : null}

      {emptyBom ? (
        <p className="rounded-lg border border-dashed bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          No se encontró una relación de materiales con filas parseables en el
          texto embebido.
          {analyzeState.sectionsFound && analyzeState.sectionsFound.length > 0
            ? ` Secciones detectadas: ${analyzeState.sectionsFound.join(", ")}.`
            : null}
        </p>
      ) : null}

      {hasResult && hasSuggestions ? (
        <div
          className="space-y-3"
          data-testid="experimental-auto-takeoff-results"
        >
          {comparisonLine ? (
            <p className="text-sm font-medium text-foreground">{comparisonLine}</p>
          ) : null}

          <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div>
              <dt className="font-medium text-foreground">Filas sugeridas</dt>
              <dd>{suggestedItems.length}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Confianza media</dt>
              <dd>{formatConfidence(analyzeState.averageConfidence)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Texto analizado</dt>
              <dd>
                {analyzeState.textLength != null
                  ? `${analyzeState.textLength.toLocaleString("es-ES")} caracteres`
                  : "—"}
              </dd>
            </div>
          </dl>

          {missingItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className="font-medium text-foreground"
                data-testid="experimental-auto-takeoff-selected-count"
              >
                {selectedKeys.size} sugerencia(s) seleccionada(s) para importar
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={selectAllMissing}
              >
                Seleccionar todas las faltantes
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={clearSelection}
              >
                Deseleccionar todo
              </Button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Importar</th>
                  <th className="px-3 py-2 font-medium">Ítem</th>
                  <th className="px-3 py-2 font-medium">Referencia</th>
                  <th className="px-3 py-2 font-medium">Cant.</th>
                  <th className="px-3 py-2 font-medium">Ud.</th>
                  <th className="px-3 py-2 font-medium">Descripción</th>
                  <th className="px-3 py-2 font-medium">Conf.</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {suggestedItems.map((row, index) => {
                  const importable = row.comparisonStatus === "missing";

                  return (
                    <tr
                      key={`${row.suggestionKey}-${index}`}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-3 py-2 align-top">
                        {importable ? (
                          <input
                            type="checkbox"
                            className="size-4 rounded border border-input"
                            checked={selectedKeys.has(row.suggestionKey)}
                            onChange={(event) =>
                              toggleSelection(
                                row.suggestionKey,
                                event.target.checked,
                              )
                            }
                            data-testid="experimental-auto-takeoff-select-row"
                            aria-label={`Seleccionar sugerencia ${row.item ?? index + 1}`}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">{formatCell(row.item)}</td>
                      <td className="px-3 py-2 align-top font-mono text-xs">
                        {formatCell(row.reference)}
                      </td>
                      <td className="px-3 py-2 align-top">{formatCell(row.quantity)}</td>
                      <td className="px-3 py-2 align-top">{formatCell(row.unit)}</td>
                      <td className="px-3 py-2 align-top text-xs">
                        {formatCell(row.description)}
                      </td>
                      <td className="px-3 py-2 align-top text-xs">
                        {formatConfidence(row.confidence)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <ComparisonStatusBadge status={row.comparisonStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {missingItems.length > 0 ? (
            <form action={importAction} onSubmit={handleImportSubmit}>
              <input type="hidden" name="companyId" value={companyId} />
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="drawingId" value={drawingId} />
              <input
                type="hidden"
                name="selectedSuggestionKeys"
                value={JSON.stringify([...selectedKeys])}
              />
              <p className="mb-2 text-xs text-muted-foreground">
                Comparación experimental. No importa filas ya existentes ni
                dudosas. Solo se validan sugerencias que sigan faltando tras
                re-leer el PDF en el servidor.
              </p>
              <Button
                type="submit"
                variant="default"
                disabled={importPending || selectedKeys.size === 0}
                data-testid="experimental-auto-takeoff-import"
              >
                {importPending
                  ? "Importando..."
                  : "Importar seleccionadas (experimental)"}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {analyzeState.warnings && analyzeState.warnings.length > 0 ? (
        <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <p className="font-medium">Advertencias</p>
          <ul className="list-disc space-y-1 pl-4">
            {analyzeState.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form action={analyzeAction}>
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="drawingId" value={drawingId} />
        <Button
          type="submit"
          variant="outline"
          disabled={analyzePending}
          data-testid="experimental-auto-takeoff-run"
        >
          {analyzePending
            ? "Analizando..."
            : "Analizar relación de materiales"}
        </Button>
      </form>
    </div>
  );
}
