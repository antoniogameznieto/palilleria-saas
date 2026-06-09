"use client";

import { Button } from "@/components/ui/button";
import type { SerializedJobTakeoffExportItem } from "@/lib/drawings/job-takeoff-export";
import {
  buildJobTakeoffCsv,
  buildJobTakeoffCsvFileName,
  downloadTakeoffCsv,
} from "@/lib/drawings/takeoff-csv";

type ExportJobTakeoffCsvButtonProps = {
  items: SerializedJobTakeoffExportItem[];
  jobName: string;
  jobId: string;
  size?: "default" | "sm";
};

export function ExportJobTakeoffCsvButton({
  items,
  jobName,
  jobId,
  size = "default",
}: ExportJobTakeoffCsvButtonProps) {
  const hasItems = items.length > 0;

  const handleExport = () => {
    if (!hasItems) {
      return;
    }

    const csv = buildJobTakeoffCsv(items);
    const fileName = buildJobTakeoffCsvFileName(jobName, jobId);
    downloadTakeoffCsv(csv, fileName);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={!hasItems}
      data-testid="export-job-csv"
      onClick={handleExport}
      title={
        hasItems
          ? "Exportar todas las líneas de palillería del trabajo a CSV"
          : "No hay líneas de palillería en este trabajo"
      }
    >
      Exportar palillería CSV
    </Button>
  );
}
