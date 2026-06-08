import type { TakeoffCsvImportRowInput } from "@/lib/validations/takeoff-import";

export const TAKEOFF_CSV_IMPORT_COLUMNS = [
  "reference",
  "description",
  "quantity",
  "unit",
  "length",
  "width",
  "height",
  "notes",
] as const;

export type TakeoffCsvImportColumn = (typeof TAKEOFF_CSV_IMPORT_COLUMNS)[number];

export const TAKEOFF_CSV_IMPORT_MAX_ROWS = 500;
export const TAKEOFF_CSV_IMPORT_MAX_FILE_SIZE_BYTES = 512 * 1024;

export type TakeoffCsvImportParsedRow = {
  csvRowNumber: number;
  data: TakeoffCsvImportRowInput;
};

export function parseCsvContent(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\r" && next === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      index += 1;
      continue;
    }

    if (char === "\n" || char === "\r") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);

  if (row.length > 1 || row[0] !== "") {
    rows.push(row);
  }

  return rows;
}

function isCsvRowEmpty(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === "");
}

function isHeaderRow(cells: string[]): boolean {
  const normalized = cells.map((cell) => cell.trim().toLowerCase());

  return (
    normalized.includes("description") && normalized.includes("quantity")
  );
}

function mapRowByHeaders(
  headers: string[],
  cells: string[],
): TakeoffCsvImportRowInput {
  const mapped: Record<TakeoffCsvImportColumn, string> = {
    reference: "",
    description: "",
    quantity: "",
    unit: "",
    length: "",
    width: "",
    height: "",
    notes: "",
  };

  headers.forEach((header, index) => {
    const normalized = header.trim().toLowerCase();

    if (
      TAKEOFF_CSV_IMPORT_COLUMNS.includes(normalized as TakeoffCsvImportColumn)
    ) {
      mapped[normalized as TakeoffCsvImportColumn] = cells[index]?.trim() ?? "";
    }
  });

  return mapped;
}

function mapRowByFixedOrder(cells: string[]): TakeoffCsvImportRowInput {
  return {
    reference: cells[0]?.trim() ?? "",
    description: cells[1]?.trim() ?? "",
    quantity: cells[2]?.trim() ?? "",
    unit: cells[3]?.trim() ?? "",
    length: cells[4]?.trim() ?? "",
    width: cells[5]?.trim() ?? "",
    height: cells[6]?.trim() ?? "",
    notes: cells[7]?.trim() ?? "",
  };
}

export function extractTakeoffCsvImportRows(
  csvRows: string[][],
):
  | { ok: true; rows: TakeoffCsvImportParsedRow[] }
  | { ok: false; error: string } {
  const nonEmptyRows = csvRows
    .map((cells, index) => ({ cells, csvRowNumber: index + 1 }))
    .filter(({ cells }) => !isCsvRowEmpty(cells));

  if (nonEmptyRows.length === 0) {
    return {
      ok: false,
      error: "El CSV no contiene líneas para importar.",
    };
  }

  const hasHeader = isHeaderRow(nonEmptyRows[0].cells);
  const dataRows = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows;

  if (dataRows.length === 0) {
    return {
      ok: false,
      error: "El CSV no contiene líneas para importar.",
    };
  }

  if (dataRows.length > TAKEOFF_CSV_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      error: `El CSV supera el límite de ${TAKEOFF_CSV_IMPORT_MAX_ROWS} líneas.`,
    };
  }

  const headers = hasHeader ? nonEmptyRows[0].cells : null;
  const rows = dataRows.map(({ cells, csvRowNumber }) => ({
    csvRowNumber,
    data: headers
      ? mapRowByHeaders(headers, cells)
      : mapRowByFixedOrder(cells),
  }));

  return { ok: true, rows };
}

export function isAcceptedTakeoffCsvFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const acceptedTypes = new Set([
    "text/csv",
    "text/plain",
    "application/vnd.ms-excel",
  ]);

  if (!fileName.endsWith(".csv")) {
    return false;
  }

  return file.type === "" || acceptedTypes.has(file.type);
}
