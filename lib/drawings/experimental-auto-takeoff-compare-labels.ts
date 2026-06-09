import type { TakeoffComparisonStatus } from "@/lib/drawings/experimental-auto-takeoff-compare";

export const TAKEOFF_COMPARISON_STATUS_LABELS: Record<
  TakeoffComparisonStatus,
  string
> = {
  matched: "Ya existe",
  missing: "Falta",
  differentQuantity: "Cantidad distinta",
  uncertain: "Dudoso",
};

export const TAKEOFF_COMPARISON_STATUS_BADGE_CLASS: Record<
  TakeoffComparisonStatus,
  string
> = {
  matched:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  missing: "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200",
  differentQuantity:
    "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  uncertain:
    "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
};
