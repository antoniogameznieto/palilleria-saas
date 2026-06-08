import { JobStatus, LengthCriteria, LengthUnit } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const optionalNullableInt = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return Number(value);
}, z.number().int().positive().nullable().optional());

const optionalNullableDecimal = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return Number(value);
}, z.number().positive().nullable().optional());

const checkboxBoolean = z.preprocess((value) => value === "true" || value === true, z.boolean());

export const createJobSchema = z.object({
  name: z.string().trim().min(1, "El nombre del trabajo es obligatorio"),
  clientName: optionalText,
  projectCode: optionalText,
  description: optionalText,
});

export const updateJobSchema = createJobSchema.extend({
  status: z.nativeEnum(JobStatus).optional(),
});

export const jobSettingsSchema = z.object({
  lengthCriteria: z.nativeEnum(LengthCriteria),
  lengthUnit: z.nativeEnum(LengthUnit),
  roundingMm: optionalNullableInt,
  maxPieceLengthMm: optionalNullableInt,
  minPieceLengthMm: optionalNullableInt,
  maxPieceWeightKg: optionalNullableDecimal,
  separateByDiameter: checkboxBoolean,
  separateBySchedule: checkboxBoolean,
  separateByMaterial: checkboxBoolean,
  separateAtFlanges: checkboxBoolean,
  separateAtValves: checkboxBoolean,
  separateAtFittings: checkboxBoolean,
  requireReviewBeforeExport: checkboxBoolean,
  notes: optionalText,
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobSettingsInput = z.infer<typeof jobSettingsSchema>;
