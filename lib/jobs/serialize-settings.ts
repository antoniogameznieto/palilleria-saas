import type { JobSettings } from "@prisma/client";

export type SerializedJobSettings = Omit<
  JobSettings,
  "maxPieceWeightKg" | "createdAt" | "updatedAt"
> & {
  maxPieceWeightKg: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeJobSettings(
  settings: JobSettings,
): SerializedJobSettings {
  return {
    ...settings,
    maxPieceWeightKg: settings.maxPieceWeightKg?.toString() ?? null,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}
