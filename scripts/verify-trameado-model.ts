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
}

function main(): void {
  verifyFormatHelpers();
  verifySheetValidation();
  verifySegmentValidation();
  verifyExportLabels();
  console.log("verify-trameado-model: all checks passed");
}

main();
