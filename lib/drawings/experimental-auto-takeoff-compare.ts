/**
 * EXPERIMENTAL — Fase 14C
 * Comparación conservadora entre sugerencias del PDF y palillería existente.
 * Solo lectura; no modifica datos.
 */

export type TakeoffComparisonStatus =
  | "matched"
  | "missing"
  | "differentQuantity"
  | "uncertain";

export type SuggestedTakeoffCompareInput = {
  item: number | null;
  reference: string | null;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  confidence: number;
};

export type ExistingTakeoffCompareInput = {
  reference: string | null;
  description: string;
  quantity: string;
  unit: string | null;
};

export type ComparedSuggestedTakeoffItem = SuggestedTakeoffCompareInput & {
  comparisonStatus: TakeoffComparisonStatus;
};

export type TakeoffComparisonSummary = {
  matchedCount: number;
  missingCount: number;
  differentQuantityCount: number;
  uncertainCount: number;
};

export type TakeoffComparisonResult = {
  items: ComparedSuggestedTakeoffItem[];
  summary: TakeoffComparisonSummary;
};

const MIN_DESCRIPTION_MATCH_LENGTH = 16;
const QUANTITY_TOLERANCE = 0.02;
const LOW_CONFIDENCE_THRESHOLD = 0.55;

function normalizeReference(reference: string | null | undefined): string | null {
  if (reference == null) {
    return null;
  }

  const trimmed = reference.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeTakeoffUnit(unit: string | null | undefined): string | null {
  if (unit == null) {
    return null;
  }

  const normalized = unit.trim().toLowerCase();

  if (normalized.length === 0) {
    return null;
  }

  if (normalized === "m" || normalized === "mt" || normalized === "metros") {
    return "m";
  }

  if (
    normalized === "ud" ||
    normalized === "u" ||
    normalized === "pcs" ||
    normalized === "un" ||
    normalized === "unidad"
  ) {
    return "ud";
  }

  return normalized;
}

export function normalizeTakeoffDescription(
  description: string | null | undefined,
): string {
  if (description == null) {
    return "";
  }

  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s".,#+/\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseQuantity(value: string | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function quantitiesApproximatelyEqual(
  left: string | null | undefined,
  right: string | null | undefined,
  tolerance = QUANTITY_TOLERANCE,
): boolean {
  const leftValue = parseQuantity(left);
  const rightValue = parseQuantity(right);

  if (leftValue == null || rightValue == null) {
    return false;
  }

  if (leftValue === rightValue) {
    return true;
  }

  return Math.abs(leftValue - rightValue) <= tolerance;
}

function unitsCompatible(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const leftUnit = normalizeTakeoffUnit(left);
  const rightUnit = normalizeTakeoffUnit(right);

  if (leftUnit == null || rightUnit == null) {
    return true;
  }

  return leftUnit === rightUnit;
}

function descriptionsStronglyMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const normalizedLeft = normalizeTakeoffDescription(left);
  const normalizedRight = normalizeTakeoffDescription(right);

  if (
    normalizedLeft.length < MIN_DESCRIPTION_MATCH_LENGTH ||
    normalizedRight.length < MIN_DESCRIPTION_MATCH_LENGTH
  ) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const shorter =
    normalizedLeft.length <= normalizedRight.length
      ? normalizedLeft
      : normalizedRight;
  const longer =
    normalizedLeft.length > normalizedRight.length
      ? normalizedLeft
      : normalizedRight;

  return longer.includes(shorter) && shorter.length >= MIN_DESCRIPTION_MATCH_LENGTH;
}

type ExistingCandidate = {
  index: number;
  item: ExistingTakeoffCompareInput;
};

function findReferenceMatches(
  suggestion: SuggestedTakeoffCompareInput,
  existingItems: ExistingTakeoffCompareInput[],
  usedExistingIndexes: Set<number>,
): ExistingCandidate[] {
  const suggestionReference = normalizeReference(suggestion.reference);

  if (!suggestionReference) {
    return [];
  }

  return existingItems
    .map((item, index) => ({ index, item }))
    .filter(
      ({ index, item }) =>
        !usedExistingIndexes.has(index) &&
        normalizeReference(item.reference) === suggestionReference,
    );
}

function findDescriptionMatches(
  suggestion: SuggestedTakeoffCompareInput,
  existingItems: ExistingTakeoffCompareInput[],
  usedExistingIndexes: Set<number>,
): ExistingCandidate[] {
  return existingItems
    .map((item, index) => ({ index, item }))
    .filter(
      ({ index, item }) =>
        !usedExistingIndexes.has(index) &&
        descriptionsStronglyMatch(suggestion.description, item.description),
    );
}

function classifyAgainstExisting(
  suggestion: SuggestedTakeoffCompareInput,
  existing: ExistingTakeoffCompareInput,
): TakeoffComparisonStatus {
  const referenceMatch =
    normalizeReference(suggestion.reference) != null &&
    normalizeReference(suggestion.reference) ===
      normalizeReference(existing.reference);

  const descriptionMatch = descriptionsStronglyMatch(
    suggestion.description,
    existing.description,
  );

  if (!referenceMatch && !descriptionMatch) {
    return "uncertain";
  }

  if (
    quantitiesApproximatelyEqual(suggestion.quantity, existing.quantity) &&
    unitsCompatible(suggestion.unit, existing.unit)
  ) {
    return "matched";
  }

  return "differentQuantity";
}

function compareSuggestedItem(
  suggestion: SuggestedTakeoffCompareInput,
  existingItems: ExistingTakeoffCompareInput[],
  usedExistingIndexes: Set<number>,
): ComparedSuggestedTakeoffItem {
  if (suggestion.confidence < LOW_CONFIDENCE_THRESHOLD) {
    return { ...suggestion, comparisonStatus: "uncertain" };
  }

  const referenceMatches = findReferenceMatches(
    suggestion,
    existingItems,
    usedExistingIndexes,
  );

  if (referenceMatches.length === 1) {
    const match = referenceMatches[0];
    const status = classifyAgainstExisting(suggestion, match.item);

    if (status === "matched" || status === "differentQuantity") {
      usedExistingIndexes.add(match.index);
    }

    return { ...suggestion, comparisonStatus: status };
  }

  if (referenceMatches.length > 1) {
    return { ...suggestion, comparisonStatus: "uncertain" };
  }

  const descriptionMatches = findDescriptionMatches(
    suggestion,
    existingItems,
    usedExistingIndexes,
  );

  if (descriptionMatches.length === 1) {
    const match = descriptionMatches[0];
    const status = classifyAgainstExisting(suggestion, match.item);

    if (status === "matched") {
      usedExistingIndexes.add(match.index);
      return { ...suggestion, comparisonStatus: "matched" };
    }

    if (status === "differentQuantity") {
      usedExistingIndexes.add(match.index);
      return { ...suggestion, comparisonStatus: "differentQuantity" };
    }

    return { ...suggestion, comparisonStatus: "uncertain" };
  }

  if (descriptionMatches.length > 1) {
    return { ...suggestion, comparisonStatus: "uncertain" };
  }

  return { ...suggestion, comparisonStatus: "missing" };
}

function buildSummary(
  items: ComparedSuggestedTakeoffItem[],
): TakeoffComparisonSummary {
  return items.reduce<TakeoffComparisonSummary>(
    (summary, item) => {
      switch (item.comparisonStatus) {
        case "matched":
          summary.matchedCount += 1;
          break;
        case "missing":
          summary.missingCount += 1;
          break;
        case "differentQuantity":
          summary.differentQuantityCount += 1;
          break;
        case "uncertain":
          summary.uncertainCount += 1;
          break;
        default:
          break;
      }

      return summary;
    },
    {
      matchedCount: 0,
      missingCount: 0,
      differentQuantityCount: 0,
      uncertainCount: 0,
    },
  );
}

export function compareSuggestedTakeoffWithExisting(
  suggestedItems: SuggestedTakeoffCompareInput[],
  existingTakeoffItems: ExistingTakeoffCompareInput[],
): TakeoffComparisonResult {
  const usedExistingIndexes = new Set<number>();
  const items = suggestedItems.map((suggestion) =>
    compareSuggestedItem(suggestion, existingTakeoffItems, usedExistingIndexes),
  );

  return {
    items,
    summary: buildSummary(items),
  };
}
