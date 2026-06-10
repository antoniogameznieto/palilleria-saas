import { z } from "zod";

import { isPdfFile } from "@/lib/drawings/pdf-validation";
import { MANUAL_DRAWING_STATUS_VALUES } from "@/lib/drawings/labels";
import { getMaxUploadSizeBytes } from "@/lib/storage";

export { isPdfFile } from "@/lib/drawings/pdf-validation";

const optionalMetadataField = z
  .string()
  .trim()
  .max(200, "Máximo 200 caracteres")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const updateDrawingMetadataSchema = z.object({
  drawingNumber: optionalMetadataField,
  lineNumber: optionalMetadataField,
  revision: optionalMetadataField,
});

export type UpdateDrawingMetadataInput = z.infer<
  typeof updateDrawingMetadataSchema
>;

const requiredMetadataField = z
  .string()
  .trim()
  .min(1, "Este campo es obligatorio.")
  .max(200, "Máximo 200 caracteres");

export const confirmDrawingMetadataSchema = z.object({
  drawingNumber: requiredMetadataField,
  lineNumber: requiredMetadataField,
  revision: requiredMetadataField,
});

export type ConfirmDrawingMetadataInput = z.infer<
  typeof confirmDrawingMetadataSchema
>;

export const updateDrawingStatusSchema = z.object({
  status: z.enum(MANUAL_DRAWING_STATUS_VALUES, {
    message: "Estado no válido.",
  }),
});

export type UpdateDrawingStatusInput = z.infer<typeof updateDrawingStatusSchema>;

export function validatePdfFile(file: File): string | null {
  if (!isPdfFile(file)) {
    return `"${file.name}" no es un PDF válido. Solo se aceptan archivos .pdf.`;
  }

  if (file.size === 0) {
    return `"${file.name}" está vacío.`;
  }

  if (file.size > getMaxUploadSizeBytes()) {
    const maxMb = Math.round(getMaxUploadSizeBytes() / (1024 * 1024));
    return `"${file.name}" supera el tamaño máximo permitido de ${maxMb} MB.`;
  }

  return null;
}

export function validatePdfFiles(files: File[]): string | null {
  if (files.length === 0) {
    return "Selecciona al menos un archivo PDF.";
  }

  for (const file of files) {
    const error = validatePdfFile(file);
    if (error) {
      return error;
    }
  }

  return null;
}
