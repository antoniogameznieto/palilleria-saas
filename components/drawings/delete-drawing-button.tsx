"use client";

import { useFormStatus } from "react-dom";

import { deleteDrawingAction } from "@/lib/actions/drawing";
import { Button } from "@/components/ui/button";

type DeleteDrawingButtonProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
};

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      data-testid="delete-drawing"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </Button>
  );
}

export function DeleteDrawingButton({
  companyId,
  jobId,
  drawingId,
}: DeleteDrawingButtonProps) {
  return (
    <form action={deleteDrawingAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      <DeleteSubmitButton />
    </form>
  );
}
