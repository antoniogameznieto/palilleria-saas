import {
  protectCsvExportCell,
  protectSpreadsheetExportText,
} from "../lib/drawings/csv-safety";
import { getDrawingProgress } from "../lib/drawings/drawing-progress";
import { TAKEOFF_UNIT_FILTER_ALL } from "../lib/drawings/filter-takeoff-items";
import {
  buildJobTakeoffConsolidatedRows,
  buildJobTakeoffConsolidatedSummary,
  filterJobTakeoffConsolidatedRows,
  filterJobTakeoffItemsByDrawingScope,
} from "../lib/drawings/job-takeoff-consolidated";
import type { SerializedJobTakeoffExportItem } from "../lib/drawings/job-takeoff-export";
import {
  buildTakeoffFormSuggestions,
  getReferenceAutofill,
} from "../lib/drawings/takeoff-suggestions";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function makeExportItem(
  overrides: Partial<SerializedJobTakeoffExportItem> = {},
): SerializedJobTakeoffExportItem {
  return {
    drawingId: "drawing-1",
    drawingNumber: "P-001",
    lineNumber: "1",
    revision: "A",
    drawingFileName: "plano.pdf",
    reference: "REF-1",
    description: "Partida A",
    quantity: "2.5",
    unit: "m²",
    length: null,
    width: null,
    height: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function verifyCsvSafety(): void {
  assert(
    protectCsvExportCell("=SUM(A1)") === "'=SUM(A1)",
    "CSV export should neutralize formula prefix",
  );
  assert(
    protectCsvExportCell("+123") === "'+123",
    "CSV export should neutralize plus prefix",
  );
  assert(
    protectCsvExportCell("-123") === "'-123",
    "CSV export should neutralize minus prefix",
  );
  assert(
    protectSpreadsheetExportText("@cmd") === "'@cmd",
    "Spreadsheet export alias should match CSV rules",
  );
  assert(
    protectCsvExportCell("normal text") === "normal text",
    "CSV export should leave safe text unchanged",
  );
}

function verifyDrawingProgress(): void {
  assert(
    getDrawingProgress({
      status: "error",
      drawingNumber: "1",
      lineNumber: "1",
      revision: "A",
      takeoffLineCount: 1,
      takeoffReviewedAt: new Date(),
    }) === "error",
    "Error status should map to error progress",
  );

  assert(
    getDrawingProgress({
      status: "reviewed",
      drawingNumber: null,
      lineNumber: "1",
      revision: "A",
      takeoffLineCount: 0,
      takeoffReviewedAt: null,
    }) === "missing_metadata",
    "Missing metadata should be detected",
  );

  assert(
    getDrawingProgress({
      status: "uploaded",
      drawingNumber: "1",
      lineNumber: "1",
      revision: "A",
      takeoffLineCount: 0,
      takeoffReviewedAt: null,
    }) === "metadata_pending_review",
    "Unreviewed metadata should block progress",
  );

  assert(
    getDrawingProgress({
      status: "reviewed",
      drawingNumber: "1",
      lineNumber: "1",
      revision: "A",
      takeoffLineCount: 0,
      takeoffReviewedAt: null,
    }) === "takeoff_missing",
    "Reviewed drawing without takeoff should be takeoff_missing",
  );

  assert(
    getDrawingProgress({
      status: "reviewed",
      drawingNumber: "1",
      lineNumber: "1",
      revision: "A",
      takeoffLineCount: 2,
      takeoffReviewedAt: null,
    }) === "takeoff_pending_review",
    "Takeoff without review should be pending review",
  );

  assert(
    getDrawingProgress({
      status: "approved",
      drawingNumber: "1",
      lineNumber: "1",
      revision: "A",
      takeoffLineCount: 2,
      takeoffReviewedAt: new Date(),
    }) === "ready",
    "Reviewed takeoff on approved drawing should be ready",
  );
}

function verifyConsolidated(): void {
  const items = [
    makeExportItem({ drawingId: "d1", quantity: "1", unit: "m²" }),
    makeExportItem({ drawingId: "d2", quantity: "3", unit: "m²" }),
    makeExportItem({
      drawingId: "d1",
      reference: null,
      description: "Sin ref",
      quantity: "2",
      unit: null,
    }),
  ];

  const rows = buildJobTakeoffConsolidatedRows(items);
  assert(rows.length === 2, "Consolidated rows should group by ref+desc+unit");

  const grouped = rows.find((row) => row.unit === "m²");
  assert(grouped?.totalQuantity === "4", "Grouped quantity should sum lines");
  assert(grouped?.lineCount === 2, "Grouped line count should be 2");
  assert(grouped?.drawingCount === 2, "Grouped drawing count should be 2");

  const scoped = filterJobTakeoffItemsByDrawingScope(
    items,
    "ready_only",
    { d1: "ready", d2: "takeoff_pending_review" },
  );
  assert(scoped.length === 2, "Ready-only scope should filter by drawing progress");
  assert(
    scoped.every((item) => item.drawingId === "d1"),
    "Ready-only scope should keep only ready drawings",
  );

  const filtered = filterJobTakeoffConsolidatedRows(rows, {
    searchQuery: "sin ref",
    unitFilter: TAKEOFF_UNIT_FILTER_ALL,
  });
  assert(filtered.length === 1, "Search should match null-reference rows");

  const summary = buildJobTakeoffConsolidatedSummary(items, {
    d1: "ready",
    d2: "takeoff_pending_review",
  });
  assert(summary.lineCount === 3, "Summary line count should match items");
  assert(summary.totalQuantity === "6", "Summary quantity should sum all items");
  assert(summary.uniqueReferenceCount === 1, "Null references should not count");
  assert(summary.readyDrawingCount === 1, "Summary should count ready drawings");
  assert(summary.pendingDrawingCount === 1, "Summary should count pending drawings");
}

function verifySuggestions(): void {
  const empty = buildTakeoffFormSuggestions([], []);
  assert(empty.referenceOptions.length === 0, "Empty suggestions should have no refs");
  assert(empty.unitOptions.length === 6, "Unit options should include common units");

  const suggestions = buildTakeoffFormSuggestions(
    [{ reference: "P-1", description: "Local", unit: "ud" }],
    [
      { reference: "P-2", description: "Job desc", unit: "kg" },
      { reference: "P-1", description: "Dup", unit: "ud" },
    ],
  );
  assert(
    suggestions.referenceOptions[0] === "P-1",
    "Drawing references should come first",
  );
  assert(
    suggestions.referenceOptions.includes("P-2"),
    "Job-only references should be included",
  );

  const profiles = buildTakeoffFormSuggestions(
    [],
    [
      { reference: "ABC", description: "Desc A", unit: "m" },
      { reference: "abc", description: "Desc B", unit: "m²" },
    ],
  ).referenceProfiles;

  const autofill = getReferenceAutofill(profiles, "AbC");
  assert(autofill?.description === "Desc A", "Autofill should be case-insensitive");
}

function main(): void {
  verifyCsvSafety();
  verifyDrawingProgress();
  verifyConsolidated();
  verifySuggestions();
  console.log("verify-takeoff-pure: all checks passed");
}

main();
