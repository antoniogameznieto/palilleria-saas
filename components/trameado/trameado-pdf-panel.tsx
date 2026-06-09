import Link from "next/link";

import { PdfViewer } from "@/components/drawings/pdf-viewer";
import { Button } from "@/components/ui/button";

type TrameadoPdfPanelProps = {
  drawingId: string;
  fileName: string;
};

export function TrameadoPdfPanel({
  drawingId,
  fileName,
}: TrameadoPdfPanelProps) {
  const pdfHref = `/api/files/drawings/${drawingId}`;

  return (
    <div
      className="flex h-full min-h-0 flex-col rounded-lg border bg-card p-4"
      data-testid="trameado-pdf-panel"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Plano / isométrico</h3>
          <p className="text-xs text-muted-foreground">
            Consulta el isométrico mientras introduces los tramos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={pdfHref} target="_blank" rel="noopener noreferrer">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="trameado-pdf-open-button"
            >
              Abrir PDF
            </Button>
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <PdfViewer
          drawingId={drawingId}
          fileName={fileName}
          variant="panel"
        />
      </div>
    </div>
  );
}
