import type { ParsedDrawingMetadata } from "@/lib/drawings/parse-filename";

const MAX_FIELD_LENGTH = 200;
const MAX_PARSE_TEXT_LENGTH = 50_000;

/**
 * Casos documentados para validación manual:
 *
 * | Entrada                              | drawingNumber | lineNumber | revision |
 * |--------------------------------------|---------------|------------|----------|
 * | PLANO NUMERO: DW-701                 | DW-701        | null       | null     |
 * | LÍNEA NUM.: PL1-L                    | null          | PL1-L      | null     |
 * | REV. R03                             | null          | null       | R03      |
 * | REVISION 01                          | null          | null       | 01       |
 * | Texto sin patrones claros            | null          | null       | null     |
 */
export const PARSE_PDF_TEXT_DOCUMENTED_CASES: Array<{
  input: string;
  expected: ParsedDrawingMetadata;
}> = [
  {
    input: "PLANO NUMERO: DW-701",
    expected: { drawingNumber: "DW-701", lineNumber: null, revision: null },
  },
  {
    input: "LÍNEA NUM.: PL1-L",
    expected: { drawingNumber: null, lineNumber: "PL1-L", revision: null },
  },
  {
    input: "REV. R03",
    expected: { drawingNumber: null, lineNumber: null, revision: "R03" },
  },
  {
    input: "REVISION 01",
    expected: { drawingNumber: null, lineNumber: null, revision: "01" },
  },
  {
    input: "Texto sin patrones claros",
    expected: { drawingNumber: null, lineNumber: null, revision: null },
  },
  {
    input: "PLANO Nº DMS-703\nLINEA NUMERO PL2-A\nREVISION R1",
    expected: {
      drawingNumber: "DMS-703",
      lineNumber: "PL2-A",
      revision: "R1",
    },
  },
];

function normalizeField(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, MAX_FIELD_LENGTH);
}

function normalizeDrawingPrefix(prefix: string): string {
  return prefix.toUpperCase();
}

function formatDrawingNumber(prefix: string, number: string): string {
  return `${normalizeDrawingPrefix(prefix)}-${number}`;
}

function normalizeLineNumber(value: string): string | null {
  const match = value.match(/^(PL\d+)-([A-Z])$/i);

  if (!match) {
    return null;
  }

  return `${match[1].toUpperCase()}-${match[2].toUpperCase()}`;
}

function normalizeRevision(value: string): string | null {
  const trimmed = value.trim();

  if (/^R\d{1,3}$/i.test(trimmed)) {
    return `R${trimmed.slice(1)}`;
  }

  if (/^\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{1}$/.test(trimmed)) {
    return `0${trimmed}`;
  }

  return null;
}

function parseDrawingNumberFromPdfText(text: string): string | null {
  const labeledPattern =
    /(?:PLANO|DRAWING|SHEET|DOC(?:UMENT)?)\s*(?:NUM(?:ERO)?|N[º°o]|NO\.?|#)\s*:?\s*\b(DW|DMS|ISO)[\s-]?(\d{2,5})\b/i;
  const labeledMatch = text.match(labeledPattern);

  if (labeledMatch) {
    return formatDrawingNumber(labeledMatch[1], labeledMatch[2]);
  }

  const standardPattern = /\b(DW|DMS)[\s-](\d{2,5})\b/i;
  const standardMatch = text.match(standardPattern);

  if (standardMatch) {
    return formatDrawingNumber(standardMatch[1], standardMatch[2]);
  }

  const spacedPattern = /\b(DW|DMS)\s+(\d{2,5})\b/i;
  const spacedMatch = text.match(spacedPattern);

  if (spacedMatch) {
    return formatDrawingNumber(spacedMatch[1], spacedMatch[2]);
  }

  return null;
}

function parseLineNumberFromPdfText(text: string): string | null {
  const labeledPatterns = [
    /(?:L[ÍI]NEA|LINE)\s*(?:NUM(?:ERO)?\.?|N[º°o]|NO\.?|NUMBER)?\s*:?\s*(PL\d+-[A-Z])\b/i,
    /\bLINE\s*(?:NUMBER|NO\.?|#)\s*:?\s*(PL\d+-[A-Z])\b/i,
    /\blineNumber\s*:?\s*(PL\d+-[A-Z])\b/i,
    /\bn[úu]mero\s+de\s+l[íi]nea\s*:?\s*(PL\d+-[A-Z])\b/i,
  ];

  for (const pattern of labeledPatterns) {
    const match = text.match(pattern);

    if (match) {
      return normalizeField(normalizeLineNumber(match[1]));
    }
  }

  const contextualPattern =
    /(?:L[ÍI]NEA|LINE|lineNumber|n[úu]mero\s+de\s+l[íi]nea)[^\n]{0,40}?\b(PL\d+-[A-Z])\b/i;
  const contextualMatch = text.match(contextualPattern);

  if (contextualMatch) {
    return normalizeField(normalizeLineNumber(contextualMatch[1]));
  }

  return null;
}

function parseRevisionFromPdfText(text: string): string | null {
  const labeledPatterns = [
    /(?:REV(?:ISION)?\.?)\s*:?\s*(R\d{1,3}|\d{2})\b/i,
    /\bREVISION\s*(R\d{1,3}|\d{2})\b/i,
    /\bREV\.?\s*(R\d{1,3})\b/i,
  ];

  for (const pattern of labeledPatterns) {
    const match = text.match(pattern);

    if (match) {
      return normalizeField(normalizeRevision(match[1]));
    }
  }

  return null;
}

export function parseDrawingMetadataFromPdfText(
  text: string,
): ParsedDrawingMetadata {
  const normalizedText = text.trim().slice(0, MAX_PARSE_TEXT_LENGTH);

  if (normalizedText.length === 0) {
    return {
      drawingNumber: null,
      lineNumber: null,
      revision: null,
    };
  }

  return {
    drawingNumber: normalizeField(parseDrawingNumberFromPdfText(normalizedText)),
    lineNumber: normalizeField(parseLineNumberFromPdfText(normalizedText)),
    revision: normalizeField(parseRevisionFromPdfText(normalizedText)),
  };
}
