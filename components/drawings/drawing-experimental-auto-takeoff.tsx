"use client";

import { useActionState } from "react";

import {
  analyzeExperimentalAutoTakeoffAction,
  type ExperimentalAutoTakeoffActionState,
} from "@/lib/actions/experimental-auto-takeoff";
import { Button } from "@/components/ui/button";

type DrawingExperimentalAutoTakeoffProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  existingTakeoffLineCount: number;
};

const initialState: ExperimentalAutoTakeoffActionState = {};

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

export function DrawingExperimentalAutoTakeoff({
  companyId,
  jobId,
  drawingId,
  existingTakeoffLineCount,
}: DrawingExperimentalAutoTakeoffProps) {
  const [state, formAction, isPending] = useActionState(
    analyzeExperimentalAutoTakeoffAction,
    initialState,
  );

  const hasResult = state.success != null || state.error != null;
  const suggestedItems = state.suggestedItems ?? [];
  const hasSuggestions = suggestedItems.length > 0;
  const noEmbeddedText =
    hasResult &&
    state.hasEmbeddedText === false &&
    !state.error &&
    suggestedItems.length === 0;
  const emptyBom =
    hasResult &&
    !state.error &&
    state.hasEmbeddedText === true &&
    suggestedItems.length === 0;

  return (
    <div
      className="space-y-4"
      data-testid="experimental-auto-takeoff-section"
    >
      <p className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:text-sky-100">
        <strong>Extracción experimental.</strong> No guarda líneas ni sustituye
        la revisión manual. Las sugerencias provienen del texto embebido del PDF
        (relación de materiales); no se importan a la palillería real.
      </p>

      <p className="text-xs text-muted-foreground">
        Palillería actual en este plano:{" "}
        <strong>{existingTakeoffLineCount}</strong> línea(s). Estas sugerencias
        no se han comparado automáticamente con la palillería existente.
      </p>

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
          {state.sectionsFound && state.sectionsFound.length > 0
            ? ` Secciones detectadas: ${state.sectionsFound.join(", ")}.`
            : null}
        </p>
      ) : null}

      {hasResult && hasSuggestions ? (
        <div
          className="space-y-3"
          data-testid="experimental-auto-takeoff-results"
        >
          <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div>
              <dt className="font-medium text-foreground">Filas sugeridas</dt>
              <dd>{suggestedItems.length}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Confianza media</dt>
              <dd>{formatConfidence(state.averageConfidence)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Texto analizado</dt>
              <dd>
                {state.textLength != null
                  ? `${state.textLength.toLocaleString("es-ES")} caracteres`
                  : "—"}
              </dd>
            </div>
          </dl>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Ítem</th>
                  <th className="px-3 py-2 font-medium">Referencia</th>
                  <th className="px-3 py-2 font-medium">Cant.</th>
                  <th className="px-3 py-2 font-medium">Ud.</th>
                  <th className="px-3 py-2 font-medium">Descripción</th>
                  <th className="px-3 py-2 font-medium">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {suggestedItems.map((row, index) => (
                  <tr
                    key={`${row.item ?? "x"}-${index}`}
                    className="border-b border-border/60 last:border-0"
                  >
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {state.warnings && state.warnings.length > 0 ? (
        <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <p className="font-medium">Advertencias</p>
          <ul className="list-disc space-y-1 pl-4">
            {state.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="drawingId" value={drawingId} />
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          data-testid="experimental-auto-takeoff-run"
        >
          {isPending
            ? "Analizando..."
            : "Analizar relación de materiales"}
        </Button>
      </form>
    </div>
  );
}
