"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  analyzeExperimentalAutoTakeoffAction,
  importExperimentalAutoTakeoffSuggestionsAction,
  type ExperimentalAutoTakeoffActionState,
  type ExperimentalAutoTakeoffImportActionState,
} from "@/lib/actions/experimental-auto-takeoff";
import { ConfirmImportProposalDialog } from "@/components/drawings/confirm-import-proposal-dialog";
import {
  TAKEOFF_COMPARISON_STATUS_BADGE_CLASS,
  TAKEOFF_COMPARISON_STATUS_LABELS,
} from "@/lib/drawings/experimental-auto-takeoff-compare-labels";
import type { TakeoffComparisonStatus } from "@/lib/drawings/experimental-auto-takeoff-compare";
import { hasUsefulEmbeddedText } from "@/lib/drawings/experimental-auto-takeoff-parse";
import type { BusinessAction } from "@/lib/drawings/auto-takeoff-business-rules";
import {
  MANUAL_CHECKLIST_DISCLAIMER,
  MANUAL_CHECKLIST_EMPTY_NOTE,
  type ManualTakeoffChecklistResult,
} from "@/lib/drawings/auto-takeoff-manual-checklist-types";
import {
  BUSINESS_ACTION_BADGE_CLASS,
  BUSINESS_ACTION_LABELS,
  BUSINESS_CATEGORY_LABELS,
} from "@/lib/drawings/experimental-auto-takeoff-business-labels";
import {
  BETA_EXCLUDED_GROUP_COPY,
  BETA_NO_IMPORTABLE_PROPOSAL_NOTE,
  BETA_PROPOSAL_PREVIEW_MAX_ITEMS,
  BETA_REVIEW_GROUP_COPY,
  EXPERIMENTAL_ASSISTANT_STEPS,
  EXPERIMENTAL_SUGGESTION_ACTION_FILTER_OPTIONS,
  EXPERIMENTAL_SUGGESTION_STATUS_FILTER_OPTIONS,
  buildBetaProposalSummary,
  buildCompactBetaDiscoveryCopy,
  buildExperimentalAssistantMetrics,
  buildExperimentalImportPreviewSummary,
  EXPERIMENTAL_ASSISTANT_FINAL_MESSAGE,
  filterExperimentalSuggestions,
  getAllReadyProposalKeys,
  getVisibleImportableMissingKeys,
  groupBetaProposalItems,
  hasBetaImportableProposal,
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
const IMPORT_FORM_ID = "experimental-auto-takeoff-import-form";

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

function CollapsibleSection({
  title,
  defaultOpen = false,
  testId,
  toggleTestId,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  testId?: string;
  toggleTestId?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-md border bg-background" data-testid={testId}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm"
        aria-expanded={open}
        data-testid={toggleTestId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="font-medium text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="border-t px-3 py-3">{children}</div> : null}
    </section>
  );
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

function ManualChecklistPanel({
  checklist,
}: {
  checklist: ManualTakeoffChecklistResult | undefined;
}) {
  if (!checklist) {
    return null;
  }

  if (!checklist.hasSignals) {
    return (
      <p
        className="text-xs text-muted-foreground"
        data-testid="auto-takeoff-manual-checklist"
      >
        {MANUAL_CHECKLIST_EMPTY_NOTE}
      </p>
    );
  }

  const signalCount = checklist.items.length;

  return (
    <CollapsibleSection
      title={`Revisión manual recomendada · ${signalCount} aviso${signalCount === 1 ? "" : "s"}`}
      testId="auto-takeoff-manual-checklist"
      toggleTestId="auto-takeoff-manual-checklist-toggle"
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{MANUAL_CHECKLIST_DISCLAIMER}</p>
        <ul className="space-y-3">
          {checklist.items.map((item) => (
            <li
              key={item.type}
              className="space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 p-3"
              data-testid={`auto-takeoff-manual-checklist-item-${item.type}`}
            >
              <p className="text-xs font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
              {item.examples.length > 0 ? (
                <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                  {item.examples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
              ) : null}
              <p className="text-[11px] text-foreground">{item.recommendation}</p>
            </li>
          ))}
        </ul>
      </div>
    </CollapsibleSection>
  );
}

function BetaProposalSummaryBar({
  summary,
  selectedCount,
}: {
  summary: BetaProposalSummary;
  selectedCount: number;
}) {
  return (
    <dl
      className="grid grid-cols-2 gap-2 sm:grid-cols-5"
      data-testid="auto-takeoff-beta-proposal"
    >
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-2 text-center">
        <dt className="text-[11px] text-muted-foreground">Recomendadas para importar</dt>
        <dd
          className="text-base font-semibold text-foreground"
          data-testid="auto-takeoff-beta-ready-count"
        >
          {summary.readyCount}
        </dd>
      </div>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-center">
        <dt className="text-[11px] text-muted-foreground">Requieren revisión</dt>
        <dd
          className="text-base font-semibold text-foreground"
          data-testid="auto-takeoff-beta-review-count"
        >
          {summary.reviewCount}
        </dd>
      </div>
      <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
        <dt className="text-[11px] text-muted-foreground">Excluidas</dt>
        <dd
          className="text-base font-semibold text-foreground"
          data-testid="auto-takeoff-beta-excluded-count"
        >
          {summary.excludedCount}
        </dd>
      </div>
      <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
        <dt className="text-[11px] text-muted-foreground">Ya existentes</dt>
        <dd className="text-base font-semibold text-foreground">
          {summary.alreadyExistingCount}
        </dd>
      </div>
      <div className="rounded-md border border-sky-500/30 bg-sky-500/5 px-2.5 py-2 text-center">
        <dt className="text-[11px] text-muted-foreground">Seleccionadas</dt>
        <dd
          className="text-base font-semibold text-foreground"
          data-testid="experimental-auto-takeoff-selected-count"
        >
          {selectedCount}
        </dd>
      </div>
    </dl>
  );
}

function BetaProposalGroupsPanel({ groups }: { groups: BetaProposalGroups }) {
  return (
    <div className="grid gap-2 lg:grid-cols-3">
      <div
        className="space-y-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5"
        data-testid="auto-takeoff-ready-group"
      >
        <p className="text-xs font-medium text-foreground">Listas recomendadas</p>
        <ProposalGroupPreview
          items={groups.ready}
          emptyLabel="Ninguna línea recomendada para importar."
        />
      </div>
      <div
        className="space-y-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5"
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
        className="space-y-1.5 rounded-md border bg-muted/15 p-2.5"
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
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
  const compactDiscoveryCopy = buildCompactBetaDiscoveryCopy({
    suggestedCount: suggestedItems.length,
    readyCount: betaProposalSummary.readyCount,
    reviewCount: betaProposalSummary.reviewCount,
    excludedCount: betaProposalSummary.excludedCount,
  });

  useEffect(() => {
    if (importState.success) {
      router.refresh();
    }
  }, [importState.success, router]);

  const noProposalText =
    hasResult &&
    suggestedItems.length === 0 &&
    (analyzeState.hasEmbeddedText === false ||
      !hasUsefulEmbeddedText(analyzeState.textLength ?? 0));
  const emptyBom =
    hasResult &&
    analyzeState.hasEmbeddedText === true &&
    hasUsefulEmbeddedText(analyzeState.textLength ?? 0) &&
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

  const hasImportableMissing = hasBetaImportableProposal(suggestedItems);

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
          className={cn(
            "space-y-3 rounded-md border p-3",
            hasResult
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-border bg-background",
          )}
          data-testid="experimental-auto-takeoff-step-analyze"
        >
          {hasResult ? (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">
                Análisis completado
              </h3>
              <p
                className="text-xs text-muted-foreground"
                data-testid="experimental-auto-takeoff-analyze-summary"
              >
                Se han detectado <strong>{suggestedItems.length}</strong>{" "}
                sugerencias.
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-medium">
                1. Analizar relación de materiales
              </h3>
              <p className="text-xs text-muted-foreground">
                Palillería actual en este plano: <strong>{existingCount}</strong>{" "}
                línea(s).
              </p>
            </>
          )}
          {analyzeState.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {analyzeState.error}
            </p>
          ) : null}
          {noProposalText ? (
            <p
              className="rounded-lg border border-dashed bg-muted/10 px-4 py-3 text-sm text-muted-foreground"
              data-testid="auto-takeoff-beta-no-embedded-text"
            >
              Este PDF no contiene texto embebido útil. La propuesta beta supervisada
              no puede generarse sin una relación de materiales en el PDF.
            </p>
          ) : null}
          {emptyBom ? (
            <p
              className="rounded-lg border border-dashed bg-muted/10 px-4 py-3 text-sm text-muted-foreground"
              data-testid="auto-takeoff-beta-empty-bom"
            >
              No se encontró una relación de materiales con filas parseables. No hay
              propuesta importable en este plano.
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
                : hasResult
                  ? "Volver a analizar"
                  : "Analizar relación de materiales"}
            </Button>
          </form>
        </section>

        {hasResult && hasSuggestions ? (
          <>
            {compactDiscoveryCopy ? (
              <div
                className="space-y-1 text-sm"
                data-testid="experimental-auto-takeoff-discovery-copy"
              >
                <p className="text-foreground">{compactDiscoveryCopy.summaryLine}</p>
                <p className="text-xs text-muted-foreground">
                  {compactDiscoveryCopy.businessRulesNote}
                </p>
                <p className="text-xs font-medium text-foreground">
                  {compactDiscoveryCopy.safetyNote}
                </p>
              </div>
            ) : null}

            <BetaProposalSummaryBar
              summary={betaProposalSummary}
              selectedCount={selectedKeys.size}
            />

            {hasImportableMissing ? (
              <section
                className="space-y-3 rounded-md border bg-background p-3"
                data-testid="experimental-auto-takeoff-step-import"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {allReadyKeys.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllReady}
                      data-testid="auto-takeoff-select-all-ready"
                    >
                      {`Seleccionar ${allReadyKeys.length} listas para incluir`}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Deseleccionar todo
                  </Button>
                </div>

                <div
                  className="rounded-md border border-muted-foreground/20 bg-muted/10 px-3 py-2 text-xs"
                  data-testid="experimental-auto-takeoff-import-impact"
                >
                  {selectedKeys.size === 0 ? (
                    <p className="text-muted-foreground">
                      Selecciona líneas para activar la importación.
                    </p>
                  ) : importPreview?.reviewWarningMessage ? (
                    <p
                      className="font-medium text-amber-900 dark:text-amber-100"
                      data-testid="experimental-auto-takeoff-import-review-warning"
                    >
                      {importPreview.reviewWarningMessage}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Se crearán{" "}
                      <strong>{importPreview?.lineCount ?? 0}</strong> línea(s)
                      reales. Se invalidará la revisión de palillería si estaba
                      marcada.
                    </p>
                  )}
                </div>

                <form id={IMPORT_FORM_ID} action={importAction}>
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
                      className="mb-3 space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-950 dark:text-amber-100"
                      data-testid="experimental-auto-takeoff-import-preview"
                    >
                      <p>
                        <strong>{importPreview.lineCount}</strong> línea(s):{" "}
                        {importPreview.includeCount} incluir
                        {importPreview.reviewCount > 0
                          ? `, ${importPreview.reviewCount} revisar`
                          : ""}
                      </p>
                      {importPreview.previewLines.length > 0 ? (
                        <p className="text-muted-foreground">
                          {importPreview.previewLines
                            .slice(0, 3)
                            .map(
                              (line) =>
                                `${formatCell(line.reference)} — ${formatCell(line.description)}`,
                            )
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={importPending || selectedKeys.size === 0}
                    data-testid="auto-takeoff-import-reviewed-proposal"
                    onClick={() => {
                      if (importPreview) {
                        setImportDialogOpen(true);
                      }
                    }}
                  >
                    {importPending
                      ? "Importando..."
                      : "Importar propuesta revisada"}
                  </Button>
                </form>

                {importPreview ? (
                  <ConfirmImportProposalDialog
                    open={importDialogOpen && importState.success == null}
                    onOpenChange={setImportDialogOpen}
                    preview={importPreview}
                    isPending={importPending}
                    formId={IMPORT_FORM_ID}
                  />
                ) : null}
              </section>
            ) : null}

            <BetaProposalGroupsPanel groups={betaProposalGroups} />

            <ManualChecklistPanel checklist={analyzeState.manualChecklist} />

            {!hasImportableMissing ? (
              <p
                className="rounded-md border border-muted-foreground/20 bg-muted/10 px-3 py-2 text-xs text-muted-foreground"
                data-testid="auto-takeoff-beta-no-importable"
              >
                {BETA_NO_IMPORTABLE_PROPOSAL_NOTE}
              </p>
            ) : null}

            <CollapsibleSection
              title={`Detalle completo de sugerencias · ${suggestedItems.length} filas`}
              toggleTestId="experimental-auto-takeoff-detail-toggle"
              testId="experimental-auto-takeoff-step-review"
            >
              <div className="space-y-3">
              {comparisonLine ? (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="experimental-auto-takeoff-comparison-summary"
                >
                  {comparisonLine}
                </p>
              ) : null}

              <AssistantMetrics metrics={metrics} />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectVisibleReady}
                  disabled={visibleMissingKeys.length === 0}
                  data-testid="experimental-auto-takeoff-select-visible-missing"
                >
                  Seleccionar listas visibles
                </Button>
              </div>

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
              </div>
            </CollapsibleSection>
          </>
        ) : null}

        {hasResult && !hasSuggestions ? (
          <ManualChecklistPanel checklist={analyzeState.manualChecklist} />
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
          <CollapsibleSection
            title={`Ver advertencias · ${analyzeState.warnings.length}`}
            toggleTestId="experimental-auto-takeoff-warnings-toggle"
            testId="experimental-auto-takeoff-warnings"
          >
            <ul className="list-disc space-y-1 pl-4 text-xs text-amber-950 dark:text-amber-100">
              {analyzeState.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </CollapsibleSection>
        ) : null}
      </div>
    </div>
  );
}
