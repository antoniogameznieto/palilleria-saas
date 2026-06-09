import ExcelJS from "exceljs";

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
  buildTrameadoXlsxBuffer,
  buildTrameadoXlsxExportPath,
  buildTrameadoXlsxFileName,
  TRAMEADO_XLSX_CONTENT_TYPE,
  TRAMEADO_XLSX_HEADERS,
  TRAMEADO_XLSX_SHEET_NAME,
} from "../lib/trameado/export-xlsx";
import {
  buildTrameadoSheetSuggestions,
  dedupeTrameadoSheetSuggestions,
  deriveLineClassFromIdentifier,
  detectDiameterFromText,
  detectScheduleFromText,
  getCreatableTrameadoSheetSuggestions,
} from "../lib/trameado/suggestions";
import {
  DEFAULT_MAX_CANDIDATE_DIMENSIONS,
  extractCandidateDimensionsFromText,
} from "../lib/trameado/candidate-dimensions";
import {
  calculateTrameadoTotals,
  formatTrameadoSegmentDisplayLabel,
  formatTrameadoSheetSummary,
  getNextSegmentNumber,
  sortTrameadoSegmentsForDisplay,
} from "../lib/trameado/segment-helpers";
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

function verifySegmentHelpers(): void {
  const segments = [
    { segmentNumber: "3", segmentLabel: null, sortOrder: 3, palilloLength: "100" },
    { segmentNumber: "1", segmentLabel: "Tramo A", sortOrder: 1, palilloLength: "363" },
    { segmentNumber: "2", segmentLabel: null, sortOrder: 2, palilloLength: "120" },
  ];

  assert(getNextSegmentNumber(segments) === "4", "Next segment should be max + 1");

  const sorted = sortTrameadoSegmentsForDisplay(segments);
  assert(sorted[0]?.segmentNumber === "1", "Display order should use sortOrder");

  assert(
    formatTrameadoSegmentDisplayLabel(segments[1]!) === "Tramo A",
    "Custom segment labels should be preserved",
  );
  assert(
    formatTrameadoSegmentDisplayLabel(segments[2]!) === "<2>",
    "Numeric segments should render with angle brackets",
  );

  const totals = calculateTrameadoTotals(segments);
  assert(totals.segmentCount === 3, "Totals should count all segments");
  assert(totals.totalPalilloMm === 583, "Totals should sum valid palillo lengths");

  assert(
    formatTrameadoSheetSummary(segments) === "3 tramos · 583 mm",
    "Sheet summary should format count and mm total",
  );
}

function buildSampleExportSheet() {
  return {
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
}

function verifyCsvExport(): void {
  const sheet = buildSampleExportSheet();

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

function verifySheetSuggestions(): void {
  assert(
    deriveLineClassFromIdentifier("HL-1291-A012AA-N-01") === "A012AA",
    "Line class should derive from HL identifier",
  );

  assert(
    detectDiameterFromText('1 4" TUBERIA A106 Gr.B SCH 40').includes('4"'),
    "Diameter detection should find quoted inch values",
  );

  assert(
    detectScheduleFromText('1 4" TUBERIA A106 Gr.B SCH 40').includes("40"),
    "Schedule detection should find SCH 40",
  );

  const suggestions = buildTrameadoSheetSuggestions({
    drawing: {
      id: "drawing-1",
      drawingNumber: "2301GB47G-C1-L-HL-1291-01",
      lineNumber: "HL-1291-A012AA-N-01",
      revision: "0",
    },
    takeoffItems: [
      {
        description: '1 4" TUBERIA A106 Gr.B SCH 40',
        reference: "1000938243",
        unit: "m",
      },
      {
        description: '1 3/4" TUBERIA A106 Gr.B SCH 80',
        reference: "1000938241",
        unit: "m",
      },
    ],
    existingLineIdentifiers: [],
    relatedDrawings: [
      {
        id: "drawing-2",
        drawingNumber: "2301GB47G-C1-L-HL-1291-02",
        lineNumber: "HL-1291-A012AA-N-02",
        revision: "0",
      },
    ],
  });

  assert(suggestions.length >= 2, "Should suggest primary and pair -02 sheets");
  assert(
    suggestions[0]?.lineIdentifier === "HL-1291-A012AA-N-01",
    "Primary suggestion should use drawing line number",
  );
  assert(
    suggestions[0]?.lineClass === "A012AA",
    "Primary suggestion should include derived line class",
  );
  assert(
    suggestions[0]?.diameter === '4"',
    "Primary suggestion should inherit main pipe diameter",
  );
  assert(
    suggestions.some((suggestion) => suggestion.lineIdentifier.endsWith("-02")),
    "Should include -02 pair suggestion when related drawing exists",
  );

  const deduped = dedupeTrameadoSheetSuggestions([
    suggestions[0]!,
    suggestions[0]!,
  ]);
  assert(deduped.length === 1, "Duplicate suggestions should dedupe by ISO");

  const withExisting = buildTrameadoSheetSuggestions({
    drawing: {
      id: "drawing-1",
      drawingNumber: null,
      lineNumber: "HL-1291-A012AA-N-01",
      revision: null,
    },
    takeoffItems: [],
    existingLineIdentifiers: ["HL-1291-A012AA-N-01"],
  });
  assert(
    withExisting[0]?.alreadyExists === true,
    "Existing line identifiers should mark suggestions as already present",
  );
  assert(
    getCreatableTrameadoSheetSuggestions(withExisting).length === 0,
    "Creatable suggestions should exclude existing sheets",
  );
}

const SAMPLE_HL_1291_02_TEXT = `
2301GB47G-C1-L-HL-1291-02
APROBADO PARA CONSTRUCCION 11-03-2025 GRG
PRESIÓN DISEÑO kg/cm g
TEMPERATURA DISEÑO ºC
13.00
17.60
51.0
79.0
A012AA
RELACIÓN DE MATERIALES
1 3/4" SCH 80 TUBERIA AC EXT. PLANOS A-106 B	1000027194	0.4 M
2 3/4" CODO 90 AC SW 3000# A-105	1000039880	1
PARA CONT. VER LINEA NUM.
2301GB47G-C1-4"-HL-1291-A012AA-N
PLANO Nº: 2301GB47G-C1-L-HL-1291-01
120
85
193
68
100
361
E= 1179904
N= 651601
EL=+101500
5/8"x90mm ESPARRAGO+2 TUERCAS A.AL. B7/2H
`.trim();

function verifyCandidateDimensions(): void {
  const result = extractCandidateDimensionsFromText(SAMPLE_HL_1291_02_TEXT, {
    fileName: "2301GB47G-C1-L-HL-1291-02.pdf",
    drawingNumber: "2301GB47G-C1-L-HL-1291-02",
    lineNumber: "HL-1291-A012AA-N-02",
  });

  const values = result.candidates.map((candidate) => candidate.value);

  assert(result.hasEmbeddedText, "Sample HL-1291-02 text should be embedded");
  assert(values.includes(120), "Should detect 120 as candidate dimension");
  assert(values.includes(193), "Should detect 193 as candidate dimension");
  assert(values.includes(361), "Should detect 361 as candidate dimension");
  assert(values.includes(100), "Should detect 100 as candidate dimension");
  assert(!values.includes(1000027194), "Should exclude SAP codes");
  assert(!values.includes(2025), "Should exclude revision year noise");
  assert(!values.includes(51), "Should exclude design pressure 51");
  assert(!values.includes(79), "Should exclude design temperature 79");
  assert(!values.includes(1179904), "Should exclude UTM coordinate values");
  assert(!values.includes(1291), "Should exclude HL line number as noise");
  assert(!values.includes(3000), "Should exclude 3000# accessory rating");
  assert(!values.includes(90), "Should exclude bolt length from espárrago line");

  const limited = extractCandidateDimensionsFromText(SAMPLE_HL_1291_02_TEXT, {
    maxCandidates: 3,
  });
  assert(
    limited.candidates.length === 3,
    "maxCandidates should cap visible candidate dimensions",
  );
  assert(
    limited.warnings.some((warning) => warning.includes("primeras 3")),
    "maxCandidates cap should add a warning",
  );

  const empty = extractCandidateDimensionsFromText("");
  assert(empty.candidates.length === 0, "Empty text should yield no candidates");
  assert(empty.insufficientText, "Empty text should flag insufficient text");

  assert(
    DEFAULT_MAX_CANDIDATE_DIMENSIONS >= 10,
    "Default candidate limit should allow a useful panel size",
  );
}

async function verifyXlsxExport(): Promise<void> {
  const sheet = buildSampleExportSheet();
  const buffer = await buildTrameadoXlsxBuffer(sheet);

  assert(buffer.length > 0, "XLSX buffer should not be empty");

  assert(
    TRAMEADO_XLSX_CONTENT_TYPE ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "XLSX content type constant should match OpenXML spreadsheet MIME",
  );

  assert(
    TRAMEADO_XLSX_HEADERS.join(",") ===
      "ISO,CLASE,Nº,Ø,SCH.,PALILLO,COLADA",
    "XLSX headers should match client column order",
  );

  assert(
    buildTrameadoXlsxFileName("HL-1291-A012AA-N-01", "DWG-001") ===
      "trameado-DWG-001-HL-1291-A012AA-N-01.xlsx",
    "XLSX file name should include drawing and line identifiers",
  );

  assert(
    buildTrameadoXlsxFileName("HL-1291-A012AA-N-01") ===
      "hoja-palilleo-HL-1291-A012AA-N-01.xlsx",
    "XLSX file name should fall back to hoja-palilleo prefix",
  );

  assert(
    buildTrameadoXlsxExportPath("sheet-123") ===
      "/api/files/trameado/sheet-123/xlsx",
    "XLSX export path should match API route",
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0],
  );

  const worksheet = workbook.getWorksheet(TRAMEADO_XLSX_SHEET_NAME);
  assert(worksheet !== undefined, "XLSX workbook should contain palilleo sheet");
  if (!worksheet) {
    return;
  }

  const headerValues = TRAMEADO_XLSX_HEADERS.map(
    (_, index) => worksheet.getRow(1).getCell(index + 1).value,
  );
  assert(
    headerValues.join(",") === TRAMEADO_XLSX_HEADERS.join(","),
    "XLSX header row should match export columns",
  );

  assert(
    worksheet.rowCount === 1 + sheet.segments.length,
    "XLSX should contain header row plus one row per segment",
  );

  const firstDataRow = worksheet.getRow(2);
  assert(
    firstDataRow.getCell(1).value === sheet.lineIdentifier,
    "First data row should repeat ISO on each segment row",
  );
  assert(
    firstDataRow.getCell(3).value === "<1>",
    "First data row should use visible segment label in sortOrder",
  );
  assert(
    firstDataRow.getCell(6).value === 120,
    "PALILLO should export as numeric cell value",
  );

  const secondDataRow = worksheet.getRow(3);
  assert(
    secondDataRow.getCell(7).value === "'-C-123",
    "Formula-risk COLADA values should be protected in XLSX",
  );
}

async function main(): Promise<void> {
  verifyFormatHelpers();
  verifySheetValidation();
  verifySegmentValidation();
  verifyExportLabels();
  verifySegmentHelpers();
  verifyCsvExport();
  verifySheetSuggestions();
  verifyCandidateDimensions();
  await verifyXlsxExport();
  console.log("verify-trameado-model: all checks passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
