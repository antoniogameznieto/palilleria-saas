"use client";

import { useFormStatus } from "react-dom";

import { duplicateTakeoffItemAction } from "@/lib/actions/takeoff";
import { Button } from "@/components/ui/button";

type DuplicateTakeoffItemButtonProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  takeoffItemId: string;
};

function DuplicateSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Duplicando..." : "Duplicar"}
    </Button>
  );
}

export function DuplicateTakeoffItemButton({
  companyId,
  jobId,
  drawingId,
  takeoffItemId,
}: DuplicateTakeoffItemButtonProps) {
  return (
    <form action={duplicateTakeoffItemAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      <input type="hidden" name="takeoffItemId" value={takeoffItemId} />
      <DuplicateSubmitButton />
    </form>
  );
}
