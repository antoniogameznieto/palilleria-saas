"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExportJobTakeoffExcelButton } from "@/components/jobs/export-job-takeoff-excel-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DrawingProgressState } from "@/lib/drawings/drawing-progress";
import { TAKEOFF_UNIT_FILTER_ALL } from "@/lib/drawings/filter-takeoff-items";
import {
  buildJobTakeoffConsolidatedRows,
  buildJobTakeoffConsolidatedSummary,
  buildJobTakeoffConsolidatedUnitFilterOptions,
  filterJobTakeoffConsolidatedRows,
  filterJobTakeoffItemsByDrawingScope,
  JOB_TAKEOFF_DRAWING_SCOPE_OPTIONS,
  type JobTakeoffConsolidatedSummary,
  type JobTakeoffDrawingScope,
} from "@/lib/drawings/job-takeoff-consolidated";
import type { SerializedJobTakeoffExportItem } from "@/lib/drawings/job-takeoff-export";

type JobTakeoffConsolidatedSectionProps = {
  companyId: string;
  jobId: string;
  items: SerializedJobTakeoffExportItem[];
  drawingProgressByDrawingId: Record<string, DrawingProgressState>;
};

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatCell(value: string | null): string {
  if (value == null || value.trim() === "") {
    return "—";
  }

  return value;
}

function ConsolidatedSummary({
  summary,
}: {
  summary: JobTakeoffConsolidatedSummary;
}) {
  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <dt className="text-muted-foreground">Total líneas</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">
          {summary.lineCount}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Cantidad total</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">
          {summary.totalQuantity}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Referencias únicas</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">
          {summary.uniqueReferenceCount}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Planos incluidos</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">
          {summary.drawingCountWithTakeoff}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Planos no listos</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">
          {summary.pendingDrawingCount}
        </dd>
      </div>
    </dl>
  );
}

function SourceDrawingsCell({
  companyId,
  jobId,
  sourceDrawings,
}: {
  companyId: string;
  jobId: string;
  sourceDrawings: Array<{ drawingId: string; label: string }>;
}) {
  const maxVisible = 2;
  const visible = sourceDrawings.slice(0, maxVisible);
  const hiddenCount = sourceDrawings.length - visible.length;
  const fullLabels = sourceDrawings.map((drawing) => drawing.label).join(", ");

  return (
    <span className="text-muted-foreground" title={fullLabels}>
      {visible.map((drawing, index) => (
        <span key={drawing.drawingId}>
          {index > 0 ? ", " : null}
          <Link
            href={`/companies/${companyId}/jobs/${jobId}/drawings/${drawing.drawingId}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {drawing.label}
          </Link>
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span>{visible.length > 0 ? ", " : ""}+{hiddenCount}</span>
      ) : null}
    </span>
  );
}

export function JobTakeoffConsolidatedSection({
  companyId,
  jobId,
  items,
  drawingProgressByDrawingId,
}: JobTakeoffConsolidatedSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState(TAKEOFF_UNIT_FILTER_ALL);
  const [drawingScope, setDrawingScope] =
    useState<JobTakeoffDrawingScope>("all");

  const scopedItems = useMemo(
    () =>
      filterJobTakeoffItemsByDrawingScope(
        items,
        drawingScope,
        drawingProgressByDrawingId,
      ),
    [drawingProgressByDrawingId, drawingScope, items],
  );

  const consolidatedRows = useMemo(
    () => buildJobTakeoffConsolidatedRows(scopedItems),
    [scopedItems],
  );

  const unitFilterOptions = useMemo(
    () => buildJobTakeoffConsolidatedUnitFilterOptions(consolidatedRows),
    [consolidatedRows],
  );

  const activeUnitFilter =
    unitFilter !== TAKEOFF_UNIT_FILTER_ALL &&
    !unitFilterOptions.some((option) => option.value === unitFilter)
      ? TAKEOFF_UNIT_FILTER_ALL
      : unitFilter;

  const filteredRows = useMemo(
    () =>
      filterJobTakeoffConsolidatedRows(consolidatedRows, {
        searchQuery,
        unitFilter: activeUnitFilter,
      }),
    [activeUnitFilter, consolidatedRows, searchQuery],
  );

  const summary = useMemo(
    () =>
      buildJobTakeoffConsolidatedSummary(
        scopedItems,
        drawingProgressByDrawingId,
      ),
    [drawingProgressByDrawingId, scopedItems],
  );

  const jobWidePendingDrawings = useMemo(() => {
    const drawingIds = new Set(items.map((item) => item.drawingId));

    return Array.from(drawingIds).filter(
      (drawingId) => drawingProgressByDrawingId[drawingId] !== "ready",
    ).length;
  }, [drawingProgressByDrawingId, items]);

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Consolidado de palillería</CardTitle>
          <CardDescription>
            Agrupación de líneas de todos los planos del trabajo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Todavía no hay palillería registrada en este trabajo.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 border-b pb-3">
        <div>
          <CardTitle>Consolidado de palillería</CardTitle>
          <CardDescription>
            Cantidades globales agrupadas por referencia, descripción y unidad.
          </CardDescription>
        </div>
        <ExportJobTakeoffExcelButton
          companyId={companyId}
          jobId={jobId}
          itemCount={items.length}
          size="sm"
        />
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {jobWidePendingDrawings > 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            {jobWidePendingDrawings === 1
              ? "1 plano con palillería aún no está listo."
              : `${jobWidePendingDrawings} planos con palillería aún no están listos.`}{" "}
            Las cantidades pueden cambiar hasta completar metadatos y revisión de
            palillería.
          </p>
        ) : null}

        <ConsolidatedSummary summary={summary} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2 md:col-span-2 xl:col-span-1">
            <Label htmlFor="job-takeoff-consolidated-search">Buscar</Label>
            <Input
              id="job-takeoff-consolidated-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Referencia o descripción"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-takeoff-consolidated-unit">Unidad</Label>
            <select
              id="job-takeoff-consolidated-unit"
              value={activeUnitFilter}
              onChange={(event) => setUnitFilter(event.target.value)}
              className={selectClassName}
            >
              {unitFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-takeoff-consolidated-scope">Planos</Label>
            <select
              id="job-takeoff-consolidated-scope"
              value={drawingScope}
              onChange={(event) =>
                setDrawingScope(event.target.value as JobTakeoffDrawingScope)
              }
              className={selectClassName}
            >
              {JOB_TAKEOFF_DRAWING_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No hay líneas consolidadas que coincidan con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Referencia</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Unidad</th>
                  <th className="px-4 py-3 font-medium">Cantidad total</th>
                  <th className="px-4 py-3 font-medium">Nº líneas</th>
                  <th className="px-4 py-3 font-medium">Nº planos</th>
                  <th className="px-4 py-3 font-medium">Planos origen</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.groupKey} className="border-b last:border-b-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCell(row.reference)}
                    </td>
                    <td className="px-4 py-3 font-medium">{row.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.unit}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{row.totalQuantity}</td>
                    <td className="px-4 py-3 tabular-nums">{row.lineCount}</td>
                    <td className="px-4 py-3 tabular-nums">{row.drawingCount}</td>
                    <td className="px-4 py-3">
                      <SourceDrawingsCell
                        companyId={companyId}
                        jobId={jobId}
                        sourceDrawings={row.sourceDrawings}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {drawingScope === "ready_only" && summary.drawingCountWithTakeoff === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ningún plano listo incluye palillería todavía.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
