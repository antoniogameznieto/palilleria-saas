/**
 * EXPERIMENTAL / DEV ONLY — Fase 14A
 *
 * Investiga extracción de líneas de palillería desde texto embebido de PDFs.
 * Sin OCR, sin BD, sin APIs externas, sin autoaplicar al producto.
 *
 * Uso:
 *   npm run research:auto-takeoff -- ./ruta/plano.pdf
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFParse } from "pdf-parse";

import {
  findBomSections,
  hasUsefulEmbeddedText,
  parseTakeoffRowsFromEmbeddedText,
  type ExperimentalTakeoffCandidateRow,
} from "../lib/drawings/experimental-auto-takeoff-parse";

type CliOptions = {
  pdfPath: string;
  help: boolean;
};

function printUsage(): void {
  console.log(`research-auto-takeoff-from-pdf — investigación Fase 14A

Uso:
  npm run research:auto-takeoff -- <ruta-local.pdf>

Notas:
  - Solo texto embebido (pdf-parse); sin OCR ni Tesseract.
  - No guarda en BD ni modifica el flujo productivo.
  - Registra hallazgos en docs/auto-takeoff-research.md
`);
}

function parseArgs(argv: string[]): CliOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { pdfPath: "", help: true };
  }

  const pdfPath = argv.find((arg) => !arg.startsWith("-"));

  if (!pdfPath) {
    throw new Error("Indica la ruta de un PDF local.");
  }

  return { pdfPath, help: false };
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

function printRow(row: ExperimentalTakeoffCandidateRow): void {
  console.log(
    [
      `#${row.item ?? "?"}`,
      `conf=${row.confidence}`,
      `qty=${row.quantity ?? "?"}`,
      row.unit ? `unit=${row.unit}` : null,
      row.reference ? `ref=${row.reference}` : "ref=null",
      `desc=${row.description?.slice(0, 72) ?? "?"}`,
    ]
      .filter(Boolean)
      .join(" | "),
  );

  if (row.warnings.length > 0) {
    console.log(`   avisos: ${row.warnings.join("; ")}`);
  }
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

  const absolutePath = path.resolve(options.pdfPath);
  const buffer = await readFile(absolutePath);

  if (!isPdfBuffer(buffer)) {
    throw new Error("El archivo no parece un PDF válido (%PDF).");
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo({ parsePageInfo: true });
    const textResult = await parser.getText();
    const text = textResult.text.trim();
    const characterCount = text.length;
    const useful = hasUsefulEmbeddedText(characterCount);
    const sections = findBomSections(text);
    const parseResult = parseTakeoffRowsFromEmbeddedText(text);

    console.log("=== research-auto-takeoff-from-pdf (experimental) ===");
    console.log(`Archivo: ${absolutePath}`);
    console.log(`Tamaño: ${formatBytes(buffer.length)}`);
    console.log(`Páginas: ${info.total}`);
    console.log(`Longitud texto embebido: ${characterCount} caracteres`);
    console.log(`Texto embebido útil: ${useful ? "sí" : "no"}`);

    console.log("\n--- Secciones candidatas ---");

    if (sections.length === 0) {
      console.log("(ninguna)");
    } else {
      for (const section of sections) {
        console.log(`\n[${section.id}] @ índice ${section.index}`);
        console.log(`Fragmento: ${section.snippet}`);
      }
    }

    console.log("\n--- Filas candidatas de palillería ---");
    console.log(`Total: ${parseResult.candidateRows.length}`);

    const previewRows = parseResult.candidateRows.slice(0, 25);

    for (const row of previewRows) {
      printRow(row);
    }

    if (parseResult.candidateRows.length > previewRows.length) {
      console.log(
        `… (${parseResult.candidateRows.length - previewRows.length} filas más omitidas en consola)`,
      );
    }

    console.log("\n--- Advertencias ---");

    if (parseResult.warnings.length === 0) {
      console.log("(ninguna)");
    } else {
      for (const warning of parseResult.warnings) {
        console.log(`- ${warning}`);
      }
    }

    console.log("\n--- Resumen ---");
    console.log(
      `Secciones BOM: ${sections.length} | Filas parseadas: ${parseResult.candidateRows.length}`,
    );

    if (parseResult.candidateRows.length > 0) {
      const avgConfidence =
        parseResult.candidateRows.reduce((sum, row) => sum + row.confidence, 0) /
        parseResult.candidateRows.length;

      console.log(`Confianza media: ${avgConfidence.toFixed(2)}`);
    }
  } finally {
    await parser.destroy();
  }
}

main().catch((error) => {
  console.error(
    "Error:",
    error instanceof Error ? error.message : "fallo inesperado",
  );
  process.exit(1);
});
