"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { TrameadoReviewButton } from "@/components/trameado/trameado-review-button";
import { ExportTrameadoCsvButton } from "@/components/trameado/export-trameado-csv-button";
import { TrameadoSegmentForm } from "@/components/trameado/trameado-segment-form";
import { TrameadoSegmentsTable } from "@/components/trameado/trameado-segments-table";
import { TrameadoSheetForm } from "@/components/trameado/trameado-sheet-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SerializedTrameadoSheet } from "@/lib/trameado/db";
import { cn } from "@/lib/utils";

type TrameadoSectionProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  drawingFileName: string;
  sheets: SerializedTrameadoSheet[];
  canManage: boolean;
  suggestedLineIdentifier: string | null;
  variant?: "page" | "workspace";
};

function resolveNextSegmentNumber(segments: SerializedTrameadoSheet["segments"]) {
  const numericValues = segments
    .map((segment) => Number.parseInt(segment.segmentNumber, 10))
    .filter((value) => Number.isFinite(value));

  if (numericValues.length === 0) {
    return "1";
  }

  return String(Math.max(...numericValues) + 1);
}

function getSheetStatusLabel(sheet: SerializedTrameadoSheet): string {
  if (sheet.reviewedAt) {
    return "Revisada";
  }

  if (sheet.segments.length > 0) {
    return "En edición";
  }

  return "Sin tramos";
}

export function TrameadoSection({
  companyId,
  jobId,
  drawingId,
  drawingFileName,
  sheets,
  canManage,
  suggestedLineIdentifier,
  variant = "workspace",
}: TrameadoSectionProps) {
  const isWorkspace = variant === "workspace";
  const [userSheetId, setUserSheetId] = useState<string | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);

  const selectedSheetId = useMemo(() => {
    if (sheets.length === 0) {
      return "";
    }

    if (userSheetId && sheets.some((sheet) => sheet.id === userSheetId)) {
      return userSheetId;
    }

    return sheets[sheets.length - 1]!.id;
  }, [sheets, userSheetId]);

  const handleSheetCreated = (sheetId: string) => {
    setUserSheetId(sheetId);
    setShowCreateSheet(false);
  };

  const selectedSheet = useMemo(
    () => sheets.find((sheet) => sheet.id === selectedSheetId) ?? sheets[0] ?? null,
    [selectedSheetId, sheets],
  );

  const editingSegment =
    selectedSheet?.segments.find((segment) => segment.id === editingSegmentId) ??
    null;

  const nextSegmentNumber = selectedSheet
    ? resolveNextSegmentNumber(selectedSheet.segments)
    : "1";

  return (
    <Card
      id="trameado"
      className={cn(
        "scroll-mt-4",
        isWorkspace && "border-0 bg-transparent shadow-none",
      )}
      data-testid="trameado-section"
    >
      <CardHeader
        className={cn(
          "flex flex-row flex-wrap items-start justify-between gap-3",
          !isWorkspace && "border-b pb-4",
          isWorkspace && "px-0 pt-0",
        )}
      >
        <div className="space-y-1">
          <CardTitle className={isWorkspace ? "text-base" : "text-lg"}>
            Trameado
          </CardTitle>
          <CardDescription>
            Hoja de palillería por tramos fabricables. Introduce manualmente los
            palillos de corte para este plano.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/api/files/drawings/${drawingId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button type="button" variant="outline" size="sm">
              Ver PDF
            </Button>
          </Link>
          {canManage && sheets.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="trameado-create-sheet"
              onClick={() => {
                setShowCreateSheet((current) => !current);
                setShowAddSegment(false);
                setEditingSegmentId(null);
              }}
            >
              {showCreateSheet ? "Ocultar formulario" : "Nueva hoja"}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4", isWorkspace && "px-0 pb-0")}>
        {sheets.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Todavía no hay hoja de palilleo para este plano.
              </p>
              <p className="mt-1">
                Crea una hoja para empezar a introducir los tramos fabricables.
              </p>
            </div>

            {canManage ? (
              showCreateSheet ? (
                <TrameadoSheetForm
                  companyId={companyId}
                  jobId={jobId}
                  drawingId={drawingId}
                  suggestedLineIdentifier={suggestedLineIdentifier}
                  onCancel={() => setShowCreateSheet(false)}
                  onSuccess={handleSheetCreated}
                />
              ) : (
                <Button
                  type="button"
                  data-testid="trameado-create-sheet"
                  onClick={() => setShowCreateSheet(true)}
                >
                  Crear hoja de palilleo
                </Button>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                No tienes permiso para crear hojas de palilleo.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {showCreateSheet && canManage ? (
              <TrameadoSheetForm
                companyId={companyId}
                jobId={jobId}
                drawingId={drawingId}
                suggestedLineIdentifier={suggestedLineIdentifier}
                onCancel={() => setShowCreateSheet(false)}
                onSuccess={handleSheetCreated}
              />
            ) : null}

            {sheets.length > 1 ? (
              <div className="space-y-1">
                <label
                  htmlFor="trameado-sheet-select"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Hoja de palilleo
                </label>
                <select
                  id="trameado-sheet-select"
                  value={selectedSheet?.id ?? ""}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  data-testid="trameado-sheet-select"
                  onChange={(event) => {
                    setUserSheetId(event.target.value);
                    setShowAddSegment(false);
                    setEditingSegmentId(null);
                  }}
                >
                  {sheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.lineIdentifier} · {getSheetStatusLabel(sheet)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {selectedSheet ? (
              <>
                <div className="rounded-lg border bg-muted/15 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div>
                      <span className="text-muted-foreground">ISO · </span>
                      <span
                        className="font-medium"
                        data-testid="trameado-sheet-line-identifier"
                      >
                        {selectedSheet.lineIdentifier}
                      </span>
                    </div>
                    {selectedSheet.lineClass ? (
                      <div>
                        <span className="text-muted-foreground">CLASE · </span>
                        <span className="font-medium">
                          {selectedSheet.lineClass}
                        </span>
                      </div>
                    ) : null}
                    <div>
                      <span className="text-muted-foreground">Estado · </span>
                      <span className="font-medium">
                        {getSheetStatusLabel(selectedSheet)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tramos · </span>
                      <span className="font-medium">
                        {selectedSheet.segments.length}
                      </span>
                    </div>
                  </div>
                  {selectedSheet.notes ? (
                    <p className="mt-2 text-muted-foreground">
                      {selectedSheet.notes}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Plano: {drawingFileName}
                  </p>
                </div>

                <TrameadoReviewButton
                  companyId={companyId}
                  jobId={jobId}
                  drawingId={drawingId}
                  sheetId={selectedSheet.id}
                  segmentCount={selectedSheet.segments.length}
                  reviewedAt={selectedSheet.reviewedAt}
                  reviewedByLabel={selectedSheet.reviewedByLabel}
                  canManage={canManage}
                />

                <ExportTrameadoCsvButton
                  sheetId={selectedSheet.id}
                  segmentCount={selectedSheet.segments.length}
                  reviewedAt={selectedSheet.reviewedAt}
                />

                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      data-testid="trameado-add-segment"
                      onClick={() => {
                        setShowAddSegment((current) => !current);
                        setEditingSegmentId(null);
                      }}
                    >
                      {showAddSegment ? "Ocultar formulario" : "Añadir tramo"}
                    </Button>
                  </div>
                ) : null}

                {canManage && showAddSegment ? (
                  <TrameadoSegmentForm
                    companyId={companyId}
                    jobId={jobId}
                    drawingId={drawingId}
                    sheetId={selectedSheet.id}
                    mode="create"
                    nextSegmentNumber={nextSegmentNumber}
                    onCancel={() => setShowAddSegment(false)}
                    onSuccess={() => setShowAddSegment(false)}
                  />
                ) : null}

                {canManage && editingSegment ? (
                  <TrameadoSegmentForm
                    companyId={companyId}
                    jobId={jobId}
                    drawingId={drawingId}
                    sheetId={selectedSheet.id}
                    mode="edit"
                    segment={editingSegment}
                    onCancel={() => setEditingSegmentId(null)}
                    onSuccess={() => setEditingSegmentId(null)}
                  />
                ) : null}

                <TrameadoSegmentsTable
                  companyId={companyId}
                  jobId={jobId}
                  drawingId={drawingId}
                  segments={selectedSheet.segments}
                  canManage={canManage}
                  editingSegmentId={editingSegmentId}
                  onEdit={(segmentId) => {
                    setEditingSegmentId(segmentId);
                    setShowAddSegment(false);
                  }}
                />
              </>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
