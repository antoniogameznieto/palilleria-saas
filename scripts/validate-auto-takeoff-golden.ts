/**
 * EXPERIMENTAL / DEV ONLY — Fase 15B
 *
 * Valida precisión/recall del parser contra golden set etiquetado.
 *
 * Uso:
 *   npm run validate:auto-takeoff-golden
 */

import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { runAutoTakeoffGoldenValidation } from "../lib/drawings/auto-takeoff-golden-run";
import type { GoldenCaseValidationResult } from "../lib/drawings/auto-takeoff-golden-validate";

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..");
const GOLDEN_SET_DIR = path.join(
  WORKSPACE_ROOT,
  "tests/fixtures/auto-takeoff-golden",
);
const REPORT_PATH = path.join(
  WORKSPACE_ROOT,
  "docs/auto-takeoff-golden-results.md",
);

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

function formatPercent(value: number | null): string {
  if (value == null) {
    return "—";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function formatCaseRow(caseResult: GoldenCaseValidationResult): string {
  const status = caseResult.error
    ? `error: ${caseResult.error}`
    : caseResult.expectedHasBom
      ? `recall ${formatPercent(caseResult.recall)}, precision ${formatPercent(caseResult.precision)}`
      : caseResult.negativeViolation
        ? "violación negativo"
        : "negativo OK";

  return `| ${caseResult.id} | ${caseResult.pdf} | ${caseResult.expectedHasBom ? "sí" : "no"} | ${caseResult.expectedTotalRows ?? "—"} | ${caseResult.suggestedRowCount} | ${caseResult.matchedCount}/${caseResult.rowMatches.length} | ${formatPercent(caseResult.recall)} | ${formatPercent(caseResult.precision)} | ${caseResult.unexpectedHighConfidenceCount} | ${status} |`;
}

function buildMarkdownReport(params: {
  commit: string;
  dateIso: string;
  report: Awaited<ReturnType<typeof runAutoTakeoffGoldenValidation>>;
}): string {
  const { commit, dateIso, report } = params;
  const { summary, cases } = report;

  const misses = cases.flatMap((caseResult) =>
    caseResult.rowMatches
      .filter((match) => !match.matched)
      .map(
        (match) =>
          `- **${caseResult.id}**: ref=${match.expected.reference ?? "null"}, qty=${match.expected.quantity}, desc~="${match.expected.descriptionContains}"`,
      ),
  );

  const falsePositives = cases.flatMap((caseResult) =>
    caseResult.unexpectedHighConfidenceRows.map(
      (row) =>
        `- **${caseResult.id}**: conf=${row.confidence}, ref=${row.reference ?? "null"}, qty=${row.quantity ?? "?"}, desc="${row.description?.slice(0, 60) ?? "?"}"`,
    ),
  );

  const exceptions = cases
    .filter((caseResult) => caseResult.exemptions)
    .map(
      (caseResult) =>
        `- **${caseResult.id}**: ${caseResult.exemptions?.reason ?? "exención documentada"}`,
    );

  const recommendation15C =
    summary.passed
      ? [
          "Ampliar golden set con hojas `-02` y más DW para medir regresiones.",
          "Añadir comparación contra palillería manual en BD (precisión de negocio).",
          "Evaluar beta interna con gate `validate:auto-takeoff-golden` en CI.",
        ]
      : [
          "Corregir misses del parser antes de ampliar beta.",
          "Revisar filas con referencia null o unidades omitidas.",
          "Documentar exenciones solo para casos conocidos y acotados.",
        ];

  return `# Golden set auto-takeoff — Fase 15B

## Metadatos

| Campo | Valor |
| --- | --- |
| Fecha | ${dateIso.slice(0, 10)} |
| Commit probado | \`${commit}\` |
| Comando | \`npm run validate:auto-takeoff-golden\` |
| Golden set | \`tests/fixtures/auto-takeoff-golden/golden-set.json\` |
| PDFs en set | ${cases.length} |
| Resultado global | ${summary.passed ? "**PASS**" : "**FAIL**"} |

## Resumen agregado

| Métrica | Valor |
| --- | --- |
| Casos evaluados | ${summary.casesEvaluated} |
| Expected rows evaluadas | ${summary.expectedRowsEvaluated} |
| Matches | ${summary.matchedExpectedRows} |
| Missing expected | ${summary.missingExpectedRows} |
| Recall agregado | ${formatPercent(summary.aggregateRecall)} |
| Precision agregada (casos con total) | ${formatPercent(summary.aggregatePrecision)} |
| Casos negativos | ${summary.negativeCasesEvaluated} |
| Violaciones negativas | ${summary.negativeViolations} |

## Por PDF

| ID | PDF | BOM esperada | Total esperado | Sugeridas | Matches | Recall | Precision | FP high-conf | Estado |
| --- | --- | --- | ---: | ---: | --- | ---: | ---: | ---: | --- |
${cases.map(formatCaseRow).join("\n")}

## Misses (expected no encontradas)

${misses.length > 0 ? misses.join("\n") : "_Ninguno._"}

## Falsos positivos high-confidence

${falsePositives.length > 0 ? falsePositives.join("\n") : "_Ninguno._"}

## Excepciones documentadas

${exceptions.length > 0 ? exceptions.join("\n") : "_Ninguna._"}

## Fallos de umbral

${
  summary.thresholdFailures.length > 0
    ? summary.thresholdFailures.map((failure) => `- ${failure}`).join("\n")
    : "_Ninguno — todos los umbrales cumplidos._"
}

## Conclusión

${
  summary.passed
    ? "El motor cumple recall ≥ 90 % y precision ≥ 85 % en el golden set versionado. Listo para ampliar validación en 15C."
    : "El golden set detectó regresiones o umbrales no cumplidos. Corregir antes de ampliar beta."
}

## Recomendación para Fase 15C

${recommendation15C.map((line) => `- ${line}`).join("\n")}
`;
}

function printConsoleSummary(
  report: Awaited<ReturnType<typeof runAutoTakeoffGoldenValidation>>,
): void {
  const { summary, cases } = report;

  console.log("\n=== Validación golden set auto-takeoff ===\n");
  console.log(`Casos evaluados:           ${summary.casesEvaluated}`);
  console.log(`Expected rows:             ${summary.expectedRowsEvaluated}`);
  console.log(`Matches:                   ${summary.matchedExpectedRows}`);
  console.log(`Missing:                   ${summary.missingExpectedRows}`);
  console.log(`Recall agregado:           ${formatPercent(summary.aggregateRecall)}`);
  console.log(
    `Precision agregada:        ${formatPercent(summary.aggregatePrecision)}`,
  );
  console.log(`Violaciones negativas:     ${summary.negativeViolations}`);
  console.log(`Resultado:                 ${summary.passed ? "PASS" : "FAIL"}`);

  console.log("\n--- Por caso ---\n");

  for (const caseResult of cases) {
    console.log(`${caseResult.id} (${caseResult.pdf})`);

    if (caseResult.error) {
      console.log(`  ERROR: ${caseResult.error}`);
      continue;
    }

    console.log(
      `  sugeridas: ${caseResult.suggestedRowCount} | matches: ${caseResult.matchedCount}/${caseResult.rowMatches.length} | recall: ${formatPercent(caseResult.recall)} | precision: ${formatPercent(caseResult.precision)} | FP high-conf: ${caseResult.unexpectedHighConfidenceCount}`,
    );

    if (caseResult.exemptions?.reason) {
      console.log(`  exención: ${caseResult.exemptions.reason}`);
    }

    for (const match of caseResult.rowMatches.filter((row) => !row.matched)) {
      console.log(
        `  MISS: ref=${match.expected.reference ?? "null"} qty=${match.expected.quantity} desc~="${match.expected.descriptionContains}"`,
      );
    }
  }

  if (summary.thresholdFailures.length > 0) {
    console.log("\nFallos de umbral:");
    for (const failure of summary.thresholdFailures) {
      console.log(`  - ${failure}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`Golden set: ${path.relative(WORKSPACE_ROOT, GOLDEN_SET_DIR)}`);

  const report = await runAutoTakeoffGoldenValidation({
    goldenSetDir: GOLDEN_SET_DIR,
  });

  printConsoleSummary(report);

  const markdown = buildMarkdownReport({
    commit: resolveGitCommit(),
    dateIso: new Date().toISOString(),
    report,
  });

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, markdown, "utf8");
  console.log(`\nInforme: ${path.relative(WORKSPACE_ROOT, REPORT_PATH)}`);

  if (!report.summary.passed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    `\nError fatal: ${error instanceof Error ? error.message : "desconocido"}`,
  );
  process.exit(1);
});
