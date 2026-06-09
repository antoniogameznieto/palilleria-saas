/**
 * EXPERIMENTAL — Fase 15C
 * Ejecuta validación de negocio sobre PDFs del golden set.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  summarizeBusinessValidation,
  validateBusinessCaseResult,
  type BusinessSetDefinition,
  type BusinessValidationReport,
} from "@/lib/drawings/auto-takeoff-business-validate";
import { extractSuggestionsFromPdf } from "@/lib/drawings/auto-takeoff-golden-run";

const DEFAULT_BUSINESS_SET_FILE = "business-set.json";

export async function loadBusinessSetDefinition(
  businessSetDir: string,
  fileName = DEFAULT_BUSINESS_SET_FILE,
): Promise<BusinessSetDefinition> {
  const absolutePath = path.join(businessSetDir, fileName);
  const raw = await readFile(absolutePath, "utf8");
  return JSON.parse(raw) as BusinessSetDefinition;
}

export async function runAutoTakeoffBusinessValidation(params: {
  businessSetDir: string;
  businessSetFileName?: string;
}): Promise<BusinessValidationReport> {
  const definition = await loadBusinessSetDefinition(
    params.businessSetDir,
    params.businessSetFileName,
  );
  const pdfBaseDir = path.resolve(params.businessSetDir, definition.pdfBaseDir);
  const cases = [];

  for (const caseDef of definition.cases) {
    const pdfPath = path.join(pdfBaseDir, caseDef.pdf);
    const extraction = await extractSuggestionsFromPdf(pdfPath, {
      includeSupportRows: true,
    });

    cases.push(
      validateBusinessCaseResult({
        caseDef,
        suggestions: extraction.suggestions,
        error: extraction.error,
      }),
    );
  }

  return {
    cases,
    summary: summarizeBusinessValidation(cases),
  };
}
