import ExcelJS from "exceljs";

import { protectSpreadsheetExportText } from "@/lib/drawings/csv-safety";
import {
  DRAWING_PROGRESS_LABELS,
  type DrawingProgressState,
} from "@/lib/drawings/drawing-progress";
import {
  buildJobTakeoffConsolidatedRows,
  buildJobTakeoffConsolidatedSummary,
  type JobTakeoffConsolidatedRow,
} from "@/lib/drawings/job-takeoff-consolidated";
import type { SerializedJobTakeoffExportItem } from "@/lib/drawings/job-takeoff-export";
import { sanitizeTakeoffCsvFileNameSegment } from "@/lib/drawings/takeoff-csv";

export type JobTakeoffExcelExportContext = {
  companyName: string;
  jobName: string;
  projectCode: string | null;
  exportedAt: Date;
  items: SerializedJobTakeoffExportItem[];
  drawingProgressByDrawingId: Record<string, DrawingProgressState>;
};

const DATE_TIME_NUM_FMT = "dd/mm/yyyy hh:mm";
const QUANTITY_NUM_FMT = "#,##0.###";

function safeExcelText(value: string | null | undefined): string {
  return protectSpreadsheetExportText(value ?? "");
}

function parseQuantity(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function parseOptionalQuantity(value: string | null): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function formatExportDateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function formatDisplayDateTime(date: Date): string {
  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNumber = 1): void {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true };
  row.alignment = { vertical: "middle" };
}

function freezeHeaderRow(sheet: ExcelJS.Worksheet): void {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  context: JobTakeoffExcelExportContext,
  summary: ReturnType<typeof buildJobTakeoffConsolidatedSummary>,
): void {
  const sheet = workbook.addWorksheet("Resumen");
  sheet.columns = [{ width: 28 }, { width: 48 }];

  const rows: Array<[string, string | number]> = [
    ["Empresa", safeExcelText(context.companyName)],
    ["Trabajo", safeExcelText(context.jobName)],
    ["Fecha de exportación", safeExcelText(formatDisplayDateTime(context.exportedAt))],
    ["Total líneas", summary.lineCount],
    ["Cantidad total", parseQuantity(summary.totalQuantity)],
    ["Referencias únicas", summary.uniqueReferenceCount],
    ["Planos incluidos", summary.drawingCountWithTakeoff],
    ["Planos listos", summary.readyDrawingCount],
    ["Planos no listos", summary.pendingDrawingCount],
  ];

  for (const [label, value] of rows) {
    const row = sheet.addRow([label, value]);

    row.getCell(1).font = { bold: true };

    if (label === "Cantidad total") {
      row.getCell(2).numFmt = QUANTITY_NUM_FMT;
    }
  }

  if (summary.pendingDrawingCount > 0) {
    sheet.addRow([]);
    const noteRow = sheet.addRow([
      "Nota",
      summary.pendingDrawingCount === 1
        ? "Hay 1 plano con palillería que aún no está listo. Las cantidades pueden cambiar."
        : `Hay ${summary.pendingDrawingCount} planos con palillería que aún no están listos. Las cantidades pueden cambiar.`,
    ]);
    noteRow.getCell(1).font = { bold: true };
    noteRow.getCell(2).alignment = { wrapText: true };
  }
}

function addConsolidatedSheet(
  workbook: ExcelJS.Workbook,
  rows: JobTakeoffConsolidatedRow[],
): void {
  const sheet = workbook.addWorksheet("Consolidado");
  sheet.columns = [
    { key: "reference", width: 16 },
    { key: "description", width: 36 },
    { key: "unit", width: 12 },
    { key: "totalQuantity", width: 14 },
    { key: "lineCount", width: 12 },
    { key: "drawingCount", width: 12 },
    { key: "sourceDrawings", width: 40 },
  ];

  sheet.addRow([
    "Referencia",
    "Descripción",
    "Unidad",
    "Cantidad total",
    "Nº líneas",
    "Nº planos",
    "Planos origen",
  ]);
  styleHeaderRow(sheet);
  freezeHeaderRow(sheet);

  for (const row of rows) {
    const excelRow = sheet.addRow({
      reference: safeExcelText(row.reference),
      description: safeExcelText(row.description),
      unit: safeExcelText(row.unit),
      totalQuantity: parseQuantity(row.totalQuantity),
      lineCount: row.lineCount,
      drawingCount: row.drawingCount,
      sourceDrawings: safeExcelText(
        row.sourceDrawings.map((drawing) => drawing.label).join(", "),
      ),
    });

    excelRow.getCell("totalQuantity").numFmt = QUANTITY_NUM_FMT;
  }
}

function addDetailSheet(
  workbook: ExcelJS.Workbook,
  context: JobTakeoffExcelExportContext,
): void {
  const sheet = workbook.addWorksheet("Detalle");
  sheet.columns = [
    { key: "drawingFileName", width: 28 },
    { key: "drawingNumber", width: 14 },
    { key: "lineNumber", width: 12 },
    { key: "revision", width: 10 },
    { key: "progress", width: 18 },
    { key: "reference", width: 16 },
    { key: "description", width: 36 },
    { key: "quantity", width: 12 },
    { key: "unit", width: 10 },
    { key: "length", width: 10 },
    { key: "width", width: 10 },
    { key: "height", width: 10 },
    { key: "notes", width: 24 },
    { key: "createdAt", width: 18 },
    { key: "updatedAt", width: 18 },
  ];

  sheet.addRow([
    "Plano",
    "Nº plano",
    "Línea",
    "Revisión",
    "Avance del plano",
    "Referencia",
    "Descripción",
    "Cantidad",
    "Unidad",
    "Largo",
    "Ancho",
    "Alto",
    "Notas",
    "Creado",
    "Actualizado",
  ]);
  styleHeaderRow(sheet);
  freezeHeaderRow(sheet);

  for (const item of context.items) {
    const progress =
      DRAWING_PROGRESS_LABELS[
        context.drawingProgressByDrawingId[item.drawingId] ?? "takeoff_missing"
      ];

    const row = sheet.addRow({
      drawingFileName: safeExcelText(item.drawingFileName),
      drawingNumber: safeExcelText(item.drawingNumber),
      lineNumber: safeExcelText(item.lineNumber),
      revision: safeExcelText(item.revision),
      progress: safeExcelText(progress),
      reference: safeExcelText(item.reference),
      description: safeExcelText(item.description),
      quantity: parseQuantity(item.quantity),
      unit: safeExcelText(item.unit),
      length: parseOptionalQuantity(item.length),
      width: parseOptionalQuantity(item.width),
      height: parseOptionalQuantity(item.height),
      notes: safeExcelText(item.notes),
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    });

    row.getCell("quantity").numFmt = QUANTITY_NUM_FMT;

    for (const columnKey of ["length", "width", "height"] as const) {
      const cell = row.getCell(columnKey);

      if (cell.value != null) {
        cell.numFmt = QUANTITY_NUM_FMT;
      }
    }

    row.getCell("createdAt").numFmt = DATE_TIME_NUM_FMT;
    row.getCell("updatedAt").numFmt = DATE_TIME_NUM_FMT;
  }
}

export function buildJobTakeoffExcelFileName(
  projectCode: string | null | undefined,
  jobName: string | null | undefined,
  jobId: string,
  exportedAt: Date,
): string {
  const segment = projectCode?.trim()
    ? sanitizeTakeoffCsvFileNameSegment(projectCode)
    : jobName?.trim()
      ? sanitizeTakeoffCsvFileNameSegment(jobName)
      : jobId;

  return `takeoff-${segment}-${formatExportDateStamp(exportedAt)}.xlsx`;
}

export async function buildJobTakeoffExcelBuffer(
  context: JobTakeoffExcelExportContext,
): Promise<Buffer> {
  const summary = buildJobTakeoffConsolidatedSummary(
    context.items,
    context.drawingProgressByDrawingId,
  );
  const consolidatedRows = buildJobTakeoffConsolidatedRows(context.items);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "palilleria-saas";
  workbook.created = context.exportedAt;

  addSummarySheet(workbook, context, summary);
  addConsolidatedSheet(workbook, consolidatedRows);
  addDetailSheet(workbook, context);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
