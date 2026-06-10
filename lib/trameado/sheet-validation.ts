import {
  detectDiameterFromText,
  detectScheduleFromText,
} from "@/lib/trameado/suggestions";
import { parsePalilloLengthMm } from "@/lib/trameado/segment-helpers";

export type TrameadoSheetValidationStatus =
  | "no_data"
  | "incomplete"
  | "no_comparable"
  | "review_data"
  | "review_delta"
  | "review_delta_high"
  | "reasonable";

export type TrameadoSheetValidationSegment = {
  segmentNumber: string;
  palilloLength: string | number;
  lengthUnit?: string | null;
};

export type TrameadoSheetValidationTakeoffItem = {
  description: string;
  reference?: string | null;
  quantity?: string | null;
  unit?: string | null;
};

export type ValidateTrameadoSheetInput = {
  hasActiveSheet?: boolean;
  segments: TrameadoSheetValidationSegment[];
  takeoffItems?: TrameadoSheetValidationTakeoffItem[];
};

export type TrameadoSheetValidationResult = {
  status: TrameadoSheetValidationStatus;
  statusLabel: string;
  reason: string;
  confirmedSegmentCount: number;
  totalPalilloMm: number;
  totalPalilloM: number;
  invalidPalilloCount: number;
  missingPalilloCount: number;
  duplicateSegmentNumbers: string[];
  duplicatePalilloLengths: number[];
  hasReferenceLength: boolean;
  referencePipeLengthM: number | null;
  referencePipeLengthMm: number | null;
  referenceSource: string | null;
  deltaMm: number | null;
  deltaPct: number | null;
  warnings: string[];
};

const PIPE_KEYWORD_PATTERN =
  /\b(tuber[ií]a|pipe|tubo|tube|spool|cañer[ií]a)\b/i;
const METER_UNITS = new Set(["M", "MT", "MTR", "METRO", "METROS", "METER", "METERS"]);

export const REASONABLE_DELTA_PCT = 10;
export const REVIEW_DELTA_PCT = 25;

function normalizeSegmentNumberKey(value: string): string {
  const trimmed = value.trim();
  const bracketMatch = trimmed.match(/^<(\d+)>$/);

  if (bracketMatch?.[1]) {
    return bracketMatch[1];
  }

  return trimmed.replace(/^0+(\d)/, "$1");
}

function parseQuantityToNumber(quantity: string): number | null {
  const normalized = quantity.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const numeric = Number(normalized);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

function isLikelyPipeItem(text: string): boolean {
  return (
    PIPE_KEYWORD_PATTERN.test(text) ||
    (/\d+(?:\/\d+)?"/.test(text) && /\bSCH\.?\s*(40|80)\b/i.test(text))
  );
}

function scorePipeReferenceItem(
  text: string,
  quantityM: number,
): number {
  let score = 0;

  if (PIPE_KEYWORD_PATTERN.test(text)) {
    score += 4;
  }

  if (detectDiameterFromText(text).length > 0) {
    score += 3;
  }

  if (detectScheduleFromText(text).length > 0) {
    score += 2;
  }

  if (quantityM > 0) {
    score += 1;
  }

  return score;
}

export function pickPipeReferenceLengthFromTakeoffItems(
  takeoffItems: TrameadoSheetValidationTakeoffItem[],
): {
  referencePipeLengthM: number;
  referenceSource: string;
} | null {
  const candidates = takeoffItems
    .map((item) => {
      const text = `${item.description} ${item.reference ?? ""}`.trim();
      const unit = item.unit?.trim().toUpperCase() ?? null;
      const quantity = item.quantity?.trim() ?? "";

      if (!isLikelyPipeItem(text) || !quantity) {
        return null;
      }

      if (!unit || !METER_UNITS.has(unit)) {
        return null;
      }

      const quantityM = parseQuantityToNumber(quantity);

      if (quantityM == null) {
        return null;
      }

      return {
        referencePipeLengthM: quantityM,
        referenceSource: item.description.trim(),
        score: scorePipeReferenceItem(text, quantityM),
      };
    })
    .filter((candidate) => candidate !== null)
    .sort((left, right) => right.score - left.score);

  const best = candidates[0];

  if (!best) {
    return null;
  }

  return {
    referencePipeLengthM: best.referencePipeLengthM,
    referenceSource: best.referenceSource,
  };
}

export function formatTrameadoSheetValidationStatusLabel(
  status: TrameadoSheetValidationStatus,
): string {
  switch (status) {
    case "no_data":
      return "Sin hoja";
    case "incomplete":
      return "Sin tramos";
    case "no_comparable":
      return "Sin referencia suficiente";
    case "review_data":
      return "Revisar datos";
    case "review_delta":
    case "review_delta_high":
      return "Revisar diferencia";
    case "reasonable":
      return "Parece razonable";
    default:
      return "Sin datos";
  }
}

function resolveDeltaStatus(deltaPct: number): TrameadoSheetValidationStatus {
  if (deltaPct <= REASONABLE_DELTA_PCT) {
    return "reasonable";
  }

  if (deltaPct <= REVIEW_DELTA_PCT) {
    return "review_delta";
  }

  return "review_delta_high";
}

export function validateTrameadoSheet(
  input: ValidateTrameadoSheetInput,
): TrameadoSheetValidationResult {
  const hasActiveSheet = input.hasActiveSheet ?? true;
  const segments = input.segments;
  const takeoffItems = input.takeoffItems ?? [];
  const warnings: string[] = [];

  if (!hasActiveSheet) {
    return {
      status: "no_data",
      statusLabel: formatTrameadoSheetValidationStatusLabel("no_data"),
      reason: "Crea una hoja para validar tramos.",
      confirmedSegmentCount: 0,
      totalPalilloMm: 0,
      totalPalilloM: 0,
      invalidPalilloCount: 0,
      missingPalilloCount: 0,
      duplicateSegmentNumbers: [],
      duplicatePalilloLengths: [],
      hasReferenceLength: false,
      referencePipeLengthM: null,
      referencePipeLengthMm: null,
      referenceSource: null,
      deltaMm: null,
      deltaPct: null,
      warnings,
    };
  }

  let totalPalilloMm = 0;
  let invalidPalilloCount = 0;
  let missingPalilloCount = 0;
  const segmentNumberCounts = new Map<string, number>();
  const palilloLengthCounts = new Map<number, number>();

  for (const segment of segments) {
    const rawPalillo =
      typeof segment.palilloLength === "number"
        ? String(segment.palilloLength)
        : segment.palilloLength;
    const trimmedPalillo = rawPalillo.trim();

    if (!trimmedPalillo) {
      missingPalilloCount += 1;
      continue;
    }

    const palilloMm = parsePalilloLengthMm(trimmedPalillo);

    if (palilloMm == null) {
      invalidPalilloCount += 1;
      continue;
    }

    totalPalilloMm += palilloMm;

    const segmentKey = normalizeSegmentNumberKey(segment.segmentNumber);
    segmentNumberCounts.set(
      segmentKey,
      (segmentNumberCounts.get(segmentKey) ?? 0) + 1,
    );
    palilloLengthCounts.set(
      palilloMm,
      (palilloLengthCounts.get(palilloMm) ?? 0) + 1,
    );
  }

  const duplicateSegmentNumbers = [...segmentNumberCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([segmentNumber]) => segmentNumber);
  const duplicatePalilloLengths = [...palilloLengthCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([length]) => length);

  if (duplicatePalilloLengths.length > 0) {
    warnings.push(
      "Hay longitudes PALILLO repetidas; revisa si corresponde al mismo corte.",
    );
  }

  const confirmedSegmentCount = segments.length;
  const totalPalilloM = totalPalilloMm / 1000;

  if (confirmedSegmentCount === 0) {
    return {
      status: "incomplete",
      statusLabel: formatTrameadoSheetValidationStatusLabel("incomplete"),
      reason: "Añade tramos para validar la hoja.",
      confirmedSegmentCount,
      totalPalilloMm,
      totalPalilloM,
      invalidPalilloCount,
      missingPalilloCount,
      duplicateSegmentNumbers,
      duplicatePalilloLengths,
      hasReferenceLength: false,
      referencePipeLengthM: null,
      referencePipeLengthMm: null,
      referenceSource: null,
      deltaMm: null,
      deltaPct: null,
      warnings,
    };
  }

  if (
    invalidPalilloCount > 0 ||
    missingPalilloCount > 0 ||
    duplicateSegmentNumbers.length > 0
  ) {
    const issues: string[] = [];

    if (missingPalilloCount > 0) {
      issues.push("tramos sin PALILLO");
    }

    if (invalidPalilloCount > 0) {
      issues.push("PALILLO inválidos");
    }

    if (duplicateSegmentNumbers.length > 0) {
      issues.push("números de tramo duplicados");
    }

    return {
      status: "review_data",
      statusLabel: formatTrameadoSheetValidationStatusLabel("review_data"),
      reason: `Revisa ${issues.join(", ")} antes de cerrar la hoja.`,
      confirmedSegmentCount,
      totalPalilloMm,
      totalPalilloM,
      invalidPalilloCount,
      missingPalilloCount,
      duplicateSegmentNumbers,
      duplicatePalilloLengths,
      hasReferenceLength: false,
      referencePipeLengthM: null,
      referencePipeLengthMm: null,
      referenceSource: null,
      deltaMm: null,
      deltaPct: null,
      warnings,
    };
  }

  const reference = pickPipeReferenceLengthFromTakeoffItems(takeoffItems);

  if (!reference) {
    return {
      status: "no_comparable",
      statusLabel: formatTrameadoSheetValidationStatusLabel("no_comparable"),
      reason: "No hay longitud de referencia clara en BOM.",
      confirmedSegmentCount,
      totalPalilloMm,
      totalPalilloM,
      invalidPalilloCount,
      missingPalilloCount,
      duplicateSegmentNumbers,
      duplicatePalilloLengths,
      hasReferenceLength: false,
      referencePipeLengthM: null,
      referencePipeLengthMm: null,
      referenceSource: null,
      deltaMm: null,
      deltaPct: null,
      warnings,
    };
  }

  const referencePipeLengthM = reference.referencePipeLengthM;
  const referencePipeLengthMm = referencePipeLengthM * 1000;
  const deltaMm = totalPalilloMm - referencePipeLengthMm;
  const deltaPct =
    referencePipeLengthMm > 0
      ? (Math.abs(deltaMm) / referencePipeLengthMm) * 100
      : null;
  const status =
    deltaPct == null ? "no_comparable" : resolveDeltaStatus(deltaPct);

  const reason =
    status === "reasonable"
      ? "La suma PALILLO está dentro de una tolerancia prudente respecto al BOM."
      : status === "review_delta"
        ? "La diferencia con el BOM merece revisión antes de cerrar la hoja."
        : "La diferencia con el BOM es elevada; revisa tramos y referencia.";

  return {
    status,
    statusLabel: formatTrameadoSheetValidationStatusLabel(status),
    reason,
    confirmedSegmentCount,
    totalPalilloMm,
    totalPalilloM,
    invalidPalilloCount,
    missingPalilloCount,
    duplicateSegmentNumbers,
    duplicatePalilloLengths,
    hasReferenceLength: true,
    referencePipeLengthM,
    referencePipeLengthMm,
    referenceSource: reference.referenceSource,
    deltaMm,
    deltaPct,
    warnings,
  };
}
