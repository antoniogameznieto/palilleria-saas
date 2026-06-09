/**
 * EXPERIMENTAL / DEV ONLY — Fase 18J
 *
 * Investiga extracción vectorial desde PDFs isométricos originales (input real)
 * para proponer cotas candidatas / viabilidad de palillos automáticos.
 *
 * Sin OCR, sin BD, sin UI, sin APIs externas, sin propuestas productivas.
 *
 * Uso:
 *   npm run research:trameado-vector
 *   npm run research:trameado-vector -- ./ruta/a.pdf ./otra.pdf
 *   npm run research:trameado-vector -- --json
 *
 * Documentación: docs/trameado-vector-research.md
 */

import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { PDFParse } from "pdf-parse";

import {
  deriveLineClassFromIdentifier,
  detectDiameterFromText,
  detectScheduleFromText,
} from "@/lib/trameado/suggestions";

const DEFAULT_VECTOR_PDF_PATHS = [
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1289-01.pdf",
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1289-02.pdf",
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-01.pdf",
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-02.pdf",
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1292-01.pdf",
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1292-02.pdf",
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1293-01.pdf",
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1293-02.pdf",
  "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1294-01.pdf",
] as const;

const GOLDEN_REFERENCE = {
  file: "Ejemplos/Ejemplo 1/Isos trameados.pdf",
  pages: [
    { page: 1, drawingSuffix: "1289-01", expectedPalilloMm: [150, 363, 231, 1052, 139] },
    { page: 2, drawingSuffix: "1289-02", expectedPalilloMm: [170, 100, 120] },
    { page: 3, drawingSuffix: "1291-01", expectedPalilloMm: [150, 363, 231, 1052, 139] },
    { page: 4, drawingSuffix: "1291-02", expectedPalilloMm: [170, 100, 120] },
    { page: 5, drawingSuffix: "1292-01", expectedPalilloMm: [150, 363, 231, 1052] },
    { page: 6, drawingSuffix: "1292-02", expectedPalilloMm: [170, 100, 120] },
    { page: 7, drawingSuffix: "1293-01", expectedPalilloMm: [150, 363, 231, 1052, 139] },
    { page: 8, drawingSuffix: "1293-02", expectedPalilloMm: [170, 100, 120] },
    { page: 9, drawingSuffix: "1294-01", expectedPalilloMm: [150, 363, 231, 1052, 139] },
  ],
} as const;

const PATTERNS = {
  drawingNumber: /\b2301GB47G-C1-L-HL-\d+-0[123]\b/gi,
  lineIdentifier: /\bHL-\d+-[A-Z0-9]+-[A-Z]-0\d\b/gi,
  lineIdentifierFull: /\b2301GB47G-C1-[0-9"/\w-]+-HL-\d+-[A-Z0-9]+-[A-Z](?:-\d{2})?\b/gi,
  suffix: /HL-\d+-0(\d)\b/gi,
  continuation: /PARA CONT\.?\s*VER LINEA NUM\.?\s*([^\n]+)/gi,
  continuationPlan: /PLANO N[º°]:\s*([^\n]+)/gi,
  coordinateE: /\bE=\s*(\d+)/gi,
  coordinateN: /\bN=\s*(\d+)/gi,
  coordinateEl: /\bEL=\s*([+-]?\d+)/gi,
  sapCode: /\b1000\d{6}\b/g,
  bomHeader: /RELACI[ÓO]N\s+DE\s+M\s*A?\s*TERIALES/i,
  bomRow:
    /^(\d{1,2})\s+(.+?)\t(1000\d{6}|-)\t(\d+(?:[.,]\d+)?)\s*(M|UD|m|ud|U)?\s*$/gim,
  pressure: /\b(?:PRESI[ÓO]N|PRESION)\s+(?:OPERACI[ÓO]N|DISE[ÑN]O|PRUEBA)/i,
  temperature: /\bTEMPERATURA\s+(?:DISE[ÑN]O|OPERACI[ÓO]N)/i,
  boltSize: /\d+(?:\/\d+)?"x\d+mm\s+ESPARRAGO/i,
  orientation: /\bORIENTACION\b|\bO\s+\d+(?:\.\d+)?\s+[NSEW]\b/i,
  gridRef: /\bF\d+\s+G\d+(?:\s+B\d+)?\b/gi,
  dnLabel: /\b\d+(?:X\d+)?"\s*DN\b/gi,
  standaloneNumber: /\b(\d+(?:\.\d+)?)\b/g,
} as const;

export type BomSummaryItem = {
  item: number;
  description: string;
  sapCode: string | null;
  quantity: string;
  unit: string | null;
};

export type ContinuationReference = {
  lineReference: string;
  planNumber: string | null;
};

export type ClassifiedNumber = {
  value: number;
  raw: string;
  category:
    | "dimension_candidate"
    | "coordinate"
    | "bom_quantity"
    | "sap_code"
    | "pressure_design"
    | "temperature"
    | "revision_or_item"
    | "bolt_related"
    | "noise";
  reason: string;
};

export type PositionedTextProbe = {
  supportedByPdfParse: boolean;
  note: string;
  tableCellCount: number;
  tableZonesDetected: boolean;
};

export type VectorGeometryProbe = {
  rawStreamLength: number;
  pathOperatorHints: number;
  lineMoveHints: number;
  likelyVectorDrawing: boolean;
  note: string;
};

export type GoldenComparisonHint = {
  goldenPage: number | null;
  expectedPalilloMm: number[];
  expectedSegmentCount: number;
  candidateDimensionsInOriginal: number[];
  palilloValuesFoundInOriginal: number[];
  partialMatches: number[];
  sumOfAllCandidates: number | null;
  automatedMatchPossible: boolean;
  notes: string[];
};

export type TrameadoVectorPdfAnalysis = {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  embeddedTextLength: number;
  producer: string | null;
  drawingNumber: string | null;
  lineIdentifier: string | null;
  lineClass: string | null;
  sheetSuffix: string | null;
  primaryDiameter: string | null;
  primarySchedule: string | null;
  mainPipeBomQuantity: string | null;
  bomSummary: BomSummaryItem[];
  continuationReferences: ContinuationReference[];
  coordinates: {
    east: string[];
    north: string[];
    elevation: string[];
  };
  noiseDetected: string[];
  allNumbersFound: number[];
  dimensionCandidates: ClassifiedNumber[];
  positionedText: PositionedTextProbe;
  vectorGeometry: VectorGeometryProbe;
  goldenComparison: GoldenComparisonHint | null;
  textPreview: string;
  notes: string[];
};

type CliOptions = {
  pdfPaths: string[];
  json: boolean;
  help: boolean;
};

function printUsage(): void {
  console.log(`research-trameado-vector — investigación Fase 18J

Uso:
  npm run research:trameado-vector
  npm run research:trameado-vector -- <ruta.pdf> [más.pdf ...]
  npm run research:trameado-vector -- --json

Opciones:
  --json         Salida JSON
  --help         Esta ayuda

Notas:
  - Input real: PDFs vectoriales HL-xxxx-01/-02 originales.
  - Isos trameados.pdf es golden output (referencia), no input productivo.
  - Sin OCR, sin BD, sin propuestas de palillos reales.
  - Documentación: docs/trameado-vector-research.md
`);
}

function parseArgs(argv: string[]): CliOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { pdfPaths: [], json: false, help: true };
  }

  const pdfPaths = argv.filter(
    (arg) => !arg.startsWith("-") && arg.endsWith(".pdf"),
  );

  return {
    pdfPaths,
    json: argv.includes("--json"),
    help: false,
  };
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

function normalizeEmbeddedPdfText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/M\s+A\s*TERIALES/gi, "MATERIALES")
    .replace(/TRATAM\s+IENTO/gi, "TRATAMIENTO")
    .replace(/COM\s+PROBARÁN/gi, "COMPROBARÁN");
}

function uniqueStrings(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => value.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, undefined, { numeric: true }),
  );
}

function extractDrawingNumber(text: string, fileName: string): string | null {
  const fromFileName = fileName.match(/\b2301GB47G-C1-L-HL-\d+-0[123]\b/i)?.[0];

  if (fromFileName) {
    return fromFileName.toUpperCase();
  }

  const fromPlanoBlock = text.match(
    /PLANO NUMERO\s*\n?\s*(2301GB47G-C1-L-HL-\d+-0[123])/i,
  )?.[1];

  if (fromPlanoBlock) {
    return fromPlanoBlock.toUpperCase();
  }

  const matches = uniqueStrings(text.match(PATTERNS.drawingNumber) ?? []);

  return matches[0]?.toUpperCase() ?? null;
}

function extractLineIdentifier(text: string): string | null {
  const withSuffix = uniqueStrings(text.match(PATTERNS.lineIdentifier) ?? []);
  const full = uniqueStrings(text.match(PATTERNS.lineIdentifierFull) ?? []);

  const preferred =
    withSuffix.find((value) => /-0[12]\b/i.test(value)) ??
    withSuffix[0] ??
    full.find((value) => /-0[12]\b/i.test(value)) ??
    full[0] ??
    null;

  if (!preferred) {
    return null;
  }

  const hlOnly = preferred.match(/\b(HL-\d+-[A-Z0-9]+-[A-Z]-0\d)\b/i)?.[1];

  return (hlOnly ?? preferred).toUpperCase();
}

function extractSheetSuffix(
  _text: string,
  drawingNumber: string | null,
  lineIdentifier: string | null,
): string | null {
  const fromLine = lineIdentifier?.match(/-0(\d)\b/i)?.[1];

  if (fromLine) {
    return `-${fromLine.padStart(2, "0")}`;
  }

  const fromDrawing = drawingNumber?.match(/-0(\d)\b/i)?.[1];

  return fromDrawing ? `-${fromDrawing.padStart(2, "0")}` : null;
}

function parseBomSummary(text: string): BomSummaryItem[] {
  const normalized = normalizeEmbeddedPdfText(text);
  const items: BomSummaryItem[] = [];
  const rowPattern = new RegExp(PATTERNS.bomRow.source, PATTERNS.bomRow.flags);
  let match: RegExpExecArray | null;

  while ((match = rowPattern.exec(normalized)) !== null) {
    items.push({
      item: Number.parseInt(match[1], 10),
      description: match[2].trim(),
      sapCode: match[3] === "-" ? null : match[3],
      quantity: match[4],
      unit: match[5]?.toUpperCase() ?? null,
    });
  }

  return items;
}

function pickMainPipeFromBom(bomSummary: BomSummaryItem[]): {
  quantity: string | null;
  diameter: string | null;
  schedule: string | null;
} {
  const pipeRows = bomSummary.filter((row) =>
    /\b(tuber[ií]a|pipe|tubo)\b/i.test(row.description),
  );

  const mainPipe =
    pipeRows.find((row) => detectDiameterFromText(row.description).length > 0) ??
    pipeRows[0] ??
    null;

  if (!mainPipe) {
    return { quantity: null, diameter: null, schedule: null };
  }

  return {
    quantity: mainPipe.quantity,
    diameter: detectDiameterFromText(mainPipe.description)[0] ?? null,
    schedule: detectScheduleFromText(mainPipe.description)[0] ?? null,
  };
}

function extractContinuationReferences(text: string): ContinuationReference[] {
  const normalized = normalizeEmbeddedPdfText(text);
  const references: ContinuationReference[] = [];
  const continuationPattern = new RegExp(
    PATTERNS.continuation.source,
    PATTERNS.continuation.flags,
  );
  const planPattern = new RegExp(
    PATTERNS.continuationPlan.source,
    PATTERNS.continuationPlan.flags,
  );

  const lineMatches = [...normalized.matchAll(continuationPattern)];
  const planMatches = [...normalized.matchAll(planPattern)];

  for (let index = 0; index < lineMatches.length; index += 1) {
    references.push({
      lineReference: lineMatches[index][1].trim(),
      planNumber: planMatches[index]?.[1]?.trim() ?? null,
    });
  }

  return references;
}

function extractCoordinates(text: string): TrameadoVectorPdfAnalysis["coordinates"] {
  return {
    east: uniqueStrings(
      [...text.matchAll(PATTERNS.coordinateE)].map((match) => match[1]),
    ),
    north: uniqueStrings(
      [...text.matchAll(PATTERNS.coordinateN)].map((match) => match[1]),
    ),
    elevation: uniqueStrings(
      [...text.matchAll(PATTERNS.coordinateEl)].map((match) => match[1]),
    ),
  };
}

function detectNoiseLines(text: string): string[] {
  const normalized = normalizeEmbeddedPdfText(text);
  const noise: string[] = [];

  if (PATTERNS.bomHeader.test(normalized)) {
    noise.push("BOM header / tabla materiales");
  }

  if (PATTERNS.pressure.test(normalized)) {
    noise.push("Bloque presiones (kg/cm²)");
  }

  if (PATTERNS.temperature.test(normalized)) {
    noise.push("Bloque temperaturas (ºC)");
  }

  if (PATTERNS.orientation.test(normalized)) {
    noise.push("Orientación / brújula");
  }

  const gridRefs = uniqueStrings(normalized.match(PATTERNS.gridRef) ?? []);

  if (gridRefs.length > 0) {
    noise.push(`Referencias rejilla: ${gridRefs.join(", ")}`);
  }

  const dnLabels = uniqueStrings(normalized.match(PATTERNS.dnLabel) ?? []);

  if (dnLabels.length > 0) {
    noise.push(`Etiquetas DN: ${dnLabels.join(", ")}`);
  }

  if (/APROBADO PARA CONSTRUCCION/i.test(normalized)) {
    noise.push("Sello aprobación / revisión");
  }

  if (/ACTUADOR/i.test(normalized)) {
    noise.push("Etiquetas actuador");
  }

  return noise;
}

function isDesignBlockValue(value: number, context: string): boolean {
  const designContext =
    /PRESI[ÓO]N|PRESION|TEMPERATURA|CLASE|PINCHAZO|ESPESOR|kg\/cm|ºC/i.test(
      context,
    );

  if (!designContext && ![51, 79].includes(value)) {
    return false;
  }

  return [13, 17, 17.6, 26.4, 51, 79].some(
    (known) => Math.abs(known - value) < 0.01 || Math.abs(known - value) < 0.6,
  );
}

function isCoordinateToken(raw: string, context: string): boolean {
  const tokenPattern = new RegExp(
    `(?:E|N|EL)=\\s*[+-]?${raw.replace(".", "\\.")}\\b`,
    "i",
  );

  return tokenPattern.test(context);
}

function isDrawingReferenceNumber(value: number, context: string): boolean {
  if (value < 1000 || value > 9999) {
    return false;
  }

  return (
    /HL-\d+|PLANO N|PID-|2301GB47G/i.test(context) &&
    !/^\s*\d+\s*$/m.test(context)
  );
}

function classifyNumbers(
  text: string,
  bomSummary: BomSummaryItem[],
  coordinates: TrameadoVectorPdfAnalysis["coordinates"],
): ClassifiedNumber[] {
  const normalized = normalizeEmbeddedPdfText(text);
  const coordinateValues = new Set(
    [...coordinates.east, ...coordinates.north, ...coordinates.elevation].map(Number),
  );
  const bomItemNumbers = new Set(bomSummary.map((row) => row.item));
  const bomQuantities = new Set(
    bomSummary
      .map((row) => Number.parseFloat(row.quantity.replace(",", ".")))
      .filter(Number.isFinite),
  );
  const sapCodes = new Set(
    [...normalized.matchAll(PATTERNS.sapCode)].map((match) => Number(match[0])),
  );

  const classified: ClassifiedNumber[] = [];
  const seen = new Set<string>();

  for (const match of normalized.matchAll(PATTERNS.standaloneNumber)) {
    const raw = match[1];
    const value = Number.parseFloat(raw.replace(",", "."));

    if (!Number.isFinite(value) || seen.has(raw)) {
      continue;
    }

    seen.add(raw);

    const index = match.index ?? 0;
    const context = normalized.slice(Math.max(0, index - 48), index + 48);

    if (sapCodes.has(value) || /1000\d{6}/.test(context)) {
      classified.push({
        value,
        raw,
        category: "sap_code",
        reason: "Código SAP BOM",
      });
      continue;
    }

    if (
      coordinateValues.has(value) ||
      isCoordinateToken(raw, context) ||
      (value > 5000 && value < 10_000_000 && Number.isInteger(value))
    ) {
      classified.push({
        value,
        raw,
        category: "coordinate",
        reason: "Coordenada E/N/EL o UTM",
      });
      continue;
    }

    if (value >= 2020 && value <= 2039 && /APROBADO|FECHA|\/202\d|\d{1,2}-\d{2}-202\d/.test(context)) {
      classified.push({
        value,
        raw,
        category: "noise",
        reason: "Año / fecha revisión",
      });
      continue;
    }

    if (
      (value === 58 || value === 59) &&
      /:\d{2}:\d{2}|PM|AM|\d{1,2}\/\d{1,2}\/\d{4}/.test(context)
    ) {
      classified.push({
        value,
        raw,
        category: "noise",
        reason: "Fragmento hora/fecha",
      });
      continue;
    }

    if (
      (value === 40 || value === 80) &&
      /\bSCH\.?\s*(40|80)\b/i.test(context)
    ) {
      classified.push({
        value,
        raw,
        category: "noise",
        reason: "Schedule SCH 40/80",
      });
      continue;
    }

    if (value === 3000 && /3000#|SW 3000/i.test(context)) {
      classified.push({
        value,
        raw,
        category: "noise",
        reason: "Rating 3000# accesorio",
      });
      continue;
    }

    if (isDrawingReferenceNumber(value, context)) {
      classified.push({
        value,
        raw,
        category: "noise",
        reason: "Número de línea/plano HL en referencia",
      });
      continue;
    }

    if (
      bomItemNumbers.has(value) &&
      /^\s*\d{1,2}\s+/.test(context.slice(context.indexOf(raw)))
    ) {
      classified.push({
        value,
        raw,
        category: "bom_quantity",
        reason: "Ítem BOM numerado",
      });
      continue;
    }

    if (
      bomQuantities.has(value) &&
      /TUBERIA|COUPLING|BRIDA|VALVULA|CODO|JUNTA|UD|M\s*$/i.test(context)
    ) {
      classified.push({
        value,
        raw,
        category: "bom_quantity",
        reason: "Cantidad ítem BOM",
      });
      continue;
    }

    if (PATTERNS.boltSize.test(context)) {
      classified.push({
        value,
        raw,
        category: "bolt_related",
        reason: "Espárrago/perno",
      });
      continue;
    }

    if (isDesignBlockValue(value, context)) {
      classified.push({
        value,
        raw,
        category: "pressure_design",
        reason: "Presión/temperatura/clase diseño",
      });
      continue;
    }

    if (value >= 0 && value <= 12 && /REV\.|^\s*\d{1,2}\s*$/m.test(context)) {
      classified.push({
        value,
        raw,
        category: "revision_or_item",
        reason: "Ítem BOM / revisión",
      });
      continue;
    }

    if (value >= 16 && value <= 5000 && Number.isInteger(value)) {
      classified.push({
        value,
        raw,
        category: "dimension_candidate",
        reason: "Cota candidata (rango 16–5000 mm)",
      });
      continue;
    }

    classified.push({
      value,
      raw,
      category: "noise",
      reason: "No clasificado / contexto ambiguo",
    });
  }

  return classified;
}

function probeVectorGeometry(buffer: Buffer): VectorGeometryProbe {
  const raw = buffer.toString("latin1");
  const pathOperatorHints =
    (raw.match(/\b(?:re|m|l|c|v|h|S|s|f|B|n|W|w)\b/g) ?? []).length;
  const lineMoveHints = (raw.match(/\b(?:m|l|L)\b/g) ?? []).length;

  return {
    rawStreamLength: raw.length,
    pathOperatorHints,
    lineMoveHints,
    likelyVectorDrawing: pathOperatorHints > 50 && lineMoveHints > 20,
    note:
      "Conteo heurístico de operadores PDF en stream crudo; no interpreta geometría del iso.",
  };
}

async function probePositionedText(
  parser: PDFParse,
): Promise<PositionedTextProbe> {
  try {
    const tableResult = await parser.getTable();
    const cellCount = tableResult.pages.reduce(
      (total, page) =>
        total +
        page.tables.reduce(
          (pageTotal, table) =>
            pageTotal + table.reduce((rowTotal, row) => rowTotal + row.length, 0),
          0,
        ),
      0,
    );

    return {
      supportedByPdfParse: false,
      note:
        "pdf-parse getText() no expone X/Y por ítem en TextResult. getTable() usa geometría interna pero devuelve celdas fusionadas sin coordenadas públicas.",
      tableCellCount: cellCount,
      tableZonesDetected: cellCount > 0,
    };
  } catch {
    return {
      supportedByPdfParse: false,
      note: "getTable() falló; posiciones X/Y no disponibles vía API pública.",
      tableCellCount: 0,
      tableZonesDetected: false,
    };
  }
}

function findGoldenHint(fileName: string): GoldenComparisonHint | null {
  const suffixMatch = fileName.match(/HL-(\d+)-0(\d)/i);

  if (!suffixMatch) {
    return null;
  }

  const key = `${suffixMatch[1]}-0${suffixMatch[2]}`;
  const golden = GOLDEN_REFERENCE.pages.find(
    (page) => page.drawingSuffix === key,
  );

  if (!golden) {
    return null;
  }

  return {
    goldenPage: golden.page,
    expectedPalilloMm: [...golden.expectedPalilloMm],
    expectedSegmentCount: golden.expectedPalilloMm.length,
    candidateDimensionsInOriginal: [],
    palilloValuesFoundInOriginal: [],
    partialMatches: [],
    sumOfAllCandidates: null,
    automatedMatchPossible: false,
    notes: [
      "Comparación preliminar documentada; golden Isos trameados.pdf es escaneo sin texto útil.",
    ],
  };
}

function enrichGoldenComparison(
  hint: GoldenComparisonHint,
  dimensionCandidates: ClassifiedNumber[],
): GoldenComparisonHint {
  const candidateValues = dimensionCandidates
    .filter((entry) => entry.category === "dimension_candidate")
    .map((entry) => entry.value);
  const uniqueCandidates = [...new Set(candidateValues)].sort((a, b) => a - b);
  const expected = hint.expectedPalilloMm;
  const foundInOriginal = expected.filter((value) =>
    uniqueCandidates.includes(value),
  );
  const partialMatches = expected.filter((expectedValue) =>
    uniqueCandidates.some(
      (candidate) =>
        Math.abs(candidate - expectedValue) <= 3 ||
        Math.abs(candidate - expectedValue * 10) <= 5,
    ),
  );

  const notes = [...hint.notes];

  if (foundInOriginal.length === 0) {
    notes.push(
      "Ningún valor PALILLO golden aparece literalmente en cotas del original.",
    );
  } else {
    notes.push(
      `Coincidencias literales con golden: ${foundInOriginal.join(", ")}.`,
    );
  }

  notes.push(
    "PALILLO parece derivarse de suma/selección de cotas parciales, no de lectura directa.",
  );

  return {
    ...hint,
    candidateDimensionsInOriginal: uniqueCandidates,
    palilloValuesFoundInOriginal: foundInOriginal,
    partialMatches,
    sumOfAllCandidates: uniqueCandidates.reduce((sum, value) => sum + value, 0),
    automatedMatchPossible: false,
    notes,
  };
}

export async function analyzeTrameadoVectorPdf(
  pdfPath: string,
): Promise<TrameadoVectorPdfAnalysis> {
  const absolutePath = path.resolve(pdfPath);
  const buffer = await readFile(absolutePath);

  if (!isPdfBuffer(buffer)) {
    throw new Error(`No parece un PDF válido: ${absolutePath}`);
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo({ parsePageInfo: true });
    const textResult = await parser.getText();
    const text = normalizeEmbeddedPdfText(textResult.text.trim());
    const drawingNumber = extractDrawingNumber(text, path.basename(absolutePath));
    const lineIdentifier = extractLineIdentifier(text);
    const lineClass = lineIdentifier
      ? deriveLineClassFromIdentifier(lineIdentifier)
      : null;
    const sheetSuffix = extractSheetSuffix(text, drawingNumber, lineIdentifier);
    const bomSummary = parseBomSummary(text);
    const mainPipe = pickMainPipeFromBom(bomSummary);
    const diameters = detectDiameterFromText(text);
    const schedules = detectScheduleFromText(text);
    const continuationReferences = extractContinuationReferences(text);
    const coordinates = extractCoordinates(text);
    const noiseDetected = detectNoiseLines(text);
    const allClassifiedNumbers = classifyNumbers(text, bomSummary, coordinates);
    const positionedText = await probePositionedText(parser);
    const vectorGeometry = probeVectorGeometry(buffer);
    const goldenBase = findGoldenHint(path.basename(absolutePath));
    const goldenComparison = goldenBase
      ? enrichGoldenComparison(goldenBase, allClassifiedNumbers)
      : null;

    const dimensionCandidates = allClassifiedNumbers.filter(
      (entry) => entry.category === "dimension_candidate",
    );

    const notes: string[] = [];

    if (dimensionCandidates.length > 0) {
      notes.push("Hay cotas candidatas en texto embebido; requieren revisión humana.");
    } else {
      notes.push("Pocas o ninguna cota candidata tras filtrar ruido.");
    }

    if (!positionedText.supportedByPdfParse) {
      notes.push(
        "Posición X/Y no disponible con API pública actual; agrupación espacial no automatizable sin ampliar parser.",
      );
    }

    if (vectorGeometry.likelyVectorDrawing) {
      notes.push(
        "El PDF contiene operadores vectoriales (paths/lines) accesibles solo con motor geométrico dedicado.",
      );
    }

    notes.push("No se detectan tramos <n> ni columna PALILLO en el PDF original.");

    return {
      filePath: absolutePath,
      fileName: path.basename(absolutePath),
      fileSizeBytes: buffer.length,
      pageCount: info.total,
      embeddedTextLength: text.length,
      producer: info.info?.Producer ? String(info.info.Producer) : null,
      drawingNumber,
      lineIdentifier,
      lineClass,
      sheetSuffix,
      primaryDiameter: mainPipe.diameter ?? diameters[0] ?? null,
      primarySchedule: mainPipe.schedule ?? schedules[0] ?? null,
      mainPipeBomQuantity: mainPipe.quantity,
      bomSummary,
      continuationReferences,
      coordinates,
      noiseDetected,
      allNumbersFound: [
        ...new Set(
          allClassifiedNumbers.map((entry) => entry.value).filter(Number.isFinite),
        ),
      ].sort((a, b) => a - b),
      dimensionCandidates,
      positionedText,
      vectorGeometry,
      goldenComparison,
      textPreview: text.slice(0, 600),
      notes,
    };
  } finally {
    await parser.destroy();
  }
}

function formatAnalysisHuman(analysis: TrameadoVectorPdfAnalysis): string {
  const lines = [
    `\n=== ${analysis.fileName} ===`,
    `Páginas: ${analysis.pageCount} | Texto embebido: ${analysis.embeddedTextLength} chars`,
    `Plano: ${analysis.drawingNumber ?? "—"}`,
    `Línea: ${analysis.lineIdentifier ?? "—"} | Clase: ${analysis.lineClass ?? "—"} | Sufijo: ${analysis.sheetSuffix ?? "—"}`,
    `Ø principal: ${analysis.primaryDiameter ?? "—"} | SCH: ${analysis.primarySchedule ?? "—"} | Tubería BOM: ${analysis.mainPipeBomQuantity ?? "—"}`,
    `BOM (${analysis.bomSummary.length} ítems): ${analysis.bomSummary.map((row) => `[${row.item}] ${row.description.slice(0, 40)}… ×${row.quantity}`).join("; ") || "—"}`,
    `Continuaciones: ${analysis.continuationReferences.map((ref) => `${ref.lineReference}${ref.planNumber ? ` → ${ref.planNumber}` : ""}`).join(" | ") || "—"}`,
    `Coordenadas E/N/EL: ${analysis.coordinates.east.length}/${analysis.coordinates.north.length}/${analysis.coordinates.elevation.length} valores`,
    `Cotas candidatas (${analysis.dimensionCandidates.length}): ${analysis.dimensionCandidates.map((entry) => entry.value).join(", ") || "—"}`,
    `Ruido: ${analysis.noiseDetected.join("; ") || "—"}`,
    `Vector: path hints=${analysis.vectorGeometry.pathOperatorHints}, lines=${analysis.vectorGeometry.lineMoveHints}, likelyVector=${analysis.vectorGeometry.likelyVectorDrawing}`,
    `Posición X/Y: ${analysis.positionedText.note}`,
  ];

  if (analysis.goldenComparison) {
    lines.push(
      `Golden p.${analysis.goldenComparison.goldenPage}: tramos=${analysis.goldenComparison.expectedSegmentCount}, PALILLO=[${analysis.goldenComparison.expectedPalilloMm.join(", ")}]`,
      `  Coincidencias literales en original: [${analysis.goldenComparison.palilloValuesFoundInOriginal.join(", ") || "ninguna"}]`,
      `  Suma cotas candidatas: ${analysis.goldenComparison.sumOfAllCandidates ?? "—"}`,
    );
  }

  for (const note of analysis.notes) {
    lines.push(`  • ${note}`);
  }

  return lines.join("\n");
}

async function resolvePdfPaths(options: CliOptions): Promise<string[]> {
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const requested =
    options.pdfPaths.length > 0
      ? options.pdfPaths
      : [...DEFAULT_VECTOR_PDF_PATHS];
  const resolved: string[] = [];

  for (const relativePath of requested) {
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
      "No hay PDFs vectoriales para analizar. Pasa rutas o coloca ejemplos en Ejemplos/Ejemplo 1/.",
    );
  }

  return resolved;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const pdfPaths = await resolvePdfPaths(options);
  const analyses: TrameadoVectorPdfAnalysis[] = [];

  for (const pdfPath of pdfPaths) {
    analyses.push(await analyzeTrameadoVectorPdf(pdfPath));
  }

  if (options.json) {
    console.log(JSON.stringify({ analyses, generatedAt: new Date().toISOString() }, null, 2));
    return;
  }

  console.log("research-trameado-vector — Fase 18J");
  console.log(`PDFs analizados: ${analyses.length}`);

  for (const analysis of analyses) {
    console.log(formatAnalysisHuman(analysis));
  }

  const totalCandidates = analyses.reduce(
    (sum, analysis) => sum + analysis.dimensionCandidates.length,
    0,
  );

  console.log(`\nResumen: ${totalCandidates} cotas candidatas en ${analyses.length} PDFs.`);
  console.log(
    "Clasificación preliminar: Parcial — cotas candidatas sí; palillos automáticos no sin heurística + revisión.",
  );
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename);

if (isDirectExecution) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
