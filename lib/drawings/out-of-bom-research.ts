/**
 * EXPERIMENTAL — Fase 16A
 * Investigación de soportes y partidas fuera del BOM en texto embebido de PDF.
 */

import {
  findBomSections,
  parseTakeoffRowsFromEmbeddedText,
} from "@/lib/drawings/experimental-auto-takeoff-parse";

export const OUT_OF_BOM_PATTERN_GROUPS = [
  { id: "soportes_header", category: "support", label: "SOPORTES", pattern: /\bSOPORTES\b/i },
  { id: "soporte", category: "support", label: "SOPORTE", pattern: /\bSOPORTE\b/i },
  { id: "std_ps", category: "support", label: "STD-PS", pattern: /\bSTD-PS[-\w]*/i },
  { id: "sup_ref", category: "support", label: "SUP-", pattern: /\bSUP-\d+/i },
  { id: "support_en", category: "support", label: "SUPPORT", pattern: /\bSUPPORT\b/i },
  { id: "brida", category: "manual_flange", label: "BRIDA", pattern: /\bBRIDA\b/i },
  {
    id: "valvula",
    category: "manual_valve",
    label: "VÁLVULA",
    pattern: /\bV[ÁA]LVULA\b/i,
  },
  { id: "dw_ref", category: "dw_manual", label: "DW", pattern: /\bDW[-\s]?\d{3,}/i },
] as const;

export type OutOfBomPatternCategory =
  (typeof OUT_OF_BOM_PATTERN_GROUPS)[number]["category"];

export type OutOfBomTextRegion = "pre_bom" | "bom" | "post_soportes" | "other";

export type OutOfBomParseability =
  | "tab_row_support"
  | "tab_row_sap"
  | "loose_text"
  | "header_only";

export type OutOfBomCandidate = {
  patternId: string;
  patternLabel: string;
  category: OutOfBomPatternCategory;
  lineNumber: number;
  lineText: string;
  region: OutOfBomTextRegion;
  contextBefore: string[];
  contextAfter: string[];
  parseability: OutOfBomParseability;
  likelyInParsedBom: boolean;
  observations: string[];
};

export type OutOfBomPdfAnalysis = {
  fileName: string;
  path: string;
  pageCount: number | null;
  embeddedTextLength: number;
  hasBom: boolean;
  bomSectionIds: string[];
  hasSoportesBlock: boolean;
  soportesLineNumber: number | null;
  bomParsedRowCount: number;
  supportCandidates: OutOfBomCandidate[];
  outOfBomCandidates: OutOfBomCandidate[];
  observations: string[];
};

const SUPPORT_TAB_ROW_PATTERN =
  /^(\d{1,3})\s+(.+?)\t([A-Z0-9][A-Z0-9-]*)\t(\d+(?:[.,]\d+)?)\s*$/i;

const SAP_TAB_ROW_PATTERN =
  /^(\d{1,3})\s+(.+?)\t([0-9]{6,}|-)\t(\d+(?:[.,]\d+)?)(?:\s+(M|UD|m|ud|U))?\s*$/i;

const CONTEXT_LINE_COUNT = 2;

function normalizeResearchText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/M\s+A\s*TERIALES/gi, "MATERIALES");
}

function splitLines(text: string): string[] {
  return normalizeResearchText(text).split("\n");
}

function findSoportesLineNumber(lines: string[]): number | null {
  for (let index = 0; index < lines.length; index += 1) {
    if (/^SOPORTES\b/i.test(lines[index]?.trim() ?? "")) {
      return index + 1;
    }
  }

  return null;
}

function findBomStartLineNumber(
  lines: string[],
  sections: ReturnType<typeof findBomSections>,
): number | null {
  if (sections.length === 0) {
    return null;
  }

  const primary =
    sections.find(
      (section) =>
        section.id === "RELACION_DE_MATERIALES" ||
        section.id === "RELACION_DE_MATERIALES_CLEAN",
    ) ?? sections[0];

  let charCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (charCount >= primary.index) {
      return index + 1;
    }

    charCount += lines[index].length + 1;
  }

  return null;
}

export function resolveOutOfBomTextRegion(params: {
  lineNumber: number;
  bomStartLine: number | null;
  soportesLine: number | null;
}): OutOfBomTextRegion {
  const { lineNumber, bomStartLine, soportesLine } = params;

  if (soportesLine != null && lineNumber >= soportesLine) {
    return "post_soportes";
  }

  if (bomStartLine != null && lineNumber >= bomStartLine) {
    return "bom";
  }

  if (bomStartLine != null && lineNumber < bomStartLine) {
    return "pre_bom";
  }

  return "other";
}

export function assessOutOfBomLineParseability(
  line: string,
): OutOfBomParseability {
  const trimmed = line.trim();

  if (/^SOPORTES\b/i.test(trimmed)) {
    return "header_only";
  }

  if (SUPPORT_TAB_ROW_PATTERN.test(trimmed)) {
    return "tab_row_support";
  }

  if (SAP_TAB_ROW_PATTERN.test(trimmed)) {
    return "tab_row_sap";
  }

  return "loose_text";
}

function buildParsedBomIndex(
  parseResult: ReturnType<typeof parseTakeoffRowsFromEmbeddedText>,
) {
  const references = new Set<string>();
  const rawLines = new Set<string>();

  for (const row of parseResult.candidateRows) {
    if (row.reference) {
      references.add(row.reference.trim().toUpperCase());
    }

    rawLines.add(row.rawLine.trim());
  }

  return { references, rawLines };
}

function lineLikelyInParsedBom(
  line: string,
  parsedIndex: ReturnType<typeof buildParsedBomIndex>,
): boolean {
  const trimmed = line.trim();

  if (parsedIndex.rawLines.has(trimmed)) {
    return true;
  }

  const sapRef = trimmed.match(/\t([0-9]{6,})\t/);

  if (sapRef?.[1] && parsedIndex.references.has(sapRef[1])) {
    return true;
  }

  return false;
}

function collectContextLines(
  lines: string[],
  lineIndex: number,
): { before: string[]; after: string[] } {
  const before: string[] = [];
  const after: string[] = [];

  for (let offset = CONTEXT_LINE_COUNT; offset >= 1; offset -= 1) {
    const value = lines[lineIndex - offset]?.trim();

    if (value) {
      before.push(value);
    }
  }

  for (let offset = 1; offset <= CONTEXT_LINE_COUNT; offset += 1) {
    const value = lines[lineIndex + offset]?.trim();

    if (value) {
      after.push(value);
    }
  }

  return { before, after };
}

function buildCandidateObservations(params: {
  candidate: Omit<OutOfBomCandidate, "observations">;
}): string[] {
  const notes: string[] = [];

  if (params.candidate.likelyInParsedBom) {
    notes.push("Coincide con fila ya parseada del BOM principal.");
  }

  if (params.candidate.region === "post_soportes") {
    notes.push("Aparece en bloque posterior a SOPORTES.");
  }

  if (
    params.candidate.category !== "support" &&
    params.candidate.region === "bom"
  ) {
    notes.push("Mención dentro del bloque BOM (posible falso positivo manual).");
  }

  if (params.candidate.parseability === "tab_row_support") {
    notes.push("Formato tabular tipo soporte (ítem + ref no SAP).");
  } else if (params.candidate.parseability === "loose_text") {
    notes.push("Texto suelto; no sigue patrón tabular del parser.");
  } else if (params.candidate.parseability === "header_only") {
    notes.push("Solo cabecera de bloque; sin fila estructurada en la misma línea.");
  }

  return notes;
}

export function analyzeOutOfBomEmbeddedText(params: {
  text: string;
  fileName: string;
  path: string;
  pageCount: number | null;
}): OutOfBomPdfAnalysis {
  const lines = splitLines(params.text);
  const sections = findBomSections(params.text);
  const parseResult = parseTakeoffRowsFromEmbeddedText(params.text);
  const parsedIndex = buildParsedBomIndex(parseResult);
  const bomStartLine = findBomStartLineNumber(lines, sections);
  const soportesLine = findSoportesLineNumber(lines);

  const seenKeys = new Set<string>();
  const supportCandidates: OutOfBomCandidate[] = [];
  const outOfBomCandidates: OutOfBomCandidate[] = [];
  const observations: string[] = [];

  if (sections.length === 0) {
    observations.push("Sin encabezado BOM reconocible.");
  }

  if (soportesLine == null) {
    observations.push("No se detectó cabecera SOPORTES en texto embebido.");
  } else {
    observations.push(`Cabecera SOPORTES en línea ${soportesLine}.`);
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]?.trim() ?? "";

    if (!line) {
      continue;
    }

    const lineNumber = lineIndex + 1;
    const region = resolveOutOfBomTextRegion({
      lineNumber,
      bomStartLine,
      soportesLine,
    });
    const parseability = assessOutOfBomLineParseability(line);
    const likelyInParsedBom = lineLikelyInParsedBom(line, parsedIndex);
    const context = collectContextLines(lines, lineIndex);

    for (const group of OUT_OF_BOM_PATTERN_GROUPS) {
      if (!group.pattern.test(line)) {
        continue;
      }

      const dedupeKey = `${lineNumber}:${group.id}`;

      if (seenKeys.has(dedupeKey)) {
        continue;
      }

      seenKeys.add(dedupeKey);

      const baseCandidate = {
        patternId: group.id,
        patternLabel: group.label,
        category: group.category,
        lineNumber,
        lineText: line,
        region,
        contextBefore: context.before,
        contextAfter: context.after,
        parseability,
        likelyInParsedBom,
      };

      const candidate: OutOfBomCandidate = {
        ...baseCandidate,
        observations: buildCandidateObservations({ candidate: baseCandidate }),
      };

      if (group.category === "support") {
        supportCandidates.push(candidate);
        continue;
      }

      const isOutOfBomManual =
        !likelyInParsedBom &&
        (region === "post_soportes" ||
          region === "pre_bom" ||
          region === "other" ||
          (region === "bom" && parseability === "loose_text"));

      if (isOutOfBomManual) {
        outOfBomCandidates.push(candidate);
      }
    }
  }

  const postSoportesTabRows = supportCandidates.filter(
    (candidate) =>
      candidate.region === "post_soportes" &&
      candidate.parseability === "tab_row_support",
  );

  if (postSoportesTabRows.length > 0) {
    observations.push(
      `${postSoportesTabRows.length} fila(s) de soporte con formato tabular tras SOPORTES.`,
    );
  }

  if (outOfBomCandidates.length === 0 && supportCandidates.length === 0) {
    observations.push("Sin candidatos fuera del BOM detectados por patrones.");
  }

  return {
    fileName: params.fileName,
    path: params.path,
    pageCount: params.pageCount,
    embeddedTextLength: params.text.length,
    hasBom: sections.length > 0,
    bomSectionIds: sections.map((section) => section.id),
    hasSoportesBlock: soportesLine != null,
    soportesLineNumber: soportesLine,
    bomParsedRowCount: parseResult.candidateRows.length,
    supportCandidates,
    outOfBomCandidates,
    observations,
  };
}

export type OutOfBomAggregateSummary = {
  pdfsAnalyzed: number;
  pdfsWithBom: number;
  pdfsWithSoportesBlock: number;
  totalSupportCandidates: number;
  totalOutOfBomCandidates: number;
  parseableSupportRows: number;
  looseSupportMentions: number;
};

export function aggregateOutOfBomAnalyses(
  analyses: OutOfBomPdfAnalysis[],
): OutOfBomAggregateSummary {
  let parseableSupportRows = 0;
  let looseSupportMentions = 0;

  for (const analysis of analyses) {
    for (const candidate of analysis.supportCandidates) {
      if (candidate.parseability === "tab_row_support") {
        parseableSupportRows += 1;
      } else if (candidate.patternId !== "soportes_header") {
        looseSupportMentions += 1;
      }
    }
  }

  return {
    pdfsAnalyzed: analyses.length,
    pdfsWithBom: analyses.filter((item) => item.hasBom).length,
    pdfsWithSoportesBlock: analyses.filter((item) => item.hasSoportesBlock)
      .length,
    totalSupportCandidates: analyses.reduce(
      (sum, item) => sum + item.supportCandidates.length,
      0,
    ),
    totalOutOfBomCandidates: analyses.reduce(
      (sum, item) => sum + item.outOfBomCandidates.length,
      0,
    ),
    parseableSupportRows,
    looseSupportMentions,
  };
}
