/**
 * EXPERIMENTAL / DEV ONLY — Fase 16A
 *
 * Investiga soportes y partidas fuera del BOM en texto embebido de PDFs.
 * Sin OCR, sin BD, sin APIs externas, sin tocar producto.
 *
 * Uso:
 *   npm run research:out-of-bom -- ./tests/fixtures/auto-takeoff-golden --limit 10
 *   npm run research:out-of-bom -- ./Ejemplos --match "DMS-70" --json
 */

import { execSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFParse } from "pdf-parse";

import { resolveBenchmarkPdfInputs } from "../lib/drawings/auto-takeoff-benchmark";
import {
  aggregateOutOfBomAnalyses,
  analyzeOutOfBomEmbeddedText,
  type OutOfBomPdfAnalysis,
} from "../lib/drawings/out-of-bom-research";

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..");
const MD_OUTPUT = path.join(WORKSPACE_ROOT, "docs/out-of-bom-items-research.md");
const JSON_OUTPUT = path.join(
  WORKSPACE_ROOT,
  "docs/out-of-bom-items-research.json",
);

type CliOptions = {
  inputs: string[];
  limit: number | null;
  matchPattern: string | null;
  writeJson: boolean;
  skipMarkdown: boolean;
  help: boolean;
};

function printUsage(): void {
  console.log(`research-out-of-bom-items — investigación Fase 16A

Uso:
  npm run research:out-of-bom -- <pdf|directorio> [más rutas...] [opciones]

Opciones:
  --limit <N>       Máximo de PDFs únicos (dedupe por nombre)
  --match <patrón>  Filtra por nombre (regex o substring)
  --json            Escribe docs/out-of-bom-items-research.json
  --no-md           No escribe docs/out-of-bom-items-research.md
  --help            Muestra esta ayuda

Notas:
  - Solo texto embebido (pdf-parse); sin OCR ni Tesseract.
  - No guarda en BD ni modifica UI/importación.
`);
}

function parseArgs(argv: string[]): CliOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    return {
      inputs: [],
      limit: null,
      matchPattern: null,
      writeJson: false,
      skipMarkdown: false,
      help: true,
    };
  }

  const inputs: string[] = [];
  let limit: number | null = null;
  let matchPattern: string | null = null;
  let writeJson = false;
  let skipMarkdown = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--limit") {
      const raw = argv[index + 1];

      if (!raw) {
        throw new Error("Falta valor para --limit.");
      }

      limit = Number(raw);

      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error(`--limit inválido: ${raw}`);
      }

      index += 1;
      continue;
    }

    if (arg === "--match") {
      const raw = argv[index + 1];

      if (!raw) {
        throw new Error("Falta valor para --match.");
      }

      matchPattern = raw;
      index += 1;
      continue;
    }

    if (arg === "--json") {
      writeJson = true;
      continue;
    }

    if (arg === "--no-md") {
      skipMarkdown = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Opción desconocida: ${arg}`);
    }

    inputs.push(arg);
  }

  if (inputs.length === 0) {
    throw new Error("Indica al menos una ruta de PDF o directorio.");
  }

  return { inputs, limit, matchPattern, writeJson, skipMarkdown, help: false };
}

function resolveGitCommit(): string {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

async function resolveBusinessSetPdfPaths(businessDir: string): Promise<string[]> {
  const setPath = path.join(businessDir, "business-set.json");
  const raw = await readFile(setPath, "utf8");
  const parsed = JSON.parse(raw) as {
    pdfBaseDir?: string;
    cases?: Array<{ pdf: string }>;
  };
  const baseDir = path.resolve(
    businessDir,
    parsed.pdfBaseDir ?? "../auto-takeoff-golden",
  );

  return (parsed.cases ?? []).map((item) => path.join(baseDir, item.pdf));
}

async function resolveInputPdfPaths(params: {
  inputs: string[];
  matchPattern: string | null;
  limit: number | null;
}): Promise<string[]> {
  const collected: string[] = [];

  for (const input of params.inputs) {
    const absoluteInput = path.resolve(input);
    const businessSetPath = path.join(absoluteInput, "business-set.json");

    try {
      const businessSetStat = await stat(businessSetPath);

      if (businessSetStat.isFile()) {
        collected.push(...(await resolveBusinessSetPdfPaths(absoluteInput)));
        continue;
      }
    } catch {
      // not a business set directory
    }

    collected.push(
      ...(await resolveBenchmarkPdfInputs({
        inputs: [absoluteInput],
        matchPattern: params.matchPattern,
        limit: null,
      })),
    );
  }

  const deduped = [...new Set(collected)];

  const filtered =
    params.matchPattern == null
      ? deduped
      : deduped.filter((pdfPath) => {
          const fileName = path.basename(pdfPath);
          try {
            return new RegExp(params.matchPattern!, "i").test(fileName);
          } catch {
            return fileName.toLowerCase().includes(params.matchPattern!.toLowerCase());
          }
        });

  if (params.limit != null && params.limit > 0) {
    return filtered.slice(0, params.limit);
  }

  return filtered;
}

async function analyzePdfFile(absolutePath: string): Promise<OutOfBomPdfAnalysis> {
  const fileName = path.basename(absolutePath);
  const buffer = await readFile(absolutePath);

  if (!isPdfBuffer(buffer)) {
    throw new Error("El archivo no parece un PDF válido (%PDF).");
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo({ parsePageInfo: true });
    const text = (await parser.getText()).text.trim();

    return analyzeOutOfBomEmbeddedText({
      text,
      fileName,
      path: absolutePath,
      pageCount: info.total,
    });
  } finally {
    await parser.destroy();
  }
}

function formatCandidateBlock(
  title: string,
  candidates: OutOfBomPdfAnalysis["supportCandidates"],
  maxItems: number,
): string {
  if (candidates.length === 0) {
    return `### ${title}\n\n_Ninguno._\n`;
  }

  const lines = [`### ${title}`, ""];

  for (const candidate of candidates.slice(0, maxItems)) {
    lines.push(
      `- **L${candidate.lineNumber}** (${candidate.patternLabel}, ${candidate.region}, ${candidate.parseability})`,
    );
    lines.push(`  - \`${candidate.lineText.slice(0, 140)}\``);

    if (candidate.contextBefore.length > 0) {
      lines.push(
        `  - Antes: ${candidate.contextBefore.map((line) => `\`${line.slice(0, 80)}\``).join(" · ")}`,
      );
    }

    if (candidate.contextAfter.length > 0) {
      lines.push(
        `  - Después: ${candidate.contextAfter.map((line) => `\`${line.slice(0, 80)}\``).join(" · ")}`,
      );
    }

    if (candidate.observations.length > 0) {
      lines.push(`  - ${candidate.observations.join(" ")}`);
    }
  }

  if (candidates.length > maxItems) {
    lines.push(`- … y ${candidates.length - maxItems} más`);
  }

  lines.push("");
  return lines.join("\n");
}

function buildMarkdownReport(params: {
  commit: string;
  analyses: OutOfBomPdfAnalysis[];
  summary: ReturnType<typeof aggregateOutOfBomAnalyses>;
  inputs: string[];
}): string {
  const date = new Date().toISOString().slice(0, 10);
  const pdfList = params.analyses.map((item) => item.fileName).join(", ");

  const perPdfSections = params.analyses
    .map((analysis) => {
      return [
        `## ${analysis.fileName}`,
        "",
        `- **Ruta:** \`${path.relative(WORKSPACE_ROOT, analysis.path)}\``,
        `- **Páginas:** ${analysis.pageCount ?? "?"}`,
        `- **Texto embebido:** ${analysis.embeddedTextLength} caracteres`,
        `- **BOM:** ${analysis.hasBom ? analysis.bomSectionIds.join(", ") : "no"}`,
        `- **Bloque SOPORTES:** ${analysis.hasSoportesBlock ? `sí (línea ${analysis.soportesLineNumber})` : "no"}`,
        `- **Filas BOM parseadas:** ${analysis.bomParsedRowCount}`,
        `- **Candidatos soporte:** ${analysis.supportCandidates.length}`,
        `- **Candidatos fuera de BOM:** ${analysis.outOfBomCandidates.length}`,
        analysis.observations.length > 0
          ? `- **Observaciones:** ${analysis.observations.join(" ")}`
          : null,
        "",
        formatCandidateBlock("Soportes", analysis.supportCandidates, 8),
        formatCandidateBlock(
          "Fuera de BOM (manual)",
          analysis.outOfBomCandidates,
          8,
        ),
      ]
        .filter((line): line is string => line != null)
        .join("\n");
    })
    .join("\n");

  return `# Investigación partidas fuera del BOM (Fase 16A)

**Fecha:** ${date}  
**Commit probado:** \`${params.commit}\`  
**Entradas:** ${params.inputs.map((input) => `\`${input}\``).join(", ")}

## Resumen

| Métrica | Valor |
|---------|-------|
| PDFs analizados | ${params.summary.pdfsAnalyzed} |
| Con BOM | ${params.summary.pdfsWithBom} |
| Con bloque SOPORTES | ${params.summary.pdfsWithSoportesBlock} |
| Candidatos soporte (total) | ${params.summary.totalSupportCandidates} |
| Filas soporte tabulares | ${params.summary.parseableSupportRows} |
| Menciones soporte sueltas | ${params.summary.looseSupportMentions} |
| Candidatos fuera de BOM | ${params.summary.totalOutOfBomCandidates} |

**PDFs:** ${pdfList}

## Patrones buscados

- SOPORTES, SOPORTE, STD-PS, SUP-, SUPPORT
- BRIDA, VÁLVULA (fuera del BOM parseado)
- Referencias DW en texto embebido

## Hallazgos por PDF

${perPdfSections}

## Patrones encontrados

| Patrón | Dónde aparece | Estructura | Parseable |
|--------|---------------|------------|-----------|
| SOPORTES + STD-PS / SUP- | DMS/HL tras BOM | Bloque tabular tras cabecera | **Sí** (mismo patrón que \`SUPPORT_ROW_PATTERN\`) |
| SOPORTE suelto | HL/DW en notas o leyendas | Texto suelto | No automático |
| BRIDA / VÁLVULA sin SAP | DW-701 cajetín o notas | Texto suelto / anotación | No fiable sin OCR espacial |
| BRIDA en BOM | DMS/HL | Ya en tabla BOM | N/A (no es fuera de BOM) |

## Riesgos de falso positivo

- Menciones de BRIDA/VÁLVULA **dentro** del BOM principal (filas SAP ya parseadas).
- Texto de cajetín, notas generales o simbología que repite palabras clave.
- Parser actual **corta en SOPORTES**; filas posteriores no entran al BOM aunque sean tabulares.

## Recomendación para Fase 16B

1. **Soportes DMS/HL (STD-PS, SUP-):** ampliar parser con bloque opt-in post-SOPORTES; confianza media; acción \`review\` hasta validar en más PDFs.
2. **Partidas DW (brida/válvula/soporte sin SAP):** **checklist manual** en asistente; no parsear automáticamente desde texto suelto.
3. **HL soporte genérico:** marcar como \`review\` manual si aparece solo como mención suelta tras SOPORTES.

_No modifica producto ni importación. Investigación con texto embebido únicamente._
`;
}

function printConsoleSummary(
  analyses: OutOfBomPdfAnalysis[],
  summary: ReturnType<typeof aggregateOutOfBomAnalyses>,
): void {
  console.log("\n=== Investigación fuera del BOM (16A) ===\n");
  console.log(`PDFs analizados:           ${summary.pdfsAnalyzed}`);
  console.log(`Con BOM:                   ${summary.pdfsWithBom}`);
  console.log(`Con bloque SOPORTES:       ${summary.pdfsWithSoportesBlock}`);
  console.log(`Candidatos soporte:        ${summary.totalSupportCandidates}`);
  console.log(`  tabulares (parseables):  ${summary.parseableSupportRows}`);
  console.log(`  menciones sueltas:       ${summary.looseSupportMentions}`);
  console.log(`Candidatos fuera de BOM:   ${summary.totalOutOfBomCandidates}`);

  console.log("\n--- Por PDF ---\n");

  for (const analysis of analyses) {
    console.log(analysis.fileName);
    console.log(`  ruta: ${path.relative(WORKSPACE_ROOT, analysis.path)}`);
    console.log(
      `  páginas: ${analysis.pageCount ?? "?"} | chars: ${analysis.embeddedTextLength}`,
    );
    console.log(
      `  BOM: ${analysis.hasBom ? "sí" : "no"} | SOPORTES: ${analysis.hasSoportesBlock ? `línea ${analysis.soportesLineNumber}` : "no"}`,
    );
    console.log(
      `  soporte: ${analysis.supportCandidates.length} | fuera BOM: ${analysis.outOfBomCandidates.length}`,
    );

    const tabSupport = analysis.supportCandidates.find(
      (candidate) => candidate.parseability === "tab_row_support",
    );

    if (tabSupport) {
      console.log(`  ejemplo soporte: L${tabSupport.lineNumber} ${tabSupport.lineText.slice(0, 72)}`);
    }

    const manual = analysis.outOfBomCandidates[0];

    if (manual) {
      console.log(`  ejemplo manual: L${manual.lineNumber} ${manual.lineText.slice(0, 72)}`);
    }
  }

  console.log(`\nInforme: ${path.relative(WORKSPACE_ROOT, MD_OUTPUT)}`);
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

  const pdfPaths = await resolveInputPdfPaths({
    inputs: options.inputs,
    matchPattern: options.matchPattern,
    limit: options.limit,
  });

  if (pdfPaths.length === 0) {
    throw new Error("No se encontraron PDFs con los filtros indicados.");
  }

  const analyses: OutOfBomPdfAnalysis[] = [];

  for (const pdfPath of pdfPaths) {
    try {
      analyses.push(await analyzePdfFile(pdfPath));
    } catch (error) {
      console.error(
        `Error en ${path.basename(pdfPath)}: ${
          error instanceof Error ? error.message : "fallo inesperado"
        }`,
      );
    }
  }

  if (analyses.length === 0) {
    throw new Error("Ningún PDF pudo analizarse.");
  }

  const summary = aggregateOutOfBomAnalyses(analyses);
  const commit = resolveGitCommit();

  printConsoleSummary(analyses, summary);

  if (!options.skipMarkdown) {
    await mkdir(path.dirname(MD_OUTPUT), { recursive: true });
    await writeFile(
      MD_OUTPUT,
      buildMarkdownReport({
        commit,
        analyses,
        summary,
        inputs: options.inputs,
      }),
      "utf8",
    );
  }

  if (options.writeJson) {
    await mkdir(path.dirname(JSON_OUTPUT), { recursive: true });
    await writeFile(
      JSON_OUTPUT,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          commit,
          summary,
          analyses,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`JSON: ${path.relative(WORKSPACE_ROOT, JSON_OUTPUT)}`);
  }
}

main().catch((error) => {
  console.error(
    "Error:",
    error instanceof Error ? error.message : "fallo inesperado",
  );
  process.exit(1);
});
