/**
 * EXPERIMENTAL — Fase 16C
 * Checklist manual de partidas no fiables para parseo automático.
 * Solo avisos; no crea líneas ni bloquea importación.
 */

import {
  MANUAL_CHECKLIST_MAX_EXAMPLES,
  type ManualChecklistItemType,
  type ManualTakeoffChecklistItem,
  type ManualTakeoffChecklistResult,
} from "@/lib/drawings/auto-takeoff-manual-checklist-types";
import {
  assessOutOfBomLineParseability,
  resolveOutOfBomTextRegion,
} from "@/lib/drawings/out-of-bom-research";
import {
  findBomSections,
  hasUsefulEmbeddedText,
  parseTakeoffRowsFromEmbeddedText,
} from "@/lib/drawings/experimental-auto-takeoff-parse";
import { EXPERIMENTAL_AUTO_TAKEOFF_INCLUDE_SUPPORT_ROWS } from "@/lib/drawings/experimental-auto-takeoff-config";

export type {
  ManualChecklistItemType,
  ManualChecklistSeverity,
  ManualTakeoffChecklistItem,
  ManualTakeoffChecklistResult,
} from "@/lib/drawings/auto-takeoff-manual-checklist-types";

export {
  MANUAL_CHECKLIST_DISCLAIMER,
  MANUAL_CHECKLIST_EMPTY_NOTE,
  MANUAL_CHECKLIST_MAX_EXAMPLES,
} from "@/lib/drawings/auto-takeoff-manual-checklist-types";

const SUPPORT_TAB_ROW_PATTERN =
  /^(\d{1,3})\s+(.+?)\t([A-Z0-9][A-Z0-9-]*)\t(\d+(?:[.,]\d+)?)\s*$/i;

function normalizeChecklistText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/M\s+A\s*TERIALES/gi, "MATERIALES");
}

function truncateExample(line: string): string {
  const trimmed = line.trim();

  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

function limitExamples(examples: string[]): string[] {
  const unique: string[] = [];

  for (const example of examples) {
    const normalized = truncateExample(example);

    if (!unique.includes(normalized)) {
      unique.push(normalized);
    }

    if (unique.length >= MANUAL_CHECKLIST_MAX_EXAMPLES) {
      break;
    }
  }

  return unique;
}

function findBomStartLine(lines: string[], sections: ReturnType<typeof findBomSections>): number | null {
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

function findSoportesLine(lines: string[]): number | null {
  for (let index = 0; index < lines.length; index += 1) {
    if (/^SOPORTES\b/i.test(lines[index]?.trim() ?? "")) {
      return index + 1;
    }
  }

  return null;
}

function buildParsedLineIndex(
  parseResult: ReturnType<typeof parseTakeoffRowsFromEmbeddedText>,
): Set<string> {
  const lines = new Set<string>();

  for (const row of parseResult.candidateRows) {
    lines.add(row.rawLine.trim());
  }

  return lines;
}

function lineInParsedBom(line: string, parsedLines: Set<string>): boolean {
  const trimmed = line.trim();

  if (parsedLines.has(trimmed)) {
    return true;
  }

  const sapRef = trimmed.match(/\t([0-9]{6,})\t/);

  if (sapRef?.[1]) {
    for (const parsedLine of parsedLines) {
      if (parsedLine.includes(sapRef[1])) {
        return true;
      }
    }
  }

  return false;
}

function isTabularSupportLine(line: string): boolean {
  const trimmed = line.trim();
  const match = trimmed.match(SUPPORT_TAB_ROW_PATTERN);

  if (!match) {
    return false;
  }

  const reference = match[3]?.trim() ?? "";
  const description = match[2]?.trim() ?? "";

  return /^SUP-\d+/i.test(reference) && /\bSTD-PS\b/i.test(description);
}

function isLooseSupportLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed || /NO\s+NECESITA\s+SOPORTES/i.test(trimmed)) {
    return false;
  }

  if (/^SOPORTES\b/i.test(trimmed)) {
    return false;
  }

  if (isTabularSupportLine(trimmed)) {
    return false;
  }

  if (/\bSOPORTE\s+COM[ÚU]N\b/i.test(trimmed)) {
    return true;
  }

  if (/\bSOPORTE\b/i.test(trimmed) && assessOutOfBomLineParseability(trimmed) === "loose_text") {
    return true;
  }

  if (/\bSUP-\d+/i.test(trimmed) && assessOutOfBomLineParseability(trimmed) === "loose_text") {
    return true;
  }

  return false;
}

function isDwContinuationLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  return (
    /\bDW[-\s]?\d{3,}/i.test(trimmed) ||
    /PLANO\s+N[ºo°]/i.test(trimmed) ||
    /PARA\s+CONT\.\s+VER\s+LINEA\s+NUM\./i.test(trimmed)
  );
}

function isLooseFlangeOrValveLine(line: string, parsedLines: Set<string>): boolean {
  const trimmed = line.trim();

  if (!trimmed || lineInParsedBom(trimmed, parsedLines)) {
    return false;
  }

  if (!/\bBRIDA\b/i.test(trimmed) && !/\bV[ÁA]LVULA\b/i.test(trimmed)) {
    return false;
  }

  return assessOutOfBomLineParseability(trimmed) === "loose_text";
}

function scanEmbeddedSignals(text: string): {
  looseSupport: string[];
  dwManual: string[];
  looseFlangeValve: string[];
} {
  const normalized = normalizeChecklistText(text);
  const lines = normalized.split("\n");
  const sections = findBomSections(normalized);
  const parseResult = parseTakeoffRowsFromEmbeddedText(normalized, {
    includeSupportRows: EXPERIMENTAL_AUTO_TAKEOFF_INCLUDE_SUPPORT_ROWS,
  });
  const parsedLines = buildParsedLineIndex(parseResult);
  const bomStartLine = findBomStartLine(lines, sections);
  const soportesLine = findSoportesLine(lines);

  const looseSupport: string[] = [];
  const dwManual: string[] = [];
  const looseFlangeValve: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed || lineInParsedBom(trimmed, parsedLines)) {
      continue;
    }

    const lineNumber = index + 1;
    const region = resolveOutOfBomTextRegion({
      lineNumber,
      bomStartLine,
      soportesLine,
    });

    if (isLooseSupportLine(trimmed)) {
      looseSupport.push(trimmed);
      continue;
    }

    if (isDwContinuationLine(trimmed)) {
      dwManual.push(trimmed);
      continue;
    }

    if (isLooseFlangeOrValveLine(trimmed, parsedLines)) {
      if (region === "bom" && /\t[0-9]{6,}\t/.test(trimmed)) {
        continue;
      }

      looseFlangeValve.push(trimmed);
    }
  }

  return {
    looseSupport,
    dwManual,
    looseFlangeValve,
  };
}

function buildChecklistItem(
  partial: Omit<ManualTakeoffChecklistItem, "shouldBlockImport" | "examples"> & {
    examples: string[];
  },
): ManualTakeoffChecklistItem {
  return {
    ...partial,
    examples: limitExamples(partial.examples),
    shouldBlockImport: false,
  };
}

export function buildManualTakeoffChecklist(params: {
  text: string;
  textLength: number;
  hasEmbeddedText: boolean;
}): ManualTakeoffChecklistResult {
  const items: ManualTakeoffChecklistItem[] = [];
  const useful = params.hasEmbeddedText && hasUsefulEmbeddedText(params.textLength);

  if (!useful) {
    items.push(
      buildChecklistItem({
        type: "noUsefulText",
        severity: "warning",
        title: "PDF sin texto embebido útil",
        description:
          "No hay suficiente texto embebido para extraer una relación de materiales fiable.",
        examples: [],
        recommendation:
          "Revisa el plano manualmente o usa una versión PDF con texto seleccionable.",
      }),
    );

    return { items, hasSignals: true };
  }

  const sections = findBomSections(normalizeChecklistText(params.text));

  if (sections.length === 0) {
    items.push(
      buildChecklistItem({
        type: "noBomDetected",
        severity: "warning",
        title: "Sin relación de materiales reconocible",
        description:
          "Hay texto embebido, pero no se detectó un bloque BOM estándar en el PDF.",
        examples: [],
        recommendation:
          "Comprueba manualmente si el plano incluye materiales fuera de tabla o en otra hoja.",
      }),
    );
  }

  const signals = scanEmbeddedSignals(params.text);

  if (signals.looseSupport.length > 0) {
    items.push(
      buildChecklistItem({
        type: "looseSupportMention",
        severity: "info",
        title: "Menciones de soporte no tabulares",
        description:
          "Aparecen referencias a soporte fuera del bloque tabular post-SOPORTES; no se importan automáticamente.",
        examples: signals.looseSupport,
        recommendation:
          "Revisa en el plano si falta algún soporte manual o compartido con otra línea.",
      }),
    );
  }

  if (signals.dwManual.length > 0) {
    items.push(
      buildChecklistItem({
        type: "dwContinuationOrManual",
        severity: "warning",
        title: "Señales de plano DW o continuación manual",
        description:
          "Hay etiquetas DW, referencias a otra hoja o continuación de línea que suelen indicar partidas manuales.",
        examples: signals.dwManual,
        recommendation:
          "En planos DW revisa brida, válvula y soporte manual que no aparecen en la tabla BOM.",
      }),
    );
  }

  if (signals.looseFlangeValve.length > 0) {
    items.push(
      buildChecklistItem({
        type: "looseFlangeOrValveMention",
        severity: "warning",
        title: "Brida o válvula en notas o leyendas",
        description:
          "Hay menciones de brida/válvula en texto suelto (detalle, notas o cajetín), no como fila BOM.",
        examples: signals.looseFlangeValve,
        recommendation:
          "Comprueba en el dibujo si falta alguna brida o válvula en la palillería final.",
      }),
    );
  }

  return {
    items,
    hasSignals: items.length > 0,
  };
}

export function shouldManualChecklistBlockImport(
  checklist: ManualTakeoffChecklistResult,
): boolean {
  return checklist.items.some((item) => item.shouldBlockImport);
}
