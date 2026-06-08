import type { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/db";
import { requireCompanyMember } from "@/lib/permissions/company";

export type SerializedJobTakeoffExportItem = {
  drawingNumber: string | null;
  lineNumber: string | null;
  revision: string | null;
  drawingFileName: string;
  reference: string | null;
  description: string;
  quantity: string;
  unit: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function serializeDecimal(value: Decimal | null): string | null {
  if (value == null) {
    return null;
  }

  return value.toString();
}

function serializeJobTakeoffExportItem(item: {
  reference: string | null;
  description: string;
  quantity: Decimal;
  unit: string | null;
  length: Decimal | null;
  width: Decimal | null;
  height: Decimal | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  drawing: {
    drawingNumber: string | null;
    lineNumber: string | null;
    revision: string | null;
    originalFileName: string;
  };
}): SerializedJobTakeoffExportItem {
  return {
    drawingNumber: item.drawing.drawingNumber,
    lineNumber: item.drawing.lineNumber,
    revision: item.drawing.revision,
    drawingFileName: item.drawing.originalFileName,
    reference: item.reference,
    description: item.description,
    quantity: item.quantity.toString(),
    unit: item.unit,
    length: serializeDecimal(item.length),
    width: serializeDecimal(item.width),
    height: serializeDecimal(item.height),
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function getJobTakeoffExportItems(
  companyId: string,
  jobId: string,
): Promise<SerializedJobTakeoffExportItem[]> {
  await requireCompanyMember(companyId);

  const items = await prisma.drawingTakeoffItem.findMany({
    where: {
      companyId,
      jobId,
    },
    orderBy: [
      { drawing: { originalFileName: "asc" } },
      { createdAt: "asc" },
    ],
    include: {
      drawing: {
        select: {
          drawingNumber: true,
          lineNumber: true,
          revision: true,
          originalFileName: true,
        },
      },
    },
  });

  return items.map(serializeJobTakeoffExportItem);
}
