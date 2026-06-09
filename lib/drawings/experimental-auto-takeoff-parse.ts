/**
 * EXPERIMENTAL — Fase 14A
 * Parser conservador de líneas de palillería desde texto embebido de PDF.
 * No persiste en BD ni integra con el flujo productivo.
 */

export const BOM_SECTION_PATTERNS: ReadonlyArray<{
  id: string;
  pattern: RegExp;
}> = [
  {
    id: "RELACION_DE_MATERIALES",
    pattern: /RELACI[ÓO]N\s+DE\s+M\s*A?\s*TERIALES/i,
  },
  {
    id: "RELACION_DE_MATERIALES_CLEAN",
    pattern: /RELACI[ÓO]N\s+DE\s+MATERIALES/i,
  },
  { id: "MATERIALES", pattern: /\bMATERIALES\b/i },
  { id: "BILL_OF_MATERIALS", pattern: /BILL\s+OF\s+MATERIALS/i },
  { id: "MATERIAL_LIST", pattern: /MATERIAL\s+LIST/i },
  { id: "BOM", pattern: /\bBOM\b/ },
];

export type BomSectionMatch = {
  id: string;
  index: number;
  snippet: string;
};

export type ExperimentalTakeoffCandidateRow = {
  item: number | null;
  reference: string | null;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  confidence: number;
  warnings: string[];
  rawLine: string;
  lineNumber: number;
};

export type ExperimentalAutoTakeoffParseOptions = {
  /** Opt-in: filas tabulares STD-PS / SUP-xxx tras cabecera SOPORTES (Fase 16B). */
  includeSupportRows?: boolean;
};

export type ExperimentalAutoTakeoffParseResult = {
  sections: BomSectionMatch[];
  candidateRows: ExperimentalTakeoffCandidateRow[];
  warnings: string[];
};

const CONTEXT_SNIPPET_RADIUS = 280;

const QUANTITY_WITH_UNIT_PATTERN =
  /^(\d{1,3})\s+(.+?)\t([0-9]{6,}|-)\t(\d+(?:[.,]\d+)?)\s+(M|UD|m|ud|U)\s*$/i;

const QUANTITY_WITHOUT_UNIT_PATTERN =
  /^(\d{1,3})\s+(.+?)\t([0-9]{6,}|-)\t(\d+(?:[.,]\d+)?)\s*$/;

const SUPPORT_ROW_PATTERN =
  /^(\d{1,3})\s+(.+?)\t([A-Z0-9][A-Z0-9-]*)\t(\d+(?:[.,]\d+)?)\s*$/i;

const NOISE_LINE_PATTERN =
  /^(E=|N=|EL=|PLANO N|PARA CONT\.|ACTUADOR|ORIENTACION|CLASE:|AISLAMIENTO:|NOTA \d|VER DETALLE|\d{1,2}$)/i;

const MIN_DESCRIPTION_LENGTH = 8;
const MAX_DESCRIPTION_LENGTH = 400;

function normalizeEmbeddedPdfText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/M\s+A\s*TERIALES/gi, "MATERIALES")
    .replace(/TRATAM\s+IENTO/gi, "TRATAMIENTO")
    .replace(/COM\s+PROBARÁN/gi, "COMPROBARÁN");
}

function snippetAround(text: string, index: number): string {
  const start = Math.max(0, index - CONTEXT_SNIPPET_RADIUS);
  const end = Math.min(text.length, index + CONTEXT_SNIPPET_RADIUS);
  return text.slice(start, end).replace(/\n/g, " ↵ ");
}

function parseDecimalQuantity(raw: string): string | null {
  const normalized = raw.trim().replace(",", ".");

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return normalized;
}

function scoreRow(params: {
  item: number;
  reference: string;
  description: string;
  quantity: string;
  unit: string | null;
  expectedItem: number | null;
  pattern: "sap" | "support";
}): { confidence: number; warnings: string[] } {
  const warnings: string[] = [];
  let confidence = 0.35;

  if (params.pattern === "sap") {
    confidence += 0.25;
  } else {
    confidence += 0.1;
    warnings.push("Referencia no numérica SAP (posible soporte o fila atípica).");
  }

  if (/^\d{6,}$/.test(params.reference)) {
    confidence += 0.2;
  } else if (params.reference === "-") {
    confidence += 0.05;
    warnings.push("Código SAP ausente (-).");
  }

  if (params.description.length >= MIN_DESCRIPTION_LENGTH) {
    confidence += 0.1;
  } else {
    warnings.push("Descripción muy corta.");
    confidence -= 0.15;
  }

  if (params.description.length > MAX_DESCRIPTION_LENGTH) {
    warnings.push("Descripción inusualmente larga.");
    confidence -= 0.1;
  }

  if (params.unit) {
    confidence += 0.05;
  }

  if (params.expectedItem != null && params.item === params.expectedItem) {
    confidence += 0.15;
  } else if (params.expectedItem != null) {
    warnings.push(
      `Nº ítem ${params.item} no sigue la secuencia esperada (${params.expectedItem}).`,
    );
    confidence -= 0.1;
  }

  if (/\d{6,}/.test(params.description) && !params.description.includes('"')) {
    warnings.push("La descripción contiene muchos dígitos; posible ruido del plano.");
    confidence -= 0.15;
  }

  return {
    confidence: Math.max(0, Math.min(1, Number(confidence.toFixed(2)))),
    warnings,
  };
}

function tryParseMaterialLine(
  line: string,
  lineNumber: number,
  expectedItem: number | null,
): ExperimentalTakeoffCandidateRow | null {
  const trimmed = line.trim();

  if (!trimmed || NOISE_LINE_PATTERN.test(trimmed)) {
    return null;
  }

  const withUnit = trimmed.match(QUANTITY_WITH_UNIT_PATTERN);
  const withoutUnit = trimmed.match(QUANTITY_WITHOUT_UNIT_PATTERN);
  const support = trimmed.match(SUPPORT_ROW_PATTERN);

  const match = withUnit ?? withoutUnit ?? support;

  if (!match) {
    return null;
  }

  const item = Number(match[1]);
  const description = match[2].trim();
  const reference = match[3].trim();
  const quantityRaw = match[4];
  const unit = withUnit ? (match[5]?.toUpperCase() ?? null) : null;
  const quantity = parseDecimalQuantity(quantityRaw);

  if (!Number.isInteger(item) || item <= 0 || item > 999) {
    return null;
  }

  if (!quantity) {
    return null;
  }

  if (
    description.length < MIN_DESCRIPTION_LENGTH ||
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    return null;
  }

  const pattern: "sap" | "support" =
    /^\d{6,}$/.test(reference) || reference === "-" ? "sap" : "support";

  const { confidence, warnings } = scoreRow({
    item,
    reference,
    description,
    quantity,
    unit,
    expectedItem,
    pattern,
  });

  if (confidence < 0.45) {
    return null;
  }

  return {
    item,
    reference: reference === "-" ? null : reference,
    description,
    quantity,
    unit,
    confidence,
    warnings,
    rawLine: trimmed,
    lineNumber,
  };
}

const SUPPORT_POST_SOPORTES_CONFIDENCE = 0.8;
const SUPPORT_POST_SOPORTES_MAX_CONSECUTIVE_MISSES = 6;

function tryParseTabularSupportRow(
  line: string,
  lineNumber: number,
): ExperimentalTakeoffCandidateRow | null {
  const trimmed = line.trim();

  if (!trimmed || NOISE_LINE_PATTERN.test(trimmed)) {
    return null;
  }

  const match = trimmed.match(SUPPORT_ROW_PATTERN);

  if (!match) {
    return null;
  }

  const item = Number(match[1]);
  const description = match[2].trim();
  const reference = match[3].trim();
  const quantity = parseDecimalQuantity(match[4]);

  if (!Number.isInteger(item) || item <= 0 || item > 999 || !quantity) {
    return null;
  }

  if (!/^SUP-\d+/i.test(reference) || !/\bSTD-PS\b/i.test(description)) {
    return null;
  }

  if (
    description.length < MIN_DESCRIPTION_LENGTH ||
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    return null;
  }

  return {
    item,
    reference,
    description,
    quantity,
    unit: "ud",
    confidence: SUPPORT_POST_SOPORTES_CONFIDENCE,
    warnings: ["Fila de soporte post-SOPORTES (revisión manual recomendada)."],
    rawLine: trimmed,
    lineNumber,
  };
}

function parsePostSoportesSupportRows(
  lines: string[],
  startLineIndex: number,
  warnings: string[],
): ExperimentalTakeoffCandidateRow[] {
  const rows: ExperimentalTakeoffCandidateRow[] = [];
  let consecutiveMisses = 0;

  for (let index = startLineIndex; index < lines.length; index += 1) {
    const parsed = tryParseTabularSupportRow(lines[index], index + 1);

    if (parsed) {
      rows.push(parsed);
      consecutiveMisses = 0;
      continue;
    }

    const trimmed = lines[index]?.trim() ?? "";

    if (!trimmed) {
      continue;
    }

    consecutiveMisses += 1;

    if (consecutiveMisses >= SUPPORT_POST_SOPORTES_MAX_CONSECUTIVE_MISSES) {
      break;
    }
  }

  if (rows.length > 0) {
    warnings.push(
      `${rows.length} fila(s) de soporte tabular tras bloque SOPORTES (opt-in).`,
    );
  }

  return rows;
}

export function findBomSections(text: string): BomSectionMatch[] {
  const normalized = normalizeEmbeddedPdfText(text);
  const matches: BomSectionMatch[] = [];
  const seenIndexes = new Set<number>();

  for (const { id, pattern } of BOM_SECTION_PATTERNS) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const regex = new RegExp(pattern.source, flags);

    for (const match of normalized.matchAll(regex)) {
      const index = match.index ?? -1;

      if (index < 0 || seenIndexes.has(index)) {
        continue;
      }

      seenIndexes.add(index);
      matches.push({
        id,
        index,
        snippet: snippetAround(normalized, index),
      });
    }
  }

  return matches.sort((left, right) => left.index - right.index);
}

export function parseTakeoffRowsFromEmbeddedText(
  text: string,
  options: ExperimentalAutoTakeoffParseOptions = {},
): ExperimentalAutoTakeoffParseResult {
  const includeSupportRows = options.includeSupportRows === true;
  const normalized = normalizeEmbeddedPdfText(text);
  const sections = findBomSections(normalized);
  const warnings: string[] = [];
  const candidateRows: ExperimentalTakeoffCandidateRow[] = [];

  if (sections.length === 0) {
    warnings.push(
      "No se encontró encabezado de relación de materiales (RELACIÓN DE MATERIALES, BOM, etc.).",
    );
    return { sections, candidateRows, warnings };
  }

  const primarySection = sections.find(
    (section) =>
      section.id === "RELACION_DE_MATERIALES" ||
      section.id === "RELACION_DE_MATERIALES_CLEAN",
  ) ?? sections[0];

  const lines = normalized.split("\n");
  let sectionLineIndex = 0;
  let charCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (charCount >= primarySection.index) {
      sectionLineIndex = index;
      break;
    }

    charCount += lines[index].length + 1;
  }

  let expectedItem: number | null = 1;
  let consecutiveMisses = 0;

  for (let index = sectionLineIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^SOPORTES\b/i.test(line.trim())) {
      warnings.push(`Fin de bloque de materiales detectado en línea ${index + 1} (SOPORTES).`);

      if (includeSupportRows) {
        candidateRows.push(
          ...parsePostSoportesSupportRows(lines, index + 1, warnings),
        );
      }

      break;
    }

    const parsed = tryParseMaterialLine(line, index + 1, expectedItem);

    if (parsed) {
      candidateRows.push(parsed);
      expectedItem = parsed.item != null ? parsed.item + 1 : null;
      consecutiveMisses = 0;
      continue;
    }

    if (candidateRows.length > 0) {
      consecutiveMisses += 1;

      if (consecutiveMisses >= 8) {
        warnings.push(
          `Fin de bloque de materiales tras ${consecutiveMisses} líneas sin patrón (línea ~${index + 1}).`,
        );
        break;
      }
    }
  }

  if (candidateRows.length === 0) {
    warnings.push(
      "Sección de materiales localizada pero ninguna fila pasó el parser conservador.",
    );
  }

  const lowConfidence = candidateRows.filter((row) => row.confidence < 0.6);

  if (lowConfidence.length > 0) {
    warnings.push(
      `${lowConfidence.length} fila(s) con confianza < 0.6; revisar manualmente antes de usar.`,
    );
  }

  return { sections, candidateRows, warnings };
}

export function hasUsefulEmbeddedText(characterCount: number): boolean {
  return characterCount >= 200;
}
