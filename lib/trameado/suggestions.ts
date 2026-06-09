import { normalizeDiameter, normalizeSchedule } from "@/lib/trameado/format";
import { buildSuggestedLineIdentifier } from "@/lib/trameado/suggest-line-identifier";

export type TrameadoSheetSuggestionSource =
  | "metadata"
  | "metadata_bom"
  | "bom"
  | "pair_pattern"
  | "related_drawing";

export type TrameadoSheetSuggestionConfidence = "high" | "medium" | "low";

export type TrameadoSheetSuggestion = {
  suggestionKey: string;
  lineIdentifier: string;
  lineClass: string | null;
  diameter: string | null;
  schedule: string | null;
  source: TrameadoSheetSuggestionSource;
  confidence: TrameadoSheetSuggestionConfidence;
  reason: string;
  warnings: string[];
  alreadyExists: boolean;
  notes: string | null;
};

export type TrameadoSuggestionTakeoffItem = {
  description: string;
  reference: string | null;
  unit: string | null;
};

export type TrameadoSuggestionDrawingMetadata = {
  id: string;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
};

export type BuildTrameadoSheetSuggestionsInput = {
  drawing: TrameadoSuggestionDrawingMetadata;
  takeoffItems: TrameadoSuggestionTakeoffItem[];
  existingLineIdentifiers: string[];
  relatedDrawings?: TrameadoSuggestionDrawingMetadata[];
};

const HL_LINE_CLASS_PATTERN = /^HL-[A-Z0-9]+-([A-Z0-9]+)-[A-Z]-0\d$/i;
const HL_LINE_IDENTIFIER_PATTERN = /\b(HL-[A-Z0-9]+-[A-Z0-9]+-[A-Z]-0\d)\b/i;
const HL_DRAWING_SUFFIX_PATTERN = /HL-([A-Z0-9]+)-0(\d)\b/i;
const PAIR_SUFFIX_PATTERN = /^(HL-[A-Z0-9]+-[A-Z0-9]+-[A-Z]-)01$/i;

const DIAMETER_PATTERN = /\d+(?:\/\d+)?"/g;
const SCHEDULE_EXPLICIT_PATTERN = /\bSCH\.?\s*(40|80)\b/gi;
const PIPE_KEYWORD_PATTERN =
  /\b(tuber[ií]a|pipe|tubo|spool|cañer[ií]a)\b/i;

const PAIR_02_DEFAULT_DIAMETER = '3/4"';
const PAIR_02_DEFAULT_SCHEDULE = "80";

function normalizeLineIdentifier(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const hlMatch = trimmed.match(HL_LINE_IDENTIFIER_PATTERN);

  if (hlMatch?.[1]) {
    return hlMatch[1].toUpperCase();
  }

  return trimmed;
}

function buildSuggestionKey(lineIdentifier: string): string {
  return lineIdentifier.trim().toLowerCase();
}

function normalizeExistingIdentifiers(existingLineIdentifiers: string[]): Set<string> {
  return new Set(
    existingLineIdentifiers.map((identifier) => identifier.trim().toLowerCase()),
  );
}

export function deriveLineClassFromIdentifier(
  lineIdentifier: string,
): string | null {
  const match = lineIdentifier.trim().match(HL_LINE_CLASS_PATTERN);

  if (!match?.[1]) {
    return null;
  }

  return match[1].toUpperCase();
}

export function detectDiameterFromText(text: string): string[] {
  const matches = text.match(DIAMETER_PATTERN) ?? [];

  return [...new Set(matches.map((match) => normalizeDiameter(match)))];
}

export function detectScheduleFromText(text: string): string[] {
  const schedules = new Set<string>();

  for (const match of text.matchAll(SCHEDULE_EXPLICIT_PATTERN)) {
    const value = match[1];

    if (value) {
      schedules.add(normalizeSchedule(value));
    }
  }

  if (PIPE_KEYWORD_PATTERN.test(text)) {
    for (const match of text.matchAll(/\b(40|80)\b/g)) {
      schedules.add(normalizeSchedule(match[1]!));
    }
  }

  return [...schedules];
}

function isLikelyPipeItem(text: string): boolean {
  return (
    PIPE_KEYWORD_PATTERN.test(text) ||
    (DIAMETER_PATTERN.test(text) && SCHEDULE_EXPLICIT_PATTERN.test(text))
  );
}

function scorePipeItem(text: string, diameter: string, schedule: string | null): number {
  let score = 0;

  if (PIPE_KEYWORD_PATTERN.test(text)) {
    score += 4;
  }

  if (diameter) {
    score += 3;
  }

  if (schedule) {
    score += 2;
  }

  if (/\b4"/.test(diameter)) {
    score += 1;
  }

  return score;
}

export function pickBestPipeHintsFromTakeoffItems(
  takeoffItems: TrameadoSuggestionTakeoffItem[],
): {
  diameter: string;
  schedule: string | null;
  reason: string;
} | null {
  const candidates = takeoffItems
    .map((item) => {
      const text = `${item.description} ${item.reference ?? ""}`.trim();

      if (!isLikelyPipeItem(text)) {
        return null;
      }

      const diameters = detectDiameterFromText(text);
      const schedules = detectScheduleFromText(text);
      const diameter = diameters[0] ?? null;

      if (!diameter) {
        return null;
      }

      const schedule = schedules[0] ?? null;

      return {
        diameter,
        schedule,
        score: scorePipeItem(text, diameter, schedule),
        reason: item.description.trim(),
      };
    })
    .filter((candidate) => candidate !== null)
    .sort((left, right) => right.score - left.score);

  const best = candidates[0];

  if (!best) {
    return null;
  }

  return {
    diameter: best.diameter,
    schedule: best.schedule,
    reason: best.reason,
  };
}

export function buildAssistantSheetNotes(
  diameter: string | null,
  schedule: string | null,
): string | null {
  if (!diameter && !schedule) {
    return null;
  }

  const parts = ["Asistente BOM/metadatos"];

  if (diameter) {
    parts.push(`Ø ${diameter}`);
  }

  if (schedule) {
    parts.push(`SCH ${schedule}`);
  }

  parts.push("Introduce las longitudes PALILLO manualmente.");

  return parts.join(" · ");
}

function resolvePrimaryLineIdentifier(
  drawing: TrameadoSuggestionDrawingMetadata,
): {
  lineIdentifier: string | null;
  source: TrameadoSheetSuggestionSource;
  confidence: TrameadoSheetSuggestionConfidence;
  reason: string;
} {
  const fromLineNumber = normalizeLineIdentifier(drawing.lineNumber);

  if (fromLineNumber) {
    return {
      lineIdentifier: fromLineNumber,
      source: "metadata",
      confidence: HL_LINE_IDENTIFIER_PATTERN.test(fromLineNumber)
        ? "high"
        : "medium",
      reason: "Identificador ISO desde metadatos del plano (lineNumber).",
    };
  }

  const fromDrawingNumber = normalizeLineIdentifier(drawing.drawingNumber);

  if (fromDrawingNumber) {
    return {
      lineIdentifier: fromDrawingNumber,
      source: "metadata",
      confidence: HL_LINE_IDENTIFIER_PATTERN.test(fromDrawingNumber)
        ? "high"
        : "medium",
      reason: "Identificador ISO desde metadatos del plano (drawingNumber).",
    };
  }

  const suggested = buildSuggestedLineIdentifier({
    drawingNumber: drawing.drawingNumber,
    lineNumber: drawing.lineNumber,
    revision: drawing.revision,
  });

  if (suggested) {
    return {
      lineIdentifier: suggested,
      source: "metadata",
      confidence: "low",
      reason: "Identificador compuesto desde metadatos parciales del plano.",
    };
  }

  return {
    lineIdentifier: null,
    source: "metadata",
    confidence: "low",
    reason: "Sin identificador ISO claro en metadatos.",
  };
}

function relatedDrawingSupportsPair(
  relatedDrawings: TrameadoSuggestionDrawingMetadata[],
  pairIdentifier: string,
): boolean {
  const pairSuffix = pairIdentifier.match(/-0(\d)$/i)?.[1];

  if (!pairSuffix) {
    return false;
  }

  return relatedDrawings.some((relatedDrawing) => {
    const values = [relatedDrawing.lineNumber, relatedDrawing.drawingNumber]
      .filter(Boolean)
      .map((value) => value!.trim());

    return values.some((value) => {
      if (normalizeLineIdentifier(value) === pairIdentifier) {
        return true;
      }

      return (
        HL_DRAWING_SUFFIX_PATTERN.test(value) &&
        value.endsWith(`-0${pairSuffix}`)
      );
    });
  });
}

function takeoffSupportsPair02(
  takeoffItems: TrameadoSuggestionTakeoffItem[],
): boolean {
  return takeoffItems.some((item) => {
    const text = `${item.description} ${item.reference ?? ""}`;

    return detectDiameterFromText(text).includes(PAIR_02_DEFAULT_DIAMETER);
  });
}

function buildPairSuggestion(
  primaryIdentifier: string,
  primaryLineClass: string | null,
  relatedDrawings: TrameadoSuggestionDrawingMetadata[],
  takeoffItems: TrameadoSuggestionTakeoffItem[],
  existingIdentifiers: Set<string>,
): TrameadoSheetSuggestion | null {
  const pairMatch = primaryIdentifier.match(PAIR_SUFFIX_PATTERN);

  if (!pairMatch?.[1]) {
    return null;
  }

  const pairIdentifier = `${pairMatch[1]}02`;
  const hasRelatedDrawing = relatedDrawingSupportsPair(
    relatedDrawings,
    pairIdentifier,
  );
  const hasSmallBorePipe = takeoffSupportsPair02(takeoffItems);

  if (!hasRelatedDrawing && !hasSmallBorePipe) {
    return null;
  }

  const warnings: string[] = [];

  if (!hasRelatedDrawing) {
    warnings.push(
      "Pareja -02 sugerida por patrón típico y tubería 3/4\" en BOM; verifica en isométrico.",
    );
  }

  return {
    suggestionKey: buildSuggestionKey(pairIdentifier),
    lineIdentifier: pairIdentifier,
    lineClass: primaryLineClass,
    diameter: PAIR_02_DEFAULT_DIAMETER,
    schedule: PAIR_02_DEFAULT_SCHEDULE,
    source: hasRelatedDrawing ? "related_drawing" : "pair_pattern",
    confidence: hasRelatedDrawing ? "high" : "medium",
    reason: hasRelatedDrawing
      ? "Plano relacionado -02 detectado en el mismo trabajo."
      : "Patrón típico -02 con tubería 3/4\" SCH 80 en BOM.",
    warnings,
    alreadyExists: existingIdentifiers.has(buildSuggestionKey(pairIdentifier)),
    notes: buildAssistantSheetNotes(PAIR_02_DEFAULT_DIAMETER, PAIR_02_DEFAULT_SCHEDULE),
  };
}

function buildPrimarySuggestion(
  input: BuildTrameadoSheetSuggestionsInput,
  existingIdentifiers: Set<string>,
): TrameadoSheetSuggestion | null {
  const resolved = resolvePrimaryLineIdentifier(input.drawing);

  if (!resolved.lineIdentifier) {
    return null;
  }

  const pipeHints = pickBestPipeHintsFromTakeoffItems(input.takeoffItems);
  const lineClass = deriveLineClassFromIdentifier(resolved.lineIdentifier);
  const warnings: string[] = [];

  let source = resolved.source;
  let confidence = resolved.confidence;
  let reason = resolved.reason;

  if (pipeHints) {
    source = "metadata_bom";
    confidence = confidence === "high" ? "high" : "medium";
    reason = `${resolved.reason} Ø/SCH desde BOM: ${pipeHints.reason}`;
  } else if (input.takeoffItems.length > 0) {
    warnings.push(
      "Hay líneas de palillería/BOM pero no se detectó tubería con Ø/SCH claros.",
    );
  } else {
    warnings.push(
      "Sin BOM importada; revisa Ø y SCH manualmente al añadir tramos.",
    );
  }

  return {
    suggestionKey: buildSuggestionKey(resolved.lineIdentifier),
    lineIdentifier: resolved.lineIdentifier,
    lineClass,
    diameter: pipeHints?.diameter ?? null,
    schedule: pipeHints?.schedule ?? null,
    source,
    confidence,
    reason,
    warnings,
    alreadyExists: existingIdentifiers.has(
      buildSuggestionKey(resolved.lineIdentifier),
    ),
    notes: buildAssistantSheetNotes(
      pipeHints?.diameter ?? null,
      pipeHints?.schedule ?? null,
    ),
  };
}

export function dedupeTrameadoSheetSuggestions(
  suggestions: TrameadoSheetSuggestion[],
): TrameadoSheetSuggestion[] {
  const seen = new Set<string>();
  const deduped: TrameadoSheetSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = buildSuggestionKey(suggestion.lineIdentifier);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(suggestion);
  }

  return deduped;
}

export function buildTrameadoSheetSuggestions(
  input: BuildTrameadoSheetSuggestionsInput,
): TrameadoSheetSuggestion[] {
  const existingIdentifiers = normalizeExistingIdentifiers(
    input.existingLineIdentifiers,
  );
  const relatedDrawings = input.relatedDrawings ?? [];

  const primary = buildPrimarySuggestion(input, existingIdentifiers);

  if (!primary) {
    return [];
  }

  const suggestions = [primary];

  const pairSuggestion = buildPairSuggestion(
    primary.lineIdentifier,
    primary.lineClass,
    relatedDrawings,
    input.takeoffItems,
    existingIdentifiers,
  );

  if (pairSuggestion) {
    suggestions.push(pairSuggestion);
  }

  return dedupeTrameadoSheetSuggestions(suggestions);
}

export function getCreatableTrameadoSheetSuggestions(
  suggestions: TrameadoSheetSuggestion[],
): TrameadoSheetSuggestion[] {
  return suggestions.filter((suggestion) => !suggestion.alreadyExists);
}

export function shouldShowTrameadoSheetAssistant(
  suggestions: TrameadoSheetSuggestion[],
  sheetCount: number,
): boolean {
  const creatable = getCreatableTrameadoSheetSuggestions(suggestions);

  if (creatable.length === 0) {
    return false;
  }

  return sheetCount === 0 || creatable.length > 0;
}
