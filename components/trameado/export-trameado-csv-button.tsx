import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buildTrameadoCsvExportPath } from "@/lib/trameado/export-csv";

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
  const exportPath = buildTrameadoCsvExportPath(sheetId);

  if (!hasSegments) {
    return (
      <div className="space-y-1">
        <span
          className="inline-flex"
          title="Añade al menos un tramo para exportar la hoja"
        >
          <Button type="button" variant="outline" size="sm" disabled>
            Exportar CSV
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
      <Link href={exportPath} data-testid="trameado-export-csv">
        <Button type="button" variant="outline" size="sm">
          Exportar CSV
        </Button>
      </Link>
    </div>
  );
}
