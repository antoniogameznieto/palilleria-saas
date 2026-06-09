import { formatSegmentLabel } from "@/lib/trameado/format";

export type TrameadoSegmentNumberSource = {
  segmentNumber: string;
  segmentLabel?: string | null;
};

export type TrameadoPalilloSource = {
  palilloLength: string | number;
  lengthUnit?: string;
};

export function getNextSegmentNumber(
  segments: TrameadoSegmentNumberSource[],
): string {
  const numericValues = segments
    .map((segment) => Number.parseInt(segment.segmentNumber, 10))
    .filter((value) => Number.isFinite(value));

  if (numericValues.length === 0) {
    return "1";
  }

  return String(Math.max(...numericValues) + 1);
}

export function formatTrameadoSegmentDisplayLabel(
  segment: TrameadoSegmentNumberSource,
): string {
  const label = segment.segmentLabel?.trim();

  if (label) {
    return label;
  }

  return formatSegmentLabel(segment.segmentNumber);
}

export function sortTrameadoSegmentsForDisplay<
  T extends TrameadoSegmentNumberSource & { sortOrder: number },
>(segments: T[]): T[] {
  return [...segments].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.segmentNumber.localeCompare(right.segmentNumber, undefined, {
      numeric: true,
    });
  });
}

export function parsePalilloLengthMm(value: string | number): number | null {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

export function calculateTrameadoTotals(
  segments: TrameadoPalilloSource[],
): {
  segmentCount: number;
  totalPalilloMm: number;
} {
  let totalPalilloMm = 0;

  for (const segment of segments) {
    const lengthMm = parsePalilloLengthMm(segment.palilloLength);

    if (lengthMm != null) {
      totalPalilloMm += lengthMm;
    }
  }

  return {
    segmentCount: segments.length,
    totalPalilloMm,
  };
}

export function formatTrameadoPalilloTotalMm(totalMm: number): string {
  const rounded = Math.round(totalMm);
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(
    rounded,
  );
}

export function formatTrameadoSheetSummary(
  segments: TrameadoPalilloSource[],
): string {
  const { segmentCount, totalPalilloMm } = calculateTrameadoTotals(segments);
  const tramoLabel = segmentCount === 1 ? "tramo" : "tramos";

  if (segmentCount === 0) {
    return "0 tramos · 0 mm";
  }

  return `${segmentCount} ${tramoLabel} · ${formatTrameadoPalilloTotalMm(totalPalilloMm)} mm`;
}
