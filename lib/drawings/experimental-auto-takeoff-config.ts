import type { CompanyRole } from "@prisma/client";

import { canManageTakeoffItems } from "@/lib/permissions/drawing";

/**
 * Preview experimental de palillería desde texto embebido (Fase 14B).
 * Sin flag de entorno: siempre disponible para roles con permiso de edición de palillería.
 */
export function canAccessExperimentalAutoTakeoff(role: CompanyRole): boolean {
  return canManageTakeoffItems(role);
}

/** Fase 16B: beta supervisada extrae soportes tabulares post-SOPORTES como revisión. */
export const EXPERIMENTAL_AUTO_TAKEOFF_INCLUDE_SUPPORT_ROWS = true;
