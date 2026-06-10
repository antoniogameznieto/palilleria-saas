import { normalizeSegmentNumber } from "@/lib/trameado/format";

export type TrameadoPdfAnnotationType = "point" | "rect";

export type TrameadoPdfAnnotation = {
  id: string;
  segmentId: string;
  segmentNumber: string;
  segmentLabel: string;
  palilloLength?: string;
  pageNumber: number;
  type: TrameadoPdfAnnotationType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  createdAt: string;
};

export type TrameadoPdfAnnotationSegmentSource = {
  id: string;
  segmentNumber: string;
  segmentLabel?: string | null;
  palilloLength: string;
};

export type TrameadoPdfAnnotationSummaryItem = {
  segmentId: string;
  segmentNumber: string;
  segmentLabel: string;
  palilloLength: string;
  marked: boolean;
  annotationId?: string;
};

export type TrameadoPdfAnnotationSummary = {
  markedCount: number;
  totalCount: number;
  items: TrameadoPdfAnnotationSummaryItem[];
};

const MIN_RELATIVE = 0;
const MAX_RELATIVE = 1;
const MIN_RECT_SIZE = 0.01;

export function isValidRelativeCoordinate(value: number): boolean {
  return (
    Number.isFinite(value) && value >= MIN_RELATIVE && value <= MAX_RELATIVE
  );
}

export function clampRelativeCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_RELATIVE;
  }

  return Math.min(MAX_RELATIVE, Math.max(MIN_RELATIVE, value));
}

export function formatAnnotationSegmentLabel(
  segment: TrameadoPdfAnnotationSegmentSource,
): string {
  const label = segment.segmentLabel?.trim();

  if (label) {
    return normalizeSegmentNumber(label);
  }

  return normalizeSegmentNumber(segment.segmentNumber);
}

function createAnnotationId(): string {
  return `mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPointAnnotation(input: {
  segment: TrameadoPdfAnnotationSegmentSource;
  x: number;
  y: number;
  pageNumber?: number;
}): TrameadoPdfAnnotation {
  const x = clampRelativeCoordinate(input.x);
  const y = clampRelativeCoordinate(input.y);

  if (!isValidRelativeCoordinate(x) || !isValidRelativeCoordinate(y)) {
    throw new Error("Coordenadas relativas fuera de rango.");
  }

  return {
    id: createAnnotationId(),
    segmentId: input.segment.id,
    segmentNumber: normalizeSegmentNumber(input.segment.segmentNumber),
    segmentLabel: formatAnnotationSegmentLabel(input.segment),
    palilloLength: input.segment.palilloLength,
    pageNumber: input.pageNumber ?? 1,
    type: "point",
    x,
    y,
    createdAt: new Date().toISOString(),
  };
}

export function createRectAnnotation(input: {
  segment: TrameadoPdfAnnotationSegmentSource;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber?: number;
}): TrameadoPdfAnnotation | null {
  const x = clampRelativeCoordinate(input.x);
  const y = clampRelativeCoordinate(input.y);
  const width = clampRelativeCoordinate(input.width);
  const height = clampRelativeCoordinate(input.height);

  if (
    width < MIN_RECT_SIZE ||
    height < MIN_RECT_SIZE ||
    x + width > MAX_RELATIVE + 0.0001 ||
    y + height > MAX_RELATIVE + 0.0001
  ) {
    return null;
  }

  return {
    id: createAnnotationId(),
    segmentId: input.segment.id,
    segmentNumber: normalizeSegmentNumber(input.segment.segmentNumber),
    segmentLabel: formatAnnotationSegmentLabel(input.segment),
    palilloLength: input.segment.palilloLength,
    pageNumber: input.pageNumber ?? 1,
    type: "rect",
    x,
    y,
    width,
    height,
    createdAt: new Date().toISOString(),
  };
}

export function getAnnotationForSegment(
  annotations: TrameadoPdfAnnotation[],
  segmentId: string,
): TrameadoPdfAnnotation | undefined {
  return annotations.find((annotation) => annotation.segmentId === segmentId);
}

export function upsertAnnotationForSegment(
  annotations: TrameadoPdfAnnotation[],
  annotation: TrameadoPdfAnnotation,
): TrameadoPdfAnnotation[] {
  return [
    ...annotations.filter((item) => item.segmentId !== annotation.segmentId),
    annotation,
  ];
}

export function removeAnnotationForSegment(
  annotations: TrameadoPdfAnnotation[],
  segmentId: string,
): TrameadoPdfAnnotation[] {
  return annotations.filter((annotation) => annotation.segmentId !== segmentId);
}

export function removeAnnotationById(
  annotations: TrameadoPdfAnnotation[],
  annotationId: string,
): TrameadoPdfAnnotation[] {
  return annotations.filter((annotation) => annotation.id !== annotationId);
}

export function buildTrameadoPdfAnnotationSummary(
  segments: TrameadoPdfAnnotationSegmentSource[],
  annotations: TrameadoPdfAnnotation[],
): TrameadoPdfAnnotationSummary {
  const items = segments.map((segment) => {
    const annotation = getAnnotationForSegment(annotations, segment.id);

    return {
      segmentId: segment.id,
      segmentNumber: normalizeSegmentNumber(segment.segmentNumber),
      segmentLabel: formatAnnotationSegmentLabel(segment),
      palilloLength: segment.palilloLength,
      marked: Boolean(annotation),
      annotationId: annotation?.id,
    };
  });

  const markedCount = items.filter((item) => item.marked).length;

  return {
    markedCount,
    totalCount: items.length,
    items,
  };
}

export function toTrameadoPdfAnnotation(
  annotation: Omit<TrameadoPdfAnnotation, "palilloLength"> & {
    palilloLength?: string;
  },
): TrameadoPdfAnnotation {
  return {
    ...annotation,
    palilloLength: annotation.palilloLength,
  };
}

export function pruneAnnotationsForSegments(
  annotations: TrameadoPdfAnnotation[],
  segments: TrameadoPdfAnnotationSegmentSource[],
): TrameadoPdfAnnotation[] {
  const segmentIds = new Set(segments.map((segment) => segment.id));

  return annotations.filter((annotation) => segmentIds.has(annotation.segmentId));
}
