import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  buildTrameadoMarkedPdfExportPath,
  canExportMarkedTrameadoPdf,
} from "@/lib/trameado/export-marked-pdf";

type ExportTrameadoMarkedPdfButtonProps = {
  sheetId: string;
  markedCount: number;
};

export function ExportTrameadoMarkedPdfButton({
  sheetId,
  markedCount,
}: ExportTrameadoMarkedPdfButtonProps) {
  const canExport = canExportMarkedTrameadoPdf(markedCount);
  const exportPath = buildTrameadoMarkedPdfExportPath(sheetId);

  if (!canExport) {
    return (
      <span
        className="inline-flex"
        title="Marca al menos un tramo en el isométrico."
        data-testid="trameado-export-marked-pdf-disabled"
      >
        <Button type="button" variant="outline" size="sm" disabled>
          Exportar PDF marcado
        </Button>
      </span>
    );
  }

  return (
    <Link href={exportPath} data-testid="trameado-export-marked-pdf">
      <Button type="button" variant="outline" size="sm">
        Exportar PDF marcado
      </Button>
    </Link>
  );
}
