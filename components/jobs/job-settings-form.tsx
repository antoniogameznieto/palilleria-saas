"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/lib/actions/auth";
import { updateJobSettingsAction } from "@/lib/actions/job";
import {
  LENGTH_CRITERIA_OPTIONS,
  LENGTH_UNIT_OPTIONS,
} from "@/lib/jobs/labels";
import type { SerializedJobSettings } from "@/lib/jobs/serialize-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type JobSettingsFormProps = {
  companyId: string;
  jobId: string;
  defaultValues: SerializedJobSettings;
};

const initialState: AuthActionState = {};

function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="size-4 rounded border-input"
      />
      {label}
    </label>
  );
}

export function JobSettingsForm({
  companyId,
  jobId,
  defaultValues,
}: JobSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateJobSettingsAction,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />

      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lengthCriteria">Criterio de longitud</Label>
          <select
            id="lengthCriteria"
            name="lengthCriteria"
            defaultValue={defaultValues.lengthCriteria}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {LENGTH_CRITERIA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lengthUnit">Unidad de longitud</Label>
          <select
            id="lengthUnit"
            name="lengthUnit"
            defaultValue={defaultValues.lengthUnit}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {LENGTH_UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="roundingMm">Redondeo (mm)</Label>
          <Input
            id="roundingMm"
            name="roundingMm"
            type="number"
            min={1}
            defaultValue={defaultValues.roundingMm ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPieceWeightKg">Peso máximo (kg)</Label>
          <Input
            id="maxPieceWeightKg"
            name="maxPieceWeightKg"
            type="number"
            min={0}
            step="0.01"
            defaultValue={
              defaultValues.maxPieceWeightKg
                ? String(defaultValues.maxPieceWeightKg)
                : ""
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPieceLengthMm">Longitud máxima palillo (mm)</Label>
          <Input
            id="maxPieceLengthMm"
            name="maxPieceLengthMm"
            type="number"
            min={1}
            defaultValue={defaultValues.maxPieceLengthMm ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minPieceLengthMm">Longitud mínima palillo (mm)</Label>
          <Input
            id="minPieceLengthMm"
            name="minPieceLengthMm"
            type="number"
            min={1}
            defaultValue={defaultValues.minPieceLengthMm ?? ""}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Separaciones automáticas</p>
        <div className="grid gap-2 md:grid-cols-2">
          <CheckboxField
            name="separateByDiameter"
            label="Separar por diámetro"
            defaultChecked={defaultValues.separateByDiameter}
          />
          <CheckboxField
            name="separateBySchedule"
            label="Separar por schedule"
            defaultChecked={defaultValues.separateBySchedule}
          />
          <CheckboxField
            name="separateByMaterial"
            label="Separar por material"
            defaultChecked={defaultValues.separateByMaterial}
          />
          <CheckboxField
            name="separateAtFlanges"
            label="Separar en bridas"
            defaultChecked={defaultValues.separateAtFlanges}
          />
          <CheckboxField
            name="separateAtValves"
            label="Separar en válvulas"
            defaultChecked={defaultValues.separateAtValves}
          />
          <CheckboxField
            name="separateAtFittings"
            label="Separar en accesorios"
            defaultChecked={defaultValues.separateAtFittings}
          />
        </div>
      </div>

      <CheckboxField
        name="requireReviewBeforeExport"
        label="Revisión obligatoria antes de exportar"
        defaultChecked={defaultValues.requireReviewBeforeExport}
      />

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaultValues.notes ?? ""}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar settings"}
      </Button>
    </form>
  );
}
