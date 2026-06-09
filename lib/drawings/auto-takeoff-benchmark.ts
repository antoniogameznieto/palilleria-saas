/**
 * EXPERIMENTAL — Fase 15A
 * Helpers puros para benchmark de auto-takeoff desde texto embebido.
 */

import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { PDFParse } from "pdf-parse";

import {
  BOM_SECTION_PATTERNS,
  findBomSections,
  hasUsefulEmbeddedText,
  parseTakeoffRowsFromEmbeddedText,
  type ExperimentalTakeoffCandidateRow,
} from "@/lib/drawings/experimental-auto-takeoff-parse";

export const TRACKED_BOM_SECTION_IDS = [
  "RELACION_DE_MATERIALES",
  "RELACION_DE_MATERIALES_CLEAN",
  "MATERIALES",
  "BOM",
  "BILL_OF_MATERIALS",
  "MATERIAL_LIST",
] as const;

export type PdfBenchmarkResult = {
  path: string;
  fileName: string;
  relativePath: string;
  fileSizeBytes: number;
  pageCount: number | null;
  embeddedTextLength: number;
  hasUsefulEmbeddedText: boolean;
  sectionsFound: string[];
  trackedSectionsFound: string[];
  suggestedRowCount: number;
  averageConfidence: number | null;
  rowsWithReference: number;
  rowsWithoutReference: number;
  unitsDetected: string[];
  warnings: string[];
  confidenceBuckets: {
    high: number;
    medium: number;
    low: number;
  };
  error: string | null;
  errorType: string | null;
};

export type AggregatedBenchmarkSummary = {
  pdfsAnalyzed: number;
  pdfsWithErrors: number;
  pdfsWithUsefulEmbeddedText: number;
  pdfsWithBomDetected: number;
  pdfsWithSuggestions: number;
  totalSuggestedRows: number;
  averageRowsPerPdfWithBom: number | null;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  topUnits: Array<{ unit: string; count: number }>;
  errorsByType: Array<{ type: string; count: number }>;
  sectionIdCounts: Array<{ sectionId: string; count: number }>;
};

export function matchesPdfNameFilter(
  fileName: string,
  matchPattern: string | null,
): boolean {
  if (!matchPattern) {
    return true;
  }

  try {
    return new RegExp(matchPattern, "i").test(fileName);
  } catch {
    return fileName.toLowerCase().includes(matchPattern.toLowerCase());
  }
}

export function dedupePdfPathsByBasename(paths: string[]): string[] {
  const seen = new Map<string, string>();

  for (const absolutePath of paths) {
    const baseName = path.basename(absolutePath).toLowerCase();

    if (!seen.has(baseName)) {
      seen.set(baseName, absolutePath);
    }
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b, "es"));
}

export async function collectPdfPathsRecursive(
  rootPath: string,
): Promise<string[]> {
  const absoluteRoot = path.resolve(rootPath);
  const entries = await stat(absoluteRoot);

  if (entries.isFile()) {
    return absoluteRoot.toLowerCase().endsWith(".pdf") ? [absoluteRoot] : [];
  }

  if (!entries.isDirectory()) {
    return [];
  }

  const results: string[] = [];
  const dirEntries = await readdir(absoluteRoot, { withFileTypes: true });

  for (const entry of dirEntries) {
    const entryPath = path.join(absoluteRoot, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await collectPdfPathsRecursive(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      results.push(entryPath);
    }
  }

  return results;
}

export async function resolveBenchmarkPdfInputs(params: {
  inputs: string[];
  matchPattern: string | null;
  limit: number | null;
}): Promise<string[]> {
  const collected: string[] = [];

  for (const input of params.inputs) {
    collected.push(...(await collectPdfPathsRecursive(input)));
  }

  const filtered = collected.filter((pdfPath) =>
    matchesPdfNameFilter(path.basename(pdfPath), params.matchPattern),
  );
  const deduped = dedupePdfPathsByBasename(filtered);

  if (params.limit != null && params.limit > 0) {
    return deduped.slice(0, params.limit);
  }

  return deduped;
}

export function bucketConfidence(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.9) {
    return "high";
  }

  if (confidence >= 0.45) {
    return "medium";
  }

  return "low";
}

export function classifyBenchmarkError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "unknown";
  }

  const message = error.message.toLowerCase();

  if (message.includes("pdf") && message.includes("valid")) {
    return "invalid_pdf";
  }

  if (message.includes("enoent") || message.includes("no such file")) {
    return "file_not_found";
  }

  if (message.includes("parse") || message.includes("corrupt")) {
    return "parse_failure";
  }

  return "other";
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

function summarizeRows(rows: ExperimentalTakeoffCandidateRow[]) {
  const units = new Map<string, number>();
  let rowsWithReference = 0;
  let rowsWithoutReference = 0;
  const confidenceBuckets = { high: 0, medium: 0, low: 0 };

  for (const row of rows) {
    if (row.reference) {
      rowsWithReference += 1;
    } else {
      rowsWithoutReference += 1;
    }

    if (row.unit) {
      const unitKey = row.unit.toLowerCase();
      units.set(unitKey, (units.get(unitKey) ?? 0) + 1);
    }

    const bucket = bucketConfidence(row.confidence);
    confidenceBuckets[bucket] += 1;
  }

  const averageConfidence =
    rows.length > 0
      ? Number(
          (
            rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length
          ).toFixed(4),
        )
      : null;

  return {
    rowsWithReference,
    rowsWithoutReference,
    unitsDetected: [...units.keys()].sort((a, b) => a.localeCompare(b, "es")),
    averageConfidence,
    confidenceBuckets,
  };
}

function mapTrackedSections(sectionIds: string[]): string[] {
  const tracked = new Set<string>();

  for (const sectionId of sectionIds) {
    if (
      (TRACKED_BOM_SECTION_IDS as readonly string[]).includes(sectionId) ||
      sectionId.includes("RELACION") ||
      sectionId.includes("MATERIAL")
    ) {
      tracked.add(sectionId);
    }
  }

  return [...tracked].sort();
}

export async function analyzePdfForAutoTakeoffBenchmark(
  absolutePath: string,
  workspaceRoot: string,
): Promise<PdfBenchmarkResult> {
  const fileName = path.basename(absolutePath);
  const relativePath = path.relative(workspaceRoot, absolutePath);

  try {
    const buffer = await readFile(absolutePath);
    const fileSizeBytes = buffer.length;

    if (!isPdfBuffer(buffer)) {
      return {
        path: absolutePath,
        fileName,
        relativePath,
        fileSizeBytes,
        pageCount: null,
        embeddedTextLength: 0,
        hasUsefulEmbeddedText: false,
        sectionsFound: [],
        trackedSectionsFound: [],
        suggestedRowCount: 0,
        averageConfidence: null,
        rowsWithReference: 0,
        rowsWithoutReference: 0,
        unitsDetected: [],
        warnings: [],
        confidenceBuckets: { high: 0, medium: 0, low: 0 },
        error: "El archivo no parece un PDF válido (%PDF).",
        errorType: "invalid_pdf",
      };
    }

    const parser = new PDFParse({ data: buffer });

    try {
      const info = await parser.getInfo({ parsePageInfo: true });
      const textResult = await parser.getText();
      const text = textResult.text.trim();
      const embeddedTextLength = text.length;
      const useful = hasUsefulEmbeddedText(embeddedTextLength);
      const sections = findBomSections(text);
      const sectionIds = [...new Set(sections.map((section) => section.id))];
      const parseResult = parseTakeoffRowsFromEmbeddedText(text);
      const rowSummary = summarizeRows(parseResult.candidateRows);

      return {
        path: absolutePath,
        fileName,
        relativePath,
        fileSizeBytes,
        pageCount: info.total,
        embeddedTextLength,
        hasUsefulEmbeddedText: useful,
        sectionsFound: sectionIds,
        trackedSectionsFound: mapTrackedSections(sectionIds),
        suggestedRowCount: parseResult.candidateRows.length,
        averageConfidence: rowSummary.averageConfidence,
        rowsWithReference: rowSummary.rowsWithReference,
        rowsWithoutReference: rowSummary.rowsWithoutReference,
        unitsDetected: rowSummary.unitsDetected,
        warnings: parseResult.warnings,
        confidenceBuckets: rowSummary.confidenceBuckets,
        error: null,
        errorType: null,
      };
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    return {
      path: absolutePath,
      fileName,
      relativePath,
      fileSizeBytes: 0,
      pageCount: null,
      embeddedTextLength: 0,
      hasUsefulEmbeddedText: false,
      sectionsFound: [],
      trackedSectionsFound: [],
      suggestedRowCount: 0,
      averageConfidence: null,
      rowsWithReference: 0,
      rowsWithoutReference: 0,
      unitsDetected: [],
      warnings: [],
      confidenceBuckets: { high: 0, medium: 0, low: 0 },
      error: error instanceof Error ? error.message : "Error desconocido",
      errorType: classifyBenchmarkError(error),
    };
  }
}

export function aggregateAutoTakeoffBenchmarkResults(
  results: PdfBenchmarkResult[],
): AggregatedBenchmarkSummary {
  const errorsByType = new Map<string, number>();
  const unitTotals = new Map<string, number>();
  const sectionIdCounts = new Map<string, number>();
  const confidenceDistribution = { high: 0, medium: 0, low: 0 };

  let pdfsWithErrors = 0;
  let pdfsWithUsefulEmbeddedText = 0;
  let pdfsWithBomDetected = 0;
  let pdfsWithSuggestions = 0;
  let totalSuggestedRows = 0;
  let rowsInBomPdfs = 0;
  let pdfsWithBomAndRows = 0;

  for (const result of results) {
    if (result.error) {
      pdfsWithErrors += 1;
      const type = result.errorType ?? "other";
      errorsByType.set(type, (errorsByType.get(type) ?? 0) + 1);
      continue;
    }

    if (result.hasUsefulEmbeddedText) {
      pdfsWithUsefulEmbeddedText += 1;
    }

    if (result.trackedSectionsFound.length > 0) {
      pdfsWithBomDetected += 1;
      rowsInBomPdfs += result.suggestedRowCount;

      if (result.suggestedRowCount > 0) {
        pdfsWithBomAndRows += 1;
      }
    }

    for (const sectionId of result.trackedSectionsFound) {
      sectionIdCounts.set(sectionId, (sectionIdCounts.get(sectionId) ?? 0) + 1);
    }

    if (result.suggestedRowCount > 0) {
      pdfsWithSuggestions += 1;
      totalSuggestedRows += result.suggestedRowCount;
    }

    confidenceDistribution.high += result.confidenceBuckets.high;
    confidenceDistribution.medium += result.confidenceBuckets.medium;
    confidenceDistribution.low += result.confidenceBuckets.low;

    for (const unit of result.unitsDetected) {
      unitTotals.set(unit, (unitTotals.get(unit) ?? 0) + 1);
    }
  }

  const topUnits = [...unitTotals.entries()]
    .map(([unit, count]) => ({ unit, count }))
    .sort((a, b) => b.count - a.count || a.unit.localeCompare(b.unit, "es"))
    .slice(0, 10);

  const errorsByTypeList = [...errorsByType.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, "es"));

  const sectionIdCountsList = [...sectionIdCounts.entries()]
    .map(([sectionId, count]) => ({ sectionId, count }))
    .sort((a, b) => b.count - a.count || a.sectionId.localeCompare(b.sectionId, "es"));

  return {
    pdfsAnalyzed: results.length,
    pdfsWithErrors,
    pdfsWithUsefulEmbeddedText,
    pdfsWithBomDetected,
    pdfsWithSuggestions,
    totalSuggestedRows,
    averageRowsPerPdfWithBom:
      pdfsWithBomAndRows > 0
        ? Number((rowsInBomPdfs / pdfsWithBomAndRows).toFixed(2))
        : null,
    confidenceDistribution,
    topUnits,
    errorsByType: errorsByTypeList,
    sectionIdCounts: sectionIdCountsList,
  };
}

export function buildBenchmarkReportFingerprint(paths: string[]): string {
  const hash = createHash("sha256");
  hash.update(paths.join("\n"));
  return hash.digest("hex").slice(0, 12);
}

export function getBenchmarkBomSectionCatalog(): string[] {
  return [
    ...TRACKED_BOM_SECTION_IDS,
    ...BOM_SECTION_PATTERNS.map((pattern) => pattern.id),
  ];
}
