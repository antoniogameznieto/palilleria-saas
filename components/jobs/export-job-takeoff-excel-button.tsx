"use client";

import { Button } from "@/components/ui/button";

type ExportJobTakeoffExcelButtonProps = {
  companyId: string;
  jobId: string;
  itemCount: number;
  size?: "default" | "sm";
};

export function ExportJobTakeoffExcelButton({
  companyId,
  jobId,
  itemCount,
  size = "default",
}: ExportJobTakeoffExcelButtonProps) {
  const hasItems = itemCount > 0;
  const exportHref = `/api/companies/${companyId}/jobs/${jobId}/takeoff-export`;

  const handleExport = () => {
    if (!hasItems) {
      return;
    }

    window.location.assign(exportHref);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={!hasItems}
      onClick={handleExport}
      title={
        hasItems
          ? "Exportar palillería del trabajo a Excel (.xlsx)"
          : "No hay líneas de palillería en este trabajo"
      }
    >
      Exportar Excel
    </Button>
  );
}
