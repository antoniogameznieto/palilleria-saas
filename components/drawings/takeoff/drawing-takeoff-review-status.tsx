"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import {
  confirmDrawingTakeoffReviewedAction,
  resetDrawingTakeoffReviewAction,
} from "@/lib/actions/takeoff-review";
import { Button } from "@/components/ui/button";
import { formatTakeoffReviewedAt } from "@/lib/drawings/takeoff-review";

type DrawingTakeoffReviewStatusProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  takeoffLineCount: number;
  takeoffReviewedAt: string | null;
  takeoffReviewedByLabel: string | null;
  canManage: boolean;
};

const initialState: AuthActionState = {};

export function DrawingTakeoffReviewStatus({
  companyId,
  jobId,
  drawingId,
  takeoffLineCount,
  takeoffReviewedAt,
  takeoffReviewedByLabel,
  canManage,
}: DrawingTakeoffReviewStatusProps) {
  const router = useRouter();
  const [confirmState, confirmAction, isConfirmPending] = useActionState(
    confirmDrawingTakeoffReviewedAction,
    initialState,
  );
  const [resetState, resetAction, isResetPending] = useActionState(
    resetDrawingTakeoffReviewAction,
    initialState,
  );

  useEffect(() => {
    if (confirmState.success || resetState.success) {
      router.refresh();
    }
  }, [confirmState.success, resetState.success, router]);

  const hiddenFields = (
    <>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
    </>
  );

  if (takeoffLineCount === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Añade al menos una línea de palillería para poder marcar la revisión.
      </div>
    );
  }

  if (takeoffReviewedAt) {
    const reviewerLabel = takeoffReviewedByLabel ?? "Usuario desconocido";

    return (
      <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          Palillería revisada el {formatTakeoffReviewedAt(takeoffReviewedAt)} por{" "}
          {reviewerLabel}
        </p>

        {confirmState.error || resetState.error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {confirmState.error ?? resetState.error}
          </p>
        ) : null}

        {resetState.success ? (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {resetState.success}
          </p>
        ) : null}

        {canManage ? (
          <form action={resetAction}>
            {hiddenFields}
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isResetPending}
            >
              {isResetPending ? "Desmarcando..." : "Desmarcar revisión"}
            </Button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
        Palillería pendiente de revisión
      </p>

      {confirmState.error || resetState.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {confirmState.error ?? resetState.error}
        </p>
      ) : null}

      {confirmState.success ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {confirmState.success}
        </p>
      ) : null}

      {canManage ? (
        <form action={confirmAction}>
          {hiddenFields}
          <Button
            type="submit"
            size="sm"
            disabled={isConfirmPending}
            data-testid="confirm-takeoff-review"
          >
            {isConfirmPending
              ? "Marcando..."
              : "Marcar palillería como revisada"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Solo ingenieros y administradores pueden marcar la palillería como
          revisada.
        </p>
      )}
    </div>
  );
}
