"use client";

import { useActionState, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import type { AuthActionState } from "@/lib/actions/auth";
import {
  createTrameadoSegmentAction,
  updateTrameadoSegmentAction,
} from "@/lib/actions/trameado";
import { formatSegmentLabel } from "@/lib/trameado/format";
import type { SerializedTrameadoSegment } from "@/lib/trameado/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TrameadoStickySegmentValues = {
  diameter: string;
  schedule: string;
  heatNumber: string;
};

type TrameadoSegmentFormProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  sheetId: string;
  mode: "create" | "edit";
  segment?: SerializedTrameadoSegment;
  nextSegmentNumber?: string;
  stickyValues?: TrameadoStickySegmentValues;
  prefilledPalilloLength?: string;
  onCancel?: () => void;
  onSubmitCapture?: (sticky: TrameadoStickySegmentValues) => void;
  onSuccess?: () => void;
};

const initialState: AuthActionState = {};

function resolveInitialValues(
  segment: SerializedTrameadoSegment | undefined,
  nextSegmentNumber: string | undefined,
  stickyValues: TrameadoStickySegmentValues | undefined,
  prefilledPalilloLength?: string,
) {
  if (segment) {
    return {
      segmentNumber: formatSegmentLabel(segment.segmentNumber),
      diameter: segment.diameter,
      schedule: segment.schedule,
      palilloLength: prefilledPalilloLength ?? segment.palilloLength,
      heatNumber: segment.heatNumber ?? "",
      notes: segment.notes ?? "",
    };
  }

  return {
    segmentNumber: nextSegmentNumber
      ? formatSegmentLabel(nextSegmentNumber)
      : "",
    diameter: stickyValues?.diameter ?? "",
    schedule: stickyValues?.schedule ?? "",
    palilloLength: prefilledPalilloLength ?? "",
    heatNumber: stickyValues?.heatNumber ?? "",
    notes: "",
  };
}

export function TrameadoSegmentForm({
  companyId,
  jobId,
  drawingId,
  sheetId,
  mode,
  segment,
  nextSegmentNumber,
  stickyValues,
  prefilledPalilloLength,
  onCancel,
  onSubmitCapture,
  onSuccess,
}: TrameadoSegmentFormProps) {
  const router = useRouter();
  const formKey = segment?.id ?? `new-${nextSegmentNumber ?? "segment"}-${prefilledPalilloLength ?? "base"}`;
  const palilloInputRef = useRef<HTMLInputElement>(null);
  const handledSuccessRef = useRef(false);
  const [values, setValues] = useState(() =>
    resolveInitialValues(
      segment,
      nextSegmentNumber,
      stickyValues,
      prefilledPalilloLength,
    ),
  );
  const action =
    mode === "edit" ? updateTrameadoSegmentAction : createTrameadoSegmentAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (mode === "create") {
      palilloInputRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    if (!state.success) {
      handledSuccessRef.current = false;
      return;
    }

    if (handledSuccessRef.current) {
      return;
    }

    handledSuccessRef.current = true;
    router.refresh();
    onSuccess?.();
  }, [mode, onSuccess, router, state.success]);

  const handleSubmit = () => {
    if (mode !== "create") {
      return;
    }

    onSubmitCapture?.({
      diameter: values.diameter,
      schedule: values.schedule,
      heatNumber: values.heatNumber,
    });
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    event.preventDefault();
    handleSubmit();
    event.currentTarget.requestSubmit();
  };

  return (
    <form
      key={formKey}
      action={formAction}
      className="space-y-4 rounded-lg border bg-muted/15 p-4"
      data-testid="trameado-segment-form"
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      <input type="hidden" name="sheetId" value={sheetId} />
      {mode === "edit" && segment ? (
        <input type="hidden" name="segmentId" value={segment.id} />
      ) : null}
      <input type="hidden" name="lengthUnit" value="mm" />

      {mode === "create" ? (
        <p className="text-xs text-muted-foreground">
          Entrada rápida: tras añadir un tramo se mantienen Ø, SCH. y COLADA para
          el siguiente. Pulsa Enter para guardar.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`trameado-segment-number-${formKey}`}>Nº tramo</Label>
          <Input
            id={`trameado-segment-number-${formKey}`}
            name="segmentNumber"
            required
            value={values.segmentNumber}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                segmentNumber: event.target.value,
              }))
            }
            placeholder="<1>"
            data-testid="trameado-segment-number-input"
          />
          {state.fieldErrors?.segmentNumber ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.segmentNumber.join(" ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`trameado-diameter-${formKey}`}>Ø</Label>
          <Input
            id={`trameado-diameter-${formKey}`}
            name="diameter"
            required
            value={values.diameter}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                diameter: event.target.value,
              }))
            }
            placeholder='4"'
            data-testid="trameado-diameter-input"
          />
          {state.fieldErrors?.diameter ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.diameter.join(" ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`trameado-schedule-${formKey}`}>SCH.</Label>
          <Input
            id={`trameado-schedule-${formKey}`}
            name="schedule"
            required
            value={values.schedule}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                schedule: event.target.value,
              }))
            }
            placeholder="40"
            data-testid="trameado-schedule-input"
          />
          {state.fieldErrors?.schedule ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.schedule.join(" ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`trameado-palillo-${formKey}`}>
            PALILLO (longitud de corte mm)
          </Label>
          <Input
            ref={palilloInputRef}
            id={`trameado-palillo-${formKey}`}
            name="palilloLength"
            required
            inputMode="decimal"
            value={values.palilloLength}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                palilloLength: event.target.value,
              }))
            }
            placeholder="363"
            data-testid="trameado-palillo-input"
          />
          {state.fieldErrors?.palilloLength ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.palilloLength.join(" ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`trameado-heat-${formKey}`}>COLADA</Label>
          <Input
            id={`trameado-heat-${formKey}`}
            name="heatNumber"
            value={values.heatNumber}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                heatNumber: event.target.value,
              }))
            }
            data-testid="trameado-heat-input"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`trameado-notes-${formKey}`}>Notas</Label>
          <Input
            id={`trameado-notes-${formKey}`}
            name="notes"
            value={values.notes}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
          />
        </div>
      </div>

      {state.error ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-testid="trameado-segment-form-error"
        >
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
          data-testid={
            mode === "edit"
              ? "trameado-update-segment-submit"
              : "trameado-add-segment-submit"
          }
        >
          {isPending
            ? mode === "edit"
              ? "Guardando..."
              : "Añadiendo..."
            : mode === "edit"
              ? "Guardar tramo"
              : "Añadir tramo"}
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
