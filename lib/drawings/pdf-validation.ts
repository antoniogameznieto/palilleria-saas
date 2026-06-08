export const PDF_MIME_TYPE = "application/pdf";

export function isPdfFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return type === PDF_MIME_TYPE || name.endsWith(".pdf");
}
