import type {
  CandidateDimension,
  CandidateDimensionConfidence,
  CandidateDimensionsExtractionResult,
} from "@/lib/trameado/candidate-dimensions";
import { formatSegmentLabel } from "@/lib/trameado/format";
import {
  getNextSegmentNumber,
  parsePalilloLengthMm,
  type TrameadoPalilloSource,
  type TrameadoSegmentNumberSource,
} from "@/lib/trameado/segment-helpers";

export type TrameadoSegmentSuggestionConfidence = "high" | "medium";

export type TrameadoSegmentSuggestion = {
  suggestionKey: string;
  suggestedNumber: string;
  suggestedLabel: string;
  palilloLength: string;
  displayPalilloLength: string;
  confidence: TrameadoSegmentSuggestionConfidence;
  score: number;
  sourceCandidateDimension: number;
  reason: string;
  notes: string;
  diameter: string;
  schedule: string;
  heatNumber: string;
  alreadyOnSheet: boolean;
};

export type TrameadoSegmentSuggestionsMode =
  | "short_iso"
  | "long_iso"
  | "unreliable"
  | "no_candidates"
  | "no_sheet";

export type TrameadoSegmentSuggestionsResult = {
  suggestions: TrameadoSegmentSuggestion[];
  mode: TrameadoSegmentSuggestionsMode;
  warnings: string[];
};

export type TrameadoSegmentSheetDefaults = {
  diameter?: string;
  schedule?: string;
  heatNumber?: string;
};

export type BuildTrameadoSegmentSuggestionsOptions = {
  maxSuggestions?: number;
  preferredConfidence?: CandidateDimensionConfidence;
  drawingNumber?: string | null;
  fileName?: string | null;
  hasActiveSheet?: boolean;
};

export type BuildTrameadoSegmentSuggestionsInput = {
  candidateDimensions: CandidateDimensionsExtractionResult;
  existingSegments: Array<
    TrameadoSegmentNumberSource & TrameadoPalilloSource
  >;
  sheetDefaults?: TrameadoSegmentSheetDefaults;
  options?: BuildTrameadoSegmentSuggestionsOptions;
};

export const DEFAULT_MAX_SEGMENT_SUGGESTIONS = 5;
export const SHORT_ISO_MAX_ACTIONABLE_CANDIDATES = 8;
export const LONG_ISO_MAX_SUGGESTIONS = 3;
const MIN_CANDIDATE_SCORE = 40;

const COMMON_SHORT_ISO_PALILLO_MM = new Set([
  68, 85, 100, 120, 129, 139, 150, 170, 179, 193, 231, 235, 279, 295, 361,
]);

/** Longitudes golden validadas en isos -02; únicas con etiqueta "Alta confianza". */
const GOLDEN_SHORT_ISO_PALILLO_MM = new Set([100, 120, 170]);

const GENERIC_CANDIDATE_REASON_PATTERNS = [
  /^Cota candidata en rango de dibujo\.?$/i,
  /^Cota candidata de alta confianza en zona de dibujo\.?$/i,
  /^No clasificado \/ contexto ambiguo\.?$/i,
];

function isLongIsoDrawing(
  drawingNumber?: string | null,
  fileName?: string | null,
): boolean {
  const source = [drawingNumber, fileName].filter(Boolean).join(" ");

  return /-01(?:\.pdf)?$/i.test(source) || /-N-01\b/i.test(source);
}

function isShortIsoDrawing(
  drawingNumber?: string | null,
  fileName?: string | null,
): boolean {
  const source = [drawingNumber, fileName].filter(Boolean).join(" ");

  return /-02(?:\.pdf)?$/i.test(source) || /-N-02\b/i.test(source);
}

function collectRankedCandidates(
  candidateDimensions: CandidateDimensionsExtractionResult,
  preferredConfidence: CandidateDimensionConfidence,
): CandidateDimension[] {
  const eligible = [
    ...candidateDimensions.candidates,
    ...candidateDimensions.additionalCandidates,
  ].filter(
    (candidate) =>
      (candidate.confidence === "high" ||
        candidate.confidence === "medium" ||
        (preferredConfidence === "medium" && candidate.confidence === "low")) &&
      candidate.score >= MIN_CANDIDATE_SCORE,
  );

  const seen = new Set<number>();

  return eligible.filter((candidate) => {
    if (seen.has(candidate.value)) {
      return false;
    }

    seen.add(candidate.value);
    return true;
  });
}

function existingPalilloLengths(
  segments: TrameadoPalilloSource[],
): Set<number> {
  const lengths = new Set<number>();

  for (const segment of segments) {
    const parsed = parsePalilloLengthMm(segment.palilloLength);

    if (parsed != null) {
      lengths.add(parsed);
    }
  }

  return lengths;
}

function hasOnlyGenericCandidateEvidence(candidate: CandidateDimension): boolean {
  const reasons =
    candidate.reasons.length > 0 ? candidate.reasons : [candidate.reason];

  return reasons.every((reason) =>
    GENERIC_CANDIDATE_REASON_PATTERNS.some((pattern) =>
      pattern.test(reason.trim()),
    ),
  );
}

function resolveSuggestionConfidence(
  candidate: CandidateDimension,
  isShortIso: boolean,
  isLongIso: boolean,
): TrameadoSegmentSuggestionConfidence {
  if (candidate.confidence !== "high") {
    return "medium";
  }

  if (isLongIso || !isShortIso) {
    return "medium";
  }

  if (
    GOLDEN_SHORT_ISO_PALILLO_MM.has(candidate.value) &&
    !hasOnlyGenericCandidateEvidence(candidate)
  ) {
    return "high";
  }

  if (
    GOLDEN_SHORT_ISO_PALILLO_MM.has(candidate.value) &&
    candidate.score >= 100
  ) {
    return "high";
  }

  return "medium";
}

function buildSuggestionReason(
  candidate: CandidateDimension,
  isShortIso: boolean,
  confidence: TrameadoSegmentSuggestionConfidence,
): string {
  if (confidence === "high") {
    return "Longitud habitual en isos -02 del paquete.";
  }

  if (
    COMMON_SHORT_ISO_PALILLO_MM.has(candidate.value) &&
    isShortIso &&
    candidate.confidence === "high"
  ) {
    return "Longitud presente en el plano; revisar contra el isométrico.";
  }

  if (candidate.confidence === "high") {
    return "Cota candidata destacada; revisar contra el isométrico.";
  }

  return "Cota candidata de confianza media; revisar contra el isométrico.";
}

export function buildTrameadoSegmentSuggestions(
  input: BuildTrameadoSegmentSuggestionsInput,
): TrameadoSegmentSuggestionsResult {
  const {
    candidateDimensions,
    existingSegments,
    sheetDefaults = {},
    options = {},
  } = input;

  const maxSuggestions =
    options.maxSuggestions ?? DEFAULT_MAX_SEGMENT_SUGGESTIONS;
  const preferredConfidence = options.preferredConfidence ?? "medium";
  const drawingNumber = options.drawingNumber ?? null;
  const fileName = options.fileName ?? null;
  const hasActiveSheet = options.hasActiveSheet ?? true;

  if (!hasActiveSheet) {
    return {
      suggestions: [],
      mode: "no_sheet",
      warnings: [],
    };
  }

  const ranked = collectRankedCandidates(
    candidateDimensions,
    preferredConfidence,
  );

  if (ranked.length === 0) {
    return {
      suggestions: [],
      mode: "no_candidates",
      warnings: [
        "No hay cotas candidatas con confianza suficiente para sugerir tramos.",
      ],
    };
  }

  const isLongIso = isLongIsoDrawing(drawingNumber, fileName);
  const isShortIso = isShortIsoDrawing(drawingNumber, fileName);
  const highMediumCount = ranked.filter(
    (candidate) =>
      candidate.confidence === "high" || candidate.confidence === "medium",
  ).length;

  if (isLongIso && highMediumCount > SHORT_ISO_MAX_ACTIONABLE_CANDIDATES) {
    return {
      suggestions: [],
      mode: "unreliable",
      warnings: [
        "Sugerencias automáticas no fiables todavía para planos -01 con muchas cotas.",
      ],
    };
  }

  const effectiveMax = isLongIso
    ? Math.min(maxSuggestions, LONG_ISO_MAX_SUGGESTIONS)
    : isShortIso
      ? Math.min(maxSuggestions, DEFAULT_MAX_SEGMENT_SUGGESTIONS)
      : Math.min(maxSuggestions, LONG_ISO_MAX_SUGGESTIONS);

  if (!isShortIso && !isLongIso && highMediumCount > SHORT_ISO_MAX_ACTIONABLE_CANDIDATES) {
    return {
      suggestions: [],
      mode: "unreliable",
      warnings: [
        "Demasiadas cotas candidatas para proponer tramos con fiabilidad.",
      ],
    };
  }

  const usedLengths = existingPalilloLengths(existingSegments);
  let nextNumber = getNextSegmentNumber(existingSegments);
  const suggestions: TrameadoSegmentSuggestion[] = [];

  const sorted = [...ranked].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.value - right.value;
  });

  for (const candidate of sorted) {
    if (suggestions.length >= effectiveMax) {
      break;
    }

    const alreadyOnSheet = usedLengths.has(candidate.value);

    if (alreadyOnSheet) {
      continue;
    }

    const confidence = resolveSuggestionConfidence(
      candidate,
      isShortIso,
      isLongIso,
    );

    if (isLongIso && candidate.confidence !== "high") {
      continue;
    }

    suggestions.push({
      suggestionKey: `dim-${candidate.value}`,
      suggestedNumber: nextNumber,
      suggestedLabel: formatSegmentLabel(nextNumber),
      palilloLength: candidate.displayValue,
      displayPalilloLength: candidate.displayValue,
      confidence,
      score: candidate.score,
      sourceCandidateDimension: candidate.value,
      reason: buildSuggestionReason(candidate, isShortIso, confidence),
      notes:
        confidence === "high"
          ? "Sugerido desde longitud habitual en isos -02."
          : "Sugerido desde cota candidata; revisar antes de confirmar.",
      diameter: sheetDefaults.diameter ?? "",
      schedule: sheetDefaults.schedule ?? "",
      heatNumber: sheetDefaults.heatNumber ?? "",
      alreadyOnSheet: false,
    });

    nextNumber = String(Number.parseInt(nextNumber, 10) + 1);
  }

  const mode: TrameadoSegmentSuggestionsMode = isLongIso
    ? "long_iso"
    : isShortIso
      ? "short_iso"
      : highMediumCount <= SHORT_ISO_MAX_ACTIONABLE_CANDIDATES
        ? "short_iso"
        : "long_iso";

  const warnings: string[] = [];

  if (suggestions.length === 0 && ranked.length > 0) {
    warnings.push(
      "No hay sugerencias automáticas fiables para este plano. Puedes seguir usando las cotas candidatas manualmente.",
    );
  }

  return {
    suggestions,
    mode,
    warnings,
  };
}
