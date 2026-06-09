/**
 * EXPERIMENTAL — Fase 15C
 * Validación de precisión de negocio: BOM extraído vs palillería esperada.
 */

import {
  normalizeTakeoffDescription,
  normalizeTakeoffUnit,
  quantitiesApproximatelyEqual,
} from "@/lib/drawings/experimental-auto-takeoff-compare";
import type { ExperimentalTakeoffCandidateRow } from "@/lib/drawings/experimental-auto-takeoff-parse";

export const BUSINESS_CATEGORIES = [
  "pipe",
  "flange",
  "valve",
  "fitting",
  "bolt",
  "gasket",
  "blind",
  "support",
  "other",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export type BusinessExpectedRow = {
  reference?: string | null;
  quantity: string;
  unit?: string | null;
  descriptionContains: string;
  category: BusinessCategory;
  businessRequired: boolean;
  bomExtractable?: boolean;
  notes?: string;
};

export type BusinessSetCase = {
  id: string;
  pdf: string;
  notes?: string;
  comments?: string;
  expectedBusinessRows: BusinessExpectedRow[];
};

export type BusinessSetDefinition = {
  version: number;
  pdfBaseDir: string;
  cases: BusinessSetCase[];
};

export type BusinessRowMatchResult = {
  expected: BusinessExpectedRow;
  matched: boolean;
  matchedSuggestionIndex: number | null;
  source: "bom" | "outside_bom";
};

export type ExtractedRowClassification = {
  suggestion: ExperimentalTakeoffCandidateRow;
  suggestionIndex: number;
  matchedBusinessRow: BusinessExpectedRow | null;
  usefulForTakeoff: boolean;
  bomCorrectNotUseful: boolean;
};

export type BusinessCategoryCoverage = {
  category: BusinessCategory;
  requiredCount: number;
  matchedCount: number;
  recall: number | null;
};

export type BusinessCaseValidationResult = {
  id: string;
  pdf: string;
  notes?: string;
  comments?: string;
  suggestedRowCount: number;
  businessExpectedCount: number;
  businessRequiredCount: number;
  businessRequiredBomExtractableCount: number;
  matchedBusinessRequired: number;
  matchedBusinessRequiredFromBom: number;
  missingBusinessRequired: number;
  missingOutsideBom: number;
  extractedNotBusinessRequired: number;
  businessRecall: number | null;
  businessRecallFromBom: number | null;
  extractionUtility: number | null;
  rowMatches: BusinessRowMatchResult[];
  extractedClassifications: ExtractedRowClassification[];
  categoryCoverage: BusinessCategoryCoverage[];
  error: string | null;
};

export type BusinessValidationSummary = {
  pdfsEvaluated: number;
  businessExpectedRows: number;
  businessRequiredRows: number;
  matchedBusinessRequired: number;
  missingBusinessRequired: number;
  extractedNotBusinessRequired: number;
  totalExtractedRows: number;
  usefulExtractedRows: number;
  aggregateBusinessRecall: number | null;
  aggregateBusinessRecallFromBom: number | null;
  aggregateExtractionUtility: number | null;
  categoryCoverage: BusinessCategoryCoverage[];
  outsideBomGaps: string[];
};

export type BusinessValidationReport = {
  cases: BusinessCaseValidationResult[];
  summary: BusinessValidationSummary;
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

export function suggestionMatchesBusinessExpectedRow(
  suggestion: ExperimentalTakeoffCandidateRow,
  expected: BusinessExpectedRow,
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

export function matchBusinessExpectedRows(params: {
  expectedRows: BusinessExpectedRow[];
  suggestions: ExperimentalTakeoffCandidateRow[];
}): BusinessRowMatchResult[] {
  const usedSuggestionIndexes = new Set<number>();

  return params.expectedRows.map((expected) => {
    let matchedSuggestionIndex: number | null = null;

    for (let index = 0; index < params.suggestions.length; index += 1) {
      if (usedSuggestionIndexes.has(index)) {
        continue;
      }

      if (suggestionMatchesBusinessExpectedRow(params.suggestions[index], expected)) {
        matchedSuggestionIndex = index;
        usedSuggestionIndexes.add(index);
        break;
      }
    }

    const bomExtractable = expected.bomExtractable !== false;

    return {
      expected,
      matched: matchedSuggestionIndex != null,
      matchedSuggestionIndex,
      source: bomExtractable ? "bom" : "outside_bom",
    };
  });
}

export function classifyExtractedRows(params: {
  suggestions: ExperimentalTakeoffCandidateRow[];
  rowMatches: BusinessRowMatchResult[];
}): ExtractedRowClassification[] {
  const matchedBusinessBySuggestion = new Map<number, BusinessExpectedRow>();

  for (const match of params.rowMatches) {
    if (match.matchedSuggestionIndex != null) {
      matchedBusinessBySuggestion.set(
        match.matchedSuggestionIndex,
        match.expected,
      );
    }
  }

  return params.suggestions.map((suggestion, suggestionIndex) => {
    const matchedBusinessRow =
      matchedBusinessBySuggestion.get(suggestionIndex) ?? null;

    const usefulForTakeoff =
      matchedBusinessRow != null &&
      matchedBusinessRow.businessRequired &&
      matchedBusinessRow.bomExtractable !== false;

    const bomCorrectNotUseful =
      matchedBusinessRow != null &&
      !matchedBusinessRow.businessRequired &&
      matchedBusinessRow.bomExtractable !== false;

    return {
      suggestion,
      suggestionIndex,
      matchedBusinessRow,
      usefulForTakeoff,
      bomCorrectNotUseful,
    };
  });
}

function buildCategoryCoverage(
  rowMatches: BusinessRowMatchResult[],
): BusinessCategoryCoverage[] {
  const byCategory = new Map<BusinessCategory, { required: number; matched: number }>();

  for (const category of BUSINESS_CATEGORIES) {
    byCategory.set(category, { required: 0, matched: 0 });
  }

  for (const match of rowMatches) {
    if (!match.expected.businessRequired) {
      continue;
    }

    const bucket = byCategory.get(match.expected.category)!;
    bucket.required += 1;

    if (match.matched) {
      bucket.matched += 1;
    }
  }

  return BUSINESS_CATEGORIES.map((category) => {
    const bucket = byCategory.get(category)!;

    return {
      category,
      requiredCount: bucket.required,
      matchedCount: bucket.matched,
      recall:
        bucket.required > 0
          ? Number((bucket.matched / bucket.required).toFixed(4))
          : null,
    };
  }).filter((entry) => entry.requiredCount > 0);
}

export function validateBusinessCaseResult(params: {
  caseDef: BusinessSetCase;
  suggestions: ExperimentalTakeoffCandidateRow[];
  error?: string | null;
}): BusinessCaseValidationResult {
  const { caseDef, suggestions, error } = params;

  if (error) {
    return {
      id: caseDef.id,
      pdf: caseDef.pdf,
      notes: caseDef.notes,
      comments: caseDef.comments,
      suggestedRowCount: 0,
      businessExpectedCount: caseDef.expectedBusinessRows.length,
      businessRequiredCount: 0,
      businessRequiredBomExtractableCount: 0,
      matchedBusinessRequired: 0,
      matchedBusinessRequiredFromBom: 0,
      missingBusinessRequired: 0,
      missingOutsideBom: 0,
      extractedNotBusinessRequired: 0,
      businessRecall: null,
      businessRecallFromBom: null,
      extractionUtility: null,
      rowMatches: [],
      extractedClassifications: [],
      categoryCoverage: [],
      error,
    };
  }

  const rowMatches = matchBusinessExpectedRows({
    expectedRows: caseDef.expectedBusinessRows,
    suggestions,
  });
  const extractedClassifications = classifyExtractedRows({
    suggestions,
    rowMatches,
  });

  const requiredMatches = rowMatches.filter(
    (match) => match.expected.businessRequired,
  );
  const requiredBomMatches = requiredMatches.filter(
    (match) => match.expected.bomExtractable !== false,
  );
  const matchedBusinessRequired = requiredMatches.filter((match) => match.matched).length;
  const matchedBusinessRequiredFromBom = requiredBomMatches.filter(
    (match) => match.matched,
  ).length;
  const missingOutsideBom = requiredMatches.filter(
    (match) =>
      match.expected.bomExtractable === false && !match.matched,
  ).length;
  const extractedNotBusinessRequired = extractedClassifications.filter(
    (row) => row.bomCorrectNotUseful,
  ).length;
  const usefulExtracted = extractedClassifications.filter(
    (row) => row.usefulForTakeoff,
  ).length;

  return {
    id: caseDef.id,
    pdf: caseDef.pdf,
    notes: caseDef.notes,
    comments: caseDef.comments,
    suggestedRowCount: suggestions.length,
    businessExpectedCount: caseDef.expectedBusinessRows.length,
    businessRequiredCount: requiredMatches.length,
    businessRequiredBomExtractableCount: requiredBomMatches.length,
    matchedBusinessRequired,
    matchedBusinessRequiredFromBom,
    missingBusinessRequired: requiredMatches.length - matchedBusinessRequired,
    missingOutsideBom,
    extractedNotBusinessRequired,
    businessRecall:
      requiredMatches.length > 0
        ? Number((matchedBusinessRequired / requiredMatches.length).toFixed(4))
        : null,
    businessRecallFromBom:
      requiredBomMatches.length > 0
        ? Number(
            (matchedBusinessRequiredFromBom / requiredBomMatches.length).toFixed(4),
          )
        : null,
    extractionUtility:
      suggestions.length > 0
        ? Number((usefulExtracted / suggestions.length).toFixed(4))
        : null,
    rowMatches,
    extractedClassifications,
    categoryCoverage: buildCategoryCoverage(rowMatches),
    error: null,
  };
}

function mergeCategoryCoverage(
  cases: BusinessCaseValidationResult[],
): BusinessCategoryCoverage[] {
  const totals = new Map<BusinessCategory, { required: number; matched: number }>();

  for (const caseResult of cases) {
    for (const entry of caseResult.categoryCoverage) {
      const bucket = totals.get(entry.category) ?? { required: 0, matched: 0 };
      bucket.required += entry.requiredCount;
      bucket.matched += entry.matchedCount;
      totals.set(entry.category, bucket);
    }
  }

  return [...totals.entries()]
    .map(([category, bucket]) => ({
      category,
      requiredCount: bucket.required,
      matchedCount: bucket.matched,
      recall:
        bucket.required > 0
          ? Number((bucket.matched / bucket.required).toFixed(4))
          : null,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function summarizeBusinessValidation(
  cases: BusinessCaseValidationResult[],
): BusinessValidationSummary {
  let businessExpectedRows = 0;
  let businessRequiredRows = 0;
  let matchedBusinessRequired = 0;
  let matchedBusinessRequiredFromBom = 0;
  let businessRequiredBomExtractable = 0;
  let extractedNotBusinessRequired = 0;
  let totalExtractedRows = 0;
  let usefulExtractedRows = 0;
  const outsideBomGaps: string[] = [];

  for (const caseResult of cases) {
    if (caseResult.error) {
      continue;
    }

    businessExpectedRows += caseResult.businessExpectedCount;
    businessRequiredRows += caseResult.businessRequiredCount;
    matchedBusinessRequired += caseResult.matchedBusinessRequired;
    matchedBusinessRequiredFromBom += caseResult.matchedBusinessRequiredFromBom;
    businessRequiredBomExtractable += caseResult.businessRequiredBomExtractableCount;
    extractedNotBusinessRequired += caseResult.extractedNotBusinessRequired;
    totalExtractedRows += caseResult.suggestedRowCount;
    usefulExtractedRows += caseResult.extractedClassifications.filter(
      (row) => row.usefulForTakeoff,
    ).length;

    for (const match of caseResult.rowMatches) {
      if (
        match.expected.businessRequired &&
        match.expected.bomExtractable === false &&
        !match.matched
      ) {
        outsideBomGaps.push(
          `${caseResult.id}: ${match.expected.descriptionContains} (${match.expected.category})`,
        );
      }
    }
  }

  return {
    pdfsEvaluated: cases.length,
    businessExpectedRows,
    businessRequiredRows,
    matchedBusinessRequired,
    missingBusinessRequired: businessRequiredRows - matchedBusinessRequired,
    extractedNotBusinessRequired,
    totalExtractedRows,
    usefulExtractedRows,
    aggregateBusinessRecall:
      businessRequiredRows > 0
        ? Number((matchedBusinessRequired / businessRequiredRows).toFixed(4))
        : null,
    aggregateBusinessRecallFromBom:
      businessRequiredBomExtractable > 0
        ? Number(
            (matchedBusinessRequiredFromBom / businessRequiredBomExtractable).toFixed(
              4,
            ),
          )
        : null,
    aggregateExtractionUtility:
      totalExtractedRows > 0
        ? Number((usefulExtractedRows / totalExtractedRows).toFixed(4))
        : null,
    categoryCoverage: mergeCategoryCoverage(cases),
    outsideBomGaps,
  };
}
