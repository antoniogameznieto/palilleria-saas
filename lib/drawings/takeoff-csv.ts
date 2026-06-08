import type { SerializedTakeoffItem } from "@/lib/drawings/takeoff";

export const TAKEOFF_CSV_HEADERS = [
  "reference",
  "description",
  "quantity",
  "unit",
  "length",
  "width",
  "height",
  "notes",
  "createdAt",
  "updatedAt",
] as const;

export function escapeCsvCell(value: string | null | undefined): string {
  const normalized = value ?? "";
  const mustQuote =
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n") ||
    normalized.includes("\r") ||
    normalized.includes(";");

  const escaped = normalized.replace(/"/g, '""');

  if (mustQuote) {
    return `"${escaped}"`;
  }

  return escaped;
}

function formatCsvDate(value: string): string {
  return new Date(value).toISOString();
}

export function buildTakeoffCsvRow(
  item: Pick<
    SerializedTakeoffItem,
    | "reference"
    | "description"
    | "quantity"
    | "unit"
    | "length"
    | "width"
    | "height"
    | "notes"
    | "createdAt"
    | "updatedAt"
  >,
): string {
  return [
    escapeCsvCell(item.reference),
    escapeCsvCell(item.description),
    escapeCsvCell(item.quantity),
    escapeCsvCell(item.unit),
    escapeCsvCell(item.length),
    escapeCsvCell(item.width),
    escapeCsvCell(item.height),
    escapeCsvCell(item.notes),
    escapeCsvCell(formatCsvDate(item.createdAt)),
    escapeCsvCell(formatCsvDate(item.updatedAt)),
  ].join(",");
}

export function buildTakeoffCsv(items: SerializedTakeoffItem[]): string {
  const header = TAKEOFF_CSV_HEADERS.join(",");
  const rows = items.map((item) => buildTakeoffCsvRow(item));

  return [header, ...rows].join("\r\n");
}

export function sanitizeTakeoffCsvFileNameSegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized.length > 0 ? sanitized : "drawing";
}

export function buildTakeoffCsvFileName(
  drawingNumber: string | null | undefined,
  drawingId: string,
): string {
  const segment = drawingNumber?.trim()
    ? sanitizeTakeoffCsvFileNameSegment(drawingNumber)
    : drawingId;

  return `takeoff-${segment}.csv`;
}

export function downloadTakeoffCsv(content: string, fileName: string): void {
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
