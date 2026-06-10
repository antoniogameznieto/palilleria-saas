"use client";

import { formatPalilloLength } from "@/lib/trameado/format";
import type { SerializedTrameadoSegment } from "@/lib/trameado/db";
import {
  formatTrameadoSegmentDisplayLabel,
  formatTrameadoSheetSummary,
  getNextSegmentNumber,
  sortTrameadoSegmentsForDisplay,
} from "@/lib/trameado/segment-helpers";
import { DeleteTrameadoSegmentButton } from "@/components/trameado/delete-trameado-segment-button";
import { DuplicateTrameadoSegmentButton } from "@/components/trameado/duplicate-trameado-segment-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TrameadoSegmentsTableProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  sheetId: string;
  segments: SerializedTrameadoSegment[];
  canManage: boolean;
  editingSegmentId: string | null;
  showSummary?: boolean;
  markingSegmentId?: string | null;
  markedSegmentIds?: Set<string>;
  onEdit: (segmentId: string) => void;
  onMarkOnDrawing?: (segmentId: string) => void;
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
  sheetId,
  segments,
  canManage,
  editingSegmentId,
  showSummary = true,
  markingSegmentId = null,
  markedSegmentIds,
  onEdit,
  onMarkOnDrawing,
}: TrameadoSegmentsTableProps) {
  const sortedSegments = sortTrameadoSegmentsForDisplay(segments);
  const nextSegmentNumber = getNextSegmentNumber(segments);

  if (segments.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed bg-muted/10 px-4 py-5 text-center text-sm text-muted-foreground"
        data-testid="trameado-segments-empty"
      >
        Todavía no hay tramos. Usa una cota candidata o introduce un PALILLO
        manualmente.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showSummary ? (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
          data-testid="trameado-segment-summary"
        >
          <span className="font-medium text-foreground">Hoja de palilleo</span>
          <span className="tabular-nums text-muted-foreground">
            {formatTrameadoSheetSummary(segments)}
          </span>
        </div>
      ) : null}

      <div
        className="overflow-x-auto rounded-lg border"
        data-testid="trameado-segments-table"
      >
        <table className="w-full min-w-[36rem] table-fixed text-sm">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
            {canManage ? <col className="w-[18%]" /> : null}
          </colgroup>
          <thead className="border-b bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2.5 py-2 font-semibold">Nº</th>
              <th className="px-2.5 py-2 font-semibold">Ø</th>
              <th className="px-2.5 py-2 font-semibold">SCH.</th>
              <th className="px-2.5 py-2 font-semibold">PALILLO</th>
              <th className="px-2.5 py-2 font-medium">COLADA</th>
              <th className="px-2.5 py-2 font-medium">Notas</th>
              {canManage ? (
                <th className="px-2.5 py-2 font-medium">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sortedSegments.map((segment) => (
              <tr
                key={segment.id}
                className={cn(
                  "border-b last:border-b-0 hover:bg-muted/15",
                  editingSegmentId === segment.id && "bg-muted/25",
                  markingSegmentId === segment.id && "bg-primary/5",
                )}
                data-testid="trameado-segment-row"
              >
                <td className="px-2.5 py-2 align-middle font-bold whitespace-nowrap text-foreground">
                  {formatTrameadoSegmentDisplayLabel(segment)}
                </td>
                <td className="px-2.5 py-2 align-middle font-medium whitespace-nowrap">
                  {segment.diameter}
                </td>
                <td className="px-2.5 py-2 align-middle font-medium whitespace-nowrap">
                  {segment.schedule}
                </td>
                <td className="px-2.5 py-2 align-middle text-base font-semibold tabular-nums whitespace-nowrap">
                  {formatPalilloLength(segment.palilloLength, segment.lengthUnit)}
                </td>
                <td className="px-2.5 py-2 align-middle text-xs text-muted-foreground whitespace-nowrap">
                  {formatCell(segment.heatNumber)}
                </td>
                <td className="px-2.5 py-2 align-middle text-xs text-muted-foreground">
                  <span
                    className="line-clamp-1"
                    title={segment.notes ?? undefined}
                  >
                    {formatCell(segment.notes)}
                  </span>
                </td>
                {canManage ? (
                  <td className="px-2.5 py-2 align-middle">
                    <div className="flex flex-wrap gap-0.5">
                      {onMarkOnDrawing ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          data-testid="trameado-mark-on-drawing"
                          onClick={() => onMarkOnDrawing(segment.id)}
                        >
                          {markedSegmentIds?.has(segment.id)
                            ? "Volver a marcar"
                            : "Marcar en plano"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        data-testid="trameado-edit-segment"
                        onClick={() => onEdit(segment.id)}
                      >
                        Editar
                      </Button>
                      <DuplicateTrameadoSegmentButton
                        companyId={companyId}
                        jobId={jobId}
                        drawingId={drawingId}
                        sheetId={sheetId}
                        segment={segment}
                        nextSegmentNumber={nextSegmentNumber}
                      />
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
    </div>
  );
}
