import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";

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
  DEFAULT_PRIMARY_CANDIDATE_DIMENSIONS,
  extractCandidateDimensionsFromText,
  type CandidateDimension,
  type CandidateDimensionsExtractionResult,
} from "../lib/trameado/candidate-dimensions";
import { buildTrameadoSegmentSuggestions } from "../lib/trameado/segment-suggestions";
import {
  buildTrameadoPdfAnnotationSummary,
  createPointAnnotation,
  createRectAnnotation,
  isValidRelativeCoordinate,
  removeAnnotationForSegment,
  upsertAnnotationForSegment,
} from "../lib/trameado/pdf-annotations";
import {
  buildMarkedTrameadoPdf,
  buildTrameadoMarkedPdfExportPath,
  buildTrameadoMarkedPdfFileName,
  canExportMarkedTrameadoPdf,
  isAnnotationOnValidPage,
  mapRelativeViewerRectToPdf,
  mapRelativeViewerYToPdfY,
  MARKED_PDF_MIN_SIZES,
  resolveMarkedPdfRenderStyle,
} from "../lib/trameado/export-marked-pdf";
import {
  buildTrameadoDeliveryPackage,
  buildTrameadoPackageExportPath,
  buildTrameadoPackageFileName,
  buildTrameadoValidationSummaryText,
  canExportTrameadoPackage,
  TRAMEADO_PACKAGE_MARKED_PDF_ENTRY,
  TRAMEADO_PACKAGE_SUMMARY_JSON_ENTRY,
  TRAMEADO_PACKAGE_SUMMARY_TXT_ENTRY,
  TRAMEADO_PACKAGE_XLSX_ENTRY,
} from "../lib/trameado/export-package";
import { buildTrameadoWizardState } from "../lib/trameado/wizard-state";
import JSZip from "jszip";
import { validateTrameadoSheet } from "../lib/trameado/sheet-validation";
import {
  parseTrameadoAnnotationFormData,
  trameadoAnnotationFormSchema,
} from "../lib/validations/trameado";
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
4" FIGURA 8 150# RF AC A-516 60
PARA CONT. VER LINEA NUM.
2301GB47G-C1-4"-HL-1291-A012AA-N
PLANO Nº: 2301GB47G-C1-L-HL-1291-01
ORIENTACION 45
44.99
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

const SAMPLE_HL_1291_01_NOISE_TEXT = `
2301GB47G-C1-L-HL-1291-01
PRESIÓN DISEÑO kg/cm g
13.00
17.60
51.0
79.0
ORIENTACION 45
44.99
PLANO Nº: 2301GB47G-C1-L-KP-1290-01
1290
1291
297
235
129
150
4" FIGURA 8 150# RF AC A-516 60
`.trim();

function verifyCandidateDimensions(): void {
  const result = extractCandidateDimensionsFromText(SAMPLE_HL_1291_02_TEXT, {
    fileName: "2301GB47G-C1-L-HL-1291-02.pdf",
    drawingNumber: "2301GB47G-C1-L-HL-1291-02",
    lineNumber: "HL-1291-A012AA-N-02",
  });

  const values = result.candidates.map((candidate) => candidate.value);
  const allVisible = [...result.candidates, ...result.additionalCandidates].map(
    (candidate) => candidate.value,
  );

  assert(result.hasEmbeddedText, "Sample HL-1291-02 text should be embedded");
  assert(values.includes(120), "Should detect 120 as primary candidate");
  assert(allVisible.includes(193), "Should detect 193 as ranked candidate");
  assert(allVisible.includes(361), "Should detect 361 as ranked candidate");
  assert(allVisible.includes(100), "Should detect 100 as ranked candidate");
  assert(result.candidates[0]?.score >= (result.candidates[1]?.score ?? 0), "Primary list should be score-sorted");
  assert(
    values.indexOf(120) < values.indexOf(68),
    "120 should rank before shorter/atypical 68 in primary list",
  );
  assert(
    result.candidates.every((candidate) => candidate.score >= 15),
    "Primary candidates should meet minimum score threshold",
  );
  assert(
    result.candidates.every((candidate) => candidate.reasons.length > 0),
    "Candidates should include scoring reasons",
  );
  assert(!allVisible.includes(1000027194), "Should exclude SAP codes");
  assert(!allVisible.includes(2025), "Should exclude revision year noise");
  assert(!allVisible.includes(13), "Should exclude design pressure 13");
  assert(!allVisible.includes(17.6), "Should exclude design block 17.6");
  assert(!allVisible.includes(51), "Should exclude design pressure 51");
  assert(!allVisible.includes(79), "Should exclude design temperature 79");
  assert(!allVisible.includes(1179904), "Should exclude UTM coordinate values");
  assert(!allVisible.includes(1291), "Should exclude HL line number as noise");
  assert(!allVisible.includes(3000), "Should exclude 3000# accessory rating");
  assert(!allVisible.includes(90), "Should exclude bolt length from espárrago line");
  assert(!allVisible.includes(45), "Should exclude orientation 45");
  assert(!allVisible.includes(44.99), "Should exclude orientation 44.99");
  assert(!allVisible.includes(150), "Should exclude 150# flange rating context");

  const longPlan = extractCandidateDimensionsFromText(SAMPLE_HL_1291_01_NOISE_TEXT, {
    fileName: "2301GB47G-C1-L-HL-1291-01.pdf",
    drawingNumber: "2301GB47G-C1-L-HL-1291-01",
    lineNumber: "HL-1291-A012AA-N-01",
  });
  const longValues = [...longPlan.candidates, ...longPlan.additionalCandidates].map(
    (candidate) => candidate.value,
  );

  assert(!longValues.includes(1290), "Should exclude KP/plan reference 1290");
  assert(!longValues.includes(1291), "Should exclude HL line reference 1291");
  assert(!longValues.includes(45), "Should exclude orientation on long iso");
  assert(longValues.includes(297) || longValues.includes(235), "Should keep drawing dimensions on long iso");

  const limited = extractCandidateDimensionsFromText(SAMPLE_HL_1291_02_TEXT, {
    maxCandidates: 3,
    primaryCandidateLimit: 3,
  });
  assert(
    limited.candidates.length + limited.additionalCandidates.length <= 3,
    "maxCandidates should cap ranked candidate dimensions",
  );
  assert(
    limited.warnings.some((warning) => warning.includes("3 cotas mejor puntuadas")),
    "maxCandidates cap should add a warning",
  );

  const empty = extractCandidateDimensionsFromText("");
  assert(empty.candidates.length === 0, "Empty text should yield no candidates");
  assert(empty.additionalCandidates.length === 0, "Empty text should yield no overflow");
  assert(empty.insufficientText, "Empty text should flag insufficient text");

  assert(
    DEFAULT_MAX_CANDIDATE_DIMENSIONS >= 10,
    "Default candidate limit should allow a useful panel size",
  );
  assert(
    DEFAULT_PRIMARY_CANDIDATE_DIMENSIONS >= 8,
    "Default primary candidate limit should keep panel focused",
  );
}

function mockCandidateDimension(
  value: number,
  confidence: CandidateDimension["confidence"],
  score: number,
): CandidateDimension {
  return {
    value,
    displayValue: String(value),
    raw: String(value),
    score,
    category: "drawing_dimension",
    reason: "Cota candidata en rango de dibujo",
    reasons: ["test"],
    confidence,
    contextSnippet: null,
    warnings: [],
  };
}

function mockCandidateDimensionsResult(
  candidates: CandidateDimension[],
): CandidateDimensionsExtractionResult {
  return {
    candidates,
    additionalCandidates: [],
    totalRankedCount: candidates.length,
    embeddedTextLength: 1000,
    hasEmbeddedText: true,
    insufficientText: false,
    overallConfidence: "high",
    warnings: [],
  };
}

function verifySegmentSuggestions(): void {
  const shortIsoCandidates = mockCandidateDimensionsResult([
    mockCandidateDimension(170, "high", 110),
    mockCandidateDimension(100, "high", 105),
    mockCandidateDimension(120, "high", 100),
  ]);

  const shortIso = buildTrameadoSegmentSuggestions({
    candidateDimensions: shortIsoCandidates,
    existingSegments: [],
    sheetDefaults: { diameter: '3/4"', schedule: "80" },
    options: {
      drawingNumber: "2301GB47G-C1-L-HL-1289-02",
      fileName: "2301GB47G-C1-L-HL-1289-02.pdf",
      hasActiveSheet: true,
    },
  });

  assert(shortIso.mode === "short_iso", "1289-02-like should use short iso mode");
  assert(shortIso.suggestions.length === 3, "1289-02-like should suggest 3 tramos");
  assert(
    shortIso.suggestions.map((suggestion) => suggestion.palilloLength).join(",") ===
      "170,100,120",
    "1289-02-like should suggest golden lengths in score order",
  );
  assert(
    shortIso.suggestions.map((suggestion) => suggestion.suggestedNumber).join(",") ===
      "1,2,3",
    "Suggestions should start at segment number 1",
  );
  assert(
    shortIso.suggestions.every((suggestion) => suggestion.diameter === '3/4"'),
    "Suggestions should inherit sheet defaults",
  );
  assert(
    shortIso.suggestions.every((suggestion) => suggestion.confidence === "high"),
    "Golden short-iso lengths should use alta confianza",
  );
  assert(
    shortIso.suggestions.every(
      (suggestion) => suggestion.suggestedLabel === `<${suggestion.suggestedNumber}>`,
    ),
    "Suggested label should stay bracketed for persistence",
  );

  const mixedShortIso = mockCandidateDimensionsResult([
    mockCandidateDimension(339, "high", 115),
    mockCandidateDimension(85, "high", 108),
    mockCandidateDimension(170, "high", 110),
    mockCandidateDimension(100, "high", 105),
    mockCandidateDimension(120, "high", 100),
  ]);

  const mixed = buildTrameadoSegmentSuggestions({
    candidateDimensions: mixedShortIso,
    existingSegments: [],
    options: {
      drawingNumber: "2301GB47G-C1-L-HL-1289-02",
      fileName: "2301GB47G-C1-L-HL-1289-02.pdf",
      hasActiveSheet: true,
    },
  });

  assert(
    mixed.suggestions.find((suggestion) => suggestion.palilloLength === "100")
      ?.confidence === "high",
    "100 mm golden length should stay alta confianza",
  );
  assert(
    mixed.suggestions.find((suggestion) => suggestion.palilloLength === "120")
      ?.confidence === "high",
    "120 mm golden length should stay alta confianza",
  );
  assert(
    mixed.suggestions.find((suggestion) => suggestion.palilloLength === "170")
      ?.confidence === "high",
    "170 mm golden length should stay alta confianza",
  );
  assert(
    mixed.suggestions.find((suggestion) => suggestion.palilloLength === "85")
      ?.confidence === "medium",
    "85 mm should be revisar, not alta confianza",
  );
  assert(
    mixed.suggestions.find((suggestion) => suggestion.palilloLength === "339")
      ?.confidence === "medium",
    "339 mm should be revisar when evidence is generic",
  );

  const withExisting = buildTrameadoSegmentSuggestions({
    candidateDimensions: shortIsoCandidates,
    existingSegments: [
      {
        segmentNumber: "1",
        palilloLength: "170",
        lengthUnit: "mm",
      },
    ],
    options: {
      drawingNumber: "2301GB47G-C1-L-HL-1289-02",
      hasActiveSheet: true,
    },
  });

  assert(
    withExisting.suggestions.length === 2,
    "Should skip palillo length already on sheet",
  );
  assert(
    withExisting.suggestions[0]?.suggestedNumber === "2",
    "Next suggestion should continue numbering after existing segments",
  );
  assert(
    !withExisting.suggestions.some(
      (suggestion) => suggestion.palilloLength === "170",
    ),
    "Should not duplicate existing palillo length",
  );

  const longIsoMany = mockCandidateDimensionsResult(
    Array.from({ length: 10 }, (_, index) =>
      mockCandidateDimension(100 + index * 10, "high", 90 - index),
    ),
  );

  const longPlan = buildTrameadoSegmentSuggestions({
    candidateDimensions: longIsoMany,
    existingSegments: [],
    options: {
      drawingNumber: "2301GB47G-C1-L-HL-1291-01",
      fileName: "2301GB47G-C1-L-HL-1291-01.pdf",
      hasActiveSheet: true,
    },
  });

  assert(
    longPlan.mode === "unreliable",
    "Long -01 with many candidates should be unreliable",
  );
  assert(
    longPlan.suggestions.length === 0,
    "Long -01 with many candidates should not flood suggestions",
  );

  const lowOnly = buildTrameadoSegmentSuggestions({
    candidateDimensions: mockCandidateDimensionsResult([
      mockCandidateDimension(42, "low", 20),
    ]),
    existingSegments: [],
    options: {
      drawingNumber: "2301GB47G-C1-L-HL-1289-02",
      hasActiveSheet: true,
    },
  });

  assert(
    lowOnly.suggestions.length === 0,
    "Low confidence candidates should not produce suggestions",
  );

  const capped = buildTrameadoSegmentSuggestions({
    candidateDimensions: shortIsoCandidates,
    existingSegments: [],
    options: {
      drawingNumber: "2301GB47G-C1-L-HL-1289-02",
      maxSuggestions: 2,
      hasActiveSheet: true,
    },
  });

  assert(capped.suggestions.length === 2, "maxSuggestions should cap suggestions");

  const noSheet = buildTrameadoSegmentSuggestions({
    candidateDimensions: shortIsoCandidates,
    existingSegments: [],
    options: { hasActiveSheet: false },
  });

  assert(noSheet.mode === "no_sheet", "Without sheet should return no_sheet mode");
  assert(noSheet.suggestions.length === 0, "Without sheet should not suggest tramos");

  const fromExtracted = extractCandidateDimensionsFromText(SAMPLE_HL_1291_02_TEXT, {
    fileName: "2301GB47G-C1-L-HL-1291-02.pdf",
    drawingNumber: "2301GB47G-C1-L-HL-1291-02",
    lineNumber: "HL-1291-A012AA-N-02",
  });

  const extractedSuggestions = buildTrameadoSegmentSuggestions({
    candidateDimensions: fromExtracted,
    existingSegments: [],
    sheetDefaults: { diameter: '3/4"', schedule: "80" },
    options: {
      drawingNumber: "2301GB47G-C1-L-HL-1291-02",
      fileName: "2301GB47G-C1-L-HL-1291-02.pdf",
      hasActiveSheet: true,
    },
  });

  assert(
    extractedSuggestions.suggestions.length >= 2,
    "HL-1291-02 extracted candidates should yield short-iso suggestions",
  );
  assert(
    extractedSuggestions.suggestions.some(
      (suggestion) => suggestion.palilloLength === "100",
    ),
    "HL-1291-02 should suggest 100 mm",
  );
  assert(
    extractedSuggestions.suggestions.some(
      (suggestion) => suggestion.palilloLength === "120",
    ),
    "HL-1291-02 should suggest 120 mm",
  );
  assert(
    extractedSuggestions.suggestions.find(
      (suggestion) => suggestion.palilloLength === "100",
    )?.confidence === "high",
    "HL-1291-02 should mark 100 mm as alta confianza",
  );
  assert(
    extractedSuggestions.suggestions.find(
      (suggestion) => suggestion.palilloLength === "120",
    )?.confidence === "high",
    "HL-1291-02 should mark 120 mm as alta confianza",
  );

  const nonGolden = extractedSuggestions.suggestions.filter((suggestion) =>
    ["193", "361"].includes(suggestion.palilloLength),
  );

  assert(
    nonGolden.length === 0 ||
      nonGolden.every((suggestion) => suggestion.confidence === "medium"),
    "HL-1291-02 non-golden lengths like 193/361 should be revisar",
  );
}

function verifyTrameadoSheetValidation(): void {
  const noSheet = validateTrameadoSheet({
    hasActiveSheet: false,
    segments: [],
  });

  assert(noSheet.status === "no_data", "Without sheet should be no_data");

  const incomplete = validateTrameadoSheet({
    hasActiveSheet: true,
    segments: [],
    takeoffItems: [
      {
        description: '1 4" TUBERIA A106 Gr.B SCH 40',
        quantity: "1.0",
        unit: "M",
      },
    ],
  });

  assert(incomplete.status === "incomplete", "Empty sheet should be incomplete");

  const noReference = validateTrameadoSheet({
    hasActiveSheet: true,
    segments: [{ segmentNumber: "1", palilloLength: "100" }],
    takeoffItems: [
      {
        description: "BRIDA 150# RF",
        quantity: "2",
        unit: "UD",
      },
    ],
  });

  assert(
    noReference.status === "no_comparable",
    "Segments without pipe BOM reference should be no_comparable",
  );

  const invalidPalillo = validateTrameadoSheet({
    hasActiveSheet: true,
    segments: [
      { segmentNumber: "1", palilloLength: "abc" },
      { segmentNumber: "2", palilloLength: "100" },
    ],
    takeoffItems: [
      {
        description: '1 4" TUBERIA A106 Gr.B SCH 40',
        quantity: "1.0",
        unit: "M",
      },
    ],
  });

  assert(
    invalidPalillo.status === "review_data",
    "Invalid PALILLO should trigger review_data",
  );

  const duplicateNumbers = validateTrameadoSheet({
    hasActiveSheet: true,
    segments: [
      { segmentNumber: "1", palilloLength: "100" },
      { segmentNumber: "<1>", palilloLength: "120" },
    ],
    takeoffItems: [
      {
        description: '1 4" TUBERIA A106 Gr.B SCH 40',
        quantity: "1.0",
        unit: "M",
      },
    ],
  });

  assert(
    duplicateNumbers.status === "review_data",
    "Duplicate segment numbers should trigger review_data",
  );

  const reasonable = validateTrameadoSheet({
    hasActiveSheet: true,
    segments: [{ segmentNumber: "1", palilloLength: "1000" }],
    takeoffItems: [
      {
        description: '1 4" TUBERIA A106 Gr.B SCH 40',
        quantity: "1.0",
        unit: "M",
      },
    ],
  });

  assert(reasonable.status === "reasonable", "1000 mm vs 1.0 m should be reasonable");
  assert(reasonable.deltaPct === 0, "Exact match should have 0% delta");

  const reviewDelta = validateTrameadoSheet({
    hasActiveSheet: true,
    segments: [{ segmentNumber: "1", palilloLength: "850" }],
    takeoffItems: [
      {
        description: '1 4" TUBERIA A106 Gr.B SCH 40',
        quantity: "1.0",
        unit: "M",
      },
    ],
  });

  assert(
    reviewDelta.status === "review_delta",
    "850 mm vs 1.0 m should be review_delta",
  );

  const reviewHigh = validateTrameadoSheet({
    hasActiveSheet: true,
    segments: [{ segmentNumber: "1", palilloLength: "100" }],
    takeoffItems: [
      {
        description: '1 4" TUBERIA A106 Gr.B SCH 40',
        quantity: "1.0",
        unit: "M",
      },
    ],
  });

  assert(
    reviewHigh.status === "review_delta_high",
    "100 mm vs 1.0 m should be review_delta_high",
  );
}

function verifyTrameadoAnnotationValidation(): void {
  const point = trameadoAnnotationFormSchema.safeParse({
    type: "point",
    pageNumber: 1,
    x: 0.4,
    y: 0.6,
  });

  assert(point.success, "Valid point annotation should pass validation");

  const outOfRange = trameadoAnnotationFormSchema.safeParse({
    type: "point",
    pageNumber: 1,
    x: 1.2,
    y: 0.5,
  });

  assert(!outOfRange.success, "Out-of-range coordinates should be rejected");

  const rectWithoutSize = trameadoAnnotationFormSchema.safeParse({
    type: "rect",
    pageNumber: 1,
    x: 0.1,
    y: 0.1,
    width: 0.005,
    height: 0.02,
  });

  assert(!rectWithoutSize.success, "Rect smaller than minimum should be rejected");

  const validRect = trameadoAnnotationFormSchema.safeParse({
    type: "rect",
    pageNumber: 1,
    x: 0.1,
    y: 0.1,
    width: 0.2,
    height: 0.15,
  });

  assert(validRect.success, "Valid rect annotation should pass validation");

  const formData = new FormData();
  formData.append("type", "point");
  formData.append("pageNumber", "1");
  formData.append("x", "0.5");
  formData.append("y", "0.5");

  const parsedForm = parseTrameadoAnnotationFormData(formData);
  assert(parsedForm.success, "FormData parser should accept valid point");
}

function verifyPdfAnnotations(): void {
  assert(isValidRelativeCoordinate(0.5), "0.5 should be valid relative coordinate");
  assert(!isValidRelativeCoordinate(1.2), "1.2 should be invalid relative coordinate");

  const segment = {
    id: "seg-1",
    segmentNumber: "1",
    segmentLabel: "<1>",
    palilloLength: "100",
  };

  const point = createPointAnnotation({
    segment,
    x: 0.4,
    y: 0.6,
  });

  assert(point.type === "point", "Should create point annotation");
  assert(point.segmentLabel === "1", "Annotation label should normalize segment number");

  const invalidRect = createRectAnnotation({
    segment,
    x: 0.1,
    y: 0.1,
    width: 0.005,
    height: 0.02,
  });

  assert(invalidRect === null, "Tiny rect should be rejected");

  const annotations = upsertAnnotationForSegment([], point);
  const summary = buildTrameadoPdfAnnotationSummary([segment], annotations);

  assert(summary.markedCount === 1, "Summary should count one marked segment");
  assert(summary.totalCount === 1, "Summary should count one total segment");

  const cleared = removeAnnotationForSegment(annotations, segment.id);
  const emptySummary = buildTrameadoPdfAnnotationSummary([segment], cleared);

  assert(emptySummary.markedCount === 0, "Removing annotation should clear marked count");
}

async function verifyMarkedPdfExport(): Promise<void> {
  const blankDoc = await PDFDocument.create();
  blankDoc.addPage([600, 400]);
  const blankBuffer = Buffer.from(await blankDoc.save());

  assert(!canExportMarkedTrameadoPdf(0), "Marked PDF export should require annotations");
  assert(canExportMarkedTrameadoPdf(1), "Marked PDF export should be allowed with marks");

  const pageHeight = 400;
  assert(
    Math.abs(mapRelativeViewerYToPdfY(0, pageHeight) - pageHeight) < 0.001,
    "Top relative Y should map to PDF top",
  );
  assert(
    Math.abs(mapRelativeViewerYToPdfY(1, pageHeight)) < 0.001,
    "Bottom relative Y should map to PDF bottom",
  );

  const rect = mapRelativeViewerRectToPdf(0.1, 0.2, 0.3, 0.15, 600, 400);
  assert(rect.width === 180, "Rect width should scale with page width");
  assert(rect.height === 60, "Rect height should scale with page height");

  assert(!isAnnotationOnValidPage(0, 1), "Page 0 should be invalid");
  assert(!isAnnotationOnValidPage(2, 1), "Page 2 should be invalid on single-page PDF");
  assert(isAnnotationOnValidPage(1, 1), "Page 1 should be valid");

  const smallPageStyle = resolveMarkedPdfRenderStyle(200, 150);
  assert(
    smallPageStyle.pointRadius >= MARKED_PDF_MIN_SIZES.pointRadius,
    "Point radius should respect readability minimum",
  );
  assert(
    smallPageStyle.labelFontSize >= MARKED_PDF_MIN_SIZES.labelFontSize,
    "Label font size should respect readability minimum",
  );

  const largePageStyle = resolveMarkedPdfRenderStyle(2400, 1700);
  assert(
    largePageStyle.labelFontSize > MARKED_PDF_MIN_SIZES.labelFontSize,
    "Large pages should scale label size up",
  );

  const pointPdf = await buildMarkedTrameadoPdf({
    pdfBuffer: blankBuffer,
    sheetLabel: "HL-TEST",
    annotations: [
      {
        segmentLabel: "1",
        pageNumber: 1,
        type: "point",
        x: 0.5,
        y: 0.5,
      },
    ],
  });
  assert(pointPdf.length > blankBuffer.length, "Point mark should produce non-empty PDF");

  const rectPdf = await buildMarkedTrameadoPdf({
    pdfBuffer: blankBuffer,
    annotations: [
      {
        segmentLabel: "2",
        pageNumber: 1,
        type: "rect",
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.15,
      },
    ],
  });
  assert(rectPdf.length > blankBuffer.length, "Rect mark should produce non-empty PDF");

  const skippedInvalidPage = await buildMarkedTrameadoPdf({
    pdfBuffer: blankBuffer,
    annotations: [
      {
        segmentLabel: "9",
        pageNumber: 99,
        type: "point",
        x: 0.5,
        y: 0.5,
      },
    ],
  });
  assert(
    skippedInvalidPage.length > 0,
    "Out-of-page annotations should be ignored without failing export",
  );

  assert(
    buildTrameadoMarkedPdfExportPath("sheet-1") ===
      "/api/files/trameado/sheet-1/marked-pdf",
    "Marked PDF export path should match API route",
  );
  assert(
    buildTrameadoMarkedPdfFileName("HL-1289-02", "DWG-001") ===
      "trameado-DWG-001-HL-1289-02.pdf",
    "Marked PDF file name should include drawing and line identifiers",
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

function verifyTrameadoWizardState(): void {
  const noSheet = buildTrameadoWizardState({
    hasSheet: false,
    segmentSuggestions: {
      suggestions: [],
      mode: "no_sheet",
      warnings: [],
    },
    confirmedSegmentsCount: 0,
    annotationSummary: { markedCount: 0, totalCount: 0, items: [] },
    validation: validateTrameadoSheet({ hasActiveSheet: false, segments: [] }),
    segments: [],
  });

  assert(noSheet.currentStep === "prepare_sheet", "Wizard should start at prepare sheet");
  assert(!noSheet.hasSheet, "Wizard should report no sheet");
  assert(!noSheet.canExportPackage, "Wizard should not allow package without segments");

  const withSegments = buildTrameadoWizardState({
    hasSheet: true,
    segmentSuggestions: {
      suggestions: [
        {
          suggestionKey: "s1",
          suggestedNumber: "2",
          suggestedLabel: "<2>",
          palilloLength: "100",
          displayPalilloLength: "100",
          confidence: "high",
          score: 100,
          sourceCandidateDimension: 100,
          reason: "test",
          notes: "",
          diameter: '3/4"',
          schedule: "80",
          heatNumber: "",
          alreadyOnSheet: true,
        },
      ],
      mode: "short_iso",
      warnings: [],
    },
    confirmedSegmentsCount: 3,
    annotationSummary: {
      markedCount: 2,
      totalCount: 3,
      items: [
        {
          segmentId: "s1",
          segmentNumber: "2",
          segmentLabel: "2",
          palilloLength: "100",
          marked: true,
        },
        {
          segmentId: "s2",
          segmentNumber: "4",
          segmentLabel: "4",
          palilloLength: "120",
          marked: true,
        },
        {
          segmentId: "s3",
          segmentNumber: "6",
          segmentLabel: "6",
          palilloLength: "170",
          marked: false,
        },
      ],
    },
    validation: validateTrameadoSheet({
      hasActiveSheet: true,
      segments: [
        { segmentNumber: "2", palilloLength: "100" },
        { segmentNumber: "4", palilloLength: "120" },
        { segmentNumber: "6", palilloLength: "170" },
      ],
      takeoffItems: [
        {
          description: '1 3/4" TUBERIA A106 Gr.B SCH 80',
          quantity: "0.4",
          unit: "M",
        },
      ],
    }),
    segments: [
      { id: "s1", segmentLabel: "<2>", segmentNumber: "2" },
      { id: "s2", segmentLabel: "<4>", segmentNumber: "4" },
      { id: "s3", segmentLabel: "<6>", segmentNumber: "6" },
    ],
  });

  assert(withSegments.canExportPackage, "Wizard should allow package with segments");
  assert(
    withSegments.steps.mark_isometric === "in_progress",
    "Wizard should be in progress on marks when 2/3",
  );
  assert(
    withSegments.unmarkedSegments.length === 1,
    "Wizard should list one unmarked segment",
  );
  assert(
    withSegments.checklist.length === 6,
    "Wizard checklist should have six items",
  );
}

async function verifyTrameadoPackageExport(): Promise<void> {
  assert(!canExportTrameadoPackage(0), "Package export should require segments");
  assert(canExportTrameadoPackage(1), "Package export should be allowed with segments");

  assert(
    buildTrameadoPackageFileName("HL-1289-A010AA-N-02") ===
      "trameado-paquete-HL-1289-A010AA-N-02.zip",
    "Package file name should sanitize line identifier",
  );
  assert(
    buildTrameadoPackageFileName("", "2301GB47G/C1") ===
      "trameado-paquete-2301GB47G-C1.zip",
    "Package file name should fall back to drawing number",
  );
  assert(
    !buildTrameadoPackageFileName("HL/01").includes("/"),
    "Package file name should not contain path separators",
  );

  assert(
    buildTrameadoPackageExportPath("sheet-42") ===
      "/api/files/trameado/sheet-42/package",
    "Package export path should match API route",
  );

  const validation = validateTrameadoSheet({
    hasActiveSheet: true,
    segments: [
      { segmentNumber: "1", palilloLength: "130" },
      { segmentNumber: "2", palilloLength: "260" },
    ],
    takeoffItems: [
      {
        description: '2 4" TUBERIA A106 Gr.B SCH 40',
        quantity: "0.4",
        unit: "M",
      },
    ],
  });

  const summaryText = buildTrameadoValidationSummaryText({
    generatedAt: new Date("2026-06-10T10:30:00.000Z"),
    sheetLineIdentifier: "HL-1289-A010AA-N-02",
    drawingNumber: "2301GB47G-C1-L-HL-1289-02",
    validation,
    markedCount: 2,
    totalSegmentCount: 2,
    includesMarkedPdf: true,
  });

  assert(summaryText.includes("Paquete de trameado"), "Summary should include title");
  assert(
    summaryText.includes("HL-1289-A010AA-N-02"),
    "Summary should include sheet line identifier",
  );
  assert(
    summaryText.includes("2301GB47G-C1-L-HL-1289-02"),
    "Summary should include drawing number",
  );
  assert(
    summaryText.includes(`Tramos confirmados: ${validation.confirmedSegmentCount}`),
    "Summary should include confirmed segment count",
  );
  assert(summaryText.includes("Total PALILLO:"), "Summary should include PALILLO total");
  assert(summaryText.includes("Tramos marcados: 2/2"), "Summary should include marked ratio");
  assert(
    summaryText.includes("Validación orientativa"),
    "Summary should include disclaimer",
  );

  const xlsxBuffer = await buildTrameadoXlsxBuffer(buildSampleExportSheet());
  const zipBuffer = await buildTrameadoDeliveryPackage({
    xlsxBuffer,
    markedPdfBuffer: null,
    summary: {
      generatedAt: new Date("2026-06-10T10:30:00.000Z"),
      sheetLineIdentifier: "HL-1289-A010AA-N-02",
      drawingNumber: "2301GB47G-C1-L-HL-1289-02",
      validation,
      markedCount: 0,
      totalSegmentCount: 2,
      includesMarkedPdf: false,
    },
  });

  assert(zipBuffer.length > 0, "Package ZIP buffer should not be empty");

  const zip = await JSZip.loadAsync(zipBuffer);
  assert(
    zip.file(TRAMEADO_PACKAGE_XLSX_ENTRY) !== null,
    "Package ZIP should include XLSX entry",
  );
  assert(
    zip.file(TRAMEADO_PACKAGE_MARKED_PDF_ENTRY) === null,
    "Package ZIP should omit marked PDF when no marks",
  );
  assert(
    zip.file(TRAMEADO_PACKAGE_SUMMARY_TXT_ENTRY) !== null,
    "Package ZIP should include validation summary text",
  );
  assert(
    zip.file(TRAMEADO_PACKAGE_SUMMARY_JSON_ENTRY) !== null,
    "Package ZIP should include validation summary JSON",
  );

  const txtEntry = await zip.file(TRAMEADO_PACKAGE_SUMMARY_TXT_ENTRY)!.async("string");
  assert(
    txtEntry.includes("No se incluye PDF marcado porque no hay tramos marcados."),
    "Summary text should note missing marked PDF",
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
  verifySegmentSuggestions();
  verifyTrameadoSheetValidation();
  verifyPdfAnnotations();
  verifyTrameadoAnnotationValidation();
  verifyTrameadoWizardState();
  await verifyMarkedPdfExport();
  await verifyXlsxExport();
  await verifyTrameadoPackageExport();
  console.log("verify-trameado-model: all checks passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
