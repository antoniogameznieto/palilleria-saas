"use client";

import { useActionState, useState } from "react";
import type { DrawingStatus } from "@prisma/client";

import type { AuthActionState } from "@/lib/actions/auth";
import { updateDrawingStatusAction } from "@/lib/actions/drawing";
import { DrawingStatusBadge } from "@/components/drawings/drawing-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DRAWING_STATUS_LABELS,
  isManualDrawingStatus,
  MANUAL_DRAWING_STATUS_OPTIONS,
  type ManualDrawingStatus,
} from "@/lib/drawings/labels";

type DrawingStatusControlProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  status: DrawingStatus;
  canEdit: boolean;
};

const initialState: AuthActionState = {};

const selectClassName =
  "h-8 w-full max-w-xs rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function DrawingStatusControl({
  companyId,
  jobId,
  drawingId,
  status,
  canEdit,
}: DrawingStatusControlProps) {
  const [state, formAction, isPending] = useActionState(
    updateDrawingStatusAction,
    initialState,
  );

  const [selectedStatus, setSelectedStatus] = useState(
    isManualDrawingStatus(status) ? status : MANUAL_DRAWING_STATUS_OPTIONS[0].value,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado del plano</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Estado actual:</span>
          <DrawingStatusBadge status={status} />
        </div>

        {canEdit ? (
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

            {!isManualDrawingStatus(status) ? (
              <p className="text-sm text-muted-foreground">
                El estado actual ({DRAWING_STATUS_LABELS[status]}) no está en la
                lista de cambio manual. Selecciona un nuevo estado.
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="status">Cambiar estado</Label>
              <select
                id="status"
                name="status"
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(event.target.value as ManualDrawingStatus)
                }
                className={selectClassName}
              >
                {MANUAL_DRAWING_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.status ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.status[0]}
                </p>
              ) : null}
            </div>

            <Button type="submit" disabled={isPending || selectedStatus === status}>
              {isPending ? "Actualizando..." : "Actualizar estado"}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
