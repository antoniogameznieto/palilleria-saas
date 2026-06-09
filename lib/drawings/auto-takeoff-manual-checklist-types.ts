/**
 * EXPERIMENTAL — Fase 16C
 * Tipos y copy del checklist manual (seguro para UI cliente).
 */

export const MANUAL_CHECKLIST_MAX_EXAMPLES = 3;

export const MANUAL_CHECKLIST_DISCLAIMER =
  "Estos avisos no crean líneas automáticamente. Sirven para que revises el plano antes de cerrar la palillería.";

export const MANUAL_CHECKLIST_EMPTY_NOTE = "Sin avisos manuales.";

export type ManualChecklistItemType =
  | "looseSupportMention"
  | "dwContinuationOrManual"
  | "looseFlangeOrValveMention"
  | "noUsefulText"
  | "noBomDetected";

export type ManualChecklistSeverity = "info" | "warning";

export type ManualTakeoffChecklistItem = {
  type: ManualChecklistItemType;
  severity: ManualChecklistSeverity;
  title: string;
  description: string;
  examples: string[];
  shouldBlockImport: boolean;
  recommendation: string;
};

export type ManualTakeoffChecklistResult = {
  items: ManualTakeoffChecklistItem[];
  hasSignals: boolean;
};
