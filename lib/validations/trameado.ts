import { z } from "zod";

import { hasCsvFormulaInjectionRisk } from "@/lib/drawings/csv-safety";
import {
  normalizeDiameter,
  normalizeSchedule,
  normalizeSegmentNumber,
} from "@/lib/trameado/format";

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

const requiredTextField = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio.`)
    .max(max, `Máximo ${max} caracteres.`)
    .refine(rejectCsvFormulaInjection, csvFormulaInjectionMessage);

const palilloLengthField = z
  .string()
  .trim()
  .min(1, "La longitud PALILLO es obligatoria.")
  .refine(
    (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
    "La longitud PALILLO debe ser mayor que 0.",
  );

const lengthUnitField = z
  .enum(["mm", "cm", "m"])
  .optional()
  .transform((value) => value ?? "mm");

const optionalPositiveIntField = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) =>
      value === null ||
      (/^\d+$/.test(value) && Number.parseInt(value, 10) > 0),
    "Debe ser un entero positivo.",
  )
  .transform((value) =>
    value === null ? null : Number.parseInt(value, 10),
  );

const optionalSortOrderField = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => value === null || (/^-?\d+$/.test(value) && Number(value) >= 0),
    "El orden debe ser un entero mayor o igual que 0.",
  )
  .transform((value) =>
    value === null ? null : Number.parseInt(value, 10),
  );

export const trameadoSheetFormSchema = z.object({
  lineIdentifier: requiredTextField("El identificador ISO/línea", 200),
  lineClass: optionalTextField(100),
  notes: optionalTextField(1000),
});

export const trameadoSheetUpdateSchema = trameadoSheetFormSchema.partial().refine(
  (value) =>
    value.lineIdentifier !== undefined ||
    value.lineClass !== undefined ||
    value.notes !== undefined,
  "Debes indicar al menos un campo para actualizar.",
);

export const trameadoSegmentFormSchema = z.object({
  segmentNumber: requiredTextField("El número de tramo", 20).transform(
    normalizeSegmentNumber,
  ),
  segmentLabel: optionalTextField(50),
  diameter: requiredTextField("El diámetro", 50).transform(normalizeDiameter),
  schedule: requiredTextField("El schedule", 50).transform(normalizeSchedule),
  palilloLength: palilloLengthField,
  lengthUnit: lengthUnitField,
  heatNumber: optionalTextField(100),
  sourcePage: optionalPositiveIntField,
  sourceMark: optionalTextField(200),
  notes: optionalTextField(1000),
  sortOrder: optionalSortOrderField,
});

export const trameadoSegmentUpdateSchema = trameadoSegmentFormSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Debes indicar al menos un campo para actualizar.",
  );

export type TrameadoSheetFormInput = z.infer<typeof trameadoSheetFormSchema>;
export type TrameadoSegmentFormInput = z.infer<typeof trameadoSegmentFormSchema>;

const MIN_RELATIVE_COORD = 0;
const MAX_RELATIVE_COORD = 1;
const MIN_RECT_SIZE = 0.01;

function isRelativeCoordinateInRange(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= MIN_RELATIVE_COORD &&
    value <= MAX_RELATIVE_COORD
  );
}

const relativeCoordinateField = z.coerce
  .number()
  .refine(isRelativeCoordinateInRange, "Coordenada fuera del rango 0–1.");

const annotationPageNumberField = z.coerce
  .number()
  .int("La página debe ser un entero.")
  .min(1, "La página debe ser mayor o igual que 1.");

const trameadoPointAnnotationSchema = z.object({
  type: z.literal("point"),
  pageNumber: annotationPageNumberField,
  x: relativeCoordinateField,
  y: relativeCoordinateField,
});

const trameadoRectAnnotationSchema = z
  .object({
    type: z.literal("rect"),
    pageNumber: annotationPageNumberField,
    x: relativeCoordinateField,
    y: relativeCoordinateField,
    width: relativeCoordinateField.refine(
      (value) => value >= MIN_RECT_SIZE,
      "El ancho del rectángulo es demasiado pequeño.",
    ),
    height: relativeCoordinateField.refine(
      (value) => value >= MIN_RECT_SIZE,
      "El alto del rectángulo es demasiado pequeño.",
    ),
  })
  .refine(
    (value) => value.x + value.width <= MAX_RELATIVE_COORD + 0.0001,
    "El rectángulo se sale del visor horizontalmente.",
  )
  .refine(
    (value) => value.y + value.height <= MAX_RELATIVE_COORD + 0.0001,
    "El rectángulo se sale del visor verticalmente.",
  );

export const trameadoAnnotationFormSchema = z.discriminatedUnion("type", [
  trameadoPointAnnotationSchema,
  trameadoRectAnnotationSchema,
]);

export type TrameadoAnnotationFormInput = z.infer<
  typeof trameadoAnnotationFormSchema
>;

export function parseTrameadoAnnotationFormData(formData: FormData) {
  const type = formData.get("type");

  if (type === "rect") {
    return trameadoAnnotationFormSchema.safeParse({
      type,
      pageNumber: formData.get("pageNumber") ?? "1",
      x: formData.get("x") ?? undefined,
      y: formData.get("y") ?? undefined,
      width: formData.get("width") ?? undefined,
      height: formData.get("height") ?? undefined,
    });
  }

  return trameadoAnnotationFormSchema.safeParse({
    type: type === "point" ? "point" : type,
    pageNumber: formData.get("pageNumber") ?? "1",
    x: formData.get("x") ?? undefined,
    y: formData.get("y") ?? undefined,
  });
}
