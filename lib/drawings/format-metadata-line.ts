export function formatDrawingMetadataLine(
  drawingNumber: string | null,
  lineNumber: string | null,
  revision: string | null,
): string {
  const parts = [
    drawingNumber?.trim() || null,
    lineNumber?.trim() || null,
    revision?.trim() ? `Rev. ${revision.trim()}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : "Sin metadatos";
}

export function formatMetadataValue(value: string | null | undefined): string {
  if (value == null || value.trim() === "") {
    return "—";
  }

  return value;
}
