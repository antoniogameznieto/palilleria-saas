import Link from "next/link";
import type { DrawingStatus } from "@prisma/client";

import { DeleteDrawingButton } from "@/components/drawings/delete-drawing-button";
import { DrawingStatusBadge } from "@/components/drawings/drawing-status-badge";
import { FileSize } from "@/components/drawings/file-size";
import { Button } from "@/components/ui/button";

type DrawingRow = {
  id: string;
  originalFileName: string;
  status: DrawingStatus;
  createdAt: Date;
  fileSize: bigint | null;
};

type DrawingsTableProps = {
  companyId: string;
  jobId: string;
  drawings: DrawingRow[];
  canDelete: boolean;
};

export function DrawingsTable({
  companyId,
  jobId,
  drawings,
  canDelete,
}: DrawingsTableProps) {
  if (drawings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay planos subidos todavía.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Archivo</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Tamaño</th>
            <th className="px-4 py-3 font-medium">Subido</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {drawings.map((drawing) => (
            <tr key={drawing.id} className="border-b last:border-b-0">
              <td className="px-4 py-3">
                <Link
                  href={`/companies/${companyId}/jobs/${jobId}/drawings/${drawing.id}`}
                  className="font-medium hover:underline"
                >
                  {drawing.originalFileName}
                </Link>
              </td>
              <td className="px-4 py-3">
                <DrawingStatusBadge status={drawing.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <FileSize bytes={drawing.fileSize} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {drawing.createdAt.toLocaleDateString("es-ES")}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/files/drawings/${drawing.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" type="button">
                      Abrir PDF
                    </Button>
                  </a>
                  {canDelete ? (
                    <DeleteDrawingButton
                      companyId={companyId}
                      jobId={jobId}
                      drawingId={drawing.id}
                    />
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
