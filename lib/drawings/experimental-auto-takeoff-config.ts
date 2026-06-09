import type { CompanyRole } from "@prisma/client";

import { canManageTakeoffItems } from "@/lib/permissions/drawing";

/**
 * Preview experimental de palillería desde texto embebido (Fase 14B).
 * Sin flag de entorno: siempre disponible para roles con permiso de edición de palillería.
 */
export function canAccessExperimentalAutoTakeoff(role: CompanyRole): boolean {
  return canManageTakeoffItems(role);
}
