import type { CompanyRole } from "@prisma/client";

import { canStartDrawingDetection } from "@/lib/permissions/drawing";

/**
 * Experimental feature flag (Fase 10B). Disabled by default.
 * Set EXPERIMENTAL_TITLE_BLOCK_OCR=true in .env to enable.
 */
export function isExperimentalTitleBlockOcrEnabled(): boolean {
  return process.env.EXPERIMENTAL_TITLE_BLOCK_OCR === "true";
}

export function canAccessExperimentalTitleBlockOcr(role: CompanyRole): boolean {
  return (
    isExperimentalTitleBlockOcrEnabled() && canStartDrawingDetection(role)
  );
}
