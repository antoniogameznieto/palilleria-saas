"use client";

import { useActionState, useState } from "react";

import {
  analyzeExperimentalTitleBlockOcrAction,
  type ExperimentalTitleBlockOcrActionState,
} from "@/lib/actions/experimental-title-block-ocr";
import {
  DEFAULT_TITLE_BLOCK_CROP_PERCENTS,
  TITLE_BLOCK_CROP_PRESETS,
  type TitleBlockCropPercents,
} from "@/lib/drawings/experimental-title-block-crop-params";
import { PDF_TEXT_PREVIEW_MAX_CHARS } from "@/lib/drawings/pdf-text-constants";
import {
  DEFAULT_OCR_PREPROCESS_STRATEGY,
  OCR_PREPROCESS_STRATEGIES,
  type OcrPreprocessStrategy,
} from "@/lib/drawings/experimental-ocr-preprocess-constants";
import { TESSERACT_SETUP_DOC } from "@/lib/drawings/tesseract-cli-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DrawingExperimentalTitleBlockOcrProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
};

const initialState: ExperimentalTitleBlockOcrActionState = {};

type CropField = keyof TitleBlockCropPercents;

const CROP_FIELDS: { key: CropField; label: string; min: number; max: number }[] =
  [
    { key: "xPercent", label: "X", min: 0, max: 95 },
    { key: "yPercent", label: "Y", min: 0, max: 95 },
    { key: "widthPercent", label: "Ancho", min: 5, max: 100 },
    { key: "heightPercent", label: "Alto", min: 5, max: 100 },
  ];

function formatCandidate(value: string | null | undefined): string {
  if (value == null || value.trim() === "") {
    return "—";
  }

  return value;
}

function parseCropFieldValue(value: string, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.round(parsed);
}

function countDetectedCandidates(
  candidates: ExperimentalTitleBlockOcrActionState["metadataCandidates"],
): number {
  if (!candidates) {
    return 0;
  }

  return [
    candidates.drawingNumber,
    candidates.lineNumber,
    candidates.revision,
  ].filter((value) => value != null && value.trim() !== "").length;
}

export function DrawingExperimentalTitleBlockOcr({
  companyId,
  jobId,
  drawingId,
}: DrawingExperimentalTitleBlockOcrProps) {
  const [cropParams, setCropParams] = useState<TitleBlockCropPercents>(
    DEFAULT_TITLE_BLOCK_CROP_PERCENTS,
  );
  const [preprocessStrategy, setPreprocessStrategy] =
    useState<OcrPreprocessStrategy>(DEFAULT_OCR_PREPROCESS_STRATEGY);
  const [state, formAction, isPending] = useActionState(
    analyzeExperimentalTitleBlockOcrAction,
    initialState,
  );

  const hasResult = state.success != null || state.error != null;
  const detectedCandidateCount = countDetectedCandidates(state.metadataCandidates);
  const hasPartialCandidates =
    hasResult && detectedCandidateCount > 0 && detectedCandidateCount < 3;
  const showMissingRevisionNotice =
    hasResult &&
    state.metadataCandidates != null &&
    (state.textPreview != null || detectedCandidateCount > 0) &&
    (state.metadataCandidates.revision == null ||
      state.metadataCandidates.revision.trim() === "");

  function updateCropField(key: CropField, rawValue: string) {
    setCropParams((current) => ({
      ...current,
      [key]: parseCropFieldValue(rawValue, current[key]),
    }));
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
        <strong>OCR experimental.</strong> Puede ayudar a leer partes del
        cajetín, pero <strong>no es fiable</strong> para completar metadatos
        automáticamente. Revisa siempre manualmente. No forma parte del flujo
        productivo de detección ni guarda resultados.
      </p>

      <div className="rounded-lg border border-border/80 bg-muted/20 px-4 py-3 text-sm">
        <p className="font-medium">Estado del experimento</p>
        <dl className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <dt className="font-medium text-foreground">Estado</dt>
            <dd>Experimental / No productivo</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Uso recomendado</dt>
            <dd>Diagnóstico visual y pruebas internas</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-foreground">Uso no recomendado</dt>
            <dd>Completar metadatos sin revisión humana</dd>
          </div>
        </dl>
      </div>

      <p className="text-xs text-muted-foreground">
        OCR real requiere Tesseract CLI en el servidor donde corre Next.js. Guía
        de instalación:{" "}
        <code className="rounded bg-muted px-1 py-0.5">{TESSERACT_SETUP_DOC}</code>
        . En local:{" "}
        <code className="rounded bg-muted px-1 py-0.5">npm run check:tesseract</code>
        .
      </p>

      <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
        <p className="text-sm font-medium">Zona del cajetín (experimental)</p>
        <p className="text-xs text-muted-foreground">
          Valores en porcentaje respecto a la primera página renderizada. Solo
          viven en esta sesión del navegador; al refrescar vuelven al default.
        </p>

        <div className="flex flex-wrap gap-2">
          {TITLE_BLOCK_CROP_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="sm"
              title={preset.recommendedFor}
              onClick={() => setCropParams({ ...preset.params })}
            >
              {preset.label}
              {preset.recommendedFor ? (
                <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-300">
                  ★
                </span>
              ) : null}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          ★ Preset recomendado para cajetines extendidos (no es el default).
        </p>

        <div className="space-y-1">
          <Label htmlFor="preprocess-strategy">Preprocesado OCR</Label>
          <select
            id="preprocess-strategy"
            className="flex h-9 w-full max-w-md rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
            value={preprocessStrategy}
            onChange={(event) =>
              setPreprocessStrategy(event.target.value as OcrPreprocessStrategy)
            }
          >
            {OCR_PREPROCESS_STRATEGIES.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Solo afecta la imagen enviada a Tesseract; la vista previa muestra
            el recorte sin procesar. Default: original.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CROP_FIELDS.map(({ key, label, min, max }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`crop-${key}`}>{label} (%)</Label>
              <Input
                id={`crop-${key}`}
                type="number"
                min={min}
                max={max}
                step={1}
                value={cropParams[key]}
                onChange={(event) => updateCropField(key, event.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          {state.success}
        </p>
      ) : null}

      {hasPartialCandidates ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          Resultado parcial. No uses estos datos sin revisión manual.
        </p>
      ) : null}

      {showMissingRevisionNotice ? (
        <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          La revisión no se ha detectado. Complétala manualmente si procede.
        </p>
      ) : null}

      {state.cropImageDataUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Vista previa del cajetín analizado</p>
          {state.cropZoneLabel ? (
            <p className="text-xs font-medium text-muted-foreground">
              {state.cropZoneLabel}
            </p>
          ) : null}
          {state.preprocessLabel ? (
            <p className="text-xs font-medium text-muted-foreground">
              Preprocesado: {state.preprocessLabel}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Recorte usado para OCR experimental. No se guarda en disco ni en
            base de datos.
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
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Sugerencias parseadas (solo diagnóstico)
          </p>
          <p className="text-xs text-muted-foreground">
            No se guardan ni se aplican al plano. Compara con el PDF antes de
            usar cualquier valor.
          </p>
        <dl className="grid gap-3 rounded-lg border bg-muted/10 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Nº plano (sugerencia)</dt>
            <dd className="mt-1 font-medium">
              {formatCandidate(state.metadataCandidates.drawingNumber)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Línea (sugerencia)</dt>
            <dd className="mt-1 font-medium">
              {formatCandidate(state.metadataCandidates.lineNumber)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Revisión (sugerencia)</dt>
            <dd className="mt-1 font-medium">
              {formatCandidate(state.metadataCandidates.revision)}
            </dd>
          </div>
        </dl>
        </div>
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
        <input type="hidden" name="xPercent" value={cropParams.xPercent} />
        <input type="hidden" name="yPercent" value={cropParams.yPercent} />
        <input
          type="hidden"
          name="widthPercent"
          value={cropParams.widthPercent}
        />
        <input
          type="hidden"
          name="heightPercent"
          value={cropParams.heightPercent}
        />
        <input
          type="hidden"
          name="preprocessStrategy"
          value={preprocessStrategy}
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending
            ? "Ejecutando diagnóstico OCR..."
            : "Ejecutar diagnóstico OCR (experimental)"}
        </Button>
      </form>
    </div>
  );
}
