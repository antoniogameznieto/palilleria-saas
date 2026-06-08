import type { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/db";

export type SerializedTakeoffItem = {
  id: string;
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

export function serializeTakeoffItem(item: {
  id: string;
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
}): SerializedTakeoffItem {
  return {
    id: item.id,
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

export async function getDrawingTakeoffItems(
  companyId: string,
  jobId: string,
  drawingId: string,
) {
  const items = await prisma.drawingTakeoffItem.findMany({
    where: {
      companyId,
      jobId,
      drawingId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return items.map(serializeTakeoffItem);
}

export function takeoffItemsEqual(
  left: {
    reference: string | null;
    description: string;
    quantity: string;
    unit: string | null;
    length: string | null;
    width: string | null;
    height: string | null;
    notes: string | null;
  },
  right: {
    reference: string | null;
    description: string;
    quantity: string;
    unit: string | null;
    length: string | null;
    width: string | null;
    height: string | null;
    notes: string | null;
  },
): boolean {
  return (
    (left.reference ?? null) === (right.reference ?? null) &&
    left.description === right.description &&
    left.quantity === right.quantity &&
    (left.unit ?? null) === (right.unit ?? null) &&
    (left.length ?? null) === (right.length ?? null) &&
    (left.width ?? null) === (right.width ?? null) &&
    (left.height ?? null) === (right.height ?? null) &&
    (left.notes ?? null) === (right.notes ?? null)
  );
}
