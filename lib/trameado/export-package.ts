import JSZip from "jszip";

import { sanitizeTakeoffCsvFileNameSegment } from "@/lib/drawings/takeoff-csv";
import { formatTrameadoPalilloTotalMm } from "@/lib/trameado/segment-helpers";
import type { TrameadoSheetValidationResult } from "@/lib/trameado/sheet-validation";

export const TRAMEADO_PACKAGE_XLSX_ENTRY = "hoja-palilleo.xlsx" as const;
export const TRAMEADO_PACKAGE_MARKED_PDF_ENTRY = "iso-marcado.pdf" as const;
export const TRAMEADO_PACKAGE_SUMMARY_TXT_ENTRY = "resumen-validacion.txt" as const;
export const TRAMEADO_PACKAGE_SUMMARY_JSON_ENTRY = "resumen-validacion.json" as const;

export type TrameadoPackageSummaryInput = {
  generatedAt: Date;
  sheetLineIdentifier: string;
  drawingNumber: string | null;
  validation: TrameadoSheetValidationResult;
  markedCount: number;
  totalSegmentCount: number;
  includesMarkedPdf: boolean;
};

export type TrameadoDeliveryPackageInput = {
  xlsxBuffer: Buffer;
  markedPdfBuffer?: Buffer | null;
  summary: TrameadoPackageSummaryInput;
};

export type TrameadoValidationSummaryJson = {
  generatedAt: string;
  sheetLineIdentifier: string;
  drawingNumber: string | null;
  validation: {
    status: TrameadoSheetValidationResult["status"];
    statusLabel: string;
    reason: string;
    confirmedSegmentCount: number;
    totalPalilloMm: number;
    totalPalilloM: number;
    referencePipeLengthM: number | null;
    deltaPct: number | null;
  };
  marking: {
    markedCount: number;
    totalSegmentCount: number;
    includesMarkedPdf: boolean;
    markedPdfNote: string;
  };
  note: string;
};

function formatMeters(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatGeneratedAt(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function canExportTrameadoPackage(segmentCount: number): boolean {
  return segmentCount > 0;
}

export function buildTrameadoPackageMarkedPdfNote(
  includesMarkedPdf: boolean,
): string {
  if (includesMarkedPdf) {
    return "Incluye PDF marcado con las anotaciones persistidas de la hoja.";
  }

  return "No se incluye PDF marcado porque no hay tramos marcados.";
}

export function buildTrameadoValidationSummaryJson(
  input: TrameadoPackageSummaryInput,
): TrameadoValidationSummaryJson {
  return {
    generatedAt: input.generatedAt.toISOString(),
    sheetLineIdentifier: input.sheetLineIdentifier,
    drawingNumber: input.drawingNumber,
    validation: {
      status: input.validation.status,
      statusLabel: input.validation.statusLabel,
      reason: input.validation.reason,
      confirmedSegmentCount: input.validation.confirmedSegmentCount,
      totalPalilloMm: input.validation.totalPalilloMm,
      totalPalilloM: input.validation.totalPalilloM,
      referencePipeLengthM: input.validation.referencePipeLengthM,
      deltaPct: input.validation.deltaPct,
    },
    marking: {
      markedCount: input.markedCount,
      totalSegmentCount: input.totalSegmentCount,
      includesMarkedPdf: input.includesMarkedPdf,
      markedPdfNote: buildTrameadoPackageMarkedPdfNote(input.includesMarkedPdf),
    },
    note: "Validación orientativa. Revisar siempre contra el isométrico.",
  };
}

export function buildTrameadoValidationSummaryText(
  input: TrameadoPackageSummaryInput,
): string {
  const generatedAt = formatGeneratedAt(input.generatedAt);
  const drawingLabel = input.drawingNumber ?? "—";
  const lines = [
    "Paquete de trameado",
    "",
    `Hoja: ${input.sheetLineIdentifier}`,
    `Plano: ${drawingLabel}`,
    `Generado: ${generatedAt}`,
    "",
    "Validación:",
    `Estado: ${input.validation.statusLabel}`,
    `Tramos confirmados: ${input.validation.confirmedSegmentCount}`,
    `Total PALILLO: ${formatTrameadoPalilloTotalMm(input.validation.totalPalilloMm)} mm / ${formatMeters(input.validation.totalPalilloM)} m`,
  ];

  if (
    input.validation.hasReferenceLength &&
    input.validation.referencePipeLengthM != null
  ) {
    lines.push(`Referencia BOM: ${formatMeters(input.validation.referencePipeLengthM)} m`);
  } else {
    lines.push("Referencia BOM: —");
  }

  if (input.validation.deltaPct != null) {
    lines.push(`Diferencia: ${formatPercent(input.validation.deltaPct)} %`);
  } else {
    lines.push("Diferencia: —");
  }

  lines.push(
    "",
    "Marcado:",
    `Tramos marcados: ${input.markedCount}/${input.totalSegmentCount}`,
    buildTrameadoPackageMarkedPdfNote(input.includesMarkedPdf),
    "",
    "Nota:",
    "Validación orientativa. Revisar siempre contra el isométrico.",
  );

  return lines.join("\n");
}

export function buildTrameadoPackageFileName(
  lineIdentifier: string,
  drawingNumber?: string | null,
): string {
  const primary =
    lineIdentifier.trim() ||
    drawingNumber?.trim() ||
    "hoja";

  const segment = sanitizeTakeoffCsvFileNameSegment(primary);
  return `trameado-paquete-${segment}.zip`;
}

export function buildTrameadoPackageExportPath(sheetId: string): string {
  return `/api/files/trameado/${sheetId}/package`;
}

export async function buildTrameadoDeliveryPackage(
  input: TrameadoDeliveryPackageInput,
): Promise<Buffer> {
  const zip = new JSZip();

  zip.file(TRAMEADO_PACKAGE_XLSX_ENTRY, input.xlsxBuffer);

  if (input.markedPdfBuffer && input.markedPdfBuffer.length > 0) {
    zip.file(TRAMEADO_PACKAGE_MARKED_PDF_ENTRY, input.markedPdfBuffer);
  }

  const summaryText = buildTrameadoValidationSummaryText(input.summary);
  const summaryJson = buildTrameadoValidationSummaryJson(input.summary);

  zip.file(TRAMEADO_PACKAGE_SUMMARY_TXT_ENTRY, summaryText);
  zip.file(
    TRAMEADO_PACKAGE_SUMMARY_JSON_ENTRY,
    `${JSON.stringify(summaryJson, null, 2)}\n`,
  );

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
