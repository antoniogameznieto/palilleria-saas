"use client";

import { useFormStatus } from "react-dom";

import { deleteTakeoffItemAction } from "@/lib/actions/takeoff";
import { Button } from "@/components/ui/button";

type DeleteTakeoffItemButtonProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  takeoffItemId: string;
};

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Eliminando..." : "Eliminar"}
    </Button>
  );
}

export function DeleteTakeoffItemButton({
  companyId,
  jobId,
  drawingId,
  takeoffItemId,
}: DeleteTakeoffItemButtonProps) {
  return (
    <form action={deleteTakeoffItemAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      <input type="hidden" name="takeoffItemId" value={takeoffItemId} />
      <DeleteSubmitButton />
    </form>
  );
}
