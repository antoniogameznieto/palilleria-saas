"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import { confirmDetectedDrawingMetadataAction } from "@/lib/actions/drawing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DrawingDetectedMetadataReviewProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  canConfirm: boolean;
  plain?: boolean;
};

const initialState: AuthActionState = {};

function formatMetadataValue(value: string | null): string {
  if (value == null || value.trim() === "") {
    return "—";
  }

  return value;
}

export function DrawingDetectedMetadataReview({
  companyId,
  jobId,
  drawingId,
  drawingNumber,
  lineNumber,
  revision,
  canConfirm,
  plain = false,
}: DrawingDetectedMetadataReviewProps) {
  const [state, formAction, isPending] = useActionState(
    confirmDetectedDrawingMetadataAction,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  const content = (
    <div className="space-y-4">
        <dl className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Número de plano</dt>
            <dd className="mt-1 font-medium">
              {formatMetadataValue(drawingNumber)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Número de línea</dt>
            <dd className="mt-1 font-medium">{formatMetadataValue(lineNumber)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Revisión</dt>
            <dd className="mt-1 font-medium">{formatMetadataValue(revision)}</dd>
          </div>
        </dl>

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

        {canConfirm ? (
          <form action={formAction}>
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="drawingId" value={drawingId} />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Confirmando..." : "Confirmar metadatos"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pendiente de confirmación por un ingeniero o administrador.
          </p>
        )}
    </div>
  );

  if (plain) {
    return (
      <div className="space-y-3 rounded-md border-l-2 border-amber-500/50 bg-amber-500/5 px-3 py-3">
        <h4 className="text-sm font-medium">
          Metadatos detectados pendientes de revisión
        </h4>
        <p className="text-xs text-muted-foreground">
          Revisa los metadatos propuestos desde el nombre del archivo y/o el
          texto embebido del PDF.
        </p>
        <div className="pt-1">{content}</div>
      </div>
    );
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle>Metadatos detectados pendientes de revisión</CardTitle>
        <CardDescription>
          Revisa los metadatos propuestos desde el nombre del archivo y/o el
          texto embebido del PDF antes de marcar el plano como revisado.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
