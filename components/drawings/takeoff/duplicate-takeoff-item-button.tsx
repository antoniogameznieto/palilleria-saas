"use client";

import { useFormStatus } from "react-dom";

import { duplicateTakeoffItemAction } from "@/lib/actions/takeoff";
import { Button } from "@/components/ui/button";

type DuplicateTakeoffItemButtonProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  takeoffItemId: string;
  presentation?: "default" | "menu";
  onAction?: () => void;
};

function DuplicateSubmitButton({
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
        data-testid="duplicate-takeoff-item"
        className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? "Duplicando..." : "Duplicar"}
      </button>
    );
  }

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      data-testid="duplicate-takeoff-item"
    >
      {pending ? "Duplicando..." : "Duplicar"}
    </Button>
  );
}

export function DuplicateTakeoffItemButton({
  companyId,
  jobId,
  drawingId,
  takeoffItemId,
  presentation = "default",
  onAction,
}: DuplicateTakeoffItemButtonProps) {
  return (
    <form
      action={duplicateTakeoffItemAction}
      className={presentation === "menu" ? "w-full" : undefined}
      onSubmit={onAction}
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      <input type="hidden" name="takeoffItemId" value={takeoffItemId} />
      <DuplicateSubmitButton presentation={presentation} />
    </form>
  );
}
