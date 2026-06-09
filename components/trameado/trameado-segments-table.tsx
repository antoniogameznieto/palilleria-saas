"use client";

import { formatPalilloLength, formatSegmentLabel } from "@/lib/trameado/format";
import type { SerializedTrameadoSegment } from "@/lib/trameado/db";
import { DeleteTrameadoSegmentButton } from "@/components/trameado/delete-trameado-segment-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TrameadoSegmentsTableProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  segments: SerializedTrameadoSegment[];
  canManage: boolean;
  editingSegmentId: string | null;
  onEdit: (segmentId: string) => void;
};

function formatCell(value: string | null): string {
  if (value == null || value.trim() === "") {
    return "—";
  }

  return value;
}

export function TrameadoSegmentsTable({
  companyId,
  jobId,
  drawingId,
  segments,
  canManage,
  editingSegmentId,
  onEdit,
}: TrameadoSegmentsTableProps) {
  if (segments.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
        data-testid="trameado-segments-empty"
      >
        Todavía no hay tramos en esta hoja. Añade el primero para empezar.
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border"
      data-testid="trameado-segments-table"
    >
      <table className="w-full min-w-[40rem] table-fixed text-sm">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[20%]" />
          {canManage ? <col className="w-[16%]" /> : null}
        </colgroup>
        <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Nº</th>
            <th className="px-3 py-2 font-medium">Ø</th>
            <th className="px-3 py-2 font-medium">SCH.</th>
            <th className="px-3 py-2 font-medium">PALILLO</th>
            <th className="px-3 py-2 font-medium">COLADA</th>
            <th className="px-3 py-2 font-medium">Notas</th>
            {canManage ? (
              <th className="px-3 py-2 font-medium">Acciones</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {segments.map((segment) => (
            <tr
              key={segment.id}
              className={cn(
                "border-b last:border-b-0 hover:bg-muted/20",
                editingSegmentId === segment.id && "bg-muted/30",
              )}
              data-testid="trameado-segment-row"
            >
              <td className="px-3 py-2 align-top font-medium whitespace-nowrap">
                {formatSegmentLabel(segment.segmentNumber)}
              </td>
              <td className="px-3 py-2 align-top whitespace-nowrap">
                {segment.diameter}
              </td>
              <td className="px-3 py-2 align-top whitespace-nowrap">
                {segment.schedule}
              </td>
              <td className="px-3 py-2 align-top whitespace-nowrap">
                {formatPalilloLength(segment.palilloLength, segment.lengthUnit)}
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground whitespace-nowrap">
                {formatCell(segment.heatNumber)}
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">
                <span className="line-clamp-2" title={segment.notes ?? undefined}>
                  {formatCell(segment.notes)}
                </span>
              </td>
              {canManage ? (
                <td className="px-3 py-2 align-top">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      data-testid="trameado-edit-segment"
                      onClick={() => onEdit(segment.id)}
                    >
                      Editar
                    </Button>
                    <DeleteTrameadoSegmentButton
                      companyId={companyId}
                      jobId={jobId}
                      drawingId={drawingId}
                      segmentId={segment.id}
                    />
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
