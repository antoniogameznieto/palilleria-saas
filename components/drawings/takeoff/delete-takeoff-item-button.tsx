"use client";

import { useFormStatus } from "react-dom";

import { deleteTakeoffItemAction } from "@/lib/actions/takeoff";
import { Button } from "@/components/ui/button";

type DeleteTakeoffItemButtonProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  takeoffItemId: string;
  presentation?: "default" | "menu";
  onAction?: () => void;
};

function DeleteSubmitButton({
  presentation,
}: {
  presentation: "default" | "menu";
}) {
  const { pending } = useFormStatus();

  if (presentation === "menu") {
    return (
      <button
        type="submit"
        role="menuitem"
        disabled={pending}
        data-testid="delete-takeoff-item"
        className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {pending ? "Eliminando..." : "Eliminar"}
      </button>
    );
  }

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      data-testid="delete-takeoff-item"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </Button>
  );
}

export function DeleteTakeoffItemButton({
  companyId,
  jobId,
  drawingId,
  takeoffItemId,
  presentation = "default",
  onAction,
}: DeleteTakeoffItemButtonProps) {
  return (
    <form
      action={deleteTakeoffItemAction}
      className={presentation === "menu" ? "w-full" : undefined}
      onSubmit={onAction}
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      <input type="hidden" name="takeoffItemId" value={takeoffItemId} />
      <DeleteSubmitButton presentation={presentation} />
    </form>
  );
}
