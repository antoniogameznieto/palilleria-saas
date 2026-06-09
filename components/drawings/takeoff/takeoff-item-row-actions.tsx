"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { DeleteTakeoffItemButton } from "@/components/drawings/takeoff/delete-takeoff-item-button";
import { DuplicateTakeoffItemButton } from "@/components/drawings/takeoff/duplicate-takeoff-item-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TakeoffItemRowActionsProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  takeoffItemId: string;
  onEdit: () => void;
};

export function TakeoffItemRowActions({
  companyId,
  jobId,
  drawingId,
  takeoffItemId,
  onEdit,
}: TakeoffItemRowActionsProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs"
        data-testid="takeoff-edit-row"
        onClick={onEdit}
      >
        Editar
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 px-0"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        data-testid="takeoff-row-actions-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Más acciones</span>
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute right-0 top-full z-20 mt-1 min-w-[9.5rem] rounded-md border bg-popover p-1 shadow-md",
          )}
        >
          <DuplicateTakeoffItemButton
            companyId={companyId}
            jobId={jobId}
            drawingId={drawingId}
            takeoffItemId={takeoffItemId}
            presentation="menu"
            onAction={() => setOpen(false)}
          />
          <DeleteTakeoffItemButton
            companyId={companyId}
            jobId={jobId}
            drawingId={drawingId}
            takeoffItemId={takeoffItemId}
            presentation="menu"
            onAction={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
