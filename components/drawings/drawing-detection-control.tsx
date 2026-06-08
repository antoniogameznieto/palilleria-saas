"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DrawingStatus } from "@prisma/client";

import type { AuthActionState } from "@/lib/actions/auth";
import {
  completeSimulatedDrawingDetectionAction,
  startDrawingDetectionAction,
} from "@/lib/actions/drawing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DrawingDetectionControlProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  status: DrawingStatus;
};

const initialState: AuthActionState = {};

function FeedbackMessage({ state }: { state: AuthActionState }) {
  if (state.error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        {state.success}
      </p>
    );
  }

  return null;
}

export function DrawingDetectionControl({
  companyId,
  jobId,
  drawingId,
  status,
}: DrawingDetectionControlProps) {
  const [startState, startAction, isStarting] = useActionState(
    startDrawingDetectionAction,
    initialState,
  );
  const [completeState, completeAction, isCompleting] = useActionState(
    completeSimulatedDrawingDetectionAction,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (startState.success || completeState.success) {
      router.refresh();
    }
  }, [completeState.success, router, startState.success]);

  const isProcessing = status === "processing";
  const feedback = startState.error || startState.success
    ? startState
    : completeState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detección automática</CardTitle>
        <CardDescription>
          Inicia el flujo de detección de metadatos del plano. Por ahora se
          analiza el nombre del archivo, sin leer el contenido del PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FeedbackMessage state={feedback} />

        {isProcessing ? (
          <p className="text-sm text-muted-foreground">
            El plano está en procesamiento. Usa el botón siguiente para simular
            la finalización de la detección.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!isProcessing ? (
            <form action={startAction}>
              <input type="hidden" name="companyId" value={companyId} />
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="drawingId" value={drawingId} />
              <Button type="submit" disabled={isStarting}>
                {isStarting ? "Iniciando..." : "Detectar metadatos"}
              </Button>
            </form>
          ) : null}

          {isProcessing ? (
            <form action={completeAction}>
              <input type="hidden" name="companyId" value={companyId} />
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="drawingId" value={drawingId} />
              <Button type="submit" variant="outline" disabled={isCompleting}>
                {isCompleting
                  ? "Completando..."
                  : "Completar detección simulada"}
              </Button>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
