import type { DrawingStatus } from "@prisma/client";

import {
  buildDetectionCompletionMessage,
  mergeDetectionFromSources,
  type DetectionFeedbackSummary,
} from "@/lib/drawings/detection-merge";
import { parseDrawingMetadataFromPdfText } from "@/lib/drawings/parse-pdf-text";
import {
  parseDrawingMetadataFromFileName,
  type ParsedDrawingMetadata,
} from "@/lib/drawings/parse-filename";
import { extractDrawingPdfTextForDetection } from "@/lib/drawings/pdf-text-extract";

type DrawingForDetection = {
  originalFileName: string;
  fileName: string;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  storagePath: string;
  mimeType: string | null;
};

export type DrawingDetectionUpdate = {
  fileName: string;
  filenameDetected: ParsedDrawingMetadata;
  pdfTextDetected: ParsedDrawingMetadata;
  detected: ParsedDrawingMetadata;
  metadataUpdate: {
    drawingNumber?: string;
    lineNumber?: string;
    revision?: string;
  };
  updateData: {
    status: Extract<DrawingStatus, "detected">;
    drawingNumber?: string;
    lineNumber?: string;
    revision?: string;
  };
  feedback: DetectionFeedbackSummary;
  pdfTextAttempted: boolean;
  hasEmbeddedText: boolean;
  message: string;
};

export function resolveDrawingFileNameForDetection(
  drawing: Pick<DrawingForDetection, "originalFileName" | "fileName">,
): string {
  const original = drawing.originalFileName?.trim();
  if (original) {
    return original;
  }

  return drawing.fileName?.trim() ?? "";
}

export async function buildDrawingDetectionUpdate(
  drawing: DrawingForDetection,
): Promise<DrawingDetectionUpdate> {
  const fileName = resolveDrawingFileNameForDetection(drawing);
  const filenameDetected = parseDrawingMetadataFromFileName(fileName);
  let pdfTextDetected: ParsedDrawingMetadata = {
    drawingNumber: null,
    lineNumber: null,
    revision: null,
  };
  let pdfTextAttempted = false;
  let hasEmbeddedText = false;

  if (drawing.storagePath) {
    pdfTextAttempted = true;

    try {
      const pdfTextResult = await extractDrawingPdfTextForDetection({
        storagePath: drawing.storagePath,
        mimeType: drawing.mimeType,
      });
      hasEmbeddedText = pdfTextResult.hasEmbeddedText;

      if (pdfTextResult.hasEmbeddedText) {
        pdfTextDetected = parseDrawingMetadataFromPdfText(pdfTextResult.text);
      }
    } catch {
      hasEmbeddedText = false;
    }
  }

  const { merged, metadataUpdate, feedback } = mergeDetectionFromSources(
    {
      drawingNumber: drawing.drawingNumber,
      lineNumber: drawing.lineNumber,
      revision: drawing.revision,
    },
    filenameDetected,
    pdfTextDetected,
  );

  const updateData: DrawingDetectionUpdate["updateData"] = {
    status: "detected",
  };

  if (metadataUpdate.drawingNumber) {
    updateData.drawingNumber = metadataUpdate.drawingNumber;
  }

  if (metadataUpdate.lineNumber) {
    updateData.lineNumber = metadataUpdate.lineNumber;
  }

  if (metadataUpdate.revision != null && metadataUpdate.revision !== "") {
    updateData.revision = String(metadataUpdate.revision);
  }

  return {
    fileName,
    filenameDetected,
    pdfTextDetected,
    detected: merged,
    metadataUpdate,
    updateData,
    feedback,
    pdfTextAttempted,
    hasEmbeddedText,
    message: buildDetectionCompletionMessage(feedback, pdfTextAttempted),
  };
}

export function logDrawingDetectionDebug(
  step: string,
  payload: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[drawing-detection:${step}]`, payload);
  }
}
