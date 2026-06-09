/**
 * EXPERIMENTAL — Fase 15B
 * Ejecuta validación del golden set contra PDFs versionados.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFParse } from "pdf-parse";

import {
  DEFAULT_GOLDEN_HIGH_CONFIDENCE_THRESHOLD,
  summarizeGoldenValidation,
  validateGoldenCaseResult,
  type GoldenSetDefinition,
  type GoldenValidationReport,
} from "@/lib/drawings/auto-takeoff-golden-validate";
import {
  findBomSections,
  parseTakeoffRowsFromEmbeddedText,
  type ExperimentalAutoTakeoffParseOptions,
} from "@/lib/drawings/experimental-auto-takeoff-parse";

const DEFAULT_GOLDEN_SET_FILE = "golden-set.json";

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

export async function extractSuggestionsFromPdf(
  absolutePdfPath: string,
  options: ExperimentalAutoTakeoffParseOptions = {},
): Promise<{
  suggestions: ReturnType<typeof parseTakeoffRowsFromEmbeddedText>["candidateRows"];
  hasBomDetected: boolean;
  error: string | null;
}> {
  try {
    const buffer = await readFile(absolutePdfPath);

    if (!isPdfBuffer(buffer)) {
      return {
        suggestions: [],
        hasBomDetected: false,
        error: "El archivo no parece un PDF válido (%PDF).",
      };
    }

    const parser = new PDFParse({ data: buffer });

    try {
      const textResult = await parser.getText();
      const text = textResult.text.trim();
      const sections = findBomSections(text);
      const parseResult = parseTakeoffRowsFromEmbeddedText(text, options);

      return {
        suggestions: parseResult.candidateRows,
        hasBomDetected: sections.length > 0,
        error: null,
      };
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    return {
      suggestions: [],
      hasBomDetected: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function loadGoldenSetDefinition(
  goldenSetDir: string,
  fileName = DEFAULT_GOLDEN_SET_FILE,
): Promise<GoldenSetDefinition> {
  const absolutePath = path.join(goldenSetDir, fileName);
  const raw = await readFile(absolutePath, "utf8");
  return JSON.parse(raw) as GoldenSetDefinition;
}

export async function runAutoTakeoffGoldenValidation(params: {
  goldenSetDir: string;
  goldenSetFileName?: string;
}): Promise<GoldenValidationReport> {
  const definition = await loadGoldenSetDefinition(
    params.goldenSetDir,
    params.goldenSetFileName,
  );
  const highConfidenceThreshold =
    definition.thresholds.highConfidenceMin ??
    DEFAULT_GOLDEN_HIGH_CONFIDENCE_THRESHOLD;

  const cases = [];

  for (const caseDef of definition.cases) {
    const pdfPath = path.join(params.goldenSetDir, caseDef.pdf);
    const extraction = await extractSuggestionsFromPdf(pdfPath);

    cases.push(
      validateGoldenCaseResult({
        caseDef,
        suggestions: extraction.suggestions,
        hasBomDetected: extraction.hasBomDetected,
        highConfidenceThreshold,
        error: extraction.error,
      }),
    );
  }

  return {
    cases,
    summary: summarizeGoldenValidation({
      cases,
      thresholds: definition.thresholds,
    }),
  };
}
