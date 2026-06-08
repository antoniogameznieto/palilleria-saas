"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DrawingStatus } from "@prisma/client";

import { DeleteDrawingButton } from "@/components/drawings/delete-drawing-button";
import { DrawingStatusBadge } from "@/components/drawings/drawing-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DRAWING_LIST_STATUS_FILTER_OPTIONS,
  filterDrawings,
  type DrawingListStatusFilter,
} from "@/lib/drawings/filter-drawings";

type DrawingRow = {
  id: string;
  fileName: string;
  originalFileName: string;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  status: DrawingStatus;
  createdAt: string;
};

type DrawingsTableProps = {
  companyId: string;
  jobId: string;
  drawings: DrawingRow[];
  canDelete: boolean;
};

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatMetadataCell(value: string | null): string {
  if (value == null || value.trim() === "") {
    return "—";
  }

  return value;
}

function formatUploadedAt(value: string): string {
  return new Date(value).toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function DrawingsTable({
  companyId,
  jobId,
  drawings,
  canDelete,
}: DrawingsTableProps) {
  const [statusFilter, setStatusFilter] =
    useState<DrawingListStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDrawings = useMemo(
    () => filterDrawings(drawings, statusFilter, searchQuery),
    [drawings, searchQuery, statusFilter],
  );

  if (drawings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay planos subidos todavía.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label htmlFor="drawing-status-filter">Estado</Label>
          <select
            id="drawing-status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as DrawingListStatusFilter)
            }
            className={selectClassName}
          >
            {DRAWING_LIST_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="drawing-search">Buscar</Label>
          <Input
            id="drawing-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Nombre, número de plano, línea o revisión"
          />
        </div>
      </div>

      {filteredDrawings.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No hay planos que coincidan con los filtros aplicados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Archivo / plano</th>
                <th className="px-4 py-3 font-medium">Nº plano</th>
                <th className="px-4 py-3 font-medium">Nº línea</th>
                <th className="px-4 py-3 font-medium">Revisión</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Subido</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrawings.map((drawing) => {
                const detailHref = `/companies/${companyId}/jobs/${jobId}/drawings/${drawing.id}`;

                return (
                  <tr key={drawing.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{drawing.originalFileName}</p>
                      {drawing.fileName !== drawing.originalFileName ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {drawing.fileName}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatMetadataCell(drawing.drawingNumber)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatMetadataCell(drawing.lineNumber)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatMetadataCell(drawing.revision)}
                    </td>
                    <td className="px-4 py-3">
                      <DrawingStatusBadge status={drawing.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatUploadedAt(drawing.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={detailHref}>
                          <Button size="sm" type="button">
                            Ver plano
                          </Button>
                        </Link>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
