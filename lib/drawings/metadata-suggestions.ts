export type DrawingMetadataSuggestionInput = {
  originalFileName: string;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
};

export type DrawingMetadataSuggestionConfidence = "high" | "partial" | "none";

export type DrawingMetadataSuggestionSource = "filename" | "existing" | "mixed";

export type DrawingMetadataSuggestion = {
  suggestedDrawingNumber: string | null;
  suggestedLineNumber: string | null;
  suggestedRevision: string | null;
  hasSuggestion: boolean;
  confidence: DrawingMetadataSuggestionConfidence;
  source: DrawingMetadataSuggestionSource;
};

const HL_LINE_PATTERN = /HL-\d{4}/i;
const REVISION_SUFFIX_PATTERN = /-(\d{2})$/;

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function removeFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

function hasCompleteMetadata(input: DrawingMetadataSuggestionInput): boolean {
  return (
    trimOrNull(input.drawingNumber) != null &&
    trimOrNull(input.lineNumber) != null &&
    trimOrNull(input.revision) != null
  );
}

export function buildDrawingMetadataSuggestion(
  input: DrawingMetadataSuggestionInput,
): DrawingMetadataSuggestion {
  const existingDrawingNumber = trimOrNull(input.drawingNumber);
  const existingLineNumber = trimOrNull(input.lineNumber);
  const existingRevision = trimOrNull(input.revision);

  if (hasCompleteMetadata(input)) {
    return {
      suggestedDrawingNumber: existingDrawingNumber,
      suggestedLineNumber: existingLineNumber,
      suggestedRevision: existingRevision,
      hasSuggestion: false,
      confidence: "none",
      source: "existing",
    };
  }

  const stem = removeFileExtension(input.originalFileName.trim());
  const lineMatch = stem.match(HL_LINE_PATTERN);
  const revisionMatch = stem.match(REVISION_SUFFIX_PATTERN);

  const fromFilename = {
    drawingNumber: stem.length > 0 ? stem : null,
    lineNumber: lineMatch ? lineMatch[0].toUpperCase() : null,
    revision: revisionMatch?.[1] ?? null,
  };

  const suggestedDrawingNumber =
    existingDrawingNumber ?? fromFilename.drawingNumber;
  const suggestedLineNumber = existingLineNumber ?? fromFilename.lineNumber;
  const suggestedRevision = existingRevision ?? fromFilename.revision;

  const filledFromFilename = [
    !existingDrawingNumber && fromFilename.drawingNumber,
    !existingLineNumber && fromFilename.lineNumber,
    !existingRevision && fromFilename.revision,
  ].filter(Boolean).length;

  const hasSuggestion = filledFromFilename > 0;

  let confidence: DrawingMetadataSuggestionConfidence = "none";
  if (
    suggestedDrawingNumber &&
    suggestedLineNumber &&
    suggestedRevision
  ) {
    confidence = filledFromFilename === 3 ? "high" : "partial";
  } else if (hasSuggestion) {
    confidence = "partial";
  }

  const source: DrawingMetadataSuggestionSource =
    filledFromFilename === 0
      ? "existing"
      : filledFromFilename === 3 &&
          !existingDrawingNumber &&
          !existingLineNumber &&
          !existingRevision
        ? "filename"
        : "mixed";

  return {
    suggestedDrawingNumber,
    suggestedLineNumber,
    suggestedRevision,
    hasSuggestion,
    confidence,
    source,
  };
}

export function resolveDrawingMetadataFormDefaults(
  input: DrawingMetadataSuggestionInput,
): {
  drawingNumber: string;
  lineNumber: string;
  revision: string;
} {
  const suggestion = buildDrawingMetadataSuggestion(input);

  return {
    drawingNumber:
      trimOrNull(input.drawingNumber) ?? suggestion.suggestedDrawingNumber ?? "",
    lineNumber:
      trimOrNull(input.lineNumber) ?? suggestion.suggestedLineNumber ?? "",
    revision: trimOrNull(input.revision) ?? suggestion.suggestedRevision ?? "",
  };
}
