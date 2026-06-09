/**
 * EXPERIMENTAL — Fase 15E
 * Etiquetas UI para reglas de negocio de auto-takeoff.
 */

import type {
  BusinessAction,
  BusinessConfidence,
  BusinessRuleCategory,
} from "@/lib/drawings/auto-takeoff-business-rules";

export const BUSINESS_ACTION_LABELS: Record<BusinessAction, string> = {
  include: "Incluir",
  review: "Revisar",
  exclude: "Excluir",
};

export const BUSINESS_ACTION_BADGE_CLASS: Record<BusinessAction, string> = {
  include: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  review: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  exclude: "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
};

export const BUSINESS_CATEGORY_LABELS: Record<BusinessRuleCategory, string> = {
  pipe: "Tubería",
  flange: "Brida",
  valve: "Válvula",
  fitting: "Accesorio",
  bolt: "Tornillería",
  gasket: "Junta",
  blind: "Ciego",
  support: "Soporte",
  exclusion: "Exclusión",
  unknown: "Desconocido",
};

export const BUSINESS_CONFIDENCE_LABELS: Record<BusinessConfidence, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const BETA_SUPERVISED_DISCOVERY_NOTE =
  "La propuesta se genera con reglas automáticas, pero requiere revisión humana. No es palillería final automática.";

export const BETA_SUPERVISED_NO_AUTO_IMPORT_NOTE =
  "No se importa nada automáticamente. Solo se crean líneas si tú seleccionas e importas la propuesta revisada.";

/** @deprecated Usar BETA_SUPERVISED_DISCOVERY_NOTE en UI 15F+ */
export const EXPERIMENTAL_BUSINESS_RULES_DISCOVERY_NOTE =
  "La app clasifica las sugerencias como incluir, revisar o excluir según reglas de negocio. Revísalo antes de importar.";

export const BETA_REVIEW_GROUP_NOTE =
  "Estas líneas pueden ser válidas, pero necesitan revisión antes de importarlas.";

export const BETA_EXCLUDED_GROUP_NOTE =
  "Estas líneas no se importan porque las reglas las han marcado como no necesarias para la palillería final.";

export const EXPERIMENTAL_IMPORT_REVIEW_WARNING =
  "Hay elementos marcados para revisión. Comprueba antes de importar.";
