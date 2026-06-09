import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buildTrameadoCsvExportPath } from "@/lib/trameado/export-csv";
import { buildTrameadoXlsxExportPath } from "@/lib/trameado/export-xlsx";

type ExportTrameadoCsvButtonProps = {
  sheetId: string;
  segmentCount: number;
  reviewedAt: string | null;
};

export function ExportTrameadoCsvButton({
  sheetId,
  segmentCount,
  reviewedAt,
}: ExportTrameadoCsvButtonProps) {
  const hasSegments = segmentCount > 0;
  const csvExportPath = buildTrameadoCsvExportPath(sheetId);
  const xlsxExportPath = buildTrameadoXlsxExportPath(sheetId);

  if (!hasSegments) {
    return (
      <div className="flex flex-wrap gap-2">
        <span
          className="inline-flex"
          title="Añade al menos un tramo para exportar la hoja"
        >
          <Button type="button" variant="outline" size="sm" disabled>
            Exportar CSV
          </Button>
        </span>
        <span
          className="inline-flex"
          title="Añade al menos un tramo para exportar la hoja"
        >
          <Button type="button" variant="outline" size="sm" disabled>
            Exportar Excel
          </Button>
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {!reviewedAt ? (
        <p
          className="text-xs text-amber-800 dark:text-amber-200"
          data-testid="trameado-export-pending-review"
        >
          Hoja pendiente de revisión
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link href={csvExportPath} data-testid="trameado-export-csv">
          <Button type="button" variant="outline" size="sm">
            Exportar CSV
          </Button>
        </Link>
        <Link href={xlsxExportPath} data-testid="trameado-export-xlsx">
          <Button type="button" variant="outline" size="sm">
            Exportar Excel
          </Button>
        </Link>
      </div>
    </div>
  );
}
