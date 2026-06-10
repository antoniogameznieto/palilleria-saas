/**
 * Validación funcional 18L — cotas candidatas y sugerencias sobre PDFs reales.
 * Solo lectura; no BD ni UI.
 */
import { readFileSync } from "node:fs";

import { PDFParse } from "pdf-parse";

import { extractCandidateDimensionsFromText } from "../lib/trameado/candidate-dimensions";
import { buildTrameadoSheetSuggestions } from "../lib/trameado/suggestions";
import {
  buildTrameadoSegmentSuggestions,
  type TrameadoSegmentSuggestion,
} from "../lib/trameado/segment-suggestions";
import { canExportMarkedTrameadoPdf } from "../lib/trameado/export-marked-pdf";
import { validateTrameadoSheet } from "../lib/trameado/sheet-validation";

type CaseSpec = {
  label: string;
  path: string;
  drawingNumber: string;
  lineNumber: string;
  lineClass: string;
  takeoffPipeDescription: string;
  takeoffPipeQty: string;
  goldenPalilloMm: number[];
};

const CASES: CaseSpec[] = [
  {
    label: "HL-1291-01",
    path: "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-01.pdf",
    drawingNumber: "2301GB47G-C1-L-HL-1291-01",
    lineNumber: "HL-1291-A012AA-N-01",
    lineClass: "A012AA",
    takeoffPipeDescription:
      '1 4" TUBERIA A106 Gr.B SCH 40',
    takeoffPipeQty: "1.8",
    goldenPalilloMm: [150, 363, 231, 1052, 139],
  },
  {
    label: "HL-1291-02",
    path: "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-02.pdf",
    drawingNumber: "2301GB47G-C1-L-HL-1291-02",
    lineNumber: "HL-1291-A012AA-N-02",
    lineClass: "A012AA",
    takeoffPipeDescription:
      '1 3/4" TUBERIA A106 Gr.B SCH 80',
    takeoffPipeQty: "0.4",
    goldenPalilloMm: [170, 100, 120],
  },
  {
    label: "HL-1289-01",
    path: "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1289-01.pdf",
    drawingNumber: "2301GB47G-C1-L-HL-1289-01",
    lineNumber: "HL-1289-A010AA-N-01",
    lineClass: "A010AA",
    takeoffPipeDescription:
      '1 4" TUBERIA A106 Gr.B SCH 40',
    takeoffPipeQty: "2.0",
    goldenPalilloMm: [150, 363, 231, 1052, 139],
  },
  {
    label: "HL-1289-02",
    path: "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1289-02.pdf",
    drawingNumber: "2301GB47G-C1-L-HL-1289-02",
    lineNumber: "HL-1289-A010AA-N-02",
    lineClass: "A010AA",
    takeoffPipeDescription:
      '1 3/4" TUBERIA A106 Gr.B SCH 80',
    takeoffPipeQty: "0.4",
    goldenPalilloMm: [170, 100, 120],
  },
];

function formatSuggestionConfidence(
  suggestion: TrameadoSegmentSuggestion,
): string {
  return suggestion.confidence === "high" ? "alta confianza" : "revisar";
}

async function main() {
  for (const spec of CASES) {
    const buffer = readFileSync(spec.path);
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = parsed.text;
    const fileName = spec.path.split("/").pop() ?? spec.path;

    const candidates = extractCandidateDimensionsFromText(text, {
      drawingNumber: spec.drawingNumber,
      lineNumber: spec.lineNumber,
      fileName,
    });

    const suggestions = buildTrameadoSheetSuggestions({
      drawing: {
        id: spec.label,
        drawingNumber: spec.drawingNumber,
        lineNumber: spec.lineNumber,
        revision: "0",
      },
      takeoffItems: [
        {
          reference: "1000000001",
          description: spec.takeoffPipeDescription,
          unit: "M",
        },
      ],
      existingLineIdentifiers: [],
    });

    const allRanked = [...candidates.candidates, ...candidates.additionalCandidates].map(
      (candidate) => Number(candidate.displayValue),
    );
    const goldenHits = spec.goldenPalilloMm.filter((value) =>
      allRanked.includes(value),
    );

    const segmentSuggestions = buildTrameadoSegmentSuggestions({
      candidateDimensions: candidates,
      existingSegments: [],
      sheetDefaults: {
        diameter: suggestions[0]?.diameter ?? "",
        schedule: suggestions[0]?.schedule ?? "",
      },
      options: {
        drawingNumber: spec.drawingNumber,
        fileName,
        hasActiveSheet: true,
      },
    });

    console.log(`\n=== ${spec.label} ===`);
    console.log(`embeddedTextLength: ${candidates.embeddedTextLength}`);
    console.log(
      `primary (${candidates.candidates.length}/${candidates.totalRankedCount} ranked): ${candidates.candidates
        .map((c) => `${c.displayValue}[${c.confidence},${c.score}]`)
        .join(", ")}`,
    );
    if (candidates.additionalCandidates.length > 0) {
      console.log(
        `additional (${candidates.additionalCandidates.length}): ${candidates.additionalCandidates
          .map((c) => `${c.displayValue}[${c.confidence},${c.score}]`)
          .join(", ")}`,
      );
    }
    console.log(`overallConfidence: ${candidates.overallConfidence}`);
    if (candidates.warnings.length > 0) {
      console.log(`warnings: ${candidates.warnings.join(" | ")}`);
    }
    console.log(
      `suggestions: ${suggestions
        .map(
          (s) =>
            `${s.lineIdentifier} Ø${s.diameter ?? "?"} SCH${s.schedule ?? "?"} (${s.confidence}, ${s.source})`,
        )
        .join(" ; ")}`,
    );
    console.log(
      `golden palillo ${spec.goldenPalilloMm.join(", ")} → hits in panel: ${goldenHits.join(", ") || "ninguno"}`,
    );
    console.log(
      `segment suggestions (${segmentSuggestions.mode}, ${segmentSuggestions.suggestions.length}): ${segmentSuggestions.suggestions
        .map(
          (suggestion) =>
            `Nº ${suggestion.suggestedNumber}/${suggestion.palilloLength}[${formatSuggestionConfidence(suggestion)}]`,
        )
        .join(", ") || "ninguna"}`,
    );
    if (segmentSuggestions.warnings.length > 0) {
      console.log(
        `segment suggestion warnings: ${segmentSuggestions.warnings.join(" | ")}`,
      );
    }

    const suggestedTotalPalilloMm = segmentSuggestions.suggestions.reduce(
      (total, suggestion) => total + Number(suggestion.palilloLength),
      0,
    );
    const mockConfirmedSegments = spec.goldenPalilloMm.map((value, index) => ({
      segmentNumber: String(index + 1),
      palilloLength: String(value),
    }));
    const confirmedTotalPalilloMm = mockConfirmedSegments.reduce(
      (total, segment) => total + Number(segment.palilloLength),
      0,
    );
    const sheetValidation = validateTrameadoSheet({
      hasActiveSheet: true,
      segments: mockConfirmedSegments,
      takeoffItems: [
        {
          description: spec.takeoffPipeDescription,
          quantity: spec.takeoffPipeQty,
          unit: "M",
        },
      ],
    });

    console.log(
      `segment suggestion total PALILLO: ${suggestedTotalPalilloMm} mm (${segmentSuggestions.suggestions.length} sugeridos)`,
    );
    console.log(
      `mock confirmed total PALILLO: ${confirmedTotalPalilloMm} mm (${mockConfirmedSegments.length} tramos golden)`,
    );
    console.log(
      `sheet validation: ${sheetValidation.statusLabel} (ref ${sheetValidation.referencePipeLengthM ?? "n/a"} m, delta ${sheetValidation.deltaPct != null ? `${sheetValidation.deltaPct.toFixed(1)}%` : "n/a"})`,
    );
    console.log(
      `marked PDF exportable: ${canExportMarkedTrameadoPdf(0) ? "sí" : "no"} (este script no carga marcas persistidas; con ≥1 marca en hoja: exportar PDF marcado)`,
    );
    console.log(
      `annotation hint: ${mockConfirmedSegments.length} tramos golden de referencia; marcar en UI para PDF marcado`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
