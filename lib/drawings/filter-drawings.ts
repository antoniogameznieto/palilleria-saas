import type { DrawingStatus } from "@prisma/client";

export type DrawingListStatusFilter =
  | "all"
  | "uploaded"
  | "processing"
  | "detected"
  | "reviewed"
  | "error";

export const DRAWING_LIST_STATUS_FILTER_OPTIONS: Array<{
  value: DrawingListStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Todos los estados" },
  { value: "uploaded", label: "Subido" },
  { value: "processing", label: "Procesando" },
  { value: "detected", label: "Detectado" },
  { value: "reviewed", label: "Revisado" },
  { value: "error", label: "Error" },
];

export type FilterableDrawing = {
  fileName: string;
  originalFileName: string;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  status: DrawingStatus;
};

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesDrawingSearchQuery(
  drawing: FilterableDrawing,
  query: string,
): boolean {
  const normalized = normalizeSearchQuery(query);

  if (!normalized) {
    return true;
  }

  const searchableFields = [
    drawing.fileName,
    drawing.originalFileName,
    drawing.drawingNumber,
    drawing.lineNumber,
    drawing.revision,
  ];

  return searchableFields.some((field) =>
    field?.toLowerCase().includes(normalized),
  );
}

export function matchesDrawingStatusFilter(
  drawing: FilterableDrawing,
  statusFilter: DrawingListStatusFilter,
): boolean {
  if (statusFilter === "all") {
    return true;
  }

  return drawing.status === statusFilter;
}

export function filterDrawings<T extends FilterableDrawing>(
  drawings: T[],
  statusFilter: DrawingListStatusFilter,
  searchQuery: string,
): T[] {
  return drawings.filter(
    (drawing) =>
      matchesDrawingStatusFilter(drawing, statusFilter) &&
      matchesDrawingSearchQuery(drawing, searchQuery),
  );
}
