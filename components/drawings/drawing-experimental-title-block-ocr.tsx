"use client";

import { useActionState } from "react";

import {
  analyzeExperimentalTitleBlockOcrAction,
  type ExperimentalTitleBlockOcrActionState,
} from "@/lib/actions/experimental-title-block-ocr";
import { PDF_TEXT_PREVIEW_MAX_CHARS } from "@/lib/drawings/pdf-text-constants";
import { Button } from "@/components/ui/button";

type DrawingExperimentalTitleBlockOcrProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
};

const initialState: ExperimentalTitleBlockOcrActionState = {};

function formatCandidate(value: string | null | undefined): string {
  if (value == null || value.trim() === "") {
    return "—";
  }

  return value;
}

export function DrawingExperimentalTitleBlockOcr({
  companyId,
  jobId,
  drawingId,
}: DrawingExperimentalTitleBlockOcrProps) {
  const [state, formAction, isPending] = useActionState(
    analyzeExperimentalTitleBlockOcrAction,
    initialState,
  );

  const hasResult = state.success != null || state.error != null;

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
        Funcionalidad <strong>experimental</strong> (Fases 10B–10C). Analiza la
        zona del cajetín con OCR local si Tesseract está disponible. No aplica
        metadatos automáticamente ni persiste resultados.
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

      {state.cropImageDataUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Vista previa del cajetín analizado</p>
          <p className="text-xs text-muted-foreground">
            Esta es la zona inferior derecha del plano usada para OCR
            experimental (recorte heurístico 35 % × 25 %). No se guarda en
            disco ni en base de datos.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral data URL from server action */}
          <img
            src={state.cropImageDataUrl}
            alt="Recorte del cajetín usado para OCR experimental"
            className="max-h-80 w-full max-w-xl rounded-lg border bg-white object-contain"
          />
        </div>
      ) : null}

      {hasResult && state.warnings && state.warnings.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Avisos</p>
          <ul className="space-y-1 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {state.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.metadataCandidates ? (
        <dl className="grid gap-3 rounded-lg border bg-muted/10 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Nº plano (candidato)</dt>
            <dd className="mt-1 font-medium">
              {formatCandidate(state.metadataCandidates.drawingNumber)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Línea (candidato)</dt>
            <dd className="mt-1 font-medium">
              {formatCandidate(state.metadataCandidates.lineNumber)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Revisión (candidato)</dt>
            <dd className="mt-1 font-medium">
              {formatCandidate(state.metadataCandidates.revision)}
            </dd>
          </div>
        </dl>
      ) : null}

      {state.textPreview ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Texto OCR (vista previa, máx.{" "}
            {PDF_TEXT_PREVIEW_MAX_CHARS.toLocaleString("es-ES")} caracteres). No
            se guarda en base de datos.
          </p>
          <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
            {state.textPreview}
          </pre>
        </div>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="drawingId" value={drawingId} />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Analizando cajetín..." : "Analizar cajetín con OCR"}
        </Button>
      </form>
    </div>
  );
}
