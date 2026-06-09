/**
 * EXPERIMENTAL / DEV ONLY — Fase 15A
 *
 * Benchmark de extracción automática de palillería desde texto embebido en PDFs.
 * Sin OCR, sin BD, sin APIs externas, sin autoimportar.
 *
 * Uso:
 *   npm run benchmark:auto-takeoff -- ./Ejemplos/Ejemplo\ 1 ./storage
 *   npm run benchmark:auto-takeoff -- ./ruta/plano.pdf --limit 10
 *   npm run benchmark:auto-takeoff -- ./Ejemplos --match "DMS-70"
 */

import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  aggregateAutoTakeoffBenchmarkResults,
  analyzePdfForAutoTakeoffBenchmark,
  buildBenchmarkReportFingerprint,
  getBenchmarkBomSectionCatalog,
  resolveBenchmarkPdfInputs,
  type PdfBenchmarkResult,
} from "../lib/drawings/auto-takeoff-benchmark";

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..");
const JSON_OUTPUT = path.join(
  WORKSPACE_ROOT,
  "docs/auto-takeoff-benchmark-results.json",
);
const MD_OUTPUT = path.join(
  WORKSPACE_ROOT,
  "docs/auto-takeoff-benchmark-results.md",
);

type CliOptions = {
  inputs: string[];
  limit: number | null;
  matchPattern: string | null;
  skipJson: boolean;
  help: boolean;
};

function printUsage(): void {
  console.log(`benchmark-auto-takeoff — benchmark Fase 15A

Uso:
  npm run benchmark:auto-takeoff -- <pdf|directorio> [más rutas...] [opciones]

Opciones:
  --limit <N>       Máximo de PDFs únicos (dedupe por nombre de archivo)
  --match <patrón>  Filtra por nombre (regex o substring)
  --no-json         No escribe docs/auto-takeoff-benchmark-results.json
  --help            Muestra esta ayuda

Notas:
  - Solo texto embebido (pdf-parse); sin OCR ni Tesseract.
  - No guarda en BD ni modifica el flujo productivo.
  - Escribe docs/auto-takeoff-benchmark-results.md (y JSON salvo --no-json).
  - Un PDF fallido no detiene el resto del benchmark.
`);
}

function parseArgs(argv: string[]): CliOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    return {
      inputs: [],
      limit: null,
      matchPattern: null,
      skipJson: false,
      help: true,
    };
  }

  const inputs: string[] = [];
  let limit: number | null = null;
  let matchPattern: string | null = null;
  let skipJson = false;

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

    if (arg === "--no-json") {
      skipJson = true;
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

  return { inputs, limit, matchPattern, skipJson, help: false };
}

function resolveGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function formatPercent(part: number, total: number): string {
  if (total === 0) {
    return "0%";
  }

  return `${((part / total) * 100).toFixed(1)}%`;
}

function printConsoleSummary(
  results: PdfBenchmarkResult[],
  summary: ReturnType<typeof aggregateAutoTakeoffBenchmarkResults>,
): void {
  console.log("\n=== Benchmark auto-takeoff (texto embebido) ===\n");
  console.log(`PDFs analizados:              ${summary.pdfsAnalyzed}`);
  console.log(
    `PDFs con texto útil:          ${summary.pdfsWithUsefulEmbeddedText} (${formatPercent(summary.pdfsWithUsefulEmbeddedText, summary.pdfsAnalyzed)})`,
  );
  console.log(
    `PDFs con BOM detectada:       ${summary.pdfsWithBomDetected} (${formatPercent(summary.pdfsWithBomDetected, summary.pdfsAnalyzed)})`,
  );
  console.log(
    `PDFs con >=1 sugerencia:      ${summary.pdfsWithSuggestions} (${formatPercent(summary.pdfsWithSuggestions, summary.pdfsAnalyzed)})`,
  );
  console.log(`Total filas sugeridas:        ${summary.totalSuggestedRows}`);

  if (summary.averageRowsPerPdfWithBom != null) {
    console.log(
      `Media filas/PDF con BOM:      ${summary.averageRowsPerPdfWithBom}`,
    );
  }

  console.log("\nDistribución de confianza (filas):");
  console.log(`  alta (>=0.9):   ${summary.confidenceDistribution.high}`);
  console.log(`  media (0.45-0.9): ${summary.confidenceDistribution.medium}`);
  console.log(`  baja (<0.45):   ${summary.confidenceDistribution.low}`);

  if (summary.topUnits.length > 0) {
    console.log("\nTop unidades detectadas:");
    for (const entry of summary.topUnits.slice(0, 8)) {
      console.log(`  ${entry.unit}: ${entry.count} PDF(s)`);
    }
  }

  if (summary.errorsByType.length > 0) {
    console.log("\nErrores por tipo:");
    for (const entry of summary.errorsByType) {
      console.log(`  ${entry.type}: ${entry.count}`);
    }
  }

  console.log("\n--- Por PDF ---\n");

  for (const result of results) {
    const status = result.error
      ? `ERROR (${result.errorType})`
      : result.suggestedRowCount > 0
        ? `${result.suggestedRowCount} filas`
        : result.trackedSectionsFound.length > 0
          ? "BOM sin filas"
          : result.hasUsefulEmbeddedText
            ? "texto sin BOM"
            : "sin texto útil";

    console.log(`${result.fileName}`);
    console.log(`  ruta: ${result.relativePath}`);
    console.log(
      `  páginas: ${result.pageCount ?? "?"} | texto: ${result.embeddedTextLength} chars | útil: ${result.hasUsefulEmbeddedText}`,
    );
    console.log(
      `  secciones: ${result.trackedSectionsFound.join(", ") || "—"} | ${status}`,
    );

    if (result.averageConfidence != null) {
      console.log(
        `  confianza media: ${result.averageConfidence} | ref: ${result.rowsWithReference} | sin ref: ${result.rowsWithoutReference}`,
      );
    }

    if (result.unitsDetected.length > 0) {
      console.log(`  unidades: ${result.unitsDetected.join(", ")}`);
    }

    if (result.warnings.length > 0) {
      console.log(`  warnings: ${result.warnings.join("; ")}`);
    }

    if (result.error) {
      console.log(`  error: ${result.error}`);
    }

    console.log("");
  }
}

function buildMarkdownReport(params: {
  command: string;
  commit: string;
  dateIso: string;
  inputs: string[];
  pdfPaths: string[];
  results: PdfBenchmarkResult[];
  summary: ReturnType<typeof aggregateAutoTakeoffBenchmarkResults>;
}): string {
  const { command, commit, dateIso, inputs, pdfPaths, results, summary } =
    params;

  const goodCases = results
    .filter((r) => !r.error && r.suggestedRowCount >= 5)
    .sort((a, b) => b.suggestedRowCount - a.suggestedRowCount)
    .slice(0, 5);

  const badCases = [
    ...results.filter((r) => r.error),
    ...results.filter((r) => !r.error && !r.hasUsefulEmbeddedText),
    ...results.filter(
      (r) =>
        !r.error &&
        r.hasUsefulEmbeddedText &&
        r.trackedSectionsFound.length === 0,
    ),
    ...results.filter(
      (r) =>
        !r.error &&
        r.trackedSectionsFound.length > 0 &&
        r.suggestedRowCount === 0,
    ),
    ...results.filter(
      (r) =>
        !r.error &&
        r.trackedSectionsFound.length > 0 &&
        r.suggestedRowCount > 0 &&
        r.suggestedRowCount <= 3,
    ),
  ]
    .filter(
      (result, index, list) =>
        list.findIndex((item) => item.path === result.path) === index,
    )
    .slice(0, 6);

  const tableRows = results
    .map((result) => {
      const sections = result.trackedSectionsFound.join(", ") || "—";
      const status = result.error
        ? `Error: ${result.errorType}`
        : result.suggestedRowCount > 0
          ? `${result.suggestedRowCount} filas`
          : result.trackedSectionsFound.length > 0
            ? "BOM sin filas"
            : result.hasUsefulEmbeddedText
              ? "Sin BOM"
              : "Sin texto útil";

      return `| ${result.fileName} | ${result.pageCount ?? "—"} | ${result.embeddedTextLength} | ${result.hasUsefulEmbeddedText ? "sí" : "no"} | ${sections} | ${result.suggestedRowCount} | ${result.averageConfidence ?? "—"} | ${result.rowsWithReference} | ${result.rowsWithoutReference} | ${status} |`;
    })
    .join("\n");

  const viability =
    summary.pdfsWithSuggestions >= 3 &&
    summary.totalSuggestedRows >= 30 &&
    summary.pdfsWithBomDetected / Math.max(summary.pdfsAnalyzed, 1) >= 0.25
      ? "Parcialmente viable para beta acotada: varios planos reales extraen filas útiles, pero la cobertura no es universal."
      : summary.pdfsWithSuggestions > 0
        ? "Viable solo en subconjunto acotado de planos con BOM en texto embebido legible; no listo para automatización amplia."
        : "No viable con la muestra actual sin OCR u otras fuentes.";

  const recommendation15B =
    summary.pdfsWithSuggestions >= 3
      ? [
          "Ampliar golden set etiquetado (10–15 PDFs) con filas esperadas para medir precisión, no solo cobertura.",
          "Priorizar planos con `RELACIÓN DE MATERIALES` y referencias SAP en texto seleccionable.",
          "Excluir o marcar aparte isométricos/palilleros manuales sin BOM embebida.",
          "Beta interna solo en job/drawing con PDFs que pasen `hasUsefulEmbeddedText` + sección BOM en preview.",
        ]
      : [
          "Revisar si la muestra incluye suficientes planos de ingeniería con BOM textual.",
          "Considerar OCR selectivo solo para bloques BOM (fuera de 15A).",
          "Mantener flujo experimental manual hasta mejorar detección de sección.",
        ];

  return `# Benchmark auto-takeoff — Fase 15A

## Metadatos

| Campo | Valor |
| --- | --- |
| Fecha | ${dateIso.slice(0, 10)} |
| Commit probado | \`${commit}\` |
| Comando | \`${command}\` |
| Entradas | ${inputs.map((i) => `\`${i}\``).join(", ")} |
| PDFs únicos analizados | ${pdfPaths.length} |
| Fingerprint muestra | \`${buildBenchmarkReportFingerprint(pdfPaths)}\` |

## Resumen agregado

| Métrica | Valor |
| --- | --- |
| PDFs analizados | ${summary.pdfsAnalyzed} |
| PDFs con texto embebido útil | ${summary.pdfsWithUsefulEmbeddedText} |
| PDFs con BOM / relación detectada | ${summary.pdfsWithBomDetected} |
| PDFs con ≥1 sugerencia | ${summary.pdfsWithSuggestions} |
| Total filas sugeridas | ${summary.totalSuggestedRows} |
| Media filas/PDF con BOM y filas | ${summary.averageRowsPerPdfWithBom ?? "—"} |
| Confianza alta (filas) | ${summary.confidenceDistribution.high} |
| Confianza media (filas) | ${summary.confidenceDistribution.medium} |
| Confianza baja (filas) | ${summary.confidenceDistribution.low} |
| PDFs con error | ${summary.pdfsWithErrors} |

### Top unidades detectadas

${
  summary.topUnits.length > 0
    ? summary.topUnits
        .map((entry) => `- \`${entry.unit}\`: ${entry.count} PDF(s)`)
        .join("\n")
    : "_Ninguna_"
}

### Secciones BOM detectadas (conteo PDFs)

${
  summary.sectionIdCounts.length > 0
    ? summary.sectionIdCounts
        .map((entry) => `- \`${entry.sectionId}\`: ${entry.count}`)
        .join("\n")
    : "_Ninguna_"
}

### Errores por tipo

${
  summary.errorsByType.length > 0
    ? summary.errorsByType
        .map((entry) => `- \`${entry.type}\`: ${entry.count}`)
        .join("\n")
    : "_Ninguno_"
}

## Tabla por PDF

| Archivo | Páginas | Texto (chars) | Texto útil | Secciones BOM | Filas | Conf. media | Con ref | Sin ref | Estado |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | --- |
${tableRows}

## Casos buenos

${
  goodCases.length > 0
    ? goodCases
        .map(
          (r) =>
            `- **${r.fileName}**: ${r.suggestedRowCount} filas, confianza media ${r.averageConfidence}, secciones \`${r.trackedSectionsFound.join("`, `")}\`, refs ${r.rowsWithReference}/${r.suggestedRowCount}.`,
        )
        .join("\n")
    : "_Ninguno destacable en esta muestra._"
}

## Casos problemáticos

${
  badCases.length > 0
    ? badCases
        .map((r) => {
          if (r.error) {
            return `- **${r.fileName}**: error \`${r.errorType}\` — ${r.error}`;
          }

          if (r.trackedSectionsFound.length > 0 && r.suggestedRowCount === 0) {
            return `- **${r.fileName}**: sección BOM detectada pero 0 filas parseadas.`;
          }

          if (r.hasUsefulEmbeddedText && r.trackedSectionsFound.length === 0) {
            return `- **${r.fileName}**: texto útil (${r.embeddedTextLength} chars) sin sección BOM reconocida.`;
          }

          if (
            r.trackedSectionsFound.length > 0 &&
            r.suggestedRowCount > 0 &&
            r.suggestedRowCount <= 3
          ) {
            return `- **${r.fileName}**: BOM detectada pero solo ${r.suggestedRowCount} fila(s) — extracción parcial (posible formato DW distinto o bloque cortado).`;
          }

          return `- **${r.fileName}**: poco o ningún texto embebido (${r.embeddedTextLength} chars).`;
        })
        .join("\n")
    : "_Sin casos problemáticos destacados._"
}

## Conclusiones

${viability}

El motor actual (\`experimental-auto-takeoff-parse\`) depende de:

1. Texto embebido seleccionable (no escaneado).
2. Presencia de encabezados tipo RELACIÓN DE MATERIALES / BOM / MATERIAL LIST.
3. Filas con cantidad + descripción (+ referencia SAP opcional).

Secciones rastreadas en este benchmark: ${getBenchmarkBomSectionCatalog()
    .slice(0, 8)
    .map((id) => `\`${id}\``)
    .join(", ")}, etc.

## Limitaciones (15A)

- Sin OCR: PDFs raster o con texto como trazos no aportan BOM.
- Sin validación contra palillería real (solo extracción).
- Dedupe por nombre de archivo: copias en distintas carpetas cuentan una vez.
- Warnings del parser no implican fallo; pueden indicar filas dudosas.

## Recomendación para Fase 15B

${recommendation15B.map((line) => `- ${line}`).join("\n")}
`;
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

  const resolvedInputs = options.inputs.map((input) =>
    path.resolve(WORKSPACE_ROOT, input),
  );

  console.log("Recopilando PDFs...");
  const pdfPaths = await resolveBenchmarkPdfInputs({
    inputs: resolvedInputs,
    matchPattern: options.matchPattern,
    limit: options.limit,
  });

  if (pdfPaths.length === 0) {
    console.error("No se encontraron PDFs con los criterios indicados.");
    process.exit(1);
  }

  console.log(`Analizando ${pdfPaths.length} PDF(s)...\n`);

  const results: PdfBenchmarkResult[] = [];

  for (const pdfPath of pdfPaths) {
    process.stdout.write(`  ${path.basename(pdfPath)}... `);
    const result = await analyzePdfForAutoTakeoffBenchmark(
      pdfPath,
      WORKSPACE_ROOT,
    );
    results.push(result);
    console.log(
      result.error
        ? `ERROR (${result.errorType})`
        : `${result.suggestedRowCount} filas`,
    );
  }

  const summary = aggregateAutoTakeoffBenchmarkResults(results);
  printConsoleSummary(results, summary);

  const command = `npm run benchmark:auto-takeoff -- ${[...options.inputs, options.limit ? `--limit ${options.limit}` : null, options.matchPattern ? `--match ${options.matchPattern}` : null].filter(Boolean).join(" ")}`;
  const commit = resolveGitCommit();
  const dateIso = new Date().toISOString();

  await mkdir(path.dirname(MD_OUTPUT), { recursive: true });

  const markdown = buildMarkdownReport({
    command,
    commit,
    dateIso,
    inputs: options.inputs,
    pdfPaths,
    results,
    summary,
  });

  await writeFile(MD_OUTPUT, markdown, "utf8");
  console.log(`\nInforme Markdown: ${path.relative(WORKSPACE_ROOT, MD_OUTPUT)}`);

  if (!options.skipJson) {
    const jsonPayload = {
      meta: {
        date: dateIso,
        commit,
        command,
        inputs: options.inputs,
        fingerprint: buildBenchmarkReportFingerprint(pdfPaths),
      },
      summary,
      results,
    };

    await writeFile(JSON_OUTPUT, `${JSON.stringify(jsonPayload, null, 2)}\n`, "utf8");
    console.log(`Informe JSON: ${path.relative(WORKSPACE_ROOT, JSON_OUTPUT)}`);
  }
}

main().catch((error) => {
  console.error(
    `\nError fatal: ${error instanceof Error ? error.message : "desconocido"}`,
  );
  process.exit(1);
});
