/**
 * EXPERIMENTAL — Fase 14F
 * Helpers puros de filtro, selección y resumen previo (solo UI).
 */

import type { TakeoffComparisonStatus } from "@/lib/drawings/experimental-auto-takeoff-compare";
import { normalizeTakeoffDescription } from "@/lib/drawings/experimental-auto-takeoff-compare";

export type ExperimentalSuggestionListItem = {
  item: number | null;
  reference: string | null;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  confidence: number;
  comparisonStatus?: TakeoffComparisonStatus;
  suggestionKey: string;
};

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

export const EXPERIMENTAL_IMPORT_PREVIEW_MAX_LINES = 5;

export const EXPERIMENTAL_IMPORT_PREVIEW_WARNING =
  "Se crearán líneas reales y se invalidará la revisión de palillería si estaba marcada.";

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
    searchQuery: string;
  },
): ExperimentalSuggestionListItem[] {
  const normalizedQuery = normalizeSearchQuery(params.searchQuery);

  return items.filter((item) => {
    if (
      params.statusFilter !== "all" &&
      item.comparisonStatus !== params.statusFilter
    ) {
      return false;
    }

    return itemMatchesSearch(item, normalizedQuery);
  });
}

export function getImportableMissingKeys(
  items: ExperimentalSuggestionListItem[],
): string[] {
  return items
    .filter(
      (item) =>
        item.comparisonStatus === "missing" && item.suggestionKey.length > 0,
    )
    .map((item) => item.suggestionKey);
}

export function getVisibleImportableMissingKeys(
  visibleItems: ExperimentalSuggestionListItem[],
): string[] {
  return getImportableMissingKeys(visibleItems);
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

  return {
    lineCount: selectedKeys.size,
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

  return [
    `Se crearán ${summary.lineCount} línea(s) reales de palillería.`,
    summary.warningMessage,
    "¿Continuar?",
    quantityPart,
    previewPart,
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}
