import ExcelJS from "exceljs";

import { protectSpreadsheetExportText } from "@/lib/drawings/csv-safety";
import {
  buildTrameadoCsvFileName,
  formatTrameadoExportSegmentNumber,
  sortTrameadoExportSegments,
  TRAMEADO_CSV_HEADERS,
  type TrameadoCsvExportSheet,
} from "@/lib/trameado/export-csv";

export const TRAMEADO_XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;

export const TRAMEADO_XLSX_HEADERS = TRAMEADO_CSV_HEADERS;

export const TRAMEADO_XLSX_SHEET_NAME = "Hoja de palilleo";

const PALILLO_NUM_FMT = "#,##0.###";

function safeExcelText(value: string | null | undefined): string {
  return protectSpreadsheetExportText(value ?? "");
}

function parsePalilloNumber(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function styleHeaderRow(sheet: ExcelJS.Worksheet): void {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.alignment = { vertical: "middle" };
}

function freezeHeaderRow(sheet: ExcelJS.Worksheet): void {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

export function buildTrameadoXlsxFileName(
  lineIdentifier: string,
  drawingNumber?: string | null,
): string {
  return buildTrameadoCsvFileName(lineIdentifier, drawingNumber).replace(
    /\.csv$/,
    ".xlsx",
  );
}

export function buildTrameadoXlsxExportPath(sheetId: string): string {
  return `/api/files/trameado/${sheetId}/xlsx`;
}

export async function buildTrameadoXlsxBuffer(
  sheet: TrameadoCsvExportSheet,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(TRAMEADO_XLSX_SHEET_NAME);

  worksheet.columns = [
    { key: "iso", width: 28 },
    { key: "lineClass", width: 12 },
    { key: "segmentNumber", width: 8 },
    { key: "diameter", width: 10 },
    { key: "schedule", width: 10 },
    { key: "palilloLength", width: 12 },
    { key: "heatNumber", width: 14 },
  ];

  worksheet.addRow(TRAMEADO_XLSX_HEADERS);
  styleHeaderRow(worksheet);
  freezeHeaderRow(worksheet);

  const sortedSegments = sortTrameadoExportSegments(sheet.segments);

  for (const segment of sortedSegments) {
    const row = worksheet.addRow({
      iso: safeExcelText(sheet.lineIdentifier),
      lineClass: safeExcelText(sheet.lineClass ?? ""),
      segmentNumber: safeExcelText(formatTrameadoExportSegmentNumber(segment)),
      diameter: safeExcelText(segment.diameter),
      schedule: safeExcelText(segment.schedule),
      palilloLength: parsePalilloNumber(segment.palilloLength),
      heatNumber: safeExcelText(segment.heatNumber ?? ""),
    });

    row.getCell("palilloLength").numFmt = PALILLO_NUM_FMT;
  }

  const lastRow = 1 + sortedSegments.length;
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: lastRow, column: TRAMEADO_XLSX_HEADERS.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
