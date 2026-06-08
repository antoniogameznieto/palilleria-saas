import { getMaxUploadSizeBytes, PDF_MIME_TYPE } from "@/lib/storage";

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
