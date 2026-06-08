import type { DrawingProgressState } from "@/lib/drawings/drawing-progress";
import {
  normalizeTakeoffUnit,
  TAKEOFF_EMPTY_UNIT_LABEL,
  TAKEOFF_UNIT_FILTER_ALL,
} from "@/lib/drawings/filter-takeoff-items";
import type { SerializedJobTakeoffExportItem } from "@/lib/drawings/job-takeoff-export";
import { formatTakeoffQuantity } from "@/lib/drawings/takeoff-summary";

export type JobTakeoffConsolidatedSourceDrawing = {
  drawingId: string;
  label: string;
};

export type JobTakeoffConsolidatedRow = {
  groupKey: string;
  reference: string | null;
  description: string;
  unit: string;
  totalQuantity: string;
  lineCount: number;
  drawingCount: number;
  sourceDrawings: JobTakeoffConsolidatedSourceDrawing[];
};

export type JobTakeoffConsolidatedSummary = {
  lineCount: number;
  totalQuantity: string;
  uniqueReferenceCount: number;
  drawingCountWithTakeoff: number;
  readyDrawingCount: number;
  pendingDrawingCount: number;
};

export type JobTakeoffDrawingScope = "all" | "ready_only";

export type JobTakeoffConsolidatedFilters = {
  searchQuery: string;
  unitFilter: string;
  drawingScope: JobTakeoffDrawingScope;
};

export const JOB_TAKEOFF_DRAWING_SCOPE_OPTIONS: Array<{
  value: JobTakeoffDrawingScope;
  label: string;
}> = [
  { value: "all", label: "Todos los planos" },
  { value: "ready_only", label: "Solo planos listos" },
];

function parseQuantity(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function normalizeReference(reference: string | null): string {
  return reference?.trim() ?? "";
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function formatJobTakeoffDrawingLabel(
  drawingNumber: string | null,
  drawingFileName: string,
): string {
  const trimmed = drawingNumber?.trim();

  if (trimmed) {
    return trimmed;
  }

  return drawingFileName;
}

function buildConsolidatedGroupKey(item: SerializedJobTakeoffExportItem): string {
  return [
    normalizeReference(item.reference),
    item.description.trim(),
    normalizeTakeoffUnit(item.unit),
  ].join("\0");
}

type ConsolidatedGroupAccumulator = {
  reference: string | null;
  description: string;
  unit: string;
  totalQuantity: number;
  lineCount: number;
  sourceDrawings: Map<string, JobTakeoffConsolidatedSourceDrawing>;
};

export function buildJobTakeoffConsolidatedRows(
  items: SerializedJobTakeoffExportItem[],
): JobTakeoffConsolidatedRow[] {
  const groups = new Map<string, ConsolidatedGroupAccumulator>();

  for (const item of items) {
    const groupKey = buildConsolidatedGroupKey(item);
    let group = groups.get(groupKey);

    if (!group) {
      const reference = normalizeReference(item.reference);

      group = {
        reference: reference.length > 0 ? reference : null,
        description: item.description.trim(),
        unit: normalizeTakeoffUnit(item.unit),
        totalQuantity: 0,
        lineCount: 0,
        sourceDrawings: new Map(),
      };
      groups.set(groupKey, group);
    }

    group.totalQuantity += parseQuantity(item.quantity);
    group.lineCount += 1;
    group.sourceDrawings.set(item.drawingId, {
      drawingId: item.drawingId,
      label: formatJobTakeoffDrawingLabel(
        item.drawingNumber,
        item.drawingFileName,
      ),
    });
  }

  return Array.from(groups.entries())
    .map(([groupKey, group]) => ({
      groupKey,
      reference: group.reference,
      description: group.description,
      unit: group.unit,
      totalQuantity: formatTakeoffQuantity(group.totalQuantity),
      lineCount: group.lineCount,
      drawingCount: group.sourceDrawings.size,
      sourceDrawings: Array.from(group.sourceDrawings.values()).sort((left, right) =>
        left.label.localeCompare(right.label, "es"),
      ),
    }))
    .sort((left, right) => {
      const referenceCompare = (left.reference ?? "").localeCompare(
        right.reference ?? "",
        "es",
      );

      if (referenceCompare !== 0) {
        return referenceCompare;
      }

      const descriptionCompare = left.description.localeCompare(
        right.description,
        "es",
      );

      if (descriptionCompare !== 0) {
        return descriptionCompare;
      }

      if (left.unit === TAKEOFF_EMPTY_UNIT_LABEL) {
        return 1;
      }

      if (right.unit === TAKEOFF_EMPTY_UNIT_LABEL) {
        return -1;
      }

      return left.unit.localeCompare(right.unit, "es");
    });
}

export function filterJobTakeoffItemsByDrawingScope(
  items: SerializedJobTakeoffExportItem[],
  drawingScope: JobTakeoffDrawingScope,
  drawingProgressByDrawingId: Record<string, DrawingProgressState>,
): SerializedJobTakeoffExportItem[] {
  if (drawingScope === "all") {
    return items;
  }

  return items.filter(
    (item) => drawingProgressByDrawingId[item.drawingId] === "ready",
  );
}

export function buildJobTakeoffConsolidatedUnitFilterOptions(
  rows: JobTakeoffConsolidatedRow[],
): Array<{ value: string; label: string }> {
  const units = new Set(rows.map((row) => row.unit));

  return [
    { value: TAKEOFF_UNIT_FILTER_ALL, label: "Todas las unidades" },
    ...Array.from(units)
      .sort((left, right) => {
        if (left === TAKEOFF_EMPTY_UNIT_LABEL) {
          return 1;
        }

        if (right === TAKEOFF_EMPTY_UNIT_LABEL) {
          return -1;
        }

        return left.localeCompare(right, "es");
      })
      .map((unit) => ({ value: unit, label: unit })),
  ];
}

export function filterJobTakeoffConsolidatedRows(
  rows: JobTakeoffConsolidatedRow[],
  filters: Pick<JobTakeoffConsolidatedFilters, "searchQuery" | "unitFilter">,
): JobTakeoffConsolidatedRow[] {
  const normalizedSearch = normalizeSearchQuery(filters.searchQuery);

  return rows.filter((row) => {
    if (
      filters.unitFilter !== TAKEOFF_UNIT_FILTER_ALL &&
      row.unit !== filters.unitFilter
    ) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchableFields = [row.reference, row.description, row.unit];

    return searchableFields.some((field) =>
      field?.toLowerCase().includes(normalizedSearch),
    );
  });
}

export function buildJobTakeoffConsolidatedSummary(
  items: SerializedJobTakeoffExportItem[],
  drawingProgressByDrawingId: Record<string, DrawingProgressState>,
): JobTakeoffConsolidatedSummary {
  const drawingIds = new Set<string>();
  const uniqueReferences = new Set<string>();
  let totalQuantity = 0;

  for (const item of items) {
    drawingIds.add(item.drawingId);
    totalQuantity += parseQuantity(item.quantity);

    const reference = normalizeReference(item.reference);

    if (reference) {
      uniqueReferences.add(reference);
    }
  }

  let readyDrawingCount = 0;
  let pendingDrawingCount = 0;

  for (const drawingId of drawingIds) {
    if (drawingProgressByDrawingId[drawingId] === "ready") {
      readyDrawingCount += 1;
    } else {
      pendingDrawingCount += 1;
    }
  }

  return {
    lineCount: items.length,
    totalQuantity: formatTakeoffQuantity(totalQuantity),
    uniqueReferenceCount: uniqueReferences.size,
    drawingCountWithTakeoff: drawingIds.size,
    readyDrawingCount,
    pendingDrawingCount,
  };
}
