"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import { createTrameadoSheetAction } from "@/lib/actions/trameado";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TrameadoSheetFormProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  suggestedLineIdentifier: string | null;
  onCancel?: () => void;
  onSuccess?: (sheetId: string) => void;
};

const initialState: AuthActionState = {};

export function TrameadoSheetForm({
  companyId,
  jobId,
  drawingId,
  suggestedLineIdentifier,
  onCancel,
  onSuccess,
}: TrameadoSheetFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createTrameadoSheetAction,
    initialState,
  );

  useEffect(() => {
    if (state.success && state.trameadoSheetId) {
      router.refresh();
      onSuccess?.(state.trameadoSheetId);
    }
  }, [onSuccess, router, state.success, state.trameadoSheetId]);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border bg-muted/15 p-4"
      data-testid="trameado-sheet-form"
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />

      <div className="space-y-1">
        <Label htmlFor="trameado-line-identifier">ISO / identificador de línea</Label>
        <Input
          id="trameado-line-identifier"
          name="lineIdentifier"
          required
          defaultValue={suggestedLineIdentifier ?? ""}
          placeholder={
            suggestedLineIdentifier
              ? undefined
              : "Ej. HL-1291-A012AA-N-01"
          }
        />
        {suggestedLineIdentifier ? (
          <p className="text-xs text-muted-foreground">
            Sugerido desde metadatos del plano. Revísalo antes de guardar.
          </p>
        ) : null}
        {state.fieldErrors?.lineIdentifier ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.lineIdentifier.join(" ")}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="trameado-line-class">CLASE</Label>
        <Input
          id="trameado-line-class"
          name="lineClass"
          placeholder="Ej. A012AA"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="trameado-sheet-notes">Notas</Label>
        <Input id="trameado-sheet-notes" name="notes" />
      </div>

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

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={isPending}
          data-testid="trameado-create-sheet-submit"
        >
          {isPending ? "Creando..." : "Crear hoja de palilleo"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
