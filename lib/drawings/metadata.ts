export type DrawingMetadataFields = {
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
};

function normalizeMetadataField(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

export function drawingMetadataEquals(
  left: DrawingMetadataFields,
  right: DrawingMetadataFields,
): boolean {
  return (
    normalizeMetadataField(left.drawingNumber) ===
      normalizeMetadataField(right.drawingNumber) &&
    normalizeMetadataField(left.lineNumber) ===
      normalizeMetadataField(right.lineNumber) &&
    normalizeMetadataField(left.revision) === normalizeMetadataField(right.revision)
  );
}
