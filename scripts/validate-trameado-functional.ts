/**
 * Validación funcional 18L — cotas candidatas y sugerencias sobre PDFs reales.
 * Solo lectura; no BD ni UI.
 */
import { readFileSync } from "node:fs";

import { PDFParse } from "pdf-parse";

import { extractCandidateDimensionsFromText } from "../lib/trameado/candidate-dimensions";
import { buildTrameadoSheetSuggestions } from "../lib/trameado/suggestions";

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
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
