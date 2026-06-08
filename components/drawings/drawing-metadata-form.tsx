"use client";

import { useActionState, useState } from "react";
import type { DrawingStatus } from "@prisma/client";

import type { AuthActionState } from "@/lib/actions/auth";
import { updateDrawingMetadataAction } from "@/lib/actions/drawing";
import { DrawingStatusBadge } from "@/components/drawings/drawing-status-badge";
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
  originalFileName: string;
  status: DrawingStatus;
  fileSize: bigint | null;
  createdAt: Date;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  createdByLabel: string;
};

const initialState: AuthActionState = {};

export function DrawingMetadataForm({
  companyId,
  jobId,
  drawingId,
  originalFileName,
  status,
  fileSize,
  createdAt,
  drawingNumber,
  lineNumber,
  revision,
  createdByLabel,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metadatos del plano</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Archivo</dt>
            <dd className="mt-1 font-medium">{originalFileName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Estado</dt>
            <dd className="mt-1">
              <DrawingStatusBadge status={status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tamaño</dt>
            <dd className="mt-1 font-medium">
              <FileSize bytes={fileSize} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Fecha de subida</dt>
            <dd className="mt-1 font-medium">
              {createdAt.toLocaleString("es-ES")}
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

          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
