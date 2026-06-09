/**
 * EXPERIMENTAL — Fase 14F/14G
 * Helpers puros de filtro, selección, resumen y asistente (solo UI).
 */

import type { TakeoffComparisonStatus } from "@/lib/drawings/experimental-auto-takeoff-compare";
import { normalizeTakeoffDescription } from "@/lib/drawings/experimental-auto-takeoff-compare";
import type {
  AppliedBusinessRule,
  BusinessAction,
  BusinessRuleCategory,
} from "@/lib/drawings/auto-takeoff-business-rules";
import {
  BUSINESS_CATEGORY_LABELS,
  EXPERIMENTAL_BUSINESS_RULES_DISCOVERY_NOTE,
  EXPERIMENTAL_IMPORT_REVIEW_WARNING,
} from "@/lib/drawings/experimental-auto-takeoff-business-labels";

export type ExperimentalSuggestionListItem = {
  item: number | null;
  reference: string | null;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  confidence: number;
  comparisonStatus?: TakeoffComparisonStatus;
  suggestionKey: string;
} & AppliedBusinessRule;

export type ExperimentalSuggestionStatusFilter =
  | "all"
  | TakeoffComparisonStatus;

export const EXPERIMENTAL_SUGGESTION_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: ExperimentalSuggestionStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "missing", label: "Faltan" },
  { value: "matched", label: "Ya existen" },
  { value: "differentQuantity", label: "Cantidad distinta" },
  { value: "uncertain", label: "Dudosas" },
];

export type ExperimentalSuggestionActionFilter = "all" | BusinessAction;

export const EXPERIMENTAL_SUGGESTION_ACTION_FILTER_OPTIONS: ReadonlyArray<{
  value: ExperimentalSuggestionActionFilter;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "include", label: "Incluir" },
  { value: "review", label: "Revisar" },
  { value: "exclude", label: "Excluir" },
];

export const EXPERIMENTAL_IMPORT_PREVIEW_MAX_LINES = 5;

export const EXPERIMENTAL_IMPORT_PREVIEW_WARNING =
  "Se crearán líneas reales y se invalidará la revisión de palillería si estaba marcada.";

export const EXPERIMENTAL_ASSISTANT_NO_AUTO_IMPORT_NOTE =
  "Revisa antes de importar. No se importa nada automáticamente.";

export const EXPERIMENTAL_ASSISTANT_IMPORT_IMPACT_ITEMS = [
  "Se crearán líneas reales de palillería en este plano.",
  "Se invalidará la revisión de palillería si estaba marcada.",
  "Podrás revisar y editar las líneas después de importar.",
  "No se borrará ninguna línea existente.",
] as const;

export const EXPERIMENTAL_ASSISTANT_FINAL_MESSAGE =
  "Importación completada. Revisa la palillería antes de marcarla como revisada.";

export type ExperimentalAssistantStatus =
  | "not_analyzed"
  | "analyzed"
  | "with_selection"
  | "imported"
  | "requires_review";

export type ExperimentalAssistantStepId = "analyze" | "review" | "import" | "final";

export const EXPERIMENTAL_ASSISTANT_STEPS: ReadonlyArray<{
  id: ExperimentalAssistantStepId;
  label: string;
  number: number;
}> = [
  { id: "analyze", number: 1, label: "Analizar relación de materiales" },
  { id: "review", number: 2, label: "Revisar sugerencias" },
  { id: "import", number: 3, label: "Seleccionar e importar" },
  { id: "final", number: 4, label: "Revisar palillería" },
];

export type ExperimentalAssistantMetrics = {
  suggested: number;
  missing: number;
  matched: number;
  differentQuantity: number;
  uncertain: number;
  selected: number;
};

export type ExperimentalBusinessMetrics = {
  include: number;
  review: number;
  exclude: number;
  pipe: number;
  flange: number;
  valve: number;
  fitting: number;
  bolt: number;
  gasket: number;
  blind: number;
  support: number;
  exclusion: number;
  unknown: number;
};

export type ExperimentalAssistantDiscoveryCopy = {
  headline: string;
  missingLine: string | null;
  matchedLine: string | null;
  businessRulesNote: string;
  safetyNote: string;
};

export type ExperimentalBusinessCategoryMetric = {
  category: BusinessRuleCategory;
  label: string;
  count: number;
};

export function buildExperimentalBusinessCategoryMetrics(
  metrics: ExperimentalBusinessMetrics,
): ExperimentalBusinessCategoryMetric[] {
  const entries: Array<[BusinessRuleCategory, number]> = [
    ["pipe", metrics.pipe],
    ["flange", metrics.flange],
    ["valve", metrics.valve],
    ["fitting", metrics.fitting],
    ["bolt", metrics.bolt],
    ["gasket", metrics.gasket],
    ["blind", metrics.blind],
    ["support", metrics.support],
    ["exclusion", metrics.exclusion],
    ["unknown", metrics.unknown],
  ];

  return entries
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({
      category,
      label: BUSINESS_CATEGORY_LABELS[category],
      count,
    }));
}

export type ComparisonSummaryCounts = {
  matchedCount: number;
  missingCount: number;
  differentQuantityCount: number;
  uncertainCount: number;
};

export function resolveExperimentalAssistantStatus(params: {
  hasAnalysisResult: boolean;
  hasSuggestions: boolean;
  selectedCount: number;
  importSuccess: boolean;
  takeoffReviewInvalidated: boolean;
}): ExperimentalAssistantStatus {
  if (params.importSuccess && params.takeoffReviewInvalidated) {
    return "requires_review";
  }

  if (params.importSuccess) {
    return "imported";
  }

  if (params.selectedCount > 0) {
    return "with_selection";
  }

  if (params.hasAnalysisResult && params.hasSuggestions) {
    return "analyzed";
  }

  if (params.hasAnalysisResult) {
    return "analyzed";
  }

  return "not_analyzed";
}

export function resolveExperimentalAssistantActiveStep(
  status: ExperimentalAssistantStatus,
): ExperimentalAssistantStepId {
  switch (status) {
    case "not_analyzed":
      return "analyze";
    case "analyzed":
      return "review";
    case "with_selection":
      return "import";
    case "imported":
    case "requires_review":
      return "final";
  }
}

export function buildExperimentalAssistantMetrics(params: {
  suggestedCount: number;
  comparisonSummary: ComparisonSummaryCounts | null | undefined;
  selectedCount: number;
}): ExperimentalAssistantMetrics {
  return {
    suggested: params.suggestedCount,
    missing: params.comparisonSummary?.missingCount ?? 0,
    matched: params.comparisonSummary?.matchedCount ?? 0,
    differentQuantity: params.comparisonSummary?.differentQuantityCount ?? 0,
    uncertain: params.comparisonSummary?.uncertainCount ?? 0,
    selected: params.selectedCount,
  };
}

export function buildExperimentalAssistantDiscoveryCopy(params: {
  suggestedCount: number;
  comparisonSummary: ComparisonSummaryCounts | null | undefined;
}): ExperimentalAssistantDiscoveryCopy | null {
  if (params.suggestedCount <= 0) {
    return null;
  }

  const missingCount = params.comparisonSummary?.missingCount ?? 0;
  const matchedCount = params.comparisonSummary?.matchedCount ?? 0;

  return {
    headline: `La app ha encontrado ${params.suggestedCount} posible(s) línea(s) de palillería en la relación de materiales.`,
    missingLine:
      missingCount > 0 ? `${missingCount} parecen nuevas.` : null,
    matchedLine:
      matchedCount > 0
        ? `${matchedCount} ya están en tu palillería.`
        : null,
    businessRulesNote: EXPERIMENTAL_BUSINESS_RULES_DISCOVERY_NOTE,
    safetyNote: EXPERIMENTAL_ASSISTANT_NO_AUTO_IMPORT_NOTE,
  };
}

export function isExperimentalAssistantStepComplete(
  stepId: ExperimentalAssistantStepId,
  status: ExperimentalAssistantStatus,
): boolean {
  const activeStep = resolveExperimentalAssistantActiveStep(status);
  const activeIndex = EXPERIMENTAL_ASSISTANT_STEPS.findIndex(
    (step) => step.id === activeStep,
  );
  const stepIndex = EXPERIMENTAL_ASSISTANT_STEPS.findIndex(
    (step) => step.id === stepId,
  );

  return stepIndex < activeIndex;
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function itemMatchesSearch(
  item: ExperimentalSuggestionListItem,
  normalizedQuery: string,
): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }

  const reference = item.reference?.trim().toLowerCase() ?? "";
  const description = normalizeTakeoffDescription(item.description);

  return (
    reference.includes(normalizedQuery) ||
    description.includes(normalizedQuery)
  );
}

export function filterExperimentalSuggestions(
  items: ExperimentalSuggestionListItem[],
  params: {
    statusFilter: ExperimentalSuggestionStatusFilter;
    actionFilter?: ExperimentalSuggestionActionFilter;
    searchQuery: string;
  },
): ExperimentalSuggestionListItem[] {
  const normalizedQuery = normalizeSearchQuery(params.searchQuery);
  const actionFilter = params.actionFilter ?? "all";

  return items.filter((item) => {
    if (
      params.statusFilter !== "all" &&
      item.comparisonStatus !== params.statusFilter
    ) {
      return false;
    }

    if (actionFilter !== "all" && item.businessAction !== actionFilter) {
      return false;
    }

    return itemMatchesSearch(item, normalizedQuery);
  });
}

export function isExperimentalSuggestionImportable(
  item: ExperimentalSuggestionListItem,
): boolean {
  return (
    item.comparisonStatus === "missing" &&
    item.businessAction !== "exclude" &&
    item.suggestionKey.length > 0
  );
}

export function isExperimentalSuggestionBulkSelectable(
  item: ExperimentalSuggestionListItem,
): boolean {
  return (
    item.comparisonStatus === "missing" &&
    item.businessAction === "include" &&
    item.suggestionKey.length > 0
  );
}

export function buildExperimentalBusinessMetrics(
  items: ExperimentalSuggestionListItem[],
): ExperimentalBusinessMetrics {
  const countCategory = (category: BusinessRuleCategory) =>
    items.filter((item) => item.businessCategory === category).length;

  return {
    include: items.filter((item) => item.businessAction === "include").length,
    review: items.filter((item) => item.businessAction === "review").length,
    exclude: items.filter((item) => item.businessAction === "exclude").length,
    pipe: countCategory("pipe"),
    flange: countCategory("flange"),
    valve: countCategory("valve"),
    fitting: countCategory("fitting"),
    bolt: countCategory("bolt"),
    gasket: countCategory("gasket"),
    blind: countCategory("blind"),
    support: countCategory("support"),
    exclusion: countCategory("exclusion"),
    unknown: countCategory("unknown"),
  };
}

export function getImportableMissingKeys(
  items: ExperimentalSuggestionListItem[],
): string[] {
  return items
    .filter((item) => isExperimentalSuggestionImportable(item))
    .map((item) => item.suggestionKey);
}

export function getBulkSelectableMissingKeys(
  items: ExperimentalSuggestionListItem[],
): string[] {
  return items
    .filter((item) => isExperimentalSuggestionBulkSelectable(item))
    .map((item) => item.suggestionKey);
}

export function getVisibleImportableMissingKeys(
  visibleItems: ExperimentalSuggestionListItem[],
): string[] {
  return getBulkSelectableMissingKeys(visibleItems);
}

export function mergeSelectionWithVisibleMissing(
  currentSelection: ReadonlySet<string>,
  visibleMissingKeys: string[],
): Set<string> {
  const next = new Set(currentSelection);

  for (const key of visibleMissingKeys) {
    next.add(key);
  }

  return next;
}

export function pruneSelectionToImportableKeys(
  currentSelection: ReadonlySet<string>,
  items: ExperimentalSuggestionListItem[],
): Set<string> {
  const importableKeys = new Set(getImportableMissingKeys(items));

  return new Set(
    [...currentSelection].filter((key) => importableKeys.has(key)),
  );
}

function parseQuantityForSummary(quantity: string | null): number | null {
  if (quantity == null) {
    return null;
  }

  const normalized = quantity.trim().replace(",", ".");

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

export type ExperimentalImportPreviewLine = {
  reference: string | null;
  description: string | null;
};

export type ExperimentalImportQuantityByUnit = {
  unit: string;
  total: number;
};

export type ExperimentalImportPreviewSummary = {
  lineCount: number;
  includeCount: number;
  reviewCount: number;
  hasReviewSelected: boolean;
  reviewWarningMessage: string | null;
  quantityByUnit: ExperimentalImportQuantityByUnit[];
  previewLines: ExperimentalImportPreviewLine[];
  warningMessage: string;
};

export function buildExperimentalImportPreviewSummary(
  items: ExperimentalSuggestionListItem[],
  selectedKeys: ReadonlySet<string>,
): ExperimentalImportPreviewSummary | null {
  if (selectedKeys.size === 0) {
    return null;
  }

  const itemsByKey = new Map(
    items.map((item) => [item.suggestionKey, item] as const),
  );
  const selectedItems: ExperimentalSuggestionListItem[] = [];

  for (const key of selectedKeys) {
    const item = itemsByKey.get(key);

    if (item) {
      selectedItems.push(item);
    }
  }

  if (selectedItems.length === 0) {
    return null;
  }

  const quantityTotals = new Map<string, number>();

  for (const item of selectedItems) {
    const quantity = parseQuantityForSummary(item.quantity);

    if (quantity == null) {
      continue;
    }

    const unitKey = item.unit?.trim().toLowerCase() || "sin unidad";
    quantityTotals.set(unitKey, (quantityTotals.get(unitKey) ?? 0) + quantity);
  }

  const quantityByUnit = [...quantityTotals.entries()]
    .map(([unit, total]) => ({
      unit,
      total: Number(total.toFixed(4)),
    }))
    .sort((a, b) => a.unit.localeCompare(b.unit, "es"));

  const previewLines = selectedItems
    .slice(0, EXPERIMENTAL_IMPORT_PREVIEW_MAX_LINES)
    .map((item) => ({
      reference: item.reference,
      description: item.description,
    }));

  const includeCount = selectedItems.filter(
    (item) => item.businessAction === "include",
  ).length;
  const reviewCount = selectedItems.filter(
    (item) => item.businessAction === "review",
  ).length;
  const hasReviewSelected = reviewCount > 0;

  return {
    lineCount: selectedKeys.size,
    includeCount,
    reviewCount,
    hasReviewSelected,
    reviewWarningMessage: hasReviewSelected
      ? EXPERIMENTAL_IMPORT_REVIEW_WARNING
      : null,
    quantityByUnit,
    previewLines,
    warningMessage: EXPERIMENTAL_IMPORT_PREVIEW_WARNING,
  };
}

export function formatExperimentalImportConfirmMessage(
  summary: ExperimentalImportPreviewSummary,
): string {
  const quantityPart =
    summary.quantityByUnit.length > 0
      ? `\n\nTotales por unidad:\n${summary.quantityByUnit
          .map((entry) => `- ${entry.total} ${entry.unit}`)
          .join("\n")}`
      : "";

  const previewPart =
    summary.previewLines.length > 0
      ? `\n\nPrimeras líneas:\n${summary.previewLines
          .map((line, index) => {
            const ref = line.reference?.trim() || "—";
            const desc = line.description?.trim() || "—";
            return `${index + 1}. ${ref} — ${desc}`;
          })
          .join("\n")}`
      : "";

  const businessPart = [
    `${summary.includeCount} marcada(s) para incluir.`,
    summary.reviewCount > 0
      ? `${summary.reviewCount} marcada(s) para revisión.`
      : null,
    summary.reviewWarningMessage,
  ]
    .filter((part): part is string => part != null && part.length > 0)
    .join("\n");

  return [
    `Se crearán ${summary.lineCount} línea(s) reales de palillería.`,
    businessPart,
    summary.warningMessage,
    "¿Continuar?",
    quantityPart,
    previewPart,
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}
