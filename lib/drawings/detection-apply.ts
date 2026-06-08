import type { DrawingStatus } from "@prisma/client";

import {
  buildDetectionCompletionMessage,
  mergeDetectedMetadata,
  parseDrawingMetadataFromFileName,
  type ParsedDrawingMetadata,
} from "@/lib/drawings/parse-filename";

type DrawingForDetection = {
  originalFileName: string;
  fileName: string;
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
};

export type SimulatedDetectionUpdate = {
  fileName: string;
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
  appliedFields: string[];
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

export function buildSimulatedDetectionUpdate(
  drawing: DrawingForDetection,
): SimulatedDetectionUpdate {
  const fileName = resolveDrawingFileNameForDetection(drawing);
  const detected = parseDrawingMetadataFromFileName(fileName);
  const { metadataUpdate, appliedFields } = mergeDetectedMetadata(
    {
      drawingNumber: drawing.drawingNumber,
      lineNumber: drawing.lineNumber,
      revision: drawing.revision,
    },
    detected,
  );

  const updateData: SimulatedDetectionUpdate["updateData"] = {
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
    detected,
    metadataUpdate,
    updateData,
    appliedFields,
    message: buildDetectionCompletionMessage(appliedFields),
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
