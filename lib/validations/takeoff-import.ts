import { z } from "zod";

import { hasCsvFormulaInjectionRisk } from "@/lib/drawings/csv-safety";

const csvFormulaInjectionMessage =
  "El valor no puede empezar por =, +, - o @.";

const rejectCsvFormulaInjection = (value: string) =>
  value.length === 0 || !hasCsvFormulaInjectionRisk(value);

const optionalTextField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(rejectCsvFormulaInjection, csvFormulaInjectionMessage)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const optionalDecimalField = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => value === null || (!Number.isNaN(Number(value)) && Number(value) >= 0),
    "Debe ser un número válido mayor o igual que 0.",
  );

const requiredQuantityField = z
  .string()
  .trim()
  .min(1, "La cantidad es obligatoria.")
  .refine(
    (value) => !Number.isNaN(Number(value)) && Number(value) >= 0,
    "La cantidad debe ser un número mayor o igual que 0.",
  );

export const takeoffCsvImportRowSchema = z.object({
  reference: optionalTextField(100),
  description: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria.")
    .max(500, "Máximo 500 caracteres.")
    .refine(rejectCsvFormulaInjection, csvFormulaInjectionMessage),
  quantity: requiredQuantityField,
  unit: optionalTextField(50),
  length: optionalDecimalField,
  width: optionalDecimalField,
  height: optionalDecimalField,
  notes: optionalTextField(1000),
});

export type TakeoffCsvImportRowInput = z.input<typeof takeoffCsvImportRowSchema>;
export type TakeoffCsvImportRow = z.infer<typeof takeoffCsvImportRowSchema>;

export type TakeoffCsvImportRowError = {
  row: number;
  message: string;
};

export function validateTakeoffCsvImportRows(
  rows: Array<{ csvRowNumber: number; data: TakeoffCsvImportRowInput }>,
): {
  items: Array<{ csvRowNumber: number; data: TakeoffCsvImportRow }>;
  errors: TakeoffCsvImportRowError[];
} {
  const items: Array<{ csvRowNumber: number; data: TakeoffCsvImportRow }> = [];
  const errors: TakeoffCsvImportRowError[] = [];

  for (const row of rows) {
    const parsed = takeoffCsvImportRowSchema.safeParse(row.data);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "La fila no es válida.";

      errors.push({
        row: row.csvRowNumber,
        message,
      });
      continue;
    }

    items.push({
      csvRowNumber: row.csvRowNumber,
      data: parsed.data,
    });
  }

  return { items, errors };
}
