/**
 * EXPERIMENTAL / DEV ONLY — Fase 15C
 *
 * Mide precisión de negocio: sugerencias BOM vs palillería esperada.
 * Sin BD, sin OCR, sin cambios de producto. No bloquea CI (medición exploratoria).
 *
 * Uso:
 *   npm run validate:auto-takeoff-business
 */

import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { runAutoTakeoffBusinessValidation } from "../lib/drawings/auto-takeoff-business-run";
import type { BusinessCaseValidationResult } from "../lib/drawings/auto-takeoff-business-validate";

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..");
const BUSINESS_SET_DIR = path.join(
  WORKSPACE_ROOT,
  "tests/fixtures/auto-takeoff-business",
);
const REPORT_PATH = path.join(
  WORKSPACE_ROOT,
  "docs/auto-takeoff-business-validation.md",
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

function inferBusinessConclusion(
  summary: Awaited<
    ReturnType<typeof runAutoTakeoffBusinessValidation>
  >["summary"],
): string {
  const bomRecall = summary.aggregateBusinessRecallFromBom;
  const utility = summary.aggregateExtractionUtility;

  if (bomRecall != null && bomRecall >= 0.95 && utility != null && utility >= 0.9) {
    return "**Sirve como palillería inicial** en planos DMS/HL con BOM embebido: la extracción cubre la mayoría de partidas de negocio extraíbles del BOM, con huecos conocidos en soportes y partidas manuales.";
  }

  if (bomRecall != null && bomRecall >= 0.85) {
    return "**Sirve como lista de materiales útil** y base de palillería asistida, pero **requiere reglas adicionales** (soportes, partidas manuales, exclusiones de oficina) antes de considerarse palillería final.";
  }

  return "**Requiere reglas adicionales** y validación manual amplia; el BOM solo no alcanza como palillería de negocio completa.";
}

function formatCaseTableRow(caseResult: BusinessCaseValidationResult): string {
  const status = caseResult.error
    ? `error: ${caseResult.error}`
    : `recall negocio ${formatPercent(caseResult.businessRecall)}`;

  return `| ${caseResult.id} | ${caseResult.pdf} | ${caseResult.businessRequiredCount} | ${caseResult.matchedBusinessRequiredFromBom}/${caseResult.businessRequiredBomExtractableCount} | ${formatPercent(caseResult.businessRecallFromBom)} | ${formatPercent(caseResult.businessRecall)} | ${formatPercent(caseResult.extractionUtility)} | ${caseResult.extractedNotBusinessRequired} | ${caseResult.missingOutsideBom} | ${status} |`;
}

function buildMarkdownReport(params: {
  commit: string;
  dateIso: string;
  report: Awaited<ReturnType<typeof runAutoTakeoffBusinessValidation>>;
}): string {
  const { commit, dateIso, report } = params;
  const { summary, cases } = report;

  const goodCategories = summary.categoryCoverage
    .filter((entry) => entry.recall != null && entry.recall >= 0.9)
    .map((entry) => `- **${entry.category}**: ${formatPercent(entry.recall)} (${entry.matchedCount}/${entry.requiredCount})`);

  const weakCategories = summary.categoryCoverage
    .filter((entry) => entry.recall != null && entry.recall < 0.9)
    .map((entry) => `- **${entry.category}**: ${formatPercent(entry.recall)} (${entry.matchedCount}/${entry.requiredCount})`);

  const misses = cases.flatMap((caseResult) =>
    caseResult.rowMatches
      .filter(
        (match) =>
          match.expected.businessRequired &&
          !match.matched &&
          match.expected.bomExtractable !== false,
      )
      .map(
        (match) =>
          `- **${caseResult.id}** [${match.expected.category}]: ${match.expected.descriptionContains} (qty ${match.expected.quantity})`,
      ),
  );

  const notUsefulExtracted = cases.flatMap((caseResult) =>
    caseResult.extractedClassifications
      .filter((row) => row.bomCorrectNotUseful)
      .map(
        (row) =>
          `- **${caseResult.id}**: ${row.suggestion.description?.slice(0, 64) ?? "?"}`,
      ),
  );

  const recommendation15D = [
    "Reglas opt-in para bloque SOPORTES y referencias no SAP.",
    "Marcar en UI filas «lista de materiales» vs «palillería sugerida» según categoría.",
    "Ampliar business-set con palillería manual real de oficina (no solo BOM).",
    "Gate de beta: recall BOM ≥ 95 % y utilidad ≥ 90 % en DMS/HL.",
  ];

  return `# Validación de negocio auto-takeoff — Fase 15C

## Metadatos

| Campo | Valor |
| --- | --- |
| Fecha | ${dateIso.slice(0, 10)} |
| Commit probado | \`${commit}\` |
| Comando | \`npm run validate:auto-takeoff-business\` |
| Business set | \`tests/fixtures/auto-takeoff-business/business-set.json\` |
| PDFs evaluados | ${summary.pdfsEvaluated} |

## Métricas agregadas

| Métrica | Valor |
| --- | --- |
| Filas esperadas de negocio (total) | ${summary.businessExpectedRows} |
| Filas businessRequired | ${summary.businessRequiredRows} |
| Matches businessRequired | ${summary.matchedBusinessRequired} |
| Missing businessRequired | ${summary.missingBusinessRequired} |
| Extraídas no requeridas (BOM correcto) | ${summary.extractedNotBusinessRequired} |
| Total filas extraídas | ${summary.totalExtractedRows} |
| Filas útiles extraídas | ${summary.usefulExtractedRows} |
| **Recall de negocio (overall)** | **${formatPercent(summary.aggregateBusinessRecall)}** |
| Recall desde BOM extraíble | ${formatPercent(summary.aggregateBusinessRecallFromBom)} |
| **Utilidad de extracción** | **${formatPercent(summary.aggregateExtractionUtility)}** |

## Tabla por PDF

| ID | PDF | Required | Match BOM | Recall BOM | Recall negocio | Utilidad | BOM no útil | Fuera BOM | Estado |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
${cases.map(formatCaseTableRow).join("\n")}

## Categorías con buena cobertura (recall ≥ 90 %)

${goodCategories.length > 0 ? goodCategories.join("\n") : "_Ninguna con umbral 90 % en esta muestra._"}

## Categorías con mala cobertura (< 90 %)

${weakCategories.length > 0 ? weakCategories.join("\n") : "_Todas las categorías con partidas required alcanzan ≥ 90 % desde BOM._"}

## Qué parte de la palillería real no sale del BOM

${summary.outsideBomGaps.length > 0 ? summary.outsideBomGaps.map((gap) => `- ${gap}`).join("\n") : "_Ninguna partida outside_bom etiquetada._"}

### Misses desde BOM (businessRequired extraíble)

${misses.length > 0 ? misses.join("\n") : "_Ninguno._"}

### Extraídas correctas pero no útiles como palillería final

${notUsefulExtracted.length > 0 ? notUsefulExtracted.join("\n") : "_Ninguna._"}

## Conclusión

${inferBusinessConclusion(summary)}

El golden estructural (15B) mide parsing; esta fase mide **utilidad para palillería**. La brecha principal está en **soportes**, **partidas manuales DW** y **exclusiones de oficina** (p. ej. FIGURA 8).

## Recomendación para Fase 15D

${recommendation15D.map((line) => `- ${line}`).join("\n")}

## Integración CI

Script **separado** en 15C (\`validate:auto-takeoff-business\`). No se añade a \`verify:auto-takeoff\` para no bloquear CI con criterio de negocio aún exploratorio. El golden estructural (15B) sigue en CI.
`;
}

function printConsoleSummary(
  report: Awaited<ReturnType<typeof runAutoTakeoffBusinessValidation>>,
): void {
  const { summary, cases } = report;

  console.log("\n=== Validación de negocio auto-takeoff ===\n");
  console.log(`PDFs evaluados:              ${summary.pdfsEvaluated}`);
  console.log(`Business required rows:      ${summary.businessRequiredRows}`);
  console.log(
    `Matched business required:   ${summary.matchedBusinessRequired}`,
  );
  console.log(
    `Missing business required:   ${summary.missingBusinessRequired}`,
  );
  console.log(
    `Recall negocio (overall):    ${formatPercent(summary.aggregateBusinessRecall)}`,
  );
  console.log(
    `Recall desde BOM:            ${formatPercent(summary.aggregateBusinessRecallFromBom)}`,
  );
  console.log(
    `Utilidad extracción:         ${formatPercent(summary.aggregateExtractionUtility)}`,
  );
  console.log(
    `BOM correcto no requerido:   ${summary.extractedNotBusinessRequired}`,
  );

  console.log("\nCobertura por categoría (required):");
  for (const entry of summary.categoryCoverage) {
    console.log(
      `  ${entry.category}: ${entry.matchedCount}/${entry.requiredCount} (${formatPercent(entry.recall)})`,
    );
  }

  if (summary.outsideBomGaps.length > 0) {
    console.log("\nFuera del BOM (huecos esperados):");
    for (const gap of summary.outsideBomGaps) {
      console.log(`  - ${gap}`);
    }
  }

  console.log("\n--- Por PDF ---\n");

  for (const caseResult of cases) {
    console.log(`${caseResult.id}`);
    if (caseResult.comments) {
      console.log(`  ${caseResult.comments}`);
    }

    if (caseResult.error) {
      console.log(`  ERROR: ${caseResult.error}`);
      continue;
    }

    console.log(
      `  extraídas: ${caseResult.suggestedRowCount} | recall BOM: ${formatPercent(caseResult.businessRecallFromBom)} | recall negocio: ${formatPercent(caseResult.businessRecall)} | utilidad: ${formatPercent(caseResult.extractionUtility)}`,
    );
  }

  console.log(`\nConclusión: ${inferBusinessConclusion(summary)}`);
}

async function main(): Promise<void> {
  console.log(
    `Business set: ${path.relative(WORKSPACE_ROOT, BUSINESS_SET_DIR)}`,
  );

  const report = await runAutoTakeoffBusinessValidation({
    businessSetDir: BUSINESS_SET_DIR,
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
}

main().catch((error) => {
  console.error(
    `\nError fatal: ${error instanceof Error ? error.message : "desconocido"}`,
  );
  process.exit(1);
});
