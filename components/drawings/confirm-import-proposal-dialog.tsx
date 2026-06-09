"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { ExperimentalImportPreviewSummary } from "@/lib/drawings/experimental-auto-takeoff-ui";
import { cn } from "@/lib/utils";

type ConfirmImportProposalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: ExperimentalImportPreviewSummary;
  isPending: boolean;
  formId: string;
};

function formatPreviewLine(
  line: ExperimentalImportPreviewSummary["previewLines"][number],
): string {
  const ref = line.reference?.trim() || "—";
  const desc = line.description?.trim() || "—";
  return `${ref} — ${desc}`;
}

function formatImportButtonLabel(lineCount: number, pending: boolean): string {
  if (pending) {
    return "Importando...";
  }

  return lineCount === 1
    ? "Importar 1 línea"
    : `Importar ${lineCount} líneas`;
}

export function ConfirmImportProposalDialog({
  open,
  onOpenChange,
  preview,
  isPending,
  formId,
}: ConfirmImportProposalDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isPending, onOpenChange]);

  if (!open) {
    return null;
  }

  function handleBackdropClick() {
    if (!isPending) {
      onOpenChange(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      data-testid="confirm-import-proposal-dialog"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar diálogo"
        disabled={isPending}
        onClick={handleBackdropClick}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-md space-y-4 rounded-xl border bg-card p-5 shadow-lg outline-none",
        )}
      >
        <div className="space-y-2">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            Importar propuesta revisada
          </h2>
          <p className="text-sm text-foreground">
            Se crearán <strong>{preview.lineCount}</strong> línea
            {preview.lineCount === 1 ? "" : "s"} reales de palillería.
          </p>
          <p className="text-sm text-muted-foreground">
            Se invalidará la revisión de palillería si estaba marcada.
          </p>
        </div>

        <div className="space-y-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
          <p>
            <span className="text-muted-foreground">Seleccionadas: </span>
            <strong>{preview.lineCount}</strong>
            {preview.includeCount > 0 || preview.reviewCount > 0 ? (
              <span className="text-muted-foreground">
                {" "}
                ({preview.includeCount} incluir
                {preview.reviewCount > 0
                  ? `, ${preview.reviewCount} revisar`
                  : ""}
                )
              </span>
            ) : null}
          </p>

          {preview.quantityByUnit.length > 0 ? (
            <p data-testid="confirm-import-proposal-quantities">
              <span className="text-muted-foreground">Totales por unidad: </span>
              {preview.quantityByUnit
                .map((entry) => `${entry.total} ${entry.unit}`)
                .join(" · ")}
            </p>
          ) : null}

          {preview.previewLines.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
              {preview.previewLines.map((line, index) => (
                <li key={`${line.reference ?? "ref"}-${index}`}>
                  {formatPreviewLine(line)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {preview.reviewWarningMessage ? (
          <p
            className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100"
            data-testid="confirm-import-proposal-review-warning"
          >
            {preview.reviewWarningMessage}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          No se importarán elementos excluidos por reglas.
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            data-testid="confirm-import-proposal-cancel"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={isPending}
            data-testid="confirm-import-proposal-confirm"
          >
            {formatImportButtonLabel(preview.lineCount, isPending)}
          </Button>
        </div>
      </div>
    </div>
  );
}
