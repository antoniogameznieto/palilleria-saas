"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import type { AuthActionState } from "@/lib/actions/auth";
import { deleteTrameadoSegmentAction } from "@/lib/actions/trameado";
import { Button } from "@/components/ui/button";

type DeleteTrameadoSegmentButtonProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  segmentId: string;
};

const initialState: AuthActionState = {};

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
      disabled={pending}
      data-testid="trameado-delete-segment"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </Button>
  );
}

export function DeleteTrameadoSegmentButton({
  companyId,
  jobId,
  drawingId,
  segmentId,
}: DeleteTrameadoSegmentButtonProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    deleteTrameadoSegmentAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "¿Eliminar este tramo de la hoja de palilleo?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      <input type="hidden" name="segmentId" value={segmentId} />
      <DeleteSubmitButton />
      {state.error ? (
        <span className="sr-only">{state.error}</span>
      ) : null}
    </form>
  );
}
