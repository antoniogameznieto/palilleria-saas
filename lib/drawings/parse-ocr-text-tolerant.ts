import type { ParsedDrawingMetadata } from "@/lib/drawings/parse-filename";
import { parseDrawingMetadataFromPdfText } from "@/lib/drawings/parse-pdf-text";

const MAX_FIELD_LENGTH = 200;
const MAX_PARSE_TEXT_LENGTH = 50_000;

const DRAWING_CODE_PATTERN = /\b(DW|DMS|HL)[\s-](\d{3,5})\b/gi;

/**
 * Conservative OCR noise fixes. Only applies well-known substitutions;
 * does not invent characters beyond listed tolerances.
 */
export function normalizeOcrDrawingPrefixNoise(text: string): string {
  let normalized = text;

  normalized = normalized.replace(/\bOMS[\s-](\d{3,5})\b/gi, "DMS-$1");
  normalized = normalized.replace(/\b0MS[\s-](\d{3,5})\b/gi, "DMS-$1");
  normalized = normalized.replace(
    /(?<=[A-Z0-9'"/\-])OWS[\s-](\d{3,5})(?=[\s"'/\-]|$)/gi,
    "DMS-$1",
  );

  return normalized;
}

/** PLI → PL1 only in clear line-code context (e.g. PLI-L). */
export function normalizeOcrLineNoise(text: string): string {
  return text.replace(/\bPLI-([A-Z])\b/gi, "PL1-$1");
}

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

function formatDrawingNumber(prefix: string, number: string): string {
  return `${prefix.toUpperCase()}-${number}`;
}

function parseDrawingNumberTolerant(text: string): string | null {
  const normalized = normalizeOcrDrawingPrefixNoise(text);
  const matches = [...normalized.matchAll(DRAWING_CODE_PATTERN)];

  if (matches.length === 0) {
    return null;
  }

  const last = matches[matches.length - 1];

  if (!last[1] || !last[2]) {
    return null;
  }

  return formatDrawingNumber(last[1], last[2]);
}

function parseLineNumberTolerant(text: string): string | null {
  const base = parseDrawingMetadataFromPdfText(text).lineNumber;

  if (base) {
    return base;
  }

  const normalized = normalizeOcrLineNoise(normalizeOcrDrawingPrefixNoise(text));

  const labeledMatch = normalized.match(
    /(?:L[ÍI]NEA|LINE)[^\n]{0,40}?\b(PL\d+-[A-Z])\b/i,
  );

  if (labeledMatch?.[1]) {
    return normalizeField(labeledMatch[1].toUpperCase());
  }

  const dashedCodeMatch = normalized.match(
    /[-\s](PL\d+)-([A-Z])-(?:DW|DMS|HL)[\s-]\d{3,5}/i,
  );

  if (dashedCodeMatch?.[1] && dashedCodeMatch[2]) {
    return normalizeField(
      `${dashedCodeMatch[1].toUpperCase()}-${dashedCodeMatch[2].toUpperCase()}`,
    );
  }

  const looseMatch = normalized.match(/\b(PL\d+-[A-Z])\b/i);

  if (!looseMatch?.[1]) {
    return null;
  }

  const parts = looseMatch[1].match(/^(PL\d+)-([A-Z])$/i);

  if (!parts) {
    return null;
  }

  return normalizeField(`${parts[1].toUpperCase()}-${parts[2].toUpperCase()}`);
}

function normalizeRevisionToken(value: string): string | null {
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

function parseRevisionTolerant(text: string): string | null {
  const base = parseDrawingMetadataFromPdfText(text).revision;

  if (base) {
    return base;
  }

  const labeledMatch = text.match(
    /\b(?:REV(?:ISION)?\.?)\s*:?\s*(R\d{1,3}|\d{2})\b/i,
  );

  if (labeledMatch?.[1]) {
    return normalizeField(normalizeRevisionToken(labeledMatch[1]));
  }

  const suffixMatch = text.match(/-R(\d{1,3})(?:\b|[-\s]|$)/i);

  if (suffixMatch?.[1]) {
    const digits = suffixMatch[1];
    return normalizeField(
      normalizeRevisionToken(digits.length === 1 ? `R0${digits}` : `R${digits}`),
    );
  }

  return null;
}

/**
 * Experimental OCR metadata parser. Tries the product parser first, then
 * conservative tolerant fallbacks. Used only in experimental OCR flows.
 */
export function parseDrawingMetadataFromOcrText(
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

  const base = parseDrawingMetadataFromPdfText(normalizedText);

  return {
    drawingNumber:
      base.drawingNumber ??
      normalizeField(parseDrawingNumberTolerant(normalizedText)),
    lineNumber:
      base.lineNumber ?? normalizeField(parseLineNumberTolerant(normalizedText)),
    revision:
      base.revision ?? normalizeField(parseRevisionTolerant(normalizedText)),
  };
}
