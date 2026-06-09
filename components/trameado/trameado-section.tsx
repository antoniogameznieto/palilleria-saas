"use client";

import { useMemo, useState } from "react";

import { TrameadoCandidateDimensionsPanel } from "@/components/trameado/trameado-candidate-dimensions-panel";
import { TrameadoReviewButton } from "@/components/trameado/trameado-review-button";
import { ExportTrameadoCsvButton } from "@/components/trameado/export-trameado-csv-button";
import { TrameadoPdfPanel } from "@/components/trameado/trameado-pdf-panel";
import {
  TrameadoSegmentForm,
  type TrameadoAssistedSegmentDraft,
  type TrameadoStickySegmentValues,
} from "@/components/trameado/trameado-segment-form";
import { TrameadoSegmentsTable } from "@/components/trameado/trameado-segments-table";
import { TrameadoSheetAssistant } from "@/components/trameado/trameado-sheet-assistant";
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
import type { SerializedCandidateDimensionsResult } from "@/lib/trameado/candidate-dimensions";
import {
  getCreatableTrameadoSheetSuggestions,
  shouldShowTrameadoSheetAssistant,
  type TrameadoSheetSuggestion,
} from "@/lib/trameado/suggestions";
import {
  formatTrameadoSheetSummary,
  getNextSegmentNumber,
} from "@/lib/trameado/segment-helpers";
import { cn } from "@/lib/utils";

type TrameadoSectionProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  drawingFileName: string;
  sheets: SerializedTrameadoSheet[];
  sheetSuggestions: TrameadoSheetSuggestion[];
  candidateDimensions: SerializedCandidateDimensionsResult;
  canManage: boolean;
  suggestedLineIdentifier: string | null;
  variant?: "page" | "workspace";
};

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
  sheetSuggestions,
  candidateDimensions,
  canManage,
  suggestedLineIdentifier,
  variant = "workspace",
}: TrameadoSectionProps) {
  const isWorkspace = variant === "workspace";
  const [userSheetId, setUserSheetId] = useState<string | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [stickyCreateValues, setStickyCreateValues] =
    useState<TrameadoStickySegmentValues | undefined>();
  const [assistedSegmentDraft, setAssistedSegmentDraft] =
    useState<TrameadoAssistedSegmentDraft | null>(null);

  const clearAssistedSegmentDraft = () => {
    setAssistedSegmentDraft(null);
  };

  const handleSegmentStickyCapture = (sticky: TrameadoStickySegmentValues) => {
    setStickyCreateValues(sticky);
  };

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
    ? getNextSegmentNumber(selectedSheet.segments)
    : "1";

  const sheetSummary = selectedSheet
    ? formatTrameadoSheetSummary(selectedSheet.segments)
    : "0 tramos · 0 mm";

  const showAssistant =
    canManage &&
    shouldShowTrameadoSheetAssistant(sheetSuggestions, sheets.length);
  const creatableSuggestionCount = getCreatableTrameadoSheetSuggestions(
    sheetSuggestions,
  ).length;

  const activeAssistedSegmentDraft = useMemo(() => {
    if (!assistedSegmentDraft || !selectedSheet) {
      return null;
    }

    if (
      selectedSheet.segments.length !==
      assistedSegmentDraft.segmentCountAtPrepare
    ) {
      return null;
    }

    return assistedSegmentDraft;
  }, [assistedSegmentDraft, selectedSheet]);

  const handlePrepareSegmentFromCandidate = (value: string) => {
    if (!canManage || !selectedSheet) {
      return;
    }

    setEditingSegmentId(null);
    setShowAddSegment(true);
    setAssistedSegmentDraft({
      palilloLength: value,
      token: Date.now(),
      segmentCountAtPrepare: selectedSheet.segments.length,
    });
  };

  const handleSuggestedSheetsCreated = (sheetIds: string[]) => {
    const lastSheetId = sheetIds[sheetIds.length - 1];

    if (lastSheetId) {
      setUserSheetId(lastSheetId);
    }

    setShowCreateSheet(false);
  };

  const sheetPanel = (
    <div
      className="flex min-h-0 flex-col rounded-lg border bg-card p-4"
      data-testid="trameado-sheet-panel"
    >
      <div className="mb-4 space-y-3 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Hoja de palilleo</h3>
            <p className="text-xs text-muted-foreground">
              Introduce manualmente los tramos fabricables de este plano.
            </p>
          </div>
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

        {selectedSheet ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Estado · </span>
              <span className="font-medium">{getSheetStatusLabel(selectedSheet)}</span>
            </div>
            <div
              className="tabular-nums text-muted-foreground"
              data-testid="trameado-segment-summary"
            >
              {sheetSummary}
            </div>
            <ExportTrameadoCsvButton
              sheetId={selectedSheet.id}
              segmentCount={selectedSheet.segments.length}
              reviewedAt={selectedSheet.reviewedAt}
            />
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4">
        {sheets.length === 0 ? (
          <div className="space-y-4">
            {showAssistant ? (
              <TrameadoSheetAssistant
                key={sheetSuggestions
                  .map((suggestion) => `${suggestion.suggestionKey}:${suggestion.alreadyExists}`)
                  .join("|")}
                companyId={companyId}
                jobId={jobId}
                drawingId={drawingId}
                suggestions={sheetSuggestions}
                onSheetsCreated={handleSuggestedSheetsCreated}
              />
            ) : null}

            <div className="rounded-lg border border-dashed bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Todavía no hay hoja de palilleo para este plano.
              </p>
              <p className="mt-1">
                {creatableSuggestionCount > 0
                  ? "Usa el asistente o crea una hoja manualmente para empezar a introducir los tramos fabricables."
                  : "Crea una hoja para empezar a introducir los tramos fabricables."}
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
                  variant="outline"
                  data-testid="trameado-create-sheet"
                  onClick={() => setShowCreateSheet(true)}
                >
                  Crear hoja manualmente
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
            {showAssistant ? (
              <TrameadoSheetAssistant
                key={sheetSuggestions
                  .map((suggestion) => `${suggestion.suggestionKey}:${suggestion.alreadyExists}`)
                  .join("|")}
                companyId={companyId}
                jobId={jobId}
                drawingId={drawingId}
                suggestions={sheetSuggestions}
                onSheetsCreated={handleSuggestedSheetsCreated}
              />
            ) : null}

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
                  Hoja activa
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
                    setStickyCreateValues(undefined);
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
                  </div>
                  {selectedSheet.notes ? (
                    <p className="mt-2 text-muted-foreground">
                      {selectedSheet.notes}
                    </p>
                  ) : null}
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

                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      data-testid="trameado-add-segment"
                      onClick={() => {
                        setShowAddSegment((current) => {
                          if (current) {
                            clearAssistedSegmentDraft();
                          }

                          return !current;
                        });
                        setEditingSegmentId(null);
                      }}
                    >
                      {showAddSegment ? "Ocultar formulario" : "Añadir tramo"}
                    </Button>
                  </div>
                ) : null}

                {canManage && showAddSegment ? (
                  <TrameadoSegmentForm
                    key={`create-${selectedSheet.id}-${selectedSheet.segments.length}-${activeAssistedSegmentDraft?.token ?? "base"}`}
                    companyId={companyId}
                    jobId={jobId}
                    drawingId={drawingId}
                    sheetId={selectedSheet.id}
                    mode="create"
                    nextSegmentNumber={nextSegmentNumber}
                    stickyValues={stickyCreateValues}
                    assistedDraft={activeAssistedSegmentDraft}
                    onAssistedDraftClear={clearAssistedSegmentDraft}
                    onCancel={() => {
                      clearAssistedSegmentDraft();
                      setShowAddSegment(false);
                    }}
                    onSubmitCapture={handleSegmentStickyCapture}
                  />
                ) : null}

                {canManage && editingSegment ? (
                  <TrameadoSegmentForm
                    key={`edit-${editingSegment.id}`}
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

                <div className="max-h-[min(50vh,28rem)] overflow-y-auto rounded-lg">
                  <TrameadoSegmentsTable
                    companyId={companyId}
                    jobId={jobId}
                    drawingId={drawingId}
                    sheetId={selectedSheet.id}
                    segments={selectedSheet.segments}
                    canManage={canManage}
                    editingSegmentId={editingSegmentId}
                    showSummary={false}
                    onEdit={(segmentId) => {
                      setEditingSegmentId(segmentId);
                      setShowAddSegment(false);
                      clearAssistedSegmentDraft();
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );

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
          !isWorkspace && "border-b pb-4",
          isWorkspace && "px-0 pt-0",
        )}
      >
        <div className="space-y-1">
          <CardTitle className={isWorkspace ? "text-base" : "text-lg"}>
            Trameado
          </CardTitle>
          <CardDescription>
            Consulta el isométrico y completa la hoja de palilleo en paralelo.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className={cn(isWorkspace && "px-0 pb-0")}>
        <div
          className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start"
          data-testid="trameado-workspace"
        >
          <div className="order-1 lg:order-2">{sheetPanel}</div>
          <div className="order-2 lg:order-1 lg:sticky lg:top-4 space-y-4">
            <TrameadoPdfPanel
              drawingId={drawingId}
              fileName={drawingFileName}
            />
            <TrameadoCandidateDimensionsPanel
              result={candidateDimensions}
              canPrepareSegment={Boolean(selectedSheet)}
              onPrepareSegment={
                canManage && selectedSheet
                  ? handlePrepareSegmentFromCandidate
                  : undefined
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
