import path from "path";

export function sanitizeFileName(fileName: string): string {
  const baseName = path.basename(fileName).trim();
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (!sanitized || sanitized === "." || sanitized === "..") {
    return "document.pdf";
  }

  return sanitized.toLowerCase().endsWith(".pdf")
    ? sanitized
    : `${sanitized}.pdf`;
}

export function buildDrawingRelativeDir(
  companyId: string,
  jobId: string,
  drawingId: string,
): string {
  return path.posix.join(
    "companies",
    companyId,
    "jobs",
    jobId,
    "drawings",
    drawingId,
  );
}

export function buildDrawingStoragePath(
  companyId: string,
  jobId: string,
  drawingId: string,
  originalFileName: string,
): string {
  return path.posix.join(
    buildDrawingRelativeDir(companyId, jobId, drawingId),
    sanitizeFileName(originalFileName),
  );
}
