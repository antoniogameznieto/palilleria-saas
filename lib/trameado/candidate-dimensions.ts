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
  score: number;
  category: CandidateDimensionCategory;
  reason: string;
  reasons: string[];
  confidence: CandidateDimensionConfidence;
  contextSnippet: string | null;
  warnings: string[];
};

export type CandidateDimensionsExtractionResult = {
  candidates: CandidateDimension[];
  additionalCandidates: CandidateDimension[];
  totalRankedCount: number;
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
  primaryCandidateLimit?: number;
};

export const DEFAULT_MAX_CANDIDATE_DIMENSIONS = 24;
export const DEFAULT_PRIMARY_CANDIDATE_DIMENSIONS = 10;

const MIN_DRAWING_DIMENSION_MM = 16;
const MAX_DRAWING_DIMENSION_MM = 5000;
const OPTIMAL_PALILLO_MIN_MM = 60;
const OPTIMAL_PALILLO_MAX_MM = 2500;
const MIN_RANKED_SCORE = 15;

const PROJECT_LINE_REFERENCE_NUMBERS = new Set([
  1289, 1290, 1291, 1292, 1293, 1294,
]);

const COMMON_SHORT_PALILLO_MM = new Set([
  68, 85, 100, 120, 129, 139, 150, 170, 179, 193, 231, 235, 279, 295, 361,
]);

const DESIGN_BLOCK_VALUES = [13, 17, 17.6, 26.4, 51, 79];

type InternalClassification = {
  value: number;
  raw: string;
  category: CandidateDimensionCategory;
  reason: string;
  contextSnippet: string;
};

type CandidateScoreResult = {
  score: number;
  confidence: CandidateDimensionConfidence;
  reasons: string[];
  exclude: boolean;
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
  orientation:
    /\bORIENT|ORIENTACI[ÓO]N|GRAD|°|º|\bN\s*45\b|\b45°|\b44\.99\b/i,
  drawingDimensionHint:
    /\b(COTA|DIM|mm\b|LONG|TUBERIA|TUBO|SPAN|RUN|LENGTH|DIST)/i,
  bomPidHint:
    /RELACI[ÓO]N DE MATERIALES|P&ID|C[ÓO]DIGO SAP|DESCRIPCI[ÓO]N|ITEM\b|TUBERIA\s+AC|BRIDA|VALVULA|JUNTA|CODO|FIGURA\s*8|150#\s*RF|3000#/i,
  dnFraction:
    /\b\d+(?:\/\d+)?"\s*(?:DN|SCH|TUBERIA|COUPLING|CODO|CAP|VALVULA|BRIDA|HALF)/i,
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
  const nearDesignBlock =
    /PRESI[ÓO]N|PRESION|TEMPERATURA|CLASE|PINCHAZO|ESPESOR|kg\/cm|ºC/i.test(
      context,
    );

  return DESIGN_BLOCK_VALUES.some(
    (known) =>
      Math.abs(known - value) < 0.01 ||
      (nearDesignBlock && Math.abs(known - value) < 0.6),
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

  if (PROJECT_LINE_REFERENCE_NUMBERS.has(value)) {
    return /HL-\d+|PLANO N|PID-|2301GB47G|KP-/i.test(context);
  }

  if (value < 1000 || value > 9999) {
    return false;
  }

  return (
    /HL-\d+|PLANO N|PID-|2301GB47G/i.test(context) &&
    !/^\s*\d+\s*$/m.test(context)
  );
}

function isOrientationNoise(value: number, context: string): boolean {
  const isAngleValue =
    Math.abs(value - 45) < 0.02 || Math.abs(value - 44.99) < 0.02;

  if (!isAngleValue) {
    return false;
  }

  return (
    PATTERNS.orientation.test(context) ||
    /NOTAS|ORIENT|GRAD/i.test(context)
  );
}

function isFlangeOrAccessoryRatingNoise(
  value: number,
  context: string,
): boolean {
  if (value === 150 && /FIGURA\s*8|150#\s*RF|BRIDA|FLANGE|JUNTA ESPIROM/i.test(context)) {
    return true;
  }

  if (value === 300 && /300#|SW 3000/i.test(context)) {
    return true;
  }

  return false;
}

function isBoltLengthInContext(value: number, context: string): boolean {
  if (!PATTERNS.boltSize.test(context)) {
    return false;
  }

  const boltMatch = context.match(PATTERNS.boltSize);
  if (!boltMatch) {
    return false;
  }

  const boltLength = Number.parseInt(boltMatch[0].match(/x(\d+)mm/i)?.[1] ?? "", 10);

  return Number.isFinite(boltLength) && boltLength === value;
}

function isLikelyDiameterFractionNoise(value: number, context: string): boolean {
  if (!Number.isInteger(value)) {
    return false;
  }

  if (PATTERNS.dnFraction.test(context)) {
    return value <= 12;
  }

  return false;
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

    if (isOrientationNoise(value, context)) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Orientación / ángulo de dibujo",
        contextSnippet,
      });
      continue;
    }

    if (isFlangeOrAccessoryRatingNoise(value, context)) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Rating brida/accesorio (150#/300#)",
        contextSnippet,
      });
      continue;
    }

    if (isBoltLengthInContext(value, context)) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Longitud espárrago/perno",
        contextSnippet,
      });
      continue;
    }

    if (isLikelyDiameterFractionNoise(value, context)) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Diámetro nominal (DN) en BOM",
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

    if (
      (value === 17 || value === 20 || value === 42 || value === 94) &&
      PATTERNS.bomPidHint.test(context)
    ) {
      classified.push({
        value,
        raw,
        category: "noise_filtered",
        reason: "Valor de cajetín/BOM/P&ID",
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

function scoreCandidateDimension(
  entry: InternalClassification,
): CandidateScoreResult {
  const { value, category, contextSnippet } = entry;
  const reasons: string[] = [];
  let score = 0;

  if (category === "drawing_dimension") {
    score += 30;
    reasons.push("Cota en rango de dibujo");
  } else {
    return {
      score: 0,
      confidence: "low",
      reasons: ["Filtrada como ruido"],
      exclude: true,
    };
  }

  if (value >= OPTIMAL_PALILLO_MIN_MM && value <= OPTIMAL_PALILLO_MAX_MM) {
    score += 35;
    reasons.push("Rango típico de PALILLO (60–2500 mm)");
  } else if (value >= MIN_DRAWING_DIMENSION_MM && value <= MAX_DRAWING_DIMENSION_MM) {
    score += 10;
    reasons.push("Fuera del rango óptimo pero plausible");
  }

  if (COMMON_SHORT_PALILLO_MM.has(value)) {
    score += 20;
    reasons.push("Longitud habitual en isos -02 del paquete");
  }

  const isolatedDrawingContext =
    !PATTERNS.bomPidHint.test(contextSnippet) &&
    !/PRESI[ÓO]N|TEMPERATURA|APROBADO|FECHA|SAP|1000\d{6}/i.test(contextSnippet);

  if (isolatedDrawingContext) {
    score += 25;
    reasons.push("Contexto de zona de dibujo (sin BOM/cajetín)");
  } else if (PATTERNS.drawingDimensionHint.test(contextSnippet)) {
    score += 12;
    reasons.push("Contexto textual de cota");
  }

  if (PATTERNS.bomPidHint.test(contextSnippet)) {
    score -= 40;
    reasons.push("Penalizada: cerca de BOM/P&ID");
  }

  if (/PRESI[ÓO]N|TEMPERATURA|kg\/cm|ºC/i.test(contextSnippet)) {
    score -= 35;
    reasons.push("Penalizada: bloque de diseño");
  }

  if (value > OPTIMAL_PALILLO_MAX_MM) {
    score -= 15;
    reasons.push("Penalizada: cota muy larga");
  }

  if (value < OPTIMAL_PALILLO_MIN_MM) {
    score -= 20;
    reasons.push("Penalizada: valor corto/atípico");
  } else if (value < 80) {
    score -= 12;
    reasons.push("Penalizada: cota corta (<80 mm)");
  }

  if (/EL=\s*[+-]?\d/.test(contextSnippet)) {
    score -= 10;
    reasons.push("Penalizada: cerca de elevación EL=");
  }

  const confidence: CandidateDimensionConfidence =
    score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return {
    score,
    confidence,
    reasons,
    exclude: score < MIN_RANKED_SCORE,
  };
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
  const primaryCandidateLimit =
    options.primaryCandidateLimit ?? DEFAULT_PRIMARY_CANDIDATE_DIMENSIONS;
  const warnings: string[] = [];

  if (!hasEmbeddedText) {
    return {
      candidates: [],
      additionalCandidates: [],
      totalRankedCount: 0,
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
  const rankedCandidates: CandidateDimension[] = [];

  for (const entry of classified) {
    if (entry.category !== "drawing_dimension") {
      continue;
    }

    const scored = scoreCandidateDimension(entry);

    if (scored.exclude) {
      continue;
    }

    const itemWarnings: string[] = [];

    if (entry.category === "drawing_dimension" && /EL=\s*[+-]?\d/.test(entry.contextSnippet)) {
      itemWarnings.push("Cerca de una elevación; verificar en el plano.");
    }

    if (scored.confidence === "medium") {
      itemWarnings.push("Confianza media; confirmar visualmente.");
    }

    if (scored.confidence === "low") {
      itemWarnings.push("Confianza baja; revisar antes de usar.");
    }

    rankedCandidates.push({
      value: entry.value,
      displayValue: formatDisplayValue(entry.value),
      raw: entry.raw,
      score: scored.score,
      category: entry.category,
      reason: entry.reason,
      reasons: scored.reasons,
      confidence: scored.confidence,
      contextSnippet: entry.contextSnippet || null,
      warnings: itemWarnings,
    });
  }

  rankedCandidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.value - right.value;
  });

  const deduped: CandidateDimension[] = [];
  const seenValues = new Set<number>();

  for (const candidate of rankedCandidates) {
    if (seenValues.has(candidate.value)) {
      continue;
    }

    seenValues.add(candidate.value);
    deduped.push(candidate);
  }

  const totalRankedCount = deduped.length;
  const capped = deduped.slice(0, maxCandidates);

  if (totalRankedCount > maxCandidates) {
    warnings.push(
      `Se muestran las ${maxCandidates} cotas mejor puntuadas (de ${totalRankedCount} detectadas).`,
    );
  }

  const primaryCount = Math.min(primaryCandidateLimit, capped.length);
  const candidates = capped.slice(0, primaryCount);
  const additionalCandidates = capped.slice(primaryCount);

  if (additionalCandidates.length > 0) {
    warnings.push(
      `${additionalCandidates.length} cotas adicionales disponibles bajo «Ver más cotas».`,
    );
  }

  return {
    candidates,
    additionalCandidates,
    totalRankedCount,
    embeddedTextLength,
    hasEmbeddedText,
    insufficientText,
    overallConfidence: buildOverallConfidence(
      embeddedTextLength,
      capped.length,
    ),
    warnings,
  };
}

export type SerializedCandidateDimensionsResult = CandidateDimensionsExtractionResult;
