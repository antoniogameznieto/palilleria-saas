/**
 * EXPERIMENTAL / DEV ONLY — Fase 18H
 *
 * Investiga viabilidad de trameado/palilleo automático desde PDFs.
 * Sin OCR, sin BD, sin UI, sin APIs externas, sin propuestas productivas.
 *
 * Uso:
 *   npm run research:trameado-auto
 *   npm run research:trameado-auto -- ./ruta/a.pdf ./otra.pdf
 *   npm run research:trameado-auto -- --json
 *
 * PDFs por defecto (si existen localmente):
 *   Ejemplos/Ejemplo 1/Hoja de palilleo.pdf
 *   Ejemplos/Ejemplo 1/Isos trameados.pdf
 */

import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { PDFParse } from "pdf-parse";

const DEFAULT_PDF_PATHS = [
  "Ejemplos/Ejemplo 1/Hoja de palilleo.pdf",
  "Ejemplos/Ejemplo 1/Isos trameados.pdf",
] as const;

const COMPARISON_PDF_PATHS = [
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-01.pdf",
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-02.pdf",
] as const;

const TEXT_PREVIEW_MAX_CHARS = 500;

export const TRAMEADO_AUTO_PATTERNS = {
  hlShort: /\bHL-\d+\b/gi,
  hlLineIdentifier: /\bHL-\d+-[A-Z0-9]+-[A-Z]-0\d\b/gi,
  hlDrawingNumber: /\b2301GB47G-C1-L-HL-\d+-0[12]\b/gi,
  suffix01: /-0[12]\b/g,
  segmentBracket: /<\d+>/g,
  diameterQuoted: /\d+(?:\/\d+)?"/g,
  schExplicit: /\bSCH\.?\s*(?:40|80)\b/gi,
  schLoose: /\b(?:^|\s)(40|80)(?:\s|$)/g,
  lengthCandidate: /\b(?:1[0-9]{2}|[2-9][0-9]{2}|[1-9][0-9]{3,4})\b/g,
  keywords: /\b(TRAMO|PALILLO|ISO|CLASE|COLADA)\b/gi,
  palilloColumn: /\bPALILLO\b/gi,
  bomHeader: /RELACI[ÓO]N\s+DE\s+M\s*ATERIALES|RELACION_DE_MATERIALES/gi,
  lineaNum: /LINEA\s+NUM\.?\s*CLASE/gi,
} as const;

type PatternKey = keyof typeof TRAMEADO_AUTO_PATTERNS;

type PatternMatchSummary = {
  key: PatternKey;
  label: string;
  count: number;
  uniqueSamples: string[];
};

type PageTextSummary = {
  pageNumber: number;
  characterCount: number;
  hasEmbeddedText: boolean;
};

export type TrameadoAutoPdfAnalysis = {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  embeddedTextLength: number;
  embeddedLineCount: number;
  producer: string | null;
  pages: PageTextSummary[];
  patternMatches: PatternMatchSummary[];
  textPreview: string;
  classification: {
    likelyRasterScan: boolean;
    usefulForTrameadoAutomation: boolean;
    usefulForMetadataHints: boolean;
    blueMarksDetectableInText: boolean;
  };
  notes: string[];
};

type CliOptions = {
  pdfPaths: string[];
  includeComparison: boolean;
  json: boolean;
  help: boolean;
};

const PATTERN_LABELS: Record<PatternKey, string> = {
  hlShort: "HL-\\d+",
  hlLineIdentifier: "HL-\\d+-[A-Z0-9]+-[A-Z]-0\\d",
  hlDrawingNumber: "2301GB47G-C1-L-HL-\\d+-0[12]",
  suffix01: "-01 / -02",
  segmentBracket: "<\\d+> (tramos)",
  diameterQuoted: 'Diámetro con "',
  schExplicit: "SCH 40 / SCH 80",
  schLoose: "40 / 80 sueltos",
  lengthCandidate: "Números candidatos a longitud (100–9999)",
  keywords: "TRAMO, PALILLO, ISO, CLASE, COLADA",
  palilloColumn: "PALILLO (columna)",
  bomHeader: "RELACIÓN DE MATERIALES",
  lineaNum: "LINEA NUM. CLASE",
};

function printUsage(): void {
  console.log(`research-trameado-auto — investigación Fase 18H

Uso:
  npm run research:trameado-auto
  npm run research:trameado-auto -- <ruta.pdf> [más.pdf ...]
  npm run research:trameado-auto -- --comparison
  npm run research:trameado-auto -- --json

Opciones:
  --comparison   Incluye PDFs vectoriales HL-1291 -01/-02 como contraste
  --json         Salida JSON (para documentar hallazgos)
  --help         Muestra esta ayuda

Notas:
  - Solo texto embebido (pdf-parse); sin OCR ni Tesseract productivo.
  - No modifica BD, UI ni genera propuestas reales.
  - Documentación: docs/trameado-auto-research.md
`);
}

function parseArgs(argv: string[]): CliOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { pdfPaths: [], includeComparison: false, json: false, help: true };
  }

  const pdfPaths = argv.filter(
    (arg) => !arg.startsWith("-") && arg.endsWith(".pdf"),
  );

  return {
    pdfPaths,
    includeComparison: argv.includes("--comparison"),
    json: argv.includes("--json"),
    help: false,
  };
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function uniqueMatches(text: string, pattern: RegExp): string[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  const matches = text.match(globalPattern) ?? [];

  return [...new Set(matches.map((match) => match.trim()))].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true }),
  );
}

function summarizePatterns(text: string): PatternMatchSummary[] {
  return (Object.keys(TRAMEADO_AUTO_PATTERNS) as PatternKey[]).map((key) => {
    const uniqueSamples = uniqueMatches(text, TRAMEADO_AUTO_PATTERNS[key]);

    return {
      key,
      label: PATTERN_LABELS[key],
      count: uniqueSamples.length,
      uniqueSamples: uniqueSamples.slice(0, 20),
    };
  });
}

function classifyPdf(
  analysis: Pick<
    TrameadoAutoPdfAnalysis,
    "embeddedTextLength" | "fileSizeBytes" | "pageCount" | "producer" | "patternMatches"
  >,
): TrameadoAutoPdfAnalysis["classification"] {
  const hasHlIdentifier =
    analysis.patternMatches.find((match) => match.key === "hlLineIdentifier")
      ?.count ?? 0;
  const hasSegment =
    analysis.patternMatches.find((match) => match.key === "segmentBracket")
      ?.count ?? 0;
  const hasPalilloKeyword =
    analysis.patternMatches.find((match) => match.key === "palilloColumn")
      ?.count ?? 0;
  const hasBom =
    analysis.patternMatches.find((match) => match.key === "bomHeader")?.count ??
    0;
  const charsPerPage =
    analysis.pageCount > 0
      ? analysis.embeddedTextLength / analysis.pageCount
      : analysis.embeddedTextLength;
  const likelyRasterScan =
    analysis.producer?.toUpperCase().includes("RICOH") === true ||
    (analysis.embeddedTextLength < 200 &&
      analysis.fileSizeBytes > 400_000) ||
    charsPerPage < 30;

  return {
    likelyRasterScan,
    usefulForTrameadoAutomation:
      hasSegment > 0 && hasPalilloKeyword > 0 && analysis.embeddedTextLength > 500,
    usefulForMetadataHints:
      hasHlIdentifier > 0 || hasBom > 0 || analysis.embeddedTextLength > 800,
    blueMarksDetectableInText: hasSegment > 0 || hasPalilloKeyword > 0,
  };
}

function buildNotes(
  analysis: Omit<TrameadoAutoPdfAnalysis, "notes">,
): string[] {
  const notes: string[] = [];

  if (analysis.classification.likelyRasterScan) {
    notes.push(
      "PDF probablemente escaneado o compuesto raster (RICOH / poco texto vs tamaño grande).",
    );
  }

  if (analysis.embeddedTextLength <= 200) {
    notes.push(
      "Texto embebido insuficiente para parser de tramos o longitudes PALILLO.",
    );
  }

  const segmentMatches =
    analysis.patternMatches.find((match) => match.key === "segmentBracket")
      ?.uniqueSamples ?? [];
  if (segmentMatches.length === 0) {
    notes.push("No se detectaron tramos <n> como texto embebido.");
  }

  const palilloMatches =
    analysis.patternMatches.find((match) => match.key === "palilloColumn")
      ?.count ?? 0;
  if (palilloMatches === 0) {
    notes.push("No aparece columna PALILLO ni longitudes estructuradas en texto.");
  }

  if (!analysis.classification.blueMarksDetectableInText) {
    notes.push(
      "Marcas azules / anotaciones manuscritas no son texto embebido; requerirían OCR/visión (Nivel 4).",
    );
  }

  if (
    analysis.classification.usefulForMetadataHints &&
    !analysis.classification.usefulForTrameadoAutomation
  ) {
    notes.push(
      "Útil para hints de metadatos/BOM (ISO, Ø, SCH.), no para autogenerar tramos.",
    );
  }

  return notes;
}

export async function analyzeTrameadoAutoPdf(
  pdfPath: string,
): Promise<TrameadoAutoPdfAnalysis> {
  const absolutePath = path.resolve(pdfPath);
  const buffer = await readFile(absolutePath);

  if (!isPdfBuffer(buffer)) {
    throw new Error(`No parece un PDF válido: ${absolutePath}`);
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo({ parsePageInfo: true });
    const textResult = await parser.getText();
    const text = textResult.text;
    const trimmed = text.trim();
    const patternMatches = summarizePatterns(text);
    const pages: PageTextSummary[] = info.pages.map((page) => {
      const pageText = textResult.getPageText(page.pageNumber).trim();

      return {
        pageNumber: page.pageNumber,
        characterCount: pageText.length,
        hasEmbeddedText: pageText.length > 0,
      };
    });

    const base = {
      filePath: absolutePath,
      fileName: path.basename(absolutePath),
      fileSizeBytes: buffer.length,
      pageCount: info.total,
      embeddedTextLength: trimmed.length,
      embeddedLineCount:
        trimmed.length > 0 ? trimmed.split(/\r?\n/).length : 0,
      producer: info.info?.Producer ? String(info.info.Producer) : null,
      pages,
      patternMatches,
      textPreview: trimmed.slice(0, TEXT_PREVIEW_MAX_CHARS),
    };

    const classification = classifyPdf(base);
    const withClassification = { ...base, classification };
    const notes = buildNotes(withClassification);

    return { ...withClassification, notes };
  } finally {
    await parser.destroy();
  }
}

async function resolvePdfPaths(options: CliOptions): Promise<string[]> {
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const requested =
    options.pdfPaths.length > 0 ? options.pdfPaths : [...DEFAULT_PDF_PATHS];
  const withComparison = options.includeComparison
    ? [...requested, ...COMPARISON_PDF_PATHS]
    : requested;

  const resolved: string[] = [];

  for (const relativePath of withComparison) {
    const absolutePath = path.isAbsolute(relativePath)
      ? relativePath
      : path.join(repoRoot, relativePath);

    try {
      await access(absolutePath);
      resolved.push(absolutePath);
    } catch {
      console.warn(`⚠ PDF no encontrado (omitido): ${relativePath}`);
    }
  }

  if (resolved.length === 0) {
    throw new Error(
      "No hay PDFs para analizar. Pasa rutas como argumentos o coloca los ejemplos en Ejemplos/Ejemplo 1/.",
    );
  }

  return resolved;
}

function printAnalysis(analysis: TrameadoAutoPdfAnalysis): void {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`Archivo: ${analysis.fileName}`);
  console.log(`Ruta: ${analysis.filePath}`);
  console.log(
    `Tamaño: ${formatBytes(analysis.fileSizeBytes)} · Páginas: ${analysis.pageCount}`,
  );
  console.log(`Productor PDF: ${analysis.producer ?? "desconocido"}`);
  console.log(
    `Texto embebido: ${analysis.embeddedTextLength} caracteres · ${analysis.embeddedLineCount} líneas`,
  );

  console.log("\n--- Páginas ---");
  for (const page of analysis.pages) {
    console.log(
      `  Página ${page.pageNumber}: ${page.characterCount} chars embebidos`,
    );
  }

  console.log("\n--- Patrones detectados ---");
  for (const match of analysis.patternMatches) {
    if (match.count === 0) {
      console.log(`  ${match.label}: —`);
      continue;
    }

    console.log(
      `  ${match.label}: ${match.uniqueSamples.join(", ")}${match.count > match.uniqueSamples.length ? " …" : ""}`,
    );
  }

  console.log("\n--- Clasificación ---");
  console.log(
    `  Escaneo raster probable: ${analysis.classification.likelyRasterScan ? "sí" : "no"}`,
  );
  console.log(
    `  Útil para automatizar tramos: ${analysis.classification.usefulForTrameadoAutomation ? "sí" : "no"}`,
  );
  console.log(
    `  Útil para hints metadatos/BOM: ${analysis.classification.usefulForMetadataHints ? "sí" : "no"}`,
  );
  console.log(
    `  Marcas azules en texto embebido: ${analysis.classification.blueMarksDetectableInText ? "sí" : "no"}`,
  );

  if (analysis.notes.length > 0) {
    console.log("\n--- Notas ---");
    for (const note of analysis.notes) {
      console.log(`  • ${note}`);
    }
  }

  if (analysis.textPreview) {
    console.log("\n--- Vista previa texto embebido ---");
    console.log(analysis.textPreview);
    if (analysis.embeddedTextLength > TEXT_PREVIEW_MAX_CHARS) {
      console.log("… (truncado)");
    }
  }
}

function printSummary(analyses: TrameadoAutoPdfAnalysis[]): void {
  console.log(`\n${"=".repeat(72)}`);
  console.log("RESUMEN Fase 18H — trameado automático");
  console.log("=".repeat(72));

  for (const analysis of analyses) {
    console.log(
      [
        analysis.fileName,
        `${analysis.embeddedTextLength} chars`,
        analysis.classification.usefulForTrameadoAutomation
          ? "automatización tramos: posible"
          : "automatización tramos: no",
        analysis.classification.usefulForMetadataHints
          ? "hints metadatos: sí"
          : "hints metadatos: no",
      ].join(" · "),
    );
  }

  console.log(`
Conclusión rápida:
  • Hoja de palilleo / Isos trameados (escaneos): Nivel 0–1 (manual + hints).
  • PDFs vectoriales HL individuales: Nivel 1–2 (metadatos, BOM, precrear hojas).
  • Tramos <n> y PALILLO desde PDF cliente: no detectables sin OCR/visión.

Ver docs/trameado-auto-research.md para recomendación de fase 18I.
`);
}

async function main(): Promise<void> {
  let options: CliOptions;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    printUsage();
    console.error(
      `\nError: ${error instanceof Error ? error.message : "Argumentos inválidos"}`,
    );
    process.exit(1);
  }

  if (options.help) {
    printUsage();
    return;
  }

  const pdfPaths = await resolvePdfPaths(options);
  const analyses: TrameadoAutoPdfAnalysis[] = [];

  for (const pdfPath of pdfPaths) {
    analyses.push(await analyzeTrameadoAutoPdf(pdfPath));
  }

  if (options.json) {
    console.log(JSON.stringify(analyses, null, 2));
    return;
  }

  console.log("=== research-trameado-auto (Fase 18H, experimental) ===");
  console.log(`PDFs analizados: ${analyses.length}`);

  for (const analysis of analyses) {
    printAnalysis(analysis);
  }

  printSummary(analyses);
}

main().catch((error) => {
  console.error(
    "Error:",
    error instanceof Error ? error.message : "fallo inesperado",
  );
  process.exit(1);
});
