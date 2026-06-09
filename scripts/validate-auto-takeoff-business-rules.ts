/**
 * EXPERIMENTAL / DEV ONLY — Fase 15D
 *
 * Valida reglas de negocio sobre sugerencias BOM del business set.
 * Sin BD, sin UI productiva, sin autoimportar.
 *
 * Uso:
 *   npm run validate:auto-takeoff-business-rules
 */

import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadBusinessSetDefinition } from "../lib/drawings/auto-takeoff-business-run";
import {
  aggregateBusinessRulesMetrics,
  BUSINESS_RULES_CATALOG,
  evaluateBusinessRulesForCase,
  type BusinessRuleApplication,
  type BusinessRulesCaseMetrics,
} from "../lib/drawings/auto-takeoff-business-rules";
import { extractSuggestionsFromPdf } from "../lib/drawings/auto-takeoff-golden-run";

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..");
const BUSINESS_SET_DIR = path.join(
  WORKSPACE_ROOT,
  "tests/fixtures/auto-takeoff-business",
);
const REPORT_PATH = path.join(
  WORKSPACE_ROOT,
  "docs/auto-takeoff-business-rules.md",
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

function formatApplication(application: BusinessRuleApplication): string {
  const desc = application.suggestion.description?.slice(0, 56) ?? "?";
  return `- **${application.businessAction}** / ${application.businessCategory} / ${application.businessConfidence}: ${desc} — ${application.businessReason}`;
}

function buildMarkdownReport(params: {
  commit: string;
  dateIso: string;
  cases: BusinessRulesCaseMetrics[];
  summary: ReturnType<typeof aggregateBusinessRulesMetrics>;
}): string {
  const { commit, dateIso, cases, summary } = params;

  const includeExamples = cases
    .flatMap((caseMetrics) =>
      caseMetrics.applications.filter((row) => row.businessAction === "include"),
    )
    .slice(0, 6)
    .map(formatApplication);

  const excludeReviewExamples = cases
    .flatMap((caseMetrics) =>
      caseMetrics.applications.filter(
        (row) => row.businessAction === "exclude" || row.businessAction === "review",
      ),
    )
    .slice(0, 8)
    .map(formatApplication);

  const tableRows = cases
    .map(
      (caseMetrics) =>
        `| ${caseMetrics.caseId} | ${caseMetrics.totalSuggestions} | ${caseMetrics.includeCount} | ${caseMetrics.reviewCount} | ${caseMetrics.excludeCount} | ${formatPercent(caseMetrics.utilityBefore)} | ${formatPercent(caseMetrics.utilityAfter)} | ${caseMetrics.falseIncludeCount} | ${caseMetrics.falseExcludeCount} |`,
    )
    .join("\n");

  const categoryRows = Object.entries(summary.categoryCounts)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `- **${category}**: ${count}`)
    .join("\n");

  const rulesTable = BUSINESS_RULES_CATALOG.map(
    (rule) =>
      `| ${rule.id} | ${rule.patterns.join(", ")} | ${rule.category} | ${rule.action} |`,
  ).join("\n");

  return `# Reglas de negocio auto-takeoff — Fase 15D

## Metadatos

| Campo | Valor |
| --- | --- |
| Fecha | ${dateIso.slice(0, 10)} |
| Commit probado | \`${commit}\` |
| Comando | \`npm run validate:auto-takeoff-business-rules\` |
| Business set | \`tests/fixtures/auto-takeoff-business/business-set.json\` |
| PDFs evaluados | ${summary.pdfsEvaluated} |

## Reglas aplicadas

| ID | Patrones | Categoría | Acción |
| --- | --- | --- | --- |
${rulesTable}

Orden de evaluación: exclusiones → soportes → ciegos → tubería → válvulas → bridas → accesorios → fijación → juntas → desconocido (review).

## Métricas agregadas

| Métrica | Valor |
| --- | --- |
| Total sugerencias | ${summary.totalSuggestions} |
| **include** | **${summary.includeCount}** |
| **review** | **${summary.reviewCount}** |
| **exclude** | **${summary.excludeCount}** |
| Utilidad antes (útiles / total extraído) | ${formatPercent(summary.utilityBefore)} |
| Utilidad después (útiles / propuesta include) | ${formatPercent(summary.utilityAfter)} |
| Acciones etiquetadas (subset business) | ${summary.actionLabeledCount} |
| Aciertos de acción | ${summary.actionCorrectCount} |
| Falsos include | ${summary.falseIncludeCount} |
| Falsos exclude | ${summary.falseExcludeCount} |
| Ratio propuesta (include/total) | ${formatPercent(summary.totalSuggestions > 0 ? summary.includeCount / summary.totalSuggestions : null)} |

## Tabla por PDF

| ID | Sugeridas | include | review | exclude | Utilidad antes | Utilidad después | FP include | FP exclude |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${tableRows}

## Categorías detectadas

${categoryRows || "_Ninguna_"}

## Ejemplos include

${includeExamples.length > 0 ? includeExamples.join("\n") : "_Ninguno_"}

## Ejemplos exclude / review

${excludeReviewExamples.length > 0 ? excludeReviewExamples.join("\n") : "_Ninguno_"}

## Falsos positivos / negativos

- **Falsos include:** sugerencia con acción \`include\` frente a \`businessRequired: false\` en business set (${summary.falseIncludeCount}).
- **Falsos exclude:** sugerencia excluida frente a \`businessRequired: true\` extraíble (${summary.falseExcludeCount}).

## Qué queda fuera del BOM

Sin cambios respecto a 15C: soportes \`STD-PS-050\`, partidas manuales DW (brida, válvula, soporte) y bloque \`SOPORTES\` no parseado. Las reglas de soporte quedan preparadas para cuando aparezcan en extracción.

## Conclusión

Las reglas elevan la **utilidad de propuesta** al excluir automáticamente exclusiones de oficina (FIGURA 8) y marcar ciegos sin SAP para revisión. El BOM sigue siendo la fuente; la capa de reglas acerca la salida a **palillería asistida**, no a palillería final automática.

## Recomendación para Fase 15E

- Exponer \`businessAction\` y \`businessCategory\` en el preview experimental (sin import automático).
- Añadir reglas configurables por empresa y gate opcional en CI cuando el business set crezca.
- Integrar partidas \`outside_bom\` como sugerencias \`review\` manuales en el asistente.
`;
}

function printConsoleSummary(
  cases: BusinessRulesCaseMetrics[],
  summary: ReturnType<typeof aggregateBusinessRulesMetrics>,
): void {
  console.log("\n=== Validación reglas de negocio auto-takeoff ===\n");
  console.log(`PDFs evaluados:           ${summary.pdfsEvaluated}`);
  console.log(`Total sugerencias:        ${summary.totalSuggestions}`);
  console.log(`  include:                ${summary.includeCount}`);
  console.log(`  review:                 ${summary.reviewCount}`);
  console.log(`  exclude:                ${summary.excludeCount}`);
  console.log(
    `Utilidad antes:           ${formatPercent(summary.utilityBefore)}`,
  );
  console.log(
    `Utilidad después:         ${formatPercent(summary.utilityAfter)}`,
  );
  console.log(
    `Ratio propuesta:          ${formatPercent(summary.totalSuggestions > 0 ? summary.includeCount / summary.totalSuggestions : null)}`,
  );
  console.log(
    `Aciertos de acción:       ${summary.actionCorrectCount}/${summary.actionLabeledCount}`,
  );
  console.log(`Falsos include:           ${summary.falseIncludeCount}`);
  console.log(`Falsos exclude:           ${summary.falseExcludeCount}`);

  console.log("\nCategorías detectadas:");
  for (const [category, count] of Object.entries(summary.categoryCounts)) {
    if (count > 0) {
      console.log(`  ${category}: ${count}`);
    }
  }

  console.log("\n--- Por PDF ---\n");

  for (const caseMetrics of cases) {
    console.log(
      `${caseMetrics.caseId}: ${caseMetrics.includeCount} include, ${caseMetrics.reviewCount} review, ${caseMetrics.excludeCount} exclude | utilidad ${formatPercent(caseMetrics.utilityBefore)} → ${formatPercent(caseMetrics.utilityAfter)}`,
    );
  }
}

async function main(): Promise<void> {
  const definition = await loadBusinessSetDefinition(BUSINESS_SET_DIR);
  const pdfBaseDir = path.resolve(BUSINESS_SET_DIR, definition.pdfBaseDir);
  const cases: BusinessRulesCaseMetrics[] = [];

  for (const caseDef of definition.cases) {
    const pdfPath = path.join(pdfBaseDir, caseDef.pdf);
    const extraction = await extractSuggestionsFromPdf(pdfPath);

    if (extraction.error) {
      console.warn(`${caseDef.id}: error extracción — ${extraction.error}`);
      continue;
    }

    cases.push(
      evaluateBusinessRulesForCase({
        caseId: caseDef.id,
        suggestions: extraction.suggestions,
        expectedBusinessRows: caseDef.expectedBusinessRows,
      }),
    );
  }

  const summary = aggregateBusinessRulesMetrics(cases);
  printConsoleSummary(cases, summary);

  const markdown = buildMarkdownReport({
    commit: resolveGitCommit(),
    dateIso: new Date().toISOString(),
    cases,
    summary,
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
