"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  analyzeExperimentalAutoTakeoffAction,
  importExperimentalAutoTakeoffSuggestionsAction,
  type ExperimentalAutoTakeoffActionState,
  type ExperimentalAutoTakeoffImportActionState,
} from "@/lib/actions/experimental-auto-takeoff";
import {
  TAKEOFF_COMPARISON_STATUS_BADGE_CLASS,
  TAKEOFF_COMPARISON_STATUS_LABELS,
} from "@/lib/drawings/experimental-auto-takeoff-compare-labels";
import type { TakeoffComparisonStatus } from "@/lib/drawings/experimental-auto-takeoff-compare";
import type { BusinessAction } from "@/lib/drawings/auto-takeoff-business-rules";
import {
  BUSINESS_ACTION_BADGE_CLASS,
  BUSINESS_ACTION_LABELS,
  BUSINESS_CATEGORY_LABELS,
} from "@/lib/drawings/experimental-auto-takeoff-business-labels";
import {
  BETA_EXCLUDED_GROUP_COPY,
  BETA_PROPOSAL_PREVIEW_MAX_ITEMS,
  BETA_REVIEW_GROUP_COPY,
  EXPERIMENTAL_ASSISTANT_IMPORT_IMPACT_ITEMS,
  EXPERIMENTAL_ASSISTANT_STEPS,
  EXPERIMENTAL_SUGGESTION_ACTION_FILTER_OPTIONS,
  EXPERIMENTAL_SUGGESTION_STATUS_FILTER_OPTIONS,
  buildBetaProposalSummary,
  buildExperimentalAssistantDiscoveryCopy,
  buildExperimentalAssistantMetrics,
  buildExperimentalImportPreviewSummary,
  EXPERIMENTAL_ASSISTANT_FINAL_MESSAGE,
  filterExperimentalSuggestions,
  formatExperimentalImportConfirmMessage,
  getAllReadyProposalKeys,
  getVisibleImportableMissingKeys,
  groupBetaProposalItems,
  isExperimentalAssistantStepComplete,
  isExperimentalSuggestionImportable,
  mergeSelectionWithAllReady,
  mergeSelectionWithVisibleMissing,
  resolveExperimentalAssistantActiveStep,
  resolveExperimentalAssistantStatus,
  type BetaProposalGroups,
  type BetaProposalSummary,
  type ExperimentalAssistantStatus,
  type ExperimentalSuggestionActionFilter,
  type ExperimentalSuggestionListItem,
  type ExperimentalSuggestionStatusFilter,
} from "@/lib/drawings/experimental-auto-takeoff-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type DrawingExperimentalAutoTakeoffProps = {
  companyId: string;
  jobId: string;
  drawingId: string;
  existingTakeoffLineCount: number;
};

const initialAnalyzeState: ExperimentalAutoTakeoffActionState = {};
const initialImportState: ExperimentalAutoTakeoffImportActionState = {};

const ASSISTANT_STATUS_LABELS: Record<ExperimentalAssistantStatus, string> = {
  not_analyzed: "Sin analizar",
  analyzed: "Analizado",
  with_selection: "Con selección",
  imported: "Importado",
  requires_review: "Requiere revisión de palillería",
};

function formatCell(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "—";
  }

  return String(value);
}

function formatConfidence(value: number | undefined): string {
  if (value == null) {
    return "—";
  }

  return value.toFixed(2);
}

function ComparisonStatusBadge({
  status,
}: {
  status: TakeoffComparisonStatus | undefined;
}) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <Badge
      variant="outline"
      className={TAKEOFF_COMPARISON_STATUS_BADGE_CLASS[status]}
    >
      {TAKEOFF_COMPARISON_STATUS_LABELS[status]}
    </Badge>
  );
}

function formatComparisonSummary(
  suggestedCount: number,
  summary: ExperimentalAutoTakeoffActionState["comparisonSummary"],
): string | null {
  if (!summary) {
    return null;
  }

  return [
    `${suggestedCount} sugeridas`,
    `${summary.matchedCount} ya existen`,
    `${summary.missingCount} faltan`,
    `${summary.differentQuantityCount} distintas`,
    `${summary.uncertainCount} dudosas`,
  ].join(" · ");
}

function AssistantStepIndicator({
  activeStepId,
  status,
}: {
  activeStepId: ReturnType<typeof resolveExperimentalAssistantActiveStep>;
  status: ExperimentalAssistantStatus;
}) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {EXPERIMENTAL_ASSISTANT_STEPS.map((step) => {
        const isActive = step.id === activeStepId;
        const isComplete = isExperimentalAssistantStepComplete(step.id, status);

        return (
          <li
            key={step.id}
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              isActive && "border-sky-500/50 bg-sky-500/10",
              isComplete && !isActive && "border-emerald-500/30 bg-emerald-500/5",
              !isActive && !isComplete && "border-border bg-muted/20",
            )}
            data-testid={`experimental-auto-takeoff-step-indicator-${step.id}`}
            data-step-active={isActive ? "true" : "false"}
            data-step-complete={isComplete ? "true" : "false"}
          >
            <span className="font-medium text-foreground">
              {step.number}. {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function BusinessActionBadge({ action }: { action: BusinessAction }) {
  return (
    <Badge
      variant="outline"
      className={BUSINESS_ACTION_BADGE_CLASS[action]}
      data-testid="experimental-auto-takeoff-business-action-badge"
      data-business-action={action}
    >
      {BUSINESS_ACTION_LABELS[action]}
    </Badge>
  );
}

function formatProposalRowLabel(item: ExperimentalSuggestionListItem): string {
  const ref = item.reference?.trim();
  const desc = item.description?.trim();

  if (ref && desc) {
    return `${ref} — ${desc}`;
  }

  return ref ?? desc ?? "—";
}

function ProposalGroupPreview({
  items,
  emptyLabel,
}: {
  items: ExperimentalSuggestionListItem[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  const preview = items.slice(0, BETA_PROPOSAL_PREVIEW_MAX_ITEMS);

  return (
    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
      {preview.map((item) => (
        <li key={item.suggestionKey}>{formatProposalRowLabel(item)}</li>
      ))}
      {items.length > preview.length ? (
        <li>… y {items.length - preview.length} más</li>
      ) : null}
    </ul>
  );
}

function BetaProposalPanel({
  summary,
  groups,
}: {
  summary: BetaProposalSummary;
  groups: BetaProposalGroups;
}) {
  return (
    <section
      className="space-y-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3"
      data-testid="auto-takeoff-beta-proposal"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Propuesta de palillería</h3>
        <p className="text-xs text-muted-foreground">
          Beta supervisada — revisa los tres grupos antes de importar.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-emerald-500/30 bg-background px-3 py-2 text-center">
          <dt className="text-[11px] text-muted-foreground">Listas para incluir</dt>
          <dd
            className="text-lg font-semibold text-foreground"
            data-testid="auto-takeoff-beta-ready-count"
          >
            {summary.readyCount}
          </dd>
        </div>
        <div className="rounded-md border border-amber-500/30 bg-background px-3 py-2 text-center">
          <dt className="text-[11px] text-muted-foreground">Requieren revisión</dt>
          <dd
            className="text-lg font-semibold text-foreground"
            data-testid="auto-takeoff-beta-review-count"
          >
            {summary.reviewCount}
          </dd>
        </div>
        <div className="rounded-md border bg-background px-3 py-2 text-center">
          <dt className="text-[11px] text-muted-foreground">Excluidas por reglas</dt>
          <dd
            className="text-lg font-semibold text-foreground"
            data-testid="auto-takeoff-beta-excluded-count"
          >
            {summary.excludedCount}
          </dd>
        </div>
        <div className="rounded-md border bg-background px-3 py-2 text-center">
          <dt className="text-[11px] text-muted-foreground">Ya existen en palillería</dt>
          <dd className="text-lg font-semibold text-foreground">
            {summary.alreadyExistingCount}
          </dd>
        </div>
      </dl>

      <div className="grid gap-3 lg:grid-cols-3">
        <div
          className="space-y-2 rounded-md border border-emerald-500/20 bg-background p-3"
          data-testid="auto-takeoff-ready-group"
        >
          <p className="text-xs font-medium text-foreground">Listas para incluir</p>
          <ProposalGroupPreview
            items={groups.ready}
            emptyLabel="Ninguna línea nueva lista para incluir."
          />
        </div>
        <div
          className="space-y-2 rounded-md border border-amber-500/20 bg-background p-3"
          data-testid="auto-takeoff-review-group"
        >
          <p className="text-xs font-medium text-foreground">Requieren revisión</p>
          <p className="text-[11px] text-muted-foreground">{BETA_REVIEW_GROUP_COPY}</p>
          <ProposalGroupPreview
            items={groups.review}
            emptyLabel="Ninguna línea pendiente de revisión manual."
          />
        </div>
        <div
          className="space-y-2 rounded-md border bg-background p-3"
          data-testid="auto-takeoff-excluded-group"
        >
          <p className="text-xs font-medium text-foreground">Excluidas por reglas</p>
          <p className="text-[11px] text-muted-foreground">{BETA_EXCLUDED_GROUP_COPY}</p>
          <ProposalGroupPreview
            items={groups.excluded}
            emptyLabel="Ninguna línea excluida por reglas."
          />
        </div>
      </div>
    </section>
  );
}

function AssistantMetrics({
  metrics,
}: {
  metrics: ReturnType<typeof buildExperimentalAssistantMetrics>;
}) {
  const items = [
    { label: "Sugeridas", value: metrics.suggested },
    { label: "Nuevas", value: metrics.missing },
    { label: "Ya existentes", value: metrics.matched },
    { label: "Distintas", value: metrics.differentQuantity },
    { label: "Dudosas", value: metrics.uncertain },
    { label: "Seleccionadas", value: metrics.selected },
  ];

  return (
    <dl
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      data-testid="experimental-auto-takeoff-metrics"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border bg-muted/20 px-3 py-2 text-center"
        >
          <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
          <dd className="text-lg font-semibold text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DrawingExperimentalAutoTakeoff({
  companyId,
  jobId,
  drawingId,
  existingTakeoffLineCount,
}: DrawingExperimentalAutoTakeoffProps) {
  const router = useRouter();
  const [analyzeState, analyzeAction, analyzePending] = useActionState(
    analyzeExperimentalAutoTakeoffAction,
    initialAnalyzeState,
  );
  const [importState, importAction, importPending] = useActionState(
    importExperimentalAutoTakeoffSuggestionsAction,
    initialImportState,
  );
  const suggestedItems = useMemo(
    () => analyzeState.suggestedItems ?? [],
    [analyzeState.suggestedItems],
  );
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] =
    useState<ExperimentalSuggestionStatusFilter>("all");
  const [actionFilter, setActionFilter] =
    useState<ExperimentalSuggestionActionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const hasResult = analyzeState.success != null || analyzeState.error != null;
  const hasSuggestions = suggestedItems.length > 0;
  const existingCount =
    analyzeState.existingTakeoffCount ?? existingTakeoffLineCount;
  const comparisonLine = formatComparisonSummary(
    suggestedItems.length,
    analyzeState.comparisonSummary,
  );
  const filteredItems = useMemo(
    () =>
      filterExperimentalSuggestions(suggestedItems, {
        statusFilter,
        actionFilter,
        searchQuery,
      }),
    [suggestedItems, statusFilter, actionFilter, searchQuery],
  );
  const betaProposalSummary = useMemo(
    () =>
      buildBetaProposalSummary(
        suggestedItems,
        analyzeState.comparisonSummary,
      ),
    [suggestedItems, analyzeState.comparisonSummary],
  );
  const betaProposalGroups = useMemo(
    () => groupBetaProposalItems(suggestedItems),
    [suggestedItems],
  );
  const allReadyKeys = useMemo(
    () => getAllReadyProposalKeys(suggestedItems),
    [suggestedItems],
  );
  const visibleMissingKeys = useMemo(
    () => getVisibleImportableMissingKeys(filteredItems),
    [filteredItems],
  );
  const importPreview = useMemo(
    () => buildExperimentalImportPreviewSummary(suggestedItems, selectedKeys),
    [suggestedItems, selectedKeys],
  );
  const analysisFingerprint = useMemo(
    () => suggestedItems.map((item) => item.suggestionKey).join("|"),
    [suggestedItems],
  );
  const [resultsFingerprint, setResultsFingerprint] =
    useState(analysisFingerprint);

  if (resultsFingerprint !== analysisFingerprint) {
    setResultsFingerprint(analysisFingerprint);
    setSelectedKeys(new Set());
    setStatusFilter("all");
    setActionFilter("all");
    setSearchQuery("");
  }

  const assistantStatus = resolveExperimentalAssistantStatus({
    hasAnalysisResult: hasResult,
    hasSuggestions,
    selectedCount: selectedKeys.size,
    importSuccess: importState.success != null,
    takeoffReviewInvalidated: importState.takeoffReviewInvalidated === true,
  });
  const activeStepId = resolveExperimentalAssistantActiveStep(assistantStatus);
  const metrics = buildExperimentalAssistantMetrics({
    suggestedCount: suggestedItems.length,
    comparisonSummary: analyzeState.comparisonSummary,
    selectedCount: selectedKeys.size,
  });
  const discoveryCopy = buildExperimentalAssistantDiscoveryCopy({
    suggestedCount: suggestedItems.length,
    comparisonSummary: analyzeState.comparisonSummary,
  });

  useEffect(() => {
    if (importState.success) {
      router.refresh();
    }
  }, [importState.success, router]);

  const noEmbeddedText =
    hasResult &&
    analyzeState.hasEmbeddedText === false &&
    !analyzeState.error &&
    suggestedItems.length === 0;
  const emptyBom =
    hasResult &&
    !analyzeState.error &&
    analyzeState.hasEmbeddedText === true &&
    suggestedItems.length === 0;

  function toggleSelection(key: string, checked: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  }

  function selectVisibleReady() {
    setSelectedKeys((current) =>
      mergeSelectionWithVisibleMissing(current, visibleMissingKeys),
    );
  }

  function selectAllReady() {
    setSelectedKeys((current) =>
      mergeSelectionWithAllReady(current, allReadyKeys),
    );
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  function handleImportSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!importPreview) {
      event.preventDefault();
      return;
    }

    const confirmed = window.confirm(
      formatExperimentalImportConfirmMessage(importPreview),
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  const hasImportableMissing = suggestedItems.some((item) =>
    isExperimentalSuggestionImportable(item),
  );

  return (
    <div
      className="space-y-4"
      data-testid="experimental-auto-takeoff-section"
    >
      <div
        className="space-y-4 rounded-lg border border-sky-500/40 bg-sky-500/5 p-4"
        data-testid="experimental-auto-takeoff-assistant"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              Propuesta beta supervisada de palillería
            </p>
            <Badge
              variant="outline"
              data-testid="experimental-auto-takeoff-assistant-status"
              data-status={assistantStatus}
            >
              {ASSISTANT_STATUS_LABELS[assistantStatus]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Beta supervisada: analizar → revisar propuesta → importar solo lo
            seleccionado → revisar palillería. No se importa nada automáticamente.
          </p>
          <AssistantStepIndicator
            activeStepId={activeStepId}
            status={assistantStatus}
          />
        </div>

        <section
          className="space-y-3 rounded-md border bg-background p-3"
          data-testid="experimental-auto-takeoff-step-analyze"
        >
          <h3 className="text-sm font-medium">1. Analizar relación de materiales</h3>
          <p className="text-xs text-muted-foreground">
            Palillería actual en este plano: <strong>{existingCount}</strong>{" "}
            línea(s).
          </p>
          {analyzeState.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {analyzeState.error}
            </p>
          ) : null}
          {noEmbeddedText ? (
            <p className="rounded-lg border border-dashed bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
              Este PDF no contiene texto embebido útil.
            </p>
          ) : null}
          {emptyBom ? (
            <p className="rounded-lg border border-dashed bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
              No se encontró una relación de materiales con filas parseables.
            </p>
          ) : null}
          <form action={analyzeAction}>
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="drawingId" value={drawingId} />
            <Button
              type="submit"
              variant="outline"
              disabled={analyzePending}
              data-testid="experimental-auto-takeoff-run"
            >
              {analyzePending
                ? "Analizando..."
                : "Analizar relación de materiales"}
            </Button>
          </form>
        </section>

        {hasResult && hasSuggestions ? (
          <>
            {discoveryCopy ? (
              <div
                className="space-y-1 rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-3 text-sm"
                data-testid="experimental-auto-takeoff-discovery-copy"
              >
                <p>{discoveryCopy.headline}</p>
                {discoveryCopy.missingLine ? <p>{discoveryCopy.missingLine}</p> : null}
                {discoveryCopy.matchedLine ? <p>{discoveryCopy.matchedLine}</p> : null}
                <p className="text-xs text-muted-foreground">
                  {discoveryCopy.businessRulesNote}
                </p>
                <p className="text-xs font-medium text-foreground">
                  {discoveryCopy.safetyNote}
                </p>
              </div>
            ) : null}

            <BetaProposalPanel
              summary={betaProposalSummary}
              groups={betaProposalGroups}
            />

            <AssistantMetrics metrics={metrics} />

            <section
              className="space-y-3 rounded-md border bg-background p-3"
              data-testid="experimental-auto-takeoff-step-review"
            >
              <h3 className="text-sm font-medium">2. Detalle y filtros</h3>
              {comparisonLine ? (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="experimental-auto-takeoff-comparison-summary"
                >
                  {comparisonLine}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="experimental-auto-takeoff-status-filter">
                    Estado
                  </Label>
                  <select
                    id="experimental-auto-takeoff-status-filter"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value as ExperimentalSuggestionStatusFilter,
                      )
                    }
                    data-testid="experimental-auto-takeoff-status-filter"
                  >
                    {EXPERIMENTAL_SUGGESTION_STATUS_FILTER_OPTIONS.map(
                      (option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="experimental-auto-takeoff-business-action-filter">
                    Acción de negocio
                  </Label>
                  <select
                    id="experimental-auto-takeoff-business-action-filter"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={actionFilter}
                    onChange={(event) =>
                      setActionFilter(
                        event.target.value as ExperimentalSuggestionActionFilter,
                      )
                    }
                    data-testid="experimental-auto-takeoff-business-action-filter"
                  >
                    {EXPERIMENTAL_SUGGESTION_ACTION_FILTER_OPTIONS.map(
                      (option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="experimental-auto-takeoff-search">
                    Buscar referencia o descripción
                  </Label>
                  <Input
                    id="experimental-auto-takeoff-search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Ej. 1000937596 o TUBERIA"
                    data-testid="experimental-auto-takeoff-search"
                  />
                </div>
              </div>

              <p
                className="text-xs text-muted-foreground"
                data-testid="experimental-auto-takeoff-filtered-count"
              >
                Mostrando <strong>{filteredItems.length}</strong> de{" "}
                {suggestedItems.length} sugerencia(s)
              </p>

              <div
                className="overflow-x-auto rounded-lg border"
                data-testid="experimental-auto-takeoff-results"
              >
                <table className="w-full min-w-[72rem] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Importar</th>
                      <th className="px-3 py-2 font-medium">Ítem</th>
                      <th className="px-3 py-2 font-medium">Referencia</th>
                      <th className="px-3 py-2 font-medium">Cant.</th>
                      <th className="px-3 py-2 font-medium">Ud.</th>
                      <th className="px-3 py-2 font-medium">Descripción</th>
                      <th className="px-3 py-2 font-medium">Conf.</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                      <th className="px-3 py-2 font-medium">Acción</th>
                      <th className="px-3 py-2 font-medium">Categoría</th>
                      <th className="px-3 py-2 font-medium">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-3 py-6 text-center text-xs text-muted-foreground"
                        >
                          Ninguna sugerencia coincide con el filtro actual.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((row, index) => {
                        const importable = isExperimentalSuggestionImportable(row);
                        const isReviewMissing =
                          row.comparisonStatus === "missing" &&
                          row.businessAction === "review";

                        return (
                          <tr
                            key={`${row.suggestionKey}-${index}`}
                            className={cn(
                              "border-b border-border/60 last:border-0",
                              isReviewMissing && "bg-amber-500/5",
                            )}
                            data-testid="experimental-auto-takeoff-result-row"
                            data-suggestion-reference={row.reference ?? ""}
                            data-business-action={row.businessAction}
                          >
                            <td className="px-3 py-2 align-top">
                              {importable ? (
                                <input
                                  type="checkbox"
                                  className={cn(
                                    "size-4 rounded border border-input",
                                    isReviewMissing && "border-amber-500",
                                  )}
                                  checked={selectedKeys.has(row.suggestionKey)}
                                  onChange={(event) =>
                                    toggleSelection(
                                      row.suggestionKey,
                                      event.target.checked,
                                    )
                                  }
                                  data-testid="experimental-auto-takeoff-select-row"
                                  aria-label={`Seleccionar sugerencia ${row.item ?? index + 1}`}
                                />
                              ) : row.businessAction === "exclude" ? (
                                <span
                                  className="text-xs text-muted-foreground"
                                  data-testid="experimental-auto-takeoff-row-import-disabled"
                                  title="Excluida por reglas de negocio"
                                >
                                  —
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {formatCell(row.item)}
                            </td>
                            <td className="px-3 py-2 align-top font-mono text-xs">
                              {formatCell(row.reference)}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {formatCell(row.quantity)}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {formatCell(row.unit)}
                            </td>
                            <td className="px-3 py-2 align-top text-xs">
                              {formatCell(row.description)}
                            </td>
                            <td className="px-3 py-2 align-top text-xs">
                              {formatConfidence(row.confidence)}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <ComparisonStatusBadge
                                status={row.comparisonStatus}
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <BusinessActionBadge action={row.businessAction} />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Badge
                                variant="outline"
                                className="text-[11px]"
                                data-testid="experimental-auto-takeoff-business-category-badge"
                                data-business-category={row.businessCategory}
                              >
                                {BUSINESS_CATEGORY_LABELS[row.businessCategory]}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                              <span
                                title={row.businessReason}
                                data-testid="experimental-auto-takeoff-business-reason"
                              >
                                {row.businessReason}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {hasImportableMissing ? (
              <section
                className="space-y-3 rounded-md border bg-background p-3"
                data-testid="experimental-auto-takeoff-step-import"
              >
                <h3 className="text-sm font-medium">
                  3. Importar propuesta revisada
                </h3>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className="font-medium text-foreground"
                    data-testid="experimental-auto-takeoff-selected-count"
                  >
                    {selectedKeys.size} línea(s) seleccionada(s) para importar
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={selectAllReady}
                    disabled={allReadyKeys.length === 0}
                    data-testid="auto-takeoff-select-all-ready"
                  >
                    Seleccionar todas las listas para incluir
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={selectVisibleReady}
                    disabled={visibleMissingKeys.length === 0}
                    data-testid="experimental-auto-takeoff-select-visible-missing"
                  >
                    Seleccionar listas visibles
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={clearSelection}
                  >
                    Deseleccionar todo
                  </Button>
                </div>

                <div
                  className="space-y-2 rounded-md border border-muted-foreground/20 bg-muted/10 px-3 py-3 text-xs"
                  data-testid="experimental-auto-takeoff-import-impact"
                >
                  <p className="font-medium text-foreground">
                    Qué pasará al importar
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {EXPERIMENTAL_ASSISTANT_IMPORT_IMPACT_ITEMS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <form action={importAction} onSubmit={handleImportSubmit}>
                  <input type="hidden" name="companyId" value={companyId} />
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="drawingId" value={drawingId} />
                  <input
                    type="hidden"
                    name="selectedSuggestionKeys"
                    value={JSON.stringify([...selectedKeys])}
                  />

                  {importPreview ? (
                    <div
                      className="mb-3 space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-xs text-amber-950 dark:text-amber-100"
                      data-testid="experimental-auto-takeoff-import-preview"
                    >
                      <p className="font-medium text-foreground">
                        Resumen antes de importar
                      </p>
                      <p>
                        Se crearán{" "}
                        <strong>{importPreview.lineCount}</strong> línea(s) reales
                        ({importPreview.includeCount} incluir
                        {importPreview.reviewCount > 0
                          ? `, ${importPreview.reviewCount} revisar`
                          : ""}
                        ).
                      </p>
                      {importPreview.reviewWarningMessage ? (
                        <p
                          className="font-medium text-amber-900 dark:text-amber-100"
                          data-testid="experimental-auto-takeoff-import-review-warning"
                        >
                          {importPreview.reviewWarningMessage}
                        </p>
                      ) : null}
                      {importPreview.quantityByUnit.length > 0 ? (
                        <p data-testid="experimental-auto-takeoff-import-preview-quantities">
                          Totales por unidad:{" "}
                          {importPreview.quantityByUnit
                            .map((entry) => `${entry.total} ${entry.unit}`)
                            .join(" · ")}
                        </p>
                      ) : null}
                      {importPreview.previewLines.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-4">
                          {importPreview.previewLines.map((line, index) => (
                            <li key={`${line.reference ?? "ref"}-${index}`}>
                              {formatCell(line.reference)} —{" "}
                              {formatCell(line.description)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="font-medium">{importPreview.warningMessage}</p>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    variant="default"
                    disabled={importPending || selectedKeys.size === 0}
                    data-testid="auto-takeoff-import-reviewed-proposal"
                  >
                    {importPending
                      ? "Importando..."
                      : "Importar propuesta revisada"}
                  </Button>
                </form>
              </section>
            ) : null}
          </>
        ) : null}

        {importState.error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {importState.error}
          </p>
        ) : null}

        {importState.success ? (
          <section
            className="space-y-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
            data-testid="experimental-auto-takeoff-step-final"
          >
            <h3 className="font-medium text-foreground">4. Revisar palillería</h3>
            <p data-testid="experimental-auto-takeoff-import-success">
              {EXPERIMENTAL_ASSISTANT_FINAL_MESSAGE}
            </p>
            {importState.importedCount != null ? (
              <p data-testid="experimental-auto-takeoff-import-success-count">
                Líneas creadas: <strong>{importState.importedCount}</strong>
              </p>
            ) : null}
            {importState.takeoffReviewInvalidated ? (
              <p data-testid="experimental-auto-takeoff-import-review-reset">
                La revisión de palillería se invalidó. Debes revisarla de nuevo
                antes de marcarla como lista.
              </p>
            ) : null}
            <p className="text-xs">
              <Link href="#palilleria" className="font-medium underline-offset-4 hover:underline">
                Ir a la palillería real de este plano
              </Link>
              {" · "}
              Reanaliza la relación de materiales para actualizar la comparación.
            </p>
          </section>
        ) : null}

        {analyzeState.warnings && analyzeState.warnings.length > 0 ? (
          <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            <p className="font-medium">Advertencias</p>
            <ul className="list-disc space-y-1 pl-4">
              {analyzeState.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
