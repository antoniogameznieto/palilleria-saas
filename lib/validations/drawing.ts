import { z } from "zod";

import { MANUAL_DRAWING_STATUS_VALUES } from "@/lib/drawings/labels";
import { getMaxUploadSizeBytes, PDF_MIME_TYPE } from "@/lib/storage";

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

export const updateDrawingStatusSchema = z.object({
  status: z.enum(MANUAL_DRAWING_STATUS_VALUES, {
    message: "Estado no válido.",
  }),
});

export type UpdateDrawingStatusInput = z.infer<typeof updateDrawingStatusSchema>;

export function isPdfFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return type === PDF_MIME_TYPE || name.endsWith(".pdf");
}

export function validatePdfFile(file: File): string | null {
  if (!isPdfFile(file)) {
    return `"${file.name}" no es un PDF válido.`;
  }

  if (file.size > getMaxUploadSizeBytes()) {
    const maxMb = Math.round(getMaxUploadSizeBytes() / (1024 * 1024));
    return `"${file.name}" supera el tamaño máximo de ${maxMb} MB.`;
  }

  if (file.size === 0) {
    return `"${file.name}" está vacío.`;
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
