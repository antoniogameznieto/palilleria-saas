export const OCR_PREPROCESS_STRATEGIES = [
  { id: "original", label: "Original (sin cambios)" },
  { id: "grayscale", label: "Escala de grises" },
  { id: "high-contrast", label: "Alto contraste" },
  { id: "threshold", label: "Binarizado (umbral)" },
  { id: "upscale", label: "Ampliación 2×" },
] as const;

export type OcrPreprocessStrategy = (typeof OCR_PREPROCESS_STRATEGIES)[number]["id"];

export const DEFAULT_OCR_PREPROCESS_STRATEGY: OcrPreprocessStrategy = "original";

export const OCR_PREPROCESS_STRATEGY_IDS: OcrPreprocessStrategy[] =
  OCR_PREPROCESS_STRATEGIES.map((entry) => entry.id);

export function isOcrPreprocessStrategy(
  value: string,
): value is OcrPreprocessStrategy {
  return OCR_PREPROCESS_STRATEGY_IDS.includes(value as OcrPreprocessStrategy);
}

export function formatOcrPreprocessLabel(strategy: OcrPreprocessStrategy): string {
  return (
    OCR_PREPROCESS_STRATEGIES.find((entry) => entry.id === strategy)?.label ??
    strategy
  );
}

export function parseOcrPreprocessStrategy(
  value: string | null | undefined,
):
  | { strategy: OcrPreprocessStrategy }
  | { error: string } {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return { strategy: DEFAULT_OCR_PREPROCESS_STRATEGY };
  }

  if (typeof value !== "string" || !isOcrPreprocessStrategy(value)) {
    return {
      error: `Preprocesado OCR no válido. Válidos: ${OCR_PREPROCESS_STRATEGY_IDS.join(", ")}.`,
    };
  }

  return { strategy: value };
}

/** Unknown or empty values fall back to original (safe default). */
export function resolveOcrPreprocessStrategy(
  value: string | null | undefined,
): OcrPreprocessStrategy {
  const parsed = parseOcrPreprocessStrategy(value);
  return "error" in parsed ? DEFAULT_OCR_PREPROCESS_STRATEGY : parsed.strategy;
}

export function parseOcrPreprocessStrategyFromFormData(
  formData: FormData,
): { strategy: OcrPreprocessStrategy } | { error: string } {
  const raw = formData.get("preprocessStrategy");
  return parseOcrPreprocessStrategy(typeof raw === "string" ? raw : null);
}
