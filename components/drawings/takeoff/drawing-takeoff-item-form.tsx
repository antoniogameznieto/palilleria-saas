"use client";

import { useState, type ComponentProps } from "react";

import type { AuthActionState } from "@/lib/actions/auth";
import { TakeoffDatalistInput } from "@/components/drawings/takeoff/takeoff-datalist-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SerializedTakeoffItem } from "@/lib/drawings/takeoff";
import {
  getReferenceAutofill,
  type TakeoffFormSuggestions,
} from "@/lib/drawings/takeoff-suggestions";

type DrawingTakeoffItemFormProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  takeoffItemId?: string;
  initialValues?: SerializedTakeoffItem;
  suggestions: TakeoffFormSuggestions;
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
  suggestions,
  formAction,
  submitLabel,
  pendingLabel,
  isPending,
  state,
  onCancel,
}: DrawingTakeoffItemFormProps) {
  const [values] = useState(() => resolveFormValues(initialValues));
  const [reference, setReference] = useState(values.reference);
  const [description, setDescription] = useState(values.description);
  const [unit, setUnit] = useState(values.unit);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [unitTouched, setUnitTouched] = useState(false);

  const formKey = takeoffItemId ?? "new";

  const applyReferenceAutofill = (nextReference: string) => {
    const profile = getReferenceAutofill(
      suggestions.referenceProfiles,
      nextReference,
    );

    if (!profile) {
      return;
    }

    if (!descriptionTouched && description.trim().length === 0) {
      setDescription(profile.description);
    }

    if (!unitTouched && unit.trim().length === 0) {
      setUnit(profile.unit ?? "");
    }
  };

  const handleReferenceChange = (nextReference: string) => {
    setReference(nextReference);
  };

  const handleReferenceBlur = () => {
    applyReferenceAutofill(reference);
  };

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
          <Label htmlFor={`reference-${formKey}`}>Referencia</Label>
          <TakeoffDatalistInput
            id={`reference-${formKey}`}
            listId={`takeoff-reference-options-${formKey}`}
            name="reference"
            value={reference}
            onChange={(event) => handleReferenceChange(event.target.value)}
            onBlur={handleReferenceBlur}
            maxLength={100}
            placeholder="Ej. P-001"
            options={suggestions.referenceOptions}
          />
          {suggestions.referenceOptions.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Sugerencias del plano y del trabajo.
            </p>
          ) : null}
          {state.fieldErrors?.reference ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.reference[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`description-${formKey}`}>Descripción</Label>
          <TakeoffDatalistInput
            id={`description-${formKey}`}
            listId={`takeoff-description-options-${formKey}`}
            name="description"
            value={description}
            onChange={(event) => {
              setDescriptionTouched(true);
              setDescription(event.target.value);
            }}
            maxLength={500}
            placeholder="Descripción de la partida"
            required
            options={suggestions.descriptionOptions}
          />
          {suggestions.descriptionOptions.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Descripciones usadas en este trabajo.
            </p>
          ) : null}
          {state.fieldErrors?.description ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.description[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`quantity-${formKey}`}>Cantidad</Label>
          <Input
            id={`quantity-${formKey}`}
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
          <Label htmlFor={`unit-${formKey}`}>Unidad</Label>
          <TakeoffDatalistInput
            id={`unit-${formKey}`}
            listId={`takeoff-unit-options-${formKey}`}
            name="unit"
            value={unit}
            onChange={(event) => {
              setUnitTouched(true);
              setUnit(event.target.value);
            }}
            maxLength={50}
            placeholder="Ej. ud, m, m²"
            options={suggestions.unitOptions}
          />
          <p className="text-xs text-muted-foreground">
            Elige una unidad frecuente o escribe otra.
          </p>
          {state.fieldErrors?.unit ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.unit[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`length-${formKey}`}>Largo</Label>
          <Input
            id={`length-${formKey}`}
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
          <Label htmlFor={`width-${formKey}`}>Ancho</Label>
          <Input
            id={`width-${formKey}`}
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
          <Label htmlFor={`height-${formKey}`}>Alto</Label>
          <Input
            id={`height-${formKey}`}
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
          <Label htmlFor={`notes-${formKey}`}>Notas</Label>
          <Input
            id={`notes-${formKey}`}
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
