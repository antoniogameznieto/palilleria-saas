"use client";

import { Button } from "@/components/ui/button";
import {
  buildTakeoffCsv,
  buildTakeoffCsvFileName,
  downloadTakeoffCsv,
} from "@/lib/drawings/takeoff-csv";
import type { SerializedTakeoffItem } from "@/lib/drawings/takeoff";

type ExportTakeoffCsvButtonProps = {
  items: SerializedTakeoffItem[];
  drawingNumber: string | null;
  drawingId: string;
  size?: "default" | "sm";
};

export function ExportTakeoffCsvButton({
  items,
  drawingNumber,
  drawingId,
  size = "default",
}: ExportTakeoffCsvButtonProps) {
  const hasItems = items.length > 0;

  const handleExport = () => {
    if (!hasItems) {
      return;
    }

    const csv = buildTakeoffCsv(items);
    const fileName = buildTakeoffCsvFileName(drawingNumber, drawingId);
    downloadTakeoffCsv(csv, fileName);
  };

  const disabledTitle = "No hay líneas de palillería para exportar";
  const enabledTitle = "Exportar todas las líneas de palillería a CSV";

  return (
    <span
      className="inline-flex"
      title={hasItems ? enabledTitle : disabledTitle}
    >
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={!hasItems}
        onClick={handleExport}
        aria-label={hasItems ? enabledTitle : disabledTitle}
      >
        Exportar CSV
      </Button>
    </span>
  );
}
