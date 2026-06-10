"use client";

import { deleteJobAction } from "@/lib/actions/job";
import { Button } from "@/components/ui/button";

type DeleteJobButtonProps = {
  companyId: string;
  jobId: string;
  jobName: string;
  size?: "default" | "sm";
};

const DELETE_CONFIRMATION =
  "Vas a eliminar este trabajo y todos sus planos, palillería, trameado y archivos asociados. Esta acción no se puede deshacer. ¿Quieres continuar?";

export function DeleteJobButton({
  companyId,
  jobId,
  jobName,
  size = "sm",
}: DeleteJobButtonProps) {
  return (
    <form
      action={deleteJobAction}
      onSubmit={(event) => {
        if (!window.confirm(DELETE_CONFIRMATION.replace("este trabajo", `"${jobName}"`))) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="jobId" value={jobId} />
      <Button
        type="submit"
        variant="destructive"
        size={size}
        data-testid="job-delete-button"
      >
        Eliminar trabajo
      </Button>
    </form>
  );
}
