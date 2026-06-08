import type { SerializedTakeoffItem } from "@/lib/drawings/takeoff";

export const TAKEOFF_UNIT_FILTER_ALL = "all";
export const TAKEOFF_EMPTY_UNIT_LABEL = "Sin unidad";

export type TakeoffSortField =
  | "reference"
  | "description"
  | "quantity"
  | "unit"
  | "createdAt";

export type TakeoffSortDirection = "asc" | "desc";

export type TakeoffItemFilters = {
  searchQuery: string;
  unitFilter: string;
  sortField: TakeoffSortField;
  sortDirection: TakeoffSortDirection;
};

export const TAKEOFF_SORT_FIELD_OPTIONS: Array<{
  value: TakeoffSortField;
  label: string;
}> = [
  { value: "createdAt", label: "Fecha de creación" },
  { value: "reference", label: "Referencia" },
  { value: "description", label: "Descripción" },
  { value: "quantity", label: "Cantidad" },
  { value: "unit", label: "Unidad" },
];

export const TAKEOFF_SORT_DIRECTION_OPTIONS: Array<{
  value: TakeoffSortDirection;
  label: string;
}> = [
  { value: "asc", label: "Ascendente" },
  { value: "desc", label: "Descendente" },
];

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function normalizeTakeoffUnit(unit: string | null | undefined): string {
  const trimmed = unit?.trim();

  if (!trimmed) {
    return TAKEOFF_EMPTY_UNIT_LABEL;
  }

  return trimmed;
}

export function matchesTakeoffSearchQuery(
  item: Pick<
    SerializedTakeoffItem,
    "reference" | "description" | "unit" | "notes"
  >,
  query: string,
): boolean {
  const normalized = normalizeSearchQuery(query);

  if (!normalized) {
    return true;
  }

  const searchableFields = [
    item.reference,
    item.description,
    item.unit,
    item.notes,
  ];

  return searchableFields.some((field) =>
    field?.toLowerCase().includes(normalized),
  );
}

export function matchesTakeoffUnitFilter(
  item: Pick<SerializedTakeoffItem, "unit">,
  unitFilter: string,
): boolean {
  if (unitFilter === TAKEOFF_UNIT_FILTER_ALL) {
    return true;
  }

  return normalizeTakeoffUnit(item.unit) === unitFilter;
}

export function buildTakeoffUnitFilterOptions(
  items: Pick<SerializedTakeoffItem, "unit">[],
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [
    { value: TAKEOFF_UNIT_FILTER_ALL, label: "Todas las unidades" },
  ];

  const units = new Set<string>();
  let hasEmptyUnit = false;

  for (const item of items) {
    const normalizedUnit = normalizeTakeoffUnit(item.unit);

    if (normalizedUnit === TAKEOFF_EMPTY_UNIT_LABEL) {
      hasEmptyUnit = true;
      continue;
    }

    units.add(normalizedUnit);
  }

  for (const unit of Array.from(units).sort((left, right) =>
    left.localeCompare(right, "es"),
  )) {
    options.push({ value: unit, label: unit });
  }

  if (hasEmptyUnit) {
    options.push({
      value: TAKEOFF_EMPTY_UNIT_LABEL,
      label: TAKEOFF_EMPTY_UNIT_LABEL,
    });
  }

  return options;
}

function parseQuantity(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function compareNullableText(
  left: string | null,
  right: string | null,
  direction: TakeoffSortDirection,
): number {
  const leftValue = left?.trim() ?? "";
  const rightValue = right?.trim() ?? "";

  if (!leftValue && rightValue) {
    return direction === "asc" ? 1 : -1;
  }

  if (leftValue && !rightValue) {
    return direction === "asc" ? -1 : 1;
  }

  const result = leftValue.localeCompare(rightValue, "es", {
    sensitivity: "base",
    numeric: true,
  });

  return direction === "asc" ? result : -result;
}

function compareTakeoffItems(
  left: SerializedTakeoffItem,
  right: SerializedTakeoffItem,
  sortField: TakeoffSortField,
  sortDirection: TakeoffSortDirection,
): number {
  switch (sortField) {
    case "reference":
      return compareNullableText(left.reference, right.reference, sortDirection);
    case "description":
      return compareNullableText(
        left.description,
        right.description,
        sortDirection,
      );
    case "quantity": {
      const result = parseQuantity(left.quantity) - parseQuantity(right.quantity);
      return sortDirection === "asc" ? result : -result;
    }
    case "unit":
      return compareNullableText(
        normalizeTakeoffUnit(left.unit),
        normalizeTakeoffUnit(right.unit),
        sortDirection,
      );
    case "createdAt": {
      const result =
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sortDirection === "asc" ? result : -result;
    }
    default:
      return 0;
  }
}

export function filterTakeoffItems<T extends SerializedTakeoffItem>(
  items: T[],
  filters: Pick<TakeoffItemFilters, "searchQuery" | "unitFilter">,
): T[] {
  return items.filter(
    (item) =>
      matchesTakeoffSearchQuery(item, filters.searchQuery) &&
      matchesTakeoffUnitFilter(item, filters.unitFilter),
  );
}

export function sortTakeoffItems<T extends SerializedTakeoffItem>(
  items: T[],
  sortField: TakeoffSortField,
  sortDirection: TakeoffSortDirection,
): T[] {
  return [...items].sort((left, right) =>
    compareTakeoffItems(left, right, sortField, sortDirection),
  );
}

export function filterAndSortTakeoffItems<T extends SerializedTakeoffItem>(
  items: T[],
  filters: TakeoffItemFilters,
): T[] {
  const filtered = filterTakeoffItems(items, filters);
  return sortTakeoffItems(filtered, filters.sortField, filters.sortDirection);
}
