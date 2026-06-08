"use client";

import { useState, type ComponentProps } from "react";

import type { AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SerializedTakeoffItem } from "@/lib/drawings/takeoff";

type DrawingTakeoffItemFormProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  takeoffItemId?: string;
  initialValues?: SerializedTakeoffItem;
  formAction: NonNullable<ComponentProps<"form">["action"]>;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  state: AuthActionState;
  onCancel?: () => void;
};

const emptyValues = {
  reference: "",
  description: "",
  quantity: "",
  unit: "",
  length: "",
  width: "",
  height: "",
  notes: "",
};

function resolveFormValues(initialValues?: SerializedTakeoffItem) {
  if (!initialValues) {
    return emptyValues;
  }

  return {
    reference: initialValues.reference ?? "",
    description: initialValues.description,
    quantity: initialValues.quantity,
    unit: initialValues.unit ?? "",
    length: initialValues.length ?? "",
    width: initialValues.width ?? "",
    height: initialValues.height ?? "",
    notes: initialValues.notes ?? "",
  };
}

export function DrawingTakeoffItemForm({
  companyId,
  jobId,
  drawingId,
  takeoffItemId,
  initialValues,
  formAction,
  submitLabel,
  pendingLabel,
  isPending,
  state,
  onCancel,
}: DrawingTakeoffItemFormProps) {
  const [values] = useState(() => resolveFormValues(initialValues));

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      {takeoffItemId ? (
        <input type="hidden" name="takeoffItemId" value={takeoffItemId} />
      ) : null}

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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`reference-${takeoffItemId ?? "new"}`}>Referencia</Label>
          <Input
            id={`reference-${takeoffItemId ?? "new"}`}
            name="reference"
            defaultValue={values.reference}
            maxLength={100}
            placeholder="Ej. P-001"
          />
          {state.fieldErrors?.reference ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.reference[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`description-${takeoffItemId ?? "new"}`}>
            Descripción
          </Label>
          <Input
            id={`description-${takeoffItemId ?? "new"}`}
            name="description"
            defaultValue={values.description}
            maxLength={500}
            placeholder="Descripción de la partida"
            required
          />
          {state.fieldErrors?.description ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.description[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`quantity-${takeoffItemId ?? "new"}`}>Cantidad</Label>
          <Input
            id={`quantity-${takeoffItemId ?? "new"}`}
            name="quantity"
            defaultValue={values.quantity}
            inputMode="decimal"
            placeholder="Ej. 1"
            required
          />
          {state.fieldErrors?.quantity ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.quantity[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`unit-${takeoffItemId ?? "new"}`}>Unidad</Label>
          <Input
            id={`unit-${takeoffItemId ?? "new"}`}
            name="unit"
            defaultValue={values.unit}
            maxLength={50}
            placeholder="Ej. ud, m, m2"
          />
          {state.fieldErrors?.unit ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.unit[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`length-${takeoffItemId ?? "new"}`}>Largo</Label>
          <Input
            id={`length-${takeoffItemId ?? "new"}`}
            name="length"
            defaultValue={values.length}
            inputMode="decimal"
            placeholder="Opcional"
          />
          {state.fieldErrors?.length ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.length[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`width-${takeoffItemId ?? "new"}`}>Ancho</Label>
          <Input
            id={`width-${takeoffItemId ?? "new"}`}
            name="width"
            defaultValue={values.width}
            inputMode="decimal"
            placeholder="Opcional"
          />
          {state.fieldErrors?.width ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.width[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`height-${takeoffItemId ?? "new"}`}>Alto</Label>
          <Input
            id={`height-${takeoffItemId ?? "new"}`}
            name="height"
            defaultValue={values.height}
            inputMode="decimal"
            placeholder="Opcional"
          />
          {state.fieldErrors?.height ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.height[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`notes-${takeoffItemId ?? "new"}`}>Notas</Label>
          <Input
            id={`notes-${takeoffItemId ?? "new"}`}
            name="notes"
            defaultValue={values.notes}
            maxLength={1000}
            placeholder="Notas opcionales"
          />
          {state.fieldErrors?.notes ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.notes[0]}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
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
