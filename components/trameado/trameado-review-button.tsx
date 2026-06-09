"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import { markTrameadoSheetReviewedAction } from "@/lib/actions/trameado";
import { formatTakeoffReviewedAt } from "@/lib/drawings/takeoff-review";
import { Button } from "@/components/ui/button";

type TrameadoReviewButtonProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  sheetId: string;
  segmentCount: number;
  reviewedAt: string | null;
  reviewedByLabel: string | null;
  canManage: boolean;
};

const initialState: AuthActionState = {};

export function TrameadoReviewButton({
  companyId,
  jobId,
  drawingId,
  sheetId,
  segmentCount,
  reviewedAt,
  reviewedByLabel,
  canManage,
}: TrameadoReviewButtonProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    markTrameadoSheetReviewedAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  if (segmentCount === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Añade al menos un tramo para poder marcar la hoja como revisada.
      </div>
    );
  }

  if (reviewedAt) {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
        <p
          className="text-sm text-emerald-800 dark:text-emerald-300"
          data-testid="trameado-sheet-reviewed-status"
        >
          Hoja revisada el {formatTakeoffReviewedAt(reviewedAt)} por{" "}
          {reviewedByLabel ?? "Usuario desconocido"}
        </p>
        <p className="text-xs text-muted-foreground">
          Si editas o eliminas tramos, la revisión se invalidará automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <p className="text-sm text-amber-900 dark:text-amber-200">
        Revisa los tramos antes de marcar la hoja de palilleo como revisada.
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

      {canManage ? (
        <form action={formAction}>
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="drawingId" value={drawingId} />
          <input type="hidden" name="sheetId" value={sheetId} />
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            data-testid="trameado-mark-reviewed"
          >
            {isPending ? "Marcando..." : "Marcar hoja como revisada"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Solo ingenieros y administradores pueden marcar la hoja como revisada.
        </p>
      )}
    </div>
  );
}
