"use client";

import { useActionState } from "react";

import { createCompanyAction } from "@/lib/actions/company";
import type { AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function CompanyOnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    createCompanyAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la empresa</Label>
        <Input id="name" name="name" type="text" required />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="taxName">Razón social (opcional)</Label>
        <Input id="taxName" name="taxName" type="text" />
        {state.fieldErrors?.taxName ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.taxName[0]}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creando empresa..." : "Crear empresa"}
      </Button>
    </form>
  );
}
