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

export const EXPERIMENTAL_BUSINESS_RULES_DISCOVERY_NOTE =
  "La app clasifica las sugerencias como incluir, revisar o excluir según reglas experimentales de negocio. Revísalo antes de importar.";

export const EXPERIMENTAL_IMPORT_REVIEW_WARNING =
  "Hay elementos marcados para revisión. Comprueba antes de importar.";
