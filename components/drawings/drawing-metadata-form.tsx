"use client";

import { useActionState, useState } from "react";

import type { AuthActionState } from "@/lib/actions/auth";
import { updateDrawingMetadataAction } from "@/lib/actions/drawing";
import { FileSize } from "@/components/drawings/file-size";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DrawingMetadataFormProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  fileSize: bigint | null;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  createdByLabel: string;
  plain?: boolean;
  secondarySubmit?: boolean;
};

const initialState: AuthActionState = {};

export function DrawingMetadataForm({
  companyId,
  jobId,
  drawingId,
  fileSize,
  drawingNumber,
  lineNumber,
  revision,
  createdByLabel,
  plain = false,
  secondarySubmit = false,
}: DrawingMetadataFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateDrawingMetadataAction,
    initialState,
  );

  const [values, setValues] = useState({
    drawingNumber: drawingNumber ?? "",
    lineNumber: lineNumber ?? "",
    revision: revision ?? "",
  });

  const content = (
    <div className="space-y-6">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Tamaño</dt>
            <dd className="mt-1 font-medium">
              <FileSize bytes={fileSize} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Subido por</dt>
            <dd className="mt-1 font-medium">{createdByLabel}</dd>
          </div>
        </dl>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="drawingId" value={drawingId} />

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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="drawingNumber">Número de plano</Label>
              <Input
                id="drawingNumber"
                name="drawingNumber"
                value={values.drawingNumber}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    drawingNumber: event.target.value,
                  }))
                }
                maxLength={200}
                placeholder="Ej. ISO-001"
              />
              {state.fieldErrors?.drawingNumber ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.drawingNumber[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lineNumber">Número de línea</Label>
              <Input
                id="lineNumber"
                name="lineNumber"
                value={values.lineNumber}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    lineNumber: event.target.value,
                  }))
                }
                maxLength={200}
                placeholder="Ej. L-100"
              />
              {state.fieldErrors?.lineNumber ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.lineNumber[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="revision">Revisión</Label>
              <Input
                id="revision"
                name="revision"
                value={values.revision}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    revision: event.target.value,
                  }))
                }
                maxLength={200}
                placeholder="Ej. A"
              />
              {state.fieldErrors?.revision ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.revision[0]}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            type="submit"
            variant={secondarySubmit ? "outline" : "default"}
            disabled={isPending}
            data-testid={
              secondarySubmit ? "drawing-metadata-manual-save" : undefined
            }
          >
            {isPending
              ? "Guardando..."
              : secondarySubmit
                ? "Guardar ajuste manual"
                : "Guardar"}
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
        <CardTitle>Metadatos del plano</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
