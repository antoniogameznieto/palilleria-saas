/**
 * EXPERIMENTAL — Fase 14D
 * Validación e importación de sugerencias con re-extracción del PDF en servidor.
 */

import {
  compareSuggestedTakeoffWithExisting,
  normalizeTakeoffDescription,
  normalizeTakeoffUnit,
  type ExistingTakeoffCompareInput,
  type SuggestedTakeoffCompareInput,
  type TakeoffComparisonStatus,
  type TakeoffComparisonSummary,
} from "@/lib/drawings/experimental-auto-takeoff-compare";
import {
  hasUsefulEmbeddedText,
  parseTakeoffRowsFromEmbeddedText,
} from "@/lib/drawings/experimental-auto-takeoff-parse";
import { extractDrawingPdfTextForDetection } from "@/lib/drawings/pdf-text-extract";
import {
  takeoffCsvImportRowSchema,
  type TakeoffCsvImportRow,
} from "@/lib/validations/takeoff-import";

export const EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_MAX = 200;

export const EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_NOTE =
  "Importado desde extracción experimental de relación de materiales";

export const EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS = {
  emptySelection: "No se seleccionó ninguna sugerencia para importar.",
  duplicateKeys:
    "La selección contiene claves duplicadas. Cada sugerencia solo puede importarse una vez.",
  maxExceeded: `Máximo ${EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_MAX} líneas por importación experimental.`,
  invalidKeys:
    "Una o más sugerencias seleccionadas no son válidas, no existen en el PDF actual o ya están en la palillería.",
  invalidRow:
    "Una sugerencia seleccionada no cumple los requisitos mínimos de importación.",
} as const;

export type ExperimentalSuggestionKeyInput = {
  item: number | null;
  reference: string | null;
  description: string | null;
  quantity: string | null;
  unit: string | null;
};

export type VerifiedExperimentalSuggestion = ExperimentalSuggestionKeyInput & {
  suggestionKey: string;
  comparisonStatus: TakeoffComparisonStatus;
  confidence: number;
};

export function buildExperimentalSuggestionKey(
  input: ExperimentalSuggestionKeyInput,
): string {
  const quantity = input.quantity?.trim().replace(",", ".") ?? "";

  return [
    input.item ?? "",
    input.reference?.trim() ?? "",
    normalizeTakeoffDescription(input.description),
    quantity,
    normalizeTakeoffUnit(input.unit) ?? "",
  ].join("\u001f");
}

export function normalizeImportQuantity(value: string | null): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim().replace(",", ".");

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function toImportableTakeoffRow(
  suggestion: ExperimentalSuggestionKeyInput,
): TakeoffCsvImportRow | null {
  const parsed = takeoffCsvImportRowSchema.safeParse({
    reference: suggestion.reference ?? undefined,
    description: suggestion.description ?? "",
    quantity: suggestion.quantity ?? "",
    unit: suggestion.unit ?? undefined,
    length: undefined,
    width: undefined,
    height: undefined,
    notes: EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_NOTE,
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export async function extractVerifiedExperimentalSuggestions(params: {
  storagePath: string;
  mimeType: string | null;
  existingTakeoffItems: ExistingTakeoffCompareInput[];
}): Promise<
  | {
      ok: false;
      error: string;
      hasEmbeddedText: boolean;
      textLength: number;
    }
  | {
      ok: true;
      textLength: number;
      sectionsFound: string[];
      warnings: string[];
      items: VerifiedExperimentalSuggestion[];
      comparisonSummary: TakeoffComparisonSummary;
    }
> {
  const extraction = await extractDrawingPdfTextForDetection({
    storagePath: params.storagePath,
    mimeType: params.mimeType,
  });

  const textLength = extraction.characterCount;
  const hasEmbeddedText = extraction.hasEmbeddedText;
  const useful = hasUsefulEmbeddedText(textLength);

  if (!hasEmbeddedText || !useful) {
    return {
      ok: false,
      error:
        "No se encontró texto embebido útil en el PDF para validar sugerencias.",
      hasEmbeddedText,
      textLength,
    };
  }

  const parseResult = parseTakeoffRowsFromEmbeddedText(extraction.text);
  const parsedSuggestions: SuggestedTakeoffCompareInput[] =
    parseResult.candidateRows.map((row) => ({
      item: row.item,
      reference: row.reference,
      description: row.description,
      quantity: row.quantity,
      unit: row.unit,
      confidence: row.confidence,
    }));

  const comparison = compareSuggestedTakeoffWithExisting(
    parsedSuggestions,
    params.existingTakeoffItems,
  );

  const items: VerifiedExperimentalSuggestion[] = comparison.items.map(
    (item) => ({
      item: item.item,
      reference: item.reference,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      confidence: item.confidence,
      comparisonStatus: item.comparisonStatus,
      suggestionKey: buildExperimentalSuggestionKey(item),
    }),
  );

  return {
    ok: true,
    textLength,
    sectionsFound: [
      ...new Set(parseResult.sections.map((section) => section.id)),
    ],
    warnings: parseResult.warnings,
    items,
    comparisonSummary: comparison.summary,
  };
}

export function normalizeSelectedSuggestionKeys(
  selectedSuggestionKeys: string[],
):
  | { ok: true; keys: string[] }
  | { ok: false; error: string } {
  if (selectedSuggestionKeys.length === 0) {
    return { ok: false, error: EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.emptySelection };
  }

  const keys = selectedSuggestionKeys
    .map((key) => key.trim())
    .filter((key) => key.length > 0);

  if (keys.length === 0) {
    return { ok: false, error: EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.emptySelection };
  }

  const uniqueKeys = [...new Set(keys)];

  if (uniqueKeys.length !== keys.length) {
    return { ok: false, error: EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.duplicateKeys };
  }

  if (uniqueKeys.length > EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_MAX) {
    return { ok: false, error: EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.maxExceeded };
  }

  return { ok: true, keys: uniqueKeys };
}

export function resolveSelectedSuggestionsForImport(params: {
  verifiedItems: VerifiedExperimentalSuggestion[];
  selectedSuggestionKeys: string[];
}):
  | { ok: true; rows: TakeoffCsvImportRow[] }
  | { ok: false; error: string } {
  const normalized = normalizeSelectedSuggestionKeys(params.selectedSuggestionKeys);

  if (!normalized.ok) {
    return normalized;
  }

  const missingByKey = new Map(
    params.verifiedItems
      .filter((item) => item.comparisonStatus === "missing")
      .map((item) => [item.suggestionKey, item]),
  );

  const rows: TakeoffCsvImportRow[] = [];

  for (const key of normalized.keys) {
    const suggestion = missingByKey.get(key);

    if (!suggestion) {
      return { ok: false, error: EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.invalidKeys };
    }

    const row = toImportableTakeoffRow(suggestion);

    if (!row) {
      return { ok: false, error: EXPERIMENTAL_AUTO_TAKEOFF_IMPORT_ERRORS.invalidRow };
    }

    rows.push(row);
  }

  return { ok: true, rows };
}
