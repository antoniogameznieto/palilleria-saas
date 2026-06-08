import { z } from "zod";

const optionalTextField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
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
    (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
    "La cantidad debe ser mayor que 0.",
  );

export const takeoffItemFormSchema = z.object({
  reference: optionalTextField(100),
  description: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria.")
    .max(500, "Máximo 500 caracteres."),
  quantity: requiredQuantityField,
  unit: optionalTextField(50),
  length: optionalDecimalField,
  width: optionalDecimalField,
  height: optionalDecimalField,
  notes: optionalTextField(1000),
});

export type TakeoffItemFormInput = z.infer<typeof takeoffItemFormSchema>;
