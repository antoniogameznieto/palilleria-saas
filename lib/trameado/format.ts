const DEFAULT_LENGTH_UNIT = "mm";

export function normalizeDiameter(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length === 0) {
    return trimmed;
  }

  const withoutQuotes = trimmed.replace(/["″]/g, "").trim();
  if (/^\d+(\.\d+)?$/.test(withoutQuotes)) {
    return `${withoutQuotes}"`;
  }

  if (trimmed.includes('"') || trimmed.includes("″")) {
    return trimmed.replace(/″/g, '"');
  }

  return trimmed;
}

export function normalizeSchedule(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeSegmentNumber(value: string): string {
  const trimmed = value.trim();
  const bracketMatch = trimmed.match(/^<(\d+)>$/);

  if (bracketMatch) {
    return bracketMatch[1];
  }

  return trimmed.replace(/^0+(\d)/, "$1");
}

export function formatSegmentLabel(segmentNumber: string): string {
  const normalized = normalizeSegmentNumber(segmentNumber);

  if (normalized.length === 0) {
    return "";
  }

  return `<${normalized}>`;
}

export function formatPalilloLength(
  value: string | number,
  unit = DEFAULT_LENGTH_UNIT,
): string {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  const fixed = numeric.toFixed(3).replace(/\.?0+$/, "");
  return unit === DEFAULT_LENGTH_UNIT ? fixed : `${fixed} ${unit}`;
}

export function getDefaultLengthUnit(): string {
  return DEFAULT_LENGTH_UNIT;
}
