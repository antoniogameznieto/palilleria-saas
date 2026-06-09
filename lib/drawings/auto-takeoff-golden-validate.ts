/**
 * EXPERIMENTAL — Fase 15B
 * Validación de precisión/recall contra golden set etiquetado.
 */

import {
  normalizeTakeoffDescription,
  normalizeTakeoffUnit,
  quantitiesApproximatelyEqual,
} from "@/lib/drawings/experimental-auto-takeoff-compare";
import type { ExperimentalTakeoffCandidateRow } from "@/lib/drawings/experimental-auto-takeoff-parse";

export const DEFAULT_GOLDEN_HIGH_CONFIDENCE_THRESHOLD = 0.9;

export type GoldenExpectedRow = {
  reference?: string | null;
  quantity: string;
  unit?: string | null;
  descriptionContains: string;
};

export type GoldenCaseExemptions = {
  skipRecall?: boolean;
  skipPrecision?: boolean;
  skipNegativeCheck?: boolean;
  reason: string;
};

export type GoldenSetCase = {
  id: string;
  pdf: string;
  expectedHasBom: boolean;
  expectedTotalRows?: number | null;
  notes?: string;
  expectedRows: GoldenExpectedRow[];
  exemptions?: GoldenCaseExemptions;
};

export type GoldenSetDefinition = {
  version: number;
  thresholds: {
    recallMin: number;
    precisionMin: number;
    highConfidenceMin: number;
  };
  cases: GoldenSetCase[];
};

export type GoldenRowMatchResult = {
  expected: GoldenExpectedRow;
  matched: boolean;
  matchedSuggestionIndex: number | null;
};

export type GoldenCaseValidationResult = {
  id: string;
  pdf: string;
  expectedHasBom: boolean;
  expectedTotalRows: number | null;
  suggestedRowCount: number;
  hasBomDetected: boolean;
  rowMatches: GoldenRowMatchResult[];
  matchedCount: number;
  missingCount: number;
  recall: number | null;
  precision: number | null;
  unexpectedHighConfidenceCount: number;
  unexpectedHighConfidenceRows: ExperimentalTakeoffCandidateRow[];
  negativeViolation: boolean;
  notes?: string;
  exemptions?: GoldenCaseExemptions;
  error: string | null;
};

export type GoldenValidationSummary = {
  casesEvaluated: number;
  expectedRowsEvaluated: number;
  matchedExpectedRows: number;
  missingExpectedRows: number;
  aggregateRecall: number | null;
  aggregatePrecision: number | null;
  negativeCasesEvaluated: number;
  negativeViolations: number;
  thresholdFailures: string[];
  passed: boolean;
};

export type GoldenValidationReport = {
  cases: GoldenCaseValidationResult[];
  summary: GoldenValidationSummary;
};

function normalizeReference(reference: string | null | undefined): string | null {
  if (reference == null) {
    return null;
  }

  const trimmed = reference.trim();

  if (trimmed.length === 0 || trimmed === "-") {
    return null;
  }

  return trimmed;
}

function descriptionContainsNormalized(
  description: string | null | undefined,
  needle: string,
): boolean {
  const haystack = normalizeTakeoffDescription(description);
  const normalizedNeedle = normalizeTakeoffDescription(needle);

  if (normalizedNeedle.length === 0) {
    return false;
  }

  return haystack.includes(normalizedNeedle);
}

export function suggestionMatchesGoldenExpectedRow(
  suggestion: ExperimentalTakeoffCandidateRow,
  expected: GoldenExpectedRow,
): boolean {
  const expectedReference =
    expected.reference === undefined ? undefined : normalizeReference(expected.reference);
  const suggestionReference = normalizeReference(suggestion.reference);

  if (expectedReference !== undefined && expectedReference !== suggestionReference) {
    return false;
  }

  if (!quantitiesApproximatelyEqual(suggestion.quantity, expected.quantity)) {
    return false;
  }

  if (expected.unit != null) {
    const expectedUnit = normalizeTakeoffUnit(expected.unit);
    const suggestionUnit = normalizeTakeoffUnit(suggestion.unit);

    if (expectedUnit != null && suggestionUnit != expectedUnit) {
      return false;
    }
  }

  return descriptionContainsNormalized(
    suggestion.description,
    expected.descriptionContains,
  );
}

export function matchGoldenExpectedRows(params: {
  expectedRows: GoldenExpectedRow[];
  suggestions: ExperimentalTakeoffCandidateRow[];
}): GoldenRowMatchResult[] {
  const usedSuggestionIndexes = new Set<number>();
  const results: GoldenRowMatchResult[] = [];

  for (const expected of params.expectedRows) {
    let matchedSuggestionIndex: number | null = null;

    for (let index = 0; index < params.suggestions.length; index += 1) {
      if (usedSuggestionIndexes.has(index)) {
        continue;
      }

      if (suggestionMatchesGoldenExpectedRow(params.suggestions[index], expected)) {
        matchedSuggestionIndex = index;
        usedSuggestionIndexes.add(index);
        break;
      }
    }

    results.push({
      expected,
      matched: matchedSuggestionIndex != null,
      matchedSuggestionIndex,
    });
  }

  return results;
}

export function findUnexpectedHighConfidenceSuggestions(params: {
  suggestions: ExperimentalTakeoffCandidateRow[];
  rowMatches: GoldenRowMatchResult[];
  expectedTotalRows: number | null | undefined;
  highConfidenceThreshold: number;
}): ExperimentalTakeoffCandidateRow[] {
  if (params.expectedTotalRows != null) {
    if (params.suggestions.length > params.expectedTotalRows) {
      return params.suggestions
        .slice(params.expectedTotalRows)
        .filter(
          (suggestion) =>
            suggestion.confidence >= params.highConfidenceThreshold,
        );
    }

    return [];
  }

  const matchedIndexes = new Set(
    params.rowMatches
      .map((match) => match.matchedSuggestionIndex)
      .filter((index): index is number => index != null),
  );

  return params.suggestions.filter(
    (suggestion, index) =>
      !matchedIndexes.has(index) &&
      suggestion.confidence >= params.highConfidenceThreshold,
  );
}

export function validateGoldenCaseResult(params: {
  caseDef: GoldenSetCase;
  suggestions: ExperimentalTakeoffCandidateRow[];
  hasBomDetected: boolean;
  highConfidenceThreshold: number;
  error?: string | null;
}): GoldenCaseValidationResult {
  const { caseDef, suggestions, hasBomDetected, highConfidenceThreshold, error } =
    params;

  if (error) {
    return {
      id: caseDef.id,
      pdf: caseDef.pdf,
      expectedHasBom: caseDef.expectedHasBom,
      expectedTotalRows: caseDef.expectedTotalRows ?? null,
      suggestedRowCount: 0,
      hasBomDetected: false,
      rowMatches: [],
      matchedCount: 0,
      missingCount: caseDef.expectedRows.length,
      recall: null,
      precision: null,
      unexpectedHighConfidenceCount: 0,
      unexpectedHighConfidenceRows: [],
      negativeViolation: false,
      notes: caseDef.notes,
      exemptions: caseDef.exemptions,
      error,
    };
  }

  const rowMatches = matchGoldenExpectedRows({
    expectedRows: caseDef.expectedRows,
    suggestions,
  });
  const matchedCount = rowMatches.filter((match) => match.matched).length;
  const missingCount = rowMatches.length - matchedCount;
  const unexpectedHighConfidenceRows = !caseDef.expectedHasBom
    ? suggestions.filter(
        (suggestion) => suggestion.confidence >= highConfidenceThreshold,
      )
    : findUnexpectedHighConfidenceSuggestions({
        suggestions,
        rowMatches,
        expectedTotalRows: caseDef.expectedTotalRows,
        highConfidenceThreshold,
      });

  const recall =
    caseDef.expectedRows.length > 0
      ? Number((matchedCount / caseDef.expectedRows.length).toFixed(4))
      : null;

  const precision =
    caseDef.expectedTotalRows != null && caseDef.expectedTotalRows > 0
      ? suggestions.length === 0
        ? 0
        : Number(
            (
              1 -
              Math.max(0, suggestions.length - caseDef.expectedTotalRows) /
                suggestions.length
            ).toFixed(4),
          )
      : null;

  const negativeViolation =
    !caseDef.expectedHasBom &&
    unexpectedHighConfidenceRows.length > 0;

  return {
    id: caseDef.id,
    pdf: caseDef.pdf,
    expectedHasBom: caseDef.expectedHasBom,
    expectedTotalRows: caseDef.expectedTotalRows ?? null,
    suggestedRowCount: suggestions.length,
    hasBomDetected,
    rowMatches,
    matchedCount,
    missingCount,
    recall,
    precision,
    unexpectedHighConfidenceCount: unexpectedHighConfidenceRows.length,
    unexpectedHighConfidenceRows,
    negativeViolation,
    notes: caseDef.notes,
    exemptions: caseDef.exemptions,
    error: null,
  };
}

export function summarizeGoldenValidation(params: {
  cases: GoldenCaseValidationResult[];
  thresholds: GoldenSetDefinition["thresholds"];
}): GoldenValidationSummary {
  const { cases, thresholds } = params;
  const thresholdFailures: string[] = [];

  let expectedRowsEvaluated = 0;
  let matchedExpectedRows = 0;
  let recallEligibleExpected = 0;
  let recallEligibleMatched = 0;
  let precisionWeightedSum = 0;
  let precisionWeight = 0;
  let negativeCasesEvaluated = 0;
  let negativeViolations = 0;

  for (const caseResult of cases) {
    if (caseResult.error) {
      thresholdFailures.push(`${caseResult.id}: error de extracción (${caseResult.error})`);
      continue;
    }

    if (!caseResult.expectedHasBom) {
      negativeCasesEvaluated += 1;

      if (caseResult.exemptions?.skipNegativeCheck) {
        continue;
      }

      if (caseResult.negativeViolation) {
        negativeViolations += 1;
        thresholdFailures.push(
          `${caseResult.id}: PDF negativo con ${caseResult.unexpectedHighConfidenceCount} sugerencia(s) high-confidence`,
        );
      }

      continue;
    }

    expectedRowsEvaluated += caseResult.rowMatches.length;
    matchedExpectedRows += caseResult.matchedCount;

    if (!caseResult.exemptions?.skipRecall) {
      recallEligibleExpected += caseResult.rowMatches.length;
      recallEligibleMatched += caseResult.matchedCount;

      if (
        caseResult.recall != null &&
        caseResult.recall < thresholds.recallMin
      ) {
        thresholdFailures.push(
          `${caseResult.id}: recall ${caseResult.recall} < ${thresholds.recallMin}`,
        );
      }
    }

    if (
      caseResult.expectedTotalRows != null &&
      !caseResult.exemptions?.skipPrecision &&
      caseResult.precision != null
    ) {
      precisionWeightedSum += caseResult.precision;
      precisionWeight += 1;

      if (caseResult.precision < thresholds.precisionMin) {
        thresholdFailures.push(
          `${caseResult.id}: precision ${caseResult.precision} < ${thresholds.precisionMin}`,
        );
      }
    }
  }

  const aggregateRecall =
    recallEligibleExpected > 0
      ? Number((recallEligibleMatched / recallEligibleExpected).toFixed(4))
      : null;

  const aggregatePrecision =
    precisionWeight > 0
      ? Number((precisionWeightedSum / precisionWeight).toFixed(4))
      : null;

  if (
    aggregateRecall != null &&
    aggregateRecall < thresholds.recallMin
  ) {
    thresholdFailures.push(
      `recall agregado ${aggregateRecall} < ${thresholds.recallMin}`,
    );
  }

  if (
    aggregatePrecision != null &&
    aggregatePrecision < thresholds.precisionMin
  ) {
    thresholdFailures.push(
      `precision agregada ${aggregatePrecision} < ${thresholds.precisionMin}`,
    );
  }

  return {
    casesEvaluated: cases.length,
    expectedRowsEvaluated,
    matchedExpectedRows,
    missingExpectedRows: expectedRowsEvaluated - matchedExpectedRows,
    aggregateRecall,
    aggregatePrecision,
    negativeCasesEvaluated,
    negativeViolations,
    thresholdFailures: [...new Set(thresholdFailures)],
    passed: thresholdFailures.length === 0,
  };
}
