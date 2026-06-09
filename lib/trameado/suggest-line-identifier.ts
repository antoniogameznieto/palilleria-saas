type DrawingMetadataForLineIdentifier = {
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
};

export function buildSuggestedLineIdentifier(
  drawing: DrawingMetadataForLineIdentifier,
): string | null {
  const drawingNumber = drawing.drawingNumber?.trim() ?? "";
  const lineNumber = drawing.lineNumber?.trim() ?? "";
  const revision = drawing.revision?.trim() ?? "";

  if (lineNumber.length > 0) {
    return lineNumber;
  }

  if (
    drawingNumber.length > 0 &&
    revision.length > 0
  ) {
    return `${drawingNumber}-${revision}`;
  }

  if (drawingNumber.length > 0) {
    return drawingNumber;
  }

  return null;
}
