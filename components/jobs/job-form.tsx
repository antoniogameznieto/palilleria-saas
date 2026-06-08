"use client";

import { useActionState } from "react";
import type { JobStatus } from "@prisma/client";

import type { AuthActionState } from "@/lib/actions/auth";
import { createJobAction, updateJobAction } from "@/lib/actions/job";
import { JOB_STATUS_OPTIONS } from "@/lib/jobs/labels";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type JobFormProps = {
  mode: "create" | "edit";
  companyId: string;
  jobId?: string;
  defaultValues?: {
    name: string;
    clientName: string | null;
    projectCode: string | null;
    description: string | null;
    status?: JobStatus;
  };
  canArchive?: boolean;
};

const initialState: AuthActionState = {};

export function JobForm({
  mode,
  companyId,
  jobId,
  defaultValues,
  canArchive = false,
}: JobFormProps) {
  const action = mode === "create" ? createJobAction : updateJobAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const statusOptions = canArchive
    ? JOB_STATUS_OPTIONS
    : JOB_STATUS_OPTIONS.filter((option) => option.value !== "archived");

  const isArchivedAndLocked =
    mode === "edit" &&
    defaultValues?.status === "archived" &&
    !canArchive;

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}

      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Nombre del trabajo</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          required
        />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientName">Cliente (opcional)</Label>
        <Input
          id="clientName"
          name="clientName"
          defaultValue={defaultValues?.clientName ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="projectCode">Código de proyecto (opcional)</Label>
        <Input
          id="projectCode"
          name="projectCode"
          defaultValue={defaultValues?.projectCode ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {mode === "edit" && defaultValues?.status ? (
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          {isArchivedAndLocked ? (
            <div className="space-y-2">
              <JobStatusBadge status={defaultValues.status} />
              <p className="text-xs text-muted-foreground">
                Solo owner o admin pueden cambiar un trabajo archivado.
              </p>
            </div>
          ) : (
            <select
              id="status"
              name="status"
              defaultValue={defaultValues.status}
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending
          ? "Guardando..."
          : mode === "create"
            ? "Crear trabajo"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}
