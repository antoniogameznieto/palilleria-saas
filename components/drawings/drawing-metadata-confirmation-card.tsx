"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import { confirmDrawingMetadataAction } from "@/lib/actions/drawing";
import { WorkflowStepBadgeById } from "@/components/jobs/workflow-step-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DrawingMetadataSuggestion } from "@/lib/drawings/metadata-suggestions";
import { resolveDrawingMetadataFormDefaults } from "@/lib/drawings/metadata-suggestions";

type DrawingMetadataConfirmationCardProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  originalFileName: string;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  suggestion: DrawingMetadataSuggestion;
  canConfirm: boolean;
};

const initialState: AuthActionState = {};

export function DrawingMetadataConfirmationCard({
  companyId,
  jobId,
  drawingId,
  originalFileName,
  drawingNumber,
  lineNumber,
  revision,
  suggestion,
  canConfirm,
}: DrawingMetadataConfirmationCardProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    confirmDrawingMetadataAction,
    initialState,
  );
  const defaults = resolveDrawingMetadataFormDefaults({
    originalFileName,
    drawingNumber,
    lineNumber,
    revision,
  });

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <section
      id="drawing-metadata-confirmation"
      className="rounded-xl border-2 border-primary/25 bg-primary/5 p-4 shadow-sm"
      data-testid="drawing-metadata-confirmation-card"
    >
      <header className="space-y-2">
        <WorkflowStepBadgeById
          stepId="complete_metadata"
          className="text-primary"
        />
        <h2 className="text-lg font-semibold leading-tight">
          Confirma los metadatos del plano
        </h2>
        <p className="text-sm text-muted-foreground">
          Hemos preparado una propuesta a partir del nombre del archivo. Revísala
          y confirma para poder seguir con materiales, palillería y trameado.
        </p>
        {suggestion.hasSuggestion ? (
          <p className="text-xs text-muted-foreground">
            Propuesta detectada desde{" "}
            <span className="font-medium text-foreground">{originalFileName}</span>
            .
          </p>
        ) : null}
      </header>

      {canConfirm ? (
        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="drawingId" value={drawingId} />

          {state.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          {state.success ? (
            <p
              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
              data-testid="drawing-metadata-confirmation-success"
            >
              {state.success}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="metadata-confirmation-drawingNumber">Nº plano</Label>
              <Input
                id="metadata-confirmation-drawingNumber"
                name="drawingNumber"
                defaultValue={defaults.drawingNumber}
                maxLength={200}
                data-testid="drawing-metadata-suggestion-drawing-number"
              />
              {state.fieldErrors?.drawingNumber ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.drawingNumber[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata-confirmation-lineNumber">Línea</Label>
              <Input
                id="metadata-confirmation-lineNumber"
                name="lineNumber"
                defaultValue={defaults.lineNumber}
                maxLength={200}
                data-testid="drawing-metadata-suggestion-line-number"
              />
              {state.fieldErrors?.lineNumber ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.lineNumber[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata-confirmation-revision">Revisión</Label>
              <Input
                id="metadata-confirmation-revision"
                name="revision"
                defaultValue={defaults.revision}
                maxLength={200}
                data-testid="drawing-metadata-suggestion-revision"
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
            disabled={isPending}
            data-testid="drawing-metadata-confirm-submit"
          >
            {isPending ? "Confirmando..." : "Confirmar metadatos"}
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Tu rol permite consultar la propuesta, pero no confirmar metadatos.
        </p>
      )}
    </section>
  );
}
