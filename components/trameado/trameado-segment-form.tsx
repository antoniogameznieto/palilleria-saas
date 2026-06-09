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

export type TrameadoAssistedSegmentDraft = {
  palilloLength: string;
  token: number;
  segmentCountAtPrepare: number;
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
  assistedDraft?: TrameadoAssistedSegmentDraft | null;
  onAssistedDraftClear?: () => void;
  onCancel?: () => void;
  onSubmitCapture?: (sticky: TrameadoStickySegmentValues) => void;
  onSuccess?: () => void;
};

const initialState: AuthActionState = {};

function resolveInitialValues(
  segment: SerializedTrameadoSegment | undefined,
  nextSegmentNumber: string | undefined,
  stickyValues: TrameadoStickySegmentValues | undefined,
  assistedPalilloLength?: string,
) {
  if (segment) {
    return {
      segmentNumber: formatSegmentLabel(segment.segmentNumber),
      diameter: segment.diameter,
      schedule: segment.schedule,
      palilloLength: segment.palilloLength,
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
    palilloLength: assistedPalilloLength ?? "",
    heatNumber: stickyValues?.heatNumber ?? "",
    notes: "",
  };
}

function resolveInitialFocusTarget(
  assistedDraft: TrameadoAssistedSegmentDraft | null | undefined,
  diameter: string,
  schedule: string,
): "diameter" | "segmentNumber" | "submit" {
  if (!assistedDraft) {
    return "segmentNumber";
  }

  if (!diameter.trim() || !schedule.trim()) {
    return "diameter";
  }

  return "segmentNumber";
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
  assistedDraft,
  onAssistedDraftClear,
  onCancel,
  onSubmitCapture,
  onSuccess,
}: TrameadoSegmentFormProps) {
  const router = useRouter();
  const formKey =
    segment?.id ??
    `new-${nextSegmentNumber ?? "segment"}-${assistedDraft?.token ?? "base"}`;
  const segmentNumberInputRef = useRef<HTMLInputElement>(null);
  const diameterInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const palilloInputRef = useRef<HTMLInputElement>(null);
  const handledSuccessRef = useRef(false);
  const initialValues = resolveInitialValues(
    segment,
    nextSegmentNumber,
    stickyValues,
    assistedDraft?.palilloLength,
  );
  const [values, setValues] = useState(() => initialValues);
  const action =
    mode === "edit" ? updateTrameadoSegmentAction : createTrameadoSegmentAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    if (assistedDraft) {
      const focusTarget = resolveInitialFocusTarget(
        assistedDraft,
        initialValues.diameter,
        initialValues.schedule,
      );

      if (focusTarget === "diameter") {
        diameterInputRef.current?.focus();
        return;
      }

      if (focusTarget === "segmentNumber") {
        segmentNumberInputRef.current?.focus();
        return;
      }

      submitButtonRef.current?.focus();
      return;
    }

    palilloInputRef.current?.focus();
  }, [assistedDraft, formKey, initialValues.diameter, initialValues.schedule, mode]);

  useEffect(() => {
    if (!state.success) {
      handledSuccessRef.current = false;
      return;
    }

    if (handledSuccessRef.current) {
      return;
    }

    handledSuccessRef.current = true;
    onAssistedDraftClear?.();
    router.refresh();
    onSuccess?.();
  }, [mode, onAssistedDraftClear, onSuccess, router, state.success]);

  const handleCancel = () => {
    onAssistedDraftClear?.();
    onCancel?.();
  };

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

      {mode === "create" && assistedDraft ? (
        <p
          className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-900 dark:text-sky-100"
          data-testid="trameado-assisted-segment-notice"
        >
          Cota {assistedDraft.palilloLength} mm usada como PALILLO. Revisa contra
          el isométrico antes de guardar.
        </p>
      ) : null}

      {mode === "create" && !assistedDraft ? (
        <p className="text-xs text-muted-foreground">
          Entrada rápida: tras añadir un tramo se mantienen Ø, SCH. y COLADA para
          el siguiente. Pulsa Enter para guardar.
        </p>
      ) : null}

      {mode === "create" && assistedDraft ? (
        <p className="text-xs text-muted-foreground">
          El tramo no se guarda hasta pulsar Confirmar tramo.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`trameado-segment-number-${formKey}`}>Nº tramo</Label>
          <Input
            ref={segmentNumberInputRef}
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
            ref={diameterInputRef}
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
          ref={submitButtonRef}
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
              : "Confirmando..."
            : mode === "edit"
              ? "Guardar tramo"
              : assistedDraft
                ? "Confirmar tramo"
                : "Añadir tramo"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
