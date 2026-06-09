"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import type { AuthActionState } from "@/lib/actions/auth";
import { createTrameadoSegmentAction } from "@/lib/actions/trameado";
import { formatSegmentLabel } from "@/lib/trameado/format";
import type { SerializedTrameadoSegment } from "@/lib/trameado/db";
import { Button } from "@/components/ui/button";

type DuplicateTrameadoSegmentButtonProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  sheetId: string;
  segment: SerializedTrameadoSegment;
  nextSegmentNumber: string;
};

const initialState: AuthActionState = {};

function DuplicateSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      className="h-7 px-2 text-xs"
      disabled={pending}
      data-testid="trameado-duplicate-segment"
    >
      {pending ? "Duplicando..." : "Duplicar"}
    </Button>
  );
}

export function DuplicateTrameadoSegmentButton({
  companyId,
  jobId,
  drawingId,
  sheetId,
  segment,
  nextSegmentNumber,
}: DuplicateTrameadoSegmentButtonProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    createTrameadoSegmentAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="drawingId" value={drawingId} />
      <input type="hidden" name="sheetId" value={sheetId} />
      <input type="hidden" name="lengthUnit" value={segment.lengthUnit} />
      <input
        type="hidden"
        name="segmentNumber"
        value={formatSegmentLabel(nextSegmentNumber)}
      />
      <input type="hidden" name="diameter" value={segment.diameter} />
      <input type="hidden" name="schedule" value={segment.schedule} />
      <input type="hidden" name="palilloLength" value={segment.palilloLength} />
      <input type="hidden" name="heatNumber" value={segment.heatNumber ?? ""} />
      <input type="hidden" name="notes" value={segment.notes ?? ""} />
      <DuplicateSubmitButton />
      {state.error ? (
        <span className="sr-only">{state.error}</span>
      ) : null}
    </form>
  );
}
