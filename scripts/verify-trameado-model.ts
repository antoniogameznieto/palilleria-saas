import {
  buildTrameadoCsv,
  buildTrameadoCsvDownloadBuffer,
  buildTrameadoCsvExportPath,
  buildTrameadoCsvFileName,
  formatTrameadoExportSegmentNumber,
  sortTrameadoExportSegments,
  TRAMEADO_CSV_HEADERS,
} from "../lib/trameado/export-csv";
import {
  formatPalilloLength,
  formatSegmentLabel,
  normalizeDiameter,
  normalizeSchedule,
  normalizeSegmentNumber,
} from "../lib/trameado/format";
import { TRAMEADO_SHEET_EXPORT_COLUMNS } from "../lib/trameado/labels";
import {
  trameadoSegmentFormSchema,
  trameadoSheetFormSchema,
} from "../lib/validations/trameado";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyFormatHelpers(): void {
  assert(
    normalizeDiameter('4"') === '4"',
    "normalizeDiameter should keep quoted inch values",
  );
  assert(
    normalizeDiameter("4") === '4"',
    "normalizeDiameter should add inch quote to plain numbers",
  );
  assert(
    normalizeSchedule(" 40 ") === "40",
    "normalizeSchedule should trim whitespace",
  );
  assert(
    normalizeSegmentNumber("<3>") === "3",
    "normalizeSegmentNumber should strip angle brackets",
  );
  assert(
    formatSegmentLabel("2") === "<2>",
    "formatSegmentLabel should wrap segment numbers",
  );
  assert(
    formatPalilloLength("363.000") === "363",
    "formatPalilloLength should trim trailing zeros",
  );
}

function verifySheetValidation(): void {
  const valid = trameadoSheetFormSchema.safeParse({
    lineIdentifier: "HL-1291-A012AA-N-01",
    lineClass: "A012AA",
    notes: "",
  });

  assert(valid.success, "Valid sheet payload should pass validation");

  const invalid = trameadoSheetFormSchema.safeParse({
    lineIdentifier: "",
  });

  assert(!invalid.success, "Empty lineIdentifier should fail validation");
}

function verifySegmentValidation(): void {
  const valid = trameadoSegmentFormSchema.safeParse({
    segmentNumber: "<1>",
    diameter: '4"',
    schedule: "40",
    palilloLength: "363",
    lengthUnit: "mm",
    heatNumber: "",
    notes: "",
  });

  assert(valid.success, "Valid segment payload should pass validation");

  if (valid.success) {
    assert(valid.data.segmentNumber === "1", "segmentNumber should normalize");
    assert(valid.data.diameter === '4"', "diameter should normalize");
    assert(valid.data.lengthUnit === "mm", "lengthUnit should default to mm");
  }

  const invalidLength = trameadoSegmentFormSchema.safeParse({
    segmentNumber: "1",
    diameter: '4"',
    schedule: "40",
    palilloLength: "0",
  });

  assert(
    !invalidLength.success,
    "palilloLength must be greater than zero",
  );

  const formulaRisk = trameadoSegmentFormSchema.safeParse({
    segmentNumber: "=1",
    diameter: '4"',
    schedule: "40",
    palilloLength: "10",
  });

  assert(!formulaRisk.success, "CSV formula injection should be rejected");
}

function verifyExportLabels(): void {
  assert(
    TRAMEADO_SHEET_EXPORT_COLUMNS.length === 7,
    "Export columns should match client sheet headers",
  );
  assert(
    TRAMEADO_SHEET_EXPORT_COLUMNS.some((column) => column.label === "PALILLO"),
    "PALILLO column should be present",
  );
  assert(
    TRAMEADO_CSV_HEADERS.join(",") ===
      "ISO,CLASE,Nº,Ø,SCH.,PALILLO,COLADA",
    "CSV headers should match client column order",
  );
}

function verifyCsvExport(): void {
  const sheet = {
    lineIdentifier: "HL-1291-A012AA-N-01",
    lineClass: "A012AA",
    segments: [
      {
        segmentNumber: "2",
        segmentLabel: null,
        diameter: '4"',
        schedule: "40",
        palilloLength: "363",
        lengthUnit: "mm",
        heatNumber: "-C-123",
        sortOrder: 2,
      },
      {
        segmentNumber: "1",
        segmentLabel: "<1>",
        diameter: '3/4"',
        schedule: "80",
        palilloLength: "120.000",
        lengthUnit: "mm",
        heatNumber: "",
        sortOrder: 1,
      },
    ],
  };

  const csv = buildTrameadoCsv(sheet);
  const lines = csv.split("\r\n");

  assert(lines.length === 3, "CSV should contain header and two rows");
  assert(
    lines[0] === "ISO,CLASE,Nº,Ø,SCH.,PALILLO,COLADA",
    "CSV header should match client columns",
  );

  const sorted = sortTrameadoExportSegments(sheet.segments);
  assert(sorted[0]?.segmentNumber === "1", "Segments should sort by sortOrder");

  const firstRow = lines[1] ?? "";
  assert(firstRow.includes("<1>"), "First row should use visible segment label");
  assert(firstRow.includes("120"), "First row should include palillo length");

  const secondRow = lines[2] ?? "";
  assert(
    secondRow.includes("'-C-123") || secondRow.includes("\"'-C-123\""),
    "Formula-risk COLADA values should be escaped for Excel",
  );

  assert(
    formatTrameadoExportSegmentNumber({
      segmentNumber: "3",
      segmentLabel: null,
    }) === "<3>",
    "Export segment number should use angle brackets when no label",
  );

  assert(
    buildTrameadoCsvFileName("HL-1291-A012AA-N-01", "DWG-001") ===
      "trameado-DWG-001-HL-1291-A012AA-N-01.csv",
    "CSV file name should include drawing and line identifiers",
  );

  assert(
    buildTrameadoCsvExportPath("sheet-123") ===
      "/api/files/trameado/sheet-123/csv",
    "CSV export path should match API route",
  );

  const buffer = buildTrameadoCsvDownloadBuffer(csv);
  assert(
    buffer.subarray(0, 3).equals(Buffer.from("\uFEFF", "utf-8")),
    "CSV download buffer should include UTF-8 BOM for Excel",
  );
}

function main(): void {
  verifyFormatHelpers();
  verifySheetValidation();
  verifySegmentValidation();
  verifyExportLabels();
  verifyCsvExport();
  console.log("verify-trameado-model: all checks passed");
}

main();
