import type { ParsedDrawingMetadata } from "@/lib/drawings/parse-filename";
import { hasDetectedMetadata } from "@/lib/drawings/parse-filename";

export type DetectionSource = "filename" | "pdfText";

export type MetadataField = keyof ParsedDrawingMetadata;

export const METADATA_FIELD_LABELS: Record<MetadataField, string> = {
  drawingNumber: "número de plano",
  lineNumber: "número de línea",
  revision: "revisión",
};

export const METADATA_FIELD_DISPLAY_LABELS: Record<MetadataField, string> = {
  drawingNumber: "Número de plano",
  lineNumber: "Línea",
  revision: "Revisión",
};

const METADATA_FIELDS = Object.keys(METADATA_FIELD_LABELS) as MetadataField[];

type ExistingDrawingMetadata = {
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
};

export type DetectionFieldFeedback = {
  field: MetadataField;
  label: string;
  displayLabel: string;
  value: string;
  source: DetectionSource;
};

export type SkippedFieldFeedback = {
  field: MetadataField;
  label: string;
  displayLabel: string;
  existingValue: string;
  reason: "manual_value";
};

export type DetectionFeedbackSummary = {
  detectedFields: DetectionFieldFeedback[];
  appliedFields: string[];
  skippedFields: SkippedFieldFeedback[];
  fieldSources: Partial<Record<MetadataField, DetectionSource>>;
  sourcesUsed: DetectionSource[];
};

export type DetectionActivityMetadata = {
  detectedFields: Array<{
    field: MetadataField;
    value: string;
    source: DetectionSource;
  }>;
  appliedFields: string[];
  skippedFields: Array<{
    field: MetadataField;
    label: string;
    reason: "manual_value";
  }>;
  fieldSources: Partial<Record<MetadataField, DetectionSource>>;
  sourcesUsed: DetectionSource[];
  previousStatus: string;
  nextStatus: string;
  hasEmbeddedText: boolean;
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

function buildDetectedFields(
  filenameDetected: ParsedDrawingMetadata,
  pdfTextDetected: ParsedDrawingMetadata,
): DetectionFieldFeedback[] {
  const detectedFields: DetectionFieldFeedback[] = [];

  for (const field of METADATA_FIELDS) {
    const picked = pickDetectedValue(field, filenameDetected, pdfTextDetected);

    if (!picked.value || !picked.source) {
      continue;
    }

    detectedFields.push({
      field,
      label: METADATA_FIELD_LABELS[field],
      displayLabel: METADATA_FIELD_DISPLAY_LABELS[field],
      value: picked.value,
      source: picked.source,
    });
  }

  return detectedFields;
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
  feedback: DetectionFeedbackSummary;
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
  const skippedFields: SkippedFieldFeedback[] = [];
  const fieldSources: Partial<Record<MetadataField, DetectionSource>> = {};
  const sourcesUsedSet = new Set<DetectionSource>();
  const detectedFields = buildDetectedFields(filenameDetected, pdfTextDetected);

  for (const detected of detectedFields) {
    fieldSources[detected.field] = detected.source;
  }

  for (const field of METADATA_FIELDS) {
    if (!isEmptyMetadataField(existing[field])) {
      merged[field] = existing[field];

      if (fieldSources[field]) {
        skippedFields.push({
          field,
          label: METADATA_FIELD_LABELS[field],
          displayLabel: METADATA_FIELD_DISPLAY_LABELS[field],
          existingValue: existing[field]!.trim(),
          reason: "manual_value",
        });
      }

      continue;
    }

    const picked = pickDetectedValue(field, filenameDetected, pdfTextDetected);

    if (!picked.value || !picked.source) {
      continue;
    }

    merged[field] = picked.value;
    metadataUpdate[field] = picked.value;
    appliedFields.push(METADATA_FIELD_LABELS[field]);
    sourcesUsedSet.add(picked.source);
  }

  return {
    merged,
    metadataUpdate,
    feedback: {
      detectedFields,
      appliedFields,
      skippedFields,
      fieldSources,
      sourcesUsed: Array.from(sourcesUsedSet),
    },
  };
}

export function formatDetectionSourceLabel(source: DetectionSource): string {
  const labels: Record<DetectionSource, string> = {
    filename: "nombre de archivo",
    pdfText: "texto del PDF",
  };

  return labels[source];
}

export function formatDetectionSources(sources: DetectionSource[]): string {
  return sources.map((source) => formatDetectionSourceLabel(source)).join(" + ");
}

export function buildDetectionCompletionMessage(
  feedback: DetectionFeedbackSummary,
  pdfTextAttempted: boolean,
): string {
  const { detectedFields, appliedFields, skippedFields } = feedback;

  if (detectedFields.length === 0) {
    if (!pdfTextAttempted) {
      return "Detección completada. No se encontraron metadatos claros en el nombre del archivo.";
    }

    return "Detección completada. No se encontraron metadatos claros en el nombre del archivo ni en el texto embebido del PDF.";
  }

  const parts = [
    `Detectados: ${detectedFields.length}`,
    `Aplicados: ${appliedFields.length}`,
  ];

  if (skippedFields.length > 0) {
    parts.push(`No aplicados: ${skippedFields.length}`);
  }

  return `Detección completada. ${parts.join(" · ")}.`;
}

export function serializeDetectionFeedbackForActivity(
  feedback: DetectionFeedbackSummary,
  extras: {
    previousStatus: string;
    nextStatus: string;
    hasEmbeddedText: boolean;
  },
): DetectionActivityMetadata {
  return {
    detectedFields: feedback.detectedFields.map((item) => ({
      field: item.field,
      value: item.value,
      source: item.source,
    })),
    appliedFields: feedback.appliedFields,
    skippedFields: feedback.skippedFields.map((item) => ({
      field: item.field,
      label: item.label,
      reason: item.reason,
    })),
    fieldSources: feedback.fieldSources,
    sourcesUsed: feedback.sourcesUsed,
    previousStatus: extras.previousStatus,
    nextStatus: extras.nextStatus,
    hasEmbeddedText: extras.hasEmbeddedText,
  };
}

function isMetadataField(value: string): value is MetadataField {
  return value in METADATA_FIELD_LABELS;
}

function isDetectionSource(value: string): value is DetectionSource {
  return value === "filename" || value === "pdfText";
}

export function parseDetectionFeedbackFromActivity(
  metadata: unknown,
): DetectionFeedbackSummary | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const detectedRaw = Array.isArray(record.detectedFields)
    ? record.detectedFields
    : [];
  const skippedRaw = Array.isArray(record.skippedFields)
    ? record.skippedFields
    : [];
  const appliedFields = Array.isArray(record.appliedFields)
    ? record.appliedFields.filter((item): item is string => typeof item === "string")
    : [];
  const sourcesUsed = Array.isArray(record.sourcesUsed)
    ? record.sourcesUsed.filter(
        (item): item is DetectionSource =>
          typeof item === "string" && isDetectionSource(item),
      )
    : [];

  const detectedFields: DetectionFieldFeedback[] = [];

  for (const item of detectedRaw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const entry = item as Record<string, unknown>;
    const field = entry.field;

    if (typeof field !== "string" || !isMetadataField(field)) {
      continue;
    }

    if (typeof entry.value !== "string" || typeof entry.source !== "string") {
      continue;
    }

    if (!isDetectionSource(entry.source)) {
      continue;
    }

    detectedFields.push({
      field,
      label: METADATA_FIELD_LABELS[field],
      displayLabel: METADATA_FIELD_DISPLAY_LABELS[field],
      value: entry.value,
      source: entry.source,
    });
  }

  const skippedFields: SkippedFieldFeedback[] = [];

  for (const item of skippedRaw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const entry = item as Record<string, unknown>;
    const field = entry.field;

    if (typeof field !== "string" || !isMetadataField(field)) {
      continue;
    }

    skippedFields.push({
      field,
      label:
        typeof entry.label === "string"
          ? entry.label
          : METADATA_FIELD_LABELS[field],
      displayLabel: METADATA_FIELD_DISPLAY_LABELS[field],
      existingValue: "",
      reason: "manual_value",
    });
  }

  const fieldSources: Partial<Record<MetadataField, DetectionSource>> = {};

  if (record.fieldSources && typeof record.fieldSources === "object") {
    for (const [key, value] of Object.entries(
      record.fieldSources as Record<string, unknown>,
    )) {
      if (isMetadataField(key) && typeof value === "string" && isDetectionSource(value)) {
        fieldSources[key] = value;
      }
    }
  }

  if (
    detectedFields.length === 0 &&
    appliedFields.length === 0 &&
    skippedFields.length === 0
  ) {
    return null;
  }

  return {
    detectedFields,
    appliedFields,
    skippedFields,
    fieldSources,
    sourcesUsed,
  };
}

export function hasAnyDetectedMetadata(
  filenameDetected: ParsedDrawingMetadata,
  pdfTextDetected: ParsedDrawingMetadata,
): boolean {
  return (
    hasDetectedMetadata(filenameDetected) || hasDetectedMetadata(pdfTextDetected)
  );
}
