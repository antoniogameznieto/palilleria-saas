import type { ParsedDrawingMetadata } from "@/lib/drawings/parse-filename";
import { hasDetectedMetadata } from "@/lib/drawings/parse-filename";

export type DetectionSource = "filename" | "pdfText";

type ExistingDrawingMetadata = {
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
};

type MetadataField = keyof ParsedDrawingMetadata;

const FIELD_LABELS: Record<MetadataField, string> = {
  drawingNumber: "número de plano",
  lineNumber: "número de línea",
  revision: "revisión",
};

function isEmptyMetadataField(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

function pickDetectedValue(
  field: MetadataField,
  filenameDetected: ParsedDrawingMetadata,
  pdfTextDetected: ParsedDrawingMetadata,
): { value: string | null; source: DetectionSource | null } {
  const filenameValue = filenameDetected[field];
  const pdfTextValue = pdfTextDetected[field];

  if (!isEmptyMetadataField(filenameValue)) {
    return { value: filenameValue, source: "filename" };
  }

  if (!isEmptyMetadataField(pdfTextValue)) {
    return { value: pdfTextValue, source: "pdfText" };
  }

  return { value: null, source: null };
}

export function mergeDetectionFromSources(
  existing: ExistingDrawingMetadata,
  filenameDetected: ParsedDrawingMetadata,
  pdfTextDetected: ParsedDrawingMetadata,
): {
  merged: ParsedDrawingMetadata;
  metadataUpdate: {
    drawingNumber?: string;
    lineNumber?: string;
    revision?: string;
  };
  appliedFields: string[];
  sourcesUsed: DetectionSource[];
  fieldSources: Partial<Record<MetadataField, DetectionSource>>;
} {
  const merged: ParsedDrawingMetadata = {
    drawingNumber: null,
    lineNumber: null,
    revision: null,
  };
  const metadataUpdate: {
    drawingNumber?: string;
    lineNumber?: string;
    revision?: string;
  } = {};
  const appliedFields: string[] = [];
  const fieldSources: Partial<Record<MetadataField, DetectionSource>> = {};
  const sourcesUsedSet = new Set<DetectionSource>();

  for (const field of Object.keys(FIELD_LABELS) as MetadataField[]) {
    if (!isEmptyMetadataField(existing[field])) {
      merged[field] = existing[field];
      continue;
    }

    const picked = pickDetectedValue(field, filenameDetected, pdfTextDetected);

    if (!picked.value || !picked.source) {
      continue;
    }

    merged[field] = picked.value;
    metadataUpdate[field] = picked.value;
    appliedFields.push(FIELD_LABELS[field]);
    fieldSources[field] = picked.source;
    sourcesUsedSet.add(picked.source);
  }

  return {
    merged,
    metadataUpdate,
    appliedFields,
    sourcesUsed: Array.from(sourcesUsedSet),
    fieldSources,
  };
}

export function formatDetectionSources(sources: DetectionSource[]): string {
  const labels: Record<DetectionSource, string> = {
    filename: "nombre de archivo",
    pdfText: "texto del PDF",
  };

  return sources.map((source) => labels[source]).join(" + ");
}

export function buildDetectionCompletionMessage(
  appliedFields: string[],
  sourcesUsed: DetectionSource[],
  pdfTextAttempted: boolean,
): string {
  if (appliedFields.length === 0) {
    if (!pdfTextAttempted) {
      return "Detección completada. No se encontraron metadatos claros en el nombre del archivo.";
    }

    return "Detección completada. No se encontraron metadatos claros en el nombre del archivo ni en el texto embebido del PDF.";
  }

  const sourceLabel = formatDetectionSources(sourcesUsed);

  return `Detección completada. Metadatos propuestos (${sourceLabel}): ${appliedFields.join(", ")}.`;
}

export function hasAnyDetectedMetadata(
  filenameDetected: ParsedDrawingMetadata,
  pdfTextDetected: ParsedDrawingMetadata,
): boolean {
  return (
    hasDetectedMetadata(filenameDetected) || hasDetectedMetadata(pdfTextDetected)
  );
}
