const CSV_FORMULA_PREFIX_PATTERN = /^[=+@-]/;
const CSV_EXPORT_INJECTION_PATTERN = /^[=+@\t\r]/;

export function hasCsvFormulaInjectionRisk(value: string): boolean {
  return CSV_FORMULA_PREFIX_PATTERN.test(value.trim());
}

export function protectCsvExportCell(value: string): string {
  const trimmed = value.trimStart();

  if (CSV_EXPORT_INJECTION_PATTERN.test(trimmed) || trimmed.startsWith("-")) {
    return `'${value}`;
  }

  return value;
}

export function normalizeCsvImportTextField(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("'")) {
    return trimmed.slice(1).trim();
  }

  return trimmed;
}
