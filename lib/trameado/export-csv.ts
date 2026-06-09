import {
  escapeCsvCell,
  sanitizeTakeoffCsvFileNameSegment,
} from "@/lib/drawings/takeoff-csv";
import {
  formatPalilloLength,
  formatSegmentLabel,
} from "@/lib/trameado/format";
import { TRAMEADO_SHEET_EXPORT_COLUMNS } from "@/lib/trameado/labels";

export const TRAMEADO_CSV_SEPARATOR = "," as const;

export const TRAMEADO_CSV_HEADERS = TRAMEADO_SHEET_EXPORT_COLUMNS.map(
  (column) => column.label,
);

export type TrameadoCsvExportSegment = {
  segmentNumber: string;
  segmentLabel: string | null;
  diameter: string;
  schedule: string;
  palilloLength: string;
  lengthUnit: string;
  heatNumber: string | null;
  sortOrder: number;
};

export type TrameadoCsvExportSheet = {
  lineIdentifier: string;
  lineClass: string | null;
  segments: TrameadoCsvExportSegment[];
};

export function formatTrameadoExportSegmentNumber(
  segment: Pick<TrameadoCsvExportSegment, "segmentNumber" | "segmentLabel">,
): string {
  const label = segment.segmentLabel?.trim();

  if (label) {
    return label;
  }

  return formatSegmentLabel(segment.segmentNumber);
}

export function sortTrameadoExportSegments<T extends TrameadoCsvExportSegment>(
  segments: T[],
): T[] {
  return [...segments].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.segmentNumber.localeCompare(right.segmentNumber, undefined, {
      numeric: true,
    });
  });
}

export function buildTrameadoCsvRow(
  sheet: Pick<TrameadoCsvExportSheet, "lineIdentifier" | "lineClass">,
  segment: TrameadoCsvExportSegment,
): string {
  return [
    escapeCsvCell(sheet.lineIdentifier),
    escapeCsvCell(sheet.lineClass ?? ""),
    escapeCsvCell(formatTrameadoExportSegmentNumber(segment)),
    escapeCsvCell(segment.diameter),
    escapeCsvCell(segment.schedule),
    escapeCsvCell(formatPalilloLength(segment.palilloLength, segment.lengthUnit)),
    escapeCsvCell(segment.heatNumber ?? ""),
  ].join(TRAMEADO_CSV_SEPARATOR);
}

export function buildTrameadoCsv(sheet: TrameadoCsvExportSheet): string {
  const header = TRAMEADO_CSV_HEADERS.join(TRAMEADO_CSV_SEPARATOR);
  const rows = sortTrameadoExportSegments(sheet.segments).map((segment) =>
    buildTrameadoCsvRow(sheet, segment),
  );

  return [header, ...rows].join("\r\n");
}

export function buildTrameadoCsvFileName(
  lineIdentifier: string,
  drawingNumber?: string | null,
): string {
  const lineSegment = sanitizeTakeoffCsvFileNameSegment(lineIdentifier);
  const drawingSegment = drawingNumber?.trim()
    ? sanitizeTakeoffCsvFileNameSegment(drawingNumber)
    : null;

  if (drawingSegment) {
    return `trameado-${drawingSegment}-${lineSegment}.csv`;
  }

  return `hoja-palilleo-${lineSegment}.csv`;
}

export function buildTrameadoCsvDownloadBuffer(content: string): Buffer {
  return Buffer.from(`\uFEFF${content}`, "utf-8");
}

export function buildTrameadoCsvExportPath(sheetId: string): string {
  return `/api/files/trameado/${sheetId}/csv`;
}
