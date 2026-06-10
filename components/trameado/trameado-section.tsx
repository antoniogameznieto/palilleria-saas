"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  deleteTrameadoAnnotationAction,
  upsertTrameadoAnnotationAction,
} from "@/lib/actions/trameado";

import { TrameadoGuidedWizard } from "@/components/trameado/trameado-guided-wizard";
import { TrameadoCandidateDimensionsPanel } from "@/components/trameado/trameado-candidate-dimensions-panel";
import { TrameadoReviewButton } from "@/components/trameado/trameado-review-button";
import { ExportTrameadoCsvButton } from "@/components/trameado/export-trameado-csv-button";
import { ExportTrameadoMarkedPdfButton } from "@/components/trameado/export-trameado-marked-pdf-button";
import { ExportTrameadoPackageButton } from "@/components/trameado/export-trameado-package-button";
import { TrameadoIsoMarkingPanel } from "@/components/trameado/trameado-iso-marking-panel";
import { TrameadoPdfPanel } from "@/components/trameado/trameado-pdf-panel";
import {
  TrameadoSegmentForm,
  type TrameadoAssistedSegmentDraft,
  type TrameadoStickySegmentValues,
} from "@/components/trameado/trameado-segment-form";
import { TrameadoSegmentSuggestionsPanel } from "@/components/trameado/trameado-segment-suggestions-panel";
import { TrameadoSheetValidationPanel } from "@/components/trameado/trameado-sheet-validation-panel";
import { TrameadoSegmentsTable } from "@/components/trameado/trameado-segments-table";
import { TrameadoSheetAssistant } from "@/components/trameado/trameado-sheet-assistant";
import { TrameadoSheetForm } from "@/components/trameado/trameado-sheet-form";
import { Badge } from "@/components/ui/badge";
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
  pickBestPipeHintsFromTakeoffItems,
  shouldShowTrameadoSheetAssistant,
  type TrameadoSheetSuggestion,
} from "@/lib/trameado/suggestions";
import {
  formatTrameadoSheetSummary,
  getNextSegmentNumber,
} from "@/lib/trameado/segment-helpers";
import {
  buildTrameadoSegmentSuggestions,
  type TrameadoSegmentSuggestion,
} from "@/lib/trameado/segment-suggestions";
import {
  buildTrameadoPdfAnnotationSummary,
  formatAnnotationSegmentLabel,
  pruneAnnotationsForSegments,
  toTrameadoPdfAnnotation,
  upsertAnnotationForSegment,
  type TrameadoPdfAnnotation,
} from "@/lib/trameado/pdf-annotations";
import { validateTrameadoSheet } from "@/lib/trameado/sheet-validation";
import { buildTrameadoWizardState } from "@/lib/trameado/wizard-state";
import { cn } from "@/lib/utils";
import type { SerializedTakeoffItem } from "@/lib/drawings/takeoff";

type TrameadoSectionProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  drawingFileName: string;
  sheets: SerializedTrameadoSheet[];
  sheetSuggestions: TrameadoSheetSuggestion[];
  candidateDimensions: SerializedCandidateDimensionsResult;
  takeoffItems: SerializedTakeoffItem[];
  canManage: boolean;
  suggestedLineIdentifier: string | null;
  variant?: "page" | "workspace";
};

type SheetStatus = "none" | "empty" | "editing" | "reviewed";

function getSheetStatus(sheet: SerializedTrameadoSheet | null): SheetStatus {
  if (!sheet) {
    return "none";
  }

  if (sheet.reviewedAt) {
    return "reviewed";
  }

  if (sheet.segments.length > 0) {
    return "editing";
  }

  return "empty";
}

function getSheetStatusLabel(status: SheetStatus): string {
  switch (status) {
    case "reviewed":
      return "Revisada";
    case "editing":
      return "En edición";
    case "empty":
      return "Sin tramos";
    default:
      return "Sin hoja";
  }
}

function statusBadgeVariant(
  status: SheetStatus,
): "default" | "secondary" | "outline" {
  if (status === "reviewed") {
    return "default";
  }

  if (status === "editing") {
    return "secondary";
  }

  return "outline";
}

const WORKFLOW_STEPS = [
  "Hoja de palilleo",
  "Cotas candidatas",
  "Tramos",
  "Export / revisión",
] as const;

export function TrameadoSection({
  companyId,
  jobId,
  drawingId,
  drawingFileName,
  sheets,
  sheetSuggestions,
  candidateDimensions,
  takeoffItems,
  canManage,
  suggestedLineIdentifier,
  variant = "workspace",
}: TrameadoSectionProps) {
  const router = useRouter();
  const isWorkspace = variant === "workspace";
  const [userSheetId, setUserSheetId] = useState<string | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [stickyCreateValues, setStickyCreateValues] =
    useState<TrameadoStickySegmentValues | undefined>();
  const [assistedSegmentDraft, setAssistedSegmentDraft] =
    useState<TrameadoAssistedSegmentDraft | null>(null);
  const [markingSegmentId, setMarkingSegmentId] = useState<string | null>(null);
  const [annotationError, setAnnotationError] = useState<string | null>(null);
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] =
    useState<TrameadoPdfAnnotation | null>(null);
  const previousSheetCountRef = useRef(sheets.length);

  const clearAssistedSegmentDraft = () => {
    setAssistedSegmentDraft(null);
  };

  useEffect(() => {
    if (sheets.length > previousSheetCountRef.current) {
      setShowCreateSheet(false);
      setShowAddSegment(false);
      setEditingSegmentId(null);
      setAssistedSegmentDraft(null);
      setMarkingSegmentId(null);
    }

    previousSheetCountRef.current = sheets.length;
  }, [sheets.length]);

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
    setMarkingSegmentId(null);
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

  const sheetStatus = getSheetStatus(selectedSheet);
  const sheetSummary = selectedSheet
    ? formatTrameadoSheetSummary(selectedSheet.segments)
    : "0 tramos · 0 mm";

  const showAssistant =
    canManage &&
    shouldShowTrameadoSheetAssistant(sheetSuggestions, sheets.length);
  const hasSheet = sheets.length > 0;

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

  const sheetDefaults = useMemo(() => {
    if (!selectedSheet) {
      return {
        diameter: stickyCreateValues?.diameter ?? "",
        schedule: stickyCreateValues?.schedule ?? "",
        heatNumber: stickyCreateValues?.heatNumber ?? "",
      };
    }

    const matchedSuggestion = sheetSuggestions.find(
      (suggestion) =>
        suggestion.lineIdentifier === selectedSheet.lineIdentifier,
    );
    const pipeHints = pickBestPipeHintsFromTakeoffItems(
      takeoffItems.map((item) => ({
        description: item.description,
        reference: item.reference,
        unit: item.unit,
      })),
    );

    return {
      diameter:
        stickyCreateValues?.diameter ??
        matchedSuggestion?.diameter ??
        pipeHints?.diameter ??
        "",
      schedule:
        stickyCreateValues?.schedule ??
        matchedSuggestion?.schedule ??
        pipeHints?.schedule ??
        "",
      heatNumber: stickyCreateValues?.heatNumber ?? "",
    };
  }, [selectedSheet, sheetSuggestions, stickyCreateValues, takeoffItems]);

  const annotationsBySheet = useMemo(
    () =>
      Object.fromEntries(
        sheets.map((sheet) => [
          sheet.id,
          sheet.annotations.map((annotation) =>
            toTrameadoPdfAnnotation(annotation),
          ),
        ]),
      ),
    [sheets],
  );

  const sheetAnnotations = useMemo(() => {
    if (!selectedSheet) {
      return [];
    }

    const stored = annotationsBySheet[selectedSheet.id] ?? [];

    const pruned = pruneAnnotationsForSegments(
      stored,
      selectedSheet.segments.map((segment) => ({
        id: segment.id,
        segmentNumber: segment.segmentNumber,
        segmentLabel: segment.segmentLabel,
        palilloLength: segment.palilloLength,
      })),
    );

    if (pendingAnnotation) {
      return upsertAnnotationForSegment(pruned, pendingAnnotation);
    }

    return pruned;
  }, [annotationsBySheet, pendingAnnotation, selectedSheet]);

  const annotationSummary = useMemo(
    () =>
      buildTrameadoPdfAnnotationSummary(
        (selectedSheet?.segments ?? []).map((segment) => ({
          id: segment.id,
          segmentNumber: segment.segmentNumber,
          segmentLabel: segment.segmentLabel,
          palilloLength: segment.palilloLength,
        })),
        sheetAnnotations,
      ),
    [selectedSheet, sheetAnnotations],
  );

  const markedSegmentIds = useMemo(
    () =>
      new Set(
        annotationSummary.items
          .filter((item) => item.marked)
          .map((item) => item.segmentId),
      ),
    [annotationSummary.items],
  );

  const markingSegment = useMemo(() => {
    if (!selectedSheet || !markingSegmentId) {
      return null;
    }

    const segment = selectedSheet.segments.find(
      (item) => item.id === markingSegmentId,
    );

    if (!segment) {
      return null;
    }

    return {
      id: segment.id,
      segmentNumber: segment.segmentNumber,
      segmentLabel: segment.segmentLabel,
      palilloLength: segment.palilloLength,
    };
  }, [markingSegmentId, selectedSheet]);

  const markingSegmentLabel = markingSegment
    ? formatAnnotationSegmentLabel(markingSegment)
    : null;

  const handleStartMarkingSegment = (segmentId: string) => {
    if (!canManage) {
      return;
    }

    setMarkingSegmentId(segmentId);
    setShowAddSegment(false);
    setEditingSegmentId(null);
    clearAssistedSegmentDraft();
  };

  const buildAnnotationScopeFormData = (segmentId: string) => {
    const formData = new FormData();
    formData.append("companyId", companyId);
    formData.append("jobId", jobId);
    formData.append("drawingId", drawingId);
    formData.append("sheetId", selectedSheet!.id);
    formData.append("segmentId", segmentId);
    return formData;
  };

  const handleAnnotationCreated = async (annotation: TrameadoPdfAnnotation) => {
    if (!selectedSheet || !canManage || isSavingAnnotation) {
      return;
    }

    setIsSavingAnnotation(true);
    setAnnotationError(null);
    setPendingAnnotation(annotation);

    const formData = buildAnnotationScopeFormData(annotation.segmentId);
    formData.append("type", annotation.type);
    formData.append("pageNumber", String(annotation.pageNumber));
    formData.append("x", String(annotation.x));
    formData.append("y", String(annotation.y));

    if (
      annotation.type === "rect" &&
      annotation.width !== undefined &&
      annotation.height !== undefined
    ) {
      formData.append("width", String(annotation.width));
      formData.append("height", String(annotation.height));
    }

    const result = await upsertTrameadoAnnotationAction({}, formData);
    setIsSavingAnnotation(false);

    if (result.error) {
      setAnnotationError(result.error);
      setPendingAnnotation(null);
      return;
    }

    setMarkingSegmentId(null);
    setPendingAnnotation(null);
    router.refresh();
  };

  const handleAnnotationDelete = async (segmentId: string) => {
    if (!selectedSheet || !canManage || isSavingAnnotation) {
      return;
    }

    setIsSavingAnnotation(true);
    setAnnotationError(null);

    const formData = buildAnnotationScopeFormData(segmentId);
    const result = await deleteTrameadoAnnotationAction({}, formData);
    setIsSavingAnnotation(false);

    if (result.error) {
      setAnnotationError(result.error);
      return;
    }

    if (markingSegmentId === segmentId) {
      setMarkingSegmentId(null);
    }

    router.refresh();
  };

  const handleAnnotationDeleteById = async (annotationId: string) => {
    const annotation = sheetAnnotations.find((item) => item.id === annotationId);

    if (!annotation) {
      return;
    }

    await handleAnnotationDelete(annotation.segmentId);
  };

  const sheetValidation = useMemo(
    () =>
      validateTrameadoSheet({
        hasActiveSheet: Boolean(selectedSheet),
        segments: selectedSheet?.segments ?? [],
        takeoffItems: takeoffItems.map((item) => ({
          description: item.description,
          reference: item.reference,
          quantity: item.quantity,
          unit: item.unit,
        })),
      }),
    [selectedSheet, takeoffItems],
  );

  const segmentSuggestionsResult = useMemo(
    () =>
      buildTrameadoSegmentSuggestions({
        candidateDimensions,
        existingSegments: selectedSheet?.segments ?? [],
        sheetDefaults,
        options: {
          hasActiveSheet: Boolean(selectedSheet),
          fileName: drawingFileName,
          drawingNumber: selectedSheet?.lineIdentifier ?? drawingFileName,
        },
      }),
    [
      candidateDimensions,
      drawingFileName,
      selectedSheet,
      sheetDefaults,
    ],
  );

  const wizardState = useMemo(
    () =>
      buildTrameadoWizardState({
        hasSheet: Boolean(selectedSheet),
        segmentSuggestions: segmentSuggestionsResult,
        confirmedSegmentsCount: selectedSheet?.segments.length ?? 0,
        annotationSummary,
        validation: sheetValidation,
        segments: (selectedSheet?.segments ?? []).map((segment) => ({
          id: segment.id,
          segmentLabel: segment.segmentLabel ?? segment.segmentNumber,
          segmentNumber: segment.segmentNumber,
        })),
      }),
    [
      annotationSummary,
      segmentSuggestionsResult,
      selectedSheet,
      sheetValidation,
    ],
  );

  const primarySheetSuggestion = useMemo(
    () =>
      sheetSuggestions.find((suggestion) => !suggestion.alreadyExists) ?? null,
    [sheetSuggestions],
  );

  const handleWizardCreateSheet = () => {
    setShowCreateSheet(true);
    setShowAddSegment(false);
    setEditingSegmentId(null);
  };

  const handleWizardFocusSuggestions = () => {
    document
      .getElementById("trameado-segment-suggestions-anchor")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleWizardAddSegment = () => {
    setShowCreateSheet(false);
    setShowAddSegment(true);
    setEditingSegmentId(null);
  };

  const handlePrepareSegmentFromCandidate = (value: string) => {
    if (!canManage || !selectedSheet) {
      return;
    }

    setShowCreateSheet(false);
    setEditingSegmentId(null);
    setShowAddSegment(true);
    setAssistedSegmentDraft({
      palilloLength: value,
      token: Date.now(),
      segmentCountAtPrepare: selectedSheet.segments.length,
    });
  };

  const handlePrepareSegmentFromSuggestion = (
    suggestion: TrameadoSegmentSuggestion,
  ) => {
    if (!canManage || !selectedSheet) {
      return;
    }

    setShowCreateSheet(false);
    setEditingSegmentId(null);
    setShowAddSegment(true);
    setAssistedSegmentDraft({
      palilloLength: suggestion.palilloLength,
      segmentNumber: suggestion.suggestedLabel,
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

  const assistantBlock = showAssistant ? (
    <TrameadoSheetAssistant
      key={sheetSuggestions
        .map((suggestion) => `${suggestion.suggestionKey}:${suggestion.alreadyExists}`)
        .join("|")}
      companyId={companyId}
      jobId={jobId}
      drawingId={drawingId}
      suggestions={sheetSuggestions}
      onSheetsCreated={handleSuggestedSheetsCreated}
      variant={hasSheet ? "compact" : "prominent"}
      defaultExpanded={!hasSheet}
    />
  ) : null;

  const sheetPanel = (
    <div
      className="flex min-h-0 flex-col space-y-4"
      data-testid="trameado-sheet-panel"
    >
      <TrameadoGuidedWizard
        canManage={canManage}
        wizardState={wizardState}
        selectedSheet={selectedSheet}
        primarySheetSuggestion={primarySheetSuggestion}
        validation={sheetValidation}
        onCreateSheet={handleWizardCreateSheet}
        onFocusSuggestions={handleWizardFocusSuggestions}
        onAddSegment={handleWizardAddSegment}
        onMarkSegment={handleStartMarkingSegment}
      />

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">Hoja de palilleo</h3>
              <Badge variant={statusBadgeVariant(sheetStatus)}>
                {getSheetStatusLabel(sheetStatus)}
              </Badge>
            </div>
            {selectedSheet ? (
              <p
                className="text-sm font-medium"
                data-testid="trameado-sheet-line-identifier"
              >
                {selectedSheet.lineIdentifier}
                {selectedSheet.lineClass ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · CLASE {selectedSheet.lineClass}
                  </span>
                ) : null}
              </p>
            ) : null}
            {hasSheet ? (
              <p
                className="text-sm tabular-nums text-muted-foreground"
                data-testid="trameado-segment-summary"
              >
                {sheetSummary}
              </p>
            ) : (
              <p
                className="text-xs tabular-nums text-muted-foreground/80"
                data-testid="trameado-segment-summary"
              >
                {sheetSummary}
              </p>
            )}
          </div>

          {canManage && hasSheet ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                data-testid="trameado-add-segment"
                onClick={() => {
                  setShowCreateSheet(false);
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
                {showCreateSheet ? "Ocultar" : "Nueva hoja"}
              </Button>
            </div>
          ) : null}
        </div>

        {selectedSheet ? (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-start gap-3">
              <ExportTrameadoCsvButton
                sheetId={selectedSheet.id}
                segmentCount={selectedSheet.segments.length}
                reviewedAt={selectedSheet.reviewedAt}
              />
              <ExportTrameadoMarkedPdfButton
                sheetId={selectedSheet.id}
                markedCount={annotationSummary.markedCount}
              />
              <ExportTrameadoPackageButton
                sheetId={selectedSheet.id}
                segmentCount={selectedSheet.segments.length}
                markedCount={annotationSummary.markedCount}
              />
            </div>
            {selectedSheet.notes ? (
              <p className="max-w-prose text-xs text-muted-foreground">
                {selectedSheet.notes}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {canManage ? (
        <div id="trameado-segment-suggestions-anchor">
          <TrameadoSegmentSuggestionsPanel
            companyId={companyId}
            jobId={jobId}
            drawingId={drawingId}
            sheetId={selectedSheet?.id ?? ""}
            result={segmentSuggestionsResult}
            canManage={canManage}
            onPrepareSuggestion={handlePrepareSegmentFromSuggestion}
          />
        </div>
      ) : null}

      {!hasSheet ? (
        <div
          className="space-y-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-5"
          data-testid="trameado-sheet-empty-state"
        >
          <div className="space-y-2">
            <h4 className="text-base font-semibold text-foreground">
              Crea una hoja de palilleo para empezar
            </h4>
            <p className="text-sm text-muted-foreground">
              La hoja guardará los tramos que vayas confirmando desde el
              isométrico.
            </p>
          </div>

          {canManage ? (
            <div className="space-y-4">
              {showAssistant ? (
                <>
                  <p className="text-sm text-foreground">
                    Usa el asistente para preparar la hoja con ISO, Ø y SCH desde
                    el plano.
                  </p>
                  {assistantBlock}
                  {showCreateSheet ? (
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
                      size="sm"
                      data-testid="trameado-create-sheet"
                      onClick={() => setShowCreateSheet(true)}
                    >
                      Crear hoja manualmente
                    </Button>
                  )}
                </>
              ) : showCreateSheet ? (
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
                  size="lg"
                  className="w-full sm:w-auto"
                  data-testid="trameado-create-sheet"
                  onClick={() => setShowCreateSheet(true)}
                >
                  Crear hoja de palilleo
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Este plano aún no tiene hoja de palilleo. Solo ingenieros pueden
              crearla.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {assistantBlock}

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
                  setMarkingSegmentId(null);
                  setStickyCreateValues(undefined);
                  clearAssistedSegmentDraft();
                }}
              >
                {sheets.map((sheet) => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.lineIdentifier} · {getSheetStatusLabel(getSheetStatus(sheet))}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {selectedSheet ? (
            <>
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

              <TrameadoSegmentsTable
                companyId={companyId}
                jobId={jobId}
                drawingId={drawingId}
                sheetId={selectedSheet.id}
                segments={selectedSheet.segments}
                canManage={canManage}
                editingSegmentId={editingSegmentId}
                markingSegmentId={markingSegmentId}
                markedSegmentIds={markedSegmentIds}
                showSummary={false}
                onEdit={(segmentId) => {
                  setEditingSegmentId(segmentId);
                  setShowAddSegment(false);
                  setMarkingSegmentId(null);
                  clearAssistedSegmentDraft();
                }}
                onMarkOnDrawing={
                  canManage ? handleStartMarkingSegment : undefined
                }
              />

              <TrameadoReviewButton
                companyId={companyId}
                jobId={jobId}
                drawingId={drawingId}
                sheetId={selectedSheet.id}
                segmentCount={selectedSheet.segments.length}
                reviewedAt={selectedSheet.reviewedAt}
                reviewedByLabel={selectedSheet.reviewedByLabel}
                canManage={canManage}
                validationStatus={sheetValidation.status}
                validationStatusLabel={sheetValidation.statusLabel}
              />
            </>
          ) : null}
        </div>
      )}

      <TrameadoSheetValidationPanel validation={sheetValidation} />

      <TrameadoIsoMarkingPanel
        summary={annotationSummary}
        hasActiveSheet={Boolean(selectedSheet)}
        canManage={canManage}
        markingSegmentLabel={markingSegmentLabel}
        annotationError={annotationError}
        isSaving={isSavingAnnotation}
        onCancelMarking={() => setMarkingSegmentId(null)}
        onMarkSegment={handleStartMarkingSegment}
        onDeleteAnnotation={handleAnnotationDelete}
      />
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
        <div className="space-y-3">
          <div className="space-y-1">
            <CardTitle className={isWorkspace ? "text-base" : "text-lg"}>
              Trameado
            </CardTitle>
            <CardDescription>
              Consulta el isométrico, elige cotas y confirma los tramos de la
              hoja de palilleo.
            </CardDescription>
          </div>
          <ol
            className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
            aria-label="Flujo de trabajo"
          >
            {WORKFLOW_STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-1.5">
                <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </CardHeader>

      <CardContent className={cn(isWorkspace && "px-0 pb-0")}>
        <div
          className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start"
          data-testid="trameado-workspace"
        >
          <div className="order-2 space-y-4 lg:order-1 lg:sticky lg:top-4">
            <TrameadoPdfPanel
              drawingId={drawingId}
              fileName={drawingFileName}
              annotations={sheetAnnotations}
              markingSegment={markingSegment}
              canManage={canManage && !isSavingAnnotation}
              onAnnotationCreated={handleAnnotationCreated}
              onAnnotationDelete={handleAnnotationDeleteById}
            />
            <TrameadoCandidateDimensionsPanel
              result={candidateDimensions}
              canPrepareSegment={Boolean(selectedSheet)}
              onPrepareSegment={
                canManage ? handlePrepareSegmentFromCandidate : undefined
              }
            />
          </div>
          <div className="order-1 lg:order-2">{sheetPanel}</div>
        </div>
      </CardContent>
    </Card>
  );
}
