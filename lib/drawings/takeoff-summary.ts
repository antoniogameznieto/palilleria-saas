import type { SerializedTakeoffItem } from "@/lib/drawings/takeoff";

export type TakeoffSummaryUnitBreakdown = {
  unit: string;
  totalQuantity: string;
};

export type TakeoffSummary = {
  lineCount: number;
  totalQuantity: string;
  quantityByUnit: TakeoffSummaryUnitBreakdown[];
  uniqueReferenceCount: number;
};

export type JobTakeoffSummaryItem = Pick<
  SerializedTakeoffItem,
  "reference" | "quantity" | "unit"
> & {
  drawingId: string;
};

export type JobTakeoffSummary = TakeoffSummary & {
  drawingCountWithTakeoff: number;
};

const EMPTY_UNIT_LABEL = "Sin unidad";

function parseQuantity(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export function formatTakeoffQuantity(total: number): string {
  if (!Number.isFinite(total) || total === 0) {
    return "0";
  }

  const fixed = total.toFixed(3);
  return fixed.replace(/\.?0+$/, "");
}

function normalizeUnit(unit: string | null | undefined): string {
  const trimmed = unit?.trim();

  if (!trimmed) {
    return EMPTY_UNIT_LABEL;
  }

  return trimmed;
}

function normalizeReference(reference: string | null | undefined): string | null {
  const trimmed = reference?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

export function buildTakeoffSummary(
  items: Pick<SerializedTakeoffItem, "reference" | "quantity" | "unit">[],
): TakeoffSummary {
  if (items.length === 0) {
    return {
      lineCount: 0,
      totalQuantity: "0",
      quantityByUnit: [],
      uniqueReferenceCount: 0,
    };
  }

  const quantityByUnitMap = new Map<string, number>();
  const uniqueReferences = new Set<string>();
  let totalQuantity = 0;

  for (const item of items) {
    const quantity = parseQuantity(item.quantity);
    const unit = normalizeUnit(item.unit);
    const reference = normalizeReference(item.reference);

    totalQuantity += quantity;
    quantityByUnitMap.set(unit, (quantityByUnitMap.get(unit) ?? 0) + quantity);

    if (reference) {
      uniqueReferences.add(reference);
    }
  }

  const quantityByUnit = Array.from(quantityByUnitMap.entries())
    .map(([unit, unitTotal]) => ({
      unit,
      totalQuantity: formatTakeoffQuantity(unitTotal),
    }))
    .sort((left, right) => {
      if (left.unit === EMPTY_UNIT_LABEL) {
        return 1;
      }

      if (right.unit === EMPTY_UNIT_LABEL) {
        return -1;
      }

      return left.unit.localeCompare(right.unit, "es");
    });

  return {
    lineCount: items.length,
    totalQuantity: formatTakeoffQuantity(totalQuantity),
    quantityByUnit,
    uniqueReferenceCount: uniqueReferences.size,
  };
}

export function buildJobTakeoffSummary(
  items: JobTakeoffSummaryItem[],
): JobTakeoffSummary {
  const summary = buildTakeoffSummary(items);
  const drawingIds = new Set(items.map((item) => item.drawingId));

  return {
    ...summary,
    drawingCountWithTakeoff: drawingIds.size,
  };
}
