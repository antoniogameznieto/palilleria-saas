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
    return null;
  }

  if (reviewedAt) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
        <p
          className="text-sm text-emerald-800 dark:text-emerald-300"
          data-testid="trameado-sheet-reviewed-status"
        >
          Revisada el {formatTakeoffReviewedAt(reviewedAt)} por{" "}
          {reviewedByLabel ?? "Usuario desconocido"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Si editas o eliminas tramos, la revisión se invalidará.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/15 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Cuando los tramos estén correctos, marca la hoja como revisada antes de
        exportar.
      </p>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {state.error ? (
          <p className="text-xs text-destructive">{state.error}</p>
        ) : null}

        {state.success ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
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
              {isPending ? "Marcando..." : "Marcar revisada"}
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            Solo ingenieros pueden marcar la hoja como revisada.
          </p>
        )}
      </div>
    </div>
  );
}
