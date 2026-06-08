"use client";

import { useActionState } from "react";

import type { AuthActionState } from "@/lib/actions/auth";
import { updateCompanyAction } from "@/lib/actions/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CompanySettingsFormProps = {
  companyId: string;
  defaultValues: {
    name: string;
    taxName: string | null;
  };
};

const initialState: AuthActionState = {};

export function CompanySettingsForm({
  companyId,
  defaultValues,
}: CompanySettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateCompanyAction,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="companyId" value={companyId} />

      {state.success ? (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          {state.success}
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la empresa</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues.name}
          required
        />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="taxName">Razón social (opcional)</Label>
        <Input
          id="taxName"
          name="taxName"
          defaultValue={defaultValues.taxName ?? ""}
        />
        {state.fieldErrors?.taxName ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.taxName[0]}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
