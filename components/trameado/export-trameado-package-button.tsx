import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  buildTrameadoPackageExportPath,
  canExportTrameadoPackage,
} from "@/lib/trameado/export-package";

type ExportTrameadoPackageButtonProps = {
  sheetId: string;
  segmentCount: number;
  markedCount: number;
};

export function ExportTrameadoPackageButton({
  sheetId,
  segmentCount,
  markedCount,
}: ExportTrameadoPackageButtonProps) {
  const canExport = canExportTrameadoPackage(segmentCount);
  const exportPath = buildTrameadoPackageExportPath(sheetId);

  if (!canExport) {
    return (
      <span
        className="inline-flex"
        title="Añade al menos un tramo para descargar el paquete."
        data-testid="trameado-export-package-disabled"
      >
        <Button type="button" variant="outline" size="sm" disabled>
          Descargar paquete
        </Button>
      </span>
    );
  }

  return (
    <div className="space-y-1">
      {markedCount === 0 ? (
        <p
          className="text-xs text-muted-foreground"
          data-testid="trameado-package-hint"
        >
          El paquete no incluirá PDF marcado hasta que marques tramos en el
          isométrico.
        </p>
      ) : null}
      <Link href={exportPath} data-testid="trameado-export-package">
        <Button type="button" variant="outline" size="sm">
          Descargar paquete
        </Button>
      </Link>
    </div>
  );
}
