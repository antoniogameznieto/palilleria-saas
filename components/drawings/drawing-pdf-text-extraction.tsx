"use client";

import { useActionState } from "react";

import { extractDrawingPdfTextAction } from "@/lib/actions/drawing-pdf-text";
import type { DrawingPdfTextExtractionActionState } from "@/lib/actions/drawing-pdf-text";
import { PDF_TEXT_PREVIEW_MAX_CHARS } from "@/lib/drawings/pdf-text-constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DrawingPdfTextExtractionProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  plain?: boolean;
};

const initialState: DrawingPdfTextExtractionActionState = {};

export function DrawingPdfTextExtraction({
  companyId,
  jobId,
  drawingId,
  plain = false,
}: DrawingPdfTextExtractionProps) {
  const [state, formAction, isPending] = useActionState(
    extractDrawingPdfTextAction,
    initialState,
  );

  const hasExtracted = state.success != null || state.error != null;
  const noEmbeddedText =
    hasExtracted && state.hasEmbeddedText === false && !state.error;

  const content = (
    <div className="space-y-4">
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
          Este PDF no contiene texto embebido legible. Puede ser un plano
          escaneado o vectorial sin capa de texto.
        </p>
      ) : null}

      {state.hasEmbeddedText && state.preview ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Vista previa (máx.{" "}
            {PDF_TEXT_PREVIEW_MAX_CHARS.toLocaleString("es-ES")} caracteres).
            Solo lectura; no se guarda ni modifica datos.
          </p>
          <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
            {state.preview}
          </pre>
        </div>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="companyId" value={companyId} />
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="drawingId" value={drawingId} />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Extrayendo..." : "Extraer texto del PDF"}
        </Button>
      </form>
    </div>
  );

  if (plain) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Herramientas de diagnóstico</CardTitle>
        <CardDescription>
          Vista previa del texto embebido del PDF. No modifica metadatos ni
          palillería. No necesitas ejecutar esto para detectar metadatos.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
