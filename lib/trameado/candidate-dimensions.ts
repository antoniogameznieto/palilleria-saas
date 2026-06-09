export type CandidateDimensionCategory =
  | "drawing_dimension"
  | "continuation_reference"
  | "possible_offset"
  | "noise_filtered";

export type CandidateDimensionConfidence = "high" | "medium" | "low";

export type CandidateDimension = {
  value: number;
  displayValue: string;
  raw: string;
  category: CandidateDimensionCategory;
  reason: string;
  confidence: CandidateDimensionConfidence;
  contextSnippet: string | null;
  warnings: string[];
};

export type CandidateDimensionsExtractionResult = {
  candidates: CandidateDimension[];
  embeddedTextLength: number;
  hasEmbeddedText: boolean;
  insufficientText: boolean;
  overallConfidence: CandidateDimensionConfidence;
  warnings: string[];
};

export type ExtractCandidateDimensionsOptions = {
  drawingNumber?: string | null;
  lineNumber?: string | null;
  fileName?: string | null;
  maxCandidates?: number;
};

export const DEFAULT_MAX_CANDIDATE_DIMENSIONS = 24;

const MIN_DRAWING_DIMENSION_MM = 16;
const MAX_DRAWING_DIMENSION_MM = 5000;

type InternalClassification = {
  value: number;
  raw: string;
  category: CandidateDimensionCategory;
  reason: string;
  contextSnippet: string;
};

type BomSummaryItem = {
  item: number;
  quantity: string;
  description: string;
};

const PATTERNS = {
  sapCode: /\b1000\d{6}\b/g,
  bomRow:
    /^(\d{1,2})\s+(.+?)\t(1000\d{6}|-)\t(\d+(?:[.,]\d+)?)\s*(M|UD|m|ud|U)?\s*$/gim,
  coordinateE: /\bE=\s*(\d+)/gi,
  coordinateN: /\bN=\s*(\d+)/gi,
  coordinateEl: /\bEL=\s*([+-]?\d+)/gi,
  continuation: /PARA CONT\.?\s*VER LINEA NUM\.?\s*([^\n]+)/gi,
  boltSize: /\d+(?:\/\d+)?"x\d+mm\s+ESPARRAGO/i,
  standaloneNumber: /\b(\d+(?:\.\d+)?)\b/g,
  hlNumber: /\bHL-(\d{3,4})\b/gi,
};

export function normalizeEmbeddedPdfTextForDimensions(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/M\s+A\s*TERIALES/gi, "MATERIALES")
    .replace(/TRATAM\s+IENTO/gi, "TRATAMIENTO")
    .replace(/COM\s+PROBARÁN/gi, "COMPROBARÁN");
}

function uniqueStrings(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => value.trim()).filter(Boolean))];
}

function parseBomSummary(text: string): BomSummaryItem[] {
  const normalized = normalizeEmbeddedPdfTextForDimensions(text);
  const items: BomSummaryItem[] = [];
  const rowPattern = new RegExp(PATTERNS.bomRow.source, PATTERNS.bomRow.flags);
  let match: RegExpExecArray | null;

  while ((match = rowPattern.exec(normalized)) !== null) {
    items.push({
      item: Number.parseInt(match[1], 10),
      description: match[2].trim(),
      quantity: match[4],
    });
  }

  return items;
}

function extractCoordinates(text: string): {
  east: string[];
  north: string[];
  elevation: string[];
} {
  return {
    east: uniqueStrings(
      [...text.matchAll(PATTERNS.coordinateE)].map((match) => match[1]),
    ),
    north: uniqueStrings(
      [...text.matchAll(PATTERNS.coordinateN)].map((match) => match[1]),
    ),
    elevation: uniqueStrings(
      [...text.matchAll(PATTERNS.coordinateEl)].map((match) => match[1]),
    ),
  };
}

function extractHlReferenceNumbers(
  options: ExtractCandidateDimensionsOptions,
): Set<number> {
  const values = new Set<number>();
  const sources = [
    options.fileName,
    options.drawingNumber,
    options.lineNumber,
  ].filter(Boolean) as string[];

  for (const source of sources) {
    for (const match of source.matchAll(PATTERNS.hlNumber)) {
      const parsed = Number.parseInt(match[1], 10);

      if (Number.isFinite(parsed)) {
        values.add(parsed);
      }
    }
  }

  return values;
}

function isDesignBlockValue(value: number, context: string): boolean {
  const designContext =
    /PRESI[ÓO]N|PRESION|TEMPERATURA|CLASE|PINCHAZO|ESPESOR|kg\/cm|ºC/i.test(
      context,
    );

  if (!designContext && ![51, 79].includes(value)) {
    return false;
  }

  return [13, 17, 17.6, 26.4, 51, 79].some(
    (known) => Math.abs(known - value) < 0.01 || Math.abs(known - value) < 0.6,
  );
}

function isCoordinateToken(raw: string, context: string): boolean {
  const tokenPattern = new RegExp(
    `(?:E|N|EL)=\\s*[+-]?${raw.replace(".", "\\.")}\\b`,
    "i",
  );

  return tokenPattern.test(context);
}

function isDrawingReferenceNumber(
  value: number,
  context: string,
  hlReferenceNumbers: Set<number>,
): boolean {
  if (hlReferenceNumbers.has(value)) {
    return true;
  }

  if (value < 1000 || value > 9999) {
    return false;
  }

  return (
    /HL-\d+|PLANO N|PID-|2301GB47G/i.test(context) &&
    !/^\s*\d+\s*$/m.test(context)
  );
}

function classifyEmbeddedNumbers(
  text: string,
  options: ExtractCandidateDimensionsOptions,
): InternalClassification[] {
  const normalized = normalizeEmbeddedPdfTextForDimensions(text);
  const bomSummary = parseBomSummary(normalized);
  const coordinates = extractCoordinates(normalized);
  const hlReferenceNumbers = extractHlReferenceNumbers(options);
  const coordinateValues = new Set(
    [...coordinates.east, ...coordinates.north, ...coordinates.elevation].map(
      Number,
    ),
  );
  const bomItemNumbers = new Set(bomSummary.map((row) => row.item));
  const bomQuantities = new Set(
    bomSummary
      .map((row) => Number.parseFloat(row.quantity.replace(",", ".")))
      .filter(Number.isFinite),
  );
  const sapCodes = new Set(
    [...normalized.matchAll(PATTERNS.sapCode)].map((match) => Number(match[0])),
  );

  const classified: InternalClassification[] = [];
  const seen = new Set<string>();

  for (const match of normalized.matchAll(PATTERNS.standaloneNumber)) {
    const raw = match[1];
    const value = Number.parseFloat(raw.replace(",", "."));

    if (!Number.isFinite(value) || seen.has(raw)) {
      continue;
    }

    seen.add(raw);

    const index = match.index ?? 0;
    const context = normalized.slice(Math.max(0, index - 48), index + 48);
    const contextSnippet = context.replace(/\s+/g, " ").trim();

    if (sapCodes.has(value) || /1000\d{6}/.test(context)) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Código SAP BOM",
        contextSnippet,
      });
      continue;
    }

    if (
      coordinateValues.has(value) ||
      isCoordinateToken(raw, context) ||
      (value > 5000 && value < 10_000_000 && Number.isInteger(value))
    ) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Coordenada E/N/EL o UTM",
        contextSnippet,
      });
      continue;
    }

    if (
      value >= 2020 &&
      value <= 2039 &&
      /APROBADO|FECHA|\/202\d|\d{1,2}-\d{2}-202\d/.test(context)
    ) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Año / fecha revisión",
        contextSnippet,
      });
      continue;
    }

    if (
      (value === 58 || value === 59) &&
      /:\d{2}:\d{2}|PM|AM|\d{1,2}\/\d{1,2}\/\d{4}/.test(context)
    ) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Fragmento hora/fecha",
        contextSnippet,
      });
      continue;
    }

    if (
      (value === 40 || value === 80) &&
      /\bSCH\.?\s*(40|80)\b/i.test(context)
    ) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Schedule SCH 40/80",
        contextSnippet,
      });
      continue;
    }

    if (value === 3000 && /3000#|SW 3000/i.test(context)) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Rating 3000# accesorio",
        contextSnippet,
      });
      continue;
    }

    if (isDrawingReferenceNumber(value, context, hlReferenceNumbers)) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Número de línea/plano HL",
        contextSnippet,
      });
      continue;
    }

    if (
      bomItemNumbers.has(value) &&
      /^\s*\d{1,2}\s+/.test(context.slice(context.indexOf(raw)))
    ) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Ítem BOM numerado",
        contextSnippet,
      });
      continue;
    }

    if (
      bomQuantities.has(value) &&
      /TUBERIA|COUPLING|BRIDA|VALVULA|CODO|JUNTA|UD|M\s*$/i.test(context)
    ) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Cantidad ítem BOM",
        contextSnippet,
      });
      continue;
    }

    if (PATTERNS.boltSize.test(context)) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Espárrago/perno",
        contextSnippet,
      });
      continue;
    }

    if (isDesignBlockValue(value, context)) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Presión/temperatura/clase diseño",
        contextSnippet,
      });
      continue;
    }

    if (value >= 0 && value <= 12 && /REV\.|^\s*\d{1,2}\s*$/m.test(context)) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Ítem BOM / revisión",
        contextSnippet,
      });
      continue;
    }

    if (
      Number.isInteger(value) &&
      value >= MIN_DRAWING_DIMENSION_MM &&
      value <= MAX_DRAWING_DIMENSION_MM &&
      /EL=\s*[+-]?\d/.test(context)
    ) {
      classified.push({
        value,
        raw,
        category: "possible_offset",
        reason: "Cerca de elevación EL=",
        contextSnippet,
      });
      continue;
    }

    if (
      Number.isInteger(value) &&
      value >= MIN_DRAWING_DIMENSION_MM &&
      value <= MAX_DRAWING_DIMENSION_MM
    ) {
      classified.push({
        value,
        raw,
        category: "drawing_dimension",
        reason: "Cota candidata en rango de dibujo",
        contextSnippet,
      });
      continue;
    }

    classified.push({
      value,
      raw,
      category: "noise_filtered",
      reason: "No clasificado / contexto ambiguo",
      contextSnippet,
    });
  }

  for (const match of normalized.matchAll(PATTERNS.continuation)) {
    classified.push({
      value: 0,
      raw: match[1].trim(),
      category: "continuation_reference",
      reason: "Referencia PARA CONT. VER LINEA NUM.",
      contextSnippet: match[1].trim(),
    });
  }

  return classified;
}

function scoreDimensionConfidence(
  value: number,
  category: CandidateDimensionCategory,
): CandidateDimensionConfidence {
  if (category === "possible_offset") {
    return "medium";
  }

  if (category !== "drawing_dimension") {
    return "low";
  }

  if (value >= 50 && value <= 3000) {
    return "high";
  }

  if (value >= MIN_DRAWING_DIMENSION_MM && value <= MAX_DRAWING_DIMENSION_MM) {
    return "medium";
  }

  return "low";
}

function formatDisplayValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildOverallConfidence(
  embeddedTextLength: number,
  candidateCount: number,
): CandidateDimensionConfidence {
  if (embeddedTextLength >= 800 && candidateCount >= 3) {
    return "high";
  }

  if (embeddedTextLength >= 200 && candidateCount >= 1) {
    return "medium";
  }

  return "low";
}

export function extractCandidateDimensionsFromText(
  text: string,
  options: ExtractCandidateDimensionsOptions = {},
): CandidateDimensionsExtractionResult {
  const normalized = normalizeEmbeddedPdfTextForDimensions(text.trim());
  const embeddedTextLength = normalized.length;
  const hasEmbeddedText = embeddedTextLength > 0;
  const insufficientText = embeddedTextLength < 200;
  const maxCandidates =
    options.maxCandidates ?? DEFAULT_MAX_CANDIDATE_DIMENSIONS;
  const warnings: string[] = [];

  if (!hasEmbeddedText) {
    return {
      candidates: [],
      embeddedTextLength: 0,
      hasEmbeddedText: false,
      insufficientText: true,
      overallConfidence: "low",
      warnings: ["No hay texto embebido en el PDF."],
    };
  }

  if (insufficientText) {
    warnings.push(
      "Texto embebido limitado; la detección de cotas puede ser incompleta.",
    );
  }

  warnings.push("Revisa siempre contra el isométrico.");
  warnings.push("Las cotas pueden incluir ruido residual del cajetín o BOM.");

  const classified = classifyEmbeddedNumbers(normalized, options);
  const drawingCandidates = classified
    .filter(
      (entry) =>
        entry.category === "drawing_dimension" ||
        entry.category === "possible_offset",
    )
    .map((entry) => {
      const confidence = scoreDimensionConfidence(
        entry.value,
        entry.category,
      );
      const itemWarnings: string[] = [];

      if (entry.category === "possible_offset") {
        itemWarnings.push("Cerca de una elevación; verificar en el plano.");
      }

      if (confidence === "medium") {
        itemWarnings.push("Confianza media; confirmar visualmente.");
      }

      return {
        value: entry.value,
        displayValue: formatDisplayValue(entry.value),
        raw: entry.raw,
        category: entry.category,
        reason: entry.reason,
        confidence,
        contextSnippet: entry.contextSnippet || null,
        warnings: itemWarnings,
      } satisfies CandidateDimension;
    })
    .sort((left, right) => left.value - right.value);

  const deduped: CandidateDimension[] = [];
  const seenValues = new Set<number>();

  for (const candidate of drawingCandidates) {
    if (seenValues.has(candidate.value)) {
      continue;
    }

    seenValues.add(candidate.value);
    deduped.push(candidate);

    if (deduped.length >= maxCandidates) {
      warnings.push(
        `Se muestran las primeras ${maxCandidates} cotas candidatas.`,
      );
      break;
    }
  }

  return {
    candidates: deduped,
    embeddedTextLength,
    hasEmbeddedText,
    insufficientText,
    overallConfidence: buildOverallConfidence(
      embeddedTextLength,
      deduped.length,
    ),
    warnings,
  };
}

export type SerializedCandidateDimensionsResult = CandidateDimensionsExtractionResult;
