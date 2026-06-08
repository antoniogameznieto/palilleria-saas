import { z } from "zod";

export const companySettingsSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la empresa es obligatorio"),
  taxName: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
