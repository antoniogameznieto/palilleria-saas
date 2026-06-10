import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

import { sanitizeTakeoffCsvFileNameSegment } from "@/lib/drawings/takeoff-csv";

export type MarkedPdfAnnotationInput = {
  segmentLabel: string;
  pageNumber: number;
  type: "point" | "rect";
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type MarkedPdfExportInput = {
  pdfBuffer: Buffer | Uint8Array;
  annotations: MarkedPdfAnnotationInput[];
  sheetLabel?: string;
};

/** Colores base del PDF marcado (18O-E2: mayor contraste). */
export const MARKED_PDF_COLORS = {
  markerBorder: rgb(0.45, 0.02, 0.02),
  markerFill: rgb(0.82, 0.1, 0.1),
  markerHalo: rgb(1, 1, 1),
  labelText: rgb(0.06, 0.06, 0.06),
  labelBackground: rgb(1, 1, 1),
  labelBorder: rgb(0.35, 0.04, 0.04),
  leaderLine: rgb(0.45, 0.02, 0.02),
  footerText: rgb(0.4, 0.4, 0.4),
} as const;

/**
 * Mínimos absolutos de legibilidad (puntos PDF).
 * 18O-E4: ~50% de 18O-E3 — marcas discretas; plano protagonista.
 */
export const MARKED_PDF_MIN_SIZES = {
  pointRadius: 4,
  pointBorderWidth: 1,
  rectBorderWidth: 1,
  labelFontSize: 8,
  labelPaddingX: 2,
  labelPaddingY: 2,
  labelBorderWidth: 0.75,
  leaderLineWidth: 0.75,
  labelOffset: 6,
  haloPadding: 2,
} as const;

/** Factores de escala por tamaño de página (18O-E4: ~50% de 18O-E3). */
export const MARKED_PDF_PAGE_SCALE_FACTORS = {
  pointRadius: 0.00575,
  pointBorderWidth: 0.001625,
  rectBorderWidth: 0.001625,
  labelFontSize: 0.0065,
  labelPaddingX: 0.00325,
  labelPaddingY: 0.00215,
  labelBorderWidth: 0.000725,
  leaderLineWidth: 0.001075,
  labelOffset: 0.008,
  haloPadding: 0.0018,
} as const;

export type MarkedPdfRenderStyle = {
  pointRadius: number;
  pointBorderWidth: number;
  rectBorderWidth: number;
  labelFontSize: number;
  labelPaddingX: number;
  labelPaddingY: number;
  labelBorderWidth: number;
  leaderLineWidth: number;
  labelOffset: number;
  haloPadding: number;
};

export function resolveMarkedPdfRenderStyle(
  pageWidth: number,
  pageHeight: number,
): MarkedPdfRenderStyle {
  const ref = Math.min(pageWidth, pageHeight);

  const scale = MARKED_PDF_PAGE_SCALE_FACTORS;

  return {
    pointRadius: Math.max(MARKED_PDF_MIN_SIZES.pointRadius, ref * scale.pointRadius),
    pointBorderWidth: Math.max(
      MARKED_PDF_MIN_SIZES.pointBorderWidth,
      ref * scale.pointBorderWidth,
    ),
    rectBorderWidth: Math.max(
      MARKED_PDF_MIN_SIZES.rectBorderWidth,
      ref * scale.rectBorderWidth,
    ),
    labelFontSize: Math.max(MARKED_PDF_MIN_SIZES.labelFontSize, ref * scale.labelFontSize),
    labelPaddingX: Math.max(MARKED_PDF_MIN_SIZES.labelPaddingX, ref * scale.labelPaddingX),
    labelPaddingY: Math.max(MARKED_PDF_MIN_SIZES.labelPaddingY, ref * scale.labelPaddingY),
    labelBorderWidth: Math.max(
      MARKED_PDF_MIN_SIZES.labelBorderWidth,
      ref * scale.labelBorderWidth,
    ),
    leaderLineWidth: Math.max(
      MARKED_PDF_MIN_SIZES.leaderLineWidth,
      ref * scale.leaderLineWidth,
    ),
    labelOffset: Math.max(MARKED_PDF_MIN_SIZES.labelOffset, ref * scale.labelOffset),
    haloPadding: Math.max(MARKED_PDF_MIN_SIZES.haloPadding, ref * scale.haloPadding),
  };
}

export function canExportMarkedTrameadoPdf(markedCount: number): boolean {
  return markedCount > 0;
}

export function isAnnotationOnValidPage(
  pageNumber: number,
  pageCount: number,
): boolean {
  return (
    Number.isInteger(pageNumber) &&
    pageNumber >= 1 &&
    pageNumber <= pageCount
  );
}

/** Viewer y=0 arriba → PDF y=0 abajo (pdf-lib). */
export function mapRelativeViewerYToPdfY(
  relativeY: number,
  pageHeight: number,
): number {
  return pageHeight - relativeY * pageHeight;
}

export function mapRelativeViewerRectToPdf(
  x: number,
  y: number,
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const pdfWidth = width * pageWidth;
  const pdfHeight = height * pageHeight;
  const pdfX = x * pageWidth;
  const pdfY = pageHeight - (y + height) * pageHeight;

  return {
    x: pdfX,
    y: pdfY,
    width: pdfWidth,
    height: pdfHeight,
  };
}

type LabelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function measureLabelBox(
  font: PDFFont,
  label: string,
  style: MarkedPdfRenderStyle,
): Pick<LabelBox, "width" | "height"> {
  const textWidth = font.widthOfTextAtSize(label, style.labelFontSize);

  return {
    width: textWidth + style.labelPaddingX * 2,
    height: style.labelFontSize + style.labelPaddingY * 2,
  };
}

function drawLeaderLine(
  page: PDFPage,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  style: MarkedPdfRenderStyle,
): void {
  page.drawLine({
    start: { x: fromX, y: fromY },
    end: { x: toX, y: toY },
    thickness: style.leaderLineWidth,
    color: MARKED_PDF_COLORS.leaderLine,
    opacity: 0.9,
  });
}

function drawSegmentLabel(
  page: PDFPage,
  font: PDFFont,
  label: string,
  anchorX: number,
  anchorY: number,
  style: MarkedPdfRenderStyle,
): LabelBox {
  const { width: boxWidth, height: boxHeight } = measureLabelBox(
    font,
    label,
    style,
  );

  page.drawRectangle({
    x: anchorX,
    y: anchorY,
    width: boxWidth,
    height: boxHeight,
    color: MARKED_PDF_COLORS.labelBackground,
    borderColor: MARKED_PDF_COLORS.labelBorder,
    borderWidth: style.labelBorderWidth,
    opacity: 1,
  });

  page.drawText(label, {
    x: anchorX + style.labelPaddingX,
    y: anchorY + style.labelPaddingY,
    size: style.labelFontSize,
    font,
    color: MARKED_PDF_COLORS.labelText,
  });

  return {
    x: anchorX,
    y: anchorY,
    width: boxWidth,
    height: boxHeight,
  };
}

function drawPointMarker(
  page: PDFPage,
  centerX: number,
  centerY: number,
  style: MarkedPdfRenderStyle,
): void {
  const haloRadius = style.pointRadius + style.haloPadding;

  page.drawCircle({
    x: centerX,
    y: centerY,
    size: haloRadius,
    color: MARKED_PDF_COLORS.markerHalo,
    borderColor: MARKED_PDF_COLORS.markerHalo,
    borderWidth: 1,
    opacity: 0.95,
  });

  page.drawCircle({
    x: centerX,
    y: centerY,
    size: style.pointRadius,
    borderColor: MARKED_PDF_COLORS.markerBorder,
    borderWidth: style.pointBorderWidth,
    color: MARKED_PDF_COLORS.markerFill,
    opacity: 0.35,
  });
}

function drawRectMarker(
  page: PDFPage,
  rect: { x: number; y: number; width: number; height: number },
  style: MarkedPdfRenderStyle,
): void {
  page.drawRectangle({
    ...rect,
    borderColor: MARKED_PDF_COLORS.markerBorder,
    borderWidth: style.rectBorderWidth,
    color: MARKED_PDF_COLORS.markerFill,
    opacity: 0.18,
  });
}

function placeLabelNearMark(
  markX: number,
  markY: number,
  labelBox: Pick<LabelBox, "width" | "height">,
  style: MarkedPdfRenderStyle,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number } {
  let labelX = markX + style.labelOffset;
  let labelY = markY + style.labelOffset;

  if (labelX + labelBox.width > pageWidth - 8) {
    labelX = markX - labelBox.width - style.labelOffset;
  }

  if (labelY + labelBox.height > pageHeight - 8) {
    labelY = markY - labelBox.height - style.labelOffset;
  }

  labelX = Math.max(8, Math.min(labelX, pageWidth - labelBox.width - 8));
  labelY = Math.max(8, Math.min(labelY, pageHeight - labelBox.height - 8));

  return { x: labelX, y: labelY };
}

export function drawMarkedPdfAnnotationsOnPage(
  page: PDFPage,
  font: PDFFont,
  annotations: MarkedPdfAnnotationInput[],
): void {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const style = resolveMarkedPdfRenderStyle(pageWidth, pageHeight);

  for (const annotation of annotations) {
    const label = `Nº ${annotation.segmentLabel}`;
    const labelSize = measureLabelBox(font, label, style);

    if (annotation.type === "point") {
      const centerX = annotation.x * pageWidth;
      const centerY = mapRelativeViewerYToPdfY(annotation.y, pageHeight);

      drawPointMarker(page, centerX, centerY, style);

      const labelPos = placeLabelNearMark(
        centerX,
        centerY,
        labelSize,
        style,
        pageWidth,
        pageHeight,
      );
      const labelBox = drawSegmentLabel(
        page,
        font,
        label,
        labelPos.x,
        labelPos.y,
        style,
      );

      drawLeaderLine(
        page,
        centerX,
        centerY,
        labelPos.x + labelBox.width * 0.15,
        labelPos.y + labelBox.height * 0.35,
        style,
      );
      continue;
    }

    if (
      annotation.type === "rect" &&
      annotation.width !== undefined &&
      annotation.height !== undefined
    ) {
      const rect = mapRelativeViewerRectToPdf(
        annotation.x,
        annotation.y,
        annotation.width,
        annotation.height,
        pageWidth,
        pageHeight,
      );

      drawRectMarker(page, rect, style);

      const anchorX = rect.x + rect.width / 2;
      const anchorY = rect.y + rect.height;
      const labelPos = placeLabelNearMark(
        anchorX,
        anchorY,
        labelSize,
        style,
        pageWidth,
        pageHeight,
      );
      const labelBox = drawSegmentLabel(
        page,
        font,
        label,
        labelPos.x,
        labelPos.y,
        style,
      );

      drawLeaderLine(
        page,
        anchorX,
        anchorY,
        labelPos.x + labelBox.width / 2,
        labelPos.y,
        style,
      );
    }
  }
}

export async function buildMarkedTrameadoPdf(
  input: MarkedPdfExportInput,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(input.pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const annotationsByPage = new Map<number, MarkedPdfAnnotationInput[]>();

  for (const annotation of input.annotations) {
    if (!isAnnotationOnValidPage(annotation.pageNumber, pages.length)) {
      continue;
    }

    const bucket = annotationsByPage.get(annotation.pageNumber) ?? [];
    bucket.push(annotation);
    annotationsByPage.set(annotation.pageNumber, bucket);
  }

  for (const [pageNumber, pageAnnotations] of annotationsByPage) {
    const page = pages[pageNumber - 1]!;
    drawMarkedPdfAnnotationsOnPage(page, font, pageAnnotations);
  }

  if (input.sheetLabel && pages[0]) {
    const footerFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const footerStyle = resolveMarkedPdfRenderStyle(
      pages[0].getWidth(),
      pages[0].getHeight(),
    );

    pages[0].drawText(`PDF marcado · ${input.sheetLabel}`, {
      x: 12,
      y: 10,
      size: Math.max(9, footerStyle.labelFontSize * 0.75),
      font: footerFont,
      color: MARKED_PDF_COLORS.footerText,
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export function buildTrameadoMarkedPdfFileName(
  lineIdentifier: string,
  drawingNumber: string | null | undefined,
): string {
  const lineSegment = sanitizeTakeoffCsvFileNameSegment(lineIdentifier);
  const drawingSegment = drawingNumber
    ? sanitizeTakeoffCsvFileNameSegment(drawingNumber)
    : null;

  if (drawingSegment && drawingSegment !== lineSegment) {
    return `trameado-${drawingSegment}-${lineSegment}.pdf`;
  }

  return `trameado-${lineSegment}.pdf`;
}

export function buildTrameadoMarkedPdfExportPath(sheetId: string): string {
  return `/api/files/trameado/${sheetId}/marked-pdf`;
}
