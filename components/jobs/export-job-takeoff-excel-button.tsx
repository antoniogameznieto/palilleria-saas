"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ExportJobTakeoffExcelButtonProps = {
  companyId: string;
  jobId: string;
  itemCount: number;
  size?: "default" | "sm";
};

function parseContentDispositionFileName(
  header: string | null,
  fallback: string,
): string {
  if (!header) {
    return fallback;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = header.match(/filename="([^"]+)"/i);

  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return fallback;
}

export function ExportJobTakeoffExcelButton({
  companyId,
  jobId,
  itemCount,
  size = "default",
}: ExportJobTakeoffExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const hasItems = itemCount > 0;
  const exportHref = `/api/companies/${companyId}/jobs/${jobId}/takeoff-export`;

  const handleExport = async () => {
    if (!hasItems || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch(exportHref);

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        window.alert(
          payload?.error ??
            "No se pudo exportar la palillería. Inténtalo de nuevo.",
        );
        return;
      }

      const blob = await response.blob();
      const fileName = parseContentDispositionFileName(
        response.headers.get("Content-Disposition"),
        `takeoff-${jobId}.xlsx`,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      window.alert("No se pudo exportar la palillería. Inténtalo de nuevo.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={!hasItems || isExporting}
      data-testid="export-job-excel"
      onClick={() => {
        void handleExport();
      }}
      title={
        hasItems
          ? "Exportar palillería del trabajo a Excel (.xlsx)"
          : "No hay líneas de palillería en este trabajo"
      }
    >
      {isExporting ? "Exportando..." : "Exportar Excel"}
    </Button>
  );
}
