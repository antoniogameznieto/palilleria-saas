export const COMMON_TAKEOFF_UNITS = ["ud", "m", "m²", "m³", "kg", "l"] as const;

export type TakeoffSuggestionSourceItem = {
  reference: string | null;
  description: string;
  unit: string | null;
};

export type TakeoffReferenceProfile = {
  description: string;
  unit: string | null;
};

export type TakeoffFormSuggestions = {
  referenceOptions: string[];
  descriptionOptions: string[];
  unitOptions: string[];
  referenceProfiles: Record<string, TakeoffReferenceProfile>;
};

function normalizeReferenceKey(reference: string): string {
  return reference.trim().toLowerCase();
}

function normalizeUnitKey(unit: string): string {
  return unit.trim().toLowerCase();
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right, "es"),
  );
}

function collectReferenceOptions(
  drawingItems: TakeoffSuggestionSourceItem[],
  jobItems: TakeoffSuggestionSourceItem[],
): string[] {
  const drawingReferences = uniqueSorted(
    drawingItems
      .map((item) => item.reference?.trim() ?? "")
      .filter((reference) => reference.length > 0),
  );

  const drawingReferenceKeys = new Set(
    drawingReferences.map((reference) => normalizeReferenceKey(reference)),
  );

  const jobReferences = uniqueSorted(
    jobItems
      .map((item) => item.reference?.trim() ?? "")
      .filter((reference) => reference.length > 0)
      .filter(
        (reference) =>
          !drawingReferenceKeys.has(normalizeReferenceKey(reference)),
      ),
  );

  return [...drawingReferences, ...jobReferences];
}

function collectDescriptionOptions(
  jobItems: TakeoffSuggestionSourceItem[],
): string[] {
  return uniqueSorted(
    jobItems
      .map((item) => item.description.trim())
      .filter((description) => description.length > 0),
  );
}

function collectUnitOptions(jobItems: TakeoffSuggestionSourceItem[]): string[] {
  const commonUnitKeys = new Set(
    COMMON_TAKEOFF_UNITS.map((unit) => normalizeUnitKey(unit)),
  );

  const extraUnits = uniqueSorted(
    jobItems
      .map((item) => item.unit?.trim() ?? "")
      .filter((unit) => unit.length > 0)
      .filter((unit) => !commonUnitKeys.has(normalizeUnitKey(unit))),
  );

  return [...COMMON_TAKEOFF_UNITS, ...extraUnits];
}

function buildReferenceProfiles(
  items: TakeoffSuggestionSourceItem[],
): Record<string, TakeoffReferenceProfile> {
  const comboCounts = new Map<string, Map<string, number>>();

  for (const item of items) {
    const reference = item.reference?.trim();

    if (!reference) {
      continue;
    }

    const referenceKey = normalizeReferenceKey(reference);
    const comboKey = `${item.description.trim()}\0${item.unit?.trim() ?? ""}`;
    const referenceCombos = comboCounts.get(referenceKey) ?? new Map<string, number>();
    referenceCombos.set(comboKey, (referenceCombos.get(comboKey) ?? 0) + 1);
    comboCounts.set(referenceKey, referenceCombos);
  }

  const profiles: Record<string, TakeoffReferenceProfile> = {};

  for (const [referenceKey, combos] of comboCounts.entries()) {
    let bestComboKey: string | null = null;
    let bestCount = 0;

    for (const [comboKey, count] of combos.entries()) {
      if (count > bestCount) {
        bestComboKey = comboKey;
        bestCount = count;
      }
    }

    if (!bestComboKey) {
      continue;
    }

    const [description, unit] = bestComboKey.split("\0");

    profiles[referenceKey] = {
      description,
      unit: unit.length > 0 ? unit : null,
    };
  }

  return profiles;
}

export function buildTakeoffFormSuggestions(
  drawingItems: TakeoffSuggestionSourceItem[],
  jobItems: TakeoffSuggestionSourceItem[],
): TakeoffFormSuggestions {
  const allItems = [...drawingItems, ...jobItems];

  return {
    referenceOptions: collectReferenceOptions(drawingItems, jobItems),
    descriptionOptions: collectDescriptionOptions(jobItems),
    unitOptions: collectUnitOptions(jobItems),
    referenceProfiles: buildReferenceProfiles(allItems),
  };
}

export function getReferenceAutofill(
  referenceProfiles: Record<string, TakeoffReferenceProfile>,
  reference: string,
): TakeoffReferenceProfile | null {
  const trimmed = reference.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return referenceProfiles[normalizeReferenceKey(trimmed)] ?? null;
}

export function toTakeoffSuggestionSourceItems(
  items: Array<{
    reference: string | null;
    description: string;
    unit: string | null;
  }>,
): TakeoffSuggestionSourceItem[] {
  return items.map((item) => ({
    reference: item.reference,
    description: item.description,
    unit: item.unit,
  }));
}
